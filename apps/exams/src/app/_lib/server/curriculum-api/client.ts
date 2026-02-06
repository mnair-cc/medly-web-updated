import axios, { AxiosError, AxiosRequestConfig } from "axios";
import {
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  RETRYABLE_STATUS_CODES,
  RETRYABLE_NETWORK_ERROR_CODES,
  CurriculumApiError,
  RetryExhaustedError,
  DeadlineExceededError,
  DeadlineBudgetExhaustedError,
} from "./types";
import {
  getRequestDeadline,
  getRemainingBudget,
  hasBudgetForRetry,
  PAGE_TIMEOUT_MS,
} from "./deadline";

/**
 * Options for curriculumApiFetch
 */
export interface CurriculumApiFetchOptions {
  /** Bearer token for authorization */
  token: string;
  /** HTTP method (default: GET) */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request body for non-GET requests */
  body?: unknown;
  /** Custom retry configuration */
  retryConfig?: Partial<RetryConfig>;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // Add jitter: random value between 0 and 50% of the delay
  const jitter = Math.random() * exponentialDelay * 0.5;
  const totalDelay = exponentialDelay + jitter;
  // Cap at maxDelayMs
  return Math.min(totalDelay, maxDelayMs);
}

/**
 * Parse Retry-After header value
 * Supports both seconds (integer) and HTTP date formats
 */
function parseRetryAfterHeader(retryAfter: string | undefined): number | null {
  if (!retryAfter) return null;

  // Try parsing as seconds (integer)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    const delayMs = seconds * 1000; // Convert to milliseconds
    // Return null for non-positive values to trigger exponential backoff
    // This prevents tight retry loops when Retry-After: 0 is received
    return delayMs > 0 ? delayMs : null;
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now();
    return delayMs > 0 ? delayMs : null;
  }

  return null;
}

/**
 * Determine if an error is retryable for GET requests
 */
