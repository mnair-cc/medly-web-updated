/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 1, meaning 2 total attempts) */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelayMs: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs: number;
  /** Request timeout in milliseconds (default: 3000) */
  timeoutMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 1,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 3000,
};

/**
 * HTTP status codes that trigger retry for GET requests
 */
export const RETRYABLE_STATUS_CODES = [429, 502, 503, 504] as const;

/**
 * Network error codes that trigger retry for GET requests
 * These are Node.js/system-level errors that indicate transient network issues
 */
export const RETRYABLE_NETWORK_ERROR_CODES = [
  "ECONNABORTED", // Connection aborted (request timeout)
  "ETIMEDOUT", // Connection timed out
  "ECONNREFUSED", // Connection refused (server not listening)
  "ECONNRESET", // Connection reset by peer
  "ENOTFOUND", // DNS lookup failed
  "ENETUNREACH", // Network unreachable
  "EHOSTUNREACH", // Host unreachable
  "EPIPE", // Broken pipe
  "ERR_NETWORK", // Axios-specific network error
] as const;

/**
 * Error thrown when a Curriculum API request fails
 */
export class CurriculumApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | undefined,
    public readonly response?: unknown,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "CurriculumApiError";
  }
}

/**
 * Error thrown when all retry attempts have been exhausted
 */
export class RetryExhaustedError extends CurriculumApiError {
  constructor(
    message: string,
    public readonly attempts: number,
    statusCode: number | undefined,
    response?: unknown,
    cause?: Error
  ) {
    super(message, statusCode, response, cause);
    this.name = "RetryExhaustedError";
  }
}

/**
 * Error thrown when request deadline has been exceeded
 */
export class DeadlineExceededError extends Error {
  constructor(public readonly deadlineMs: number) {
    super("Request deadline exceeded");
    this.name = "DeadlineExceededError";
  }
}

/**
 * Error thrown when retry was skipped due to insufficient deadline budget
 */
export class DeadlineBudgetExhaustedError extends Error {
  constructor(
    message: string,
    public readonly attemptsMade: number,
    public readonly remainingBudgetMs: number,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "DeadlineBudgetExhaustedError";
  }
}
