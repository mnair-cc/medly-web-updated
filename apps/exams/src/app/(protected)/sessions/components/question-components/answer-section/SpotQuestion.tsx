import { MarkingContext, QuestionWithMarkingResult } from "@/app/types/types";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import NotebookBackground from "./NotebookBackground";
import circleConfetti from "@/app/_components/animations/circle_confetti_green.json";
import { categoryEmojiMap } from "./categoryEmojiMap";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";

const LottieComponent = lazy(() => import("lottie-react"));

// ============================================================================
// TYPES
// ============================================================================

type Highlight = {
  startTokenIndex: number;
  endTokenIndex: number;
  selectedPassageText?: string;
  status:
    | "correct"
    | "incorrect"
    | "selecting"
    | "marking"
    | "pending"
    | "partial";
  categories?: Category[]; // Array of selected categories
};

type Category = {
  emoji?: string | null;
  label: string;
  displayName: string;
};

// ============================================================================
// PURE HELPER FUNCTIONS
// ============================================================================

/**
 * Trims trailing punctuation (commas, periods) from text
 * Preserves punctuation-only strings (e.g., "..." stays as "...")
 */
export const trimTrailingPunctuation = (text: string): string => {
  const trimmed = text.trim();
  // If the text is purely punctuation (like "..." or ".,"), preserve it
  if (/^[,\.\:…]+$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed.replace(/[,\.\:…]+$/, "");
};

/**
 * Checks if a string is purely punctuation
 */
export const isPunctuationOnly = (text: string): boolean => {
  return /^[,\.\:…]+$/.test(text.trim());
};

/**
 * Normalizes ellipsis variations (unicode "…" and "..." three dots)
 */
export const normalizeEllipsis = (text: string): string => {
  return text.replace(/…/g, "...").replace(/\.{3,}/g, "...");
};

/**
 * Compares two answers with trimming on both sides
 * Accepts either strings or arrays of tokens
 * Special handling for punctuation-only answers (e.g., "...")
 */
export const checkAnswerMatch = (
  answer1: string | string[],
  answer2: string | string[]
): boolean => {
  // If both are arrays, compare tokens
  if (Array.isArray(answer1) && Array.isArray(answer2)) {
    if (answer1.length !== answer2.length) return false;
    return answer1.every((token, idx) => 
      normalizeEllipsis(token) === normalizeEllipsis(answer2[idx])
    );
  }

  // Convert to strings if needed
  const str1 = normalizeEllipsis(Array.isArray(answer1) ? answer1.join(" ") : answer1);
  const str2 = normalizeEllipsis(Array.isArray(answer2) ? answer2.join(" ") : answer2);

  // Handle empty strings
  if (!str1.trim() || !str2.trim()) {
    return str1.trim() === str2.trim();
  }

  // Direct comparison first (handles punctuation-only answers like "...")
  if (str1.trim() === str2.trim()) {
    return true;
  }

  // Check if one answer is punctuation-only and is contained at the end of the other
  // This handles cases like "behind..." matching "..."
  const isPunc1 = isPunctuationOnly(str1);
  const isPunc2 = isPunctuationOnly(str2);
  
  if (isPunc2 && !isPunc1 && str1.trim().endsWith(str2.trim())) {
    return true;
  }
  if (isPunc1 && !isPunc2 && str2.trim().endsWith(str1.trim())) {
    return true;
  }

  // Trim both and compare (for word-based answers with trailing punctuation)
  const trimmed1 = trimTrailingPunctuation(str1);
  const trimmed2 = trimTrailingPunctuation(str2);

  return trimmed1 === trimmed2;
};

/**
 * Finds the correct answer key that matches the given text (with trimming on both sides)
 * Returns the value from correctAnswers, or undefined if no match found
 */
export const getCorrectAnswerValue = (
  text: string,
  correctAnswers: { [key: string]: string | string[] }
): string | string[] | undefined => {
  // Try direct lookup first (most common case)
  if (correctAnswers[text] !== undefined) {
    return correctAnswers[text];
  }

  // Try with trimmed text
  const trimmedText = trimTrailingPunctuation(text);
  if (correctAnswers[trimmedText] !== undefined) {
    return correctAnswers[trimmedText];
  }

  // Search through all keys with trimming comparison
  for (const key of Object.keys(correctAnswers)) {
    if (checkAnswerMatch(text, key)) {
      return correctAnswers[key];
    }
  }

  return undefined;
};

/**
 * Converts a user answer string to a highlight object
 * Handles edge cases with punctuation and whitespace variations
 */
const userAnswerToHighlight = (
  userAnswer: string,
  passageText: string,
  wordTokens: string[],
  status: "correct" | "incorrect" | "pending" | "partial",
  categoryMap?: Record<string, Category> | null
): Highlight | null => {
  // Extract possible categories from answer (comma-separated within brackets)
  const categoryMatch = /\[(.*?)\]/.exec(userAnswer);
  const categoryLabels = categoryMatch?.[1]
    ? categoryMatch[1].split(",").map((cat) => cat.trim())
    : undefined;
  const categories = categoryLabels
    ? categoryLabels.map((label) => {
        const category = categoryMap?.[label];
        if (category) return category;
        return {
          label,
          displayName: label,
          emoji: null,
        };
      })
    : undefined;
  const answerWithoutCategory = userAnswer.replace(/( \[.*?\])/, "");

  // Split answer into individual words to match
  const answerWords = answerWithoutCategory.trim().split(/\s+/);
  if (answerWords.length === 0) return null;

  // Try to find the answer in the passage with punctuation flexibility
  // Strategy: find the sequence of tokens that matches the answer words
  // (with or without trailing punctuation)
  let bestMatch: {
    startIdx: number;
    endIdx: number;
    matchedText: string;
  } | null = null;

  // Scan through all possible starting positions
  for (
    let startIdx = 0;
    startIdx <= wordTokens.length - answerWords.length;
    startIdx++
  ) {
    let matches = true;
    const matchedTokens: string[] = [];

    // Check if the next N tokens match our answer words
    for (let i = 0; i < answerWords.length; i++) {
      const token = wordTokens[startIdx + i];
      const answerWord = answerWords[i];

      // Normalize ellipsis variations for comparison
      const normalizedToken = normalizeEllipsis(token);
      const normalizedAnswer = normalizeEllipsis(answerWord);

      // Compare with and without trailing punctuation
      const tokenTrimmed = trimTrailingPunctuation(normalizedToken);
      const answerTrimmed = trimTrailingPunctuation(normalizedAnswer);

      if (normalizedToken === normalizedAnswer || tokenTrimmed === answerTrimmed) {
        matchedTokens.push(token);
      } else {
        matches = false;
        break;
      }
    }

    if (matches) {
      // Found a match! Use the actual tokens from the passage
      bestMatch = {
        startIdx,
        endIdx: startIdx + answerWords.length - 1,
        matchedText: matchedTokens.join(" "),
      };
      break;
    }
  }

  // Fallback to original character-based search if token matching fails
  if (!bestMatch) {
    // Normalize both for comparison (handles "…" vs "..." variations)
    const normalizedPassage = normalizeEllipsis(passageText);
    const normalizedAnswer = normalizeEllipsis(answerWithoutCategory);
    const start = normalizedPassage.indexOf(normalizedAnswer);
    if (start === -1) return null;

    // Reconstruct passage from tokens to find position
    let charPos = 0;
    let tokenIndex = 0;

    while (charPos < start && tokenIndex < wordTokens.length) {
      charPos += wordTokens[tokenIndex].length;
      tokenIndex += 1;

      // Account for whitespace (find next non-whitespace position)
      while (charPos < passageText.length && /\s/.test(passageText[charPos])) {
        charPos += 1;
      }
    }

    bestMatch = {
      startIdx: tokenIndex,
      endIdx: tokenIndex + answerWords.length - 1,
      matchedText: answerWithoutCategory,
    };
  }

  return {
    startTokenIndex: bestMatch.startIdx,
    endTokenIndex: bestMatch.endIdx,
    selectedPassageText: bestMatch.matchedText,
    categories,
    status: status,
  };
};

/**
 * Converts a highlight object to a user answer string
 * Note: We preserve the original text (including trailing punctuation) because
 * checkAnswerMatch handles normalization for comparison. This ensures that
 * answers like "behind..." (which contains "...") are properly matched.
 */
const highlightToUserAnswer = (highlight: Highlight): string => {
  const selectedText = (highlight.selectedPassageText || "").trim();
  const categoryLabels = highlight.categories
    ?.map((category) => category.label)
    .filter((label): label is string => Boolean(label));
  const sortedLabels = categoryLabels
    ? [...categoryLabels].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      )
    : null;

  return sortedLabels && sortedLabels.length > 0
    ? `${selectedText} [${sortedLabels.join(", ")}]`
    : selectedText;
};

