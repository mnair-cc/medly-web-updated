import { SourceReference } from "./content";

export type OpenSessionData = {
  id: string;
  sessionTitle: string;
  documentUrl?: string;
  documentId?: string;
  thumbnailUrl?: string;
  // Generated document fields
  documentType?: "document" | "practice" | "flashcards" | "notes" | "canvas";
  sourceReferences?: SourceReference[];
  /** Storage path (gs://) of the source PDF document (for notes generation) */
  sourceDocumentStoragePath?: string;
};
