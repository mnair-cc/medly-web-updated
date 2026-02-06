import {
  MockPage,
  CoverContent,
  QuestionSessionPageType,
} from "@/app/(protected)/sessions/types";

/**
 * Determines the question enumeration format based on exam board
 * @param examBoard - The exam board name
 * @returns 'decimal' for AQA (1.1, 1.2) or 'letter' for Edexcel/OCR (1a, 1b)
 */
export const getQuestionEnumerationFormat = (
  examBoard: string
): "decimal" | "letter" => {
  // AQA uses decimal format (1.1, 1.2, etc.)
  if (examBoard === "AQA") {
    return "decimal";
  }
  // Edexcel and OCR use letter format (1a, 1b, etc.)
  if (examBoard === "Edexcel" || examBoard === "OCR") {
    return "letter";
  }
  // Default to letter format for unknown exam boards
  return "letter";
};

/**
 * Extracts the exam board from the cover page of a session
 * @param pages - Array of session pages
 * @returns The exam board name or empty string if not found
 */
export const getExamBoardFromPages = (pages?: MockPage[]): string => {
  if (!pages || pages.length === 0) return "";
  const coverPage = pages.find(
    (page) => page.type === QuestionSessionPageType.Cover
  );
  if (coverPage && coverPage.content) {
    const coverContent = coverPage.content as CoverContent;
    return coverContent.examBoard || "";
  }
  return "";
};

/**
 * Generates a question ID based on exam board format
 * @param groupNumber - The question group number (1, 2, 3, etc.)
 * @param questionIndex - The question index within the group (0, 1, 2, etc.)
 * @param examBoard - The exam board name
 * @returns The formatted question ID
 */
export const generateQuestionId = (
  groupNumber: number,
  questionIndex: number,
  examBoard: string
): string => {
  const format = getQuestionEnumerationFormat(examBoard);

  if (format === "decimal") {
    // AQA format: 1.1, 1.2, 2.1, 2.2, etc.
    return `${groupNumber}.${questionIndex + 1}`;
  } else {
    // Edexcel/OCR format: 1a, 1b, 2a, 2b, etc.
    return `${groupNumber}${String.fromCharCode(97 + questionIndex)}`;
  }
};
