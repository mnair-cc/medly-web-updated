// NOTE: This module is server-only. Do not import in client components.
export { curriculumApiFetch } from "./client";
export type { CurriculumApiFetchOptions } from "./client";
export {
  CurriculumApiError,
  RetryExhaustedError,
  DeadlineExceededError,
  DeadlineBudgetExhaustedError,
  DEFAULT_RETRY_CONFIG,
  RETRYABLE_STATUS_CODES,
  RETRYABLE_NETWORK_ERROR_CODES,
} from "./types";
export type { RetryConfig } from "./types";
export {
  getRequestDeadline,
  getRemainingBudget,
  hasBudgetForRetry,
  PAGE_TIMEOUT_MS,
} from "./deadline";
