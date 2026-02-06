/**
 * Open Platform Collection Repository
 * CRUD operations for collections.
 */

import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { db, openPlatformCollection, type OpenPlatformCollection } from "@/db";
import { resolveUserId } from "./open-platform-user";
import type { CollectionData, CollectionResponse } from "./types";

/**
 * Convert database record to API response format.
 */
function toResponse(record: OpenPlatformCollection): CollectionResponse {
  const data = record.data as CollectionData;
  return {
    id: record.id,
    name: data.name,
    position: data.position,
    primaryColor: data.primaryColor,
    icon: data.icon,
    createdAt: new Date(record.createdAt).getTime(),
    updatedAt: record.updatedAt ? new Date(record.updatedAt).getTime() : new Date(record.createdAt).getTime(),
    syllabus: data.syllabus,
    initialFlowType: data.initialFlowType,
    setupComplete: data.setupComplete,
  };
}

/**
 * Find all collections for a user.
 */
export async function findAll(
  authProviderId: string
): Promise<CollectionResponse[]> {
  const userId = await resolveUserId(authProviderId);
  const collections = await db
    .select()
    .from(openPlatformCollection)
    .where(eq(openPlatformCollection.userId, userId));

  return collections.map(toResponse);
}

/**
 * Find a collection by ID, ensuring it belongs to the user.
 */
export async function findById(
  authProviderId: string,
  collectionId: string
): Promise<CollectionResponse | null> {
  const userId = await resolveUserId(authProviderId);
  const [collection] = await db
    .select()
    .from(openPlatformCollection)
    .where(
      and(
        eq(openPlatformCollection.id, collectionId),
        eq(openPlatformCollection.userId, userId)
      )
    )
    .limit(1);

  return collection ? toResponse(collection) : null;
}

/**
 * Create a new collection.
 */
export async function create(
  authProviderId: string,
  data: CollectionData,
  id?: string
): Promise<CollectionResponse> {
  const userId = await resolveUserId(authProviderId);
  const now = new Date().toISOString();

  const [collection] = await db
    .insert(openPlatformCollection)
    .values({
      id: id ?? uuidv7(),
      userId,
      authProviderId,
      data,
      createdAt: now,
    })
    .returning();

  return toResponse(collection);
}

/**
 * Update a collection.
 */
export async function update(
  authProviderId: string,
  collectionId: string,
  updates: Partial<CollectionData>
): Promise<CollectionResponse | null> {
  const userId = await resolveUserId(authProviderId);
  // First get existing collection to merge data
  const [existing] = await db
    .select()
    .from(openPlatformCollection)
    .where(
      and(
        eq(openPlatformCollection.id, collectionId),
        eq(openPlatformCollection.userId, userId)
      )
    )
    .limit(1);

  if (!existing) {
    return null;
  }

  const existingData = existing.data as CollectionData;
  const updatedData: CollectionData = {
    ...existingData,
    ...updates,
  };

  const [updated] = await db
    .update(openPlatformCollection)
    .set({
      data: updatedData,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(openPlatformCollection.id, collectionId),
        eq(openPlatformCollection.userId, userId)
      )
    )
    .returning();

  return updated ? toResponse(updated) : null;
}

/**
 * Delete a collection (cascades to folders and documents via FK).
 */
export async function remove(
  authProviderId: string,
  collectionId: string
): Promise<boolean> {
  const userId = await resolveUserId(authProviderId);
  const result = await db
    .delete(openPlatformCollection)
    .where(
      and(
        eq(openPlatformCollection.id, collectionId),
        eq(openPlatformCollection.userId, userId)
      )
    )
    .returning({ id: openPlatformCollection.id });

  return result.length > 0;
}
