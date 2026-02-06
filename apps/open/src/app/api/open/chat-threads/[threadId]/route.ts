import { auth } from "@/auth";
import { chatThreadRepo } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";
import { UpdateChatThreadSchema } from "../schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const threadId = (await params).threadId;

    const thread = await chatThreadRepo.findById(session.user.id, threadId);

    if (!thread) {
      return NextResponse.json(
        { error: "Chat thread not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(thread);
  } catch (error) {
    console.error("Error fetching chat thread:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const threadId = (await params).threadId;
    const body = await request.json();

    const result = UpdateChatThreadSchema.safeParse(body);
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

    const updates: {
      title?: string;
      messages?: Array<{
        id: string;
        role: "user" | "assistant";
        content: string;
        createdAt: number;
      }>;
      documentIds?: string[] | null;
    } = {};

    // Spread data fields (title, messages) directly - the repository expects them at top level
    if (result.data.data !== undefined) {
      Object.assign(updates, result.data.data);
    }
    if (result.data.documentIds !== undefined) {
      updates.documentIds = result.data.documentIds;
    }

    const updated = await chatThreadRepo.update(
      session.user.id,
      threadId,
      updates,
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Chat thread not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    console.error("Error updating chat thread:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const threadId = (await params).threadId;

    const deleted = await chatThreadRepo.remove(session.user.id, threadId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Chat thread not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat thread:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
