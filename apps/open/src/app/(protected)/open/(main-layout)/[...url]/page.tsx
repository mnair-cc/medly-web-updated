"use client";
export const dynamic = "force-dynamic";

import SessionStructureOpen from "@/app/(protected)/open/_components/MOSessionStructure";
import type { OpenSessionData } from "@/app/(protected)/open/_types/sessionTypes";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const OpenDynamicPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);

  // Reconstruct the full PDF URL from the caught segments
  const urlSegments = params.url as string[];
  let pdfUrl = "";

  if (urlSegments && urlSegments.length > 0) {
    // Decode each segment first to handle already-encoded URLs from browser
    const decodedSegments = urlSegments.map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment; // If decode fails, use original
      }
    });

    const joined = decodedSegments.join("/");

    // Check if URL already has protocol
    if (joined.startsWith("http://") || joined.startsWith("https://")) {
      pdfUrl = joined;
    } else if (joined.startsWith("http:") || joined.startsWith("https:")) {
      // Protocol exists but missing slashes
      pdfUrl = joined.replace(/^(https?):/, "$1://");
    } else {
      // No protocol, add https://
      pdfUrl = "https://" + joined;
    }

    // Validate the URL format
    // Don't pre-encode - let encodeURIComponent handle it when used as query parameter
    try {
      new URL(pdfUrl);
      // URL is valid, keep it as-is with unencoded characters
      // encodeURIComponent will encode spaces, &, etc. when we use it as query param
    } catch (e) {
      console.error("Failed to parse URL:", pdfUrl, e);
      // If URL parsing fails, it's likely because of unencoded & in the pathname
      // Try to fix it by encoding & characters
      try {
        // Replace & with %26 but avoid double-encoding
        const fixed = pdfUrl.replace(/([^%])(&)([^;])/g, "$1%26$3");
        new URL(fixed); // Validate the fixed URL
        pdfUrl = fixed;
      } catch {
        // If that still fails, keep original and let it fail later
      }
    }
  }

  // Append any search params (e.g. presigned S3 params) from the current route
  const queryString = searchParams?.toString();
  if (pdfUrl && queryString) {
    const separator = pdfUrl.includes("?") ? "&" : "?";
    pdfUrl = `${pdfUrl}${separator}${queryString}`;
  }

  console.log("URL segments:", urlSegments);
  console.log("Reconstructed PDF URL:", pdfUrl);

  // Auto-create document from URL and redirect
  useEffect(() => {
    // Prevent duplicate execution (especially in React strict mode)
    if (!pdfUrl || hasProcessedRef.current) return;

    hasProcessedRef.current = true;

    const processUrl = async () => {
      try {
        setError(null);

        console.log("Creating document from URL:", pdfUrl);
        const response = await fetch("/api/open/documents/from-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: pdfUrl }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create document");
        }

        const data = await response.json();
        console.log(
          "Document created/found:",
          data.documentId,
          data.duplicate ? "(duplicate)" : "(new)",
        );

        // Redirect to document page
        router.push(`/open/doc/${data.documentId}`);
      } catch (err) {
        console.error("Error processing URL:", err);
        setError(
          err instanceof Error ? err.message : "Failed to process PDF URL",
        );
        // Reset ref on error so user can retry
        hasProcessedRef.current = false;
      }
    };

    processUrl();
  }, [pdfUrl, router]);

  // Show loading or error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-4">
        <div className="text-xl font-rounded-bold text-red-600">Error</div>
        <div className="text-lg text-gray-600 text-center max-w-md">
          {error}
        </div>
        <button
          onClick={() => router.push("/open")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Go to Home
        </button>
      </div>
    );
  }

  // Create session data with the PDF URL immediately
  const proxiedPdfUrl = pdfUrl
    ? `/api/open/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`
    : "";

  const sessionData: OpenSessionData = {
    id: `open-session-url-${pdfUrl}`,
    sessionTitle: "Loading PDF...",
    documentUrl: proxiedPdfUrl,
    documentId: undefined,
    thumbnailUrl: undefined,
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden w-full h-screen">
      <SessionStructureOpen
        returnUrl="/open"
        lessonId="sample-lesson"
        initialSessionData={sessionData}
      />
    </div>
  );
};

export default OpenDynamicPage;
