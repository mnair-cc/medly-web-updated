import { generateObject } from "ai";
import { z } from "zod";
import { defaultModel } from "./client";
import type { ExtractedSyllabus } from "../onboarding/_types/syllabus";

// Zod schema matching ExtractedSyllabus interface (same as extractSyllabus.ts)
const WeekItemSchema = z.object({
  title: z.string().describe("Title of the lecture, seminar, lab, etc."),
  type: z
    .enum(["lecture", "seminar", "lab", "recitation", "reading"])
    .describe("Type of class item"),
});

const ExtractedWeekSchema = z.object({
  weekNumber: z.number().describe("Week number (1, 2, 3, etc.)"),
  title: z.string().describe("Title or topic for this week"),
  items: z.array(WeekItemSchema).optional().describe("Lectures, seminars, labs, readings for this week"),
});

const ExtractedAssignmentSchema = z.object({
  title: z.string().describe("Assignment title"),
  dueDate: z.string().optional().describe("Due date in ISO format (YYYY-MM-DD) if provided"),
  weighting: z.number().optional().describe("Percentage weight of total grade"),
  type: z
    .enum(["essay", "exam", "presentation", "project", "quiz"])
    .optional()
    .describe("Type of assignment"),
});

const ExtractedReadingSchema = z.object({
  title: z.string().describe("Title of the reading material"),
  citation: z.string().describe("Full citation as written in syllabus"),
  type: z
    .enum(["textbook", "article", "chapter"])
    .optional()
    .describe("Type of reading"),
  required: z.boolean().optional().describe("Whether this reading is required"),
});

const GradingComponentSchema = z.object({
  component: z.string().describe("Name of the grading component"),
  weight: z.number().describe("Percentage weight"),
});

const ExtractedSyllabusSchema = z.object({
  moduleName: z.string().describe("Course/module name, with normal capitalization (e.g. Introduction to Psychology)"),
  moduleCode: z.string().optional().describe("Course code (e.g., PSY101, CS50)"),
  description: z.string().optional().describe("Course one-sentence description"),
  instructor: z.string().optional().describe("Instructor name"),
  weeks: z
    .array(ExtractedWeekSchema)
    .describe("Weekly schedule with topics and items"),
  assignments: z
    .array(ExtractedAssignmentSchema)
    .describe("Assignments, exams, projects"),
  readings: z
    .array(ExtractedReadingSchema)
    .optional()
    .describe("Required and recommended readings"),
  gradingBreakdown: z
    .array(GradingComponentSchema)
    .optional()
    .describe("Grade breakdown by component"),
  learningOutcomes: z
    .array(z.string())
    .optional()
    .describe("Course-level learning outcomes"),
});

const SYSTEM_PROMPT = `You are an expert at extracting structured information from academic syllabi.

You will receive one or more images/screenshots of a course syllabus. These images may be:
- Screenshots from a university portal
- Photos of a printed syllabus
- Multiple pages of a syllabus document

Your task is to parse these images and extract:
1. Course name and code
2. Instructor name
3. Weekly schedule with topics, lectures, seminars, labs, and readings
4. Assignments with due dates and weightings
5. Required and recommended readings
6. Grading breakdown
7. Learning outcomes

Guidelines:
- Combine information from all provided images into a single cohesive syllabus
- Be thorough but accurate - only include information that's clearly visible
- For weekly items, categorize as: lecture, seminar, lab, recitation, or reading
- Preserve exact citation formats for readings
- Convert dates to ISO format (YYYY-MM-DD) when possible
- If information is ambiguous or missing, omit it rather than guessing
- If images are blurry or text is unreadable, do your best with visible content`;

export interface ImageInput {
  data: Buffer;
  mimeType: "image/png" | "image/jpeg";
}

/**
 * Extract structured syllabus data from images using Gemini vision
 * @param images - Array of image buffers with mime types
 * @param additionalText - Optional text from PDFs or pasted content to include as context
 */
export async function extractSyllabusFromImages(
  images: ImageInput[],
  additionalText?: string
): Promise<ExtractedSyllabus> {
  console.log("[extractSyllabusFromImages] Processing", images.length, "images");
  if (additionalText) {
    console.log("[extractSyllabusFromImages] With additional text:", additionalText.length, "chars");
  }

  // Build content array with all images as data URIs
  const imageContents = images.map((img) => ({
    type: "image" as const,
    image: `data:${img.mimeType};base64,${img.data.toString("base64")}`,
  }));

  // Build the prompt
  let promptText = `Extract the syllabus information from these ${images.length} image(s). If there are multiple images, they represent different pages or sections of the same syllabus - combine all information into a single cohesive structure.`;

  if (additionalText) {
    promptText += `\n\nAdditionally, here is text content from other documents that should also be included in the extraction:\n\n${additionalText}`;
  }

  const { object } = await generateObject({
    model: defaultModel,
    schema: ExtractedSyllabusSchema,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...imageContents,
          {
            type: "text",
            text: promptText,
          },
        ],
      },
    ],
  });

  console.log("[extractSyllabusFromImages] Result:", JSON.stringify(object, null, 2));

  return object as ExtractedSyllabus;
}
