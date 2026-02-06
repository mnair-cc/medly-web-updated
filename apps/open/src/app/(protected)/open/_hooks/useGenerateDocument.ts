import { useSidebar } from "@/app/(protected)/open/_components/sidebar/MOSidebarLayoutClient";
import { SourceReference } from "@/app/(protected)/open/_types/content";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTracking } from "@/app/_lib/posthog/useTracking";

/**
 * Hook for generating practice tests, flashcard sets, and notes pages from documents or folders.
 * Encapsulates the full flow: find source → calculate position → create doc → navigate.
 *
 * Can be used from:
 * - Sidebar context menu (DocumentItem, FolderItem)
 * - Header "Learn" dropdown
 * - AI chat capabilities (future)
 */
export function useGenerateDocument() {
  const {
    selectedCollection,
    documents,
    folders,
    getCollectionContent,
    getFolderDocuments,
    createPracticeDocument,
    createFlashcardDocument,
    createNotesDocument,
  } = useSidebar();
  const router = useRouter();
  const { track } = useTracking();

  /**
   * Generate a practice test from a document source
   */
  const generatePracticeFromDocument = useCallback(
    async (documentId: string) => {
      if (!selectedCollection) return;

      const sourceDoc = documents.find((d) => d.id === documentId);
      if (!sourceDoc) return;

      const collectionId = sourceDoc.collectionId;
      const folderId = sourceDoc.folderId;
      const sourceName = sourceDoc.name;

      // Position after siblings in same container
      const siblingsCount = documents.filter(
        (d) => d.collectionId === collectionId && d.folderId === folderId
      ).length;

      const sourceReferences: SourceReference[] = [
        { type: "document", id: documentId },
      ];

      try {
        const practiceDoc = await createPracticeDocument(
          sourceReferences,
          collectionId,
          folderId,
          siblingsCount,
          `Practice - ${sourceName}`,
        );

        track("ai_content_generated", {
          type: "practice",
          success: true,
          source_document_id: documentId,
        });
        track("document_created", {
          document_type: "practice",
          source: "ai_generated",
        });

        router.push(`/open/doc/${practiceDoc.id}`);
      } catch (error) {
        console.error("Failed to create practice document:", error);
        track("ai_generation_failed", {
          type: "practice",
          error_type: error instanceof Error ? error.message : "unknown",
        });
      }
    },
    [selectedCollection, documents, createPracticeDocument, router, track]
  );

  /**
   * Generate a practice test from a folder source
   */
  const generatePracticeFromFolder = useCallback(
    async (folderId: string) => {
      if (!selectedCollection) return;

      const sourceFolder = folders.find((f) => f.id === folderId);
      if (!sourceFolder) return;

      const collectionId = sourceFolder.collectionId;
      const sourceName = sourceFolder.name;

      // Get mixed order count for position (folders are at collection root level)
      const content = getCollectionContent(collectionId);
      const position = content.folders.length + content.documents.length;

      const sourceReferences: SourceReference[] = [
        { type: "folder", id: folderId },
      ];

      try {
        const practiceDoc = await createPracticeDocument(
          sourceReferences,
          collectionId,
          null, // Folders are at root level
          position,
          `Practice - ${sourceName}`,
        );

        track("ai_content_generated", {
          type: "practice",
          success: true,
          source_document_id: folderId,
        });
        track("document_created", {
          document_type: "practice",
          source: "ai_generated",
        });

        router.push(`/open/doc/${practiceDoc.id}`);
      } catch (error) {
        console.error("Failed to create practice document:", error);
        track("ai_generation_failed", {
          type: "practice",
          error_type: error instanceof Error ? error.message : "unknown",
        });
      }
    },
    [selectedCollection, folders, getCollectionContent, createPracticeDocument, router, track]
  );

  /**
   * Generate flashcards from a document source
   */
  const generateFlashcardsFromDocument = useCallback(
    async (documentId: string) => {
      if (!selectedCollection) return;

      const sourceDoc = documents.find((d) => d.id === documentId);
      if (!sourceDoc) return;

      const collectionId = sourceDoc.collectionId;
      const folderId = sourceDoc.folderId;
      const sourceName = sourceDoc.name;

      // Position after siblings in same container
      const siblingsCount = documents.filter(
        (d) => d.collectionId === collectionId && d.folderId === folderId
      ).length;

      const sourceReferences: SourceReference[] = [
        { type: "document", id: documentId },
      ];

      try {
        const flashcardDoc = await createFlashcardDocument(
          sourceReferences,
          collectionId,
          folderId,
          siblingsCount,
          `Flashcards - ${sourceName}`,
        );

        track("ai_content_generated", {
          type: "flashcards",
          success: true,
          source_document_id: documentId,
        });
        track("document_created", {
          document_type: "flashcards",
          source: "ai_generated",
        });

        router.push(`/open/doc/${flashcardDoc.id}`);
      } catch (error) {
        console.error("Failed to create flashcard document:", error);
        track("ai_generation_failed", {
          type: "flashcards",
          error_type: error instanceof Error ? error.message : "unknown",
        });
      }
    },
    [selectedCollection, documents, createFlashcardDocument, router, track]
  );

  /**
   * Generate flashcards from a folder source
   */
  const generateFlashcardsFromFolder = useCallback(
    async (folderId: string) => {
      if (!selectedCollection) return;

      const sourceFolder = folders.find((f) => f.id === folderId);
      if (!sourceFolder) return;

      const collectionId = sourceFolder.collectionId;
      const sourceName = sourceFolder.name;

      // Get mixed order count for position (folders are at collection root level)
      const content = getCollectionContent(collectionId);
      const position = content.folders.length + content.documents.length;

      const sourceReferences: SourceReference[] = [
        { type: "folder", id: folderId },
      ];

      try {
        const flashcardDoc = await createFlashcardDocument(
          sourceReferences,
          collectionId,
          null, // Folders are at root level
          position,
          `Flashcards - ${sourceName}`,
        );

        track("ai_content_generated", {
          type: "flashcards",
          success: true,
          source_document_id: folderId,
        });
        track("document_created", {
          document_type: "flashcards",
          source: "ai_generated",
        });

        router.push(`/open/doc/${flashcardDoc.id}`);
      } catch (error) {
        console.error("Failed to create flashcard document:", error);
        track("ai_generation_failed", {
          type: "flashcards",
          error_type: error instanceof Error ? error.message : "unknown",
        });
      }
    },
    [selectedCollection, folders, getCollectionContent, createFlashcardDocument, router, track]
  );

  /**
   * Add a notes page adjacent to a document (linked to source document)
   */
  const addPageFromDocument = useCallback(
    async (documentId: string) => {
      if (!selectedCollection) return;

      const sourceDoc = documents.find((d) => d.id === documentId);
      if (!sourceDoc) return;

      const collectionId = sourceDoc.collectionId;
      const folderId = sourceDoc.folderId;

      // Position after siblings in same container
      const siblingsCount = documents.filter(
        (d) => d.collectionId === collectionId && d.folderId === folderId
      ).length;

      // Create sourceReferences to link notes to the source document
      const sourceReferences: SourceReference[] = [
        { type: "document", id: documentId },
      ];

      try {
        const notesDoc = await createNotesDocument(
          collectionId,
          folderId,
          siblingsCount,
          "",
          sourceReferences,
        );

        track("document_created", {
          document_type: "notes",
          source: "sidebar_upload",
        });

        router.push(`/open/doc/${notesDoc.id}`);
      } catch (error) {
        console.error("Failed to create notes document:", error);
      }
    },
    [selectedCollection, documents, createNotesDocument, router, track]
  );

  /**
   * Add a notes page inside a folder
   */
  const addPageFromFolder = useCallback(
    async (folderId: string) => {
      if (!selectedCollection) return;

      const sourceFolder = folders.find((f) => f.id === folderId);
      if (!sourceFolder) return;

      const collectionId = sourceFolder.collectionId;

      // Get documents in the folder to calculate position
      const folderDocs = getFolderDocuments(folderId);
      const position = folderDocs.length;

      try {
        const notesDoc = await createNotesDocument(
          collectionId,
          folderId, // Add inside the folder
          position,
          "",
        );

        track("document_created", {
          document_type: "notes",
          source: "sidebar_upload",
        });

        router.push(`/open/doc/${notesDoc.id}`);
      } catch (error) {
        console.error("Failed to create notes document:", error);
      }
    },
    [selectedCollection, folders, getFolderDocuments, createNotesDocument, router, track]
  );

  return {
    generatePracticeFromDocument,
    generatePracticeFromFolder,
    generateFlashcardsFromDocument,
    generateFlashcardsFromFolder,
    addPageFromDocument,
    addPageFromFolder,
  };
}
