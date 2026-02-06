"use server";

import posthogClient from "./server";
import { UserProperties } from "./analytics";

/**
 * Get a feature flag value for a user (server-side).
 * Returns the variant string for multivariate flags, or null if not set.
 */
export async function getServerFeatureFlag(
  userId: string,
  flagKey: string
): Promise<string | null> {
  if (!posthogClient || !userId) return null;

  try {
    const result = await posthogClient.getFeatureFlag(flagKey, userId);
    if (result === null || result === undefined || result === false) {
      return null;
    }
    return String(result);
  } catch (error) {
    console.error(`Error getting feature flag ${flagKey}:`, error);
    return null;
  }
}

export async function serverTrackEvent(
  userId: string,
  event: string,
  properties: Record<string, any> = {}
) {
  if (!posthogClient || !userId) return;

  return posthogClient.capture({
    distinctId: userId,
    event,
    properties,
  });
}

export async function serverIdentifyUser(
  userId: string,
  properties: UserProperties
) {
  if (!posthogClient || !userId) return;

  return posthogClient.capture({
    distinctId: userId,
    event: "$identify",
    properties: {
      $set: properties,
    },
  });
}

export async function serverTrackPageview(
  userId: string,
  url: string,
  referrer?: string
) {
  if (!posthogClient || !userId) return;

  return posthogClient.capture({
    distinctId: userId,
    event: "$pageview",
    properties: {
      $current_url: url,
      $referrer: referrer || "",
    },
  });
}
