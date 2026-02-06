"use client";

import {
  ScrollMode,
  SpecialZoomLevel,
  Viewer,
  Worker,
} from "@react-pdf-viewer/core";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import React, { useEffect, useRef } from "react";

// Styles (viewer text layer and layout)
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";

interface CitationPreviewProps {
  pdfUrl: string;
  pageNumber: number; // 1-based
  sourceText: string;
  documentId?: string; // Optional for future cross-document support
  onPreviewReady?: () => void; // Fires once when the page has rendered (canvas/text layer present)
}

const WORKER_URL =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

// Scoped styles so preview has no shadows/extra chrome and fills its box
const previewScopedStyles = `
.citation-preview,
.citation-preview * {
  box-shadow: none !important;
  filter: none !important;
  border: none !important;
  outline: none !important;
  /* Hide scrollbars aggressively (macOS overlay scrollbars included) */
  scrollbar-width: none !important; /* Firefox */
  -ms-overflow-style: none !important; /* IE/Edge legacy */
}
.citation-preview::-webkit-scrollbar,
.citation-preview *::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}
.citation-preview {
  background: transparent !important;
}
.citation-preview [class*="rpv-"],
.citation-preview [class*="rpv-"]::before,
.citation-preview [class*="rpv-"]::after,
.citation-preview [class*="rpv-"] canvas {
  box-shadow: none !important;
  filter: none !important;
}
.citation-preview .rpv-core__page-layer {
  border-radius: 0 !important;
  box-shadow: none !important;
  filter: none !important;
}
.citation-preview .rpv-core__viewer,
.citation-preview .rpv-core__viewer-body {
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
}
.citation-preview .rpv-core__viewer,
.citation-preview .rpv-core__viewer-body,
.citation-preview .rpv-core__inner-pages {
  /* Allow programmatic scrolling to the highlight region, but hide scrollbars */
  overflow: auto !important;
}
.citation-preview .rpv-core__inner-pages {
  margin: 0 !important;
  padding: 0 !important;
}
.citation-preview .rpv-core__page-layer,
.citation-preview .rpv-core__inner-page,
.citation-preview .rpv-core__text-layer {
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.citation-preview canvas {
  border-radius: 0 !important;
}
.citation-preview .citation-overlay {
  position: absolute !important;
  inset: 0;
  pointer-events: none !important;
  z-index: 50 !important; /* Above page layers */
}
.citation-preview .citation-highlighted {
  background-color: rgba(250, 213, 59, 0.85) !important;
  border-radius: 2px !important;
  padding: 0 1px !important;
  color: #000 !important;
  border: 1px solid rgba(250, 213, 59, 0.98) !important;
  box-shadow: 0 0 0 2px rgba(250, 213, 59, 0.35) !important;
  opacity: 1 !important;
}
`;

const HIGHLIGHT_FILL = "rgba(250, 213, 59, 0.85)";
const HIGHLIGHT_BORDER = "rgba(250, 213, 59, 0.98)";
const HIGHLIGHT_GLOW = "0 0 0 2px rgba(250, 213, 59, 0.35)";
const KEYWORD_HIGHLIGHT_LIMIT = 40;

