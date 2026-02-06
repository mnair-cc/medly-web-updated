import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import { QuestionWithMarkingResult } from "@/app/types/types";
import {
  transformToAnswerRequest,
  hasMarkedAnswers,
  deduplicateSaves,
  filterMeaningfulSaves,
} from "./saveManager.utils";
import type { SaveWithTimestamp } from "./saveManager.types";

// ============================================================================
// API Layer
// ============================================================================

/**
 * Check if any saves in the batch are first answers (no prior answer existed).
 * Used to determine whether to skip update_statistics for paper endpoints.
 */
function hasFirstAnswers(saves: Partial<QuestionWithMarkingResult>[]): boolean {
  return saves.some(
    (save) => (save as SaveWithTimestamp).isFirstAnswer === true
  );
}

/**
 * Execute save for answers to a specific endpoint
 * @param skipStatistics - If true, includes ?update_statistics=false query param (for papers only)
 */
export async function executeSaveAnswers(
  answersToSave: Partial<QuestionWithMarkingResult>[],
  endpoint: string,
  skipStatistics: boolean = false
): Promise<void> {
  if (answersToSave.length === 0) return;

  const payload = answersToSave.map(transformToAnswerRequest);
  const url = skipStatistics ? `${endpoint}?update_statistics=false` : endpoint;
  await curriculumApiV2Client.put(url, { answers: payload });
}

/**
 * Execute saves for multiple endpoints in parallel
 * Calls refetchUser if any answers are marked
 * Includes update_statistics=false for paper endpoints when all saves are updates (no first answers)
 */
export async function executeSaveAnswersBatch(
  savesByEndpoint: Map<string, { saves: Partial<QuestionWithMarkingResult>[] }>,
  refetchUser?: () => void | Promise<void>
): Promise<void> {
  const promises: Promise<void>[] = [];
  let hasMarked = false;

  for (const [endpoint, { saves }] of savesByEndpoint) {
    if (hasMarkedAnswers(saves)) {
      hasMarked = true;
    }
    // For paper endpoints, skip statistics update if NO saves are first answers
    // (i.e., all saves are updates to existing answers)
    const isPaperEndpoint = endpoint.startsWith("/papers/");
    const skipStatistics = isPaperEndpoint && !hasFirstAnswers(saves);
    promises.push(executeSaveAnswers(saves, endpoint, skipStatistics));
  }

  await Promise.all(promises);

  // Call refetchUser once if any answers were marked
  if (hasMarked && refetchUser) {
    void refetchUser();
  }
}

/**
 * Build save payload grouped by endpoint from pending saves maps
 */
export function buildSavePayloadByEndpoint(
  pendingLessonSaves: Map<string, QuestionWithMarkingResult[]>,
  pendingPaperSaves: Map<string, QuestionWithMarkingResult[]>
): Map<string, { saves: Partial<QuestionWithMarkingResult>[] }> {
  const savesByEndpoint = new Map<
    string,
    { saves: Partial<QuestionWithMarkingResult>[] }
  >();

  // Process lesson saves
  for (const [lessonId, saves] of pendingLessonSaves.entries()) {
    if (saves.length === 0) continue;
    const deduplicated = deduplicateSaves(saves);
    const meaningful = filterMeaningfulSaves(deduplicated);
    if (meaningful.length > 0) {
      savesByEndpoint.set(`/lessons/${lessonId}/answers`, {
        saves: meaningful,
      });
    }
  }

  // Process paper saves
  for (const [paperId, saves] of pendingPaperSaves.entries()) {
    if (saves.length === 0) continue;
    const deduplicated = deduplicateSaves(saves);
    const meaningful = filterMeaningfulSaves(deduplicated);
    if (meaningful.length > 0) {
      savesByEndpoint.set(`/papers/${paperId}/answers`, {
        saves: meaningful,
      });
    }
  }

  return savesByEndpoint;
}
