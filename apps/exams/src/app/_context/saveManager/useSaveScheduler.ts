"use client";

import { useCallback, useEffect, useRef } from "react";

// ============================================================================
// Generic Save Scheduler Hook
// ============================================================================

interface UseSaveSchedulerOptions {
  debounceMs: number;
  maxWaitMs: number;
  onFlush: () => void | Promise<void>;
  isExecuting: boolean;
}

interface UseSaveSchedulerReturn {
  schedule: () => void;
  flush: () => Promise<void>;
  clearTimers: () => void;
}

/**
 * Generic hook for debounced saving with max-wait timeout
 * 
 * Uses callback injection pattern to decouple from specific save implementations.
 * The hook only manages timing - it doesn't know about the data structure.
 * Caller provides:
 * - onFlush: callback to execute the save
 * - isExecuting: boolean indicating if a save is in progress
 * 
 * Note: Completion handling (scheduling after save completes) should be done
 * by the caller, which has access to error state and other context.
 */
export function useSaveScheduler({
  debounceMs,
  maxWaitMs,
  onFlush,
  isExecuting,
}: UseSaveSchedulerOptions): UseSaveSchedulerReturn {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxWaitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (maxWaitTimerRef.current) {
      clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
  }, []);

  const executeDebouncedFlush = useCallback(() => {
    if (isExecuting) return;
    void onFlush();
  }, [isExecuting, onFlush]);

  const schedule = useCallback(() => {
    // Only schedule if no save is in-flight
    if (isExecuting) return;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Start max wait timer if not already running
    if (!maxWaitTimerRef.current) {
      maxWaitTimerRef.current = setTimeout(() => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        executeDebouncedFlush();
        maxWaitTimerRef.current = null;
      }, maxWaitMs);
    }

    // Skip debounce if it's >= max wait (max wait will handle it)
    if (debounceMs >= maxWaitMs) return;

    // Schedule debounce timer
    debounceTimerRef.current = setTimeout(() => {
      if (maxWaitTimerRef.current) {
        clearTimeout(maxWaitTimerRef.current);
        maxWaitTimerRef.current = null;
      }
      executeDebouncedFlush();
      debounceTimerRef.current = null;
    }, debounceMs);
  }, [debounceMs, maxWaitMs, isExecuting, executeDebouncedFlush]);

  const flush = useCallback(async () => {
    clearTimers();
    if (isExecuting) {
      return;
    }
    await onFlush();
  }, [clearTimers, isExecuting, onFlush]);

  // Cleanup timers on unmount
  useEffect(() => clearTimers, [clearTimers]);

  return {
    schedule,
    flush,
    clearTimers,
  };
}