const CitationPreview: React.FC<CitationPreviewProps> = ({
  pdfUrl,
  pageNumber,
  sourceText,
  documentId: _documentId, // Reserved for future cross-document resolution
  onPreviewReady,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Instantiate plugin at top level (per rules-of-hooks for plugin internals)
  const pagePluginInstance = pageNavigationPlugin();
  const { jumpToPage } = pagePluginInstance;
  const logPrefix = "[CitationPreview]";
  const didAutoFocusRef = useRef(false);
  const didCallReadyRef = useRef(false);
  const didLoadRef = useRef(false);
  const layoutSnapshotRef = useRef<{
    page: { top: number; left: number; width: number; height: number };
    span: { top: number; left: number; width: number; height: number } | null;
  } | null>(null);

  // Jump to the requested page on load
  const handleDocumentLoad = () => {
    didLoadRef.current = true;
    const targetIndex = Math.max(0, (pageNumber || 1) - 1);
    // Defer until viewer lays out the pages
    requestAnimationFrame(() => {
      try {
        console.log(
          logPrefix,
          "onDocumentLoad → jumping to page index",
          targetIndex,
          "url:",
          pdfUrl,
        );
      } catch { }
      jumpToPage(targetIndex);
    });
  };

  useEffect(() => {
    const targetIndex = Math.max(0, (pageNumber || 1) - 1);
    if (!didLoadRef.current) return;
    const attemptJump = () => {
      try {
        console.log(logPrefix, "pageNumber change → jumping to page index", targetIndex);
      } catch { }
      jumpToPage(targetIndex);
    };

    // Run a couple of times in case the viewer isn't ready yet.
    const timeouts: number[] = [];
    [0, 150, 350].forEach((delay) => {
      timeouts.push(window.setTimeout(attemptJump, delay));
    });
    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [pageNumber, jumpToPage]);

  // Notify parent when the preview has actually rendered (so the hover box can animate in then)
  useEffect(() => {
    didCallReadyRef.current = false;
    if (!onPreviewReady) return;
    const container = containerRef.current;
    if (!container) return;

    const targetIndex = Math.max(0, (pageNumber || 1) - 1);
    const getTargetPageLayer = () =>
      (container.querySelector(
        `[data-testid="core__page-layer-${targetIndex}"]`,
      ) as HTMLElement | null) ??
      (container.querySelector(".rpv-core__page-layer") as HTMLElement | null);
    const isRendered = () => {
      const pageLayer = getTargetPageLayer();
      const canvas = pageLayer?.querySelector("canvas") as HTMLCanvasElement | null;
      // canvas.width/height are set when rendered
      return !!canvas && canvas.width > 0 && canvas.height > 0;
    };

    const tryFire = () => {
      if (didCallReadyRef.current) return true;
      if (!isRendered()) return false;
      didCallReadyRef.current = true;
      try {
        onPreviewReady();
      } catch { }
      return true;
    };

    // Try a few times (pdf rendering is async)
    const timeouts: number[] = [];
    [0, 60, 120, 200, 350, 500, 800].forEach((delay) => {
      timeouts.push(
        window.setTimeout(() => {
          tryFire();
        }, delay),
      );
    });

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [pdfUrl, pageNumber, onPreviewReady]);

  // Highlight spans that match words from the source text (simple heuristic)
  useEffect(() => {
    try {
      console.log(logPrefix, "highlight effect start", {
        pageNumber,
        sourceText,
      });
    } catch { }
    didAutoFocusRef.current = false;
    layoutSnapshotRef.current = null;
    const container = containerRef.current;
    if (!container) return;

    const normalized = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const keywords = Array.from(
      new Set(
        normalized(sourceText)
          .split(" ")
          .filter((w) => w.length >= 4),
      ),
    );
    try {
      console.log(logPrefix, "keywords", keywords);
    } catch { }

    const phraseTokens = normalized(sourceText)
      .split(" ")
      .filter((t) => t.length > 0);
    let isHighlighting = false;

    const getTargetPageLayer = () => {
      const targetIndex = Math.max(0, (pageNumber || 1) - 1);
      const byTestId = container.querySelector(
        `[data-testid="core__page-layer-${targetIndex}"]`,
      ) as HTMLElement | null;
      if (byTestId) return byTestId;
      return container.querySelector(".rpv-core__page-layer") as HTMLElement | null;
    };

    const clearHighlights = () => {
      container.querySelectorAll(".citation-overlay").forEach((overlay) => {
        overlay.remove();
      });
      container.querySelectorAll<HTMLElement>(".citation-highlighted").forEach((span) => {
        span.classList.remove("citation-highlighted");
        span.style.removeProperty("background-color");
        span.style.removeProperty("box-shadow");
        span.style.removeProperty("border");
        span.style.removeProperty("opacity");
      });
    };

    const applyHighlightStyles = (mark: HTMLDivElement) => {
      mark.style.setProperty("background-color", HIGHLIGHT_FILL, "important");
      mark.style.setProperty("border", `1px solid ${HIGHLIGHT_BORDER}`, "important");
      mark.style.setProperty("border-radius", "3px", "important");
      mark.style.setProperty("box-shadow", HIGHLIGHT_GLOW, "important");
      mark.style.setProperty("opacity", "1", "important");
    };

    const groupRectsByLine = (rects: DOMRect[]) => {
      const groups: DOMRect[][] = [];
      const threshold = 6; // px tolerance for same line
      const sorted = rects
        .slice()
        .sort((a, b) => a.top - b.top || a.left - b.left);
      for (const r of sorted) {
        const last = groups[groups.length - 1];
        if (!last) {
          groups.push([r]);
          continue;
        }
        const lastTop = last[0].top;
        if (Math.abs(r.top - lastTop) <= threshold) {
          last.push(r);
        } else {
          groups.push([r]);
        }
      }
      return groups.map((g) => {
        const left = Math.min(...g.map((r) => r.left));
        const top = Math.min(...g.map((r) => r.top));
        const right = Math.max(...g.map((r) => r.right));
        const bottom = Math.max(...g.map((r) => r.bottom));
        return new DOMRect(left, top, right - left, bottom - top);
      });
    };

    const drawOverlay = (pageLayer: HTMLElement, rects: DOMRect[]) => {
      const merged = groupRectsByLine(rects);
      if (merged.length === 0) {
        return {
          totalMarks: 0,
          union: null as null | { left: number; top: number; right: number; bottom: number },
          overlay: null as HTMLDivElement | null,
          firstMark: null as HTMLDivElement | null,
        };
      }

      const overlay = document.createElement("div");
      overlay.className = "citation-overlay";
      overlay.style.position = "absolute";
      overlay.style.left = "0";
      overlay.style.top = "0";
      overlay.style.right = "0";
      overlay.style.bottom = "0";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "50"; // Above all page layers

      const pageLayerRect = pageLayer.getBoundingClientRect();
      let totalMarks = 0;
      let unionLeft = Number.POSITIVE_INFINITY;
      let unionTop = Number.POSITIVE_INFINITY;
      let unionRight = Number.NEGATIVE_INFINITY;
      let unionBottom = Number.NEGATIVE_INFINITY;

      let firstMark: HTMLDivElement | null = null;
      for (const m of merged) {
        const mark = document.createElement("div");
        mark.style.position = "absolute";
        mark.style.left = `${m.left - pageLayerRect.left}px`;
        mark.style.top = `${m.top - pageLayerRect.top}px`;
        mark.style.width = `${m.width}px`;
        mark.style.height = `${m.height}px`;
        mark.style.pointerEvents = "none";
        applyHighlightStyles(mark);
        overlay.appendChild(mark);
        if (!firstMark) firstMark = mark;
        totalMarks++;

        // Track union bounds in viewport coordinates (DOMRect is viewport-relative)
        unionLeft = Math.min(unionLeft, m.left);
        unionTop = Math.min(unionTop, m.top);
        unionRight = Math.max(unionRight, m.right);
        unionBottom = Math.max(unionBottom, m.bottom);
      }

      pageLayer.appendChild(overlay);
      return {
        totalMarks,
        union: { left: unionLeft, top: unionTop, right: unionRight, bottom: unionBottom },
        overlay,
        firstMark,
      };
    };

    const getScrollContainer = (startEl: HTMLElement) => {
      const viewerBody = startEl.closest(".rpv-core__viewer-body") as HTMLElement | null;
      if (viewerBody) return viewerBody;
      let node: HTMLElement | null = startEl;
      while (node && node !== container) {
        const style = window.getComputedStyle(node);
        const canScrollY = ["auto", "scroll"].includes(style.overflowY);
        const canScrollX = ["auto", "scroll"].includes(style.overflowX);
        if (
          (canScrollY && node.scrollHeight > node.clientHeight) ||
          (canScrollX && node.scrollWidth > node.clientWidth)
        ) {
          return node;
        }
        node = node.parentElement;
      }
      return (
        (container.querySelector(".rpv-core__viewer-body") as HTMLElement | null) ??
        (container.querySelector(".rpv-core__inner-pages") as HTMLElement | null) ??
        container
      );
    };

    const getOverlayUnion = (overlay: HTMLDivElement) => {
      const marks = Array.from(overlay.children) as HTMLElement[];
      if (marks.length === 0) return null;
      const rects = marks.map((mark) => mark.getBoundingClientRect());
      const left = Math.min(...rects.map((r) => r.left));
      const top = Math.min(...rects.map((r) => r.top));
      const right = Math.max(...rects.map((r) => r.right));
      const bottom = Math.max(...rects.map((r) => r.bottom));
      return { left, top, right, bottom };
    };

    const rectSnapshot = (rect: DOMRect) => ({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });

    const rectDelta = (
      a: { top: number; left: number; width: number; height: number },
      b: { top: number; left: number; width: number; height: number },
    ) =>
      Math.max(
        Math.abs(a.top - b.top),
        Math.abs(a.left - b.left),
        Math.abs(a.width - b.width),
        Math.abs(a.height - b.height),
      );

    const isLayoutStable = (pageLayer: HTMLElement | null, span: HTMLElement | null) => {
      if (!pageLayer || !span) return false;
      const pageRect = rectSnapshot(pageLayer.getBoundingClientRect());
      const spanRect = rectSnapshot(span.getBoundingClientRect());
      const next = { page: pageRect, span: spanRect };
      const prev = layoutSnapshotRef.current;
      layoutSnapshotRef.current = next;
      if (!prev || !prev.span) {
        return false;
      }
      const pageDelta = rectDelta(prev.page, next.page);
      const spanDelta = rectDelta(prev.span, next.span);
      return Math.max(pageDelta, spanDelta) <= 0.75;
    };

    const centerOnUnion = (
      scrollEl: HTMLElement,
      union: { left: number; top: number; right: number; bottom: number } | null,
    ) => {
      if (!union) return;
      const scrollRect = scrollEl.getBoundingClientRect();
      const centerX = (union.left + union.right) / 2;
      const centerY = (union.top + union.bottom) / 2;
      // Convert viewport coords to scroll content coords
      const contentX = centerX - scrollRect.left + scrollEl.scrollLeft;
      const contentY = centerY - scrollRect.top + scrollEl.scrollTop;

      const desiredLeft = contentX - scrollRect.width / 2;
      const desiredTop = contentY - scrollRect.height / 2;

      // Clamp to valid scroll ranges
      const maxLeft = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
      const maxTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);

      scrollEl.scrollTo({
        left: Math.max(0, Math.min(maxLeft, desiredLeft)),
        top: Math.max(0, Math.min(maxTop, desiredTop)),
        behavior: "auto",
      });
    };

    const centerOnMark = (mark: HTMLElement, scrollEl: HTMLElement) => {
      try {
        if (typeof mark.scrollIntoView === "function") {
          mark.scrollIntoView({
            block: "center",
            inline: "center",
            behavior: "auto",
          });
          return true;
        }
      } catch { }
      const union = getOverlayUnion(mark.parentElement as HTMLDivElement);
      if (union) {
        centerOnUnion(scrollEl, union);
        return true;
      }
      return false;
    };

    const autoFocusOnUnion = (
      scrollEl: HTMLElement,
      overlay: HTMLDivElement | null,
      firstMark: HTMLDivElement | null,
      union: { left: number; top: number; right: number; bottom: number } | null,
    ) => {
      if (!union || didAutoFocusRef.current) return;
      didAutoFocusRef.current = true;

      const attemptCenter = () => {
        try {
          if (firstMark && centerOnMark(firstMark, scrollEl)) return;
          const overlayUnion = overlay ? getOverlayUnion(overlay) : null;
          centerOnUnion(scrollEl, overlayUnion ?? union);
        } catch { }
      };

      // Run multiple times to handle late layout/scroll adjustments
      [0, 80, 180, 350].forEach((delay) => {
        window.setTimeout(attemptCenter, delay);
      });
    };

    const runHighlight = () => {
      if (isHighlighting) return false;
      isHighlighting = true;
      try {
        const targetPageLayer = getTargetPageLayer();
        const targetTextLayer = targetPageLayer?.querySelector(
          ".rpv-core__text-layer",
        ) as HTMLElement | null;
        const scrollEl = getScrollContainer(targetPageLayer ?? container);
        const textLayers = targetTextLayer
          ? [targetTextLayer]
          : (Array.from(
            container.querySelectorAll(".rpv-core__text-layer"),
          ) as HTMLElement[]);
        if (textLayers.length === 0) {
          console.log(logPrefix, "no text layers found yet");
          return false;
        }
        console.log(logPrefix, "found text layers:", textLayers.length);

        const sampleSpan = (targetTextLayer?.querySelector("span") as HTMLElement | null) ??
          (textLayers[0]?.querySelector("span") as HTMLElement | null);
        const pageLayerForStability =
          targetPageLayer ??
          (sampleSpan?.closest(".rpv-core__page-layer") as HTMLElement | null);
        if (!isLayoutStable(pageLayerForStability, sampleSpan)) {
          console.log(logPrefix, "layout not stable yet; retrying");
          return false;
        }

        clearHighlights();

        // Choose best layer by phrase sequence match count
        const layerScores: Array<{
          layer: HTMLElement;
          matches: Array<DOMRect[]>;
          score: number;
        }> = [];

        for (const layer of textLayers) {
          const allSpans = Array.from(
            layer.querySelectorAll("span"),
          ) as HTMLSpanElement[];
          if (allSpans.length === 0) {
            console.log(logPrefix, "layer has no spans");
            continue;
          }

          // Build token stream from spans
          type Token = { norm: string; rect: DOMRect };
          const tokens: Token[] = [];
          for (const span of allSpans) {
            const text = span.textContent || "";
            const rect = span.getBoundingClientRect();
            const words = text.split(/\s+/).filter(Boolean);
            for (const w of words) {
              const normW = normalized(w);
              if (normW.length > 0) {
                tokens.push({ norm: normW, rect });
              }
            }
          }
          const norms = tokens.map((t) => t.norm);
          const L = phraseTokens.length;
          const matchesRects: Array<DOMRect[]> = [];
          if (L > 0 && norms.length >= L) {
            for (let i = 0; i <= norms.length - L; i++) {
              let ok = true;
              for (let j = 0; j < L; j++) {
                if (norms[i + j] !== phraseTokens[j]) {
                  ok = false;
                  break;
                }
              }
              if (ok) {
                // Collect rects for matched token span rectangles
                const rects = tokens.slice(i, i + L).map((t) => t.rect);
                matchesRects.push(rects);
              }
            }
          }
          // Score by number of tokens matched
          const score = matchesRects.reduce((acc, r) => acc + r.length, 0);
          layerScores.push({ layer, matches: matchesRects, score });
          console.log(
            logPrefix,
            "layer token count:",
            norms.length,
            "phrase tokens:",
            L,
            "score:",
            score,
          );
        }

        // Pick layer with best score
        layerScores.sort((a, b) => b.score - a.score);
        const best = layerScores[0];
        if (best && best.score > 0) {
          // Draw overlay rectangles for best layer matches, grouping per line
          const pageLayer = best.layer.closest(
            ".rpv-core__page-layer",
          ) as HTMLElement | null;
          if (!pageLayer) {
            console.log(logPrefix, "no page layer found");
            return false;
          }

          const flatRects = best.matches.flat();
          const { totalMarks, union, overlay, firstMark } = drawOverlay(pageLayer, flatRects);
          console.log(logPrefix, "overlay marks drawn:", totalMarks);
          if (totalMarks > 0) {
            autoFocusOnUnion(scrollEl, overlay, firstMark, union);
          }
          return totalMarks > 0;
        }

        // Fallback: no sequence match; use keyword overlay on best layer
        if (keywords.length === 0) {
          console.log(logPrefix, "no keywords available for fallback");
          return false;
        }

        const keywordScores = textLayers.map((layer) => {
          const spans = Array.from(layer.querySelectorAll("span")) as HTMLSpanElement[];
          const rects = spans
            .map((span) => ({
              text: normalized(span.textContent || ""),
              rect: span.getBoundingClientRect(),
            }))
            .filter(({ text }) => text.length > 0 && keywords.some((k) => text.includes(k)))
            .map(({ rect }) => rect);
          return { layer, rects, score: rects.length };
        });

        keywordScores.sort((a, b) => b.score - a.score);
        const bestKeyword = keywordScores[0];
        if (!bestKeyword || bestKeyword.rects.length === 0) {
          console.log(logPrefix, "no keyword matches found");
          return false;
        }

        const pageLayer = bestKeyword.layer.closest(
          ".rpv-core__page-layer",
        ) as HTMLElement | null;
        if (!pageLayer) {
          console.log(logPrefix, "no page layer found for keyword fallback");
          return false;
        }

        const limitedRects = bestKeyword.rects.slice(0, KEYWORD_HIGHLIGHT_LIMIT);
        const { totalMarks, union, overlay, firstMark } = drawOverlay(pageLayer, limitedRects);
        console.log(
          logPrefix,
          "keyword overlay marks drawn:",
          totalMarks,
          "limited to",
          limitedRects.length,
        );
        if (totalMarks > 0) {
          autoFocusOnUnion(scrollEl, overlay, firstMark, union);
        }
        return totalMarks > 0;
      } catch {
        console.log(logPrefix, "runHighlight error");
        return false;
      } finally {
        isHighlighting = false;
      }
    };

    // Try a few times in case the page/text layer renders asynchronously
    const timeouts: number[] = [];
    [120, 300, 700, 1200, 1800, 2600, 3400].forEach((delay) => {
      console.log(logPrefix, "schedule highlight attempt in", delay, "ms");
      timeouts.push(window.setTimeout(runHighlight, delay));
    });
    // Re-run when page changes (custom event fired from onPageChange)
    const handlePageEvent = () => {
      window.setTimeout(runHighlight, 150);
    };
    container.addEventListener(
      "citation-preview-page-change",
      handlePageEvent as EventListener,
    );

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
      container.removeEventListener(
        "citation-preview-page-change",
        handlePageEvent as EventListener,
      );
    };
  }, [pageNumber, sourceText]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden citation-preview"
    >
      <style dangerouslySetInnerHTML={{ __html: previewScopedStyles }} />
      <Worker workerUrl={WORKER_URL}>
        <Viewer
          fileUrl={pdfUrl}
          plugins={[pagePluginInstance]}
          // Use a tighter default zoom for readability in a 320×240 hover card.
          // We then auto-pan to the highlight region.
          defaultScale={SpecialZoomLevel.PageWidth}
          scrollMode={ScrollMode.Page}
          enableSmoothScroll={false}
          onDocumentLoad={handleDocumentLoad}
          onPageChange={() => {
            // Re-run highlight when page changes inside the preview
            const container = containerRef.current;
            if (!container) return;
            // small delay to allow text layer to update
            console.log(logPrefix, "onPageChange");
            window.setTimeout(() => {
              try {
                const event = new Event("citation-preview-page-change");
                container.dispatchEvent(event);
              } catch { }
            }, 100);
          }}
        />
      </Worker>
      <div className="absolute bottom-0 left-0 right-0 bg-white text-[14px] text-black p-4 italic">
        <span className="font-medium">Page {pageNumber}:</span> "{sourceText}"
      </div>
    </div>
  );
};

export default CitationPreview;
