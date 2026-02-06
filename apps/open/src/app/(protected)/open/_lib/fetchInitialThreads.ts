import { chatThreadRepo, collectionRepo } from "@/db/repositories";

/**
 * Fetch or create empty chat threads for each collection.
 * If the latest thread for a collection has messages, creates a new empty thread.
 * Returns a map of collectionId -> threadId.
 */
export async function fetchInitialThreads(
  authProviderId: string,
): Promise<Record<string, string>> {
  const collections = await collectionRepo.findAll(authProviderId);
  const threadIdsByCollection: Record<string, string> = {};

  for (const collection of collections) {
    const threads = await chatThreadRepo.findByCollectionId(
      authProviderId,
      collection.id,
      1, // Get only the latest thread
    );

    const latestThread = threads[0];
    const hasMessages =
      latestThread?.messages && latestThread.messages.length > 0;

    if (!latestThread || hasMessages) {
      // Create a new empty thread (no title - title is set on first message)
      const newThread = await chatThreadRepo.create(
        authProviderId,
        collection.id,
        {},
      );
      threadIdsByCollection[collection.id] = newThread.id;
    } else {
      // Reuse existing empty thread
      threadIdsByCollection[collection.id] = latestThread.id;
    }
  }

  return threadIdsByCollection;
}
