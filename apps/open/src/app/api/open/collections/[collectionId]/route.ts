import { auth } from "@/auth";
import { collectionRepo } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collectionId = (await params).collectionId;
    const updates = await request.json();

    const updateData: {
      name?: string;
      position?: number;
      primaryColor?: string;
      icon?: string;
    } = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.primaryColor !== undefined)
      updateData.primaryColor = updates.primaryColor;
    if (updates.icon !== undefined) updateData.icon = updates.icon;

    const updated = await collectionRepo.update(session.user.id, collectionId, updateData);

    if (!updated) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating collection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collectionId = (await params).collectionId;

    const deleted = await collectionRepo.remove(session.user.id, collectionId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
