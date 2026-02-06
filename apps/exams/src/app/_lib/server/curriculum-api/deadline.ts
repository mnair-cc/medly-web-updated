import { headers } from "next/headers";

/** Page timeout budget in milliseconds */
export const PAGE_TIMEOUT_MS = 5000;

/** Safety buffer to prevent tight deadline misses */
const SAFETY_BUFFER_MS = 50;

/** Minimum budget ratio required for retry */
const MIN_RETRY_BUDGET_RATIO = 0.2;

/**
 * Check if running in development mode.
 * In development, deadline enforcement is skipped to avoid issues with
 * Fast Refresh full reloads where the deadline header becomes stale.
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Read the request deadline from Next.js request headers.
 * Returns undefined if no deadline header is set.
 *
 * NOTE: This function uses next/headers and can only be called
 * from Server Components, Server Actions, or Route Handlers.
 *
 * In development mode, always returns undefined to skip deadline enforcement.
 * This prevents issues with Fast Refresh where the deadline header becomes stale.
 */
export async function getRequestDeadline(): Promise<number | undefined> {
  // Skip deadline enforcement in development to avoid Fast Refresh issues
  if (isDevelopment()) {
    return undefined;
  }

  const headersList = await headers();
  const deadlineStr = headersList.get("x-request-deadline-ms");
  if (!deadlineStr) return undefined;

  const deadline = parseInt(deadlineStr, 10);
  return isNaN(deadline) ? undefined : deadline;
}

/**
 * Calculate remaining time budget from deadline.
 * Returns null if deadline already passed (accounting for safety buffer).
 */
export function getRemainingBudget(deadlineMs: number): number | null {
  const remaining = deadlineMs - Date.now();
  return remaining > SAFETY_BUFFER_MS ? remaining - SAFETY_BUFFER_MS : null;
}

/**
 * Check if we have enough budget remaining to attempt a retry.
 * Per standards: only retry if >20% of original budget remains.
 *
 * @param deadlineMs - Absolute deadline timestamp
 * @param originalBudgetMs - Original timeout budget (e.g., 5000ms)
 */
export function hasBudgetForRetry(
  deadlineMs: number,
  originalBudgetMs: number,
): boolean {
  const remaining = deadlineMs - Date.now();
  return remaining > originalBudgetMs * MIN_RETRY_BUDGET_RATIO;
}
