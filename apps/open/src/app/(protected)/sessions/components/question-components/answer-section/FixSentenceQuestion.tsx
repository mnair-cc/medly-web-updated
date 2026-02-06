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
import NotebookBackground from "./NotebookBackground";
import circleConfetti from "@/app/_components/animations/circle_confetti_green.json";

const LottieComponent = lazy(() => import("lottie-react"));

// ============================================================================
// TYPES
// ============================================================================

type EditState = "idle" | "editing" | "correct" | "marked_incorrect";

type DiffPart = {
  type: "added" | "removed" | "unchanged";
  value: string;
};

// ============================================================================
// DIFF ALGORITHM
// ============================================================================

// Splits the input into tokens while preserving whitespace tokens and lifting
// punctuation into their own tokens so trailing commas/periods don't get glued
// to words (e.g., "The," → "The", ",").
const tokenizeText = (text: string): string[] => {
  if (!text) return [];

  const chars = Array.from(text);
  const tokens: string[] = [];
  const punctuationSet = new Set([
    ".",
    ",",
    "!",
    "?",
    ";",
    ":",
    "-",
    "—",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    '"',
    "'",
  ]);

  let currentWord = "";
  let currentWhitespace = "";

  const flushWord = () => {
    if (currentWord.length > 0) {
      tokens.push(currentWord);
      currentWord = "";
    }
  };

  const flushWhitespace = () => {
    if (currentWhitespace.length > 0) {
      tokens.push(currentWhitespace);
      currentWhitespace = "";
    }
  };

  chars.forEach((char) => {
    if (/\s/.test(char)) {
      flushWord();
      currentWhitespace += char;
    } else if (punctuationSet.has(char)) {
      flushWord();
      flushWhitespace();
      tokens.push(char);
    } else {
      flushWhitespace();
      currentWord += char;
    }
  });

  flushWord();
  flushWhitespace();

  return tokens;
};

const isWhitespaceToken = (token: string): boolean => token.trim() === "";

// Builds an LCS (Longest Common Subsequence) matrix for two token arrays.
// The matrix lets us re-walk the best alignment later, which keeps the largest
// unchanged spans intact before analyzing additions/removals.
const buildLcsMatrix = (source: string[], target: string[]): number[][] => {
  const rows = source.length + 1;
  const cols = target.length + 1;

  const matrix = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  );

  for (let i = source.length - 1; i >= 0; i--) {
    for (let j = target.length - 1; j >= 0; j--) {
      if (source[i] === target[j]) {
        matrix[i][j] = matrix[i + 1][j + 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
      }
    }
  }

  return matrix;
};

// Replays the LCS matrix to classify each token as unchanged, added, or removed.
// This gives us a clear word/whitespace level diff before we drop down to chars.
const diffTokenSequences = (
  originalTokens: string[],
  editedTokens: string[]
): DiffPart[] => {
  const lcsMatrix = buildLcsMatrix(originalTokens, editedTokens);
  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;

  while (i < originalTokens.length && j < editedTokens.length) {
    if (originalTokens[i] === editedTokens[j]) {
      parts.push({ type: "unchanged", value: originalTokens[i] });
      i++;
      j++;
    } else if (lcsMatrix[i + 1][j] >= lcsMatrix[i][j + 1]) {
      parts.push({ type: "removed", value: originalTokens[i] });
      i++;
    } else {
      parts.push({ type: "added", value: editedTokens[j] });
      j++;
    }
  }

  while (i < originalTokens.length) {
    parts.push({ type: "removed", value: originalTokens[i] });
    i++;
  }

  while (j < editedTokens.length) {
    parts.push({ type: "added", value: editedTokens[j] });
    j++;
  }

  return parts;
};

const mergeConsecutiveParts = (parts: DiffPart[]): DiffPart[] => {
  if (parts.length === 0) return [];

  const merged: DiffPart[] = [];
  let current = { ...parts[0] };

  for (let i = 1; i < parts.length; i++) {
    if (parts[i].type === current.type) {
      current.value += parts[i].value;
    } else {
      merged.push(current);
      current = { ...parts[i] };
    }
  }

  merged.push(current);

  return merged;
};

