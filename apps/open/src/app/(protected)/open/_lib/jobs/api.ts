import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import {
  ImageMode,
  JobCreatedResponseSchema,
  JobStatusResponse,
  JobStatusResponseSchema,
  Locale,
} from "./types";

/**
 * Options for starting a PDF extract notes job.
 */
export interface StartPdfNotesJobOptions {
  /** Image extraction mode: "none" (fastest), "prescan", or "post_insert" */
  imageMode?: ImageMode;
  /** Relative path within user folder for outputs (default: server decides) */
  outputPath?: string;
  /** Document ID for filename - files named {timestamp_ms}_{document_id}.md */
  documentId?: string;
  /** Firestore path to the Note document to update with notesStorageKey on completion */
  noteDocumentPath?: string;
  /** Custom guidance for notes generation */
  notesGuidance?: string;
  /** If true, only extract text without AI processing */
  textOnly?: boolean;
  /** Locale for content (affects spelling conventions, etc.) */
  locale?: Locale;
}

/**
 * Start a PDF extract notes job.
 *
 * @param source - Either a File object to upload, or a Firebase storage key (gs:// path)
 * @param options - Job options (imageMode, outputPath, documentId, notesGuidance, textOnly, locale)
 * @returns The job ID for streaming
 */
export async function startPdfNotesJob(
  source: File | string,
  options: StartPdfNotesJobOptions = {},
): Promise<string> {
  const {
    imageMode = "none",
    outputPath,
    documentId,
    noteDocumentPath,
    notesGuidance,
    textOnly,
    locale,
  } = options;

  const formData = new FormData();

  if (source instanceof File) {
    formData.append("file", source);
  } else {
    // Extract the path from gs:// URL if present
    const storageKey = source.startsWith("gs://")
      ? source.replace(/^gs:\/\/[^/]+\//, "")
      : source;
    formData.append("pdf_storage_key", storageKey);
  }

  formData.append("image_mode", imageMode);

  if (outputPath) {
    formData.append("output_path", outputPath);
  }
  if (documentId) {
    formData.append("document_id", documentId);
  }
  if (noteDocumentPath) {
    formData.append("note_document_path", noteDocumentPath);
  }
  if (notesGuidance) {
    formData.append("notes_guidance", notesGuidance);
  }
  if (textOnly !== undefined) {
    formData.append("text_only", String(textOnly));
  }
  if (locale) {
    formData.append("locale", locale);
  }

  // TODO: TEMPORARY DEBUG - Remove after testing
  console.log("[api.ts] startPdfNotesJob form data:", {
    pdf_storage_key: source instanceof File ? "(file)" : source,
    image_mode: imageMode,
    output_path: outputPath,
    document_id: documentId,
    note_document_path: noteDocumentPath,
    notes_guidance: notesGuidance,
    text_only: textOnly,
    locale,
  });

  const response = await curriculumApiV2Client.post(
    "/jobs/pdf_extract_notes",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  const parsed = JobCreatedResponseSchema.parse(response.data);
  return parsed.job_id;
}

/**
 * Get the current status of a job.
 *
 * @param jobId - The job ID returned from startPdfNotesJob
 * @returns The job status including progress, stage, and result (if finished)
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await curriculumApiV2Client.get("/jobs", {
    params: { job_id: jobId },
  });
  return JobStatusResponseSchema.parse(response.data);
}
