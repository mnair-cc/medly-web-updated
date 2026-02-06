/**
 * Chat API Types
 *
 * Unified types for the invoke(intent) chat API.
 * All intent types are peers in a flat discriminated union.
 */

import type { DraggedContextItem } from "../_components/chat/MOChatLayoutClient";

// Re-export from triggers for backward compatibility
export type { FlowType, SetupContext, UploadTriggerPayload, TriggerEvent } from "./triggers";
export { type SetupContext as SetupContextType } from "./triggers";

/**
 * Chat attachments for user messages
 */
export interface ChatAttachments {
  selectedText?: string;
  screenshot?: { dataUrl: string };
  draggedContexts?: DraggedContextItem[];
}

/**
 * Context for fileUploaded intent
 */
export interface FileUploadedContext {
  uploadedDocuments: Array<{
    documentId: string;
    documentName: string;
    extractedTextPreview: string;
  }>;
  setupContext?: {
    isFirstEverUpload: boolean;
    isSetupModeActive: boolean;
    flowType?: "organize" | "exam" | "assignment" | "lecture";
    collectionId: string;
  };
}

/**
 * Context for documentCreated intent
 */
export interface DocumentCreatedContext {
  documentType: "practice" | "flashcards" | "notes";
  documentName: string;
  sourceDocumentIds?: string[];
  sourceDocumentNames?: string[];
}

/**
 * Context for questionWrong intent (future)
 */
export interface QuestionWrongContext {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  attemptCount: number;
  topic?: string;
}

/**
 * Context for flashcardStruggle intent (future)
 */
export interface FlashcardStruggleContext {
  cardId: string;
  term: string;
  againCount: number;
  lastInterval?: number;
}

/**
 * Context for sessionStart intent (future)
 */
export interface SessionStartContext {
  documentId: string;
  lastVisited?: string;
  resumeContext?: string;
}

/**
 * Flat discriminated union for all chat intents.
 * userMessage is just another intent type - all are peers.
 */
export type ChatIntent =
  | { type: "userMessage"; content: string; attachments?: ChatAttachments }
  | { type: "fileUploaded"; context: FileUploadedContext }
  | { type: "documentCreated"; context: DocumentCreatedContext }
  | { type: "questionWrong"; context: QuestionWrongContext }
  | { type: "flashcardStruggle"; context: FlashcardStruggleContext }
  | { type: "sessionStart"; context: SessionStartContext };

/**
 * Extract the context type for a given intent type
 */
export type IntentContext<T extends ChatIntent["type"]> = Extract<
  ChatIntent,
  { type: T }
> extends { context: infer C }
  ? C
  : never;

/**
 * Helper to check if intent is a user message
 */
export function isUserMessageIntent(
  intent: ChatIntent
): intent is Extract<ChatIntent, { type: "userMessage" }> {
  return intent.type === "userMessage";
}

/**
 * Helper to check if intent is a system intent (non-user)
 */
export function isSystemIntent(
  intent: ChatIntent
): intent is Exclude<ChatIntent, { type: "userMessage" }> {
  return intent.type !== "userMessage";
}

// ============================================
// STRUCTURED RESPONSE TYPES
// ============================================

/**
 * Quick reply option for MCQ-style user responses
 */
export interface QuickReply {
  id: string;
  label: string;
  description?: string;
}

/**
 * Structured response data returned alongside AI text
 */
export interface StructuredResponse {
  quickReplies?: QuickReply[];
  suggestedFollowUps?: string[];
  awaitUserResponse?: { message: string };
  uploadRequest?: { label: string };
}
