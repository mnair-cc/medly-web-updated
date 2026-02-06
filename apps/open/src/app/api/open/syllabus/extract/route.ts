import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import type { ExtractSyllabusResponse } from "@/app/(protected)/open/onboarding/_types/syllabus";
import { extractSyllabus } from "@/app/(protected)/open/_ai/extractSyllabus";
import { extractSyllabusFromImages } from "@/app/(protected)/open/_ai/extractSyllabusFromImages";
import { extractPdfText } from "@/app/(protected)/open/_ai/utils/extractPdfText";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB per image
const MAX_IMAGES = 10;
const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg"];

export async function POST(
  request: NextRequest
): Promise<NextResponse<ExtractSyllabusResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { status: "error", error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const inputType = formData.get("inputType") as string;
    const fileCount = parseInt(formData.get("fileCount") as string) || 1;

    if (inputType === "combined") {
      // Handle combined inputs: PDFs + images + text
      const pdfCount = parseInt(formData.get("pdfCount") as string) || 0;
      const imageCount = parseInt(formData.get("imageCount") as string) || 0;
      const pastedText = formData.get("text") as string || "";

      const textParts: string[] = [];

      // Extract text from all PDFs
      for (let i = 0; i < pdfCount; i++) {
        const file = formData.get(`pdf${i}`) as File;
        if (file) {
          console.log(`[syllabus/extract] Processing PDF ${i + 1}:`, file.name);
          const buffer = Buffer.from(await file.arrayBuffer());
          const pdfText = await extractPdfText(buffer);
          if (pdfText && pdfText.trim()) {
            textParts.push(pdfText);
          }
        }
      }

      // Add pasted text
      if (pastedText.trim()) {
        textParts.push(pastedText.trim());
      }

      // Collect all images
      const imageBuffers: { data: Buffer; mimeType: "image/png" | "image/jpeg" }[] = [];
      for (let i = 0; i < imageCount; i++) {
        const file = formData.get(`image${i}`) as File;
        if (file && SUPPORTED_IMAGE_TYPES.includes(file.type)) {
          const buffer = Buffer.from(await file.arrayBuffer());
          imageBuffers.push({
            data: buffer,
            mimeType: file.type as "image/png" | "image/jpeg",
          });
        }
      }

      // If we have images, use vision with combined text as additional context
      if (imageBuffers.length > 0) {
        console.log(`[syllabus/extract] Processing ${imageBuffers.length} images with vision`);
        const additionalText = textParts.join("\n\n");
        if (additionalText) {
          console.log(`[syllabus/extract] Also including ${additionalText.length} chars of text context`);
        }
        const syllabus = await extractSyllabusFromImages(imageBuffers, additionalText || undefined);
        console.log("[syllabus/extract] Success - extracted from images + text");
        return NextResponse.json({
          status: "success",
          data: syllabus,
        });
      }

      // No images - just use text extraction
      const combinedText = textParts.join("\n\n");

      if (!combinedText || combinedText.trim().length < 50) {
        return NextResponse.json(
          { status: "error", error: "Not enough content to extract syllabus from" },
          { status: 400 }
        );
      }

      console.log("[syllabus/extract] Processing combined text, length:", combinedText.length);
      const syllabus = await extractSyllabus(combinedText);

      console.log("[syllabus/extract] Success - extracted from combined text");
      return NextResponse.json({
        status: "success",
        data: syllabus,
      });
    } else if (inputType === "text") {
      // Handle pasted text only
      const text = formData.get("text") as string;

      if (!text || text.trim().length < 50) {
        return NextResponse.json(
          { status: "error", error: "Please provide more text (at least 50 characters)" },
          { status: 400 }
        );
      }

      console.log("[syllabus/extract] Processing pasted text, length:", text.length);
      const syllabus = await extractSyllabus(text);

      console.log("[syllabus/extract] Success - extracted from text");
      return NextResponse.json({
        status: "success",
        data: syllabus,
      });
    } else if (inputType === "images") {
      // Handle images
      if (fileCount > MAX_IMAGES) {
        return NextResponse.json(
          { status: "error", error: `Maximum ${MAX_IMAGES} images allowed` },
          { status: 400 }
        );
      }

      const imageBuffers: { data: Buffer; mimeType: "image/png" | "image/jpeg" }[] = [];

      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file${i}`) as File;

        if (!file) {
          return NextResponse.json(
            { status: "error", error: `Missing file at index ${i}` },
            { status: 400 }
          );
        }

        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
          return NextResponse.json(
            { status: "error", error: `Unsupported image type: ${file.type}. Use PNG or JPEG.` },
            { status: 400 }
          );
        }

        if (file.size > MAX_IMAGE_SIZE) {
          return NextResponse.json(
            { status: "error", error: `Image ${file.name} exceeds 10MB limit` },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        imageBuffers.push({
          data: buffer,
          mimeType: file.type as "image/png" | "image/jpeg",
        });
      }

      console.log(`[syllabus/extract] Processing ${imageBuffers.length} images`);
      const syllabus = await extractSyllabusFromImages(imageBuffers);

      console.log("[syllabus/extract] Success - extracted from images");
      return NextResponse.json({
        status: "success",
        data: syllabus,
      });
    } else {
      // Handle PDF (default)
      const file = formData.get("file0") as File ?? formData.get("file") as File;

      if (!file) {
        return NextResponse.json(
          { status: "error", error: "No file provided" },
          { status: 400 }
        );
      }

      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { status: "error", error: "Only PDF files are supported for this input type" },
          { status: 400 }
        );
      }

      // Extract text from PDF
      console.log("[syllabus/extract] Processing file:", file.name, "size:", file.size);
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfText = await extractPdfText(buffer);

      console.log("[syllabus/extract] Extracted text length:", pdfText?.length ?? 0);

      if (!pdfText || pdfText.trim().length < 100) {
        console.log("[syllabus/extract] Text too short, returning error");
        return NextResponse.json(
          { status: "error", error: "Could not extract text from PDF. Please ensure the PDF contains readable text." },
          { status: 400 }
        );
      }

      // Use AI to extract structured syllabus data
      console.log("[syllabus/extract] Calling extractSyllabus...");
      const syllabus = await extractSyllabus(pdfText);

      console.log("[syllabus/extract] Success - extracted", syllabus.weeks?.length ?? 0, "weeks");
      return NextResponse.json({
        status: "success",
        data: syllabus,
      });
    }
  } catch (error) {
    console.error("Error extracting syllabus:", error);
    const message = error instanceof Error ? error.message : "Failed to extract syllabus";
    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 }
    );
  }
}
