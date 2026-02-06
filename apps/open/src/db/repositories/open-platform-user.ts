/**
 * Open Platform User Repository
 * Handles user creation and retrieval, mapping Firebase Auth UID to PostgreSQL UUID.
 */

import { db, openPlatformUser, type OpenPlatformUser } from "@/db";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { UserData, UserProfileResponse } from "./types";

/**
 * Get or create a user by their auth provider ID (Firebase Auth UID).
 * This is the primary entry point for user operations - call this first to get the user's UUID.
 */
export async function getOrCreateUser(
  authProviderId: string,
): Promise<OpenPlatformUser> {
  // Insert with conflict handling to avoid TOCTOU races.
  const [newUser] = await db
    .insert(openPlatformUser)
    .values({
      id: uuidv7(),
      authProviderId,
      data: {},
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing({
      target: openPlatformUser.authProviderId,
    })
    .returning();

  if (newUser) {
    return newUser;
  }

  // Another request likely inserted it; fetch the existing user.
  const [existingUser] = await db
    .select()
    .from(openPlatformUser)
    .where(eq(openPlatformUser.authProviderId, authProviderId))
    .limit(1);

  if (!existingUser) {
    throw new Error(
      `Failed to create or fetch user for authProviderId: ${authProviderId}`,
    );
  }

  return existingUser;
}

/**
 * Resolve authProviderId to userId. Creates user if needed.
 * Used internally by other repos.
 */
export async function resolveUserId(authProviderId: string): Promise<string> {
  const user = await getOrCreateUser(authProviderId);
  return user.id;
}

/**
 * Find a user by their auth provider ID without creating if not found.
 * Returns null if user doesn't exist.
 */
export async function findByAuthProviderId(
  authProviderId: string,
): Promise<OpenPlatformUser | null> {
  const [user] = await db
    .select()
    .from(openPlatformUser)
    .where(eq(openPlatformUser.authProviderId, authProviderId))
    .limit(1);

  return user ?? null;
}

/**
 * Find a user by their PostgreSQL UUID.
 */
export async function findById(
  userId: string,
): Promise<OpenPlatformUser | null> {
  const [user] = await db
    .select()
    .from(openPlatformUser)
    .where(eq(openPlatformUser.id, userId))
    .limit(1);

  return user ?? null;
}

/**
 * Update user profile data.
 */
export async function updateProfile(
  userId: string,
  data: Partial<UserData>,
): Promise<OpenPlatformUser> {
  const user = await findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const updatedData: UserData = {
    ...(user.data as UserData),
    ...data,
  };

  const [updatedUser] = await db
    .update(openPlatformUser)
    .set({
      data: updatedData,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(openPlatformUser.id, userId))
    .returning();

  return updatedUser;
}

/**
 * Get user profile formatted for API response.
 */
export async function getProfile(
  authProviderId: string,
): Promise<UserProfileResponse> {
  const user = await findByAuthProviderId(authProviderId);

  if (!user) {
    return { hasCompletedOpenOnboarding: false };
  }

  const data = user.data as UserData;
  return {
    hasCompletedOpenOnboarding: data.hasCompletedOpenOnboarding ?? false,
    userName: data.userName,
    avatar: data.avatar,
  };
}

/**
 * Delete a user and all related data (cascades via FK constraints).
 */
export async function deleteUser(userId: string): Promise<void> {
  await db.delete(openPlatformUser).where(eq(openPlatformUser.id, userId));
}
