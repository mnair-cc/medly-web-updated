import { auth } from "@/auth";
import { storage } from "@/app/_lib/firebase/admin";
import { documentRepo } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;
    console.log("Thumbnail upload started for document:", documentId);

    const formData = await request.formData();
    const file = formData.get("thumbnail") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No thumbnail provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are supported" },
        { status: 400 }
      );
    }

    // Verify document exists and belongs to user
    const document = await documentRepo.findById(session.user.id, documentId);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Upload thumbnail to Firebase Storage
    const thumbnailFilename = `${documentId}.jpg`;
    const storagePath = `gs://${storage.bucket().name}/users/${session.user.id}/thumbnails/${thumbnailFilename}`;
    const storageRef = storage
      .bucket()
      .file(`users/${session.user.id}/thumbnails/${thumbnailFilename}`);

    console.log("Uploading thumbnail to:", storagePath);
    console.log("Thumbnail size:", file.size);

    // Upload file to Firebase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    await storageRef.save(buffer, {
      metadata: {
        contentType: "image/jpeg",
        metadata: {
          uploadedBy: session.user.id,
          documentId: documentId,
        },
      },
    });

    console.log("Thumbnail uploaded successfully, generating signed URL...");

    // Get signed URL (valid for 7 days)
    const [signedUrl] = await storageRef.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    const thumbnailUrl = signedUrl;

    // Update document with thumbnail URL and path
    await documentRepo.update(session.user.id, documentId, {
      thumbnailUrl,
      thumbnailPath: storagePath,
    });

    console.log("Document updated with thumbnail URL");

    return NextResponse.json({
      success: true,
      thumbnailUrl,
      thumbnailPath: storagePath,
    });
  } catch (error: unknown) {
    console.error("Error uploading thumbnail:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Error details:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
