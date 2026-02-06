/**
 * Open Platform Folder Repository
 * CRUD operations for folders.
 */

import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { db, openPlatformFolder, openPlatformDocument, type OpenPlatformFolder } from "@/db";
import { resolveUserId } from "./open-platform-user";
import type { FolderData, FolderResponse } from "./types";

/**
 * Convert database record to API response format.
 */
function toResponse(record: OpenPlatformFolder): FolderResponse {
  const data = record.data as FolderData;
  return {
    id: record.id,
    collectionId: record.collectionId,
    name: data.name,
    position: data.position,
    createdAt: new Date(record.createdAt).getTime(),
    updatedAt: record.updatedAt
      ? new Date(record.updatedAt).getTime()
      : new Date(record.createdAt).getTime(),
    // Assignment folder fields
    ...(data.type && { type: data.type }),
    ...(data.deadline && { deadline: data.deadline }),
    ...(data.weighting !== undefined && { weighting: data.weighting }),
    isExpanded: data.isExpanded ?? true,
  };
}

/**
 * Find all folders for a user.
 */
export async function findAll(
  authProviderId: string
): Promise<FolderResponse[]> {
  const userId = await resolveUserId(authProviderId);
  const folders = await db
    .select()
    .from(openPlatformFolder)
    .where(eq(openPlatformFolder.userId, userId));

  return folders.map(toResponse);
}

/**
 * Find all folders in a specific collection.
 */
export async function findByCollectionId(
  authProviderId: string,
  collectionId: string
): Promise<FolderResponse[]> {
  const userId = await resolveUserId(authProviderId);
  const folders = await db
    .select()
    .from(openPlatformFolder)
    .where(
      and(
        eq(openPlatformFolder.userId, userId),
        eq(openPlatformFolder.collectionId, collectionId)
      )
    );

  return folders.map(toResponse);
}

/**
 * Find a folder by ID, ensuring it belongs to the user.
 */
export async function findById(
  authProviderId: string,
  folderId: string
): Promise<FolderResponse | null> {
  const userId = await resolveUserId(authProviderId);
  const [folder] = await db
    .select()
    .from(openPlatformFolder)
    .where(
      and(
        eq(openPlatformFolder.id, folderId),
        eq(openPlatformFolder.userId, userId)
      )
    )
    .limit(1);

  return folder ? toResponse(folder) : null;
}

/**
 * Create a new folder.
 */
export async function create(
  authProviderId: string,
  collectionId: string,
  data: FolderData,
  id?: string
): Promise<FolderResponse> {
  const userId = await resolveUserId(authProviderId);
  const now = new Date().toISOString();

  const [folder] = await db
    .insert(openPlatformFolder)
    .values({
      id: id ?? uuidv7(),
      userId,
      collectionId,
      data,
      createdAt: now,
    })
    .returning();

  return toResponse(folder);
}

/**
 * Update a folder.
 */
export async function update(
  authProviderId: string,
  folderId: string,
  updates: Partial<FolderData>,
  collectionId?: string
): Promise<FolderResponse | null> {
  const userId = await resolveUserId(authProviderId);
  // First get existing folder to merge data
  const [existing] = await db
    .select()
    .from(openPlatformFolder)
    .where(
      and(
        eq(openPlatformFolder.id, folderId),
        eq(openPlatformFolder.userId, userId)
      )
    )
    .limit(1);

  if (!existing) {
    return null;
  }

  const existingData = existing.data as FolderData;
  const updatedData: FolderData = {
    ...existingData,
    ...updates,
  };

  const [updated] = await db
    .update(openPlatformFolder)
    .set({
      data: updatedData,
      ...(collectionId !== undefined && { collectionId }),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(openPlatformFolder.id, folderId),
        eq(openPlatformFolder.userId, userId)
      )
    )
    .returning();

  return updated ? toResponse(updated) : null;
}

/**
 * Delete a folder and all documents within it.
 * Returns the number of documents deleted along with success status.
 */
export async function remove(
  authProviderId: string,
  folderId: string
): Promise<{ success: boolean; deletedDocuments: number }> {
  const userId = await resolveUserId(authProviderId);
  // First delete all documents in the folder
  const deletedDocs = await db
    .delete(openPlatformDocument)
    .where(
      and(
        eq(openPlatformDocument.folderId, folderId),
        eq(openPlatformDocument.userId, userId)
      )
    )
    .returning({ id: openPlatformDocument.id });

  // Then delete the folder
  const result = await db
    .delete(openPlatformFolder)
    .where(
      and(
        eq(openPlatformFolder.id, folderId),
        eq(openPlatformFolder.userId, userId)
      )
    )
    .returning({ id: openPlatformFolder.id });

  return {
    success: result.length > 0,
    deletedDocuments: deletedDocs.length,
  };
}
