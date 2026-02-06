import { generateObject } from "ai";
import { z } from "zod";
import { fastModel } from "./client";
import type {
  FolderSuggestion,
  FolderSuggestionContext,
} from "../_types/aiOrganization";

// Schema for a single folder suggestion
const FolderSuggestionSchema = z.object({
  documentId: z.string().describe("ID of the document being placed"),
  suggestedFolderId: z
    .string()
    .nullable()
    .describe("ID of suggested folder, or null if should stay at root"),
  replacePlaceholderId: z
    .string()
    .optional()
    .describe("ID of placeholder document this should replace, if any"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score 0-1 for this suggestion"),
  reasoning: z.string().optional().describe("Brief explanation of why this folder was chosen"),
});

const SuggestFoldersResponseSchema = z.object({
  suggestions: z.array(FolderSuggestionSchema),
});

const SYSTEM_PROMPT = `You are an expert at organizing academic documents into folder structures.

Your task is to analyze document names and content, then suggest the best folder placement.

Guidelines:
1. Match documents to folders based on topic relevance
2. Consider existing documents in each folder as context for what belongs there
3. If a document matches a placeholder name closely, suggest replacing it
4. If no folder is a good match, suggest null (keep at root)
5. Be conservative - only suggest high-confidence matches (>0.7)
6. Consider document naming patterns (e.g., "Week 1 Lecture" → "Week 1" folder)

For placeholder matching:
- Placeholders represent expected documents (e.g., "Lecture Notes", "Problem Set 1")
- If uploaded document clearly matches a placeholder, set replacePlaceholderId`;

/**
 * Suggest folder placements for documents using AI
 * @param contexts Array of document contexts with existing folder structure
 * @returns Array of folder suggestions
 */
export async function suggestFolders(
  contexts: FolderSuggestionContext[]
): Promise<FolderSuggestion[]> {
  if (contexts.length === 0) {
    return [];
  }

  // Build prompt with all document contexts
  const documentsInfo = contexts
    .map((ctx, i) => {
      const foldersInfo = ctx.existingFolders
        .map((f) => {
          const docs = f.documentNames.length > 0 ? ` (contains: ${f.documentNames.join(", ")})` : "";
          const placeholder = f.hasPlaceholder ? " [has placeholder]" : "";
          return `  - "${f.name}" (id: ${f.id})${docs}${placeholder}`;
        })
        .join("\n");

      const placeholdersInfo =
        ctx.placeholderDocuments.length > 0
          ? `\n  Placeholders: ${ctx.placeholderDocuments.map((p) => `"${p.name}" (id: ${p.id})`).join(", ")}`
          : "";

      const rootDocs =
        ctx.rootDocumentNames.length > 0
          ? `\n  Root documents: ${ctx.rootDocumentNames.join(", ")}`
          : "";

      return `Document ${i + 1}:
  ID: ${ctx.documentId}
  Name: "${ctx.documentName}"
  Content preview: ${ctx.documentText.slice(0, 500)}...

  Available folders:
${foldersInfo}${placeholdersInfo}${rootDocs}`;
    })
    .join("\n\n---\n\n");

  const { object } = await generateObject({
    model: fastModel,
    schema: SuggestFoldersResponseSchema,
    system: SYSTEM_PROMPT,
    prompt: `Analyze these documents and suggest the best folder placement for each:\n\n${documentsInfo}`,
  });

  // Map AI response back to full FolderSuggestion type
  return object.suggestions.map((suggestion) => {
    const ctx = contexts.find((c) => c.documentId === suggestion.documentId);
    const folder = ctx?.existingFolders.find(
      (f) => f.id === suggestion.suggestedFolderId
    );

    return {
      documentId: suggestion.documentId,
      documentName: ctx?.documentName || "",
      suggestedFolderId: suggestion.suggestedFolderId,
      suggestedFolderName: folder?.name || "",
      replacePlaceholderId: suggestion.replacePlaceholderId,
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      previousFolderId: null,
      previousPosition: 0,
    };
  });
}
