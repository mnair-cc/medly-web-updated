import { generateObject } from "ai";
import { z } from "zod";
import { haikuModel } from "./client";

// Schema for a document in the reorganized structure
const ReorganizedDocumentSchema = z.object({
  id: z.string().describe("ID of the document"),
  name: z.string().describe("Name of the document"),
});

// Schema for a folder in the reorganized structure
const ReorganizedFolderSchema = z.object({
  name: z.string().describe("Name of the folder"),
  documents: z.array(ReorganizedDocumentSchema).describe("Documents in this folder"),
});

// Schema for the reorganized structure
const ReorganizedStructureSchema = z.object({
  folders: z.array(ReorganizedFolderSchema).describe("Reorganized folder structure"),
  rootDocuments: z.array(ReorganizedDocumentSchema).describe("Documents to keep at root level"),
});

interface DocumentInfo {
  id: string;
  name: string;
  type?: string;
  contentPreview?: string; // First 500 chars of content
}

interface FolderInfo {
  id: string;
  name: string;
  type?: string;
  documents: DocumentInfo[];
}

interface ReorganizationContext {
  collectionName: string;
  folders: FolderInfo[];
  rootDocuments: DocumentInfo[];
  organizationPrompt?: string; // Custom prompt from user
}

/**
 * Reorganize folder structure using AI
 * @param context The current folder structure and reorganization context
 * @returns Reorganized folder structure
 */
export async function reorganizeFolders(
  context: ReorganizationContext
) {
  // Build the current structure description
  const currentStructure = [
    `Current structure for collection "${context.collectionName}":`,
    "",
    "Folders:",
    ...context.folders.map(f => {
      const docs = f.documents.length > 0
        ? `\n    Documents: ${f.documents.map(d => `"${d.name}"`).join(", ")}`
        : " (empty)";
      return `  - "${f.name}"${docs}`;
    }),
    "",
    "Root documents:",
    ...context.rootDocuments.map(d => `  - "${d.name}" (${d.type || "document"})`),
  ].join("\n");

  // Build document details for better organization
  const allDocuments = [
    ...context.rootDocuments,
    ...context.folders.flatMap(f => f.documents),
  ];

  const documentDetails = allDocuments
    .map(d => {
      const preview = d.contentPreview ? `\n    Preview: ${d.contentPreview.slice(0, 200)}...` : "";
      return `  - ID: ${d.id}, Name: "${d.name}", Type: ${d.type || "document"}${preview}`;
    })
    .join("\n");

  // Default system prompt for reorganization
  const systemPrompt = context.organizationPrompt || `You are an expert at organizing academic documents into logical folder structures.

Your task is to reorganize the current folder structure to be more intuitive and well-organized.

Guidelines:
1. Preserve the existing folder structure if folders already exist and are relevant to the documents.
2. Create clear, logical folders based on document topics and types
3. Group related documents/course materials together, either by 'topic' or 'week' 
4. Use descriptive folder names that reflect their contents
5. Keep the structure simple - max 2 levels (folders and documents within them)
6. Documents that don't fit any folder should stay at root level
7. Assignment folders should contain related materials (submissions, briefs, feedback)
8. Lecture/week folders should contain lecture notes, slides, and related materials
9. Consider chronological organization when appropriate (Week 1, Week 2, etc.)
10. Do not create folders that do not contain any documents.
11. OUTPUT ORDERING: Always list folders first in your response, followed by any root-level documents at the bottom.

IMPORTANT: Every document must be included exactly once in the output structure.`;

  const finalPrompt = `Reorganize this folder structure to be more logical and well-organized:

${currentStructure}

Document details for context:
${documentDetails}

Create a clean, intuitive organization. All documents with their exact IDs must appear in the output.`;

  console.log('[AI Reorganize] ========== SYSTEM PROMPT ==========');
  console.log(systemPrompt);
  console.log('[AI Reorganize] ========== USER PROMPT ==========');
  console.log(finalPrompt);
  console.log('[AI Reorganize] =====================================');

  const { object } = await generateObject({
    model: haikuModel,
    schema: ReorganizedStructureSchema,
    system: systemPrompt,
    prompt: finalPrompt,
  });

  console.log('[AI Reorganize] ========== AI RESPONSE ==========');
  console.log(JSON.stringify(object, null, 2));
  console.log('[AI Reorganize] =====================================');

  // Validate that all documents are included
  const outputDocIds = new Set<string>();

  // Add root documents
  object.rootDocuments.forEach(d => outputDocIds.add(d.id));

  // Add folder documents
  object.folders.forEach(f => {
    f.documents.forEach(d => outputDocIds.add(d.id));
  });

  // Check for missing documents
  const missingDocs = allDocuments.filter(d => !outputDocIds.has(d.id));

  // If any documents are missing, add them to root
  if (missingDocs.length > 0) {
    console.warn(`Adding ${missingDocs.length} missing documents to root`);
    object.rootDocuments.push(
      ...missingDocs.map(d => ({ id: d.id, name: d.name }))
    );
  }

  return object;
}