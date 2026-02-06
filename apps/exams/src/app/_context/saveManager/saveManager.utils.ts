import { QuestionWithMarkingResult, Canvas } from "@/app/types/types";
import type { AnswerRequest, SaveWithTimestamp } from "./saveManager.types";

// ============================================================================
// Pure Helpers
// ============================================================================

/**
 * Get a snapshot of only the meaningful content in a canvas.
 * Empty textboxes, empty maths, and strokes without paths are excluded.
 * Used to compare if actual content changed (ignoring empty elements).
 */
function getCanvasContentSnapshot(canvas?: Canvas): string {
  if (!canvas) return "{}";

  const snapshot = {
    // Only include textboxes with actual text content
    textboxes: (canvas.textboxes || [])
      .filter((t) => t.text?.trim())
      .map((t) => ({
        text: t.text,
        x: t.x,
        y: t.y,
        isMath: t.isMath,
        color: t.color,
        fontSize: t.fontSize,
      })),
    // Only include maths with actual LaTeX content
    maths: (canvas.maths || [])
      .filter((m) => m.latex?.trim())
      .map((m) => ({
        latex: m.latex,
        x: m.x,
        y: m.y,
        color: m.color,
        fontSize: m.fontSize,
      })),
    // Only include strokes with paths (points)
    paths: (canvas.paths || []).filter((stroke) => stroke.paths?.length > 0),
    stemPaths: (canvas.stemPaths || []).filter(
      (stroke) => stroke.paths?.length > 0
    ),
  };

  return JSON.stringify(snapshot);
}

/**
 * Check if the meaningful canvas content changed between two canvas states.
 * Returns true if there's an actual content change (ignoring empty elements).
 * Used to avoid saving when user just clicks to add an empty textbox.
 */
export function hasCanvasContentChanged(
  oldCanvas?: Canvas,
  newCanvas?: Canvas
): boolean {
  return (
    getCanvasContentSnapshot(oldCanvas) !== getCanvasContentSnapshot(newCanvas)
  );
}

/** Transform internal app type to API request type (camelCase -> snake_case) */
export function transformToAnswerRequest(
  answer: Partial<QuestionWithMarkingResult>
): AnswerRequest {
  const request: AnswerRequest = {
    question_legacy_id: answer.questionLegacyId || answer.legacyId || "",
    user_answer: answer.userAnswer,
    canvas: answer.canvas,
    decorations: answer.decorations,
    user_mark: answer.userMark,
    mark_max: answer.markMax,
    is_marked: answer.isMarked,
    is_marked_for_review: answer.isMarkedForReview,
    annotated_answer: answer.annotatedAnswer,
    marking_table: answer.markingTable,
    desmos_expressions: answer.desmosExpressions as string[],
    highlights: answer.highlights,
    annotations: answer.annotations,
    ao_analysis: answer.ao_analysis,
    is_foundational_gap: answer.isFoundationalGap,
    is_quick_fix: answer.isQuickFix,
    is_solved_with_medly: answer.isSolvedWithMedly,
    messages: answer.messages,
    message_count: answer.messageCount,
    duration_spent_in_seconds: answer.durationSpentInSeconds,
    answer_attempts: answer.answerAttempts,
  };

  // Remove undefined/null fields to keep payload clean
  return Object.fromEntries(
    Object.entries(request).filter(([, v]) => v !== undefined && v !== null)
  ) as AnswerRequest;
}

/**
 * Keep only the newest save per question, based on timestamp.
 * Preserves isFirstAnswer = true if ANY save for that question had it set,
 * to ensure we don't lose the first-answer signal during rapid edits.
 */
export function deduplicateSaves(
  saves: QuestionWithMarkingResult[]
): QuestionWithMarkingResult[] {
  const byQuestion: Record<string, SaveWithTimestamp> = {};
  // Track which questions have had a first answer in this batch
  const questionsWithFirstAnswer = new Set<string>();

  for (const save of saves) {
    const saveWithTs = save as SaveWithTimestamp;

    // Track if any save for this question is a first answer
    if (saveWithTs.isFirstAnswer === true) {
      questionsWithFirstAnswer.add(save.questionLegacyId);
    }

    const existing = byQuestion[save.questionLegacyId];
    const saveTs = saveWithTs.timestamp ?? 0;
    const existingTs = existing?.timestamp ?? 0;

    if (!existing || saveTs >= existingTs) {
      byQuestion[save.questionLegacyId] = saveWithTs;
    }
  }

  // Ensure isFirstAnswer is preserved if any save for that question had it
  return Object.values(byQuestion).map((save) => {
    if (questionsWithFirstAnswer.has(save.questionLegacyId)) {
      return { ...save, isFirstAnswer: true };
    }
    return save;
  });
}

/** Filter saves that have meaningful content worth saving */
export function filterMeaningfulSaves(
  saves: QuestionWithMarkingResult[]
): Partial<QuestionWithMarkingResult>[] {
  return saves.filter((save) => {
    const hasAnswer = save.userAnswer != null && save.userAnswer !== "";
    // Include canvas if it exists (even if empty) - needed to save when all strokes are erased
    const hasCanvas = save.canvas != null;
    const hasDecorations = save.decorations && save.decorations.length > 0;
    const hasHighlights = save.highlights && save.highlights.length > 0;
    const hasAnnotations = save.annotations && save.annotations.length > 0;
    const hasMessages = save.messages && save.messages.length > 0;
    const hasDesmosExpressions =
      save.desmosExpressions && save.desmosExpressions.length > 0;
    const isMarked = save.isMarked || typeof save.userMark === "number";
    const isMarkedForReview = save.isMarkedForReview === true;
    const hasFlags = !!(
      save.isSolvedWithMedly ||
      save.isQuickFix ||
      save.isFoundationalGap
    );
    const hasMarkingResult = !!(
      save.annotatedAnswer ||
      save.markingTable ||
      save.ao_analysis
    );

    return (
      hasAnswer ||
      hasCanvas ||
      hasDecorations ||
      hasHighlights ||
      hasAnnotations ||
      hasMessages ||
      hasDesmosExpressions ||
      isMarked ||
      isMarkedForReview ||
      hasFlags ||
      hasMarkingResult
    );
  });
}

/** Check if any answers in batch are marked (triggers user refetch) */
export function hasMarkedAnswers(
  answers: Partial<QuestionWithMarkingResult>[]
): boolean {
  return answers.some((a) => a.isMarked || typeof a.userMark === "number");
}

/**
 * Check if a question has an existing answer (userAnswer, canvas content, or desmos expressions).
 * Used to determine if this is a "first answer" for update_statistics optimization.
 */
export function questionHasExistingAnswer(
  question: Partial<QuestionWithMarkingResult>
): boolean {
  const hasUserAnswer =
    question.userAnswer != null && question.userAnswer !== "";
  const hasCanvasContent =
    question.canvas &&
    ((question.canvas.paths &&
      question.canvas.paths.some((stroke) => stroke.paths?.length > 0)) ||
      (question.canvas.stemPaths &&
        question.canvas.stemPaths.some((stroke) => stroke.paths?.length > 0)) ||
      (question.canvas.textboxes &&
        question.canvas.textboxes.some((t) => t.text?.trim())) ||
      (question.canvas.maths &&
        question.canvas.maths.some((m) => m.latex?.trim())));
  const hasDesmosExpressions =
    question.desmosExpressions && question.desmosExpressions.length > 0;

  return hasUserAnswer || !!hasCanvasContent || !!hasDesmosExpressions;
}