// No direct imports of posthog-node in this file
// This file can be imported in client components

export interface UserProperties {
  email?: string;
  name?: string;
  plan?: string;
  [key: string]: any;
}

// Client-side wrapper functions that call the server actions
export async function trackUserEvent(
  userId: string,
  event: string,
  properties: Record<string, any> = {}
) {
  // Import the server action dynamically to avoid including it in client bundle
  const { serverTrackEvent } = await import("./actions");
  return serverTrackEvent(userId, event, properties);
}

export async function identifyUser(userId: string, properties: UserProperties) {
  // Import the server action dynamically to avoid including it in client bundle
  const { serverIdentifyUser } = await import("./actions");
  return serverIdentifyUser(userId, properties);
}

export async function trackPageview(
  userId: string,
  url: string,
  referrer?: string
) {
  // Import the server action dynamically to avoid including it in client bundle
  const { serverTrackPageview } = await import("./actions");
  return serverTrackPageview(userId, url, referrer);
}
