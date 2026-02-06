import { storage } from "@/app/_lib/firebase/admin";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/open/storage/download?key=<storage_key>
 *
 * Downloads content from Firebase Storage using a storage key.
 * The storage key can be:
 * - A full gs:// path (gs://bucket/path/to/file)
 * - A relative path (path/to/file)
 *
 * Returns the file content as text (for markdown, json, etc).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const storageKey = searchParams.get("key");

    if (!storageKey) {
      return NextResponse.json(
        { error: "Storage key is required" },
        { status: 400 },
      );
    }

    // Extract the path from gs:// URL if present
    const filePath = storageKey.startsWith("gs://")
      ? storageKey.replace(/^gs:\/\/[^/]+\//, "")
      : storageKey;

    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Download file content
    const [content] = await file.download();
    const text = content.toString("utf-8");

    // Determine content type from file extension
    const isJson = filePath.endsWith(".json");
    const contentType = isJson ? "application/json" : "text/plain";

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error downloading file from storage:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 },
    );
  }
}
