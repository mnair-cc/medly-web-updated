/**
 * Open Platform Repositories
 * Data access layer for Open Platform PostgreSQL tables.
 */

// Re-export all types
export * from "./types";

// Export repositories as namespaces for clarity
import * as userRepo from "./open-platform-user";
import * as collectionRepo from "./open-platform-collection";
import * as folderRepo from "./open-platform-folder";
import * as documentRepo from "./open-platform-document";
import * as chatThreadRepo from "./open-platform-chat-thread";

export { userRepo, collectionRepo, folderRepo, documentRepo, chatThreadRepo };

// Also export the most commonly used function at the top level
export { getOrCreateUser } from "./open-platform-user";
