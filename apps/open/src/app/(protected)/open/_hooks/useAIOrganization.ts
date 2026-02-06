import { useCallback, useEffect, useState } from "react";
import {
  FolderSuggestion,
  FolderSuggestionContext,
} from "@/app/(protected)/open/_types/aiOrganization";
import { Document, Folder } from "@/app/(protected)/open/_types/content";
import {
  buildFolderSuggestionContext,
  suggestDocumentFolders,
} from "@/app/(protected)/open/_utils/documentHelpers";

interface UseAIOrganizationProps {
  folders: Folder[];
  documents: Document[];
  moveDocument: (
    docId: string,
    targetCollectionId: string,
    targetFolderId: string | null,
    newPosition: number
  ) => void;
}

export interface UseAIOrganizationReturn {
  /** Suggestions waiting for user action (targeted drops where AI disagrees) */
  pendingSuggestions: FolderSuggestion[];
  /** Whether any AI processing is happening */
  isProcessing: boolean;
  /** Document IDs currently being processed by AI */
  processingDocIds: string[];

  /**
   * For targeted drag-drop: run AI, compare with user's choice
   * Shows badge if AI suggests different location
   */
  requestSuggestionForTargetedDrop: (
    docId: string,
    collectionId: string,
    userChosenFolderId: string | null
  ) => Promise<void>;

  /**
   * For generic drop zone: AI decides and auto-moves
   * Returns the AI suggestion; caller decides when/how to move (e.g. after animations).
   * @param documentText Optional extracted text for better folder matching
   */
  requestAutoOrganize: (
    doc: Document,
    collectionId: string,
    documentText?: string
  ) => Promise<FolderSuggestion | null>;

  /** User accepts suggestion - move document to suggested location */
  acceptSuggestion: (docId: string) => Promise<void>;

  /** User rejects suggestion - remove badge, keep in place */
  rejectSuggestion: (docId: string) => void;

  /** Clear all pending suggestions (e.g., on navigation) */
  clearSuggestions: () => void;
}

