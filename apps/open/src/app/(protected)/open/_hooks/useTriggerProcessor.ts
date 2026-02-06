import { useCallback, useRef, useState } from "react";
import type { TriggerEvent } from "../_types/triggers";

interface TriggerProcessorConfig {
  /** Minimum time between trigger sends (default: 30000ms / 30s) */
  rateLimitMs: number;
  /** Time to wait for more uploads before sending batch (default: 2000ms / 2s) */
  debounceMs: number;
  /** Whether trigger processing is enabled */
  enabled: boolean;
  /** Callback when triggers are ready to send (after debounce + rate limit pass) */
  onTriggerReady: (triggers: TriggerEvent[]) => Promise<void>;
}

interface UseTriggerProcessorReturn {
  /** Process a new trigger event */
  processTrigger: (event: TriggerEvent) => void;
  /** Currently pending triggers (waiting for debounce) */
  pendingTriggers: TriggerEvent[];
  /** Timestamp of last successful trigger send */
  lastTriggerTime: number | null;
  /** Whether we're currently rate limited */
  isRateLimited: boolean;
  /** Reset rate limit (AI can signal next upload should bypass) */
  resetRateLimit: () => void;
}

/**
 * Hook for processing upload triggers with rate limiting and debouncing.
 *
 * - Rate limit: Prevents sending triggers more than once per rateLimitMs
 * - Debounce: Batches multiple uploads within debounceMs window
 *
 * Usage:
 * ```tsx
 * const { processTrigger } = useTriggerProcessor({
 *   rateLimitMs: 30000,
 *   debounceMs: 2000,
 *   enabled: true,
 *   onTriggerReady: async (triggers) => {
 *     await sendTriggerMessage(triggers);
 *   },
 * });
 *
 * // When upload completes:
 * processTrigger({ type: "fileUploaded", payload, timestamp: Date.now() });
 * ```
 */
export function useTriggerProcessor({
  rateLimitMs,
  debounceMs,
  enabled,
  onTriggerReady,
}: TriggerProcessorConfig): UseTriggerProcessorReturn {
  const [pendingTriggers, setPendingTriggers] = useState<TriggerEvent[]>([]);
  const [lastTriggerTime, setLastTriggerTime] = useState<number | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTriggersRef = useRef<TriggerEvent[]>([]);
  const onTriggerReadyRef = useRef(onTriggerReady);

  // Keep refs in sync with current values for use in timeout callback
  pendingTriggersRef.current = pendingTriggers;
  onTriggerReadyRef.current = onTriggerReady;

  const isRateLimited =
    lastTriggerTime !== null && Date.now() - lastTriggerTime < rateLimitMs;

  const resetRateLimit = useCallback(() => {
    setLastTriggerTime(null);
    console.log("[useTriggerProcessor] Rate limit reset by AI");
  }, []);

  const processTrigger = useCallback(
    (event: TriggerEvent) => {
      if (!enabled) return;

      // Add to pending triggers
      setPendingTriggers((prev) => {
        const updated = [...prev, event];
        pendingTriggersRef.current = updated;
        return updated;
      });

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(async () => {
        const triggersToSend = pendingTriggersRef.current;

        // Check rate limit at send time
        const canSend =
          lastTriggerTime === null ||
          Date.now() - lastTriggerTime >= rateLimitMs;

        if (canSend && triggersToSend.length > 0) {
          // Clear pending before sending
          setPendingTriggers([]);
          pendingTriggersRef.current = [];

          // Update last trigger time
          setLastTriggerTime(Date.now());

          // Send triggers (use ref to get latest callback)
          try {
            await onTriggerReadyRef.current(triggersToSend);
          } catch (error) {
            console.error("[useTriggerProcessor] Error sending triggers:", error);
          }
        } else if (!canSend) {
          // Rate limited - clear pending but don't send
          console.log(
            "[useTriggerProcessor] Rate limited, skipping trigger send"
          );
          setPendingTriggers([]);
          pendingTriggersRef.current = [];
        }
      }, debounceMs);
    },
    [enabled, rateLimitMs, debounceMs, lastTriggerTime]
  );

  return {
    processTrigger,
    pendingTriggers,
    lastTriggerTime,
    isRateLimited,
    resetRateLimit,
  };
}
