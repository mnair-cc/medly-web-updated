import { auth } from "@/auth";
import { folderRepo } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folderId = (await params).folderId;
    const updates = await request.json();

    const updateData: {
      collectionId?: string;
      name?: string;
      position?: number;
      type?: "assignment";
      deadline?: string;
      weighting?: number;
      isExpanded?: boolean;
    } = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.collectionId !== undefined)
      updateData.collectionId = updates.collectionId;
    // Assignment folder fields
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.deadline !== undefined) updateData.deadline = updates.deadline;
    if (updates.weighting !== undefined)
      updateData.weighting = updates.weighting;
    // UI state
    if (updates.isExpanded !== undefined)
      updateData.isExpanded = updates.isExpanded;

    const { collectionId, ...dataUpdates } = updateData;
    const updated = await folderRepo.update(
      session.user.id,
      folderId,
      dataUpdates,
      collectionId,
    );

    if (!updated) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating folder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folderId = (await params).folderId;

    const result = await folderRepo.remove(session.user.id, folderId);

    if (!result.success) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    console.log(
      `Folder ${folderId} and ${result.deletedDocuments} documents deleted successfully`,
    );

    return NextResponse.json({
      success: true,
      deletedDocuments: result.deletedDocuments,
    });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
