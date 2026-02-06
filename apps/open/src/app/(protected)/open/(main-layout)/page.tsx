"use client";

export const dynamic = "force-dynamic";

import { useSidebar } from "@/app/(protected)/open/_components/sidebar/MOSidebarLayoutClient";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import MOSessionStructure from "../_components/MOSessionStructure";
import type { OpenSessionData } from "../_types/sessionTypes";

const OpenPageContent = () => {
  const searchParams = useSearchParams();
  const { setSelectedCollection, selectedCollection, collections } = useSidebar();

  // Handle return from document view - restore collection selection
  useEffect(() => {
    const collectionId = searchParams?.get("collection");
    if (collectionId) {
      setSelectedCollection(collectionId);
    }
  }, [searchParams, setSelectedCollection]);

  // Get the selected collection's name for the session title
  const sessionTitle = useMemo(() => {
    if (!selectedCollection) return "Medly";
    const collection = collections.find((c) => c.id === selectedCollection);
    return collection?.name || "Medly";
  }, [selectedCollection, collections]);

  const sessionData: OpenSessionData = useMemo(() => ({
    id: "open-session-1",
    sessionTitle,
  }), [sessionTitle]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden w-full h-screen">
      <MOSessionStructure
        initialSessionData={sessionData}
        lessonId="sample-lesson"
        returnUrl="/open"
      />
    </div>
  );
};

const OpenPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OpenPageContent />
    </Suspense>
  );
};

export default OpenPage;
