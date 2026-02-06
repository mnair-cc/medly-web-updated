/**
 * Open Platform Document Repository
 * CRUD operations for documents.
 */

import { db, openPlatformDocument, type OpenPlatformDocument } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { resolveUserId } from "./open-platform-user";
import type { DocumentData, DocumentResponse } from "./types";

/**
 * Convert database record to API response format.
 */
function toResponse(record: OpenPlatformDocument): DocumentResponse {
  const data = record.data as DocumentData;
  return {
    id: record.id,
    collectionId: record.collectionId,
    folderId: record.folderId ?? null,
    name: data.name,
    storageUrl: data.storageUrl,
    storagePath: data.storagePath,
    thumbnailUrl: data.thumbnailUrl,
    thumbnailPath: data.thumbnailPath,
    originalUrl: data.originalUrl,
    position: data.position,
    createdAt: new Date(record.createdAt).getTime(),
    updatedAt: record.updatedAt
      ? new Date(record.updatedAt).getTime()
      : new Date(record.createdAt).getTime(),
    type: data.type ?? "document",
    sourceReferences: data.sourceReferences,
    label: data.label,
    isPlaceholder: data.isPlaceholder,
    lastViewedAt: data.lastViewedAt,
    // Session data
    notes: data.notes,
    canvases: data.canvases,
    highlights: data.highlights,
    questions: data.questions,
    questionGroups: data.questionGroups,
    pageNotes: data.pageNotes,
    notesStorageKey: data.notesStorageKey,
    pageTitle: data.pageTitle,
    documentTranscription: data.documentTranscription,
    allPagesText: data.allPagesText,
    flashcardDeck: data.flashcardDeck,
  };
}

/**
 * Find all documents for a user.
 */
export async function findAll(
  authProviderId: string,
): Promise<DocumentResponse[]> {
  const userId = await resolveUserId(authProviderId);
  const documents = await db
    .select()
    .from(openPlatformDocument)
    .where(eq(openPlatformDocument.userId, userId));

  return documents.map(toResponse);
}

/**
 * Find all documents in a specific collection.
 */
export async function findByCollectionId(
  authProviderId: string,
  collectionId: string,
): Promise<DocumentResponse[]> {
  const userId = await resolveUserId(authProviderId);
  const documents = await db
    .select()
    .from(openPlatformDocument)
    .where(
      and(
        eq(openPlatformDocument.userId, userId),
        eq(openPlatformDocument.collectionId, collectionId),
      ),
    );

  return documents.map(toResponse);
}

/**
 * Find all documents in a specific folder.
 */
export async function findByFolderId(
  authProviderId: string,
  folderId: string,
): Promise<DocumentResponse[]> {
  const userId = await resolveUserId(authProviderId);
  const documents = await db
    .select()
    .from(openPlatformDocument)
    .where(
      and(
        eq(openPlatformDocument.userId, userId),
        eq(openPlatformDocument.folderId, folderId),
      ),
    );

  return documents.map(toResponse);
}

/**
 * Find a document by ID, ensuring it belongs to the user.
 */
export async function findById(
  authProviderId: string,
  documentId: string,
): Promise<DocumentResponse | null> {
  const userId = await resolveUserId(authProviderId);
  const [document] = await db
    .select()
    .from(openPlatformDocument)
    .where(
      and(
        eq(openPlatformDocument.id, documentId),
        eq(openPlatformDocument.userId, userId),
      ),
    )
    .limit(1);

  return document ? toResponse(document) : null;
}

/**
 * Get raw document record (for internal use when you need direct DB access).
 */
export async function findRawById(
  authProviderId: string,
  documentId: string,
): Promise<OpenPlatformDocument | null> {
  const userId = await resolveUserId(authProviderId);
  const [document] = await db
    .select()
    .from(openPlatformDocument)
    .where(
      and(
        eq(openPlatformDocument.id, documentId),
        eq(openPlatformDocument.userId, userId),
      ),
    )
    .limit(1);

  return document ?? null;
}

/**
 * Create a new document.
 */
export async function create(
  authProviderId: string,
  collectionId: string,
  data: DocumentData,
  folderId?: string | null,
  id?: string,
): Promise<DocumentResponse> {
  const userId = await resolveUserId(authProviderId);
  const now = new Date().toISOString();

  const [document] = await db
    .insert(openPlatformDocument)
    .values({
      id: id ?? uuidv7(),
      userId,
      collectionId,
      folderId: folderId || null,
      data,
      createdAt: now,
    })
    .returning();

  return toResponse(document);
}

/**
 * Update a document's metadata.
 */
