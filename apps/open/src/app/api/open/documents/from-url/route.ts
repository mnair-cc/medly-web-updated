import { auth } from "@/auth";
import { storage } from "@/app/_lib/firebase/admin";
import {
  documentRepo,
  collectionRepo,
} from "@/db/repositories";
import type { DocumentData } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log("Processing PDF from URL:", url);

    // Check for duplicate by originalUrl
    const existingDoc = await documentRepo.findByOriginalUrl(session.user.id, url);
    if (existingDoc) {
      console.log("Found existing document:", existingDoc.id);
      return NextResponse.json({
        documentId: existingDoc.id,
        duplicate: true,
      });
    }

    // Fetch PDF from URL
    console.log("Fetching PDF from URL...");
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Medly/1.0)",
        Accept: "application/pdf,*/*",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch PDF: ${response.status} ${response.statusText}`,
        },
        { status: 400 }
      );
    }

    // Validate content type
    const contentType = response.headers.get("content-type");
    if (
      contentType &&
      !contentType.includes("application/pdf") &&
      !contentType.includes("octet-stream")
    ) {
      return NextResponse.json(
        { error: "URL does not point to a PDF file" },
        { status: 400 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: "PDF file is empty" }, { status: 400 });
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    console.log("PDF fetched successfully, size:", buffer.length);

    // Extract filename from URL
    let filename = "Untitled Document";
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.length > 0) {
        filename = lastPart.replace(/\.[^/.]+$/, ""); // Remove extension
      }
    } catch {
      // Use default filename if URL parsing fails
    }

    // Get user's first collection
    const collections = await collectionRepo.findAll(session.user.id);

    if (collections.length === 0) {
      return NextResponse.json(
        { error: "No collections found. Please create a collection first." },
        { status: 400 }
      );
    }

    // Sort by position and get first
    const sortedCollections = [...collections].sort(
      (a, b) => a.position - b.position
    );
    const collectionId = sortedCollections[0].id;
    console.log("Using collection:", collectionId);

    // Get documents in target collection to determine position
    const existingDocs = await documentRepo.findByCollectionId(
      session.user.id,
      collectionId
    );
    const rootDocs = existingDocs.filter((d) => d.folderId === null);
    const position = rootDocs.length;

    // Upload to Firebase Storage
    const timestamp = Date.now();
    const storageFilename = `${filename}-${timestamp}.pdf`;
    const storagePath = `gs://${storage.bucket().name}/users/${session.user.id}/${storageFilename}`;
    const storageRef = storage
      .bucket()
      .file(`users/${session.user.id}/${storageFilename}`);

    console.log("Uploading to:", storagePath);
    await storageRef.save(buffer, {
      metadata: {
        contentType: "application/pdf",
        metadata: {
          uploadedBy: session.user.id,
          originalUrl: url,
        },
      },
    });

    console.log("File uploaded successfully, generating signed URL...");

    // Get signed URL (valid for 7 days)
    const [signedUrl] = await storageRef.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    const storageUrl = signedUrl;

    // Create document data
    const documentData: DocumentData = {
      name: "New Document", // Use "New Document" to trigger AI title suggestion after PDF loads
      position,
      type: "document",
      storageUrl,
      storagePath,
      originalUrl: url,
    };

    const document = await documentRepo.create(
      session.user.id,
      collectionId,
      documentData,
      null // No folder
    );

    console.log("Document created successfully:", document.id);

    return NextResponse.json({
      documentId: document.id,
      duplicate: false,
    });
  } catch (error: unknown) {
    console.error("Error processing PDF from URL:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Error details:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