/**
 * Gets formatted correct answers with categories
 */
const getCorrectAnswersWithCategories = (correctAnswers: {
  [key: string]: string | string[];
}): { isWithCategories: boolean; formattedAnswers: string[] } => {
  const isWithCategories = Object.keys(correctAnswers).every(
    (key) => correctAnswers[key] !== key
  );

  const formattedAnswers = Object.keys(correctAnswers).map((key) => {
    const value = correctAnswers[key];
    if (!isWithCategories) {
      return Array.isArray(value) ? value[0] : value;
    }
    // Handle both string and array values
    const categoryStr = Array.isArray(value) ? value.sort().join(", ") : value;
    return `${key} [${categoryStr}]`;
  });

  return { isWithCategories, formattedAnswers };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SpotQuestion = ({
  currentQuestionWithMarkingResult,
  handleMarkQuestion,
  setUserAnswer,
  handleSendMessage,
  maxFlexibleSelection = true,
  isAwaitingResponse,
}: {
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  handleMarkQuestion: (markingContext: MarkingContext) => void;
  setUserAnswer: (
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
  handleSendMessage?: (message: string) => void;
  maxFlexibleSelection?: boolean;
  isAwaitingResponse?: boolean;
}) => {
  // ---------------------------------------------------------------------------
  // Derived State & Memos
  // ---------------------------------------------------------------------------

  const passageText = currentQuestionWithMarkingResult.passageText || "";

  const wordTokens = useMemo((): string[] => {
    const parts = passageText.split(/(\s+)/);
    return parts.filter((part) => part.trim());
  }, [passageText]);

  const correctWordsOrPhrases: string[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (currentQuestionWithMarkingResult.options as any).correct_words_or_phrases;

  const maxSelections = correctWordsOrPhrases.length;
  const maxSelectionWordsSize = Math.max(
    1,
    ...correctWordsOrPhrases.map((option) => option.split(" ").length)
  );

  const correctAnswers: { [key: string]: string } =
    (currentQuestionWithMarkingResult.correctAnswer as unknown as {
      [key: string]: string;
    }) || {};

  const { formattedAnswers: correctWordsOrPhrasesWithCategories } =
    getCorrectAnswersWithCategories(correctAnswers);

  const categories: Record<string, Category> | null =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (
      (currentQuestionWithMarkingResult.options as any)?.options as string[]
    )?.reduce((acc, option) => {
      const label = option.replace(/ \(.*?\)$/g, "");
      return {
        ...acc,
        [label]: {
          emoji: categoryEmojiMap[option] || null,
          label: label,
          displayName: option,
        }
      }
    }, {}) ?? null;

  const hasCategories =
    categories != null && Object.keys(categories).length > 0;

  const isAnswerMarked = currentQuestionWithMarkingResult.userMark != null;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const userAnswer: string[] =
    (currentQuestionWithMarkingResult.userAnswer as string[]) || [];

  const userAnswerHighlights: Highlight[] = userAnswer
    .map((answer) => {
      const highlight = userAnswerToHighlight(
        answer,
        passageText,
        wordTokens,
        "pending",
        categories
      );
      if (!highlight) return;
      const isCorrectAnswer = Object.keys(correctAnswers).some(
        (correctAnswer) =>
          checkAnswerMatch(highlight.selectedPassageText || "", correctAnswer)
      );
      return {
        ...highlight,
        // status: isCorrectAnswer ? "correct" : "incorrect",
        status: "correct",
      } as Highlight;
    })
    .filter((highlight) => highlight != null)
    .sort((a, b) => a?.startTokenIndex - b?.startTokenIndex);

  const [highlights, setHighlights] =
    useState<Highlight[]>(userAnswerHighlights);
  const [isMarked, setIsMarked] = useState(isAnswerMarked);
  const [categorizingHighlightIndex, setCategorizingHighlightIndex] = useState<
    number | null
  >(null);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Track wrong and partial attempts for analytics and AI context
  // consecutiveWrongAttempts: array of wrong selection texts (triggers AI message on 3rd)
  // partialAttempts: count of partially correct highlight selections (contains some correct words)
  // These can be used to: trigger AI help messages, adjust difficulty, track user struggle
  // Using ref instead of state to avoid StrictMode double-counting
  const consecutiveWrongAttemptsRef = useRef<string[]>([]);
  const [partialAttempts, setPartialAttempts] = useState(0);

  // Ref to track last sent payload to prevent duplicate sends
  const lastSentPayloadRef = useRef<string | null>(null);
  // Ref to track last sent highlight message (prevents StrictMode duplicate)
  const lastSentHighlightRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Helper Functions
  // ---------------------------------------------------------------------------

  // Send message with deduplication - compares payload to prevent duplicate sends
  const sendMessageIfNew = (payload: any) => {
    if (!handleSendMessage) return;

    const payloadString = JSON.stringify(payload);

    // Only send if this payload is different from the last one sent
    if (lastSentPayloadRef.current !== payloadString) {
      handleSendMessage(`spot_question_context:${payloadString}`);
      lastSentPayloadRef.current = payloadString;
    } else {
    }
  };

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Check if dialog has been shown before
    const hasSeenDialog = localStorage.getItem(
      "spot-question-welcome-dialog-shown"
    );
    if (!hasSeenDialog) {
      setShowWelcomeDialog(true);
    }
  }, [isMounted]);

  useEffect(() => {
    if (!isAnswerMarked && isMarked) {
      // Handle user manual retry after marking
      setHighlights([]);
      setIsMarked(false);
      // Reset attempt counters on retry
      consecutiveWrongAttemptsRef.current = [];
      setPartialAttempts(0);
      // Clear last sent payload to allow re-sending on retry
      lastSentPayloadRef.current = null;
    } else if (isAnswerMarked && !isMarked) {
      // Handle marking result after user answer
      setIsMarked(true);
    }
  }, [isAnswerMarked, isMarked, setIsMarked, setHighlights]);

  // Auto-show category selection for first highlight without categories on load
  useEffect(() => {
    // Only run if categories are present and not already categorizing
    if (!hasCategories || categorizingHighlightIndex !== null) {
      return;
    }

    // Find first highlight without categories (or with incomplete categories)
    const firstIncompleteIndex = highlights.findIndex((highlight) => {
      // Only process correct highlights or those pending categorization
      if (highlight.status !== "correct") {
        return false;
      }

      if (!highlight.categories || highlight.categories.length === 0) {
        return true;
      }
      // Check if this highlight needs more categories
      const correctCategoriesForHighlight = getCorrectAnswerValue(
        highlight.selectedPassageText || "",
        correctAnswers
      );
      const expectedCategories = Array.isArray(correctCategoriesForHighlight)
        ? correctCategoriesForHighlight
        : correctCategoriesForHighlight
          ? [correctCategoriesForHighlight]
          : [];

      // If there are expected categories and current doesn't match, needs categorization
      return (
        expectedCategories.length > 0 &&
        !expectedCategories.every((catLabel) =>
          highlight.categories?.some(
            (category) => category.label === catLabel
          )
        )
      );
    });

    if (firstIncompleteIndex !== -1) {
      setCategorizingHighlightIndex(firstIncompleteIndex);
    }
  }, [highlights, hasCategories, categorizingHighlightIndex, correctAnswers]);

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  const updateUserAnswer = (newHighlights: Highlight[]) => {
    const userAnswers = newHighlights.map((highlight) => {
      return highlightToUserAnswer(highlight);
    });
    setUserAnswer(userAnswers);
  };

  const validateMarkingHighlight = async () => {
    setHighlights((prevHighlights) => {
      const pendingHighlightIndex = prevHighlights.findIndex(
        (highlight) => highlight.status === "marking"
      );
      if (pendingHighlightIndex === -1) return prevHighlights;
      const pendingHighlight = prevHighlights[pendingHighlightIndex];

      // Check if this is the correct text (without category for now)
      // Use checkAnswerMatch to compare with trimming on both sides
      const selectedText = pendingHighlight.selectedPassageText || "";
      const trimmedText = trimTrailingPunctuation(selectedText);
      let isCorrectText = Object.keys(correctAnswers).some((correctAnswer) =>
        checkAnswerMatch(selectedText, correctAnswer)
      );

      let adjustedHighlight = pendingHighlight;

      // If not an exact match, check for flexibility (one word on either side)
      // This only applies to multi-word phrases
      if (!isCorrectText && trimmedText) {
        const selectedWords = trimmedText.split(/\s+/);

        // Only apply flexibility for multi-word selections (phrases)
        if (selectedWords.length > 1) {
          for (const correctAnswer of Object.keys(correctAnswers)) {
            const trimmedCorrectAnswer = trimTrailingPunctuation(correctAnswer);
            const correctWords = trimmedCorrectAnswer.split(/\s+/);

            // Only apply flexibility for multi-word correct answers
            if (correctWords.length > 1) {
              // Check if selection is 1 word on left + correct answer + 1 word on right (2 extra words)
              if (selectedWords.length === correctWords.length + 2) {
                const withoutBothEnds = selectedWords.slice(1, -1).join(" ");
                if (checkAnswerMatch(withoutBothEnds, correctAnswer)) {
                  isCorrectText = true;
                  // Adjust the highlight to exclude first and last words
                  adjustedHighlight = {
                    ...pendingHighlight,
                    startTokenIndex: pendingHighlight.startTokenIndex + 1,
                    endTokenIndex: pendingHighlight.endTokenIndex - 1,
                    selectedPassageText: withoutBothEnds,
                  };
                  break;
                }
              }

              if (selectedWords.length === correctWords.length + 1) {
                // Check if selection is correct answer + 1 word on right
                const withoutLastWord = selectedWords.slice(0, -1).join(" ");
                if (checkAnswerMatch(withoutLastWord, correctAnswer)) {
                  isCorrectText = true;
                  // Adjust the highlight to exclude the last word
                  adjustedHighlight = {
                    ...pendingHighlight,
                    startTokenIndex: pendingHighlight.startTokenIndex,
                    endTokenIndex: pendingHighlight.endTokenIndex - 1,
                    selectedPassageText: withoutLastWord,
                  };
                  break;
                }

                // Check if selection is 1 word on left + correct answer
                const withoutFirstWord = selectedWords.slice(1).join(" ");
                if (checkAnswerMatch(withoutFirstWord, correctAnswer)) {
                  isCorrectText = true;
                  // Adjust the highlight to exclude the first word
                  adjustedHighlight = {
                    ...pendingHighlight,
                    startTokenIndex: pendingHighlight.startTokenIndex + 1,
                    endTokenIndex: pendingHighlight.endTokenIndex,
                    selectedPassageText: withoutFirstWord,
                  };
                  break;
                }
              }
            }
          }
        }
      }

      // Maximum flexible selection: if enabled, check if selection contains exactly one correct answer
      if (!isCorrectText && maxFlexibleSelection && trimmedText) {
        const correctAnswersFound: Array<{
          answer: string;
          index: number;
          isPunctuation: boolean;
        }> = [];

        // Check each correct answer to see if it appears in the selected text
        Object.keys(correctAnswers).forEach((correctAnswer) => {
          const trimmedCorrectAnswer = trimTrailingPunctuation(correctAnswer);
          const isPunctuation = isPunctuationOnly(correctAnswer);
          
          // For punctuation-only answers (like "..."), search in the ORIGINAL selected text
          // For word-based answers, search in the trimmed text
          const searchTarget = isPunctuation ? correctAnswer.trim() : trimmedCorrectAnswer;
          const searchIn = isPunctuation ? selectedText : trimmedText;
          
          // Skip empty strings to avoid infinite loop with indexOf
          if (!searchTarget) return;
          
          // Normalize ellipsis variations and convert to lowercase for comparison
          const normalizedSelection = normalizeEllipsis(searchIn).toLowerCase();
          const normalizedCorrect = normalizeEllipsis(searchTarget).toLowerCase();

          // Find all occurrences of this correct answer in the selection
          let searchIndex = 0;
          while (true) {
            const foundIndex = normalizedSelection.indexOf(
              normalizedCorrect,
              searchIndex
            );
            if (foundIndex === -1) break;

            correctAnswersFound.push({
              answer: searchTarget,
              index: foundIndex,
              isPunctuation,
            });
            searchIndex = foundIndex + 1;
          }
        });

        // If exactly one correct answer found, adjust the highlight to match it
        if (correctAnswersFound.length === 1) {
          const found = correctAnswersFound[0];
          const correctAnswer = found.answer;
          const foundIndex = found.index;

          if (found.isPunctuation) {
            // For punctuation matches (like "..." in "behind..."), don't adjust token boundaries
            // because the punctuation is part of the same token - just accept the whole selection
            // Store the full selected text (not just punctuation) so highlight restoration works
            // checkAnswerMatch will still match "behind..." to "..." for correctness checking
            adjustedHighlight = {
              ...pendingHighlight,
              // Keep the original selectedPassageText (e.g., "behind...") for proper highlight restoration
              // selectedPassageText: pendingHighlight.selectedPassageText - already set from selection
            };
          } else {
            // Calculate new token boundaries for word-based answers
            // Count how many words/tokens are before the found correct answer in the selection
            const textBeforeCorrect = trimmedText.substring(0, foundIndex);
            const wordsBeforeCorrect = textBeforeCorrect.trim()
              ? textBeforeCorrect.trim().split(/\s+/).length
              : 0;

            // Count how many words are in the correct answer
            const correctAnswerWords = correctAnswer.split(/\s+/).length;

            // Adjust the highlight boundaries
            adjustedHighlight = {
              ...pendingHighlight,
              startTokenIndex:
                pendingHighlight.startTokenIndex + wordsBeforeCorrect,
              endTokenIndex:
                pendingHighlight.startTokenIndex +
                wordsBeforeCorrect +
                correctAnswerWords -
                1,
              selectedPassageText: correctAnswer,
            };
          }

          isCorrectText = true;
        }
      }

      // Check if this is a partial match (contains some correct words but not exact)
      // Skip punctuation-only answers for partial matching (they're handled in maxFlexibleSelection)
      let isPartialMatch = false;
      if (!isCorrectText && trimmedText) {
        const selectedWords = trimmedText.toLowerCase().split(/\s+/);
        isPartialMatch = Object.keys(correctAnswers).some((correctAnswer) => {
          // Skip punctuation-only correct answers for word-based partial matching
          if (isPunctuationOnly(correctAnswer)) return false;
          
          const trimmedCorrectAnswer = trimTrailingPunctuation(correctAnswer);
          const correctWords = trimmedCorrectAnswer.toLowerCase().split(/\s+/);
          // Check if there's any overlap between selected words and correct words
          return correctWords.some((correctWord) =>
            selectedWords.includes(correctWord)
          );
        });
      }

      const newHighlights = [...prevHighlights];
      const newStatus = isCorrectText
        ? "correct"
        : isPartialMatch
          ? "partial"
          : "incorrect";

      newHighlights[pendingHighlightIndex] = {
        ...adjustedHighlight,
        status: newStatus,
      };

      // Send highlight message (with deduplication for StrictMode)
      const selectionText = adjustedHighlight.selectedPassageText || trimmedText;
      const messageToSend = `spot_highlighted:${newStatus}:${selectionText}`;

      // Deduplicate: only send if different from last sent (prevents StrictMode double-send)
      // StrictMode calls happen within ~10ms, so reset after 50ms to allow new selections
      if (handleSendMessage && (lastSentHighlightRef.current !== messageToSend) ) {
        lastSentHighlightRef.current = messageToSend;
        handleSendMessage(messageToSend);
        // Reset ref after short delay so future selections of same text still work
        setTimeout(() => {
          lastSentHighlightRef.current = null;
        }, 50);
      } else {
      }

      // Send payload for partial attempts (deduplication handled by sendMessageIfNew)
      if (newStatus === "partial" && !isAwaitingResponse) {
        const partialSelectionText =
          adjustedHighlight.selectedPassageText || trimmedText;
        const payload = {
          type: "spot_question_partial_attempt",
          attemptNumber: 2,
          selection: partialSelectionText,
          questionText: currentQuestionWithMarkingResult.questionText,
          passageText: passageText,
          correctAnswers: Object.keys(correctAnswers),
          message: `The user selected "${partialSelectionText}" which is partially correct. Please encourage them and explain why it's almost there, and guide them on how to adjust their selection to get it right.`,
        };
        setTimeout(() => {
          sendMessageIfNew(payload);
        }, 100);
      }

      // Track consecutive wrong attempts (fully incorrect only, not partial)
      // Using ref to avoid StrictMode double-counting
      if (newStatus === "incorrect") {
        const selectionText = adjustedHighlight.selectedPassageText || trimmedText;

        // Update ref directly instead of setState callback
        consecutiveWrongAttemptsRef.current = [...consecutiveWrongAttemptsRef.current, selectionText];
        const newAttempts = consecutiveWrongAttemptsRef.current;

        // On 3rd consecutive wrong, trigger AI message (only if not awaiting)
        if (newAttempts.length === 3) {
          if (!isAwaitingResponse) {
            const payload = {
              type: "spot_question_consecutive_wrong",
              attemptNumber: 3,
              attempts: newAttempts,
              questionText: currentQuestionWithMarkingResult.questionText,
              passageText: passageText,
              correctAnswers: Object.keys(correctAnswers),
              message: `The user selected "${newAttempts[0]}", then "${newAttempts[1]}", then "${newAttempts[2]}" - 3 incorrect attempts in a row. Analyze the pattern: 1) Do they not understand what the question is asking for? 2) Are they just guessing randomly? 3) Are they nearly there but can't find the right answer? Based on this, take the student through the question step-by-step.`,
            };
            setTimeout(() => sendMessageIfNew(payload), 100);
            consecutiveWrongAttemptsRef.current = []; // Reset after sending
          } else {
          }
        }
      }

      if (!isCorrectText) {
        // Delete after some time if incorrect or partial
        setTimeout(() => {
          setHighlights((current) =>
            current.filter((_, index) => index !== pendingHighlightIndex)
          );
        }, 1000);
      } else {
        // Reset consecutive wrong attempts on correct selection
        consecutiveWrongAttemptsRef.current = [];

        // If correct and categories exist, show category popup after delay
        if (hasCategories) {
          setTimeout(() => {
            setCategorizingHighlightIndex(pendingHighlightIndex);
          }, 800);
        } else {
          // No categories needed, just update user answer
          setTimeout(() => {
            updateUserAnswer(newHighlights);
          }, 100);

          // Check if all correct highlights are selected
          const correctHighlightsCount = newHighlights.filter(
            (h) => h.status === "correct"
          ).length;

          if (correctHighlightsCount === maxSelections) {
            setTimeout(() => {
              handleMarkQuestion({
                questionLegacyId: currentQuestionWithMarkingResult.legacyId,
                question: currentQuestionWithMarkingResult.questionText,
                correctAnswer: currentQuestionWithMarkingResult.correctAnswer,
                markMax: currentQuestionWithMarkingResult.maxMark,
                userAnswer: newHighlights.map((highlight) =>
                  highlightToUserAnswer(highlight)
                ),
                canvas: currentQuestionWithMarkingResult.canvas,
                questionType: currentQuestionWithMarkingResult.questionType,
                subLessonId: currentQuestionWithMarkingResult.subLessonId,
              });
            }, 100);
          }
        }
      }
      return newHighlights;
    });
  };

  const handleCategorySelection = (category: string) => {
    if (categorizingHighlightIndex === null) return;

    const highlight = highlights[categorizingHighlightIndex];

    // Safety check: ensure highlight exists
    if (!highlight) return false;

    const correctCategory = getCorrectAnswerValue(
      highlight.selectedPassageText || "",
      correctAnswers
    );

    // Handle both single category (string) and multiple categories (array)
    const isCorrectCategory = Array.isArray(correctCategory)
      ? correctCategory.includes(category)
      : correctCategory === category;

    // Return validation result to the popup
    return isCorrectCategory;
  };

  const commitCategorySelection = (selectedCategories: Category[]) => {
    if (categorizingHighlightIndex === null) return;

    const currentIndex = categorizingHighlightIndex;

    // First, clear the current categorizing index
    setCategorizingHighlightIndex(null);

    setHighlights((prevHighlights) => {
      const newHighlights = [...prevHighlights];
      const currentHighlight = newHighlights[currentIndex];
      if (!currentHighlight) {
        return prevHighlights;
      }

      newHighlights[currentIndex] = {
        ...currentHighlight,
        categories: selectedCategories,
      };

      // Update user answer
      updateUserAnswer(newHighlights);

      // Check if all correct highlights are selected
      // Must have the right NUMBER of correct highlights AND match all unique correct answers
      // This handles cases like ["...", "...", "...", "..."] where there are 4 required selections
      // but only 1 unique answer value
      const correctHighlightsCount = newHighlights.filter(
        (h) => h.status === "correct"
      ).length;
      
      const allUniqueAnswersMatched =
        correctWordsOrPhrasesWithCategories.every((correctAnswer) =>
          newHighlights.some((h) =>
            checkAnswerMatch(highlightToUserAnswer(h), correctAnswer)
          )
        );

      // Both conditions must be met:
      // 1. User has selected the required number of highlights (maxSelections)
      // 2. All unique correct answer patterns are matched
      if (correctHighlightsCount >= maxSelections && allUniqueAnswersMatched) {
        setTimeout(() => {
          handleMarkQuestion({
            questionLegacyId: currentQuestionWithMarkingResult.legacyId,
            question: currentQuestionWithMarkingResult.questionText,
            correctAnswer: currentQuestionWithMarkingResult.correctAnswer,
            markMax: currentQuestionWithMarkingResult.maxMark,
            userAnswer: newHighlights.map((highlight) =>
              highlightToUserAnswer(highlight)
            ),
            canvas: currentQuestionWithMarkingResult.canvas,
            questionType: currentQuestionWithMarkingResult.questionType,
            subLessonId: currentQuestionWithMarkingResult.subLessonId,
          });
        }, 100);
      } else {
        // Find next highlight that needs categorization
        const nextIncompleteIndex = newHighlights.findIndex(
          (highlight, idx) => {
            if (idx <= currentIndex) return false; // Skip current and previous

            // Skip highlights with error states (incorrect, partial)
            if (
              highlight.status === "incorrect" ||
              highlight.status === "partial"
            ) {
              return false;
            }

            // Only process correct highlights
            if (highlight.status !== "correct") {
              return false;
            }

            if (!highlight.categories || highlight.categories.length === 0) {
              return true;
            }
            // Check if this highlight needs more categories
            const correctCategoriesForHighlight = getCorrectAnswerValue(
              highlight.selectedPassageText || "",
              correctAnswers
            );
            const expectedCategories = Array.isArray(
              correctCategoriesForHighlight
            )
              ? correctCategoriesForHighlight
              : correctCategoriesForHighlight
                ? [correctCategoriesForHighlight]
                : [];

            return (
              expectedCategories.length > 0 &&
              !expectedCategories.every((catLabel) =>
                highlight.categories?.some(
                  (category) => category.label === catLabel
                )
              )
            );
          }
        );

        // Move to next incomplete highlight after a short delay
        if (nextIncompleteIndex !== -1) {
          setTimeout(() => {
            setCategorizingHighlightIndex(nextIncompleteIndex);
          }, 100);
        }
      }

      return newHighlights;
    });
  };

  // ---------------------------------------------------------------------------
  // Render Logic
  // ---------------------------------------------------------------------------

  let highlightsWithMarkingResult = highlights;

  // Create duplicate highlights for all instances of correct highlights
  // If user selects a correct word/phrase, highlight all instances of it in the passage
  // EXCEPTION: If the expected answers contain duplicates (e.g., ["...", "...", "...", "..."]),
  // don't auto-duplicate because user needs to manually find each instance
  const duplicateHighlights: Highlight[] = [];

  // Check if expected answers have duplicates of any answer
  // Count how many times each unique correct answer appears
  const correctAnswerCounts = new Map<string, number>();
  correctWordsOrPhrases.forEach((answer) => {
    const normalized = normalizeEllipsis(answer.trim());
    correctAnswerCounts.set(normalized, (correctAnswerCounts.get(normalized) || 0) + 1);
  });

  const correctHighlights = highlights.filter((h) => h.status === "correct");

  correctHighlights.forEach((correctHighlight) => {
    // Check if this answer type is expected multiple times
    // If so, skip auto-duplication - user must find each instance manually
    const highlightText = normalizeEllipsis(
      trimTrailingPunctuation(correctHighlight.selectedPassageText || "")
    );
    
    // Find which correct answer this matches
    const matchingCorrectAnswer = Array.from(correctAnswerCounts.keys()).find(
      (correctAnswer) => checkAnswerMatch(highlightText, correctAnswer)
    );
    
    if (matchingCorrectAnswer && (correctAnswerCounts.get(matchingCorrectAnswer) || 0) > 1) {
      // This answer is expected multiple times - don't auto-duplicate
      return;
    }

    // Get the actual tokens from the highlight's position
    // This preserves the exact punctuation as it appears in wordTokens
    const searchTokens = wordTokens.slice(
      correctHighlight.startTokenIndex,
      correctHighlight.endTokenIndex + 1
    );
    
    if (searchTokens.length === 0) return;

    // Search through all token positions to find matches
    for (
      let startTokenIndex = 0;
      startTokenIndex <= wordTokens.length - searchTokens.length;
      startTokenIndex++
    ) {
      // Check if the tokens at this position match our search tokens
      // Normalize ellipsis for comparison (handles "…" vs "..." variations)
      let matches = true;
      for (let i = 0; i < searchTokens.length; i++) {
        const tokenText = wordTokens[startTokenIndex + i];
        if (normalizeEllipsis(tokenText) !== normalizeEllipsis(searchTokens[i])) {
          matches = false;
          break;
        }
      }

      if (matches) {
        const endTokenIndex = startTokenIndex + searchTokens.length - 1;

        // Check if this position already has a highlight
        const alreadyHighlighted = highlights.some(
          (h) =>
            h.startTokenIndex === startTokenIndex &&
            h.endTokenIndex === endTokenIndex
        );

        if (!alreadyHighlighted) {
          duplicateHighlights.push({
            startTokenIndex: startTokenIndex,
            endTokenIndex: endTokenIndex,
            selectedPassageText: correctHighlight.selectedPassageText,
            status: "correct",
            categories: correctHighlight.categories,
          });
        }
      }
    }
  });

  highlightsWithMarkingResult = [...highlights, ...duplicateHighlights];

  if (isMarked) {
    const missingCorrectHighlights = correctWordsOrPhrasesWithCategories
      .filter(
        (correctAnswer) =>
          !highlightsWithMarkingResult.some((highlight) =>
            checkAnswerMatch(highlightToUserAnswer(highlight), correctAnswer)
          )
      )
      .map((correctAnswer) =>
        userAnswerToHighlight(
          correctAnswer,
          passageText,
          wordTokens,
          "incorrect",
          categories
        )
      )
      .filter((highlight) => highlight != null);
    highlightsWithMarkingResult = [
      ...highlightsWithMarkingResult,
      ...missingCorrectHighlights,
    ];
  }

  return (
    <div>
      {isMounted && showWelcomeDialog && (
        <WelcomeDialog
          onClose={() => {
            setShowWelcomeDialog(false);
            localStorage.setItem("spot-question-welcome-dialog-shown", "true");
          }}
        />
      )}
      <HighlightSelectorInput
        wordTokens={wordTokens}
        highlights={highlightsWithMarkingResult}
        isMarked={isMarked}
        categories={categories}
        maxSelections={maxSelections}
        maxSelectionWordsSize={maxSelectionWordsSize}
        categorizingHighlightIndex={categorizingHighlightIndex}
        correctAnswers={correctAnswers}
        onNewHighlight={(highlight) => {
          if (highlights.length >= maxSelections) return;

          // Check if a highlight with the same token range already exists
          // Use token index overlap check (stricter than checkAnswerMatch)
          // This allows "..." and "behind..." to both be selected as separate correct answers
          const duplicateExists = highlights.some(
            (h) =>
              // Check for overlapping token ranges
              highlight.startTokenIndex <= h.endTokenIndex &&
              highlight.endTokenIndex >= h.startTokenIndex
          );

          if (duplicateExists) {
            // Don't create duplicate/overlapping highlight
            return;
          }

          const newHighlights: Highlight[] = [
            ...highlights,
            { ...highlight, status: "marking" },
          ];
          setHighlights(newHighlights);
          // Validate pending highlight after a small delay to allow the user to see the new highlight
          setTimeout(() => {
            validateMarkingHighlight();
          }, 25);
        }}
        onUpdateHighlight={(highlight, highlightIndex) => {
          const newHighlights = [...highlights];
          newHighlights[highlightIndex] = highlight;
          setHighlights(newHighlights);
        }}
        onDeleteHighlight={(highlightIndex) => {
          const newHighlights = highlights.filter(
            (_, index) => index !== highlightIndex
          );
          setHighlights(newHighlights);
        }}
        onCategorySelect={handleCategorySelection}
        onCategoryCommit={commitCategorySelection}
        enabled={!isAnswerMarked}
      />
    </div>
  );
};

// ============================================================================
// HIGHLIGHT SELECTOR INPUT COMPONENT
// ============================================================================

const HighlightSelectorInput = ({
  wordTokens,
  highlights,
  onNewHighlight,
  onHighlightClick,
  onUpdateHighlight,
  onDeleteHighlight,
  categories,
  maxSelections,
  maxSelectionWordsSize,
  isMarked,
  enabled,
  categorizingHighlightIndex,
  onCategorySelect,
  onCategoryCommit,
  correctAnswers,
}: {
  wordTokens: string[];
  highlights: Highlight[];
  onNewHighlight?: (highlight: Highlight) => void;
  onHighlightClick?: (highlight: Highlight, highlightIndex: number) => void;
  onUpdateHighlight?: (highlight: Highlight, highlightIndex: number) => void;
  onDeleteHighlight?: (highlightIndex: number) => void;
  categories: Record<string, Category> | null;
  maxSelections: number;
  maxSelectionWordsSize: number;
  isMarked: boolean;
  enabled: boolean;
  categorizingHighlightIndex: number | null;
  onCategorySelect?: (category: string) => boolean | undefined;
  onCategoryCommit?: (categories: Category[]) => void;
  correctAnswers?: { [key: string]: string | string[] };
}) => {
  // ---------------------------------------------------------------------------
  // State & Refs
  // ---------------------------------------------------------------------------

  const [selectedRange, setSelectedRange] = useState<Highlight | null>(null);
  const [hoveredHighlight, setHoveredHighlight] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    range: {
      start: number;
      end: number;
    } | null;
  }>({ range: null });

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------

  const isMarkingHighlight =
    highlights.findIndex((highlight) => highlight.status === "marking") !== -1;
  const errorHighlightIndex = highlights.findIndex(
    (highlight) =>
      highlight.status === "incorrect" || highlight.status === "partial"
  );
  const canSelectNewHighlight =
    enabled &&
    !isMarked &&
    errorHighlightIndex === -1 &&
    !isMarkingHighlight &&
    categorizingHighlightIndex === null;

  const tokenIndexToHighlightIndexMap = useMemo(() => {
    // Array of nulls of length wordTokens.length
    const tokenIndexToHighlightIndexMap = Array<number>(wordTokens.length).fill(
      -1
    );
    for (let i = 0; i < highlights.length; i++) {
      const highlight = highlights[i];
      for (
        let j = highlight.startTokenIndex;
        j <= highlight.endTokenIndex;
        j++
      ) {
        tokenIndexToHighlightIndexMap[j] = i;
      }
    }
    return tokenIndexToHighlightIndexMap;
  }, [wordTokens, highlights]);

  const categoryList = useMemo(
    () => (categories ? Object.values(categories) : null),
    [categories]
  );

  // ---------------------------------------------------------------------------
  // Event Handlers - Drag Operations
  // ---------------------------------------------------------------------------

  const startDragAt = (tokenIndex: number) => {
    if (
      // If not clicking on existing highlight and not able to select new highlight, return
      tokenIndexToHighlightIndexMap[tokenIndex] === -1 &&
      !canSelectNewHighlight
    )
      return;
    dragRef.current.range = { start: tokenIndex, end: tokenIndex };
    setSelectedRange({
      startTokenIndex: tokenIndex,
      endTokenIndex: tokenIndex,
      selectedPassageText: wordTokens[tokenIndex],
      status: "selecting",
    });
  };

  const extendDragTo = (tokenIndex: number) => {
    if (!dragRef.current.range) return;

    const start = dragRef.current.range.start;
    let end = tokenIndex;

    const direction = tokenIndex > start ? "forward" : "backward";

    // Check for highlights in the path or max size and stop before them
    if (direction === "forward") {
      // Extending forward - find the nearest highlight that would block us
      for (let i = start + 1; i < wordTokens.length && i <= tokenIndex; i++) {
        if (
          maxSelectionWordsSize === 1 &&
          i - start > maxSelectionWordsSize - 1
        )
          break;
        const highlightIndex = tokenIndexToHighlightIndexMap[i];
        if (highlightIndex !== -1) {
          end = highlights[highlightIndex].startTokenIndex - 1;
          break;
        }
      }
    } else if (direction === "backward") {
      // Extending backward - find the nearest highlight that would block us
      for (let i = start - 1; i >= 0 && i >= tokenIndex; i--) {
        // Only break early if we're enforcing single-word limit
        if (
          maxSelectionWordsSize === 1 &&
          start - i > maxSelectionWordsSize - 1
        )
          break;
        const highlightIndex = tokenIndexToHighlightIndexMap[i];
        if (highlightIndex !== -1) {
          end = highlights[highlightIndex].endTokenIndex + 1;
          break;
        }
      }
    }
    // Only enforce word limit if correct highlights are single words
    // If correct highlights are multiple words, allow any selection length
    if (
      maxSelectionWordsSize === 1 &&
      Math.abs(end - start) > maxSelectionWordsSize - 1
    ) {
      // + or - according to direction of drag
      end =
        direction === "forward"
          ? start + (maxSelectionWordsSize - 1)
          : start - (maxSelectionWordsSize - 1);
    }

    dragRef.current.range = {
      start: start,
      end: end,
    };
    setSelectedRange({
      startTokenIndex: Math.min(start, end),
      endTokenIndex: Math.max(start, end),
      status: "selecting",
    });
  };

  const endDrag = () => {
    if (!canSelectNewHighlight) return;
    const newRange = dragRef.current.range;
    dragRef.current = { range: null };
    setSelectedRange(null);
    setHoveredHighlight(null);
    if (!newRange) return;

    const highlightIndex = tokenIndexToHighlightIndexMap[newRange.start];
    // If event started on a highlight not consider it a drag
    if (highlightIndex !== -1) {
      // If a click (end on same word) delete highlight
      if (newRange.start === newRange.end) {
        onHighlightClick?.(highlights[highlightIndex], highlightIndex);
      }
      return;
    }
    // New highlight - always commit immediately
    const selectedText = wordTokens
      .slice(
        Math.min(newRange.start, newRange.end),
        Math.max(newRange.start, newRange.end) + 1
      )
      .join(" ");

    const highlight: Highlight = {
      status: "pending",
      startTokenIndex: Math.min(newRange.start, newRange.end),
      endTokenIndex: Math.max(newRange.start, newRange.end),
      selectedPassageText: selectedText,
    };

    onNewHighlight?.(highlight);
  };

  // ---------------------------------------------------------------------------
  // Event Handlers - Pointer Events
  // ---------------------------------------------------------------------------

  const wordIndexFromPoint = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return -1;
    const node = el.closest?.("[data-index]");
    if (!node) return -1;
    const idx = node.getAttribute("data-index");
    return idx != null ? parseInt(idx, 10) : -1;
  };

  const findClosestToken = (clientX: number, clientY: number): number => {
    if (!containerRef.current) return -1;

    // Get all token elements
    const tokenElements = Array.from(
      containerRef.current.querySelectorAll("[data-index]")
    ) as HTMLElement[];

    if (tokenElements.length === 0) return -1;

    const containerRect = containerRef.current.getBoundingClientRect();

    // Special case: if cursor is below container and to the right of last token, return last token
    if (clientY > containerRect.bottom && tokenElements.length > 0) {
      const lastTokenEl = tokenElements[tokenElements.length - 1];
      const lastTokenRect = lastTokenEl.getBoundingClientRect();

      if (clientX > lastTokenRect.right) {
        const lastIndex = parseInt(
          lastTokenEl.getAttribute("data-index") || "-1"
        );
        if (lastIndex !== -1) return lastIndex;
      }
    }

    let closestOnSameLine = null as { index: number; distance: number } | null;
    let closestOverall = null as { index: number; distance: number } | null;

    const Y_TOLERANCE = 20; // pixels tolerance for "same line"

    tokenElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const tokenCenterX = rect.left + rect.width / 2;
      const tokenCenterY = rect.top + rect.height / 2;

      const distanceX = Math.abs(tokenCenterX - clientX);
      const distanceY = Math.abs(tokenCenterY - clientY);
      const totalDistance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

      const index = parseInt(el.getAttribute("data-index") || "-1");
      if (index === -1) return;

      // Check if on same horizontal line
      if (distanceY < Y_TOLERANCE) {
        if (!closestOnSameLine || distanceX < closestOnSameLine.distance) {
          closestOnSameLine = { index, distance: distanceX };
        }
      }

      // Track closest overall
      if (!closestOverall || totalDistance < closestOverall.distance) {
        closestOverall = { index, distance: totalDistance };
      }
    });

    // Prefer same line, fall back to closest overall
    return closestOnSameLine?.index ?? closestOverall?.index ?? -1;
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    const wordIndex = wordIndexFromPoint(e.clientX, e.clientY);
    if (wordIndex === -1) return;
    containerRef.current?.setPointerCapture(e.pointerId);
    startDragAt(wordIndex);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.range) return;
    if (tokenIndexToHighlightIndexMap[dragRef.current.range.start] !== -1)
      return;

    let wordIndex = wordIndexFromPoint(e.clientX, e.clientY);

    // If cursor is outside container or not on a token, find closest
    if (wordIndex === -1) {
      wordIndex = findClosestToken(e.clientX, e.clientY);
    }

    if (wordIndex !== -1) extendDragTo(wordIndex);
  };

  function handleHover(e: React.MouseEvent<HTMLSpanElement>): void {
    const wordIndex = wordIndexFromPoint(e.clientX, e.clientY);
    if (wordIndex === -1) return;
    const highlightIndex = tokenIndexToHighlightIndexMap[wordIndex];
    if (highlightIndex !== -1) {
      setHoveredHighlight(highlightIndex);
    }
  }

  // ---------------------------------------------------------------------------
  // Event Handlers - Category Selection
  // ---------------------------------------------------------------------------

  return (
    <NotebookBackground>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        className={`relative cursor-pointer touch-none select-none pb-2 pl-16 pr-4 md:pr-6 ${
          !canSelectNewHighlight ? "pointer-events-none" : ""
        }`}
      >
        <div className="font-mono text-[15px]" style={{ lineHeight: "24px" }}>
          {tokenIndexToHighlightIndexMap.map((highlightIndex, tokenIndex) => {
            let highlight: Highlight | null = null;
            if (highlightIndex !== -1) {
              highlight = highlights[highlightIndex];
            } else if (
              selectedRange &&
              tokenIndex >= selectedRange.startTokenIndex &&
              tokenIndex <= selectedRange.endTokenIndex
            ) {
              highlight = selectedRange;
            }
            return (
              <HighlightableToken
                key={`${tokenIndex}`}
                tokenIndex={tokenIndex}
                token={wordTokens[tokenIndex]}
                highlight={highlight}
                isHovered={
                  hoveredHighlight !== null &&
                  hoveredHighlight === highlightIndex
                }
                onHover={handleHover}
                onHoverLeave={() => setHoveredHighlight(null)}
                isLastToken={tokenIndex === wordTokens.length - 1}
                isMarked={isMarked}
                enabled={canSelectNewHighlight}
              />
            );
          })}
        </div>
        {categorizingHighlightIndex !== null &&
          categoryList &&
          correctAnswers &&
          (() => {
            const categorizingHighlight =
              highlights[categorizingHighlightIndex];

            // Safety check: ensure highlight exists
            if (!categorizingHighlight) return null;

            const availableCategories = categoryList;
            if (!availableCategories) {
              return null;
            }

            const correctCategoriesForHighlight = getCorrectAnswerValue(
              categorizingHighlight.selectedPassageText || "",
              correctAnswers
            );

            return (
              <CategoryBubbleMenu
                onCategorySelect={onCategorySelect}
                onCommit={onCategoryCommit}
                categories={availableCategories}
                containerRef={containerRef}
                highlight={categorizingHighlight}
                correctCategories={correctCategoriesForHighlight}
              />
            );
          })()}
        {/* Render category badges for confirmed highlights */}
        {highlights.map((highlight, index) => {
          if (!highlight.categories || highlight.categories.length === 0)
            return null;

          return highlight.categories.map((category, catIndex) => (
            <CategoryBadge
              key={`badge-${index}-${catIndex}`}
              highlight={highlight}
              category={category}
              containerRef={containerRef}
              offsetIndex={catIndex}
              totalCategories={highlight.categories?.length || 1}
            />
          ));
        })}
      </div>
    </NotebookBackground>
  );
};

