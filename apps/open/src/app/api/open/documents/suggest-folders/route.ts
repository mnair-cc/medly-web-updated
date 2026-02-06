import { auth } from "@/auth";
import { SuggestFoldersRequest } from "@/app/(protected)/open/_types/aiOrganization";
import { suggestFolders } from "@/app/(protected)/open/_ai/suggestFolders";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/open/documents/suggest-folders
 * Suggests folder placement for documents based on their content using AI
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documents } = (await request.json()) as SuggestFoldersRequest;

    if (!documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { error: "Missing or invalid documents array" },
        { status: 400 }
      );
    }

    // Use AI to suggest folder placements
    const suggestions = await suggestFolders(documents);

    return NextResponse.json({
      status: "success",
      suggestions,
    });
  } catch (error: unknown) {
    console.error("Error suggesting folders:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
