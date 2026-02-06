import { auth } from "@/auth";
import { storage } from "@/app/_lib/firebase/admin";
import { documentRepo } from "@/db/repositories";
import type { DocumentData } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await documentRepo.findAll(session.user.id);

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.name === undefined || body.name === null || !body.collectionId) {
      return NextResponse.json(
        { error: "Document name and collectionId are required" },
        { status: 400 }
      );
    }

    const documentData: DocumentData = {
      name: body.name,
      position: body.position ?? 0,
      type: body.type ?? "document",
      storageUrl: body.storageUrl,
      sourceReferences: body.sourceReferences,
      label: body.label,
    };

    // If this is a notes document, create initial Storage file
    if (body.type === "notes") {
      const timestamp = Date.now();
      const storageKey = `users/${session.user.id}/notes/${timestamp}_${crypto.randomUUID()}.md`;
      const initialContent = "";

      // Upload initial markdown file to Storage
      const bucket = storage.bucket();
      const file = bucket.file(storageKey);
      await file.save(initialContent, {
        contentType: "text/markdown",
        metadata: {
          contentType: "text/markdown",
        },
      });

      documentData.notesStorageKey = storageKey;
    }

    const document = await documentRepo.create(
      session.user.id,
      body.collectionId,
      documentData,
      body.folderId || null,
      body.id // Optional client-provided ID
    );

    return NextResponse.json({
      success: true,
      ...document,
    });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
