import { QuestionWithMarkingResult } from "@/app/types/types";
import { auth } from "@/auth";
import { deconstructSubjectLegacyId } from "@/app/_lib/utils/utils";
import { ForbiddenError } from "@/app/(protected)/sessions/utils/errors";
import {
  QuestionResponse,
  QuestionGroupResponse,
} from "@/app/(protected)/(with-sidebar)/data/response-types";
import { transformCanvas } from "@/app/_lib/utils/canvasTransform";
import {
  curriculumApiFetch,
  CurriculumApiError,
} from "@/app/_lib/server/curriculum-api";

export interface PaperData {
  id: number;
  legacyId: string;
  title: string;
  examBoard: string;
  course: string;
  date: string;
  number: string;
  series: string;
  gcseHigher: boolean | null;
}

export interface PaperWithQuestions {
  paperData: PaperData;
  questions: QuestionWithMarkingResult[];
}

interface PaperDetailsResponse {
  id: number;
  number: string;
  legacy_id: string;
  question_groups: QuestionGroupResponse[];
}

interface ExamResponse {
  data: {
    id: number;
    exam_type: string;
    gcse_higher: boolean | null;
    gcse_triple: boolean | null;
    series: string;
    subject_id: number;
    created_at: string;
    papers: PaperDetailsResponse[];
  };
}

export async function fetchPaperData(
  subjectId: string,
  paperId: string
): Promise<PaperWithQuestions> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("User authentication required");
    }

    // Fetch paper data with questions AND user answers from curriculum API
    const response = await curriculumApiFetch<ExamResponse>(
      `/api/v2/papers/${paperId}`,
      {
        token: session.databaseApiAccessToken!,
      }
    );

    const exam = response.data;
    const paper = exam.papers.find((p) => p.legacy_id === paperId);

    if (!paper) {
      throw new Error(`Paper with ID ${paperId} not found in exam`);
    }
    const { examBoard, course, subjectTitle } =
      deconstructSubjectLegacyId(subjectId);

    const gcseTier = paperId.includes("Higher")
      ? "Higher"
      : paperId.includes("Foundation")
        ? "Foundation"
        : "";

    // Extract paper details
    const paperData: PaperData = {
      id: paper.id,
      legacyId: paper.legacy_id,
      title: `${examBoard}${
        examBoard === "IB" && course === "IB (International Baccalaureate)"
          ? ""
          : ` ${course}`
      } ${subjectTitle}${
        gcseTier ? ` ${gcseTier}` : ""
      } Series ${exam.series} Paper ${paper.number}`,
      examBoard: examBoard,
      course: course,
      date: "",
      number: paper.number,
      series: exam.series,
      gcseHigher: exam.gcse_higher,
    };

    // Build a map of group-level stems/diagrams and flatten questions
    const groupMetaById = new Map<
      number,
      { stem?: string | null; diagram?: string | null }
    >();
    const allQuestions: QuestionResponse[] = [];
    for (const questionGroup of paper.question_groups) {
      groupMetaById.set(questionGroup.id, {
        stem: questionGroup.stem ?? questionGroup.question_stem ?? null,
        diagram: questionGroup.diagram ?? null,
      });
      allQuestions.push(...questionGroup.questions);
    }

    const questionSet = allQuestions.filter(
      (question) =>
        !question.legacy_id || !question.legacy_id.includes("medlymocks")
    );

    const questions = questionSet
      .map((question) => {
        // Find the group this question belongs to
        const group = paper.question_groups.find((g) =>
          g.questions.some((q) => q.id === question.id)
        );
        if (!group) return null;

        const groupMeta = groupMetaById.get(group.id);
        return transformQuestionResponse(question, group.id, groupMeta);
      })
      .filter(
        (question): question is QuestionWithMarkingResult => question !== null
      );

    return {
      paperData,
      questions,
    };
  } catch (error) {
    if (error instanceof CurriculumApiError) {
      if (error.statusCode === 404) {
        throw new Error("Paper not found");
      }
      if (error.statusCode === 403) {
        const detail =
          (error.response as { detail?: string })?.detail || "Access denied";
        throw new ForbiddenError(
          `Access denied: You don't have access to this paper. ${detail}`,
          detail
        );
      }
    }
    throw new Error("Failed to fetch paper data");
  }
}

function transformQuestionResponse(
  question: QuestionResponse,
  questionGroupId: number,
  groupMeta?: { stem?: string | null; diagram?: string | null }
): QuestionWithMarkingResult | null {
  // Filter out unsupported question types
  if (
    question.question_type === "drawing" ||
    question.question_type === "fill_in_the_gaps_number" ||
    question.question_type === "fill_in_the_gaps_text" ||
    question.question_type === "rearrange"
  ) {
    return null;
  }

  // Transform canvas data if present
  const canvas = transformCanvas(question.canvas);

  return {
    // Basic question fields
    id: question.id,
    legacyId: question.legacy_id,
    questionLegacyId: question.legacy_id,
    correctAnswer: question.correct_answer,
    createdAt: "",
    updatedAt: "",
    maxMark: question.max_mark,
    markMax: question.mark_max ?? question.max_mark,
    options: question.options || [],
    order: question.order,
    questionText: question.question_text,
    questionType: question.question_type || "text",
    diagram: question.diagram || "",
    // Fallback to group-level stem/diagram if question-level is missing
    questionStem: groupMeta?.stem || "",
    questionStemDiagram: groupMeta?.diagram || "",
    markScheme: [], // Default empty mark scheme
    questionGroupId: questionGroupId,
    irtParameters: { a: 0, b: 0, c: 0 }, // Default IRT parameters
    strategy: { steps: [], feedback: "" }, // Default strategy
    subLessonId: question.sub_lesson_id,
    difficulty: question.difficulty as QuestionWithMarkingResult["difficulty"],
    lessonLegacyIds: question.lesson_legacy_ids || [],

    // User answer fields from curriculum API - use type assertions like lessons do
    userAnswer: question.user_answer,
    userMark: question.user_mark ?? undefined,
    isMarked: question.is_marked ?? undefined,
    isMarkedForReview: question.is_marked_for_review,
    annotatedAnswer: question.annotated_answer,
    markingTable: question.marking_table,
    canvas: canvas,
    desmosExpressions: question.desmos_expressions,
    highlights: question.highlights as QuestionWithMarkingResult["highlights"],
    annotations:
      question.annotations as QuestionWithMarkingResult["annotations"],
    ao_analysis: question.ao_analysis,
    isFoundationalGap: question.is_foundational_gap,
    isQuickFix: question.is_quick_fix,
    isSolvedWithMedly: question.is_solved_with_medly,
    messages: question.messages as QuestionWithMarkingResult["messages"],
    messageCount: question.message_count,
    durationSpentInSeconds: question.duration_spent_in_seconds,
    answerAttempts:
      question.answer_attempts as QuestionWithMarkingResult["answerAttempts"],
    decorations:
      question.decorations as QuestionWithMarkingResult["decorations"],
  };
}