// ============================================================================
// HIGHLIGHTABLE TOKEN COMPONENT
// ============================================================================

const HighlightableToken = ({
  tokenIndex,
  token,
  highlight,
  onHover,
  isHovered,
  onHoverLeave,
  isLastToken,
  isMarked,
  enabled,
}: {
  tokenIndex: number;
  token: string;
  highlight?: Highlight | null;
  isHovered: boolean;
  onHover: (e: React.MouseEvent<HTMLSpanElement>) => void;
  onHoverLeave: (e: React.MouseEvent<HTMLSpanElement>) => void;
  isLastToken: boolean;
  isMarked: boolean;
  enabled: boolean;
}) => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [isConfettiPlayed, setIsConfettiPlayed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------

  const isCenterWord = highlight
    ? tokenIndex ===
      Math.floor((highlight.startTokenIndex + highlight.endTokenIndex) / 2)
    : false;

  const shouldHighlightSpace =
    highlight && tokenIndex + 1 <= highlight.endTokenIndex;

  const shouldShake =
    highlight?.status === "incorrect" || highlight?.status === "partial";

  const bgColor = useMemo(() => {
    // Normal (non-hovered) colors
    switch (highlight?.status) {
      case "correct":
        return isHovered && enabled ? "bg-[#D4EF97]" : "bg-[#E4FFB7]"; // Light green
      case "incorrect":
        return isHovered && enabled ? "bg-[#FCCACA]" : "bg-[#FFE0E0]"; // Dark red hover, light red default
      case "partial":
        return isHovered && enabled ? "bg-[#FFE082]" : "bg-[#FFF59D]"; // Yellow for partial match
      case "selecting":
      case "pending":
      case "marking":
        return isHovered && enabled ? "bg-[#BDDFFF]" : "bg-[#CDEFFF]"; // Blue for user selection
    }
    return ""; // No background
  }, [highlight, isHovered, enabled]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsConfettiPlayed(false);
    setAnimationKey((prev) => prev + 1);
  }, [isMarked]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <span
      key={`${token}-${tokenIndex}`}
      className="group inline-block"
      data-index={tokenIndex}
    >
      <span
        key={`inner-${tokenIndex}-${animationKey}`}
        className={`relative z-10 -mx-1 my-2 inline-block overflow-visible rounded-[6px] px-1 py-1 ${bgColor ? "transition-all duration-150 ease-out" : ""} ${bgColor} ${!bgColor && enabled ? "group-hover:bg-[#F2F2F7] transition-none" : ""} ${shouldShake ? "animate-[shake-incorrect_0.4s_cubic-bezier(0.36,0.07,0.19,0.97)]" : ""}`}
        style={{ transformOrigin: "center center" }}
      >
        {token}
        {highlight?.status === "correct" &&
          isCenterWord &&
          circleConfetti &&
          !isConfettiPlayed &&
          isMounted && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
              <Suspense fallback={null}>
                <LottieComponent
                  animationData={circleConfetti}
                  loop={false}
                  autoplay={true}
                  className="h-[240px] w-[240px]"
                  onComplete={() => setIsConfettiPlayed(true)}
                />
              </Suspense>
            </div>
          )}
      </span>
      {!isLastToken && (
        <span
          className={`-mx-1 my-1 inline-block px-1 py-1 transition-colors ${shouldHighlightSpace ? bgColor : ""}`}
        >
          &nbsp;
        </span>
      )}
    </span>
  );
};

