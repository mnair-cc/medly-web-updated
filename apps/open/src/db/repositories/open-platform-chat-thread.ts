/**
 * Open Platform Chat Thread Repository
 * CRUD operations for chat threads.
 */

import { db, openPlatformChatThread, type OpenPlatformChatThread } from "@/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { resolveUserId } from "./open-platform-user";
import type {
  ChatThreadData,
  ChatThreadResponse,
  ChatThreadSummaryResponse,
} from "./types";

/**
 * Convert database record to API response format.
 */
function toResponse(record: OpenPlatformChatThread): ChatThreadResponse {
  const data = record.data as ChatThreadData;
  return {
    id: record.id,
    collectionId: record.collectionId,
    documentIds: record.documentIds,
    title: data.title,
    messages: data.messages,
    createdAt: new Date(record.createdAt).getTime(),
  };
}

/**
 * Find all chat threads for a user.
 * Returns threads sorted by createdAt descending, limited to specified count.
 */
export async function findAll(
  authProviderId: string,
  limit: number = 10,
): Promise<ChatThreadResponse[]> {
  const userId = await resolveUserId(authProviderId);
  const threads = await db
    .select()
    .from(openPlatformChatThread)
    .where(eq(openPlatformChatThread.userId, userId))
    .orderBy(desc(openPlatformChatThread.createdAt))
    .limit(limit);

  return threads.map(toResponse);
}

/**
 * Find chat threads in a specific collection.
 * Returns threads sorted by createdAt descending, limited to specified count.
 */
export async function findByCollectionId(
  authProviderId: string,
  collectionId: string,
  limit: number = 10,
): Promise<ChatThreadResponse[]> {
  const userId = await resolveUserId(authProviderId);
  const threads = await db
    .select()
    .from(openPlatformChatThread)
    .where(
      and(
        eq(openPlatformChatThread.userId, userId),
        eq(openPlatformChatThread.collectionId, collectionId),
      ),
    )
    .orderBy(desc(openPlatformChatThread.createdAt))
    .limit(limit);

  return threads.map(toResponse);
}

/**
 * Find chat thread summaries (without messages) for listing.
 * Uses SQL to extract only the title from JSONB, avoiding fetching full message content.
 */
export async function findAllSummaries(
  authProviderId: string,
  collectionId?: string,
  limit: number = 10,
): Promise<ChatThreadSummaryResponse[]> {
  const userId = await resolveUserId(authProviderId);

  const threads = await db
    .select({
      id: openPlatformChatThread.id,
      collectionId: openPlatformChatThread.collectionId,
      title: sql<string | null>`${openPlatformChatThread.data}->>'title'`,
      createdAt: openPlatformChatThread.createdAt,
    })
    .from(openPlatformChatThread)
    .where(
      collectionId
        ? and(
            eq(openPlatformChatThread.userId, userId),
            eq(openPlatformChatThread.collectionId, collectionId),
          )
        : eq(openPlatformChatThread.userId, userId),
    )
    .orderBy(desc(openPlatformChatThread.createdAt))
    .limit(limit);

  return threads.map((t) => ({
    id: t.id,
    collectionId: t.collectionId,
    title: t.title ?? undefined,
    createdAt: new Date(t.createdAt).getTime(),
  }));
}

/**
 * Find a chat thread by ID, ensuring it belongs to the user.
 */
export async function findById(
  authProviderId: string,
  threadId: string,
): Promise<ChatThreadResponse | null> {
  const userId = await resolveUserId(authProviderId);
  const [thread] = await db
    .select()
    .from(openPlatformChatThread)
    .where(
      and(
        eq(openPlatformChatThread.id, threadId),
        eq(openPlatformChatThread.userId, userId),
      ),
    )
    .limit(1);

  return thread ? toResponse(thread) : null;
}

/**
 * Create a new chat thread.
 */
