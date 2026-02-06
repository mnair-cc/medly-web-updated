import { auth } from "@/auth";
import { chatThreadRepo } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";
import { GetChatThreadsQuerySchema } from "../schemas";

/**
 * GET /api/open/chat-threads/list
 * Returns lightweight thread summaries (id, title, createdAt) without messages.
 * Use this for thread dropdowns/lists where message content isn't needed.
 */
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

    const threads = await chatThreadRepo.findAllSummaries(
      session.user.id,
      collectionId,
      limit,
    );

    return NextResponse.json(threads);
  } catch (error) {
    console.error("Error fetching chat thread summaries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
