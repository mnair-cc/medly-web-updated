"use client";

import MOChat from "../chat/MOChat";
import Sidebar from "../MOSidebar";
import MOHeader from "../session_structure/MOHeader";
import { useSidebar } from "../sidebar/MOSidebarLayoutClient";
import { useAiChat } from "../chat/MOChatLayoutClient";
import { SaveState } from "@/app/(protected)/sessions/hooks/useSession";
import { useCallback, useEffect, useRef, useState } from "react";

interface DesktopOpenLayoutProps {
  children: React.ReactNode;
}

/**
 * Desktop layout: 3-panel layout (sidebar | document | chat)
 * This component is only rendered on desktop (>= 640px)
 */
export default function DesktopOpenLayout({ children }: DesktopOpenLayoutProps) {
  const {
    sidebarState,
    selectedCollection,
    leftSidebarWidth,
    setLeftSidebarWidth,
    rightChatWidth,
    setRightChatWidth,
    docsPanelWidth,
    semiOpenSidebar,
    closeSidebar,
  } = useSidebar();

  const { headerData, updateHeaderData } = useAiChat();

  // Debug screenshot state (local to desktop)
  const [debugScreenshot, setDebugScreenshot] = useState<string | null>(null);

  // Panel resize state
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Constraints (min 20% as original, max 25%/50%)
  const LEFT_MIN_PERCENT = 0.20;
  const LEFT_MAX_PERCENT = 0.25;
  const RIGHT_MIN_PERCENT = 0.20;
  const RIGHT_MAX_PERCENT = 0.50;

  const handleLeftResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingLeft(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = leftSidebarWidth ?? Math.floor(window.innerWidth * LEFT_MIN_PERCENT);
  }, [leftSidebarWidth]);

  const handleRightResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingRight(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = rightChatWidth ?? Math.floor(window.innerWidth * RIGHT_MIN_PERCENT);
  }, [rightChatWidth]);

  // Global mouse events for resize
  useEffect(() => {
    if (!isResizingLeft && !isResizingRight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX.current;
      const minLeftWidth = Math.floor(window.innerWidth * LEFT_MIN_PERCENT);
      const maxLeftWidth = Math.floor(window.innerWidth * LEFT_MAX_PERCENT);
      const minRightWidth = Math.floor(window.innerWidth * RIGHT_MIN_PERCENT);
      const maxRightWidth = Math.floor(window.innerWidth * RIGHT_MAX_PERCENT);

      if (isResizingLeft) {
        const newWidth = Math.min(maxLeftWidth, Math.max(minLeftWidth, dragStartWidth.current + deltaX));
        setLeftSidebarWidth(newWidth);
      } else if (isResizingRight) {
        // Right panel: dragging left edge means negative deltaX increases width
        const newWidth = Math.min(maxRightWidth, Math.max(minRightWidth, dragStartWidth.current - deltaX));
        setRightChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizingLeft && leftSidebarWidth !== null) {
        localStorage.setItem("sidebarLeftWidth", leftSidebarWidth.toString());
      } else if (isResizingRight && rightChatWidth !== null) {
        localStorage.setItem("chatPanelWidth", rightChatWidth.toString());
      }
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizingLeft, isResizingRight, leftSidebarWidth, rightChatWidth, setLeftSidebarWidth, setRightChatWidth]);

  return (
    <>
      <div className="flex h-full w-full border-t-[0px] border-[#05B0FF]">
        {/* Left sidebar - fully open state */}
        {sidebarState === "open" && (
          <div
            className="flex flex-shrink-0 h-full flex-col border-r border-[#F2F2F7]"
            style={{
              width: leftSidebarWidth !== null
                ? selectedCollection
                  ? (leftSidebarWidth + (docsPanelWidth ?? 320))
                  : leftSidebarWidth
                : "20%",
            }}
          >
            <Sidebar />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-hidden relative">
          {/* Persistent header - positioned absolutely */}
          {headerData && (
            <div className="absolute top-0 left-0 w-full z-10">
              <MOHeader
                currentPageIndex={headerData.currentPageIndex || 0}
                handleSetCurrentPageIndex={(index: number) => {
                  updateHeaderData({ currentPageIndex: index });
                }}
                pages={headerData.pages || []}
                hasStarted={false}
                hasFinished={false}
                isTimed={false}
                durationInMinutes={null}
                timeStarted={null}
                setIsExitConfirmationModalOpen={() => {}}
                saveState={SaveState.SAVED}
                sessionType={headerData.sessionType}
                handleSave={() => {}}
                sessionTitle={headerData.sessionTitle}
                sessionSubtitle={headerData.sessionSubtitle}
                isAnnotating={false}
                setIsAnnotating={() => {}}
                returnUrl={headerData.returnUrl}
                showCalculator={false}
                showReference={false}
                setIsCalculatorOpen={() => {}}
                setIsReferenceOpen={() => {}}
                showStrategy={false}
                setIsStrategyOpen={() => {}}
                showCalculatorTooltip={false}
                isReadOnly={false}
                onToggleResults={() => {}}
                pageType={headerData.pageType}
                setPageType={headerData.onPageTypeChange}
                documentId={headerData.documentId}
                documentType={headerData.documentType as "document" | "practice" | "flashcards" | undefined}
                hasNotes={headerData.hasNotes}
                onSummaryButtonClick={headerData.onSummaryButtonClick}
              />
            </div>
          )}
          {children}
        </div>

        {/* Chat sidebar */}
        <div
          className="flex h-full"
          style={{ width: rightChatWidth !== null ? rightChatWidth : "20%" }}
        >
          {/* Resize handle - left edge of chat */}
          <div
            className="w-[2px] h-full cursor-ew-resize hover:bg-[#F2F2F7] transition-colors flex-shrink-0"
            onMouseDown={handleRightResizeStart}
          />
          <div className="flex-1 h-full flex flex-col border-l border-[#F0F0F0] overflow-hidden">
            <MOChat />
          </div>
        </div>
      </div>

      {/* Semi-open overlay sidebar */}
      {sidebarState === "semi-open" && (
        <div
          className="absolute top-20 left-3 bottom-3 z-[10]"
          onMouseEnter={() => semiOpenSidebar()}
          onMouseLeave={() => closeSidebar()}
        >
          <Sidebar />
        </div>
      )}

      {/* Debug: Screenshot preview */}
      {debugScreenshot && (
        <div className="fixed bottom-4 left-4 z-50 bg-white rounded-lg shadow-2xl border border-gray-300 p-2 max-w-[400px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-600">Screenshot Preview</span>
            <button
              onClick={() => setDebugScreenshot(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <img
            src={debugScreenshot}
            alt="Screenshot preview"
            className="max-w-full max-h-[300px] object-contain rounded border border-gray-200"
          />
        </div>
      )}
    </>
  );
}
