"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { defaultModel } from "./client";

export interface MarkAnswerParams {
  question: string;
  questionStem?: string;
  questionType: string;
  userAnswer: string;
  correctAnswer: string;
  markMax: number;
  markScheme?: string[];
  // Canvas data (stringified JSON with textboxes, paths, maths, etc.)
  canvas?: string;
  // Latex summary from canvas expressions (stringified JSON)
  canvasLatex?: string;
  // Base64 PNG of student's handwritten strokes
  canvasStrokes?: string;
}

export interface MarkAnswerResult {
  userMark: number;
  markingTable: string;
  annotations: {
    strong: string[];
    weak: string[];
  };
  feedback: string;
}

// Schema for AI marking response
const MarkingResultSchema = z.object({
  userMark: z
    .number()
    .describe("The mark awarded to the student (0 to markMax)"),
  markingTable: z
    .string()
    .describe(
      "A markdown table showing mark scheme points, student response for each, and marks awarded"
    ),
  annotations: z.object({
    strong: z
      .array(z.string())
      .describe("Exact phrases from the student answer that demonstrate good understanding"),
    weak: z
      .array(z.string())
      .describe("Exact phrases from the student answer that are incorrect or need improvement"),
  }),
  feedback: z
    .string()
    .describe("Brief, constructive feedback for the student (1-2 sentences)"),
});

const MARKING_SYSTEM_PROMPT = `You are an expert exam marker. Your task is to fairly and accurately mark student answers against a mark scheme.

Guidelines:
1. Award marks generously for correct understanding, even if wording differs from the mark scheme
2. Look for the KEY CONCEPTS in the mark scheme, not exact wording
3. Give partial credit where appropriate
4. Be consistent and fair in your marking
5. Identify specific strengths and weaknesses in the answer

Mark Scheme Format:
- Each point in the mark scheme is typically worth 1 mark
- Students can earn marks for equivalent correct statements
- Don't penalize for extra correct information
- Don't award marks for the same point twice

Marking Table Format:
| Mark Scheme Point | Student Response | Mark |
|:------------------|:-----------------|:-----|
| [point from scheme] | [relevant part of answer or "-" if missing] | [0 or 1] |

Important:
- The userMark must be between 0 and the markMax provided
- Annotations must contain EXACT phrases from the student's answer (for highlighting)
- Keep feedback encouraging but honest`;

/**
 * Mark a long-form question using AI (server action)
 */
export async function markAnswer(
  params: MarkAnswerParams
): Promise<MarkAnswerResult> {
  const {
    question,
    questionStem,
    questionType,
    userAnswer,
    correctAnswer,
    markMax,
    markScheme,
    canvas,
    canvasLatex,
    canvasStrokes,
  } = params;

  // Build question text with stem if available
  const questionWithStem = questionStem
    ? `${questionStem}\n\n${question}`
    : question;

  const markSchemeText = markScheme?.length
    ? markScheme.map((point, i) => `${i + 1}. ${point}`).join("\n")
    : correctAnswer;

  // Build the prompt text
  let promptText = `Mark the following ${questionType} question.

Question:
${questionWithStem}

Mark Scheme (${markMax} marks total):
${markSchemeText}

Student Answer:
${userAnswer || "(No answer provided)"}`;

  // Add canvas data if available (contains textboxes, drawings, etc.)
  if (canvas) {
    promptText += `\n\nStudent's Canvas/Written Work (JSON):
${canvas}`;
  }

  // Add latex summary if available
  if (canvasLatex) {
    promptText += `\n\nStudent's Mathematical Work (Latex Summary):
${canvasLatex}`;
  }

  promptText += `\n\nAward marks fairly based on the mark scheme. The maximum mark is ${markMax}.`;

  // If we have canvas strokes image, use multimodal prompting
  if (canvasStrokes) {
    const { object } = await generateObject({
      model: defaultModel,
      schema: MarkingResultSchema,
      system: MARKING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image",
              image: canvasStrokes,
            },
          ],
        },
      ],
    });

    const clampedMark = Math.max(0, Math.min(markMax, object.userMark));
    return { ...object, userMark: clampedMark };
  }

  // Text-only prompting
  const { object } = await generateObject({
    model: defaultModel,
    schema: MarkingResultSchema,
    system: MARKING_SYSTEM_PROMPT,
    prompt: promptText,
  });

  // Ensure userMark is within bounds
  const clampedMark = Math.max(0, Math.min(markMax, object.userMark));

  return {
    ...object,
    userMark: clampedMark,
  };
}
