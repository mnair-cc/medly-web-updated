import { storage } from "@/app/_lib/firebase/admin";
import { auth } from "@/auth";
import { documentRepo } from "@/db/repositories";
import type { DocumentData } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  // TODO: TEMPORARY DEBUG - Remove after testing
  console.log(
    "[notes/route] PUT called - backend did NOT handle metadata update"
  );

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = (await params).documentId;
    const body = await request.json();
    const { content, newVersion, storageKey: providedStorageKey } = body;

    // Get existing document
    const rawDoc = await documentRepo.findRawById(session.user.id, documentId);
    if (!rawDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const docData = rawDoc.data as DocumentData;

    // If a storage key is provided
    if (providedStorageKey && typeof providedStorageKey === "string") {
      // If content is also provided, save it to the specified storage key
      if (content && typeof content === "string") {
        // Upload content to the provided storage key
        const bucket = storage.bucket();
        const file = bucket.file(providedStorageKey);

        await file.save(content, {
          contentType: "text/markdown",
          metadata: {
            contentType: "text/markdown",
          },
        });
      }

      // Update the document with the storage key
      await documentRepo.update(session.user.id, documentId, {
        notesStorageKey: providedStorageKey,
      });

      return NextResponse.json({
        success: true,
        notesStorageKey: providedStorageKey,
      });
    }

    // Otherwise, upload content to Storage
    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required and must be a string" },
        { status: 400 }
      );
    }

    let storageKey: string;

    if (newVersion || !docData.notesStorageKey) {
      // Generate new timestamped storage key
      const timestamp = Date.now();
      storageKey = `users/${session.user.id}/notes/${timestamp}_${documentId}.md`;
    } else {
      // Use existing storage key (overwrite)
      storageKey = docData.notesStorageKey;
    }

    // Upload markdown content to Firebase Storage
    const bucket = storage.bucket();
    const file = bucket.file(storageKey);

    await file.save(content, {
      contentType: "text/markdown",
      metadata: {
        contentType: "text/markdown",
      },
    });

    // Update document with new notesStorageKey
    await documentRepo.update(session.user.id, documentId, {
      notesStorageKey: storageKey,
    });

    return NextResponse.json({
      success: true,
      notesStorageKey: storageKey,
    });
  } catch (error) {
    console.error("Error updating notes content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
