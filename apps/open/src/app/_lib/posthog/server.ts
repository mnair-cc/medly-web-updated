import { PostHog } from "posthog-node";

// Add this to explicitly mark this file as server-only
export const dynamic = "force-dynamic";
// OR use the Next.js directive:
// "use server";

// Prevent multiple instances during hot reloading
let postHogClient: PostHog | undefined;

if (process.env.NODE_ENV === "production") {
  postHogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY || "",
    flushAt: 1, // For serverless environments like Vercel
    flushInterval: 0, // For serverless environments
  });
} else {
  // In development, check if we already have an instance to avoid creating new ones during hot reloading
  if (!(global as any).postHogServer) {
    (global as any).postHogServer = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_KEY || "",
      {
        host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY || "",
        flushAt: 1,
        flushInterval: 0,
      }
    );
  }
  postHogClient = (global as any).postHogServer;
}

// Fail-safe for environments where the API key isn't set
if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  console.warn("PostHog API key is not set. Tracking will be disabled.");
}

export default postHogClient;
