"use client";

export const dynamic = "force-dynamic";

import MOSessionStructure from "@/app/(protected)/open/_components/MOSessionStructure";
import { fileUrls } from "@/app/(protected)/open/_lib/fileUrls";
import type { Document } from "@/app/(protected)/open/_types/content";
import type { OpenSessionData } from "@/app/(protected)/open/_types/sessionTypes";
import Spinner from "@/app/_components/Spinner";
import { nextApiClient } from "@/app/_lib/utils/axiosHelper";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useTracking } from "@/app/_lib/posthog/useTracking";

const OpenDocumentPage = () => {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;
  const { track } = useTracking();

  const [document, setDocument] = useState<Document | null>(null);
  const [sourceDocumentStoragePath, setSourceDocumentStoragePath] = useState<
    string | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);

  // Track session timing
  const sessionStartRef = useRef<number | null>(null);
  const hasTrackedOpenRef = useRef(false);

  // Check if this is a temporary ID (used for optimistic navigation during upload)
  const isTempId = documentId?.startsWith("temp-");

  useEffect(() => {
    const fetchDocument = async () => {
      // If it's a temporary ID, keep loading state (URL will be replaced with real ID once upload completes)
      if (isTempId) {
        setLoading(true);
        setDocument(null);
        return;
      }

      try {
        setLoading(true);
        const response = await nextApiClient.get<Document>(
          `/open/documents/${documentId}`,
        );
        const doc = response.data;

        // Determine the source PDF storagePath for notes generation
        if (doc.type === "document" && doc.storagePath) {
          // PDF document - use its own storagePath
          setSourceDocumentStoragePath(doc.storagePath);
        } else if (
          doc.type === "notes" &&
          doc.sourceReferences &&
          doc.sourceReferences.length > 0
        ) {
          // Notes document - fetch source PDF's storagePath
          try {
            const sourceResponse = await nextApiClient.get<Document>(
              `/open/documents/${doc.sourceReferences[0].id}`,
            );
            setSourceDocumentStoragePath(sourceResponse.data.storagePath);
          } catch (err) {
            console.error("Error fetching source document:", err);
          }
        }

        setDocument(doc);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching document:", err);
        setLoading(false);
        if (!isTempId) {
          router.push("/open");
        }
      }
    };

    if (documentId) {
      fetchDocument();
    }
  }, [documentId, router, isTempId]);

  // Track document opened and session ended
  useEffect(() => {
    if (!document || hasTrackedOpenRef.current) return;

    // Track document opened
    track("document_opened", {
      document_id: documentId,
      document_type: document.type || "document",
    });
    hasTrackedOpenRef.current = true;
    sessionStartRef.current = Date.now();

    // Track session end on unmount or page unload
    const handleSessionEnd = () => {
      if (sessionStartRef.current) {
        const durationSeconds = Math.round(
          (Date.now() - sessionStartRef.current) / 1000
        );
        track("document_session_ended", {
          document_id: documentId,
          duration_seconds: durationSeconds,
          document_type: document.type || "document",
        });
      }
    };

    window.addEventListener("beforeunload", handleSessionEnd);

    return () => {
      window.removeEventListener("beforeunload", handleSessionEnd);
      handleSessionEnd();
    };
  }, [document, documentId, track]);

  // Poll for storageUrl if document exists but has no storageUrl yet (still uploading)
  useEffect(() => {
    const isPdfDocument = document?.type === "document" || !document?.type;
    const hasPdfAttachment = Boolean(document?.storageUrl || document?.storagePath);
    if (!document || !isPdfDocument || hasPdfAttachment) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await nextApiClient.get<Document>(
          `/open/documents/${documentId}`,
        );
        if (response.data.storageUrl || response.data.storagePath) {
          setDocument(response.data);
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error polling document:", err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [document, documentId]);

  if (loading || !document) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  const isPdfDocument = document.type === "document" || !document.type;
  const hasPdfAttachment = Boolean(document.storageUrl || document.storagePath);

  // Use cached file proxy for PDFs, but only once upload/storage is ready.
  // During upload, keep this empty so the viewer can show a loading state and
  // will retry once the polling updates `document` with a storageUrl/storagePath.
  const proxiedPdfUrl =
    isPdfDocument && hasPdfAttachment ? fileUrls.pdf(documentId) : "";

  // Use cached proxy for document thumbnails *only if* the document actually has a thumbnail.
  // Otherwise, keep the old behavior (no <img> / no request) to avoid broken images for legacy/failed thumbs.
  const proxiedThumbnailUrl =
    isPdfDocument && document.thumbnailUrl
      ? fileUrls.thumbnail(documentId, document.thumbnailUrl)
      : document.thumbnailUrl;

  const returnUrl = `/open?collection=${document.collectionId}`;

  const sessionData: OpenSessionData = {
    id: `open-session-${documentId}`,
    sessionTitle: document.name?.trim() || "New Document",
    documentUrl: proxiedPdfUrl,
    documentId: documentId,
    thumbnailUrl: proxiedThumbnailUrl,
    documentType: document.type ?? "document",
    sourceReferences: document.sourceReferences,
    sourceDocumentStoragePath,
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden w-full h-full">
      <MOSessionStructure
        initialSessionData={sessionData}
        lessonId="sample-lesson"
        returnUrl={returnUrl}
      />
    </div>
  );
};

export default OpenDocumentPage;