// ============================================================================
// CATEGORY BADGE COMPONENT
// ============================================================================

const CategoryBadge = ({
  category,
  highlight,
  containerRef,
  offsetIndex = 0,
  totalCategories = 1,
}: {
  category: Category;
  highlight: Highlight;
  containerRef: React.RefObject<HTMLDivElement | null>;
  offsetIndex?: number;
  totalCategories?: number;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const badgeDisplayName = category.displayName || category.label;

  // Get word elements for positioning
  const lastWordEl = containerRef?.current?.querySelector(
    `[data-index="${highlight.endTokenIndex}"]`
  );
  const firstWordEl = containerRef?.current?.querySelector(
    `[data-index="${highlight.startTokenIndex}"]`
  );

  if (!lastWordEl || !firstWordEl) return null;

  const lastWordRect = lastWordEl.getBoundingClientRect();
  const firstWordRect = firstWordEl.getBoundingClientRect();
  const containerRect = containerRef.current?.getBoundingClientRect();

  if (!containerRect) return null;

  // Stack badges vertically if there are multiple categories
  const badgeHeight = 36; // Approximate height including margin

  // Check if expanded badge would be outside container edge
  // Estimate expanded width: ~350px for label + 40px for emoji
  const estimatedExpandedWidth = 200;
  const defaultX = lastWordRect.right - containerRect.left - 16;
  const isNearRightEdge =
    defaultX + estimatedExpandedWidth > containerRect.width;

  // Calculate position relative to container
  let x: number;
  let transform: string;

  if (isNearRightEdge) {
    // Position at left edge of first word and reverse column order
    x = defaultX + 26;
    transform = "translateX(-100%) translateY(-50%)";
  } else {
    // Default to top right of highlight
    x = defaultX - 6;
    transform = "translateY(-50%)";
  }

  // Reverse badge stacking when near right edge
  const yOffsetIndex = isNearRightEdge
    ? totalCategories - 1 - offsetIndex
    : offsetIndex;
  const y =
    lastWordRect.top +
    lastWordRect.height / 2 -
    containerRect.top +
    yOffsetIndex * badgeHeight -
    20;

  const position = { x, y };

  return (
    <div
      className={`pointer-events-auto absolute ${isHovered ? "z-[150]" : "z-[100]"}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: transform,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex items-center overflow-hidden rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${isNearRightEdge ? "" : "transition-all duration-150 ease-out"} ${isHovered ? "h-10 pr-4" : "h-8"}`}
      >
        <div
          className={`flex flex-shrink-0 items-center justify-center ${isNearRightEdge ? "" : "transition-all duration-150"} ${
            isHovered ? "h-10 w-10" : "h-8 w-8"
          }`}
        >
          {category.emoji ? (
            <span className="text-xl">{category.emoji}</span>
          ) : (
            <span className="text-xl">
              {badgeDisplayName.charAt(0) || category.label.charAt(0)}
            </span>
          )}
        </div>
        <span
          className={`whitespace-nowrap text-sm font-bold text-gray-800 ${isNearRightEdge ? "" : "transition-all duration-150"} ${
            isHovered
              ? `ml-2 max-w-[350px] opacity-100`
              : `ml-0 max-w-0 opacity-0`
          }`}
        >
          {badgeDisplayName}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// CATEGORY BUBBLE MENU COMPONENT
// ============================================================================

const CategoryBubbleMenu = ({
  onCategorySelect,
  onCommit,
  categories,
  containerRef,
  highlight,
  correctCategories,
}: {
  onCategorySelect?: (category: string) => boolean | undefined;
  onCommit?: (categories: Category[]) => void;
  categories: Category[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  highlight: Highlight;
  correctCategories?: string | string[];
}) => {
  // ---------------------------------------------------------------------------
  // Refs & State
  // ---------------------------------------------------------------------------

  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState<{
    x: number;
    transform: string;
    arrowOffset: number;
  }>({
    x: 0,
    transform: "translateX(-50%)",
    arrowOffset: 50,
  });
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [categoryValidationState, setCategoryValidationState] = useState<
    Record<string, "idle" | "correct" | "incorrect">
  >({});

  // ---------------------------------------------------------------------------
  // Position Calculation
  // ---------------------------------------------------------------------------

  const lastWordEl = containerRef?.current?.querySelector(
    `[data-index="${highlight.endTokenIndex}"]`
  );

  const rect = lastWordEl?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : 0;
  const y = rect ? rect.bottom : 0;

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useLayoutEffect(() => {
    if (isVisible || !menuRef.current || !rect) return;

    const menuWidth = menuRef.current.offsetWidth;
    const screenWidth = window.innerWidth;
    const padding = 32; // minimum distance from screen edge

    let renderX = x;
    let transform = "translateX(-50%)";
    let arrowOffset = 50; // centered by default (percentage)

    // Check if bubble would clip on the left
    const leftEdge = x - menuWidth / 2;
    if (leftEdge < padding) {
      // Position bubble from the left edge
      renderX = padding + menuWidth / 2;
      transform = "translateX(-50%)";
      // Calculate arrow offset as percentage
      arrowOffset = ((x - padding) / menuWidth) * 100;
      arrowOffset = Math.max(10, Math.min(90, arrowOffset)); // clamp between 10% and 90%
    }
    // Check if bubble would clip on the right
    else if (x + menuWidth / 2 > screenWidth - padding) {
      // Position bubble from the right edge
      renderX = screenWidth - padding - menuWidth / 2;
      transform = "translateX(-50%)";
      // Calculate arrow offset as percentage
      arrowOffset =
        ((x - (screenWidth - padding - menuWidth)) / menuWidth) * 100;
      arrowOffset = Math.max(10, Math.min(90, arrowOffset)); // clamp between 10% and 90%
    }

    setAdjustedPosition({ x: renderX, transform, arrowOffset });
    setIsVisible(true);
  }, [x, rect]);

  // Category selection dialog is not dismissable by clicking outside
  // Users must select all required categories to close it

  // Determine expected correct categories
  const expectedCorrectCategories = Array.isArray(correctCategories)
    ? correctCategories
    : correctCategories
      ? [correctCategories]
      : [];

  // Handle category selection with validation
  const handleCategoryClick = (category: Category) => {
    const alreadySelected = selectedCategories.some(
      (selected) => selected.label === category.label
    );
    if (alreadySelected) return;

    const validationState = categoryValidationState[category.label];
    if (validationState && validationState !== "idle") return;

    const isCorrect = onCategorySelect?.(category.label);

    if (isCorrect) {
      setCategoryValidationState((prev) => ({
        ...prev,
        [category.label]: "correct",
      }));

      const newSelectedCategories = [...selectedCategories, category];
      setSelectedCategories(newSelectedCategories);

      const allCorrectSelected =
        expectedCorrectCategories.length > 0 &&
        expectedCorrectCategories.every((cat) =>
          newSelectedCategories.some(
            (selectedCategory) => selectedCategory.label === cat
          )
        );

      if (allCorrectSelected) {
        setTimeout(() => {
          onCommit?.(newSelectedCategories);
        }, 1000);
      }
    } else {
      setCategoryValidationState((prev) => ({
        ...prev,
        [category.label]: "incorrect",
      }));

      setTimeout(() => {
        setCategoryValidationState((prev) => ({
          ...prev,
          [category.label]: "idle",
        }));
      }, 700);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!lastWordEl) return null;

  return (
    <div
      ref={menuRef}
      className={`pointer-events-auto fixed z-[200] transition-opacity duration-150 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${y + 10}px`,
        transform: adjustedPosition.transform,
      }}
    >
      {/* Arrow pointing up - positioned to point at the actual highlight */}
      <div
        className="absolute -top-2 h-0 w-0"
        style={{
          left: `${adjustedPosition.arrowOffset}%`,
          transform: "translateX(-50%)",
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderBottom: "8px solid white",
          filter: "drop-shadow(0 -2px 3px rgba(0, 0, 0, 0.1))",
        }}
      />
      <div className="flex max-w-[600px] flex-wrap gap-0 rounded-[16px] bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        {categories.map((category) => {
          const validationState =
            categoryValidationState[category.label] || "idle";
          const isSelected = selectedCategories.some(
            (selectedCategory) => selectedCategory.label === category.label
          );
          const isCorrect = validationState === "correct";
          const isIncorrect = validationState === "incorrect";
          const isDisabled =
            isSelected ||
            (validationState !== "idle" && validationState !== "correct");

          return (
            <button
              key={category.label}
              onClick={() => handleCategoryClick(category)}
              disabled={isDisabled}
              className={`flex min-w-[100px] flex-row items-center gap-2 rounded-[12px] px-2 py-1 ${
                isCorrect
                  ? "border-2 border-[#4CAF50] bg-[#E4FFB7]"
                  : isIncorrect
                    ? "border-2 border-[#F44336] bg-[#FFE0E0]"
                    : "border-2 border-transparent hover:bg-gray-100"
              } ${isDisabled && !isCorrect ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span className="text-2xl">{category.emoji}</span>
              <span className="text-[15px] font-rounded-bold text-gray-800">
                {category.displayName || category.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// WELCOME DIALOG COMPONENT
// ============================================================================

const WelcomeDialog = ({ onClose }: { onClose: () => void }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile/touch-enabled
    const hasTouch =
      "ontouchstart" in window ||
      (navigator.maxTouchPoints || 0) > 0 ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).msMaxTouchPoints > 0;

    // Also check user agent for mobile devices
    const isMobileUA = /Mobi|Android|iPhone|iPod|iPad/i.test(
      navigator.userAgent
    );

    setIsMobile(hasTouch || isMobileUA);
  }, []);

  const instructionText = isMobile
    ? "Use your finger to select words or phrases"
    : "Use the mouse to select words or phrases";

  const dialogContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative flex w-[90%] max-w-[600px] flex-col items-center overflow-hidden rounded-[16px] bg-white p-4 text-center shadow-[0_0_32px_rgba(0,0,0,0.2)] md:w-[60%] md:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-5 top-5">
          <button
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <h2 className="mb-6 mt-6 text-2xl font-rounded-bold text-gray-800 md:text-2xl">
          {instructionText}
        </h2>

        <div className="mb-6 flex w-full items-center justify-center">
          <Image
            src="/output.webp"
            alt="Welcome"
            width={400}
            height={400}
            className="h-auto max-w-full object-contain rounded-[8px]"
            unoptimized
          />
        </div>

        <PrimaryButtonClicky
          buttonText="Start"
          onPress={onClose}
          showKeyboardShortcut={false}
          buttonState="filled"
          isLong={true}
        />
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};

export default SpotQuestion;
