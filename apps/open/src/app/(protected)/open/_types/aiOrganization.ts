/**
 * AI Organization Types
 * Types for intelligent document organization suggestions
 */

/**
 * Context sent to AI for folder suggestions
 */
export interface FolderSuggestionContext {
  documentId: string;
  documentName: string;
  documentText: string; // First page OCR/text
  collectionId: string;
  existingFolders: Array<{
    id: string;
    name: string;
    documentNames: string[];
    hasPlaceholder?: boolean; // Has unfilled placeholder
  }>;
  placeholderDocuments: Array<{
    // Placeholders that could match
    id: string;
    name: string;
    label: string;
    folderId: string | null;
  }>;
  rootDocumentNames: string[];
}

/**
 * AI's suggestion for where to place a document
 */
export interface FolderSuggestion {
  documentId: string;
  documentName: string;
  suggestedFolderId: string | null;
  suggestedFolderName: string;
  replacePlaceholderId?: string; // If should replace a placeholder
  confidence: number;
  reasoning?: string;
  previousFolderId: string | null;
  previousPosition: number;
}

/**
 * Request body for suggest-folders API
 */
export interface SuggestFoldersRequest {
  documents: FolderSuggestionContext[];
}

/**
 * Response from suggest-folders API
 */
export interface SuggestFoldersResponse {
  status: "success" | "error";
  suggestions: FolderSuggestion[];
  error?: string;
}
