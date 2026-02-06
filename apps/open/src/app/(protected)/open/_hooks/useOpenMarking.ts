"use client";

import { useState, useCallback } from "react";
import { MarkingContext, MarkingResult, AnswerPair } from "@/app/types/types";
import { markAnswer } from "../_ai/markAnswer";
import { checkAnswerMatch } from "@/app/(protected)/sessions/components/question-components/answer-section/SpotQuestion";
import {
  buildCanvasLatexSummary,
  renderLinesToPngBase64,
} from "@/app/_lib/utils/utils";
import { useTracking } from "@/app/_lib/posthog/useTracking";

interface UseOpenMarkingParams {
  updateQuestionMarkingResult: (
    questionLegacyId: string,
    markingResult: MarkingResult
  ) => void;
}

// Question types that require AI marking (long-form answers)
const AI_MARKING_TYPES = [
  "calculate",
  "compare",
  "define",
  "describe",
  "explain",
  "long_answer",
  "state",
  "short_answer",
  "write",
];

// Question types that can be marked client-side
const CLIENT_MARKING_TYPES = [
  "mcq",
  "true_false",
  "mcq_multiple",
  "match_pair",
  "fill_in_the_gaps_text",
  "spot",
  "fix_sentence",
  "reorder",
  "group",
  "number",
];

export function useOpenMarking({
  updateQuestionMarkingResult,
}: UseOpenMarkingParams) {
  const [isMarking, setIsMarking] = useState(false);
  const [markingQuestionId, setMarkingQuestionId] = useState<string | null>(null);
  const { track } = useTracking();

  const handleMarkQuestion = useCallback(
    async (context: MarkingContext) => {
      const { questionType, questionLegacyId } = context;

      // Check if we can mark this question type
      if (
        !AI_MARKING_TYPES.includes(questionType) &&
        !CLIENT_MARKING_TYPES.includes(questionType)
      ) {
        console.warn(`Unsupported question type for marking: ${questionType}`);
        return;
      }

      setIsMarking(true);
      setMarkingQuestionId(questionLegacyId);

      try {
        let result: MarkingResult;

        console.log("📝 [Marking] Starting mark for:", {
          questionLegacyId,
          questionType,
          isAIMarking: AI_MARKING_TYPES.includes(questionType),
        });
        console.log("📝 [Marking] Full context:", JSON.parse(JSON.stringify(context)));

        if (AI_MARKING_TYPES.includes(questionType)) {
          // AI marking for long-form questions
          console.log("🤖 [Marking] Using AI marking...");
          result = await markWithAI(context);
        } else {
          // Client-side marking for simple types
          console.log("💻 [Marking] Using client-side marking...");
          result = markClientSide(context);
        }

        console.log("✅ [Marking] Result:", {
          questionLegacyId: result.questionLegacyId,
          userMark: result.userMark,
          markMax: result.markMax,
          isMarked: result.isMarked,
          annotatedAnswer: result.annotatedAnswer,
          markingTable: result.markingTable,
        });

        track("practice_answer_checked", {
          question_type: questionType,
          is_correct: result.userMark === result.markMax,
          mark_awarded: result.userMark,
          mark_max: result.markMax,
        });

        updateQuestionMarkingResult(questionLegacyId, result);
      } catch (error) {
        console.error("❌ [Marking] Error marking question:", error);
      } finally {
        setIsMarking(false);
        setMarkingQuestionId(null);
      }
    },
    [updateQuestionMarkingResult, track]
  );

  return {
    handleMarkQuestion,
    isMarking,
    markingQuestionId,
  };
}

/**
 * Mark a long-form question using AI
 */
