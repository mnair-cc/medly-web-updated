import {
  MockPage,
  QuestionSessionPageType,
} from "@/app/(protected)/sessions/types";
import { QuestionGroup, QuestionWithMarkingResult } from "@/app/types/types";

/**
 * Calculates the initial page index for a lesson session based on:
 * 1. Last viewed question page (if valid)
 * 2. Nearest valid page to last viewed (if out of bounds)
 * 3. First unmarked question (if no last viewed)
 * 4. First page (fallback)
 */
export function calculateInitialPageIndex(
  pages: MockPage[],
  lastQuestionPageIndex: number | null
): number {
  if (!pages || pages.length === 0) {
    return 0;
  }

  // If we have a saved last question page index, validate it
  if (lastQuestionPageIndex !== null) {
    // If the saved index is within bounds, use it
    if (lastQuestionPageIndex >= 0 && lastQuestionPageIndex < pages.length) {
      return lastQuestionPageIndex;
    }

    // If out of bounds, find the nearest valid page
    if (lastQuestionPageIndex >= pages.length) {
      // If saved index is beyond the end, go to the last page
      return pages.length - 1;
    } else if (lastQuestionPageIndex < 0) {
      // If saved index is negative, go to the first page
      return 0;
    }
  }

  // Find the first question page that has unmarked questions
  const firstUnmarkedPageIndex = findFirstUnmarkedQuestionPage(pages);
  if (firstUnmarkedPageIndex !== -1) {
    return firstUnmarkedPageIndex;
  }

  // Fallback to the first page
  return 0;
}

/**
 * Finds the first page containing questions that are not fully marked
 */
function findFirstUnmarkedQuestionPage(pages: MockPage[]): number {
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    // Skip non-question pages
    if (page.type !== QuestionSessionPageType.Question || !page.content) {
      continue;
    }

    const questionGroup = page.content as QuestionGroup;
    const questions = questionGroup.questions as QuestionWithMarkingResult[];

    // Check if any question in this group is unmarked
    const hasUnmarkedQuestion = questions.some((question) => {
      // A question is considered unmarked if:
      // 1. It has no marking result, OR
      // 2. It has no user answer, OR
      // 3. Its userMark is undefined or null
      return (
        !question.markingTable ||
        !question.userAnswer ||
        question.userMark === undefined ||
        question.userMark === null
      );
    });

    if (hasUnmarkedQuestion) {
      return i;
    }
  }

  return -1; // No unmarked questions found
}

/**
 * Determines if a page contains questions (as opposed to cover pages, etc.)
 */
export function isQuestionPage(page: MockPage): boolean {
  return page.type === QuestionSessionPageType.Question && !!page.content;
}