// Does the same LCS-based diff, but at a character level for a single word.
// Returning grouped parts keeps consecutive adds/removes together, e.g. `ere`
// vs `as` → `-ere` `+as`.
const diffCharsInWord = (original: string, edited: string): DiffPart[] => {
  const chars1 = Array.from(original);
  const chars2 = Array.from(edited);
  const rows = chars1.length + 1;
  const cols = chars2.length + 1;

  const matrix = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  );

  for (let i = chars1.length - 1; i >= 0; i--) {
    for (let j = chars2.length - 1; j >= 0; j--) {
      if (chars1[i] === chars2[j]) {
        matrix[i][j] = matrix[i + 1][j + 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
      }
    }
  }

  const charParts: DiffPart[] = [];
  let i = 0;
  let j = 0;

  while (i < chars1.length && j < chars2.length) {
    if (chars1[i] === chars2[j]) {
      charParts.push({ type: "unchanged", value: chars1[i] });
      i++;
      j++;
    } else if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      charParts.push({ type: "removed", value: chars1[i] });
      i++;
    } else {
      charParts.push({ type: "added", value: chars2[j] });
      j++;
    }
  }

  while (i < chars1.length) {
    charParts.push({ type: "removed", value: chars1[i] });
    i++;
  }

  while (j < chars2.length) {
    charParts.push({ type: "added", value: chars2[j] });
    j++;
  }

  return mergeConsecutiveParts(charParts);
};

const shouldUseCharDiff = (removedToken: string, addedToken: string): boolean =>
  !isWhitespaceToken(removedToken) && !isWhitespaceToken(addedToken);

