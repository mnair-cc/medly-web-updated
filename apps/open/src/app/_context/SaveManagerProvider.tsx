"use client";

import { SessionType } from "@/app/(protected)/sessions/types";
import { QuestionWithMarkingResult } from "@/app/types/types";
import * as Sentry from "@sentry/nextjs";
import { useMutation } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useUser } from "./UserProvider";
import {
  buildSavePayloadByEndpoint,
  executeSaveAnswersBatch,
} from "./saveManager/saveManager.api";
import {
  DEBOUNCE_MS,
  MAX_WAIT_MS,
  SAVEABLE_SESSION_TYPES,
  SaveState,
  type SaveManagerContextValue,
  type SaveWithTimestamp,
  type UseSaveManagerParams,
  type UseSaveManagerReturn,
} from "./saveManager/saveManager.types";
import { deduplicateSaves } from "./saveManager/saveManager.utils";
import { useSaveScheduler } from "./saveManager/useSaveScheduler";

// ============================================================================
// Context
// ============================================================================

const SaveManagerContext = createContext<SaveManagerContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function SaveManagerProvider({ children }: { children: ReactNode }) {
  // Scoped storage by endpoint
  const pendingLessonSavesRef = useRef<
    Map<string, QuestionWithMarkingResult[]>
  >(new Map());
  const pendingPaperSavesRef = useRef<Map<string, QuestionWithMarkingResult[]>>(
    new Map(),
  );

  // Global state
  const [saveState, setSaveState] = useState<SaveState>(SaveState.SAVED);
  const [hasPendingSaves, setHasPendingSaves] = useState(false);
  const flushOnCompleteRef = useRef(false);
  const wasSavingRef = useRef(false);

  // Get refetchUser from UserProvider context
  const { refetchUser } = useUser();

  // Track pathname for navigation detection
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);

  // ---------------------------------------------------------------------------
  // Helper functions
  // ---------------------------------------------------------------------------

  const updateHasPendingSaves = useCallback(() => {
    const hasLessonSaves = pendingLessonSavesRef.current.size > 0;
    const hasPaperSaves = pendingPaperSavesRef.current.size > 0;
    setHasPendingSaves(hasLessonSaves || hasPaperSaves);
  }, []);

  const hasPending = useCallback(() => {
    return (
      pendingLessonSavesRef.current.size > 0 ||
      pendingPaperSavesRef.current.size > 0
    );
  }, []);

  const clearAllPendingSaves = useCallback(() => {
    pendingLessonSavesRef.current.clear();
    pendingPaperSavesRef.current.clear();
    updateHasPendingSaves();
  }, [updateHasPendingSaves]);

  const restoreSavesOnError = useCallback(
    (
      savesByEndpoint: Map<
        string,
        { saves: Partial<QuestionWithMarkingResult>[] }
      >,
    ) => {
      for (const [endpoint, { saves }] of savesByEndpoint) {
        const endpointParts = endpoint.split("/");
        if (endpointParts[1] === "lessons") {
          const lessonId = endpointParts[2];
          const existing = pendingLessonSavesRef.current.get(lessonId) || [];
          pendingLessonSavesRef.current.set(
            lessonId,
            deduplicateSaves([
              ...existing,
              ...(saves as QuestionWithMarkingResult[]),
            ]),
          );
        } else if (endpointParts[1] === "papers") {
          const paperId = endpointParts[2];
          const existing = pendingPaperSavesRef.current.get(paperId) || [];
          pendingPaperSavesRef.current.set(
            paperId,
            deduplicateSaves([
              ...existing,
              ...(saves as QuestionWithMarkingResult[]),
            ]),
          );
        }
      }
      updateHasPendingSaves();
    },
    [updateHasPendingSaves],
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  // Debounced saves - no retry (next save will include all data anyway)
  const debouncedMutation = useMutation({
    mutationKey: ["save-debounced"],
    mutationFn: async ({
      savesByEndpoint,
    }: {
      savesByEndpoint: Map<
        string,
        { saves: Partial<QuestionWithMarkingResult>[] }
      >;
    }) => {
      await executeSaveAnswersBatch(savesByEndpoint, refetchUser);
    },
    retry: false,
    onMutate: (variables) => {
      setSaveState(SaveState.SAVING);
      return { savesByEndpoint: variables.savesByEndpoint };
    },
    onSuccess: () => {
      setSaveState(SaveState.SAVED);
    },
    onError: (error, _vars, context) => {
      // Capture exception in Sentry
      Sentry.captureException(error, {
        tags: { action: "save_manager_debounced" },
        extra: {
          endpointCount: context?.savesByEndpoint?.size ?? 0,
          endpoints: context?.savesByEndpoint
            ? Array.from(context.savesByEndpoint.keys())
            : [],
        },
      });

      // Restore saves on error
      if (context?.savesByEndpoint) {
        restoreSavesOnError(context.savesByEndpoint);
      }
      setSaveState(SaveState.ERROR);
    },
  });

  // Priority saves - retry with exponential backoff (marking, submit, page change)
  const priorityMutation = useMutation({
    mutationKey: ["save-priority"],
    mutationFn: async ({
      savesByEndpoint,
    }: {
      savesByEndpoint: Map<
        string,
        { saves: Partial<QuestionWithMarkingResult>[] }
      >;
    }) => {
      await executeSaveAnswersBatch(savesByEndpoint, refetchUser);
    },
    retry: 2,
    // Exponential backoff: 3s, 6s (capped at 10s)
    retryDelay: (attemptIndex) =>
      Math.min(DEBOUNCE_MS * 2 ** attemptIndex, 10000),
    onMutate: (variables) => {
      setSaveState(SaveState.SAVING);
      return { savesByEndpoint: variables.savesByEndpoint };
    },
    onSuccess: () => {
      setSaveState(SaveState.SAVED);
    },
    onError: (error, _vars, context) => {
      // Capture exception in Sentry
      Sentry.captureException(error, {
        tags: { action: "save_manager_priority" },
        extra: {
          endpointCount: context?.savesByEndpoint?.size ?? 0,
          endpoints: context?.savesByEndpoint
            ? Array.from(context.savesByEndpoint.keys())
            : [],
        },
      });

      // Restore saves on error
      if (context?.savesByEndpoint) {
        restoreSavesOnError(context.savesByEndpoint);
      }
      setSaveState(SaveState.ERROR);
      toast.error("Failed to save. Please try again.");
    },
  });

  const isSaving = debouncedMutation.isPending || priorityMutation.isPending;

  // ---------------------------------------------------------------------------
  // Save execution callbacks
  // ---------------------------------------------------------------------------

  const executeDebouncedSave = useCallback(() => {
    if (isSaving) return;

    const savesByEndpoint = buildSavePayloadByEndpoint(
      pendingLessonSavesRef.current,
      pendingPaperSavesRef.current,
    );
    clearAllPendingSaves();
    if (savesByEndpoint.size > 0) {
      debouncedMutation.mutate({ savesByEndpoint });
    } else {
      // No meaningful saves after filtering - reset state
      setSaveState(SaveState.SAVED);
    }
  }, [isSaving, clearAllPendingSaves, debouncedMutation]);

  const executeFlush = useCallback(async () => {
    if (isSaving) {
      flushOnCompleteRef.current = true;
      return;
    }

    flushOnCompleteRef.current = false;
    const savesByEndpoint = buildSavePayloadByEndpoint(
      pendingLessonSavesRef.current,
      pendingPaperSavesRef.current,
    );
    clearAllPendingSaves();
    if (savesByEndpoint.size > 0) {
      await priorityMutation.mutateAsync({ savesByEndpoint });
    } else {
      // No meaningful saves after filtering - reset state
      setSaveState(SaveState.SAVED);
    }
  }, [isSaving, clearAllPendingSaves, priorityMutation]);

  // ---------------------------------------------------------------------------
  // Save scheduler
  // ---------------------------------------------------------------------------

  const scheduler = useSaveScheduler({
    debounceMs: DEBOUNCE_MS,
    maxWaitMs: MAX_WAIT_MS,
    onFlush: executeDebouncedSave,
    isExecuting: isSaving,
  });

  // Handle save completion: when isSaving transitions from true → false
  useEffect(() => {
    if (wasSavingRef.current && !isSaving) {
      // Capture and reset the flag immediately to prevent stale state across save cycles.
      // If we only reset inside the hasPending() branch, the flag can remain true
      // when no saves accumulated, causing later saves to incorrectly use priority mutation.
      const shouldFlush = flushOnCompleteRef.current;
      flushOnCompleteRef.current = false;

      if (hasPending() && saveState !== SaveState.ERROR) {
        setSaveState(SaveState.SAVING);
        if (shouldFlush) {
          void executeFlush();
        } else {
          scheduler.schedule();
        }
      }
    }
    wasSavingRef.current = isSaving;
  }, [isSaving, saveState, hasPending, executeFlush, scheduler]);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  const addPendingSave = useCallback(
    (
      save: QuestionWithMarkingResult,
      params: { lessonId?: string; paperId?: string; sessionType: SessionType },
    ) => {
      if (!SAVEABLE_SESSION_TYPES.has(params.sessionType)) return;

      // Early return if no valid destination - don't set SAVING state
      if (!params.lessonId && !params.paperId) return;

      const saveWithTimestamp: SaveWithTimestamp = {
        ...save,
        timestamp: (save as SaveWithTimestamp).timestamp ?? Date.now(),
      };

      if (params.lessonId) {
        const existing =
          pendingLessonSavesRef.current.get(params.lessonId) || [];
        const updated = deduplicateSaves([...existing, saveWithTimestamp]);
        pendingLessonSavesRef.current.set(params.lessonId, updated);
      } else if (params.paperId) {
        const existing = pendingPaperSavesRef.current.get(params.paperId) || [];
        const updated = deduplicateSaves([...existing, saveWithTimestamp]);
        pendingPaperSavesRef.current.set(params.paperId, updated);
      }

      // Only set SAVING state after we've confirmed a save was added
      setSaveState(SaveState.SAVING);
      updateHasPendingSaves();

      // Schedule debounced save if not already executing
      if (!isSaving) {
        scheduler.schedule();
      }
    },
    [updateHasPendingSaves, isSaving, scheduler],
  );

  const flushPendingSaves = useCallback(async () => {
    scheduler.clearTimers();
    await executeFlush();
  }, [scheduler, executeFlush]);

  // Flush on visibility change (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        (pendingLessonSavesRef.current.size > 0 ||
          pendingPaperSavesRef.current.size > 0)
      ) {
        flushPendingSaves().catch(() => {
          // Error handled by mutation onError
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushPendingSaves]);

  // Flush on navigation (pathname change)
  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      if (
        pendingLessonSavesRef.current.size > 0 ||
        pendingPaperSavesRef.current.size > 0
      ) {
        void flushPendingSaves();
      }
      previousPathnameRef.current = pathname;
    }
  }, [pathname, flushPendingSaves]);

  const contextValue: SaveManagerContextValue = {
    addPendingSave,
    flushPendingSaves,
    saveState,
    hasPendingSaves,
  };

  return (
    <SaveManagerContext.Provider value={contextValue}>
      {children}
    </SaveManagerContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useSaveManager - Manages debounced saving of question answers with tiered save strategy
 *
 * Uses context-based storage that persists across navigation.
 * Exposes a simple interface: saveState, addPendingSave, flushPendingSaves
 *
 * Save tiers:
 * - Debounced (3s): Background saves, no retry (next save will include all data)
 * - Priority (immediate, 2 retries with 3s/6s delays): For marking, page changes, visibility changes
 */
export function useSaveManager({
  paperId,
  lessonId,
  sessionType,
}: UseSaveManagerParams): UseSaveManagerReturn {
  const context = useContext(SaveManagerContext);
  if (!context) {
    throw new Error("useSaveManager must be used within SaveManagerProvider");
  }

  const addPendingSave = useCallback(
    (save: QuestionWithMarkingResult) => {
      context.addPendingSave(save, { lessonId, paperId, sessionType });
    },
    [context, lessonId, paperId, sessionType],
  );

  const flushPendingSaves = useCallback(async () => {
    await context.flushPendingSaves();
  }, [context]);

  return {
    saveState: context.saveState,
    hasPendingSaves: context.hasPendingSaves,
    addPendingSave,
    flushPendingSaves,
  };
}

// Re-export types and constants for convenience
export {
  DEBOUNCE_MS,
  MAX_WAIT_MS,
  SaveState,
} from "./saveManager/saveManager.types";
