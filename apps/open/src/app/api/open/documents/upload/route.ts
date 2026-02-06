import { auth } from "@/auth";
import { storage } from "@/app/_lib/firebase/admin";
import { documentRepo } from "@/db/repositories";
import type { DocumentData } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";
import { suggestTitleAndLabel } from "@/app/(protected)/open/_ai/suggestTitle";
/* eslint-disable @typescript-eslint/no-require-imports */
const pdfParse = require("pdf-parse");
import {
  convertToPdf,
  needsConversion,
  isSupportedFormat,
  getSupportedFormatsMessage,
  ConversionError,
  generateThumbnailFromPdf,
} from "@/app/(protected)/open/_utils/convertDocument";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Remove null characters that PostgreSQL jsonb cannot store
function sanitizeText(text: string): string {
  return text.replace(/\u0000/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Upload started for user:", session.user.id);
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const collectionId = formData.get("collectionId") as string;
    const folderId = (formData.get("folderId") as string) || null;
    const name = formData.get("name") as string;
    const position = parseInt(formData.get("position") as string) || 0;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!collectionId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: collectionId, name" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isSupportedFormat(file.name)) {
      return NextResponse.json(
        { error: getSupportedFormatsMessage() },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    const filename = `${originalName}-${timestamp}.pdf`;
    const storagePath = `gs://${storage.bucket().name}/users/${session.user.id}/${filename}`;
    const storageRef = storage
      .bucket()
      .file(`users/${session.user.id}/${filename}`);

    console.log("Uploading to:", storagePath);
    console.log("File size:", file.size);

    // Convert non-PDF files to PDF
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    let pdfBuffer: Buffer;
    if (needsConversion(file.name)) {
      console.log("Converting", file.name, "to PDF...");
      try {
        pdfBuffer = await convertToPdf(originalBuffer, file.name);
        console.log("Conversion successful");
      } catch (error) {
        console.error("Conversion failed:", error);
        const message =
          error instanceof ConversionError
            ? error.message
            : "Failed to convert document. Please try uploading a PDF instead.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    } else {
      pdfBuffer = originalBuffer;
    }

    // Upload file to Firebase Storage
    console.log("Buffer created, uploading...");

    await storageRef.save(pdfBuffer, {
      metadata: {
        contentType: "application/pdf",
        metadata: {
          uploadedBy: session.user.id,
          originalFilename: file.name,
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

    console.log("Signed URL generated");

    // Generate thumbnail from PDF
    let thumbnailUrl: string | undefined;
    let thumbnailPath: string | undefined;
    try {
      console.log("Generating thumbnail...");
      const thumbnailBuffer = await generateThumbnailFromPdf(pdfBuffer);

      // Upload thumbnail to Firebase Storage
      const thumbnailFilename = `${originalName}-${timestamp}.jpg`;
      thumbnailPath = `gs://${storage.bucket().name}/users/${session.user.id}/thumbnails/${thumbnailFilename}`;
      const thumbRef = storage.bucket().file(`users/${session.user.id}/thumbnails/${thumbnailFilename}`);

      await thumbRef.save(thumbnailBuffer, {
        metadata: {
          contentType: "image/jpeg",
          metadata: {
            uploadedBy: session.user.id,
            originalFilename: file.name,
          },
        },
      });

      const [thumbSignedUrl] = await thumbRef.getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      thumbnailUrl = thumbSignedUrl;
      console.log("Thumbnail generated and uploaded successfully");
    } catch (thumbnailError) {
      // Non-blocking - continue without thumbnail
      console.error("Thumbnail generation failed:", thumbnailError);
    }

    // Extract text from PDF for AI processing (per-page)
    let extractedText = "";
    let suggestedTitle = name; // Default to provided name
    let suggestedLabel: "slides" | "syllabus" | "assignment" | "notes" | "reading" = "slides";
    const allPagesText: { page: number; text: string }[] = [];
    try {
      let currentPage = 0;
      const options = {
        pagerender: function (pageData: any) {
          return pageData.getTextContent().then(function (textContent: any) {
            currentPage++;
            const pageText = sanitizeText(
              textContent.items.map((item: any) => item.str).join(" ")
            );
            allPagesText.push({ page: currentPage, text: pageText });
            return pageText;
          });
        },
      };

      const pdfData = await pdfParse(pdfBuffer, options);
      extractedText = sanitizeText(pdfData.text);

      if (extractedText && extractedText.length > 0) {
        // Get first ~5 pages worth of text for title and label suggestion (limit chars)
        const textForAI = extractedText.slice(0, 10000);
        if (textForAI.length > 100) {
          const aiSuggestion = await suggestTitleAndLabel(textForAI);
          suggestedTitle = aiSuggestion.title;
          suggestedLabel = aiSuggestion.label;
        }
      }
    } catch (aiError: unknown) {
      // Continue with defaults - AI is non-blocking
      console.error("Error extracting/suggesting title and label:", aiError);
    }

    // Create document data
    const documentData: DocumentData = {
      name: suggestedTitle,
      position,
      type: "document",
      label: suggestedLabel,
      storageUrl,
      storagePath,
      isPlaceholder: false,
      allPagesText: allPagesText.length > 0 ? allPagesText : undefined,
      thumbnailUrl,
      thumbnailPath,
    };

    const document = await documentRepo.create(
      session.user.id,
      collectionId,
      documentData,
      folderId
    );

    return NextResponse.json({
      success: true,
      ...document,
      extractedText: extractedText.slice(0, 2000),
    });
  } catch (error: unknown) {
    console.error("Error uploading document:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Error details:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
