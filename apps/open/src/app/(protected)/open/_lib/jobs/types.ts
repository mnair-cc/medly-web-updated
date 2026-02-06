import { z } from "zod";

// ============================================
// Enums
// ============================================

export const JobTypeSchema = z.enum(["echo", "pdf_notes", "pdf_extract_notes"]);
export type JobType = z.infer<typeof JobTypeSchema>;

export const JobStatusSchema = z.enum([
  "queued",
  "started",
  "deferred",
  "finished",
  "stopped",
  "scheduled",
  "canceled",
  "failed",
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const ImageModeSchema = z.enum(["none", "prescan", "post_insert"]);
export type ImageMode = z.infer<typeof ImageModeSchema>;

export const LocaleSchema = z.enum(["uk", "us"]);
export type Locale = z.infer<typeof LocaleSchema>;

// ============================================
// Request Schemas
// ============================================

/**
 * POST /v2/jobs/pdf_extract_notes (multipart/form-data)
 *
 * Note: This is for validation - actual submission requires FormData.
 * Provide exactly one of `file` or `pdf_storage_key`.
 */
export const PdfNotesRequestSchema = z
  .object({
    file: z.instanceof(File).optional(),
    pdf_storage_key: z.string().optional(),
    image_mode: ImageModeSchema.default("none"),
    output_path: z.string().optional(),
    document_id: z.string().optional(),
    /** Firestore path to the Note document to update with notesStorageKey */
    note_document_path: z.string().optional(),
    /** Custom guidance for notes generation */
    notes_guidance: z.string().optional(),
    /** If true, only extract text without AI processing */
    text_only: z.boolean().optional(),
    /** Locale for content (affects spelling conventions, etc.) */
    locale: LocaleSchema.optional(),
  })
  .refine((data) => Boolean(data.file) !== Boolean(data.pdf_storage_key), {
    message: "Must provide exactly one of 'file' or 'pdf_storage_key'",
  });
export type PdfNotesRequest = z.infer<typeof PdfNotesRequestSchema>;

// ============================================
// Response Schemas
// ============================================

/**
 * Response from POST /v2/jobs/pdf_notes
 */
export const JobCreatedResponseSchema = z.object({
  job_id: z.string(),
});
export type JobCreatedResponse = z.infer<typeof JobCreatedResponseSchema>;

/**
 * Result returned by the pdf_notes job (in JobStatusResponse.result)
 */
export const PdfNotesJobResultSchema = z.object({
  storage_key: z.string().nullable(),
  image_count: z.number().int(),
  /** Present when note_document_path was provided. True if Firestore update succeeded. */
  metadata_updated: z.boolean().optional(),
});
export type PdfNotesJobResult = z.infer<typeof PdfNotesJobResultSchema>;

/**
 * Response from GET /v2/jobs/{job_id}
 */
export const JobStatusResponseSchema = z.object({
  job_id: z.string(),
  job_type: JobTypeSchema.nullable().optional(),
  status: JobStatusSchema,
  progress: z.number().int().nullable().optional(),
  stage: z.string().nullable().optional(),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
});
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;

// ============================================
// Helper: Type guards
// ============================================

export function isJobFinished(
  response: JobStatusResponse,
): response is JobStatusResponse & {
  status: "finished";
  result: NonNullable<JobStatusResponse["result"]>;
} {
  return response.status === "finished" && response.result != null;
}

export function isJobFailed(
  response: JobStatusResponse,
): response is JobStatusResponse & {
  status: "failed";
  error: string;
} {
  return response.status === "failed";
}

export function isPdfNotesResult(result: unknown): result is PdfNotesJobResult {
  return PdfNotesJobResultSchema.safeParse(result).success;
}

// ============================================
// PDF Notes Stage Enum (for progress tracking)
// ============================================

export const PdfNotesStageSchema = z.enum([
  "starting",
  "downloading_pdf",
  "processing_pdf",
  "extracting",
  "extracting_images",
  "processing",
  "matching_images",
  "post_processing",
  "uploading",
  "done",
]);
export type PdfNotesStage = z.infer<typeof PdfNotesStageSchema>;

/** Human-readable stage labels for UI display */
export const PDF_NOTES_STAGE_LABELS: Record<PdfNotesStage, string> = {
  starting: "Starting...",
  downloading_pdf: "Uploading PDF...",
  processing_pdf: "Processing PDF...",
  extracting: "Extracting content...",
  extracting_images: "Extracting images...",
  processing: "Generating notes...",
  matching_images: "Matching images...",
  post_processing: "Finalizing...",
  uploading: "Saving notes...",
  done: "Complete",
};

// ============================================
// SSE Stream Event Schemas
// ============================================

export const StreamChunkEventSchema = z.object({
  type: z.literal("chunk"),
  content: z.string(),
});
export type StreamChunkEvent = z.infer<typeof StreamChunkEventSchema>;

export const StreamDoneEventSchema = z.object({
  type: z.literal("done"),
  storage_key: z.string(),
  chunk_count: z.number().optional(),
  /** Present when note_document_path was provided. True if Firestore update succeeded. */
  metadata_updated: z.boolean().optional(),
});
export type StreamDoneEvent = z.infer<typeof StreamDoneEventSchema>;

export const StreamErrorEventSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});
export type StreamErrorEvent = z.infer<typeof StreamErrorEventSchema>;

/** Mapping event containing image placeholder → URL mappings */
export const StreamMappingEventSchema = z.object({
  type: z.literal("mapping"),
  /** JSON string: { [placeholderId]: { url, alt_text, description } } */
  data: z.string(),
});
export type StreamMappingEvent = z.infer<typeof StreamMappingEventSchema>;

/** Progress event for real-time status updates */
export const StreamProgressEventSchema = z.object({
  type: z.literal("progress"),
  /** Progress percentage (0-100) */
  progress: z.number().int().min(0).max(100),
  /** Current stage name (e.g., "downloading_pdf", "processing_pdf") */
  stage: z.string(),
});
export type StreamProgressEvent = z.infer<typeof StreamProgressEventSchema>;

export const StreamEventSchema = z.discriminatedUnion("type", [
  StreamChunkEventSchema,
  StreamDoneEventSchema,
  StreamErrorEventSchema,
  StreamMappingEventSchema,
  StreamProgressEventSchema,
]);
export type StreamEvent = z.infer<typeof StreamEventSchema>;