export function useAIOrganization({
  folders,
  documents,
  moveDocument,
}: UseAIOrganizationProps): UseAIOrganizationReturn {
  const [pendingSuggestions, setPendingSuggestions] = useState<
    FolderSuggestion[]
  >([]);
  const [processingDocIds, setProcessingDocIds] = useState<string[]>([]);

  const isProcessing = processingDocIds.length > 0;

  /**
   * Request AI suggestion for a targeted drop
   * If AI suggests different location, adds to pendingSuggestions (shows badge)
   */
  const requestSuggestionForTargetedDrop = useCallback(
    async (
      docId: string,
      collectionId: string,
      userChosenFolderId: string | null
    ): Promise<void> => {
      const doc = documents.find((d) => d.id === docId);
      if (!doc) return;

      // Mark as processing
      setProcessingDocIds((prev) => [...prev, docId]);

      try {
        // Build context
        const context = buildFolderSuggestionContext(
          doc,
          collectionId,
          folders,
          documents
        );
        const suggestions = await suggestDocumentFolders([context]);
        const suggestion = suggestions[0];

        // Only show badge if AI suggests different location from where user placed it
        if (
          suggestion &&
          suggestion.suggestedFolderId !== null &&
          suggestion.suggestedFolderId !== userChosenFolderId
        ) {
          setPendingSuggestions((prev) => [
            ...prev.filter((s) => s.documentId !== docId),
            {
              ...suggestion,
              previousFolderId: userChosenFolderId,
              previousPosition: doc.position,
            },
          ]);
        }
      } catch (error) {
        // Fail silently - document stays where user placed it
      } finally {
        setProcessingDocIds((prev) => prev.filter((id) => id !== docId));
      }
    },
    [documents, folders]
  );

  /**
   * Request AI to auto-organize a document (generic drop zone)
   * Adds suggestion to pendingSuggestions for user confirmation
   * @param documentText Optional extracted text from the document for better matching
   */
  const requestAutoOrganize = useCallback(
    async (
      doc: Document,
      collectionId: string,
      documentText?: string
    ): Promise<FolderSuggestion | null> => {
      // Mark as processing
      setProcessingDocIds((prev) => [...prev, doc.id]);

      try {
        // Build context with optional document text
        const context = buildFolderSuggestionContext(
          doc,
          collectionId,
          folders,
          documents,
          documentText || ""
        );

        // Get AI suggestion
        const suggestions = await suggestDocumentFolders([context]);
        const suggestion = suggestions[0];

        console.log('[AI Organization] Document:', doc.name, 'Suggestion:', {
          suggestedFolderId: suggestion?.suggestedFolderId,
          suggestedFolderName: suggestion?.suggestedFolderName,
          confidence: suggestion?.confidence,
          reason: suggestion?.reason,
        });

        // If AI suggests a folder and it's different from current location, add to pending suggestions
        if (suggestion && suggestion.suggestedFolderId !== null && suggestion.suggestedFolderId !== doc.folderId) {
          console.log('[AI Organization] Adding suggestion to pending for:', doc.name);
          setPendingSuggestions((prev) => [
            ...prev.filter((s) => s.documentId !== doc.id),
            {
              ...suggestion,
              previousFolderId: doc.folderId,
              previousPosition: doc.position,
            },
          ]);
        } else if (suggestion?.suggestedFolderId === doc.folderId) {
          console.log('[AI Organization] Document already in suggested folder:', doc.name);
        } else {
          console.log('[AI Organization] No folder suggestion for:', doc.name);
        }

        return suggestion ?? null;
      } catch (error) {
        console.error('[AI Organization] Error requesting auto-organize:', error);
        // Fail silently - document stays where it was uploaded
        return null;
      } finally {
        setProcessingDocIds((prev) => prev.filter((id) => id !== doc.id));
      }
    },
    [documents, folders]
  );

  /**
   * Accept a pending suggestion - move document to suggested location
   */
  const acceptSuggestion = useCallback(
    async (docId: string): Promise<void> => {
      const suggestion = pendingSuggestions.find((s) => s.documentId === docId);
      if (!suggestion) return;

      const doc = documents.find((d) => d.id === docId);
      if (!doc) return;

      // Skip if already in the suggested folder
      if (doc.folderId === suggestion.suggestedFolderId) {
        console.log('[AI Organization] Document already in suggested folder, removing suggestion');
        setPendingSuggestions((prev) =>
          prev.filter((s) => s.documentId !== docId)
        );
        return;
      }

      // Get documents in target folder to determine position (add to bottom)
      const targetFolderDocs = documents.filter(
        (d) => d.folderId === suggestion.suggestedFolderId && d.id !== docId
      );
      const newPosition = targetFolderDocs.length;

      // Move document
      moveDocument(
        docId,
        doc.collectionId,
        suggestion.suggestedFolderId,
        newPosition
      );

      // Remove from pending
      setPendingSuggestions((prev) =>
        prev.filter((s) => s.documentId !== docId)
      );
    },
    [documents, moveDocument, pendingSuggestions]
  );

  /**
   * Reject a pending suggestion - just remove the badge
   */
  const rejectSuggestion = useCallback((docId: string): void => {
    setPendingSuggestions((prev) =>
      prev.filter((s) => s.documentId !== docId)
    );
  }, []);

  /**
   * Clear all suggestions (e.g., on page navigation)
   */
  const clearSuggestions = useCallback((): void => {
    setPendingSuggestions([]);
  }, []);

  // Auto-reject suggestions when document is moved or already in suggested folder
  useEffect(() => {
    setPendingSuggestions((prev) =>
      prev.filter((suggestion) => {
        const doc = documents.find((d) => d.id === suggestion.documentId);
        if (!doc) {
          // Document no longer exists, remove suggestion
          return false;
        }

        // Auto-reject if document is already in the suggested folder
        if (doc.folderId === suggestion.suggestedFolderId) {
          console.log('[AI Organization] Auto-declining suggestion for', doc.name, '- already in suggested folder');
          return false;
        }

        // Auto-reject if document was manually moved (folder changed from when suggestion was created)
        if (doc.folderId !== suggestion.previousFolderId) {
          console.log('[AI Organization] Auto-declining suggestion for', doc.name, '- manually moved to different folder');
          return false;
        }

        return true;
      })
    );
  }, [documents]);

  return {
    pendingSuggestions,
    isProcessing,
    processingDocIds,
    requestSuggestionForTargetedDrop,
    requestAutoOrganize,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestions,
  };
}
