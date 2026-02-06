/**
 * Integration tests for Open Platform Drizzle schema
 *
 * These tests run against a real PostgreSQL database.
 * Ensure DATABASE_URL is set to a test database before running.
 *
 * Run with: DATABASE_URL=postgresql://localhost/open_platform_dev npm test -- src/db
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  NewOpenPlatformCollection,
  NewOpenPlatformDocument,
  NewOpenPlatformUser,
} from "../types";
import {
  openPlatformCollection,
  openPlatformDocument,
  openPlatformUser,
} from "../migrations/schema";
import * as schema from "../migrations/schema";
import * as relations from "../migrations/relations";

// Skip tests if DATABASE_URL is not set
const DATABASE_URL = process.env.DATABASE_URL;
const shouldSkip = !DATABASE_URL;

describe.skipIf(shouldSkip)("Open Platform Schema", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  // Test data IDs for cleanup
  const testAuthProviderId = `test-auth-${Date.now()}`;
  let testUserId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    db = drizzle(pool, { schema: { ...schema, ...relations } });
  });

  afterAll(async () => {
    // Cleanup: Delete test user (cascades to all related data)
    if (testUserId) {
      await db
        .delete(openPlatformUser)
        .where(eq(openPlatformUser.id, testUserId));
    }
    await pool.end();
  });

  it("should connect to the database", async () => {
    const result = await pool.query("SELECT 1 as connected");
    expect(result.rows[0].connected).toBe(1);
  });

  it("should create an OpenPlatformUser", async () => {
    const newUser: NewOpenPlatformUser = {
      id: crypto.randomUUID(),
      authProviderId: testAuthProviderId,
      data: { name: "Test User", email: "test@example.com" },
      createdAt: new Date().toISOString(),
    };

    const [inserted] = await db
      .insert(openPlatformUser)
      .values(newUser)
      .returning();

    testUserId = inserted.id;

    expect(inserted.id).toBe(newUser.id);
    expect(inserted.authProviderId).toBe(testAuthProviderId);
    expect(inserted.data).toEqual({ name: "Test User", email: "test@example.com" });
  });

  it("should query user by authProviderId", async () => {
    const [user] = await db
      .select()
      .from(openPlatformUser)
      .where(eq(openPlatformUser.authProviderId, testAuthProviderId));

    expect(user).toBeDefined();
    expect(user.id).toBe(testUserId);
  });

  it("should create a collection for the user", async () => {
    const newCollection: NewOpenPlatformCollection = {
      id: crypto.randomUUID(),
      userId: testUserId,
      authProviderId: testAuthProviderId,
      data: { name: "My First Collection", color: "blue" },
      createdAt: new Date().toISOString(),
    };

    const [inserted] = await db
      .insert(openPlatformCollection)
      .values(newCollection)
      .returning();

    expect(inserted.userId).toBe(testUserId);
    expect(inserted.data).toEqual({ name: "My First Collection", color: "blue" });
  });

  it("should create a document in the collection", async () => {
    // Get the collection we created
    const [collection] = await db
      .select()
      .from(openPlatformCollection)
      .where(eq(openPlatformCollection.userId, testUserId));

    const newDocument: NewOpenPlatformDocument = {
      id: crypto.randomUUID(),
      userId: testUserId,
      collectionId: collection.id,
      data: { title: "Test Document", content: "Some content here" },
      createdAt: new Date().toISOString(),
    };

    const [inserted] = await db
      .insert(openPlatformDocument)
      .values(newDocument)
      .returning();

    expect(inserted.collectionId).toBe(collection.id);
    expect(inserted.folderId).toBeNull(); // No folder assigned
  });

  it("should update JSONB data field", async () => {
    const [user] = await db
      .select()
      .from(openPlatformUser)
      .where(eq(openPlatformUser.id, testUserId));

    const updatedData = {
      ...user.data,
      preferences: { theme: "dark", notifications: true },
    };

    const [updated] = await db
      .update(openPlatformUser)
      .set({
        data: updatedData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(openPlatformUser.id, testUserId))
      .returning();

    expect(updated.data).toEqual({
      name: "Test User",
      email: "test@example.com",
      preferences: { theme: "dark", notifications: true },
    });
    expect(updated.updatedAt).not.toBeNull();
  });

  it("should use relational queries to fetch user with collections", async () => {
    const userWithCollections = await db.query.openPlatformUser.findFirst({
      where: eq(openPlatformUser.id, testUserId),
      with: {
        collections: true,
      },
    });

    expect(userWithCollections).toBeDefined();
    expect(userWithCollections?.collections).toHaveLength(1);
    expect(userWithCollections?.collections[0].data).toHaveProperty("name");
  });

  it("should enforce unique constraint on authProviderId", async () => {
    const duplicateUser: NewOpenPlatformUser = {
      id: crypto.randomUUID(),
      authProviderId: testAuthProviderId, // Same as existing user
      data: {},
      createdAt: new Date().toISOString(),
    };

    // Drizzle wraps the error, so we check that the insert fails
    let didThrow = false;
    try {
      await db.insert(openPlatformUser).values(duplicateUser);
    } catch (error) {
      didThrow = true;
      // The underlying pg error contains the constraint violation info
      expect(error).toBeDefined();
    }
    expect(didThrow).toBe(true);
  });

  it("should cascade delete collections when user is deleted", async () => {
    // Create a temporary user for this test
    const tempUserId = crypto.randomUUID();
    const tempAuthId = `temp-auth-${Date.now()}`;

    await db.insert(openPlatformUser).values({
      id: tempUserId,
      authProviderId: tempAuthId,
      data: {},
      createdAt: new Date().toISOString(),
    });

    const tempCollectionId = crypto.randomUUID();
    await db.insert(openPlatformCollection).values({
      id: tempCollectionId,
      userId: tempUserId,
      authProviderId: tempAuthId,
      data: {},
      createdAt: new Date().toISOString(),
    });

    // Delete the user
    await db.delete(openPlatformUser).where(eq(openPlatformUser.id, tempUserId));

    // Verify collection was cascade deleted
    const [collection] = await db
      .select()
      .from(openPlatformCollection)
      .where(eq(openPlatformCollection.id, tempCollectionId));

    expect(collection).toBeUndefined();
  });
});
