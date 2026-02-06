import type { TranscriptionChunk } from "@/app/(protected)/open/_hooks/useTranscription";
import type { FlashcardDeck } from "@/app/(protected)/open/_types/flashcardTypes";
import type { ExtractedSyllabus } from "@/app/(protected)/open/onboarding/_types/syllabus";
import type { FlowType } from "@/app/(protected)/open/_types/triggers";
import type {
  QuestionGroup,
  QuestionWithMarkingResult,
} from "@/app/types/types";

export interface Collection {
  id: string;
  name: string;
  position: number;
  primaryColor?: string; // for future use
  icon?: string; // for future use
  createdAt: number;
  updatedAt: number;
  syllabus?: ExtractedSyllabus; // Extracted syllabus data for this module
  initialFlowType?: FlowType; // Flow selected during collection setup (organize/exam/assignment/lecture)
  setupComplete?: boolean; // True after user triggers "I'm done" action
}

export interface Folder {
  id: string;
  collectionId: string;
  name: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  // Assignment folder fields
  type?: "assignment";
  deadline?: string; // ISO date (YYYY-MM-DD)
  weighting?: number; // Percentage (e.g., 20)
  // UI state
  isExpanded?: boolean; // Expansion state (defaults to true)
}

/** Source reference for generated documents (practice tests, flashcard sets, etc.) */
export interface SourceReference {
  type: "document" | "folder" | "collection";
  id: string;
}

export interface Document {
  id: string;
  collectionId: string;
  folderId: string | null; // null if in collection root
  name: string;
  storageUrl?: string; // HTTPS download URL with token
  storagePath?: string; // Firebase Storage gs:// path
  thumbnailUrl?: string; // HTTPS download URL for thumbnail image
  thumbnailPath?: string; // Firebase Storage gs:// path for thumbnail
  originalUrl?: string; // Original URL for de-duplication when created from external link
  position: number;
  createdAt: number;
  updatedAt: number;
  // TODO: Make non-optional once all existing docs have type field migrated
  type?: "document" | "practice" | "flashcards" | "notes" | "canvas"; // Document type - what kind of document this is
  sourceReferences?: SourceReference[]; // Sources for generated docs (practice/flashcards)
  label?:
    | "slides"
    | "syllabus"
    | "assignment"
    | "notes"
    | "reading"
    | "practice"
    | "flashcards"; // Content label - describes what kind of course material this is
  isPlaceholder?: boolean; // Whether this is a placeholder awaiting user upload
  isLoading?: boolean; // Whether document is being processed (upload + AI organization)
  lastViewedAt?: number; // Timestamp of last view, undefined = never viewed (new)

  // Session data (persisted user annotations)
  notes?: { [page: number]: string }; // Page-level notes
  canvases?: { [page: number]: any }; // Page-level drawings (Canvas type from types.ts)
  highlights?: { [page: number]: any[] }; // Page-level highlights (DocumentNote[] from useSessionOpen)
  questions?: QuestionWithMarkingResult[]; // Legacy: flat question list
  questionGroups?: QuestionGroup[]; // Question groups with stems and parts
  pageNotes?: string; // Notes raw text (canonical markdown) - legacy, use notesStorageKey for new notes
  notesStorageKey?: string; // Firebase Storage key for notes markdown file (format: users/{userId}/notes/{timestamp}_{documentId}.md)
  documentTranscription?: TranscriptionChunk[] | string; // Transcription chunks (new) or legacy string format
  allPagesText?: Array<{ page: number; text: string }>; // Cached extracted text
  flashcardDeck?: FlashcardDeck; // Flashcard deck data
}

export interface CollectionContent {
  folders: Folder[];
  documents: Document[]; // root-level documents only
}
