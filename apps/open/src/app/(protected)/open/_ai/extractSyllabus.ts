import { streamText, Output } from "ai";
import { z } from "zod";
import { fastModel } from "./client";
import type { ExtractedSyllabus } from "../onboarding/_types/syllabus";

// Zod schema matching ExtractedSyllabus interface
const WeekItemSchema = z.object({
  title: z.string().describe("Title of the lecture, seminar, lab, etc."),
  type: z
    .enum(["lecture", "seminar", "lab", "recitation", "reading"])
    .describe("Type of class item"),
});

const ExtractedWeekSchema = z.object({
  weekNumber: z.number().describe("Week number (1, 2, 3, etc.)"),
  title: z.string().describe("Title or topic for this week"),
  // description: z.string().optional().describe("Brief one-sentence description of week content"),
  items: z.array(WeekItemSchema).optional().describe("Lectures, seminars, labs, readings for this week"),
  // learningOutcomes: z.array(z.string()).optional().describe("Learning outcomes specific to this week"),
});

const ExtractedAssignmentSchema = z.object({
  title: z.string().describe("Assignment title"),
  description: z.string().optional().describe("Brief description of the assignment requirements and expectations"),
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

Your task is to parse a syllabus PDF and extract:
1. Course name and code
2. Instructor name
3. Weekly schedule with topics, lectures, seminars, labs, and readings
4. Assignments with due dates and weightings
5. Required and recommended readings
6. Grading breakdown
7. Learning outcomes

Guidelines:
- Be thorough but accurate - only include information that's clearly stated
- For weekly items, categorize as: lecture, seminar, lab, recitation, or reading
- Preserve exact citation formats for readings
- Convert dates to ISO format (YYYY-MM-DD) when possible
- If information is ambiguous or missing, omit it rather than guessing
- Extract week-level learning outcomes if they differ from course-level outcomes`;

/**
 * Extract structured syllabus data from PDF text using AI (streaming)
 */
export async function extractSyllabus(pdfText: string): Promise<ExtractedSyllabus> {
  console.log("[extractSyllabus] Input text length:", pdfText?.length ?? 0);
  console.log("[extractSyllabus] === INPUT TEXT (first 2000 chars) ===\n", pdfText?.slice(0, 2000), "\n=== END ===");

  const { partialOutputStream, output } = streamText({
    model: fastModel,
    output: Output.object({
      schema: ExtractedSyllabusSchema,
    }),
    system: SYSTEM_PROMPT,
    prompt: `Extract the syllabus information from the following document:\n\n${pdfText}`,
    onError({ error }) {
      console.error("[extractSyllabus] Stream error:", error);
    },
  });

  // Stream partial objects to terminal
  for await (const partialObject of partialOutputStream) {
    console.log("[extractSyllabus] Partial:", JSON.stringify(partialObject, null, 2));
  }

  // Get final result
  const result = await output;
  console.log("[extractSyllabus] Final:", JSON.stringify(result, null, 2));

  return result as ExtractedSyllabus;
}