// High-level diff driver:
// 1. Tokenize so whitespace is preserved.
// 2. Run LCS so the biggest unchanged spans stay untouched.
// 3. For each removed+added token pair, drill into a character-level diff to
//    show inline substitutions inside a word.
// 4. Merge adjacent parts to keep the DOM light.
const buildDiffParts = (originalText: string, editedText: string): DiffPart[] => {
  if (originalText === editedText) {
    return originalText ? [{ type: "unchanged", value: originalText }] : [];
  }

  const originalTokens = tokenizeText(originalText);
  const editedTokens = tokenizeText(editedText);
  const tokenParts = diffTokenSequences(originalTokens, editedTokens);
  const finalParts: DiffPart[] = [];

  for (let idx = 0; idx < tokenParts.length; idx++) {
    const current = tokenParts[idx];

    if (
      current.type === "removed" &&
      idx + 1 < tokenParts.length &&
      tokenParts[idx + 1].type === "added" &&
      shouldUseCharDiff(current.value, tokenParts[idx + 1].value)
    ) {
      const charDiff = diffCharsInWord(current.value, tokenParts[idx + 1].value);
      finalParts.push(...charDiff);
      idx++;
      continue;
    }

    finalParts.push(current);
  }

  return mergeConsecutiveParts(finalParts);
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const FixSentenceQuestion = ({
  currentQuestionWithMarkingResult,
  handleMarkQuestion,
  setUserAnswer,
}: {
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  handleMarkQuestion: (markingContext: MarkingContext) => void;
  setUserAnswer: (
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
}) => {
  // ---------------------------------------------------------------------------
  // Derived State & Memos
  // ---------------------------------------------------------------------------

  const options = currentQuestionWithMarkingResult.options as unknown as {
    original_text: string;
    correct_text: string;
    fix_type: string;
  };

  const originalText = options.original_text;
  const correctText = options.correct_text;
  const isAnswerMarked = currentQuestionWithMarkingResult.userMark != null;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [editedText, setEditedText] = useState<string>(
    (currentQuestionWithMarkingResult.userAnswer as string) || originalText
  );
  const [editState, setEditState] = useState<EditState>("idle");
  const [showConfetti, setShowConfetti] = useState(false);
  const [diffParts, setDiffParts] = useState<DiffPart[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Auto-adjust textarea height
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedText]);

  // Reset state when question changes or user retries
  useEffect(() => {
    const savedAnswer = currentQuestionWithMarkingResult.userAnswer as string;

    if (!isAnswerMarked) {
      // Question not marked - check if we have a saved answer
      if (savedAnswer && savedAnswer !== originalText) {
        // User has edited but not completed - restore their progress
        setEditedText(savedAnswer);
      } else {
        // No saved answer or user clicked retry - reset to original
        setEditedText(originalText);
      }
      setEditState("idle");
      setDiffParts([]);
    } else {
      // Question is marked - show their submitted answer with diff
      setEditedText(savedAnswer || originalText);

      const diff = buildDiffParts(originalText, savedAnswer || originalText);
      setDiffParts(diff);

      // Show appropriate state based on mark
      if (currentQuestionWithMarkingResult.userMark === currentQuestionWithMarkingResult.maxMark) {
        setEditState("correct");
        setShowConfetti(true);
      } else {
        setEditState("marked_incorrect");
      }
    }
  }, [
    isAnswerMarked,
    currentQuestionWithMarkingResult.userAnswer,
    currentQuestionWithMarkingResult.userMark,
    originalText,
  ]);

  // Auto-mark when the answer matches the correct text
  // useEffect(() => {
  //   // Only auto-mark if question is not already marked and user has made changes
  //   if (isAnswerMarked || editedText === originalText) {
  //     return;
  //   }

  //   // Normalize text for comparison (same as marking system)
  //   const normalizeWhitespace = (text: string) =>
  //     text.trim().replace(/\s+/g, " ");
  //   const normalizeDashes = (text: string) =>
  //     text.replace(/[\u2013\u2014]/g, "-");

  //   const normalizedEdited = normalizeDashes(normalizeWhitespace(editedText));
  //   const normalizedCorrect = normalizeDashes(normalizeWhitespace(correctText));

  //   // If the normalized text matches, automatically mark the question
  //   if (normalizedEdited === normalizedCorrect) {
  //     handleMarkQuestion({
  //       questionLegacyId: currentQuestionWithMarkingResult.legacyId,
  //       question: currentQuestionWithMarkingResult.questionText,
  //       questionStem: currentQuestionWithMarkingResult.questionStem,
  //       correctAnswer: currentQuestionWithMarkingResult.correctAnswer,
  //       markMax: currentQuestionWithMarkingResult.maxMark,
  //       userAnswer: editedText,
  //       canvas: currentQuestionWithMarkingResult.canvas,
  //       questionType: currentQuestionWithMarkingResult.questionType,
  //       lessonLegacyIds: currentQuestionWithMarkingResult.lessonLegacyIds,
  //     });
  //   }
  // }, [
  //   editedText,
  //   correctText,
  //   originalText,
  //   isAnswerMarked,
  //   handleMarkQuestion,
  //   currentQuestionWithMarkingResult.legacyId,
  //   currentQuestionWithMarkingResult.questionText,
  //   currentQuestionWithMarkingResult.questionStem,
  //   currentQuestionWithMarkingResult.correctAnswer,
  //   currentQuestionWithMarkingResult.maxMark,
  //   currentQuestionWithMarkingResult.canvas,
  //   currentQuestionWithMarkingResult.questionType,
  //   currentQuestionWithMarkingResult.lessonLegacyIds,
  // ]);

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditedText(newText);
    setEditState("editing");
    setUserAnswer(newText);
  };

  // ---------------------------------------------------------------------------
  // Render Logic
  // ---------------------------------------------------------------------------

  const isReadOnly = isAnswerMarked || editState === "correct" || editState === "marked_incorrect";
  const showDiff =
    (editState === "correct" || editState === "marked_incorrect") &&
    diffParts.length > 0;

  const hasAdditions = useMemo(
    () => diffParts.some((part) => part.type === "added"),
    [diffParts]
  );

  const shouldShowConfettiOnPart = (partType: DiffPart["type"]) => {
    if (partType === "added") {
      return hasAdditions;
    }

    if (partType === "removed") {
      return !hasAdditions;
    }

    return false;
  };

  const renderConfettiOverlay = (shouldShow: boolean) =>
    editState === "correct" && showConfetti && circleConfetti && shouldShow ? (
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <Suspense fallback={null}>
          <LottieComponent
            animationData={circleConfetti}
            loop={false}
            autoplay={true}
            className="w-[240px] h-[240px]"
            onComplete={() => setShowConfetti(false)}
          />
        </Suspense>
      </span>
    ) : null;

  return (
    <NotebookBackground>
      <div className="pl-16 pr-4 md:pr-6 pb-2 relative">
        <div className="relative">
          {!showDiff ? (
            // Editable textarea when user is typing or idle
            <textarea
              ref={textareaRef}
              value={editedText}
              onChange={handleTextChange}
              disabled={isReadOnly}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className={`
                w-full text-[15px] font-mono resize-none overflow-hidden
                px-1 rounded-[8px] transition-colors
                border-2 border-transparent
                focus:outline-none
                bg-transparent
                ${isReadOnly ? "cursor-not-allowed" : "cursor-text"}
              `}
              style={{
                lineHeight: "48px",
                minHeight: "48px",
              }}
            />
          ) : (
            // Diff view when showing correct/incorrect feedback
            <div
              className="w-full text-[15px] font-mono px-1 rounded-[8px] transition-colors whitespace-pre-wrap"
              style={{
                lineHeight: "48px",
                minHeight: "48px",
              }}
            >
              {diffParts.map((part, index) => {
                if (part.type === "unchanged") {
                  return (
                    <span key={index} className="relative">
                      <span>{part.value}</span>
                    </span>
                  );
                } else if (part.type === "added") {
                  return (
                    <span key={index} className="relative">
                      <span
                        className={`rounded-[4px] px-[2px] inline-block ${editState === "correct"
                            ? "bg-[#E4FFB7] text-[#2E7D32]"
                            : "bg-[#FFE0E0] text-[#C62828]"
                          }`}
                        style={{
                          lineHeight: "28px",
                          verticalAlign: "baseline",
                        }}
                      >
                        {part.value}
                      </span>
                      {renderConfettiOverlay(shouldShowConfettiOnPart(part.type))}
                    </span>
                  );
                } else if (part.type === "removed") {
                  return (
                    <span key={index} className="relative">
                      <span className="line-through text-[#C62828] opacity-60">
                        {part.value}
                      </span>
                      {renderConfettiOverlay(shouldShowConfettiOnPart(part.type))}
                    </span>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
        {/* Optional hint text */}
        {editState === "idle" && !isAnswerMarked && (
          <div className="font-rounded-bold mt-2 text-sm text-gray-500 pl-1 flex flex-row items-center gap-1 cursor-default select-none">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.9912 22.7422C18.9746 22.7422 23.0879 18.6289 23.0879 13.6543C23.0879 8.67969 18.9658 4.56641 13.9824 4.56641C9.00781 4.56641 4.90332 8.67969 4.90332 13.6543C4.90332 18.6289 9.0166 22.7422 13.9912 22.7422ZM13.7803 15.4648C13.209 15.4648 12.8926 15.2012 12.8926 14.6738V14.5771C12.8926 13.751 13.3672 13.2852 14.0176 12.8281C14.791 12.292 15.1689 12.002 15.1689 11.4395C15.1689 10.833 14.7031 10.4287 13.9824 10.4287C13.4551 10.4287 13.0684 10.6924 12.7783 11.1406C12.4971 11.457 12.3652 11.7295 11.8379 11.7295C11.4072 11.7295 11.0557 11.4482 11.0557 11.0088C11.0557 10.833 11.0908 10.6748 11.1523 10.5166C11.4424 9.65527 12.4971 8.95215 14.0703 8.95215C15.7051 8.95215 17.085 9.82227 17.085 11.3516C17.085 12.4062 16.5049 12.9336 15.5908 13.5225C15.0107 13.9004 14.6768 14.2168 14.6504 14.6914C14.6504 14.7178 14.6416 14.7617 14.6416 14.7969C14.6152 15.1748 14.29 15.4648 13.7803 15.4648ZM13.7715 18.2773C13.1738 18.2773 12.6816 17.8467 12.6816 17.2666C12.6816 16.6865 13.165 16.2559 13.7715 16.2559C14.3691 16.2559 14.8525 16.6865 14.8525 17.2666C14.8525 17.8555 14.3604 18.2773 13.7715 18.2773Z" 
              fill="rgba(0,0,0,0.4)" />
            </svg>

            Click to edit the text and fix the error
          </div>
        )}
      </div>
    </NotebookBackground>
  );
};

export default FixSentenceQuestion;
