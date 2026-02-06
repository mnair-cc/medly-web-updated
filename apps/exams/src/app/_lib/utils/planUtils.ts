import { fetchUser } from "@/app/_components/sidebar/_lib/fetchUser";

/**
 * Valid subscription statuses that indicate an active plan.
 * Shared between client-side hooks and server-side utilities.
 */
export const VALID_SUBSCRIPTION_STATUSES = [
  "active",
  "monthly",
  "block",
  "blockAnnual",
  "blockAnnual2027",
  "complete",
  "$rc_monthly",
];

/**
 * Check if a subscription object represents an active plan.
 * Works with both client and server-side code.
 */
export function isActivePlan(
  subscription:
    | {
        status?: string;
        end?: number;
      }
    | null
    | undefined
): boolean {
  if (!subscription) return false;

  const isNotExpired =
    !subscription.end || subscription.end * 1000 > Date.now();

  return (
    isNotExpired &&
    VALID_SUBSCRIPTION_STATUSES.includes(subscription.status || "")
  );
}

/**
 * Server-side function to check if the current user has an active plan.
 * Fetches user data and checks subscription status.
 */
export async function hasActivePlanAsync(): Promise<boolean> {
  const user = await fetchUser();
  return isActivePlan(user?.subscription);
}