async function markWithAI(context: MarkingContext): Promise<MarkingResult> {
  // Process canvas data (both Desmos expressions and sketch canvas maths)
  let canvasLatexSummary = "";
  let canvasStrokesPngBase64 = "";

  // Collect all expressions from both Desmos and sketch canvas
  const allExpressions: any[] = [];

  // Add Desmos expressions if they exist
  if (context.desmosExpressions && context.desmosExpressions.length > 0) {
    allExpressions.push(...context.desmosExpressions);
  }

  // Add sketch canvas maths if they exist
  if (context.canvas?.maths && context.canvas.maths.length > 0) {
    allExpressions.push(...context.canvas.maths);
  }

  // Check if canvas paths exist
  const hasCanvasPaths =
    context.canvas?.paths && context.canvas.paths.length > 0;

  // Build question text with stem if available (needed for header)
  const questionWithStem = context.questionStem
    ? `${context.questionStem}\n\n${context.question}`
    : String(context.question);

  // Build canvas latex summary and PNG from combined expressions and canvas paths
  if (allExpressions.length > 0 || hasCanvasPaths) {
    // Build canvas latex summary from all expressions
    const canvasLatexSummaryArr = buildCanvasLatexSummary(allExpressions);
    canvasLatexSummary = JSON.stringify(canvasLatexSummaryArr);

    // Build PNG base64 with question text header, canvas paths at the top, followed by expression strokes
    try {
      const combinedStrokes: any[] = [];

      // Add canvas paths first (transformed to expected format)
      if (hasCanvasPaths && context.canvas?.paths) {
        combinedStrokes.push({
          strokes: {
            paths: context.canvas.paths.map((path: any) => ({
              paths: path.points || path.paths,
            })),
          },
        });
      }

      // Add expressions second
      if (allExpressions.length > 0) {
        combinedStrokes.push(
          ...allExpressions.map((l: any) => ({
            strokes: l?.strokes,
          }))
        );
      }

      canvasStrokesPngBase64 = await renderLinesToPngBase64(combinedStrokes, {
        headers: [questionWithStem],
        headerMarginBottom: 16,
        padding: 8,
        background: "#ffffff",
        strokeColor: "#2563eb",
        lineWidth: 4,
        maxWidth: 900,
      });
    } catch (e) {
      console.error("Failed to render strokes PNG", e);
      // Continue without base64 data
    }
  }

  // Filter out paths from canvas data before sending (paths are in PNG)
  const canvasWithoutPaths = context.canvas
    ? (() => {
        const { paths, ...rest } = context.canvas;
        return rest;
      })()
    : {};

  const canvasJson = Object.keys(canvasWithoutPaths).length > 0
    ? JSON.stringify(canvasWithoutPaths)
    : undefined;

  const aiParams = {
    question: context.question,
    questionStem: context.questionStem,
    questionType: context.questionType,
    userAnswer: String(context.userAnswer || ""),
    correctAnswer: String(context.correctAnswer),
    markMax: context.markMax,
    markScheme: context.markScheme,
    canvas: canvasJson,
    canvasLatex: canvasLatexSummary || undefined,
    canvasStrokes: canvasStrokesPngBase64 || undefined,
  };

  console.log("🤖 [Marking] AI params being sent:", {
    ...aiParams,
    canvasStrokes: aiParams.canvasStrokes
      ? `[base64 PNG ${aiParams.canvasStrokes.length} chars]`
      : undefined,
  });

  const aiResult = await markAnswer(aiParams);

  return {
    questionLegacyId: context.questionLegacyId,
    userAnswer: context.userAnswer,
    annotatedAnswer: aiResult.feedback,
    markingTable: aiResult.markingTable,
    markMax: context.markMax,
    userMark: aiResult.userMark,
    canvas: context.canvas || {},
    annotations: [aiResult.annotations],
    isMarked: true,
  };
}

/**
 * Mark a question client-side (MCQ, true/false, etc.)
 */
