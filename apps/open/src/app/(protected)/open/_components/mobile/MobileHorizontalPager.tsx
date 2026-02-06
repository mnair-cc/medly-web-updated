"use client";

import React, { useRef, useCallback, useEffect, useState, ReactNode, Children, useImperativeHandle, forwardRef } from "react";

export interface MobileHorizontalPagerRef {
  scrollToPage: (pageIndex: number) => void;
}

interface MobileHorizontalPagerProps {
  children: ReactNode;
  currentPage: number;
  onPageChange: (pageIndex: number) => void;
  /** Width percentages for each page. Defaults to [80, 100] for sidebar peek effect */
  pageWidths?: number[];
}

/**
 * MobileHorizontalPager - A horizontal snap-scroll container with variable page widths
 *
 * Uses CSS scroll-snap for native-feeling swipe behavior.
 * First page is 80% width so the document page peeks through on the right.
 * Adds a darkening overlay on the second page as the sidebar opens.
 */
const MobileHorizontalPager = forwardRef<MobileHorizontalPagerRef, MobileHorizontalPagerProps>(({
  children,
  currentPage,
  onPageChange,
  pageWidths = [80, 100],
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);
  const childArray = Children.toArray(children);

  // Track scroll progress for overlay opacity (0 = sidebar open, 1 = document page)
  const [scrollProgress, setScrollProgress] = useState(currentPage === 0 ? 0 : 1);

  // Calculate scroll position for each page based on variable widths
  const getScrollPositionForPage = useCallback((pageIndex: number) => {
    if (!containerRef.current) return 0;
    const containerWidth = containerRef.current.clientWidth;

    let scrollPos = 0;
    for (let i = 0; i < pageIndex; i++) {
      const widthPercent = pageWidths[i] ?? 100;
      scrollPos += (containerWidth * widthPercent) / 100;
    }
    return scrollPos;
  }, [pageWidths]);

  // Get total scrollable width
  const getTotalScrollWidth = useCallback(() => {
    if (!containerRef.current) return 0;
    const containerWidth = containerRef.current.clientWidth;
    return pageWidths.reduce((sum, w) => sum + (containerWidth * w) / 100, 0) - containerWidth;
  }, [pageWidths]);

  // Determine which page we're on based on scroll position
  const getPageFromScrollPosition = useCallback((scrollLeft: number) => {
    if (!containerRef.current) return 0;
    const containerWidth = containerRef.current.clientWidth;

    let accumulatedWidth = 0;
    for (let i = 0; i < childArray.length; i++) {
      const widthPercent = pageWidths[i] ?? 100;
      const pageWidth = (containerWidth * widthPercent) / 100;
      const pageCenter = accumulatedWidth + pageWidth / 2;

      if (scrollLeft < pageCenter) {
        return i;
      }
      accumulatedWidth += pageWidth;
    }
    return childArray.length - 1;
  }, [childArray.length, pageWidths]);

  // Scroll to a specific page (can be called directly for immediate response)
  const scrollToPage = useCallback((pageIndex: number) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const targetScrollLeft = getScrollPositionForPage(pageIndex);

    isScrollingProgrammatically.current = true;
    container.scrollTo({
      left: targetScrollLeft,
      behavior: "smooth",
    });

    // Reset flag after scroll animation
    setTimeout(() => {
      isScrollingProgrammatically.current = false;
    }, 300);
  }, [getScrollPositionForPage]);

  // Expose scrollToPage via ref
  useImperativeHandle(ref, () => ({
    scrollToPage,
  }), [scrollToPage]);

  // Handle scroll to update overlay and detect page changes
  const handleScrollUpdate = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const maxScroll = getTotalScrollWidth();
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, container.scrollLeft / maxScroll)) : 0;
    setScrollProgress(progress);
  }, [getTotalScrollWidth]);

  // Handle scroll end to detect page changes
  const handleScrollEnd = useCallback(() => {
    if (isScrollingProgrammatically.current || !containerRef.current) return;

    const container = containerRef.current;
    const newPageIndex = getPageFromScrollPosition(container.scrollLeft);

    if (newPageIndex !== currentPage && newPageIndex >= 0 && newPageIndex < childArray.length) {
      onPageChange(newPageIndex);
    }
  }, [currentPage, onPageChange, childArray.length, getPageFromScrollPosition]);

  // Scroll to page when currentPage changes programmatically
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const targetScrollLeft = getScrollPositionForPage(currentPage);

    // Only scroll if we're not already at the right position
    if (Math.abs(container.scrollLeft - targetScrollLeft) > 1) {
      scrollToPage(currentPage);
    }
  }, [currentPage, getScrollPositionForPage, scrollToPage]);

  // Scroll event handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollEndTimeout: NodeJS.Timeout;

    const onScroll = () => {
      // Update overlay immediately
      handleScrollUpdate();

      // Debounce page change detection
      clearTimeout(scrollEndTimeout);
      scrollEndTimeout = setTimeout(handleScrollEnd, 50);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(scrollEndTimeout);
    };
  }, [handleScrollUpdate, handleScrollEnd]);

  // Overlay opacity: 0.15 when sidebar open (scrollProgress=0), 0 when on document page (scrollProgress=1)
  const overlayOpacity = 0.15 * (1 - scrollProgress);

  // Handle overlay click - scroll immediately then update state
  const handleOverlayClick = useCallback(() => {
    scrollToPage(1);
    onPageChange(1);
  }, [scrollToPage, onPageChange]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex scrollbar-hide overscroll-x-none"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
        scrollSnapStop: "always",
      }}
    >
      {childArray.map((child, index) => {
        const widthPercent = pageWidths[index] ?? 100;
        const isDocumentPage = index === 1;

        return (
          <div
            key={index}
            className="h-full flex-shrink-0 snap-start relative overflow-hidden"
            style={{
              width: `${widthPercent}%`,
              scrollSnapStop: "always",
            }}
          >
            {child}
            {/* Darkening overlay on document page - clickable to close sidebar */}
            {/* z-20 ensures it's above the floating header button (z-10) */}
            {/* Only render when opacity is meaningfully visible (> 0.01) to avoid Safari touch issues */}
            {isDocumentPage && overlayOpacity > 0.01 && (
              <div
                className="absolute inset-0 bg-black z-20"
                style={{ opacity: overlayOpacity }}
                onClick={handleOverlayClick}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

MobileHorizontalPager.displayName = "MobileHorizontalPager";

export default MobileHorizontalPager;
