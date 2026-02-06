import { SessionData } from "../types";
import { QuestionWithMarkingResult } from "@/app/types/types";
import { SessionPersisterParams } from "./types";
import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import { AnswerRequest, AnswersBatchRequest } from "./request-types";

/**
 * Persister - Uses curriculum API endpoints for all session types
 * Handles saving user answers and session data
 */
export class Persister {
  /**
   * Get the appropriate endpoint based on session type
   */
  private getAnswersEndpoint(params: SessionPersisterParams): string {
    // For practice/lesson sessions
    if (params.lessonId) {
      return `/lessons/${params.lessonId}/answers`;
    }

    // For paper/mock sessions
    if (params.paperId) {
      return `/papers/${params.paperId}/answers`;
    }

    throw new Error("Either lessonId or paperId is required");
  }

  /**
   * Transform internal app type (QuestionWithMarkingResult) to API request type (AnswerRequest)
   * Converts camelCase to snake_case and filters out read-only fields
   */
  private transformToAnswerRequest(
    answer: Partial<QuestionWithMarkingResult>
  ): AnswerRequest {
    // Build the request object with only writable fields
    // Type assertions are used because internal types differ slightly from API types
    const request: AnswerRequest = {
      question_legacy_id: answer.questionLegacyId || answer.legacyId || "",
      user_answer: answer.userAnswer,
      canvas: answer.canvas as AnswerRequest["canvas"],
      decorations: answer.decorations as AnswerRequest["decorations"],
      user_mark: answer.userMark,
      mark_max: answer.markMax,
      is_marked: answer.isMarked,
      is_marked_for_review: answer.isMarkedForReview,
      annotated_answer:
        answer.annotatedAnswer as AnswerRequest["annotated_answer"],
      marking_table: answer.markingTable,
      desmos_expressions: answer.desmosExpressions as string[],
      highlights: answer.highlights as AnswerRequest["highlights"],
      annotations: answer.annotations as AnswerRequest["annotations"],
      ao_analysis: answer.ao_analysis as AnswerRequest["ao_analysis"],
      is_foundational_gap: answer.isFoundationalGap,
      is_quick_fix: answer.isQuickFix,
      is_solved_with_medly: answer.isSolvedWithMedly,
      messages: answer.messages as AnswerRequest["messages"],
      message_count: answer.messageCount,
      duration_spent_in_seconds: answer.durationSpentInSeconds,
      answer_attempts:
        answer.answerAttempts as AnswerRequest["answer_attempts"],
    };

    // Remove undefined/null fields to keep payload clean
    return Object.fromEntries(
      Object.entries(request).filter(
        ([, value]) => value !== undefined && value !== null
      )
    ) as AnswerRequest;
  }

  /**
   * Save multiple answers in a single batch request
   */
  async saveAnswersBatch(
    params: SessionPersisterParams,
    answers: Partial<QuestionWithMarkingResult>[]
  ): Promise<void> {
    if (answers.length === 0) return;

    const endpoint = this.getAnswersEndpoint(params);

    // Transform internal types to API request types
    const answersPayload: AnswerRequest[] = answers.map((answer) =>
      this.transformToAnswerRequest(answer)
    );

    const requestBody: AnswersBatchRequest = {
      answers: answersPayload,
    };

    await curriculumApiV2Client.put(endpoint, requestBody);
  }

  /**
   * Save a single answer (convenience method that calls batch with one item)
   */
  async saveAnswer(
    params: SessionPersisterParams,
    answer: Partial<QuestionWithMarkingResult>
  ): Promise<void> {
    await this.saveAnswersBatch(params, [answer]);
  }

  /**
   * Start session - calls the API to set timeStarted on the paper document
   */
  async startSession(
    params: SessionPersisterParams,
    _sessionData: Partial<SessionData>
  ): Promise<void> {
    // Only for paper/mock sessions
    if (!params.paperId) {
      return;
    }

    // Call the session endpoint with trigger_start=true
    await curriculumApiV2Client.post(`/papers/${params.paperId}/session`, {
      triggerStart: true,
    });
  }

  /**
   * Finish session - save all final answers and mark session as finished
   */
  async finishSession(
    params: SessionPersisterParams,
    _sessionData: Partial<SessionData>,
    allAnswersToSave: QuestionWithMarkingResult[]
  ): Promise<void> {
    // Save all answers in one batch
    await this.saveAnswersBatch(params, allAnswersToSave);

    // For paper/mock sessions, call the session endpoint to set timeFinished
    if (params.paperId) {
      await curriculumApiV2Client.post(`/papers/${params.paperId}/session`, {
        triggerFinish: true,
      });
    }
  }

  /**
   * Mark session as finished without re-saving answers.
   * Used when answers have already been saved incrementally via SaveManager.
   * @throws Error if paperId is not provided
   */
  async markSessionFinished(params: SessionPersisterParams): Promise<void> {
    if (!params.paperId) {
      throw new Error("paperId is required to mark session as finished");
    }

    await curriculumApiV2Client.post(`/papers/${params.paperId}/session`, {
      triggerFinish: true,
    });
  }
}
