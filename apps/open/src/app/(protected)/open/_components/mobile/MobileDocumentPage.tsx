"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { useSidebar } from "../sidebar/MOSidebarLayoutClient";
import { useAiChat } from "../chat/MOChatLayoutClient";
import { useOpenPathname } from "../../_hooks/useOpenPathname";
import MobileVerticalSplit from "./MobileVerticalSplit";
import MobileMOChat from "./MobileMOChat";
import MobileFloatingHeader from "./MobileFloatingHeader";

interface MobileDocumentPageProps {
  children: React.ReactNode;
  onOpenSidebar?: () => void;
}

/**
 * MobileDocumentPage - Page 2 of mobile layout
 *
 * Shows document content on top and chat on bottom with draggable split.
 * Snap points: 0% (full document), 21% (minimized chat), 50% (split), 100% (full chat)
 */
export default function MobileDocumentPage({ children, onOpenSidebar }: MobileDocumentPageProps) {
  const pathname = useOpenPathname();
  const { mobileChatSnapPoint, setMobileChatSnapPoint, accentBgColor, selectedCollection, collections } = useSidebar();
  const { headerData } = useAiChat();

  // When at base /open route (no document selected), show chat full screen
  const isBaseOpenRoute = pathname === "/open";

  // Get selected collection data for header and primary color
  const selectedCollectionData = useMemo(
    () => collections.find((c) => c.id === selectedCollection),
    [collections, selectedCollection]
  );
  const selectedModuleName = selectedCollectionData?.name;
  const primaryColor = selectedCollectionData?.primaryColor;

  // Track previous pathname to detect document navigation
  const prevPathnameRef = useRef(pathname);

  // Set snap point based on route
  useEffect(() => {
    const isBaseRoute = pathname === "/open";
    const isDocumentRoute = pathname?.startsWith("/open/doc/");
    const isNewPath = pathname !== prevPathnameRef.current;

    if (isBaseRoute) {
      // At /open with no document - full screen chat (snap point 1)
      setMobileChatSnapPoint(1);
    } else if (isDocumentRoute && isNewPath) {
      // Opening a new document - reset to 50% split
      setMobileChatSnapPoint(0.5);
    }

    prevPathnameRef.current = pathname;
  }, [pathname, setMobileChatSnapPoint]);

  return (
    <div className="h-full w-full">
      <MobileVerticalSplit
        snapPoints={[0, 0.21, 0.5, 1]}
        activeSnapPoint={mobileChatSnapPoint}
        onSnapPointChange={setMobileChatSnapPoint}
        fullScreenBottom={isBaseOpenRoute}
        onAskAnythingClick={() => setMobileChatSnapPoint(0.5)}
        primaryColor={primaryColor}
        topContent={
          <div
            className="h-full w-full overflow-hidden relative flex flex-col"
            style={{ backgroundColor: accentBgColor }}
          >
            <MobileFloatingHeader
              title={headerData?.sessionTitle || "Document"}
              onOpenSidebar={onOpenSidebar}
            />
            {/* Document content - fills remaining space and handles its own scrolling */}
            <div className="flex-1 min-h-0 w-full">
              {children}
            </div>
          </div>
        }
        bottomContent={
          <div
            className="h-full w-full flex flex-col overflow-hidden relative"
            style={{ backgroundColor: isBaseOpenRoute ? accentBgColor : "white" }}
          >
            {/* Show floating header in full-screen chat mode */}
            {isBaseOpenRoute && (
              <MobileFloatingHeader
                title={selectedModuleName}
                onOpenSidebar={onOpenSidebar}
              />
            )}
            <MobileMOChat />
          </div>
        }
      />
    </div>
  );
}