function isRetryableError(error: AxiosError, method: string): boolean {
  // Only retry GET requests
  if (method !== "GET") return false;

  // Retry on network errors or timeouts
  if (
    error.code &&
    (RETRYABLE_NETWORK_ERROR_CODES as readonly string[]).includes(error.code)
  ) {
    return true;
  }

  // Retry on specific status codes
  const status = error.response?.status;
  if (status && (RETRYABLE_STATUS_CODES as readonly number[]).includes(status)) {
    return true;
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch data from the Curriculum API with retry logic and deadline propagation
 *
 * @param path - API path (e.g., "/api/v2/users/me")
 * @param options - Fetch options including token and optional retry config
 * @returns Response data of type T
 * @throws CurriculumApiError on non-retryable errors
 * @throws RetryExhaustedError when all retry attempts fail
 * @throws DeadlineExceededError when request deadline has already passed before first attempt
 * @throws DeadlineBudgetExhaustedError when retry skipped due to insufficient deadline budget
 *
 * @example
 * ```ts
 * const session = await auth();
 * const user = await curriculumApiFetch<UserResponse>("/api/v2/users/me", {
 *   token: session.databaseApiAccessToken,
 * });
 * ```
 */
export async function curriculumApiFetch<T>(
  path: string,
  options: CurriculumApiFetchOptions
): Promise<T> {
  const { token, method = "GET", body, retryConfig: customConfig } = options;

  const config: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...customConfig,
  };

  const baseUrl = process.env.NEXT_PUBLIC_CURRICULUM_API_URL;
  if (!baseUrl) {
    throw new CurriculumApiError(
      "NEXT_PUBLIC_CURRICULUM_API_URL is not configured",
      undefined
    );
  }

  // Get deadline from request context (set by middleware)
  const deadline = await getRequestDeadline();

  // Check if deadline already passed before making any request
  if (deadline) {
    const remaining = getRemainingBudget(deadline);
    if (remaining === null) {
      console.warn(
        `[curriculum-api] ${path}: deadline already exceeded before request started`,
      );
      throw new DeadlineExceededError(deadline);
    }
  }

  const url = `${baseUrl}${path}`;
  const maxAttempts = config.maxRetries + 1;

  let lastError: AxiosError | undefined;
  let attemptsMade = 0;
  let budgetExhausted = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Before retry (attempt > 0), check if we have enough budget
    if (attempt > 0 && deadline) {
      if (!hasBudgetForRetry(deadline, PAGE_TIMEOUT_MS)) {
        budgetExhausted = true;
        break;
      }
    }

    attemptsMade++;

    // Calculate effective timeout: cap by remaining deadline budget
    const remainingBudget = deadline ? getRemainingBudget(deadline) : null;
    const effectiveTimeout =
      remainingBudget !== null
        ? Math.min(config.timeoutMs, remainingBudget)
        : config.timeoutMs;

    // Log if timeout is constrained by deadline
    if (remainingBudget !== null && remainingBudget < config.timeoutMs) {
      console.log(
        `[curriculum-api] ${path}: timeout capped to ${effectiveTimeout}ms (deadline budget: ${remainingBudget}ms, default: ${config.timeoutMs}ms)`,
      );
    }

    try {
      const requestConfig: AxiosRequestConfig = {
        url,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          // Propagate deadline to backend
          ...(deadline && { "x-deadline-epoch-ms": String(deadline) }),
        },
        timeout: effectiveTimeout,
        data: body,
      };

      const response = await axios(requestConfig);
      return response.data as T;
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        throw new CurriculumApiError(
          `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          undefined,
          error instanceof Error ? error : undefined
        );
      }

      // Check if timeout was caused by deadline budget constraint
      const isTimeout =
        error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
      const deadlineExceeded = deadline && getRemainingBudget(deadline) === null;

      if (isTimeout && deadlineExceeded) {
        console.warn(
          `[curriculum-api] ${path}: request timed out due to deadline exceeded (attempt ${attemptsMade})`,
        );
        throw new DeadlineExceededError(deadline);
      }

      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt === maxAttempts - 1;
      if (isLastAttempt || !isRetryableError(error, method)) {
        break;
      }

      // Calculate delay
      let delayMs: number;
      const status = error.response?.status;

      if (status === 429) {
        // For 429, prefer Retry-After header
        const retryAfter = error.response?.headers?.["retry-after"];
        const retryAfterMs = parseRetryAfterHeader(retryAfter);
        delayMs = retryAfterMs ?? calculateBackoffDelay(attempt, config.baseDelayMs, config.maxDelayMs);
      } else {
        // For other retryable errors, use exponential backoff
        delayMs = calculateBackoffDelay(attempt, config.baseDelayMs, config.maxDelayMs);
      }

      // Cap delay at maxDelayMs
      delayMs = Math.min(delayMs, config.maxDelayMs);

      // Also cap delay by remaining budget if deadline is set
      if (deadline) {
        const remainingBudget = getRemainingBudget(deadline);
        if (remainingBudget !== null) {
          delayMs = Math.min(delayMs, remainingBudget);
        } else {
          // Budget exhausted during delay calculation - fast-fail instead of sleeping
          budgetExhausted = true;
          break;
        }
      }

      await sleep(delayMs);
    }
  }

  // All attempts failed
  const status = lastError?.response?.status;
  const responseData = lastError?.response?.data;

  // If we skipped retry due to deadline budget, throw DeadlineBudgetExhaustedError
  if (budgetExhausted && lastError && deadline) {
    const remainingBudget = getRemainingBudget(deadline) ?? 0;
    console.warn(
      `[curriculum-api] ${path}: retry skipped, insufficient deadline budget (${remainingBudget}ms remaining, need >${PAGE_TIMEOUT_MS * 0.2}ms)`,
    );
    throw new DeadlineBudgetExhaustedError(
      `Request to ${path} failed after ${attemptsMade} attempt(s), retry skipped due to insufficient deadline budget (${remainingBudget}ms remaining)`,
      attemptsMade,
      remainingBudget,
      lastError,
    );
  }

  // If we exhausted retries on a retryable error, throw RetryExhaustedError
  if (lastError && isRetryableError(lastError, method)) {
    throw new RetryExhaustedError(
      `Request to ${path} failed after ${attemptsMade} attempts: ${lastError.message}`,
      attemptsMade,
      status,
      responseData,
      lastError
    );
  }

  // For non-retryable errors, throw CurriculumApiError
  throw new CurriculumApiError(
    `Request to ${path} failed: ${lastError?.message ?? "Unknown error"}`,
    status,
    responseData,
    lastError
  );
}
