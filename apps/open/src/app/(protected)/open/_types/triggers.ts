/**
 * Trigger Types for Upload Events → Chat
 *
 * These types support the agentic upload trigger system where:
 * - Sidebar dispatches upload events to chat
 * - Chat applies rate limiting and debouncing
 * - AI decides contextually whether to respond
 */

export type FlowType = "organize" | "exam" | "assignment" | "lecture";

/**
 * Payload sent from sidebar when upload completes
 */
export interface UploadTriggerPayload {
  documentId: string;
  documentName: string;
  extractedText: string; // First 2000 chars from upload
  fileType: "pdf" | "docx" | "txt";
  collectionId: string;
  folderId: string | null;
}

/**
 * Internal event structure for trigger processor
 */
export interface TriggerEvent {
  type: "fileUploaded";
  payload: UploadTriggerPayload;
  timestamp: number;
}

/**
 * Setup context for determining which prompts to inject
 */
export interface SetupContext {
  /** User had 0 docs before this upload → inject onboardingPrompt */
  isFirstEverUpload: boolean;
  /** Collection.setupComplete !== true → inject flowPrompt */
  isSetupModeActive: boolean;
  /** Flow type from collection.initialFlowType */
  flowType?: FlowType;
  /** Current collection ID */
  collectionId: string;
}

/**
 * Context sent to API for trigger messages
 */
export interface TriggerContext {
  type: "fileUploaded";
  uploadedDocuments: Array<{
    documentId: string;
    documentName: string;
    extractedTextPreview: string; // First 500 chars
  }>;
  setupContext?: SetupContext;
}
