import { auth } from "@/auth";
import { chatThreadRepo, collectionRepo } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";
import { CreateChatThreadSchema, GetChatThreadsQuerySchema } from "./schemas";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const queryResult = GetChatThreadsQuerySchema.safeParse({
      collectionId: searchParams.get("collectionId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: queryResult.error.errors.map((e) => ({
            path: e.path,
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    const { collectionId, limit } = queryResult.data;

    const threads = collectionId
      ? await chatThreadRepo.findByCollectionId(
          session.user.id,
          collectionId,
          limit,
        )
      : await chatThreadRepo.findAll(session.user.id, limit);

    return NextResponse.json(threads);
  } catch (error) {
    console.error("Error fetching chat threads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
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

    const result = CreateChatThreadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.errors.map((e) => ({
            path: e.path,
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    const { collectionId, data, documentIds, id } = result.data;

    // Verify the collection belongs to the authenticated user
    const collection = await collectionRepo.findById(
      session.user.id,
      collectionId,
    );
    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 },
      );
    }

    const thread = await chatThreadRepo.create(
      session.user.id,
      collectionId,
      data,
      documentIds,
      id,
    );

    return NextResponse.json({
      success: true,
      ...thread,
    });
  } catch (error) {
    console.error("Error creating chat thread:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
