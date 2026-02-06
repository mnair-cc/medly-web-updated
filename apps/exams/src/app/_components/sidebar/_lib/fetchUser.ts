import { curriculumApiFetch } from "@/app/_lib/server/curriculum-api";
import { UserDetails } from "@/app/types/types";
import { auth } from "@/auth";

interface ApiUserResponse {
  data: UserDetails;
}

/**
 * Retry configuration for user fetch.
 * This is a critical operation - if it fails, the user gets an error page.
 *
 * Configures the underlying curriculumApiFetch retry behavior:
 * - 4 total attempts (maxRetries: 3)
 * - Faster backoff (200ms base) since user fetch is blocking for page load
 * - Lower max delay (2000ms) to avoid very long waits
 */
const USER_FETCH_RETRY_CONFIG = {
  /** Maximum number of retries (3 retries = 4 total attempts) */
  maxRetries: 3,
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: 200,
  /** Maximum delay in milliseconds */
  maxDelayMs: 2000,
} as const;

/**
 * Fetch user data from the Curriculum API.
 * This is a critical operation - if it fails, the user gets an error page.
 *
 * Uses the underlying curriculumApiFetch retry logic with custom configuration
 * for more retries (4 total attempts) and faster backoff to improve resilience
 * without excessive delays.
 */
export async function fetchUser(): Promise<UserDetails | null> {
  try {
    const session = await auth();
    if (!session?.databaseApiAccessToken) return null;

    const res = await curriculumApiFetch<ApiUserResponse>("/api/v2/users/me", {
      token: session.databaseApiAccessToken,
      retryConfig: USER_FETCH_RETRY_CONFIG,
    });

    return res.data ?? null;
  } catch (error) {
    // Log the final error for debugging
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`[fetchUser] Failed to fetch user: ${errorMessage}`);
    return null;
  }
}
