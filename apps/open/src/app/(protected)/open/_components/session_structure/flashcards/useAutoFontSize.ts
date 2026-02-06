"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseAutoFontSizeOptions {
  minSize?: number;
  maxSize?: number;
  fontUnit?: string;
  widthMargin?: number;
  heightMargin?: number;
}

/**
 * Custom hook that automatically adjusts font size to fit content within container bounds
 * Uses binary search for efficient size calculation
 *
 * On mobile, we calculate once and don't use ResizeObserver to avoid layout thrashing
 */
export function useAutoFontSize(
  text: string,
  options: UseAutoFontSizeOptions = {}
) {
  const {
    minSize = 14,
    maxSize = 48,
    fontUnit = "px",
    widthMargin = 0.9, // Use 90% of available width
    heightMargin = 0.85, // Use 85% of available height
  } = options;

  const [fontSize, setFontSize] = useState(maxSize); // Start with max, will shrink if needed
  const [hasCalculated, setHasCalculated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const testElementRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  // Detect mobile once
  const isMobileRef = useRef(
    typeof window !== "undefined" &&
    (window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  );

  // Create hidden test element for measuring text (stable reference)
  const getOrCreateTestElement = useCallback(() => {
    if (!testElementRef.current) {
      const span = document.createElement("div");
      span.style.position = "absolute";
      span.style.visibility = "hidden";
      span.style.left = "-9999px";
      span.style.top = "-9999px";
      span.style.pointerEvents = "none";
      span.style.textAlign = "center";
      document.body.appendChild(span);
      testElementRef.current = span;
    }
    return testElementRef.current;
  }, []);

  // Clean up test element on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (testElementRef.current && testElementRef.current.parentNode) {
        testElementRef.current.parentNode.removeChild(testElementRef.current);
        testElementRef.current = null;
      }
    };
  }, []);

  // Single calculation function - runs once per text change
  const calculateFontSize = useCallback(() => {
    const container = containerRef.current;
    if (!container || !text || !mountedRef.current) return;

    const testElement = getOrCreateTestElement();

    // Copy relevant styles
    testElement.style.fontFamily = "'Rounded', system-ui, -apple-system, sans-serif";
    testElement.style.fontWeight = "700";
    testElement.style.lineHeight = "1.4";
    testElement.style.padding = "0";
    testElement.style.margin = "0";
    testElement.style.boxSizing = "border-box";

    // Get container dimensions
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Skip if no dimensions
    if (containerWidth <= 0 || containerHeight <= 0) {
      return false;
    }

    const targetWidth = containerWidth * widthMargin;
    const targetHeight = containerHeight * heightMargin;

    // Binary search for optimal font size
    let low = minSize;
    let high = maxSize;
    let optimalSize = minSize;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);

      testElement.style.fontSize = `${mid}${fontUnit}`;
      testElement.style.width = 'auto';
      testElement.style.maxWidth = `${targetWidth}px`;
      testElement.style.whiteSpace = 'pre-wrap';
      testElement.style.wordBreak = 'break-word';
      testElement.style.overflowWrap = 'break-word';
      testElement.textContent = text;

      const textWidth = testElement.scrollWidth;
      const textHeight = testElement.scrollHeight;
      const fits = textWidth <= targetWidth && textHeight <= targetHeight;

      if (fits) {
        optimalSize = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    setFontSize(optimalSize);
    return true;
  }, [text, minSize, maxSize, fontUnit, widthMargin, heightMargin, getOrCreateTestElement]);

  // Calculate on mount and text change - with retry for when container isn't ready
  useEffect(() => {
    if (!mountedRef.current) return;

    setHasCalculated(false);

    let retryCount = 0;
    const maxRetries = 10;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tryCalculate = () => {
      if (!mountedRef.current) return;

      const success = calculateFontSize();
      if (success) {
        setHasCalculated(true);
      } else if (retryCount < maxRetries) {
        retryCount++;
        timeoutId = setTimeout(tryCalculate, 50);
      }
    };

    // Small delay to ensure DOM is ready
    timeoutId = setTimeout(tryCalculate, 16);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [text, calculateFontSize]);

  // On desktop only: recalculate on resize (not on mobile to avoid thrashing)
  useEffect(() => {
    if (isMobileRef.current) return;
    if (!hasCalculated) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (mountedRef.current) {
          calculateFontSize();
        }
      }, 100);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [hasCalculated, calculateFontSize]);

  // Recalculate once fonts are ready
  useEffect(() => {
    if (!("fonts" in document)) return;
    let cancelled = false;

    document.fonts.ready.then(() => {
      if (!cancelled && mountedRef.current) {
        calculateFontSize();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [calculateFontSize]);

  return {
    fontSize: `${fontSize}${fontUnit}`,
    containerRef,
  };
}