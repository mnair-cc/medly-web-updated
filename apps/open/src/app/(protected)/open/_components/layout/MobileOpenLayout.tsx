"use client";

import { useRef, useCallback, useMemo } from "react";
import { useSidebar } from "../sidebar/MOSidebarLayoutClient";
import { MobileHorizontalPager, MobileSidebarPage, MobileDocumentPage } from "../mobile";
import type { MobileHorizontalPagerRef } from "../mobile/MobileHorizontalPager";
import { useThemeColor } from "../../_hooks/useThemeColor";
import { useOpenPathname } from "../../_hooks/useOpenPathname";
import { applyBlackOverlay } from "@/app/_lib/utils/colorUtils";

interface MobileOpenLayoutProps {
  children: React.ReactNode;
}

/**
 * Mobile layout: Horizontal snap scroll with sidebar page and document+chat page
 * This component is only rendered on mobile (< 640px)
 *
 * Page 1: Sidebar with module dropdown + document list
 * Page 2: Document content (top) + Chat (bottom) with draggable split
 */
export default function MobileOpenLayout({ children }: MobileOpenLayoutProps) {
  const { mobilePageIndex, setMobilePageIndex, mobileChatSnapPoint, accentBgColor, selectedCollection, collections } = useSidebar();
  const pathname = useOpenPathname();
  const pagerRef = useRef<MobileHorizontalPagerRef>(null);

  // Navigate to sidebar - update state first, then scroll
  const navigateToSidebar = useCallback(() => {
    setMobilePageIndex(0);
    // Small delay to ensure state update triggers re-render before scroll
    requestAnimationFrame(() => {
      pagerRef.current?.scrollToPage(0);
    });
  }, [setMobilePageIndex]);

  // Navigate to document - update state first, then scroll
  const navigateToDocument = useCallback(() => {
    setMobilePageIndex(1);
    // Small delay to ensure state update triggers re-render before scroll
    requestAnimationFrame(() => {
      pagerRef.current?.scrollToPage(1);
    });
  }, [setMobilePageIndex]);

  // When at base /open route (no document selected)
  const isBaseOpenRoute = pathname === "/open";

  // Get the selected collection's primary color
  const primaryColor = useMemo(
    () => collections.find((c) => c.id === selectedCollection)?.primaryColor,
    [collections, selectedCollection]
  );

  // Compute theme color based on current state:
  // - Sidebar page: white
  // - Base /open route (full-screen chat): module accent color
  // - Document page with chat minimized/split: accent color
  // - Document page with chat fully expanded: primary color with 10% black overlay
  const themeColor = useMemo(() => {
    if (mobilePageIndex === 0) {
      return "#FFFFFF"; // Sidebar page
    }
    // Base /open route shows full-screen chat with module accent color
    if (isBaseOpenRoute) {
      return accentBgColor;
    }
    // Document page - check chat snap point
    if (mobileChatSnapPoint >= 0.95) {
      // Chat fully expanded - use primary color with 10% black overlay
      return primaryColor ? applyBlackOverlay(primaryColor) : "#000000";
    }
    return accentBgColor; // Module accent color
  }, [mobilePageIndex, mobileChatSnapPoint, accentBgColor, isBaseOpenRoute, primaryColor]);

  // Update iOS Safari status bar color
  useThemeColor(themeColor);

  return (
    <MobileHorizontalPager
      ref={pagerRef}
      currentPage={mobilePageIndex}
      onPageChange={setMobilePageIndex}
      pageWidths={[80, 100]} // Sidebar is 80% so document peeks through
    >
      {/* Page 1: Sidebar (80% width) */}
      <MobileSidebarPage onDocumentSelect={navigateToDocument} />

      {/* Page 2: Document + Chat (100% width) */}
      <MobileDocumentPage onOpenSidebar={navigateToSidebar}>{children}</MobileDocumentPage>
    </MobileHorizontalPager>
  );
}
