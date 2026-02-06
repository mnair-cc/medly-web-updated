import { storage } from "@/app/_lib/firebase/admin";
import { auth } from "@/auth";
import { documentRepo } from "@/db/repositories";
import type { DocumentData } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";

// Supported extensions
type FileExt = "pdf" | "jpg" | "png";

const CONTENT_TYPES: Record<FileExt, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
};

type StorageLocation = { bucket?: string; path: string };

function parseGsUrl(gsUrl: string): StorageLocation | null {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(gsUrl);
  if (!match) return null;
  return { bucket: match[1], path: match[2] };
}

function parseFirebaseStorageHttpUrl(
  urlString: string
): StorageLocation | null {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }

  // Firebase download URLs:
  // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?alt=media...
  // https://<bucket>.firebasestorage.app/v0/b/<bucket>/o/<encodedPath>?alt=media...
  if (
    url.hostname === "firebasestorage.googleapis.com" ||
    url.hostname.endsWith(".firebasestorage.app")
  ) {
    const match = /\/v0\/b\/([^/]+)\/o\/([^?]+)/.exec(url.pathname);
    if (!match) return null;
    const bucket = match[1];
    const path = decodeURIComponent(match[2]);
    if (!path) return null;
    return { bucket, path };
  }

  // GCS public URLs:
  // https://storage.googleapis.com/<bucket>/<path>
  if (url.hostname === "storage.googleapis.com") {
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    const bucket = segments[0];
    const path = segments.slice(1).join("/");
    if (!path) return null;
    return { bucket, path };
  }

  return null;
}

function resolveStorageLocation(input: unknown): StorageLocation | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;

  if (value.startsWith("gs://")) return parseGsUrl(value);
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return parseFirebaseStorageHttpUrl(value);
  }

  // Already a bucket-relative object path like "public/foo.pdf"
  return { path: value };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filename = (await params).filename?.trim();
  if (!filename) {
    return NextResponse.json(
      { error: "Invalid filename format" },
      { status: 400 }
    );
  }

  // Parse: "abc123.pdf" → { docId: "abc123", ext: "pdf" }
  const lastDot = filename.lastIndexOf(".");
  // Reject:
  // - no dot ("abc123")
  // - dot at start (".pdf") -> empty docId
  // - dot at end ("abc123.") -> empty extension
  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return NextResponse.json(
      { error: "Invalid filename format" },
      { status: 400 }
    );
  }

  const docId = filename.slice(0, lastDot);
  const ext = filename.slice(lastDot + 1).toLowerCase() as FileExt;

  if (!["pdf", "jpg", "png"].includes(ext)) {
    return NextResponse.json(
      { error: "Unsupported file format" },
      { status: 400 }
    );
  }

  // Get document from database
  const rawDoc = await documentRepo.findRawById(session.user.id, docId);

  if (!rawDoc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const data = rawDoc.data as DocumentData;

  // Validate document type - only "document" type has PDF/thumbnail
  if (data.type && data.type !== "document") {
    return NextResponse.json(
      {
        error: `Document type "${data.type}" does not have file attachments. Use sourceReferences to find the source document.`,
      },
      { status: 400 }
    );
  }

  // Determine file location. Prefer explicit "*Path" fields, but fall back to deriving
  // the object path from "*Url" when "*Path" is an empty string (e.g. default onboarding doc).
  const pathField = ext === "pdf" ? data.storagePath : data.thumbnailPath;
  const urlField = ext === "pdf" ? data.storageUrl : data.thumbnailUrl;

  const locationFromPath = resolveStorageLocation(pathField);
  const locationFromUrl = resolveStorageLocation(urlField);
  const location = locationFromPath ?? locationFromUrl;

  if (!location) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // If the URL has an access token, fetch directly (handles cross-bucket access)
  const directUrl = typeof urlField === "string" && urlField.includes("token=") ? urlField : null;

  let buffer: Buffer;

  if (directUrl) {
    // Fetch directly from public URL (e.g., sandbox files from production bucket)
    const response = await fetch(directUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
    buffer = Buffer.from(await response.arrayBuffer());
  } else {
    // Download from Firebase Storage via Admin SDK
    const bucket = location.bucket
      ? storage.bucket(location.bucket)
      : storage.bucket();
    const file = bucket.file(location.path);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 404 }
      );
    }

    [buffer] = await file.download();
  }

  // NextResponse expects a web BodyInit; use Uint8Array (works in Node runtime).
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": CONTENT_TYPES[ext],
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