function markClientSide(context: MarkingContext): MarkingResult {
  let userAnswer: MarkingResult["userAnswer"] = "";
  let annotatedAnswer: string | AnswerPair[] = "";
  let userMark = 0;
  let markingTable = "";

  const normalizeWhitespace = (text: string) =>
    text.trim().replace(/\s+/g, " ");

  const normalizeDashes = (text: string) =>
    text.replace(/[\u2013\u2014]/g, "-");

  const compareAnswers = (
    userAnswer: string,
    correctAnswer: string,
    toLowerCase = false
  ) => {
    return toLowerCase
      ? userAnswer.toLowerCase() === correctAnswer.toLowerCase()
      : userAnswer === correctAnswer;
  };

  const generateMarkingTable = (answers: AnswerPair[]) => {
    return `| Mark Scheme Point | Student Response | Mark Awarded |
|:-|:-|:-|
${answers
  .map(
    ({ correctAnswer, userAnswer, isCorrect }) =>
      ` |${correctAnswer}|${userAnswer}|${isCorrect ? 1 : 0}|`
  )
  .join("\n")}`;
  };

  switch (context.questionType) {
    case "mcq":
    case "true_false": {
      userAnswer = String(context.userAnswer);

      // For MCQ, correctAnswer should be an index (0, 1, 2, 3)
      // We need to get the actual option text for comparison
      let correctOptionText = String(context.correctAnswer);

      if (context.questionType === "mcq" && context.options && context.options.length > 0) {
        const correctIndex = parseInt(String(context.correctAnswer), 10);

        // Check if correctAnswer is a valid index
        if (!isNaN(correctIndex) && correctIndex >= 0 && correctIndex < context.options.length) {
          correctOptionText = context.options[correctIndex];
          console.log("🔍 [MCQ Marking] Using option at index:", {
            index: correctIndex,
            optionText: correctOptionText,
            allOptions: context.options,
          });
        } else {
          // Fallback: correctAnswer might already be the option text
          console.warn("⚠️ [MCQ Marking] correctAnswer is not a valid index, treating as text:", {
            correctAnswer: context.correctAnswer,
            availableOptions: context.options,
          });
        }
      }

      annotatedAnswer = correctOptionText;
      userMark = compareAnswers(
        userAnswer,
        annotatedAnswer,
        context.questionType === "true_false"
      )
        ? context.markMax
        : 0;

      console.log("🔍 [MCQ Marking] Result:", {
        userAnswer,
        correctAnswer: annotatedAnswer,
        userMark,
        markMax: context.markMax,
        isCorrect: userMark > 0,
      });

      markingTable = generateMarkingTable([
        {
          correctAnswer: annotatedAnswer,
          userAnswer,
          isCorrect: userMark > 0,
        },
      ]);
      break;
    }

    case "mcq_multiple": {
      const userAnswers = context.userAnswer as Array<string>;
      const correctAnswerValues = Object.values(context.correctAnswer);

      const surplusAnswers = userAnswers.filter(
        (answer) => !correctAnswerValues.includes(answer)
      ).length;

      const answerPairs: AnswerPair[] = correctAnswerValues.map(
        (correctAnswer) => ({
          correctAnswer,
          userAnswer:
            userAnswers.find((answer) => answer === correctAnswer) || "",
          isCorrect: !!userAnswers.find((answer) => answer === correctAnswer),
        })
      );

      userAnswer = userAnswers;
      userMark = Math.max(
        0,
        answerPairs.filter((pair) => pair.isCorrect).length - surplusAnswers
      );
      markingTable = generateMarkingTable(answerPairs);
      annotatedAnswer = markingTable;
      break;
    }

    case "fill_in_the_gaps_text": {
      const userAnswers = context.userAnswer as Array<string>;
      const correctAnswerValues = Object.values(context.correctAnswer);

      const answerPairs: AnswerPair[] = correctAnswerValues.map(
        (correctAnswer, index) => ({
          correctAnswer,
          userAnswer: userAnswers[index],
          isCorrect: compareAnswers(userAnswers[index], correctAnswer),
        })
      );

      userAnswer = userAnswers;
      annotatedAnswer = answerPairs;
      markingTable = generateMarkingTable(answerPairs);
      userMark = answerPairs.filter((pair) => pair.isCorrect).length;
      break;
    }

    case "match_pair": {
      const userAnswers = context.userAnswer as Record<string, string>;

      const answerPairs: AnswerPair[] = Object.entries(userAnswers).map(
        ([left, right]) => ({
          correctAnswer: left,
          userAnswer: right,
          isCorrect: true,
        })
      );

      userAnswer = context.userAnswer;
      userMark = context.markMax;
      markingTable = generateMarkingTable(answerPairs);
      annotatedAnswer = markingTable;
      break;
    }

    case "spot": {
      const userAnswers = context.userAnswer as string[];
      const correctAnswers = context.correctAnswer as {
        [key: string]: string | string[];
      };

      const formatCategories = (value: string | string[]) => {
        const categories = Array.isArray(value) ? value : [value];
        return categories
          .filter((category) => !!category)
          .map((category) => category.trim())
          .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
          .join(", ");
      };

      const isSpotWithCategories = Object.entries(correctAnswers).every(
        ([key, value]) => Array.isArray(value) || value !== key
      );

      const uniqueCorrectPatterns: string[] = Object.keys(correctAnswers).map(
        (key) => {
          const answerValue = correctAnswers[key];
          if (isSpotWithCategories) {
            return `${key} [${formatCategories(answerValue)}]`;
          }
          return Array.isArray(answerValue) ? answerValue[0] : answerValue;
        }
      );

      const matchingUserAnswers = userAnswers.filter((ua) =>
        uniqueCorrectPatterns.some((correctPattern) =>
          checkAnswerMatch(ua, correctPattern)
        )
      );

      const uniqueMatchingAnswers = [...new Set(matchingUserAnswers)];
      const correctCount = uniqueMatchingAnswers.length;
      const surplusAnswers = Math.max(0, userAnswers.length - context.markMax);

      const answerPairs: AnswerPair[] = userAnswers.map((answer) => {
        const matchingPattern = uniqueCorrectPatterns.find((pattern) =>
          checkAnswerMatch(answer, pattern)
        );
        return {
          correctAnswer: matchingPattern || uniqueCorrectPatterns[0] || "",
          userAnswer: answer,
          isCorrect: !!matchingPattern,
        };
      });

      const unmatchedPatterns = uniqueCorrectPatterns.filter(
        (pattern) =>
          !userAnswers.some((answer) => checkAnswerMatch(answer, pattern))
      );
      unmatchedPatterns.forEach((pattern) => {
        answerPairs.push({
          correctAnswer: pattern,
          userAnswer: "",
          isCorrect: false,
        });
      });

      userAnswer = userAnswers;
      userMark = Math.min(
        context.markMax,
        Math.max(0, correctCount - surplusAnswers)
      );
      markingTable = generateMarkingTable(answerPairs);
      annotatedAnswer = markingTable;
      break;
    }

    case "fix_sentence": {
      const userText = String(context.userAnswer);
      const correctText = String(context.correctAnswer);

      const normalizedUser = normalizeDashes(normalizeWhitespace(userText));
      const normalizedCorrect = normalizeDashes(normalizeWhitespace(correctText));

      const isCorrect = normalizedUser === normalizedCorrect;

      userAnswer = userText;
      annotatedAnswer = correctText;
      userMark = isCorrect ? context.markMax : 0;
      markingTable = generateMarkingTable([
        {
          correctAnswer: correctText,
          userAnswer: userText,
          isCorrect,
        },
      ]);
      break;
    }

    case "reorder": {
      const userOrder = context.userAnswer as string[];
      const correctOrder = context.correctAnswer as string[];

      let correctPositions = 0;
      for (let i = 0; i < correctOrder.length; i++) {
        if (userOrder[i] === correctOrder[i]) {
          correctPositions++;
        }
      }

      userAnswer = userOrder;
      userMark = correctPositions;
      markingTable = "";
      annotatedAnswer = "";
      break;
    }

    case "group": {
      const userGroups = context.userAnswer as Record<string, string[]>;
      const correctGroups =
        typeof context.correctAnswer === "string"
          ? JSON.parse(context.correctAnswer)
          : (context.correctAnswer as Record<string, string[]>);

      let correctPlacements = 0;

      for (const category in userGroups) {
        const userItems = userGroups[category] || [];
        const correctItems = correctGroups[category] || [];

        for (const item of userItems) {
          if (correctItems.includes(item)) {
            correctPlacements++;
          }
        }
      }

      userAnswer = userGroups;
      userMark = correctPlacements;
      markingTable = "";
      annotatedAnswer = "";
      break;
    }

    case "number": {
      const correctDigits = String(context.correctAnswer);
      const userDigitsArray = context.userAnswer as string[];
      const userAnswerString = userDigitsArray.join("");

      const isCorrect = userAnswerString === correctDigits;

      userAnswer = userDigitsArray;
      userMark = isCorrect ? context.markMax : 0;
      annotatedAnswer = correctDigits;
      markingTable = generateMarkingTable([
        {
          correctAnswer: correctDigits,
          userAnswer: userAnswerString,
          isCorrect,
        },
      ]);
      break;
    }

    default:
      console.warn(`Unhandled question type: ${context.questionType}`);
  }

  return {
    questionLegacyId: context.questionLegacyId,
    userAnswer,
    annotatedAnswer,
    markingTable,
    markMax: context.markMax,
    userMark,
    canvas: context.canvas || {},
    isMarked: true,
  };
}
