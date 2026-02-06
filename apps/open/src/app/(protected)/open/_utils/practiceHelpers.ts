import { SourceReference } from "@/app/(protected)/open/_types/content";
import { QuestionWithMarkingResult } from "@/app/types/types";

export interface GenerateQuestionsOptions {
  count?: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  types?: ("mcq" | "short_answer" | "long_answer")[];
}

/**
 * Generates practice questions from source content
 * Calls AI backend to generate questions based on the content
 * @param sourceReferences Array of source references (documents, folders, or collections)
 * @param sourceContent Combined text content from all sources
 * @param options Generation options (count, difficulty, types)
 * @returns Array of generated questions
 */
export async function generatePracticeQuestions(
  sourceReferences: SourceReference[],
  sourceContent: string,
  options?: GenerateQuestionsOptions
): Promise<QuestionWithMarkingResult[]> {
  try {
    const response = await fetch("/api/open/documents/generate-questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceReferences,
        sourceContent,
        options,
      }),
    });

    const result = await response.json();

    if (result.status === "success" && result.questions) {
      return result.questions;
    } else {
      console.warn("Question generation failed:", result.error);
      return [];
    }
  } catch (error) {
    console.error("Error generating practice questions:", error);
    return [];
  }
}

/**
 * Creates a new practice document linked to source(s)
 * @param sourceReferences Array of source references (documents, folders, or collections)
 * @param collectionId Collection to place the practice document in
 * @param folderId Optional folder to place the practice document in
 * @returns The created practice document ID
 */
export async function createPracticeDocument(
  sourceReferences: SourceReference[],
  collectionId: string,
  folderId?: string | null
): Promise<string | null> {
  try {
    // TODO: Implement via existing document creation API
    // This will create a new document with:
    // - type: "practice"
    // - sourceReferences: sourceReferences
    // - name: "Practice Test - [Source Name(s)]"

    // For now, return null - will be implemented when wiring up sidebar
    console.log("createPracticeDocument called with:", {
      sourceReferences,
      collectionId,
      folderId,
    });

    return null;
  } catch (error) {
    console.error("Error creating practice document:", error);
    return null;
  }
}
