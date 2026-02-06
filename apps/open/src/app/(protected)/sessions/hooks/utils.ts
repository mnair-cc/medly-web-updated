import {
  QuestionDifficulty,
  MarkingContext,
  AnswerPair,
  MarkingResult,
} from "@/app/types/types";

// Helper function to calculate mastery increase/decrease based on difficulty
export const calculateMasteryChange = (
  difficulty: QuestionDifficulty,
  isCorrect: boolean
) => {
  if (isCorrect) {
    switch (difficulty) {
      case QuestionDifficulty.EASY:
        return 0.2;
      case QuestionDifficulty.MEDIUM:
        return 0.3;
      case QuestionDifficulty.HARD:
        return 0.4;
      default:
        return 0.2;
    }
  } else {
    switch (difficulty) {
      case QuestionDifficulty.EASY:
        return -0.4;
      case QuestionDifficulty.MEDIUM:
        return -0.3;
      case QuestionDifficulty.HARD:
        return -0.2;
      default:
        return -0.4;
    }
  }
};

// Helper function to parse a string into a number, handling fractions
const parseAnswer = (answer: string): number | null => {
  if (!answer || typeof answer !== "string") return null;

  // Clean the answer - remove spaces and trim
  const cleaned = answer.trim().replace(/\s+/g, "");

  // Handle empty string
  if (!cleaned) return null;

  // Check if it's a fraction (contains exactly one '/')
  if (cleaned.includes("/")) {
    const parts = cleaned.split("/");
    if (parts.length !== 2) return null;

    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);

    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
      return null;
    }

    return numerator / denominator;
  }

  // Try to parse as decimal
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

// Helper function to check if two numbers are equivalent according to SAT SPR rules
const areAnswersEquivalent = (correct: number, user: number): boolean => {
  // Exact match
  if (correct === user) return true;

  // For very small numbers, use absolute difference
  if (Math.abs(correct) < 0.001) {
    return Math.abs(correct - user) < 0.0001;
  }

  // Calculate relative tolerance based on the magnitude of the correct answer
  // For SAT SPR, we need to be more lenient with repeating decimals
  // but strict enough to reject answers that are clearly wrong

  const tolerance = Math.max(
    0.0001, // Minimum absolute tolerance
    Math.abs(correct) * 0.001 // Relative tolerance (0.1%)
  );

  return Math.abs(correct - user) <= tolerance;
};

// Helper function to match SAT SPR answers with fuzzy logic
const matchSprAnswers = (
  correctAnswer: string,
  userAnswer: string
): boolean => {
  const correctNum = parseAnswer(correctAnswer);
  const userNum = parseAnswer(userAnswer);

  // If either couldn't be parsed, they're not equal
  if (correctNum === null || userNum === null) {
    return false;
  }

  return areAnswersEquivalent(correctNum, userNum);
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

export const markSatQuestion = (markingContext: MarkingContext) => {
  let userAnswer: string | string[] | { left?: string; right?: string } = " ";
  let annotatedAnswer: string | AnswerPair[] = "";
  let userMark = 0;
  let markingTable = "";

  if (markingContext.questionType === "mcq") {
    userAnswer = markingContext.userAnswer
      ? String(markingContext.userAnswer)
      : "";
    annotatedAnswer = String(markingContext.correctAnswer);
    userMark =
      markingContext.userAnswer === markingContext.correctAnswer
        ? markingContext.markMax
        : 0;
    markingTable = generateMarkingTable([
      {
        correctAnswer: String(markingContext.correctAnswer),
        userAnswer,
        isCorrect: markingContext.userAnswer === markingContext.correctAnswer,
      },
    ]);
  } else if (markingContext.questionType === "spr") {
    // Student-produced response (SPR) questions
    userAnswer = markingContext.userAnswer
      ? String(markingContext.userAnswer)
      : "";
    annotatedAnswer = String(markingContext.correctAnswer);

    const isCorrect = matchSprAnswers(
      String(markingContext.correctAnswer),
      String(markingContext.userAnswer || "")
    );

    userMark = isCorrect ? markingContext.markMax : 0;

    markingTable = generateMarkingTable([
      {
        correctAnswer: String(markingContext.correctAnswer),
        userAnswer: String(userAnswer),
        isCorrect,
      },
    ]);
  } else {
    throw new Error("Unsupported question type");
  }

  const markingResult: MarkingResult = {
    questionLegacyId: markingContext.questionLegacyId,
    userAnswer,
    annotatedAnswer,
    markingTable,
    markMax: markingContext.markMax,
    userMark,
    canvas: markingContext.canvas,
    isMarked: true,
  };

  return markingResult;
};
