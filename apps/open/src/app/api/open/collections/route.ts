import { auth } from "@/auth";
import { collectionRepo } from "@/db/repositories";
import type { CollectionData } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collections = await collectionRepo.findAll(session.user.id);

    return NextResponse.json(collections);
  } catch (error) {
    console.error("Error fetching collections:", error);
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

    if (!body.name) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    const collectionData: CollectionData = {
      name: body.name,
      position: body.position ?? 0,
      primaryColor: body.primaryColor,
      icon: body.icon,
      initialFlowType: body.initialFlowType,
    };

    const collection = await collectionRepo.create(
      session.user.id,
      collectionData,
      body.id // Optional client-provided ID
    );

    return NextResponse.json({
      success: true,
      ...collection,
    });
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
