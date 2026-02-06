import { auth } from "@/auth";
import { storage } from "@/app/_lib/firebase/admin";
import { documentRepo } from "@/db/repositories";
import type { DocumentData } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";
import {
  convertToPdf,
  needsConversion,
  isSupportedFormat,
  getSupportedFormatsMessage,
  ConversionError,
} from "@/app/(protected)/open/_utils/convertDocument";
/* eslint-disable @typescript-eslint/no-require-imports */
const pdfParse = require("pdf-parse");

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const placeholderId = formData.get("placeholderId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!placeholderId) {
      return NextResponse.json(
        { error: "Missing required field: placeholderId" },
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

    // Fetch existing placeholder document
    const rawDoc = await documentRepo.findRawById(session.user.id, placeholderId);

    if (!rawDoc) {
      return NextResponse.json(
        { error: "Placeholder document not found" },
        { status: 404 }
      );
    }

    const existingData = rawDoc.data as DocumentData;

    if (!existingData.isPlaceholder) {
      return NextResponse.json(
        { error: "Document is not a placeholder" },
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

    // Convert non-PDF files to PDF
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    let pdfBuffer: Buffer;
    if (needsConversion(file.name)) {
      try {
        pdfBuffer = await convertToPdf(originalBuffer, file.name);
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
    await storageRef.save(pdfBuffer, {
      metadata: {
        contentType: "application/pdf",
        metadata: {
          uploadedBy: session.user.id,
          originalFilename: file.name,
        },
      },
    });

    // Get signed URL (valid for 7 days)
    const [signedUrl] = await storageRef.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    const storageUrl = signedUrl;

    // Extract text from PDF for AI processing
    const allPagesText: { page: number; text: string }[] = [];
    try {
      let currentPage = 0;
      const options = {
        pagerender: function (pageData: any) {
          return pageData.getTextContent().then(function (textContent: any) {
            currentPage++;
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(" ");
            allPagesText.push({ page: currentPage, text: pageText });
            return pageText;
          });
        },
      };
      await pdfParse(pdfBuffer, options);
    } catch (extractError) {
      console.error("Error extracting text from PDF:", extractError);
      // Continue without text - not critical for upload
    }

    // Update existing placeholder document
    const updatedDoc = await documentRepo.update(session.user.id, placeholderId, {
      storageUrl,
      storagePath,
      isPlaceholder: false,
      allPagesText: allPagesText.length > 0 ? allPagesText : undefined,
    });

    if (!updatedDoc) {
      return NextResponse.json(
        { error: "Failed to update document" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...updatedDoc,
    });
  } catch (error: unknown) {
    console.error("Error uploading into placeholder:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
