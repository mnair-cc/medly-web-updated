/**
 * Type definitions for Open Platform JSONB data columns.
 * These interfaces define the shape of data stored in the `data` JSONB column of each table.
 */

import type { TranscriptionChunk } from "@/app/(protected)/open/_hooks/useTranscription";
import type { FlashcardDeck } from "@/app/(protected)/open/_types/flashcardTypes";
import type { FlowType } from "@/app/(protected)/open/_types/triggers";
import type { ExtractedSyllabus } from "@/app/(protected)/open/onboarding/_types/syllabus";
import type {
  QuestionGroup,
  QuestionWithMarkingResult,
} from "@/app/types/types";

// =============================================================================
// User Data
// =============================================================================

export type ChecklistStepId =
  | "review-lecture"
  | "add-module"
  | "start-assignment"
  | "prepare-exam"
  | "create-flashcards";

export interface ChecklistProgress {
  "review-lecture"?: { completedAt: string };
  "add-module"?: { completedAt: string };
  "start-assignment"?: { completedAt: string };
  "prepare-exam"?: { completedAt: string };
  "create-flashcards"?: { completedAt: string };
}

export interface TutorialWalkthroughState {
  currentStep: number | null;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  gettingStartedCollectionId: string | null;
  // Checklist fields
  checklistProgress?: ChecklistProgress;
  checklistCompletedAt?: string | null;
  checklistDismissedAt?: string | null;
  welcomeSeenAt?: string | null;
}

export interface UserData {
  userName?: string;
  avatar?: string;
  focusArea?: string;
  university?: string;
  hasCompletedOpenOnboarding?: boolean;
  tutorialWalkthrough?: TutorialWalkthroughState;
}

// =============================================================================
// Collection Data
// =============================================================================

export interface CollectionData {
  name: string;
  position: number;
  primaryColor?: string;
  icon?: string;
  syllabus?: ExtractedSyllabus;
  initialFlowType?: FlowType;
  setupComplete?: boolean;
}

// =============================================================================
// Folder Data
// =============================================================================

export interface FolderData {
  name: string;
  position: number;
  type?: "assignment";
  deadline?: string; // ISO date (YYYY-MM-DD)
  weighting?: number; // Percentage (e.g., 20)
  isExpanded?: boolean; // UI expansion state (defaults to true)
}

// =============================================================================
// Document Data
// =============================================================================

/** Source reference for generated documents (practice tests, flashcard sets, etc.) */
export interface SourceReference {
  type: "document" | "folder" | "collection";
  id: string;
}

export type DocumentType =
  | "document"
  | "practice"
  | "flashcards"
  | "notes"
  | "canvas";

export type DocumentLabel =
  | "slides"
  | "syllabus"
  | "assignment"
  | "notes"
  | "reading"
  | "practice"
  | "flashcards";

export interface DocumentData {
  name: string;
  position: number;
  type: DocumentType;

  // Storage references
  storageUrl?: string;
  storagePath?: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  originalUrl?: string;

  // Metadata
  label?: DocumentLabel;
  isPlaceholder?: boolean;
  isLoading?: boolean;
  lastViewedAt?: number;
  sourceReferences?: SourceReference[];

  // Session data (persisted user annotations)
  notes?: { [page: number]: string };
  canvases?: { [page: number]: unknown };
  highlights?: { [page: number]: unknown[] };
  questions?: QuestionWithMarkingResult[];
  questionGroups?: QuestionGroup[];
  pageNotes?: string;
  notesStorageKey?: string;
  pageTitle?: string;
  documentTranscription?: TranscriptionChunk[] | string;
  allPagesText?: Array<{ page: number; text: string }>;
  flashcardDeck?: FlashcardDeck;
}

// =============================================================================
// Chat Message Data
// =============================================================================

export interface ChatMessageData {
  role: "user" | "assistant";
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Chat Thread Data
// =============================================================================

export interface ChatThreadData {
  title?: string;
  messages?: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: number;
  }>;
}

export interface ChatThreadResponse {
  id: string;
  collectionId: string;
  documentIds: string[] | null;
  title?: string;
  messages?: ChatThreadData["messages"];
  createdAt: number;
}

/** Lightweight thread summary for list views (no messages). */
export interface ChatThreadSummaryResponse {
  id: string;
  collectionId: string;
  title?: string;
  createdAt: number;
}

// =============================================================================
// API Response Types (matching existing Firestore response format)
// =============================================================================

export interface CollectionResponse {
  id: string;
  name: string;
  position: number;
  primaryColor?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  syllabus?: ExtractedSyllabus;
  initialFlowType?: FlowType;
  setupComplete?: boolean;
}

export interface FolderResponse {
  id: string;
  collectionId: string;
  name: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  type?: "assignment";
  deadline?: string;
  weighting?: number;
  isExpanded?: boolean;
}

export interface DocumentResponse {
  id: string;
  collectionId: string;
  folderId: string | null;
  name: string;
  storageUrl?: string;
  storagePath?: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  originalUrl?: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  type: DocumentType;
  sourceReferences?: SourceReference[];
  label?: DocumentLabel;
  isPlaceholder?: boolean;
  lastViewedAt?: number;
  notes?: { [page: number]: string };
  canvases?: { [page: number]: unknown };
  highlights?: { [page: number]: unknown[] };
  questions?: QuestionWithMarkingResult[];
  questionGroups?: QuestionGroup[];
  pageNotes?: string;
  notesStorageKey?: string;
  pageTitle?: string;
  documentTranscription?: TranscriptionChunk[] | string;
  allPagesText?: Array<{ page: number; text: string }>;
  flashcardDeck?: FlashcardDeck;
}

export interface UserProfileResponse {
  hasCompletedOpenOnboarding: boolean;
  userName?: string;
  avatar?: string;
}