export async function create(
  authProviderId: string,
  collectionId: string,
  data: ChatThreadData,
  documentIds?: string[] | null,
  id?: string,
): Promise<ChatThreadResponse> {
  const userId = await resolveUserId(authProviderId);
  const now = new Date().toISOString();

  const [thread] = await db
    .insert(openPlatformChatThread)
    .values({
      id: id ?? uuidv7(),
      userId,
      collectionId,
      documentIds: documentIds ?? null,
      data,
      createdAt: now,
    })
    .returning();

  return toResponse(thread);
}

/**
 * Update a chat thread.
 * Uses a transaction with row-level locking (SELECT FOR UPDATE) to prevent
 * race conditions when concurrent requests modify the same thread.
 */
export async function update(
  authProviderId: string,
  threadId: string,
  updates: Partial<ChatThreadData> & {
    documentIds?: string[] | null;
  },
): Promise<ChatThreadResponse | null> {
  const userId = await resolveUserId(authProviderId);

  return await db.transaction(async (tx) => {
    // Lock the row for update to prevent concurrent modifications
    const [existing] = await tx
      .select()
      .from(openPlatformChatThread)
      .where(
        and(
          eq(openPlatformChatThread.id, threadId),
          eq(openPlatformChatThread.userId, userId),
        ),
      )
      .limit(1)
      .for("update");

    if (!existing) {
      return null;
    }

    const existingData = existing.data as ChatThreadData;
    const { documentIds, ...dataUpdates } = updates;

    const updatedData: ChatThreadData = {
      ...existingData,
      ...dataUpdates,
    };

    const updateValues: {
      data: ChatThreadData;
      documentIds?: string[] | null;
    } = {
      data: updatedData,
    };

    if (documentIds !== undefined) {
      updateValues.documentIds = documentIds;
    }

    const [updated] = await tx
      .update(openPlatformChatThread)
      .set(updateValues)
      .where(
        and(
          eq(openPlatformChatThread.id, threadId),
          eq(openPlatformChatThread.userId, userId),
        ),
      )
      .returning();

    return updated ? toResponse(updated) : null;
  });
}

/**
 * Delete a chat thread.
 */
export async function remove(
  authProviderId: string,
  threadId: string,
): Promise<boolean> {
  const userId = await resolveUserId(authProviderId);
  const result = await db
    .delete(openPlatformChatThread)
    .where(
      and(
        eq(openPlatformChatThread.id, threadId),
        eq(openPlatformChatThread.userId, userId),
      ),
    )
    .returning({ id: openPlatformChatThread.id });

  return result.length > 0;
}

/**
 * Append or update a message in a chat thread's messages array.
 * If a message with the same ID already exists, it will be updated (upsert behavior).
 * Returns true if successful, false if thread not found or not owned by user.
 */
export async function appendMessage(
  authProviderId: string,
  threadId: string,
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: number;
  },
): Promise<boolean> {
  const userId = await resolveUserId(authProviderId);

  return db.transaction(async (tx) => {
    // Fetch existing thread with row lock to prevent race conditions
    const [existing] = await tx
      .select()
      .from(openPlatformChatThread)
      .where(
        and(
          eq(openPlatformChatThread.id, threadId),
          eq(openPlatformChatThread.userId, userId),
        ),
      )
      .limit(1)
      .for("update");
    if (!existing) {
      return false;
    }
    const existingData = existing.data as ChatThreadData;
    const existingMessages = existingData.messages ?? [];

    // Upsert: update existing message if same ID, otherwise append
    const existingIndex = existingMessages.findIndex(
      (m) => m.id === message.id,
    );
    let updatedMessages: typeof existingMessages;

    if (existingIndex >= 0) {
      // Update existing message in place
      updatedMessages = [...existingMessages];
      updatedMessages[existingIndex] = message;
    } else {
      // Append new message
      updatedMessages = [...existingMessages, message];
    }

    const [updated] = await tx
      .update(openPlatformChatThread)
      .set({
        data: {
          ...existingData,
          messages: updatedMessages,
        },
      })
      .where(
        and(
          eq(openPlatformChatThread.id, threadId),
          eq(openPlatformChatThread.userId, userId),
        ),
      )
      .returning({ id: openPlatformChatThread.id });
    return !!updated;
  });
}
