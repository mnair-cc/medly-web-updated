import { useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { curriculumApiV2Client } from "../_lib/utils/axiosHelper";
import {
  BlockProgress,
  LearnFlowProgress,
} from "@/app/(protected)/sessions/types";
import { Canvas } from "@/app/types/types";

export interface LearnFlowMessage {
  id?: string;
  message: string;
  type: "apiMessage" | "userMessage";
  card_data?: Record<string, string | number | boolean>;
  source_docs?: Array<Record<string, string | number>>;
}

export interface LearnFlowData {
  messages: LearnFlowMessage[];
  current_block_index: number;
  completed_at?: string; // ISO timestamp - set when the entire learn flow is completed
  blocks: Record<string, BlockProgress>; // Key format: "{chunk_index}_{block_order}"
}

// API request format for partial updates
interface SaveLearnFlowRequest {
  progress?: { current_block_index: number; completed_at?: string };
  messages?: LearnFlowMessage[];
  blocks?: Record<string, BlockProgress>;
}

// Track which parts have been modified
interface DirtyState {
  progress: boolean;
  messages: boolean;
  blocks: Set<string>; // Set of dirty block keys
}

/**
 * Hook for managing learn flow persistence with batching, debouncing, and partial updates.
 * Only sends data that has actually changed to reduce payload size and writes.
 */
export const useLearnFlowPersistence = (
  lessonId: string | undefined,
  initialData?: LearnFlowProgress | null
) => {
  // Keep local state that can be updated
  const getInitialState = (): LearnFlowData => {
    if (initialData) {
      return {
        messages: initialData.messages,
        current_block_index: initialData.current_block_index,
        completed_at: initialData.completed_at,
        blocks: initialData.blocks || {},
      };
    }
    return {
      messages: [],
      current_block_index: 0,
      completed_at: undefined,
      blocks: {},
    };
  };

  const localStateRef = useRef<LearnFlowData>(getInitialState());
  const dirtyStateRef = useRef<DirtyState>({
    progress: false,
    messages: false,
    blocks: new Set(),
  });

  // Update local state when initialData changes (e.g., when switching lessons)
  useEffect(() => {
    if (initialData) {
      const newState = {
        messages: initialData.messages,
        current_block_index: initialData.current_block_index,
        completed_at: initialData.completed_at,
        blocks: initialData.blocks || {},
      };
      localStateRef.current = newState;
      // Reset dirty state when initial data changes
      dirtyStateRef.current = {
        progress: false,
        messages: false,
        blocks: new Set(),
      };
    }
  }, [initialData]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<SaveLearnFlowRequest | null>(null);

  // Build partial payload from dirty state
  const buildPartialPayload = useCallback((): SaveLearnFlowRequest | null => {
    const dirty = dirtyStateRef.current;
    const state = localStateRef.current;

    // If nothing is dirty, no need to save
    if (!dirty.progress && !dirty.messages && dirty.blocks.size === 0) {
      return null;
    }

    const payload: SaveLearnFlowRequest = {};

    if (dirty.progress) {
      payload.progress = {
        current_block_index: state.current_block_index,
        completed_at: state.completed_at,
      };
    }

    if (dirty.messages) {
      payload.messages = state.messages;
    }

    if (dirty.blocks.size > 0) {
      payload.blocks = {};
      for (const blockKey of dirty.blocks) {
        if (state.blocks[blockKey]) {
          payload.blocks[blockKey] = state.blocks[blockKey];
        }
      }
    }

    return payload;
  }, []);

  // Debounced save function - only sends dirty data
  const debouncedSave = useCallback(() => {
    if (!lessonId) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set a new timeout to save after 500ms of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      const payload = buildPartialPayload();
      if (!payload || !lessonId) return;

      // Store the payload for beforeunload check
      pendingSaveRef.current = payload;

      try {
        const response = await curriculumApiV2Client.put(
          `/lessons/${lessonId}/learn-flow`,
          payload
        );

        // Check for partial failure (207 Multi-Status)
        if (response.status === 207) {
          const data = response.data;
          const results = data?.results || {};

          // Show user-friendly message for specific failures
          if (results.messages === false) {
            toast.error(
              "Chat history limit reached for this lesson. Your messages weren't saved, but your other work was preserved.",
              { duration: 8000 }
            );
            // Keep messages dirty so we don't lose track
          } else {
            // Generic partial failure message
            toast.error(
              "Some of your work couldn't be saved. Please try again.",
              { duration: 5000 }
            );
          }

          // Only clear dirty state for items that succeeded
          if (results.progress === true) dirtyStateRef.current.progress = false;
          if (results.messages === true) dirtyStateRef.current.messages = false;
          if (results.blocks === true && payload.blocks) {
            for (const blockKey of Object.keys(payload.blocks)) {
              dirtyStateRef.current.blocks.delete(blockKey);
            }
          }
        } else {
          // Full success - clear all dirty state for saved items
          if (payload.progress) dirtyStateRef.current.progress = false;
          if (payload.messages) dirtyStateRef.current.messages = false;
          if (payload.blocks) {
            for (const blockKey of Object.keys(payload.blocks)) {
              dirtyStateRef.current.blocks.delete(blockKey);
            }
          }
        }

        pendingSaveRef.current = null;
      } catch (err) {
        console.error("Failed to save learn flow data:", err);
        // Don't clear dirty state on error - will retry on next update
      }
    }, 500);
  }, [lessonId, buildPartialPayload]);

  // Update functions that modify local state and trigger debounced save
  const updateBlockIndex = useCallback(
    (blockIndex: number) => {
      localStateRef.current.current_block_index = blockIndex;
      dirtyStateRef.current.progress = true;
      debouncedSave();
    },
    [debouncedSave]
  );

  /**
   * Mark the entire learn flow as completed.
   * This should be called when the user finishes the final block.
   * Only marks as completed if not already completed.
   */
  const markLearnFlowCompleted = useCallback(() => {
    // Don't mark again if already completed
    if (localStateRef.current.completed_at) {
      return;
    }
    localStateRef.current.completed_at = new Date().toISOString();
    dirtyStateRef.current.progress = true;
    debouncedSave();
  }, [debouncedSave]);

  /**
   * Check if the learn flow is already completed
   */
  const isCompleted = useCallback(() => {
    return !!localStateRef.current.completed_at;
  }, []);

  const updateMcqAnswer = useCallback(
    (
      blockKey: string,
      userAnswer:
        | string
        | string[]
        | Record<string, string>
        | Record<string, string[]>
    ) => {
      if (!localStateRef.current.blocks[blockKey]) {
        localStateRef.current.blocks[blockKey] = {};
      }
      localStateRef.current.blocks[blockKey].user_answer = userAnswer;
      dirtyStateRef.current.blocks.add(blockKey);
      debouncedSave();
    },
    [debouncedSave]
  );

  const updateMessages = useCallback(
    (messages: LearnFlowMessage[]) => {
      localStateRef.current.messages = messages;
      dirtyStateRef.current.messages = true;
      debouncedSave();
    },
    [debouncedSave]
  );

  const updateCanvas = useCallback(
    (blockKey: string, canvas: Canvas) => {
      if (!localStateRef.current.blocks[blockKey]) {
        localStateRef.current.blocks[blockKey] = {};
      }
      localStateRef.current.blocks[blockKey].canvas = canvas;
      dirtyStateRef.current.blocks.add(blockKey);
      debouncedSave();
    },
    [debouncedSave]
  );

  const updateBlockViewedAt = useCallback(
    (blockKey: string, viewedAt: string) => {
      if (!localStateRef.current.blocks[blockKey]) {
        localStateRef.current.blocks[blockKey] = {};
      }
      localStateRef.current.blocks[blockKey].viewed_at = viewedAt;
      dirtyStateRef.current.blocks.add(blockKey);
      debouncedSave();
    },
    [debouncedSave]
  );

  const updateBlockCompletedAt = useCallback(
    (blockKey: string, completedAt: string) => {
      if (!localStateRef.current.blocks[blockKey]) {
        localStateRef.current.blocks[blockKey] = {};
      }
      localStateRef.current.blocks[blockKey].completed_at = completedAt;
      dirtyStateRef.current.blocks.add(blockKey);
      debouncedSave();
    },
    [debouncedSave]
  );

  // Handle beforeunload - warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const payload = buildPartialPayload();
      if (payload) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [buildPartialPayload]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Save any pending changes before unmounting
      const payload = buildPartialPayload();
      if (payload && lessonId) {
        curriculumApiV2Client
          .put(`/lessons/${lessonId}/learn-flow`, payload)
          .catch((err) => console.error("Failed to save on unmount:", err));
      }
    };
  }, [lessonId, buildPartialPayload]);

  return {
    updateBlockIndex,
    updateMcqAnswer,
    updateMessages,
    updateCanvas,
    updateBlockViewedAt,
    updateBlockCompletedAt,
    markLearnFlowCompleted,
    isCompleted,
    getCurrentData: () => ({ ...localStateRef.current }),
  };
};
