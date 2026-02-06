import { auth } from "@/auth";
import { folderRepo } from "@/db/repositories";
import type { FolderData } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folders = await folderRepo.findAll(session.user.id);

    return NextResponse.json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
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

    if (!body.name || !body.collectionId) {
      return NextResponse.json(
        { error: "Folder name and collectionId are required" },
        { status: 400 }
      );
    }

    const folderData: FolderData = {
      name: body.name,
      position: body.position ?? 0,
      // Assignment folder fields
      ...(body.type && { type: body.type }),
      ...(body.deadline && { deadline: body.deadline }),
      ...(body.weighting !== undefined && { weighting: body.weighting }),
    };

    const folder = await folderRepo.create(
      session.user.id,
      body.collectionId,
      folderData,
      body.id // Optional client-provided ID
    );

    return NextResponse.json({
      success: true,
      ...folder,
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