export async function update(
  authProviderId: string,
  documentId: string,
  updates: Partial<DocumentData> & {
    collectionId?: string;
    folderId?: string | null;
  },
): Promise<DocumentResponse | null> {
  const userId = await resolveUserId(authProviderId);
  // First get existing document to merge data
  const [existing] = await db
    .select()
    .from(openPlatformDocument)
    .where(
      and(
        eq(openPlatformDocument.id, documentId),
        eq(openPlatformDocument.userId, userId),
      ),
    )
    .limit(1);

  if (!existing) {
    return null;
  }

  const existingData = existing.data as DocumentData;
  const { collectionId, folderId, ...dataUpdates } = updates;

  const updatedData: DocumentData = {
    ...existingData,
    ...dataUpdates,
  };

  const updateValues: {
    data: DocumentData;
    updatedAt: string;
    collectionId?: string;
    folderId?: string | null;
  } = {
    data: updatedData,
    updatedAt: new Date().toISOString(),
  };

  if (collectionId !== undefined) {
    updateValues.collectionId = collectionId;
  }
  if (folderId !== undefined) {
    updateValues.folderId = folderId;
  }

  const [updated] = await db
    .update(openPlatformDocument)
    .set(updateValues)
    .where(
      and(
        eq(openPlatformDocument.id, documentId),
        eq(openPlatformDocument.userId, userId),
      ),
    )
    .returning();

  return updated ? toResponse(updated) : null;
}

/**
 * Update document session data (notes, canvases, highlights, etc.).
 * This is a partial update that only touches session-related fields.
 */
export async function updateSession(
  authProviderId: string,
  documentId: string,
  sessionData: {
    notes?: { [page: number]: string };
    canvases?: { [page: number]: unknown };
    highlights?: { [page: number]: unknown[] };
    documentTranscription?: unknown;
    allPagesText?: Array<{ page: number; text: string }>;
    questions?: unknown[];
    questionGroups?: unknown[];
    flashcardDeck?: unknown;
  },
): Promise<boolean> {
  console.log("[documentRepo.updateSession] Starting:", {
    authProviderId,
    documentId,
    fieldsProvided: Object.keys(sessionData).filter(
      (k) => sessionData[k as keyof typeof sessionData] !== undefined,
    ),
  });

  const userId = await resolveUserId(authProviderId);
  console.log("[documentRepo.updateSession] Resolved userId:", userId);

  const [existing] = await db
    .select()
    .from(openPlatformDocument)
    .where(
      and(
        eq(openPlatformDocument.id, documentId),
        eq(openPlatformDocument.userId, userId),
      ),
    )
    .limit(1);

  if (!existing) {
    console.log("[documentRepo.updateSession] Document not found:", {
      documentId,
      userId,
    });
    return false;
  }

  console.log("[documentRepo.updateSession] Found document:", {
    documentId: existing.id,
    existingDataKeys: Object.keys(existing.data as object),
  });

  const existingData = existing.data as DocumentData;
  const updatedData: DocumentData = {
    ...existingData,
  };

  // Only update fields that are provided
  if (sessionData.notes !== undefined) updatedData.notes = sessionData.notes;
  if (sessionData.canvases !== undefined)
    updatedData.canvases = sessionData.canvases;
  if (sessionData.highlights !== undefined)
    updatedData.highlights = sessionData.highlights;
  if (sessionData.documentTranscription !== undefined)
    updatedData.documentTranscription =
      sessionData.documentTranscription as DocumentData["documentTranscription"];
  if (sessionData.allPagesText !== undefined)
    updatedData.allPagesText = sessionData.allPagesText;
  if (sessionData.questions !== undefined)
    updatedData.questions = sessionData.questions as DocumentData["questions"];
  if (sessionData.questionGroups !== undefined)
    updatedData.questionGroups =
      sessionData.questionGroups as DocumentData["questionGroups"];
  if (sessionData.flashcardDeck !== undefined)
    updatedData.flashcardDeck =
      sessionData.flashcardDeck as DocumentData["flashcardDeck"];

  console.log("[documentRepo.updateSession] Updating with fields:", {
    updatedDataKeys: Object.keys(updatedData),
    hasFlashcardDeck: !!updatedData.flashcardDeck,
  });

  const result = await db
    .update(openPlatformDocument)
    .set({
      data: updatedData,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(openPlatformDocument.id, documentId),
        eq(openPlatformDocument.userId, userId),
      ),
    )
    .returning({ id: openPlatformDocument.id });

  console.log("[documentRepo.updateSession] Update result:", {
    rowsAffected: result.length,
    updatedIds: result.map((r) => r.id),
  });

  return true;
}

/**
 * Delete a document.
 */
export async function remove(
  authProviderId: string,
  documentId: string,
): Promise<boolean> {
  const userId = await resolveUserId(authProviderId);
  const result = await db
    .delete(openPlatformDocument)
    .where(
      and(
        eq(openPlatformDocument.id, documentId),
        eq(openPlatformDocument.userId, userId),
      ),
    )
    .returning({ id: openPlatformDocument.id });

  return result.length > 0;
}

/**
 * Find a document by originalUrl (for de-duplication when importing from URL).
 */
export async function findByOriginalUrl(
  authProviderId: string,
  originalUrl: string,
): Promise<DocumentResponse | null> {
  const userId = await resolveUserId(authProviderId);
  // Filter in SQL to avoid loading all documents into memory.
  // If this becomes slow, add a Postgres index on (user_id, (data->>'originalUrl'))
  // or promote originalUrl to a first-class column.
  const [document] = await db
    .select()
    .from(openPlatformDocument)
    .where(
      and(
        eq(openPlatformDocument.userId, userId),
        eq(sql`(${openPlatformDocument.data} ->> 'originalUrl')`, originalUrl),
      ),
    )
    .limit(1);

  return document ? toResponse(document) : null;
}
