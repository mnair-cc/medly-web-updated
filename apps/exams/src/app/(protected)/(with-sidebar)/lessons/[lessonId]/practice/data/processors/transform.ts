import {
  QuestionWithMarkingResult,
  LessonData,
  QuestionDifficulty,
  KnowledgeModelData,
} from "@/app/types/types";
import {
  QuestionsResponse,
  QuestionGroupResponse,
  QuestionResponse,
  LessonResponse,
  LessonProgressResponse,
  LearnFlowProgressResponse,
} from "../response-types";
import { transformCanvas } from "@/app/_lib/utils/canvasTransform";
import { LearnFlowProgress } from "@/app/(protected)/sessions/types";
import { Canvas } from "@/app/types/types";

/**
 * Transform lesson response to LessonData type
 */
export function transformLessonResponse(response: LessonResponse): LessonData {
  const lesson = response.data;
  return {
    id: lesson.id,
    legacyId: lesson.legacy_id,
    title: lesson.title,
    textbookContent: lesson.textbook_content || "",
    learnContent: lesson.learn_flow_content || null,
  };
}

/**
 * Transform questions response (with question_groups) to flat QuestionWithMarkingResult array
 */
export function transformQuestionsResponse(
  response: QuestionsResponse
): QuestionWithMarkingResult[] {
  const questions: QuestionWithMarkingResult[] = [];

  // response.data is directly the array of question groups
  for (const group of response.data) {
    for (const question of group.questions) {
      questions.push(transformQuestion(question, group));
    }
  }

  return questions;
}

/**
 * Transform a single question with its group context
 */
function transformQuestion(
  question: QuestionResponse,
  group: QuestionGroupResponse
): QuestionWithMarkingResult {
  // Transform canvas data if present
  const canvas = transformCanvas(question.canvas);

  return {
    // Basic question fields
    id: question.id,
    legacyId: question.legacy_id,
    questionText: question.question_text,
    passageText: group.passage_text ?? undefined,
    correctAnswer: question.correct_answer,
    maxMark: question.max_mark,
    order: question.order,
    difficulty: question.difficulty
      ? mapDifficultyToEnum(question.difficulty)
      : undefined,

    // Question type and display
    questionType: question.question_type || "text",
    diagram: question.diagram || "",
    options: question.options || [],

    // Group-level fields
    questionGroupId: group.id,
    questionStem: group.stem || "",
    questionStemDiagram: group.diagram || "",
    chunkIndex: group.chunk_index,
    latexSymbols: group.latex_symbols,
    calculator: group.calculator,
    stage: group.stage ?? undefined,

    // Fields we don't have from v2 API yet - use defaults
    createdAt: "",
    updatedAt: "",
    markScheme: [],
    irtParameters: { a: 0, b: 0, c: 0 },
    strategy: { steps: [], feedback: "" },
    lessonLegacyIds: [],
    subLessonId: question.sub_lesson_id,

    // Marking result fields - include all fields from API response
    questionLegacyId: question.legacy_id,
    markMax: question.mark_max ?? question.max_mark,
    userAnswer: question.user_answer ?? undefined,
    userMark:
      question.user_mark !== null && question.user_mark !== undefined
        ? question.user_mark
        : undefined,
    annotatedAnswer: question.annotated_answer,
    markingTable: question.marking_table,
    canvas: canvas,
    desmosExpressions: question.desmos_expressions,
    highlights: question.highlights as QuestionWithMarkingResult["highlights"],
    annotations:
      question.annotations as QuestionWithMarkingResult["annotations"],
    ao_analysis: question.ao_analysis,
    isMarked:
      question.is_marked !== null && question.is_marked !== undefined
        ? question.is_marked
        : undefined,
    isSolvedWithMedly: question.is_solved_with_medly,
    messages: question.messages,
    messageCount: question.message_count,
    durationSpentInSeconds: question.duration_spent_in_seconds,
    answerAttempts: question.answer_attempts,
    isFoundationalGap: question.is_foundational_gap,
    isQuickFix: question.is_quick_fix,
    isMarkedForReview: question.is_marked_for_review,
    decorations: question.decorations,
  };
}

/**
 * Transform lesson progress response to KnowledgeModelData type
 */
export function transformLessonProgressResponse(
  response: LessonProgressResponse
): KnowledgeModelData {
  const progress = response.data;
  return {
    mu: progress.mu ?? 0,
    sigma: progress.sigma ?? 1,
    p_mastery: progress.p_mastery ?? 0,
    mastery_tier: progress.mastery_tier ?? 1,
    rank: progress.rank ?? 0,
  };
}

/**
 * Transform learn flow progress response to LearnFlowProgress type
 */
export function transformLearnFlowProgressResponse(
  response: LearnFlowProgressResponse | null
): LearnFlowProgress | null {
  if (!response) return null;

  // Transform blocks, including canvas data transformation
  const transformedBlocks: Record<
    string,
    {
      user_answer?:
        | string
        | string[]
        | Record<string, string>
        | Record<string, string[]>;
      canvas?: Canvas;
      viewed_at?: string;
      completed_at?: string;
    }
  > = {};

  for (const [blockKey, block] of Object.entries(response.data.blocks || {})) {
    transformedBlocks[blockKey] = {
      user_answer: block.user_answer,
      canvas: block.canvas ? transformCanvas(block.canvas) : undefined,
      viewed_at: block.viewed_at,
      completed_at: block.completed_at,
    };
  }

  return {
    messages: response.data.messages || [],
    current_block_index: response.data.progress?.current_block_index || 0,
    completed_at: response.data.progress?.completed_at,
    blocks: transformedBlocks,
  };
}

/**
 * Map numeric difficulty to enum
 */
function mapDifficultyToEnum(
  difficulty: number
): QuestionDifficulty | undefined {
  if (difficulty <= 3) return QuestionDifficulty.EASY;
  if (difficulty <= 6) return QuestionDifficulty.MEDIUM;
  if (difficulty <= 10) return QuestionDifficulty.HARD;
  return undefined;
}
