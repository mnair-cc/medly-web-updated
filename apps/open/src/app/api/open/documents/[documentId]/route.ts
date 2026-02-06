import { auth } from "@/auth";
import { documentRepo } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = (await params).documentId;

    const document = await documentRepo.findById(session.user.id, documentId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = (await params).documentId;
    const updates = await request.json();

    const updateData: {
      name?: string;
      position?: number;
      collectionId?: string;
      folderId?: string | null;
      storageUrl?: string;
      lastViewedAt?: number;
    } = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.collectionId !== undefined)
      updateData.collectionId = updates.collectionId;
    if (updates.folderId !== undefined) updateData.folderId = updates.folderId;
    if (updates.storageUrl !== undefined)
      updateData.storageUrl = updates.storageUrl;
    if (updates.lastViewedAt !== undefined)
      updateData.lastViewedAt = updates.lastViewedAt;

    const updated = await documentRepo.update(
      session.user.id,
      documentId,
      updateData,
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = (await params).documentId;

    const deleted = await documentRepo.remove(session.user.id, documentId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
