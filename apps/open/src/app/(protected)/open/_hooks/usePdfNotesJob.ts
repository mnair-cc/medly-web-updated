"use client";

import {
  getJobStatus,
  isPdfNotesResult,
  startPdfNotesJob,
  StreamEventSchema,
  type PdfNotesJobResult,
  type PdfNotesStage,
} from "@/app/(protected)/open/_lib/jobs";
import { StartPdfNotesJobOptions } from "@/app/(protected)/open/_lib/jobs/api";
import { useMutation } from "@tanstack/react-query";
import { getSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Types
// ============================================================================

/** Default streaming timeout: 2 minutes */
const DEFAULT_STREAMING_TIMEOUT_MS = 2 * 60 * 1000;

/** Parsed mapping data from the mapping event */
export type ImageMappingData = {
  [placeholderId: string]: {
    url: string;
    alt_text?: string;
    description?: string;
  };
};

export interface UsePdfNotesJobOptions {
  /** Called when a chunk of markdown content is received */
  onChunk?: (content: string, accumulated: string) => void;
  /** Called when progress/stage updates during streaming */
  onProgress?: (progress: number, stage: PdfNotesStage | null) => void;
  /** Called when image mapping data is received */
  onMapping?: (mapping: ImageMappingData) => void;
  /** Called when job completes successfully */
  onSuccess?: (result: PdfNotesJobResult) => void;
  /** Called when job fails */
  onError?: (error: Error) => void;
  /** Streaming timeout in milliseconds (default: 2 minutes). Set to 0 to disable. */
  streamingTimeoutMs?: number;
}

export interface UsePdfNotesJobReturn {
  /** Start a PDF notes job. Returns the job ID. */
  mutate: (source: File | string, options?: StartPdfNotesJobOptions) => void;
  /** Start a PDF notes job and await completion. Returns the result. */
  mutateAsync: (
    source: File | string,
    options?: StartPdfNotesJobOptions,
  ) => Promise<PdfNotesJobResult>;
  /** Cancel streaming (job continues server-side) */
  cancelStreaming: () => void;
  /** Reset the mutation state */
  reset: () => void;

  // State
  /** Current job ID (null if no job started) */
  jobId: string | null;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current processing stage */
  stage: PdfNotesStage | null;
  /** Accumulated markdown content from streaming chunks */
  streamedContent: string;
  /** Job result when finished */
  data: PdfNotesJobResult | null;
  /** Error message if failed */
  error: Error | null;

  // Derived state (matches useMutation API)
  /** True while job is starting */
  isPending: boolean;
  /** True while streaming */
  isStreaming: boolean;
  /** True if job completed successfully */
  isSuccess: boolean;
  /** True if job failed */
  isError: boolean;
  /** True if idle (no job running) */
  isIdle: boolean;
  /** True if a job is running (isPending || isStreaming). Must call reset() before starting new job. */
  isRunning: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePdfNotesJob(
  options: UsePdfNotesJobOptions = {},
): UsePdfNotesJobReturn {
  const {
    onChunk,
    onProgress,
    onMapping,
    onSuccess,
    onError,
    streamingTimeoutMs = DEFAULT_STREAMING_TIMEOUT_MS,
  } = options;

  // State for real-time progress tracking
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<PdfNotesStage | null>(null);
  const [streamedContent, setStreamedContent] = useState("");

  // Refs for streaming control
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const chunkCountRef = useRef(0);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to keep jobId state and ref in sync
  const setActiveJob = useCallback((id: string | null) => {
    activeJobIdRef.current = id;
    setJobId(id);
  }, []);

  // Cleanup streaming
  const cancelStreaming = useCallback(() => {
    setActiveJob(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }
    lastEventIdRef.current = null;
    chunkCountRef.current = 0;
  }, [setActiveJob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeJobIdRef.current = null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
        streamingTimeoutRef.current = null;
      }
    };
  }, []);

  // Fetch final content from storage if chunks are missing
  const fetchFinalContent = useCallback(
    async (storageKey: string): Promise<string> => {
      const response = await fetch(
        `/api/open/storage/download?key=${encodeURIComponent(storageKey)}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch final content from storage");
      }
      return await response.text();
    },
    [],
  );

  // Check job status and return result if finished
  const checkJobStatusForResult = useCallback(
    async (jobId: string): Promise<PdfNotesJobResult | null> => {
      try {
        console.log(
          `[usePdfNotesJob] Checking job status for ${jobId} due to timeout`,
        );
        const jobStatus = await getJobStatus(jobId);
        console.log(`[usePdfNotesJob] Job status:`, jobStatus.status);

        if (
          jobStatus.status === "finished" &&
          isPdfNotesResult(jobStatus.result)
        ) {
          console.log(`[usePdfNotesJob] Job finished, returning result`);
          return jobStatus.result;
        }

        if (jobStatus.status === "failed") {
          throw new Error(jobStatus.error || "Job failed");
        }

        // Job still running or in other state
        return null;
      } catch (error) {
        console.warn("[usePdfNotesJob] Failed to check job status:", error);
        return null;
      }
    },
    [],
  );

  // Stream SSE events until completion (with reconnection support)
  const streamUntilComplete = useCallback(
    async (currentJobId: string): Promise<PdfNotesJobResult> => {
      // Mark this job as active
      setActiveJob(currentJobId);
      setStreamedContent("");
      chunkCountRef.current = 0;

      // Clear any existing timeout
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
        streamingTimeoutRef.current = null;
      }

      // Create a promise that resolves when timeout fires and job is complete
      const timeoutPromise =
        streamingTimeoutMs > 0
          ? new Promise<PdfNotesJobResult>((resolve, reject) => {
              streamingTimeoutRef.current = setTimeout(async () => {
                console.log(
                  `[usePdfNotesJob] Streaming timeout (${streamingTimeoutMs}ms) reached, checking job status...`,
                );

                // Check if job is finished
                const result = await checkJobStatusForResult(currentJobId);

                if (result) {
                  // Job finished, resolve with result
                  resolve(result);
                } else {
                  // Job not finished, abort streaming
                  console.log(
                    `[usePdfNotesJob] Job not finished after timeout, cancelling streaming`,
                  );
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                  reject(
                    new Error(
                      "Streaming timeout - job may still be running on server",
                    ),
                  );
                }
              }, streamingTimeoutMs);
            })
          : // If timeout disabled, create a promise that never resolves
            new Promise<PdfNotesJobResult>(() => {});

      const maxRetries = 1;
      let retryCount = 0;
      let accumulatedContent = "";

      // Wrap streaming in a function so we can race it against timeout
      const doStreaming = async (): Promise<PdfNotesJobResult> => {
        while (retryCount <= maxRetries) {
          try {
            // Get auth token (refresh on each attempt in case it expired)
            const session = await getSession();
            const token = session?.databaseApiAccessToken;

            if (!token) {
              throw new Error("No authentication token available");
            }

            const apiUrl = process.env.NEXT_PUBLIC_CURRICULUM_API_URL;
            if (!apiUrl) {
              throw new Error(
                "NEXT_PUBLIC_CURRICULUM_API_URL is not configured",
              );
            }

            const streamUrl = `${apiUrl}/api/v2/jobs/${currentJobId}/stream`;

            // Create abort controller for cancellation
            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            // Build headers with auth and optional Last-Event-ID for reconnection
            const headers: HeadersInit = {
              Authorization: `Bearer ${token}`,
            };
            if (lastEventIdRef.current) {
              headers["Last-Event-ID"] = lastEventIdRef.current;
            }

            const response = await fetch(streamUrl, {
              method: "GET",
              headers,
              signal: abortController.signal,
            });

            if (!response.ok) {
              throw new Error(
                `Failed to connect to stream: ${response.statusText}`,
              );
            }

            if (!response.body) {
              throw new Error("No response body");
            }

            // Read the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            try {
              while (true) {
                // Check if this job is still active (may have been superseded)
                if (activeJobIdRef.current !== currentJobId) {
                  throw new Error("Job superseded");
                }

                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete lines (SSE format)
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                  if (!line.trim()) continue;

                  // SSE format: lines start with "data: " or "id: "
                  if (line.startsWith("id: ")) {
                    lastEventIdRef.current = line.slice(4).trim();
                    continue;
                  }

                  if (!line.startsWith("data: ")) continue;

                  const jsonStr = line.slice(6); // Remove "data: " prefix
                  if (jsonStr.trim() === "") continue;

                  try {
                    const eventData = JSON.parse(jsonStr);
                    const event = StreamEventSchema.parse(eventData);

                    if (event.type === "chunk") {
                      accumulatedContent += event.content;
                      chunkCountRef.current += 1;
                      setStreamedContent(accumulatedContent);
                      onChunk?.(event.content, accumulatedContent);
                    } else if (event.type === "mapping") {
                      // Parse the mapping data JSON string and call the callback
                      try {
                        const mappingData: ImageMappingData = JSON.parse(
                          event.data,
                        );
                        onMapping?.(mappingData);
                      } catch (parseErr) {
                        console.warn(
                          "[usePdfNotesJob] Failed to parse mapping data:",
                          parseErr,
                        );
                      }
                    } else if (event.type === "done") {
                      // Check if we're missing chunks
                      if (
                        event.chunk_count != null &&
                        chunkCountRef.current < event.chunk_count
                      ) {
                        // Fetch final content from storage
                        const finalContent = await fetchFinalContent(
                          event.storage_key,
                        );
                        const missingContent = finalContent.slice(
                          accumulatedContent.length,
                        );
                        accumulatedContent = finalContent;
                        setStreamedContent(finalContent);
                        if (missingContent) {
                          onChunk?.(missingContent, finalContent);
                        }
                      }

                      // Fetch full job result to get image_count and metadata_updated
                      try {
                        const jobStatus = await getJobStatus(currentJobId);
                        if (
                          jobStatus.status === "finished" &&
                          isPdfNotesResult(jobStatus.result)
                        ) {
                          return jobStatus.result;
                        }
                      } catch (statusError) {
                        console.warn(
                          "Failed to fetch job status:",
                          statusError,
                        );
                      }

                      // Fallback: return result from stream event
                      return {
                        storage_key: event.storage_key,
                        image_count: 0,
                        metadata_updated: event.metadata_updated,
                      };
                    } else if (event.type === "error") {
                      // Server-side error - don't retry
                      throw new Error(event.message);
                    } else if (event.type === "progress") {
                      // Update progress state and notify callback
                      setProgress(event.progress);
                      setStage(event.stage as PdfNotesStage);
                      onProgress?.(event.progress, event.stage as PdfNotesStage);
                    }
                  } catch (parseError) {
                    // Skip invalid JSON, but log for debugging
                    if (
                      parseError instanceof Error &&
                      parseError.message !== "Job superseded"
                    ) {
                      console.warn(
                        "Failed to parse SSE event:",
                        parseError,
                        jsonStr,
                      );
                    } else {
                      throw parseError;
                    }
                  }
                }
              }
            } finally {
              reader.releaseLock();
            }

            // Stream ended without done event - try to reconnect
            throw new Error("Stream ended unexpectedly");
          } catch (error) {
            // Don't retry on these errors
            if (
              error instanceof Error &&
              (error.name === "AbortError" ||
                error.message === "Job superseded" ||
                error.message.startsWith("No authentication") ||
                error.message.includes("not configured"))
            ) {
              throw error;
            }

            retryCount++;
            if (retryCount > maxRetries) {
              throw error;
            }

            // Wait before retrying (exponential backoff: 1s, 2s, 4s)
            const delay = Math.pow(2, retryCount - 1) * 1000;
            console.log(
              `Stream disconnected, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        throw new Error("Max retries exceeded");
      };

      try {
        // Race streaming against timeout
        const result = await Promise.race([doStreaming(), timeoutPromise]);

        // Clear timeout on success
        if (streamingTimeoutRef.current) {
          clearTimeout(streamingTimeoutRef.current);
          streamingTimeoutRef.current = null;
        }

        return result;
      } catch (error) {
        // Clear timeout on error
        if (streamingTimeoutRef.current) {
          clearTimeout(streamingTimeoutRef.current);
          streamingTimeoutRef.current = null;
        }
        throw error;
      }
    },
    [
      onChunk,
      onMapping,
      setActiveJob,
      fetchFinalContent,
      checkJobStatusForResult,
      streamingTimeoutMs,
    ],
  );

  // Main mutation
  const mutation = useMutation<
    PdfNotesJobResult,
    Error,
    { source: File | string; options?: StartPdfNotesJobOptions }
  >({
    mutationKey: ["pdf-notes-job"],
    mutationFn: async ({ source, options }) => {
      // Reset state
      setProgress(0);
      setStage(null);
      setStreamedContent("");

      // Start the job
      const newJobId = await startPdfNotesJob(source, options);

      // Stream until complete (sets activeJob internally)
      return await streamUntilComplete(newJobId);
    },
    onSuccess: (result) => {
      cancelStreaming();
      setProgress(100);
      onSuccess?.(result);
    },
    onError: (error) => {
      cancelStreaming();
      onError?.(error);
    },
  });

  // Check if a job is currently running
  const isRunning = mutation.isPending;

  // Wrapper to match simpler API
  const mutate = useCallback(
    (source: File | string, options?: StartPdfNotesJobOptions) => {
      if (mutation.isPending) {
        return;
      }

      setActiveJob(null);
      setProgress(0);
      setStage(null);
      setStreamedContent("");
      mutation.mutate({ source, options });
    },
    [mutation, setActiveJob],
  );

  const mutateAsync = useCallback(
    async (source: File | string, options?: StartPdfNotesJobOptions) => {
      if (mutation.isPending) {
        throw new Error(
          "Cannot start new job while one is in progress. Call reset() first.",
        );
      }
      setActiveJob(null);
      setProgress(0);
      setStage(null);
      setStreamedContent("");
      return mutation.mutateAsync({ source, options });
    },
    [mutation, setActiveJob],
  );

  const reset = useCallback(() => {
    cancelStreaming();
    setProgress(0);
    setStage(null);
    setStreamedContent("");
    mutation.reset();
  }, [mutation, cancelStreaming]);

  const isStreaming = mutation.isPending && jobId !== null;

  return {
    // Actions
    mutate,
    mutateAsync,
    cancelStreaming,
    reset,

    // State
    jobId,
    progress,
    stage,
    streamedContent,
    data: mutation.data ?? null,
    error: mutation.error,

    // Derived state (matches useMutation API)
    isPending: mutation.isPending && jobId === null,
    isStreaming,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    isIdle: mutation.isIdle,
    isRunning,
  };
}
