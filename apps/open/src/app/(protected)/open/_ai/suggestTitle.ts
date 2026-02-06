import { generateObject } from "ai";
import { fastModel } from "./client";
import { z } from "zod";

export type DocumentLabel =
  | "slides"
  | "syllabus"
  | "assignment"
  | "notes"
  | "reading";

const SYSTEM_PROMPT = `You are an expert at analyzing academic documents and extracting metadata.

Your task is to read the content from a PDF and suggest:
1. An appropriate title
2. A label classifying the document type

Title guidelines:
- Keep titles concise (3-8 words typically)
- Capture the main topic or purpose of the document
- Use title case
- If content is unclear or too short, use "New Document"

Label classification:
- "slides": Lecture slides, presentations, slide decks
- "syllabus": Course syllabus, course outline, class schedule
- "assignment": Homework, problem sets, assignments, exercises, worksheets
- "notes": Lecture notes, study notes, summaries, handouts
- "reading": Textbook chapters, academic papers, articles, readings

Default to "slides" if unclear.`;

const responseSchema = z.object({
  title: z.string().describe("The suggested title for the document"),
  label: z
    .enum(["slides", "syllabus", "assignment", "notes", "reading"])
    .describe("The document type classification"),
});

/**
 * Suggest a title and label for a document based on its content
 * @param text Extracted text from the document (first few pages)
 * @returns Object with suggested title and label
 */
export async function suggestTitleAndLabel(
  text: string
): Promise<{ title: string; label: DocumentLabel }> {
  if (!text || text.trim().length < 50) {
    return { title: "New Document", label: "slides" };
  }
  const promptText = text.slice(0, 3000);

  const { object } = await generateObject({
    model: fastModel,
    system: SYSTEM_PROMPT,
    prompt: `Analyze the following document content and suggest a title and label:\n\n${promptText}`,
    schema: responseSchema,
  });

  // Clean up the title - remove quotes, extra whitespace
  const cleanTitle = object.title.trim().replace(/^["']|["']$/g, "").trim();

  return {
    title: cleanTitle || "New Document",
    label: object.label || "slides",
  };
}

/**
 * Suggest a title for a document based on its content (legacy function)
 * @param text Extracted text from the document (first few pages)
 * @returns Suggested title string
 */
export async function suggestTitle(text: string): Promise<string> {
  const result = await suggestTitleAndLabel(text);
  return result.title;
}
