import {
  Collection,
  Document,
  Folder,
} from "@/app/(protected)/open/_types/content";
import {
  FolderSuggestion,
  FolderSuggestionContext,
  SuggestFoldersResponse,
} from "@/app/(protected)/open/_types/aiOrganization";

/**
 * Suggests a title for a document based on extracted PDF text
 * Calls AI backend to generate a suitable title
 * @param text Extracted text from PDF (first 5 pages)
 * @returns Suggested document title (or "New Document" on failure)
 */
export async function suggestDocumentTitle(text: string): Promise<string> {
  try {
    const response = await fetch('/api/open/documents/suggest-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const result = await response.json();

    if (result.status === 'success' && result.title) {
      return result.title;
    } else {
      // Fallback to "New Document" on error
      console.warn('Title suggestion failed:', result.error);
      return 'New Document';
    }
  } catch (error) {
    console.error('Error suggesting document title:', error);
    return 'New Document';
  }
}

/**
 * Suggests the parent collection and optional folder for a new document
 * TODO: Implement AI-based suggestion based on document content and existing structure
 * @param collections All available collections
 * @param folders All available folders
 * @param selectedCollection Currently selected collection ID (if any)
 * @returns Suggested parent location { collectionId, folderId }
 */
export function suggestDocumentParentLocation(
  collections: Collection[],
  folders: Folder[],
  selectedCollection: string | null
): { collectionId: string; folderId: string | null } {
  // Dummy implementation - uses selected collection or first collection
  // TODO: Analyze document content and suggest most relevant collection/folder

  if (selectedCollection) {
    return {
      collectionId: selectedCollection,
      folderId: null, // Always add to root for now
    };
  }

  // Fallback to first collection
  if (collections.length > 0) {
    return {
      collectionId: collections[0].id,
      folderId: null,
    };
  }

  // Should not happen - throw error if no collections exist
  throw new Error("No collections available. Please create a collection first.");
}

/**
 * Builds the context needed for AI folder suggestions
 * @param document The document to get suggestions for
 * @param collectionId The collection the document belongs to
 * @param folders All folders in the collection
 * @param documents All documents in the collection
 * @param documentText Optional extracted text from document (first page)
 * @returns Context object for AI suggestion API
 */
export function buildFolderSuggestionContext(
  document: Document,
  collectionId: string,
  folders: Folder[],
  documents: Document[],
  documentText: string = ""
): FolderSuggestionContext {
  // Get folders in this collection
  const collectionFolders = folders.filter((f) => f.collectionId === collectionId);

  // Build folder info with document names
  const existingFolders = collectionFolders.map((folder) => {
    const folderDocs = documents.filter((d) => d.folderId === folder.id);
    return {
      id: folder.id,
      name: folder.name,
      documentNames: folderDocs.map((d) => d.name),
      hasPlaceholder: folderDocs.some((d) => d.isPlaceholder),
    };
  });

  // Get placeholder documents that could be matched
  const placeholderDocuments = documents
    .filter((d) => d.isPlaceholder && d.collectionId === collectionId)
    .map((d) => ({
      id: d.id,
      name: d.name,
      label: d.label || "",
      folderId: d.folderId,
    }));

  // Get root-level document names (not in folders)
  const rootDocumentNames = documents
    .filter((d) => d.collectionId === collectionId && !d.folderId && d.id !== document.id)
    .map((d) => d.name);

  return {
    documentId: document.id,
    documentName: document.name,
    documentText,
    collectionId,
    existingFolders,
    placeholderDocuments,
    rootDocumentNames,
  };
}

/**
 * Calls AI API to suggest folder placement for documents
 * @param contexts Array of suggestion contexts (one per document)
 * @returns Array of folder suggestions
 */
export async function suggestDocumentFolders(
  contexts: FolderSuggestionContext[]
): Promise<FolderSuggestion[]> {
  try {
    const response = await fetch("/api/open/documents/suggest-folders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documents: contexts }),
    });

    const result: SuggestFoldersResponse = await response.json();

    if (result.status === "success" && result.suggestions) {
      return result.suggestions;
    } else {
      console.warn("Folder suggestion failed:", result.error);
      return [];
    }
  } catch (error) {
    console.error("Error suggesting document folders:", error);
    return [];
  }
}
