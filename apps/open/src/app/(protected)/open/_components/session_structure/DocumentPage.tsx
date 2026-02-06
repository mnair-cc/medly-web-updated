"use client";

import {
  ScrollMode,
  SpecialZoomLevel,
  Viewer,
  Worker,
  type PageLayout,
} from "@react-pdf-viewer/core";
import {
  highlightPlugin,
  RenderHighlightsProps,
  RenderHighlightTargetProps,
} from "@react-pdf-viewer/highlight";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { scrollModePlugin } from "@react-pdf-viewer/scroll-mode";
import { thumbnailPlugin } from "@react-pdf-viewer/thumbnail";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";
import "@react-pdf-viewer/thumbnail/lib/styles/index.css";

import {
  useAiChat,
  useRegisterCapability,
  useRegisterContextCollector,
} from "@/app/(protected)/open/_components/chat/MOChatLayoutClient";
import { useSidebar } from "@/app/(protected)/open/_components/sidebar/MOSidebarLayoutClient";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { applyWhiteOverlay } from "@/app/_lib/utils/colorUtils";
import {
  DocumentNote,
  PageTextData,
} from "@/app/(protected)/open/_hooks/useSessionOpen";
import { captureHybridScreenshot } from "@/app/(protected)/open/_utils/captureHybridScreenshot";
import { domToDataUrl } from "modern-screenshot";
import ShimmerEffect from "@/app/(protected)/sessions/components/question-components/canvas/ShimmerEffect";
import SketchCanvas from "@/app/(protected)/sessions/components/question-components/canvas/SketchCanvas";
import { InputMode, TextbookContent } from "@/app/(protected)/sessions/types";
import ArrowWithTailUpIcon from "@/app/_components/icons/ArrowWithTailUpIcon";
import Spinner from "@/app/_components/Spinner";
import { Canvas, TextboxData } from "@/app/types/types";
import DragTutorialModal from "@/app/(protected)/open/_components/DragTutorialModal";
import { useResponsive } from "@/app/_hooks/useResponsive";

// Sidebar position: "left" for vertical sidebar, "bottom" for horizontal row
const SIDEBAR_POSITION: "left" | "bottom" = "bottom";
const THUMBNAIL_BAR_HEIGHT = 120; // px - height of bottom thumbnail bar

// Scroll mode: "page" for page-by-page navigation, "scroll" for continuous scrolling
// When "scroll", even landscape docs are scrollable instead of page-by-page
const SCROLL_MODE: "page" | "scroll" = "scroll";

// Show/hide thumbnail bar
const SHOW_THUMBNAILS = false;

// Global CSS overrides for react-pdf-viewer (injected on client only)
const rpvGlobalStyles = `
  .rpv-core__page-layer,
  .rpv-core__inner-page,
  .rpv-core__canvas-layer,
  .rpv-core__text-layer,
  .rpv-core__viewer,
  .rpv-core__viewer-body,
  [class*="rpv-"] canvas,
  [class*="rpv-"],
  [class*="rpv-"]::before,
  [class*="rpv-"]::after {
    box-shadow: none !important;
  }
  .rpv-core__page-layer {
    border-radius: 16px !important;
    overflow: hidden !important;
    // box-shadow: 0 0px 10px rgba(0, 0, 0, 0.1) !important;
  }
  .rpv-core__canvas-layer canvas {
    border-radius: 16px !important;
  }

  /* Top and bottom padding for pages */
  .rpv-core__inner-page {
    margin-top: 60px !important;
    margin-bottom: 60px !important;
  }

  /* Thumbnail styling */
  .rpv-thumbnail__container {
    border-radius: 4px !important;
    overflow: hidden !important;
    border: 1px solid #F2F2F7 !important;
  }
  .rpv-thumbnail__item {
    border-radius: 6px !important;
  }
  .rpv-thumbnail__item canvas {
    border-radius: 6px !important;
  }
  .rpv-thumbnail__item:hover,
  .rpv-thumbnail__item--selected {
    background-color: #f2f2f7 !important;
  }
  .rpv-thumbnail__label {
    font-family: var(--font-sf-pro-rounded-bold) !important;
    border-radius: 4px !important;
    color: #595959 !important;
  }
  .rpv-thumbnail__item--selected .rpv-thumbnail__label {
    color: #000000 !important;
  }

  /* Horizontal thumbnail bar styles */
  .rpv-thumbnail-horizontal .rpv-thumbnail__list {
    display: flex !important;
    flex-direction: row !important;
    gap: 8px !important;
    padding: 8px 12px !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  .rpv-thumbnail-horizontal .rpv-thumbnail__list::-webkit-scrollbar {
    display: none !important;
  }
  .rpv-thumbnail-horizontal .rpv-thumbnail__item {
    flex-shrink: 0 !important;
    margin: 0 !important;
  }

  /* Hide default spinner */
  .rpv-core__spinner {
    display: none !important;
  }


  /* Selected text color */
  .rpv-core__viewer ::selection {
    background-color: #05B0FF !important;
  }

  /* Highlight area fade-in animation */
  @keyframes highlightFadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 0.2;
      transform: scale(1);
    }
  }

  .highlight-area-fade {
    animation: highlightFadeIn 0.15s ease-out;
  }

  /* Hide duplicate page layers instantly to prevent flash */
  .rpv-core__page-layer {
    transition: none !important;
  }

  /* Mark first occurrence of each page */
  .rpv-core__page-layer[data-testid] {
    position: relative;
  }

  /* Hide all page layers initially, then show via JS after deduplication check */
  .rpv-core__page-layer.rpv-duplicate-check {
    opacity: 0 !important;
    pointer-events: none !important;
  }

  .rpv-core__page-layer.rpv-verified {
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  /* Portrait mode color overlay - pre-computed color matching background, uses multiply blend */
  .rpv-portrait-mode .rpv-core__page-layer::after {
    content: "" !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    background-color: var(--portrait-overlay-color, #E6F6FF) !important;
    mix-blend-mode: multiply !important;
    border-radius: 16px !important;
    pointer-events: none !important;
    z-index: 5 !important;
  }
`;

interface DocumentPageProps {
  content: TextbookContent;
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
  documentNotes?: { [page: number]: string };
  updateDocumentNotes?: (pageNumber: number, notes: string) => void;
  documentCanvases?: { [page: number]: Canvas };
  updateDocumentCanvas?: (pageNumber: number, canvas: Canvas) => void;
  documentHighlights?: { [page: number]: DocumentNote[] };
  updateDocumentHighlights?: (
    pageNumber: number,
    highlights: DocumentNote[],
  ) => void;
  highlightArea?: {
    label: string;
    box_2d: [number, number, number, number];
    show: boolean;
  } | null;
  onPdfPageChange?: (pageNumber: number) => void;
  // Optional: request a jump to a specific PDF page (1-based)
  targetPdfPage?: number | null;
  // Optional: flash highlight this text briefly once on the page (under text)
  flashHighlightText?: string | null;
  flashHighlightPage?: number | null;
  // Optional: document metadata for thumbnail generation
  documentId?: string;
  thumbnailUrl?: string;
  documentName?: string;
  updateDocumentName?: (name: string) => void;
  // Optional: expose addComment function via ref
  setAddCommentRef?: (
    fn: ((text: string, comment: string) => Promise<void>) | null,
  ) => void;
  // Optional: indicates if this page is currently visible (used to clear selections when hidden)
  isVisible?: boolean;
  // Optional: translation mode - when true, shows translated text overlay
  showTranslation?: boolean;
  // Optional: translated text data per page - maps page number to array of {original, translated} pairs
  // If not provided and showTranslation is true, will use dummy translation
  translatedText?: {
    [page: number]: Array<{ original: string; translated: string }>;
  };
  // Callback when document orientation changes (landscape vs portrait)
  onLandscapeChange?: (isLandscape: boolean) => void;
  // Bottom padding to avoid toolbar overlap
  toolbarHeight?: number;
}

const DocumentPage = ({
  content,
  inputMode,
  setInputMode,
  documentNotes,
  updateDocumentNotes,
  documentCanvases,
  updateDocumentCanvas,
  documentHighlights,
  updateDocumentHighlights,
  highlightArea,
  onPdfPageChange,
  targetPdfPage,
  flashHighlightText,
  flashHighlightPage,
  documentId,
  thumbnailUrl,
  documentName,
  updateDocumentName,
  setAddCommentRef,
  isVisible = true,
  showTranslation = false,
  translatedText,
  onLandscapeChange,
  toolbarHeight = 0,
}: DocumentPageProps) => {
  const { isWideScreen } = useResponsive();
  // ----------------------------------------
  // Chat context integration (context-only, no props)
  // ----------------------------------------
  const {
    sendMessage,
    updateSelectedText,
    selectedScreenshot,
    updateSelectedScreenshot,
    isAwaitingResponse,
  } = useAiChat();

  // Get collection color for portrait overlay (pre-computed to match background exactly)
  const { collections, documents: allDocuments } = useSidebar();
  const { track } = useTracking();
  const portraitOverlayColor = useMemo(() => {
    const defaultColor = applyWhiteOverlay("#41C3FF", 0.9);
    if (!documentId) return defaultColor;
    const doc = allDocuments.find((d) => d.id === documentId);
    if (!doc?.collectionId) return defaultColor;
    const collection = collections.find((c) => c.id === doc.collectionId);
    const primaryColor = collection?.primaryColor || "#41C3FF";
    return applyWhiteOverlay(primaryColor, 0.9);
  }, [documentId, allDocuments, collections]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLandscape, setIsLandscape] = useState(true); // Default to landscape for initial render

  // localStorage key for tracking if user has ever dragged a screenshot
  const LOCALSTORAGE_KEY_HAS_DRAGGED = "medly_open_has_dragged_screenshot";

  // Initialize to false to avoid hydration mismatch, then check localStorage after mount
  const [hasDraggedScreenshot, setHasDraggedScreenshot] = useState<boolean>(false);

  // Check localStorage after mount for hasDraggedScreenshot
  useEffect(() => {
    try {
      const hasDragged = localStorage.getItem(LOCALSTORAGE_KEY_HAS_DRAGGED) === "true";
      if (hasDragged) {
        setHasDraggedScreenshot(true);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Mouse position for "Drag to take a screenshot" tooltip
  const [tooltipMousePos, setTooltipMousePos] = useState<{ x: number; y: number } | null>(null);

  // Drag tutorial modal state
  const LOCALSTORAGE_KEY_MODAL_SEEN = "open_drag_tutorial_modal_seen";

  // Initialize to false to avoid hydration mismatch, then check localStorage after mount
  const [showDragTutorialModal, setShowDragTutorialModal] = useState<boolean>(false);

  // Check localStorage after mount to show modal for first-time users
  useEffect(() => {
    try {
      const hasSeenModal = localStorage.getItem(LOCALSTORAGE_KEY_MODAL_SEEN) === "true";
      if (!hasSeenModal) {
        setShowDragTutorialModal(true);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Handle modal completion
  const handleDragTutorialComplete = useCallback(() => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY_MODAL_SEEN, "true");
    } catch {
      // localStorage not available
    }
    setShowDragTutorialModal(false);
  }, []);

  // Notify parent when landscape orientation changes
  useEffect(() => {
    onLandscapeChange?.(isLandscape);
  }, [isLandscape, onLandscapeChange]);

  // Local state for page text - extracted fresh from PDF each time
  // No need for persistence since it's derived from the PDF content
  const [localAllPagesText, setLocalAllPagesText] = useState<PageTextData[]>([]);
  const [localCurrentPageText, setLocalCurrentPageText] = useState<string>("");

  // Sync localCurrentPageText when page changes (derive from localAllPagesText if available)
  useEffect(() => {
    const pageData = localAllPagesText.find((p) => p.page === currentPage);
    if (pageData) {
      setLocalCurrentPageText(pageData.text);
    }
  }, [currentPage, localAllPagesText]);

  const scrollAccumulatorRef = useRef(0);

  // Inject react-pdf-viewer style overrides on mount (client-only)
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = rpvGlobalStyles;
    document.head.appendChild(styleEl);
    return () => {
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, []);

  // Inject dynamic bottom padding for toolbar - only pad the scroll container, not each page
  useEffect(() => {
    // First remove any existing style with this ID to prevent duplicates
    const existingStyle = document.getElementById("rpv-toolbar-padding");
    if (existingStyle) {
      existingStyle.remove();
    }

    if (toolbarHeight === 0) return;

    const dynamicStyleEl = document.createElement("style");
    dynamicStyleEl.id = "rpv-toolbar-padding";
    dynamicStyleEl.textContent = `
      /* Add padding to the scroll container so last page can scroll above toolbar */
      .rpv-core__inner-pages {
        padding-bottom: ${toolbarHeight}px !important;
      }
    `;
    document.head.appendChild(dynamicStyleEl);
    return () => {
      if (dynamicStyleEl.parentNode) {
        dynamicStyleEl.parentNode.removeChild(dynamicStyleEl);
      }
    };
  }, [toolbarHeight]);

  // Also apply padding directly via JS as a fallback
  useEffect(() => {
    if (toolbarHeight === 0) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const applyPadding = () => {
      const innerPages = container.querySelector('.rpv-core__inner-pages') as HTMLElement;
      if (innerPages) {
        innerPages.style.paddingBottom = `${toolbarHeight}px`;
      }
    };

    // Apply after a delay to handle async rendering
    const timeoutId = setTimeout(applyPadding, 500);

    return () => clearTimeout(timeoutId);
  }, [toolbarHeight]);

  // Add global error handler to catch Range manipulation errors from highlight plugin
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Catch IndexSizeError from react-pdf-viewer highlight plugin
      if (
        event.message?.includes("IndexSizeError") ||
        event.message?.includes("setStart") ||
        event.message?.includes("setEnd") ||
        event.message?.includes("no child at offset")
      ) {
        console.warn(
          "🔴 Caught highlight Range error (suppressed):",
          event.message,
        );
        event.preventDefault(); // Prevent error from breaking the UI
        // Cleanup any duplicate layers that may have been created (immediate via rAF)
        requestAnimationFrame(() => {
          const container = scrollContainerRef.current;
          if (!container) return;
          const pageLayers = container.querySelectorAll(
            ".rpv-core__page-layer",
          );
          const seenPages = new Map<string, Element>();
          pageLayers.forEach((layer) => {
            const testId = layer.getAttribute("data-testid");
            if (!testId) return;
            if (seenPages.has(testId)) {
              // Hide immediately then remove
              (layer as HTMLElement).classList.add("rpv-duplicate-check");
              layer.remove();
              console.log("🗑️ Cleaned up duplicate after error");
            } else {
              seenPages.set(testId, layer);
              (layer as HTMLElement).classList.add("rpv-verified");
            }
          });
        });
        return true;
      }
    };

    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("error", handleError);
    };
  }, []);

  // Highlight data structures matching documentation
  interface HighlightArea {
    height: number;
    left: number;
    pageIndex: number;
    top: number;
    width: number;
  }

  interface Note {
    id: number;
    content: string;
    highlightAreas: HighlightArea[];
    quote: string;
  }

  // Initialize notes from documentHighlights if available
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const noteIdCounter = useRef(0);
  const lastSentNotesRef = useRef<{ [page: number]: Note[] }>({});
  const lastSyncedPageRef = useRef<number | null>(null);
  const isUserEditingNotesRef = useRef(false);
  const [currentSelectionNote, setCurrentSelectionNote] = useState<Note | null>(
    null,
  );
  const lastSelectedTextSentRef = useRef<string | null>(null);
  const lastSelectionKeyGlobalRef = useRef<string | null>(null);
  const suppressNextSelectionClearRef = useRef<boolean>(false);
  const [unsavedNoteIds, setUnsavedNoteIds] = useState<Set<number>>(new Set());
  const [hoveredCommentId, setHoveredCommentId] = useState<number | null>(null);
  const [focusCommentId, setFocusCommentId] = useState<number | null>(null);
  const commentSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [highlightMenuPosition, setHighlightMenuPosition] = useState<{
    left: number;
    top: number;
    noteId: number;
  } | null>(null);
  const highlightMenuRef = useRef<HTMLDivElement>(null);

  // AI-controlled highlight area overlay (persists until cleared or overwritten)
  const [aiHighlightArea, setAiHighlightArea] = useState<{
    label: string;
    box_2d: [number, number, number, number];
    show: boolean;
  } | null>(null);

  // Test UI state for addComment
  const [testText, setTestText] = useState("");
  const [testComment, setTestComment] = useState("");

  // Selection box state (for click-and-drag selection in select mode)
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const selectionBoxRef = useRef(selectionBox); // Ref to track current value for async access
  const [selectionPreview, setSelectionPreview] = useState<{
    baseDataUrl: string;
    overlayDataUrl: string;
    compositeDataUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Completed selection box (persists after drawing until dismissed)
  // Includes page number so it only shows on the page where it was drawn
  const [completedSelectionBox, setCompletedSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  } | null>(null);
  const completedSelectionBoxRef = useRef(completedSelectionBox);

  // Translation overlay: store extracted span info from text layer
  const [translationSpans, setTranslationSpans] = useState<
    Array<{
      text: string;
      left: number;
      top: number;
      fontSize: number;
      transform: string;
      fontFamily: string;
    }>
  >([]);

  // Keep refs in sync with state
  useEffect(() => {
    selectionBoxRef.current = selectionBox;
  }, [selectionBox]);

  useEffect(() => {
    completedSelectionBoxRef.current = completedSelectionBox;
  }, [completedSelectionBox]);

  // Helper: apply and immediately persist user-initiated changes to notes
  const applyUserNotesUpdate = useCallback(
    (getNext: (prev: Note[]) => Note[], pageOverride?: number) => {
      const targetPage =
        typeof pageOverride === "number" ? pageOverride : currentPage;
      if (!updateDocumentHighlights) {
        console.warn(
          "⚠️ applyUserNotesUpdate: no updateDocumentHighlights provided",
        );
        setNotes(getNext);
        return;
      }
      isUserEditingNotesRef.current = true;
      setNotes((prev) => {
        const next = getNext(prev);
        // Update last sent snapshot to prevent effect from re-sending
        lastSentNotesRef.current[targetPage] = [...next];
        console.log("💾 [commit] Persisting notes immediately", {
          page: targetPage,
          count: next.length,
          quotes: next.map((n) => n.quote),
        });
        updateDocumentHighlights(targetPage, next);
        // Reset user-edit flag for this commit path
        isUserEditingNotesRef.current = false;
        return next;
      });
    },
    [currentPage, updateDocumentHighlights],
  );

  // Sync notes with documentHighlights when page changes
  useEffect(() => {
    // Reset synced page flag when page changes
    lastSyncedPageRef.current = null;
    // Any change due to page navigation is not a user edit
    isUserEditingNotesRef.current = false;
    console.log("🔄 [page-change] ->", {
      currentPage,
      hasDocHighlights: !!documentHighlights,
    });

    const hasKey =
      !!documentHighlights &&
      Object.prototype.hasOwnProperty.call(documentHighlights, currentPage);

    if (hasKey) {
      const propsNotes = ((documentHighlights as any)[currentPage] ||
        []) as Note[];
      // Compare local state against props to ensure they match (catches stale local state)
      const localNotesStr = JSON.stringify(notes);
      const propsNotesStr = JSON.stringify(propsNotes);

      if (localNotesStr !== propsNotesStr) {
        // Syncing from props, not a user-driven change
        isUserEditingNotesRef.current = false;
        console.log(
          "📥 [sync-from-props] page",
          currentPage,
          "notes:",
          propsNotes.length,
          propsNotes.map((n: Note) => n.quote),
        );
        setNotes(propsNotes);
        // Update noteIdCounter to avoid conflicts
        const maxId = Math.max(...propsNotes.map((n: Note) => n.id), 0);
        noteIdCounter.current = maxId;
        // Update lastSentNotesRef to match what we just synced (to prevent circular update)
        lastSentNotesRef.current[currentPage] = [...propsNotes]; // Create a copy
        lastSyncedPageRef.current = currentPage;
        console.log("✅ [synced] page", currentPage);
      } else {
        // Even if same, mark as synced
        lastSyncedPageRef.current = currentPage;
        console.log(
          "📎 [synced-nochange] page",
          currentPage,
          "count",
          propsNotes.length,
        );
      }
    } else {
      // No props yet for this page; avoid clearing local notes to prevent flicker/accidental wipes
      // Keep lastSyncedPageRef null to avoid propagating local changes for this page until props arrive
      console.log(
        "📭 [awaiting-props] page",
        currentPage,
        "no entry in documentHighlights",
      );
    }
  }, [currentPage]); // Only depend on currentPage

  // Update documentHighlights when notes change (but track what we sent to avoid circular updates)
  useEffect(() => {
    // Only update if we're on a synced page
    if (updateDocumentHighlights && lastSyncedPageRef.current === currentPage) {
      // Only propagate user-driven edits; prevents clearing on rapid page switches
      if (!isUserEditingNotesRef.current) {
        console.log("⏭️ [notes->store] skip (not user edit)", {
          currentPage,
          lastSyncedPage: lastSyncedPageRef.current,
          notes: notes.length,
        });
        return;
      }
      // Check if notes actually changed from what we last sent
      const lastSent = lastSentNotesRef.current[currentPage] || [];
      const lastSentStr = JSON.stringify(lastSent);
      const currentNotesStr = JSON.stringify(notes);

      if (lastSentStr !== currentNotesStr) {
        // Store what we're about to send
        lastSentNotesRef.current[currentPage] = [...notes]; // Create a copy
        console.log("💾 [notes->store] persisting (effect)", {
          page: currentPage,
          count: notes.length,
          quotes: notes.map((n) => n.quote),
        });
        updateDocumentHighlights(currentPage, notes);
        console.log(
          "📝 Updated documentHighlights for page",
          currentPage,
          "with",
          notes.length,
          "notes:",
          notes.map((n) => n.quote),
        );
        // Reset the user edit flag after persisting
        isUserEditingNotesRef.current = false;
      } else {
        console.log("🔁 [notes->store] no change detected", {
          page: currentPage,
          count: notes.length,
        });
      }
    }
  }, [notes, currentPage, updateDocumentHighlights]);

  // Grab mode scrolling state
  const [isDraggingPage, setIsDraggingPage] = useState(false);
  const dragStartScrollPos = useRef({ x: 0, y: 0, scrollTop: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const commentsOverlayRef = useRef<HTMLDivElement>(null);

  // Thumbnail bar drag scrolling state (for bottom horizontal layout)
  const thumbnailBarRef = useRef<HTMLDivElement>(null);
  const [isDraggingThumbnails, setIsDraggingThumbnails] = useState(false);
  const thumbnailDragStart = useRef({ x: 0, scrollLeft: 0 });

  // Textarea resize state
  const [textareaHeight, setTextareaHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ y: 0, height: 0 });

  // Show loading state if no content available
  if (!content || content.trim() === "") {
    return (
      <div className="flex-1 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Spinner />
        </div>
      </div>
    );
  }

  // Use content prop if provided, otherwise fallback to hardcoded PDF
  const url =
    content || "/assets/Applied_statistics_lecture_24_25_moodle_live_oct24.pdf";

  // Extract text from a specific page
  const extractTextFromPage = async (doc: any, pageNum: number) => {
    try {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(" ");
      console.log(`Page ${pageNum} text:`, text);
      if (pageNum === currentPage) {
        // Update local state for context collection
        setLocalCurrentPageText(text);
      }
      return text;
    } catch (error) {
      console.error(`Error extracting text from page ${pageNum}:`, error);
      return "";
    }
  };

  // Extract text from all pages
  const extractAllPagesText = async (doc: any) => {
    try {
      const numPages = doc.numPages;
      console.log(`Extracting text from all ${numPages} pages...`);

      const allText = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        allText.push({ page: i, text: pageText });
      }

      console.log("All pages text:", allText);
      // Update local state for context collection
      setLocalAllPagesText(allText);
      return allText;
    } catch (error) {
      console.error("Error extracting all pages text:", error);
      return [];
    }
  };

  // Render highlights on pages (matching documentation)
  const renderHighlights = (props: RenderHighlightsProps) => {
    // Use persisted highlights for the specific page being rendered to avoid flicker
    const pageNumber = props.pageIndex + 1; // persisted map is 1-based
    const persistedForPage =
      documentHighlights && documentHighlights[pageNumber]
        ? (documentHighlights[pageNumber] as unknown as Note[])
        : [];
    // For the current page, also include local notes for instant feedback
    const localForPage = pageNumber === currentPage ? notes : [];
    // Merge by id (prefer local entries)
    const merged = new Map<number, Note>();
    for (const n of persistedForPage) merged.set(n.id, n as Note);
    for (const n of localForPage) merged.set(n.id, n);
    const currentPageNotes = Array.from(merged.values()).filter((note) =>
      note.highlightAreas.some((area) => area.pageIndex === props.pageIndex),
    );

    return (
      <div>
        {currentPageNotes.map((note) => (
          <React.Fragment key={note.id}>
            {note.highlightAreas
              // Filter all highlights on the current page
              .filter((area) => area.pageIndex === props.pageIndex)
              .map((area, idx) => {
                const isSelected = selectedNoteId === note.id;
                const isHovered = hoveredCommentId === note.id;

                return (
                  <React.Fragment key={idx}>
                    <div
                      className="cursor-pointer"
                      style={{
                        ...props.getCssProperties(area, props.rotation),
                        backgroundColor: "#FAD53B",
                        opacity: isHovered ? 0.7 : 0.4,
                        mixBlendMode: "multiply",
                        pointerEvents: "auto",
                        zIndex: 10,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedNoteId(isSelected ? null : note.id);
                        // Update selected text when clicking on a highlight
                        if (!isSelected) {
                          updateSelectedText(note.quote);
                        }
                      }}
                    />

                    {/* Menu for selected highlight - rendered via portal (see below) */}
                  </React.Fragment>
                );
              })}
          </React.Fragment>
        ))}
        {currentSelectionNote &&
          currentSelectionNote.highlightAreas
            .filter((area) => area.pageIndex === props.pageIndex)
            .map((area, idx) => (
              <div
                key={`temp-${idx}`}
                style={{
                  ...props.getCssProperties(area, props.rotation),
                  backgroundColor: "#05B0FF",
                  opacity: 0.2,
                  // mixBlendMode: 'multiply',
                  pointerEvents: "none",
                  zIndex: 100,
                }}
              />
            ))}
      </div>
    );
  };

  // Component for highlight target tooltip that can use hooks
  const HighlightTargetTooltip = ({
    props,
  }: {
    props: RenderHighlightTargetProps;
  }) => {
    const updateSelectedTextRef = useRef(updateSelectedText);
    const setCurrentSelectionNoteRef = useRef(setCurrentSelectionNote);
    const [isExpanded, setIsExpanded] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{
      left: number;
      top: number;
    } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Keep refs in sync with latest callbacks
    useEffect(() => {
      updateSelectedTextRef.current = updateSelectedText;
      setCurrentSelectionNoteRef.current = setCurrentSelectionNote;
    });

    // Calculate absolute position for menu to avoid clipping
    const updateMenuPosition = useCallback(() => {
      if (!props.selectedText || !scrollContainerRef.current) {
        setMenuPosition(null);
        return;
      }

      const container = scrollContainerRef.current;
      const containerRect = container.getBoundingClientRect();

      // Find the most visible page layer within the container
      let bestRect: DOMRect | null = null;
      let bestArea = 0;
      const pageLayers = container.querySelectorAll(".rpv-core__page-layer");
      pageLayers.forEach((node) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        const xOverlap = Math.max(
          0,
          Math.min(containerRect.right, rect.right) -
          Math.max(containerRect.left, rect.left),
        );
        const yOverlap = Math.max(
          0,
          Math.min(containerRect.bottom, rect.bottom) -
          Math.max(containerRect.top, rect.top),
        );
        const area = xOverlap * yOverlap;
        if (area > bestArea) {
          bestArea = area;
          bestRect = rect;
        }
      });

      const pageRect = bestRect ?? containerRect;

      // Convert percentage-based selectionRegion to absolute pixels against the page rect
      const leftPx = (props.selectionRegion.left / 100) * pageRect.width;
      const topPx = (props.selectionRegion.top / 100) * pageRect.height;

      // Get menu dimensions (estimate if not yet rendered)
      const menuHeight = menuRef.current?.offsetHeight || 40;

      // Calculate absolute position relative to viewport, place slightly above selection
      const absoluteLeft = pageRect.left + leftPx;
      const absoluteTop = pageRect.top + topPx - (menuHeight + 6);

      setMenuPosition({ left: absoluteLeft, top: absoluteTop });
    }, [props.selectedText, props.selectionRegion]);

    useEffect(() => {
      updateMenuPosition();

      // Update position on scroll and resize
      const handleScroll = () => requestAnimationFrame(updateMenuPosition);
      const handleResize = () => requestAnimationFrame(updateMenuPosition);

      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }, [updateMenuPosition]);

    // Update selected text when tooltip is shown (text is selected)
    // Guard to only send when value actually changes to avoid render loops
    useEffect(() => {
      if (!updateSelectedTextRef.current) return;
      if (
        props.selectedText &&
        props.selectedText !== lastSelectedTextSentRef.current
      ) {
        lastSelectedTextSentRef.current = props.selectedText;
        // Use requestAnimationFrame to defer the state update and break any potential render loop
        requestAnimationFrame(() => {
          updateSelectedTextRef.current?.(props.selectedText);
          console.log("📝 Updated selectedText:", props.selectedText);
        });
      }
    }, [props.selectedText]);

    // Capture/replace the temporary selection highlight
    // Create a stable key from highlightAreas to avoid dependency on array reference
    const selectionKeyMemo = useMemo(() => {
      if (
        !(
          props.selectedText &&
          props.highlightAreas &&
          props.highlightAreas.length > 0
        )
      )
        return null;
      const areasKey = props.highlightAreas
        .map(
          (a) =>
            `${a.pageIndex}:${a.left.toFixed(3)}:${a.top.toFixed(3)}:${a.width.toFixed(3)}:${a.height.toFixed(3)}`,
        )
        .join("|");
      return `${props.selectedText}::${areasKey}`;
    }, [props.selectedText, props.highlightAreas]);

    useEffect(() => {
      if (!selectionKeyMemo) return;
      if (selectionKeyMemo === lastSelectionKeyGlobalRef.current) return;
      lastSelectionKeyGlobalRef.current = selectionKeyMemo;

      // Capture values before deferring to avoid stale closures
      const highlightAreas = props.highlightAreas;
      const selectedText = props.selectedText;

      // Use requestAnimationFrame to defer the state update and break any potential render loop
      requestAnimationFrame(() => {
        setCurrentSelectionNoteRef.current({
          id: -1,
          content: "",
          highlightAreas: highlightAreas,
          quote: selectedText,
        });
      });
    }, [selectionKeyMemo]);

    // Check if the selected text is already highlighted
    const isAlreadyHighlighted = useMemo(() => {
      // Compare highlight areas to see if there's a matching note
      return notes.some((note) => {
        // Check if the number of areas matches
        if (note.highlightAreas.length !== props.highlightAreas.length) {
          return false;
        }
        // Check if all areas match (within a small tolerance for floating point)
        return note.highlightAreas.every((area, idx) => {
          const propArea = props.highlightAreas[idx];
          return (
            area.pageIndex === propArea.pageIndex &&
            Math.abs(area.left - propArea.left) < 0.01 &&
            Math.abs(area.top - propArea.top) < 0.01 &&
            Math.abs(area.width - propArea.width) < 0.01 &&
            Math.abs(area.height - propArea.height) < 0.01
          );
        });
      });
    }, [notes, props.highlightAreas]);

    // Find the matching note ID if it exists
    const matchingNoteId = useMemo(() => {
      const matchingNote = notes.find((note) => {
        if (note.highlightAreas.length !== props.highlightAreas.length) {
          return false;
        }
        return note.highlightAreas.every((area, idx) => {
          const propArea = props.highlightAreas[idx];
          return (
            area.pageIndex === propArea.pageIndex &&
            Math.abs(area.left - propArea.left) < 0.01 &&
            Math.abs(area.top - propArea.top) < 0.01 &&
            Math.abs(area.width - propArea.width) < 0.01 &&
            Math.abs(area.height - propArea.height) < 0.01
          );
        });
      });
      return matchingNote?.id ?? null;
    }, [notes, props.highlightAreas]);

    const handleAsk = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Ask - Selected text:", props.selectedText);
      // Update selected text to populate InputBar (uses chat context)
      updateSelectedText(props.selectedText);
      // Suppress the next selection clear so chip remains
      suppressNextSelectionClearRef.current = true;
      // Explicitly focus the InputBar textarea
      window.setTimeout(() => {
        const el = document.getElementById(
          "userInput",
        ) as HTMLTextAreaElement | null;
        if (el) {
          el.focus();
          try {
            const len = el.value.length;
            el.setSelectionRange(len, len);
          } catch {
            /* ignore */
          }
        }
      }, 0);
      props.cancel();
    };

    const handleDefine = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      sendMessage(`/Define`, { selectedText: props.selectedText });
      props.cancel();
    };

    const handleExplain = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      sendMessage(`/Explain`, { selectedText: props.selectedText });
      props.cancel();
    };

    const handleSimplify = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      sendMessage(`/Simplify`, { selectedText: props.selectedText });
      props.cancel();
    };

    const handleHighlight = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isAlreadyHighlighted && matchingNoteId !== null) {
        // Remove the highlight
        applyUserNotesUpdate((prevNotes) =>
          prevNotes.filter((n) => n.id !== matchingNoteId),
        );
      } else {
        // Create new note with highlight areas (matching documentation)
        const newNote: Note = {
          id: ++noteIdCounter.current,
          content: "", // Empty content for now
          highlightAreas: props.highlightAreas, // Use the array from props
          quote: props.selectedText,
        };

        // Add to notes state using functional update to avoid stale closure
        applyUserNotesUpdate((prevNotes) => [...prevNotes, newNote]);
        // Clear the temporary selection immediately after creating a permanent highlight
        setCurrentSelectionNote(null);
      }

      props.cancel();
    };

    const handleToggleExpand = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    };

    const handleComment = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Create a note and open a comment card on the right
      const newNote: Note = {
        id: ++noteIdCounter.current,
        content: "",
        highlightAreas: props.highlightAreas,
        quote: props.selectedText,
      };
      applyUserNotesUpdate((prev) => [...prev, newNote]);
      setUnsavedNoteIds((prev) => {
        const s = new Set(prev);
        s.add(newNote.id);
        return s;
      });
      setCurrentSelectionNote(null);
      setFocusCommentId(newNote.id);
      props.cancel();
    };

    if (!menuPosition) return null;

    const menuContent = (
      <div
        ref={menuRef}
        className="fixed font-rounded-bold bg-white rounded-lg px-2.5 py-1.5 text-[13px] font-bold whitespace-nowrap pointer-events-auto drop-shadow-[0_0_10px_rgba(0,0,0,0.2)] flex gap-2"
        data-selection-menu="true"
        style={{
          left: `${menuPosition.left}px`,
          top: `${menuPosition.top}px`,
          zIndex: 10,
        }}
      >
        <button
          className="cursor-pointer hover:opacity-70"
          onMouseDown={handleHighlight}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {isAlreadyHighlighted ? "Remove Highlight" : "Highlight"}
        </button>
        <div className="w-px bg-gray-300" />
        <button
          className="cursor-pointer hover:opacity-70"
          onMouseDown={handleComment}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          Comment
        </button>
        <div className="w-px bg-gray-300" />
        <button
          className="cursor-pointer hover:opacity-70"
          onMouseDown={handleAsk}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          Ask
        </button>
        <div className="w-px bg-gray-300" />
        <button
          className="cursor-pointer hover:opacity-70"
          onMouseDown={handleDefine}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          Define
        </button>
        <div className="w-px bg-gray-300" />
        <button
          className="cursor-pointer hover:opacity-70"
          onMouseDown={handleExplain}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          Explain
        </button>
        {/* {isExpanded && (
          <>
            <div className="w-px bg-gray-300" />
            <button
              className="cursor-pointer hover:opacity-70"
              onMouseDown={handleExplain}
              onMouseUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              Explain
            </button>
            <div className="w-px bg-gray-300" />
            <button
              className="cursor-pointer hover:opacity-70"
              onMouseDown={handleSimplify}
              onMouseUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              Simplify
            </button>
          </>
        )} */}
        {/* <div className="w-px bg-gray-300" />
        <button
          className="cursor-pointer hover:opacity-70 flex items-center"
          onMouseDown={handleToggleExpand}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.6514 13.6543C19.6426 13.3467 19.5283 13.083 19.291 12.8457L12.4531 6.15723C12.251 5.96387 12.0137 5.8584 11.7236 5.8584C11.1348 5.8584 10.6777 6.31543 10.6777 6.9043C10.6777 7.18555 10.792 7.44922 10.9941 7.65137L17.1465 13.6543L10.9941 19.6572C10.792 19.8594 10.6777 20.1143 10.6777 20.4043C10.6777 20.9932 11.1348 21.4502 11.7236 21.4502C12.0049 21.4502 12.251 21.3447 12.4531 21.1514L19.291 14.4541C19.5371 14.2256 19.6514 13.9619 19.6514 13.6543Z" fill="#1C1C1E" />
          </svg>
        </button> */}
      </div>
    );

    return createPortal(menuContent, document.body);
  };

  const renderHighlightTarget = (props: RenderHighlightTargetProps) => {
    return <HighlightTargetTooltip props={props} />;
  };

  // IMPORTANT: These plugin factories may use hooks internally, so they must be called
  // at the top level of the component (not inside other hooks like useMemo).
  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget,
    renderHighlights,
  });
  const scrollModePluginInstance = scrollModePlugin();
  const pageNavigationPluginInstance = pageNavigationPlugin();
  const thumbnailPluginInstance = thumbnailPlugin();

  const { jumpToNextPage, jumpToPreviousPage } = pageNavigationPluginInstance;
  const { Thumbnails } = thumbnailPluginInstance;
  const { switchScrollMode } = scrollModePluginInstance;

  // Update scroll mode when isLandscape changes (after detection)
  // Respects SCROLL_MODE flag - when "scroll", always use vertical scrolling
  useEffect(() => {
    if (totalPages > 0 && switchScrollMode) {
      const usePageMode = SCROLL_MODE === "page" && isLandscape;
      const newScrollMode = usePageMode ? ScrollMode.Page : ScrollMode.Vertical;
      try {
        switchScrollMode(newScrollMode);
        console.log(
          `🔄 Updated scroll mode to: ${usePageMode ? "Page" : "Vertical"}`,
        );
      } catch (error) {
        console.error("Error switching scroll mode:", error);
      }
    }
  }, [isLandscape, totalPages, switchScrollMode]);

  // Add 24px margin between pages
  const pageLayout = useMemo<PageLayout>(
    () => ({
      buildPageStyles: () => ({
        alignItems: "center",
        display: "flex",
        justifyContent: "center",
      }),
      transformSize: ({ size }) => ({
        height: size.height + 24,
        width: size.width,
      }),
    }),
    [],
  );

  // Jump when targetPdfPage changes - simplified approach
  useEffect(() => {
    if (typeof targetPdfPage !== "number" || targetPdfPage < 1) return;
    if (targetPdfPage === currentPage) return;

    const targetIndex = targetPdfPage - 1; // Convert to 0-based index

    console.log("[CITE-JUMP] Jumping to page", {
      targetPdfPage,
      targetIndex,
      currentPage,
    });

    // Use the official pageNavigationPlugin's jumpToPage method
    // This is exposed through the plugin instance
    const jumpToPageFn = (pageNavigationPluginInstance as any).jumpToPage;
    if (jumpToPageFn) {
      // Small delay to ensure PDF viewer is ready
      const timeoutId = setTimeout(() => {
        jumpToPageFn(targetIndex);
        console.log("[CITE-JUMP] Executed jump to page", targetPdfPage);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [targetPdfPage, currentPage, pageNavigationPluginInstance]);

  // Briefly flash-highlight a phrase under the text layer, then fade out
  const lastFlashRef = useRef<{ page: number; text: string } | null>(null);
  useEffect(() => {
    if (!flashHighlightText) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    // Only run highlight effect when on the correct page (if page is specified)
    // This prevents duplicate highlights when jumping to a different page
    if (flashHighlightPage && currentPage !== flashHighlightPage) {
      console.log("[CITE-HIGHLIGHT] skipping - not on target page yet", {
        flashHighlightPage,
        currentPage,
      });
      return;
    }

    const normalized = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const normText = normalized(flashHighlightText);
    console.log("[CITE-HIGHLIGHT] start", {
      flashHighlightPage,
      currentPage,
      text: normText.slice(0, 80),
    });

    // Allow re-highlighting after 500ms for repeated citation clicks
    const now = Date.now();
    if (
      lastFlashRef.current &&
      lastFlashRef.current.page === currentPage &&
      lastFlashRef.current.text === normText &&
      (lastFlashRef.current as any).timestamp &&
      now - (lastFlashRef.current as any).timestamp < 500
    ) {
      console.log("[CITE-HIGHLIGHT] skip duplicate", {
        sinceMs: now - (lastFlashRef.current as any).timestamp,
      });
      return;
    }
    const tokensTarget = normText.split(" ").filter(Boolean);
    if (tokensTarget.length === 0) return;

    let didFlash = false;
    const getTargetPageElement = () => {
      if (typeof flashHighlightPage === "number") {
        const index = Math.max(0, flashHighlightPage - 1);
        const byTestId = container.querySelector(
          `[data-testid="core__page-layer-${index}"]`,
        ) as HTMLElement | null;
        return byTestId;
      }
      return findCurrentPageElement();
    };

    const run = () => {
      if (didFlash) return true;
      // Find current visible page layer
      const pageEl = getTargetPageElement();
      if (!pageEl) {
        console.log("[CITE-HIGHLIGHT] no page element yet");
        return false;
      }
      const textLayer = pageEl.querySelector(
        ".rpv-core__text-layer",
      ) as HTMLElement | null;
      if (!textLayer) {
        console.log("[CITE-HIGHLIGHT] no text layer yet");
        return false;
      }

      // Build tokens from spans (sequence across spans)
      const spans = Array.from(
        textLayer.querySelectorAll("span"),
      ) as HTMLSpanElement[];

      // Check if this is a character-spaced PDF
      const sampleSpans = spans.slice(0, 20).map(s => s.textContent);
      const avgSpanLength = sampleSpans.join('').length / Math.max(sampleSpans.length, 1);
      const isCharSpaced = avgSpanLength < 2;

      type Tok = { norm: string; rect: DOMRect };
      const toks: Tok[] = [];

      if (isCharSpaced) {
        // For character-spaced PDFs, join all text first then split into words
        const fullText = spans.map(s => s.textContent || "").join("");
        const words = fullText.split(/\s+/).filter(Boolean);

        // For simplicity, use the first span's rect for each word (not perfect but works)
        for (const word of words) {
          const n = normalized(word);
          if (n && spans[0]) {
            toks.push({ norm: n, rect: spans[0].getBoundingClientRect() });
          }
        }
      } else {
        // Normal PDF processing
        for (const sp of spans) {
          const rect = sp.getBoundingClientRect();
          const parts = (sp.textContent || "").split(/\s+/).filter(Boolean);
          for (const p of parts) {
            const n = normalized(p);
            if (n) toks.push({ norm: n, rect });
          }
        }
      }
      const norms = toks.map((t) => t.norm);
      const L = tokensTarget.length;

      let allMatches: DOMRect[][] = [];
      for (let i = 0; i <= norms.length - L; i++) {
        let ok = true;
        for (let j = 0; j < L; j++) {
          if (norms[i + j] !== tokensTarget[j]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          const matchRects = toks.slice(i, i + L).map((t) => t.rect);
          allMatches.push(matchRects);
          // Skip ahead to avoid overlapping matches
          i += L - 1;
        }
      }

      let matchedRects: DOMRect[] = [];
      if (allMatches.length === 0) {
        // Fallback: keyword match when exact phrase sequence isn't found
        const keywordSet = new Set(
          tokensTarget.filter((token) => token.length >= 4),
        );
        if (keywordSet.size === 0) {
          console.log("[CITE-HIGHLIGHT] no match (no keywords)", {
            tokenCount: tokensTarget.length,
            pdfTokens: norms.length,
          });
          return false;
        }
        const keywordRects: DOMRect[] = [];
        for (const sp of spans) {
          const text = normalized(sp.textContent || "");
          if (!text) continue;
          for (const keyword of keywordSet) {
            if (text.includes(keyword)) {
              keywordRects.push(sp.getBoundingClientRect());
              break;
            }
          }
        }
        if (keywordRects.length === 0) {
          console.log("[CITE-HIGHLIGHT] no match (keyword fallback empty)", {
            keywords: Array.from(keywordSet),
            pdfTokens: norms.length,
          });
          return false;
        }
        matchedRects = keywordRects.slice(0, 60);
        console.log("[CITE-HIGHLIGHT] keyword fallback", {
          keywords: Array.from(keywordSet),
          rectCount: matchedRects.length,
        });
      } else {
        // Flatten all matches into a single array of rects
        matchedRects = allMatches.flat();
      }

      // Merge rects per line
      const threshold = 6;
      const sorted = matchedRects
        .slice()
        .sort((a, b) => a.top - b.top || a.left - b.left);
      const groups: DOMRect[][] = [];
      for (const r of sorted) {
        const last = groups[groups.length - 1];
        if (!last) {
          groups.push([r]);
          continue;
        }
        if (Math.abs(r.top - last[0].top) <= threshold) last.push(r);
        else groups.push([r]);
      }
      const merged = groups.map((g) => {
        const left = Math.min(...g.map((r) => r.left));
        const top = Math.min(...g.map((r) => r.top));
        const right = Math.max(...g.map((r) => r.right));
        const bottom = Math.max(...g.map((r) => r.bottom));
        return new DOMRect(left, top, right - left, bottom - top);
      });

      // Create overlay under text
      const overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.left = "0";
      overlay.style.top = "0";
      overlay.style.right = "0";
      overlay.style.bottom = "0";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "1";

      const pageRect = pageEl.getBoundingClientRect();
      merged.forEach((m) => {
        const mark = document.createElement("div");
        mark.style.position = "absolute";
        mark.style.left = `${m.left - pageRect.left}px`;
        mark.style.top = `${m.top - pageRect.top}px`;
        mark.style.width = `${m.width}px`;
        mark.style.height = `${m.height}px`;
        mark.style.background = "#FAD53B";
        mark.style.opacity = "0.7";
        mark.style.mixBlendMode = "multiply";
        mark.style.transition = "opacity 3000ms ease-out";
        overlay.appendChild(mark);
        // start fade
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            mark.style.opacity = "0";
          });
        });
      });

      // Insert under text layer
      pageEl.appendChild(overlay);
      didFlash = true;
      console.log("[CITE-HIGHLIGHT] applied", {
        matches: allMatches.length,
      });
      // Cleanup after fade
      setTimeout(() => {
        overlay.remove();
      }, 3200);
      return true;
    };

    // run slightly later to allow text layer render
    const timeouts: number[] = [];
    [200, 450, 800, 1200, 1700, 2300].forEach((delay) => {
      timeouts.push(
        window.setTimeout(() => {
          if (didFlash) return;
          run();
        }, delay),
      );
    });
    console.log("[CITE-HIGHLIGHT] scheduled attempts", {
      delaysMs: [200, 450, 800, 1200, 1700, 2300],
    });
    lastFlashRef.current = {
      page: currentPage,
      text: normText,
      timestamp: Date.now()
    } as any;
    return () => timeouts.forEach((id) => window.clearTimeout(id));
  }, [flashHighlightText, flashHighlightPage, currentPage]);

  // Handle mouse wheel scrolling to navigate pages - one scroll unit = one page (page mode only)
  useEffect(() => {
    // Only apply custom wheel handling when in page mode
    const usePageMode = SCROLL_MODE === "page" && isLandscape;
    if (!usePageMode) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Accumulate scroll delta
      scrollAccumulatorRef.current += e.deltaY;

      // For mouse wheels with discrete units (deltaMode === 1), threshold is smaller
      // For trackpads (deltaMode === 0), use pixel threshold
      const threshold = e.deltaMode === 1 ? 3 : 50;

      if (Math.abs(scrollAccumulatorRef.current) >= threshold) {
        const direction = scrollAccumulatorRef.current > 0 ? 1 : -1;

        if (direction > 0 && currentPage < totalPages) {
          // Scrolling down - next page
          jumpToNextPage();
          scrollAccumulatorRef.current = 0;
        } else if (direction < 0 && currentPage > 1) {
          // Scrolling up - previous page
          jumpToPreviousPage();
          scrollAccumulatorRef.current = 0;
        } else {
          // At boundary, reset accumulator
          scrollAccumulatorRef.current = 0;
        }
      }
    };

    const viewerElement = document.querySelector(
      '[data-testid="core__viewer"]',
    );
    if (viewerElement) {
      viewerElement.addEventListener("wheel", handleWheel as EventListener, {
        passive: false,
      });
      return () => {
        viewerElement.removeEventListener(
          "wheel",
          handleWheel as EventListener,
        );
      };
    }
  }, [
    currentPage,
    totalPages,
    jumpToNextPage,
    jumpToPreviousPage,
    isLandscape,
  ]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field - if so, don't intercept keys
      const activeElement = document.activeElement;
      const isTypingInInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "MATH-FIELD" ||
          (activeElement instanceof HTMLElement &&
            activeElement.isContentEditable));

      // Don't handle keyboard shortcuts if user is typing in an input field
      if (isTypingInInput) {
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          if (currentPage < totalPages) {
            jumpToNextPage();
          }
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          if (currentPage > 1) {
            jumpToPreviousPage();
          }
          break;
        case "Escape":
          // Clear temporary selection on Escape
          setCurrentSelectionNote(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentPage, totalPages, jumpToNextPage, jumpToPreviousPage]);

  // Autofocus a newly created comment input
  useEffect(() => {
    if (focusCommentId == null) return;
    const container = scrollContainerRef.current;
    if (!container) {
      setFocusCommentId(null);
      return;
    }
    // Give the DOM a tick to render
    const id = window.setTimeout(() => {
      const input = container.querySelector(
        `[data-note-input-id="${focusCommentId}"]`,
      ) as HTMLTextAreaElement | null;
      if (input) {
        input.focus();
        try {
          const len = input.value.length;
          input.setSelectionRange(len, len);
        } catch {
          /* ignore */
        }
      }
      setFocusCommentId(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [focusCommentId]);

  // Make PDF links open in new tab
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateLinks = () => {
      // react-pdf-viewer renders links with class rpv-core__annotation--link
      const links = container.querySelectorAll(
        "a.rpv-core__annotation--link, .rpv-core__annotation-layer a",
      );
      links.forEach((link) => {
        if (!link.hasAttribute("target")) {
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
        }
      });
    };

    // Run initially and observe for new pages being rendered
    updateLinks();

    const observer = new MutationObserver(updateLinks);
    observer.observe(container, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [url]);

  // Auto-resize helper for comment textareas
  const adjustTextareaHeight = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    // Prevent flicker while resizing
    el.style.height = "auto";
    el.style.overflow = "hidden";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Cleanup duplicate text layers created by buggy highlight plugin
  const cleanupDuplicateTextLayers = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Find all page layers
    const pageLayers = container.querySelectorAll(".rpv-core__page-layer");

    // Track seen pages by their data-testid
    const seenPages = new Map<string, Element>();
    const duplicatesToRemove: Element[] = [];

    pageLayers.forEach((layer) => {
      const testId = layer.getAttribute("data-testid");
      if (!testId) return;

      if (seenPages.has(testId)) {
        // This is a duplicate - hide immediately and mark for removal
        (layer as HTMLElement).classList.add("rpv-duplicate-check");
        duplicatesToRemove.push(layer);
        console.log("🗑️ Found duplicate page layer:", testId);
      } else {
        // First occurrence - keep it and mark as verified
        seenPages.set(testId, layer);
        (layer as HTMLElement).classList.remove("rpv-duplicate-check");
        (layer as HTMLElement).classList.add("rpv-verified");
      }
    });

    // Remove all duplicates immediately (no flash because they're already hidden by CSS)
    duplicatesToRemove.forEach((dup) => {
      dup.remove();
      console.log("🗑️ Removed duplicate page layer");
    });

    // Also check for duplicate text layers within each page
    seenPages.forEach((pageLayer) => {
      const textLayers = pageLayer.querySelectorAll(
        '.rpv-core__text-layer[data-highlight-text-layer="true"]',
      );
      if (textLayers.length > 1) {
        // Keep only the first text layer, remove the rest
        for (let i = 1; i < textLayers.length; i++) {
          textLayers[i].remove();
          console.log("🗑️ Removed duplicate text layer within page");
        }
      }
    });
  }, []);

  // MutationObserver to watch for duplicate page layers being added
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Use requestAnimationFrame for immediate, synchronous-feeling cleanup
    let rafId: number | null = null;
    const immediateCleanup = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        cleanupDuplicateTextLayers();
        rafId = null;
      });
    };

    const observer = new MutationObserver((mutations) => {
      // Check if any page layers were added
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // If a page layer was added, immediately hide it until verified
              if (node.classList.contains("rpv-core__page-layer")) {
                node.classList.add("rpv-duplicate-check");
                immediateCleanup();
              }
              // Also check children
              const pageLayers = node.querySelectorAll(".rpv-core__page-layer");
              if (pageLayers.length > 0) {
                pageLayers.forEach((layer) => {
                  (layer as HTMLElement).classList.add("rpv-duplicate-check");
                });
                immediateCleanup();
              }
            }
          });
        }
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    // Initial cleanup to verify existing layers
    cleanupDuplicateTextLayers();

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [cleanupDuplicateTextLayers]);

  // Clear temporary selection when user deselects inside the viewer (mouseup with empty selection)
  // Also close highlight menu when clicking outside
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleMouseUp = (e: MouseEvent) => {
      // Cleanup duplicates after selection
      requestAnimationFrame(() => {
        cleanupDuplicateTextLayers();
      });

      // Ignore mouseup inside our selection/highlight menus to preserve selectedText
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest('[data-selection-menu="true"]') ||
          target.closest('[data-highlight-menu="true"]'))
      ) {
        return;
      }

      // Close highlight menu when clicking outside
      if (selectedNoteId !== null) {
        setSelectedNoteId(null);
        setHighlightMenuPosition(null);
      }

      // If Ask was just clicked, suppress clearing selectedText once
      if (suppressNextSelectionClearRef.current) {
        suppressNextSelectionClearRef.current = false;
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.toString().trim() === "") {
        setCurrentSelectionNote(null);
        // Also notify chat context that selection was cleared
        updateSelectedText(null);
      }
    };

    container.addEventListener("mouseup", handleMouseUp);
    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
    };
  }, [updateSelectedText, cleanupDuplicateTextLayers, selectedNoteId]);

  // Handle canvas updates for current page
  const handleUpdateCanvas = useCallback(
    (_questionGroupId: number, _questionLegacyId: string, canvas: Canvas) => {
      updateDocumentCanvas?.(currentPage, canvas);
    },
    [currentPage, updateDocumentCanvas],
  );

  // Handle wheel events on SketchCanvas overlay for page navigation (page mode only)
  const handleCanvasWheel = useCallback(
    (e: React.WheelEvent) => {
      // Only apply custom wheel handling when in page mode
      const usePageMode = SCROLL_MODE === "page" && isLandscape;
      if (!usePageMode) return;

      e.preventDefault();

      // Accumulate scroll delta
      scrollAccumulatorRef.current += e.deltaY;

      // For mouse wheels with discrete units (deltaMode === 1), threshold is smaller
      // For trackpads (deltaMode === 0), use pixel threshold
      const threshold = e.deltaMode === 1 ? 3 : 50;

      if (Math.abs(scrollAccumulatorRef.current) >= threshold) {
        const direction = scrollAccumulatorRef.current > 0 ? 1 : -1;

        if (direction > 0 && currentPage < totalPages) {
          // Scrolling down - next page
          jumpToNextPage();
          scrollAccumulatorRef.current = 0;
        } else if (direction < 0 && currentPage > 1) {
          // Scrolling up - previous page
          jumpToPreviousPage();
          scrollAccumulatorRef.current = 0;
        } else {
          // At boundary, reset accumulator
          scrollAccumulatorRef.current = 0;
        }
      }
    },
    [currentPage, totalPages, jumpToNextPage, jumpToPreviousPage, isLandscape],
  );

  // Attach non-passive wheel listener to overlay to allow preventDefault (page mode only)
  useEffect(() => {
    // Only apply custom wheel handling when in page mode
    const usePageMode = SCROLL_MODE === "page" && isLandscape;
    if (!usePageMode || inputMode === "select") return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Accumulate scroll delta
      scrollAccumulatorRef.current += e.deltaY;

      // For mouse wheels with discrete units (deltaMode === 1), threshold is smaller
      // For trackpads (deltaMode === 0), use pixel threshold
      const threshold = e.deltaMode === 1 ? 3 : 50;

      if (Math.abs(scrollAccumulatorRef.current) >= threshold) {
        const direction = scrollAccumulatorRef.current > 0 ? 1 : -1;

        if (direction > 0 && currentPage < totalPages) {
          // Scrolling down - next page
          jumpToNextPage();
          scrollAccumulatorRef.current = 0;
        } else if (direction < 0 && currentPage > 1) {
          // Scrolling up - previous page
          jumpToPreviousPage();
          scrollAccumulatorRef.current = 0;
        } else {
          // At boundary, reset accumulator
          scrollAccumulatorRef.current = 0;
        }
      }
    };

    overlay.addEventListener("wheel", handleWheel as EventListener, {
      passive: false,
    });
    return () => {
      overlay.removeEventListener("wheel", handleWheel as EventListener);
    };
  }, [
    currentPage,
    totalPages,
    jumpToNextPage,
    jumpToPreviousPage,
    isLandscape,
  ]);

  // Find the visible page element and align overlay to it
  const findCurrentPageElement = useCallback((): HTMLElement | null => {
    const container = scrollContainerRef.current;
    if (!container) return null;

    const pageLayers = container.querySelectorAll(".rpv-core__page-layer");
    if (!pageLayers || pageLayers.length === 0) return null;

    const containerRect = container.getBoundingClientRect();

    let bestEl: HTMLElement | null = null;
    let bestArea = 0;

    pageLayers.forEach((el) => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const xOverlap = Math.max(
        0,
        Math.min(containerRect.right, rect.right) -
        Math.max(containerRect.left, rect.left),
      );
      const yOverlap = Math.max(
        0,
        Math.min(containerRect.bottom, rect.bottom) -
        Math.max(containerRect.top, rect.top),
      );
      const area = xOverlap * yOverlap;
      if (area > bestArea) {
        bestArea = area;
        bestEl = el as HTMLElement;
      }
    });

    return bestEl;
  }, []);

  // Extract text layer span positions when translation mode is active
  useEffect(() => {
    if (!showTranslation) {
      setTranslationSpans([]);
      return;
    }

    const extractSpans = () => {
      const pageEl = findCurrentPageElement();
      if (!pageEl) return;

      const textLayer = pageEl.querySelector(
        ".rpv-core__text-layer",
      ) as HTMLElement | null;
      if (!textLayer) return;

      const pageRect = pageEl.getBoundingClientRect();
      const spans = Array.from(
        textLayer.querySelectorAll("span"),
      ) as HTMLSpanElement[];

      const extracted = spans
        .map((span) => {
          const text = span.textContent || "";
          if (!text.trim()) return null;

          const style = window.getComputedStyle(span);
          const rect = span.getBoundingClientRect();

          return {
            text,
            left: rect.left - pageRect.left,
            top: rect.top - pageRect.top,
            fontSize: parseFloat(style.fontSize) || 12,
            transform: style.transform || "none",
            fontFamily: style.fontFamily || "sans-serif",
          };
        })
        .filter(Boolean) as typeof translationSpans;

      setTranslationSpans(extracted);
    };

    // Run after a small delay to ensure text layer is rendered
    const timeoutId = setTimeout(extractSpans, 300);
    return () => clearTimeout(timeoutId);
  }, [showTranslation, currentPage, findCurrentPageElement]);

  // Calculate highlight menu position when a highlight is selected
  const updateHighlightMenuPosition = useCallback(() => {
    if (!selectedNoteId || !scrollContainerRef.current) {
      setHighlightMenuPosition(null);
      return;
    }

    const container = scrollContainerRef.current;

    // Find the selected note
    const selectedNote = notes.find((n) => n.id === selectedNoteId);
    if (!selectedNote || selectedNote.highlightAreas.length === 0) {
      setHighlightMenuPosition(null);
      return;
    }

    // Use the first highlight area for positioning
    const area = selectedNote.highlightAreas[0];

    // Find the page element to get accurate positioning
    const pageEl = findCurrentPageElement();
    if (!pageEl) {
      setHighlightMenuPosition(null);
      return;
    }

    const pageRect = pageEl.getBoundingClientRect();

    // Convert percentage-based area position to absolute pixels
    const leftPx = (area.left / 100) * pageRect.width;
    const topPx = (area.top / 100) * pageRect.height;

    // Get menu dimensions (estimate if not yet rendered)
    const menuHeight = highlightMenuRef.current?.offsetHeight || 40;

    // Calculate absolute position relative to viewport
    const absoluteLeft = pageRect.left + leftPx;
    const absoluteTop = pageRect.top + topPx - menuHeight; // Position above highlight

    setHighlightMenuPosition({
      left: absoluteLeft,
      top: absoluteTop,
      noteId: selectedNoteId,
    });
  }, [selectedNoteId, notes, findCurrentPageElement]);

  // Clear highlight menu when page becomes hidden
  useEffect(() => {
    if (!isVisible) {
      setSelectedNoteId(null);
      setHighlightMenuPosition(null);
    }
  }, [isVisible]);

  const syncOverlayToPage = useCallback(() => {
    const container = scrollContainerRef.current;
    const overlay = overlayRef.current;
    const commentsLayer = commentsOverlayRef.current;
    if (!container || !overlay) return;

    const pageEl = findCurrentPageElement();
    if (!pageEl) return;

    const containerRect = container.getBoundingClientRect();
    const pageRect = pageEl.getBoundingClientRect();

    // Add extra width on both sides so annotations can extend beyond page bounds
    const EXTRA_WIDTH = 400; // px on each side
    const overlayWidth = pageRect.width + EXTRA_WIDTH * 2;
    const overlayLeft = pageRect.left - containerRect.left - EXTRA_WIDTH;
    // Add extra height on top and bottom so annotations can extend beyond page bounds
    const EXTRA_HEIGHT_TOP = 800; // px above page
    const EXTRA_HEIGHT_BOTTOM = 800; // px below page
    const overlayHeight =
      pageRect.height + EXTRA_HEIGHT_TOP + EXTRA_HEIGHT_BOTTOM;
    const overlayTop = pageRect.top - containerRect.top - EXTRA_HEIGHT_TOP;

    overlay.style.left = `${overlayLeft}px`;
    overlay.style.top = `${overlayTop}px`;
    overlay.style.width = `${overlayWidth}px`;
    overlay.style.height = `${overlayHeight}px`;
    if (commentsLayer) {
      commentsLayer.style.left = `${overlayLeft}px`;
      commentsLayer.style.top = `${overlayTop}px`;
      commentsLayer.style.width = `${overlayWidth}px`;
      commentsLayer.style.height = `${overlayHeight}px`;
    }
  }, [findCurrentPageElement]);

  // Handle grab mode scrolling
  useEffect(() => {
    if (inputMode !== "grab") return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleGrabMouseDown = (e: MouseEvent) => {
      setIsDraggingPage(true);
      dragStartScrollPos.current = {
        x: e.clientX,
        y: e.clientY,
        scrollTop: container.scrollTop,
      };
      e.preventDefault();
    };

    const handleGrabMouseMove = (e: MouseEvent) => {
      if (!isDraggingPage) return;

      const deltaY = dragStartScrollPos.current.y - e.clientY;
      container.scrollTop = dragStartScrollPos.current.scrollTop + deltaY;
      e.preventDefault();
    };

    const handleGrabMouseUp = () => {
      setIsDraggingPage(false);
    };

    container.addEventListener("mousedown", handleGrabMouseDown);
    document.addEventListener("mousemove", handleGrabMouseMove);
    document.addEventListener("mouseup", handleGrabMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleGrabMouseDown);
      document.removeEventListener("mousemove", handleGrabMouseMove);
      document.removeEventListener("mouseup", handleGrabMouseUp);
    };
  }, [inputMode, isDraggingPage]);

  // Handle thumbnail bar drag scrolling (horizontal)
  useEffect(() => {
    if (SIDEBAR_POSITION !== "bottom") return;

    const container = thumbnailBarRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDraggingThumbnails(true);
      thumbnailDragStart.current = {
        x: e.clientX,
        scrollLeft: container.scrollLeft,
      };
      container.style.cursor = "grabbing";
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingThumbnails) return;
      const deltaX = thumbnailDragStart.current.x - e.clientX;
      container.scrollLeft = thumbnailDragStart.current.scrollLeft + deltaX;
    };

    const handleMouseUp = () => {
      setIsDraggingThumbnails(false);
      if (container) container.style.cursor = "grab";
    };

    container.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingThumbnails]);

  // Thumbnail bar scroll handlers (for arrow buttons)
  const scrollThumbnailsLeft = useCallback(() => {
    const container = thumbnailBarRef.current;
    if (!container) return;
    container.scrollBy({ left: -200, behavior: "smooth" });
  }, []);

  const scrollThumbnailsRight = useCallback(() => {
    const container = thumbnailBarRef.current;
    if (!container) return;
    container.scrollBy({ left: 200, behavior: "smooth" });
  }, []);

  // Keep overlay aligned with the PDF page on resize and page changes
  useEffect(() => {
    const rafId = requestAnimationFrame(syncOverlayToPage);

    const handleResize = () => {
      requestAnimationFrame(syncOverlayToPage);
    };
    window.addEventListener("resize", handleResize);

    const pageEl = findCurrentPageElement();
    const ro =
      pageEl && "ResizeObserver" in window
        ? new ResizeObserver(() => syncOverlayToPage())
        : null;
    if (ro && pageEl) {
      ro.observe(pageEl);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      if (ro && pageEl) {
        ro.unobserve(pageEl);
        ro.disconnect();
      }
    };
  }, [currentPage, totalPages, syncOverlayToPage, findCurrentPageElement]);

  // Handle textarea resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = resizeStartRef.current.y - e.clientY;
      const newHeight = Math.min(
        240,
        Math.max(200, resizeStartRef.current.height + deltaY),
      );
      setTextareaHeight(newHeight);
      // Resync overlay position as layout may change
      requestAnimationFrame(syncOverlayToPage);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Final sync after resize completes
      requestAnimationFrame(syncOverlayToPage);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, syncOverlayToPage]);

  // Resync overlay when textarea height changes
  useEffect(() => {
    requestAnimationFrame(syncOverlayToPage);
  }, [textareaHeight, syncOverlayToPage]);

  // Update highlight menu position when selectedNoteId changes
  useEffect(() => {
    updateHighlightMenuPosition();
  }, [selectedNoteId, updateHighlightMenuPosition]);

  // Keep overlay and highlight menu aligned to the visible page during scroll/resize
  useEffect(() => {
    updateHighlightMenuPosition();

    const handleScroll = () =>
      requestAnimationFrame(() => {
        updateHighlightMenuPosition();
        syncOverlayToPage();
      });
    const handleResize = () =>
      requestAnimationFrame(() => {
        updateHighlightMenuPosition();
        syncOverlayToPage();
      });

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateHighlightMenuPosition, syncOverlayToPage]);

  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    resizeStartRef.current = {
      y: e.clientY,
      height: textareaHeight,
    };
    e.preventDefault();
  };

  // Handle double-click to create textbox in select mode
  const handleContainerDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      // Only handle in select mode (other modes are handled by SketchCanvas)
      if (inputMode !== "select") return;

      const target = e.target as HTMLElement;
      const isClickingSelectionMenu =
        target.closest('[data-selection-menu="true"]') ||
        target.closest('[data-highlight-menu="true"]');

      if (isClickingSelectionMenu) return;

      const selection = window.getSelection();
      const hasActiveTextSelection =
        !!selection && selection.toString().trim().length > 0;

      const isClickingTextSpan = !!target.closest(".rpv-core__text-layer span");

      // If user double-clicks actual text (span) or there is an active selection,
      // skip textbox creation to avoid conflicting with highlight behavior.
      if (isClickingTextSpan || hasActiveTextSelection) {
        return;
      }

      // Calculate position relative to overlay
      const overlay = overlayRef.current;
      if (!overlay) return;

      const overlayRect = overlay.getBoundingClientRect();
      const x = e.clientX - overlayRect.left;
      const y = e.clientY - overlayRect.top - 16; // Match SketchCanvas offset

      // Create new textbox
      const newTextbox: TextboxData = {
        x,
        y,
        text: "",
        fontSize: 16,
        color: "#000000",
        isMath: false, // Default to text mode
      };

      const currentCanvas = documentCanvases?.[currentPage];
      const newTextboxIndex = currentCanvas?.textboxes?.length || 0;
      const newCanvas: Canvas = {
        ...currentCanvas,
        textboxes: [...(currentCanvas?.textboxes || []), newTextbox],
      };

      updateDocumentCanvas?.(currentPage, newCanvas);

      // Auto-open the newly created textbox by asking SketchCanvas to enter edit mode
      setTimeout(() => {
        const canvasElement = document.querySelector(
          `[data-canvas-id="document-page-${currentPage}"]`,
        ) as HTMLElement | null;
        if (canvasElement) {
          canvasElement.dispatchEvent(
            new CustomEvent("request-edit-textbox", {
              bubbles: true,
              detail: { index: newTextboxIndex },
            }),
          );
        }
      }, 80);
    },
    [inputMode, currentPage, documentCanvases, updateDocumentCanvas],
  );

  // Capture selection area as screenshot (for debug: returns base, overlay, and composite separately)
  const captureSelectionArea = useCallback(
    async (box: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    }) => {
      // Calculate bounds
      const x = Math.min(box.startX, box.endX);
      const y = Math.min(box.startY, box.endY);
      const width = Math.abs(box.endX - box.startX);
      const height = Math.abs(box.endY - box.startY);

      if (width < 10 || height < 10) return null; // Too small

      // Get overlay position to convert to viewport coords
      const overlay = overlayRef.current;
      if (!overlay) return null;

      const overlayRect = overlay.getBoundingClientRect();

      // Selection box coords are relative to overlay
      const viewportX = overlayRect.left + x;
      const viewportY = overlayRect.top + y;

      // Find the PDF page canvas
      const pageEl = findCurrentPageElement();
      if (!pageEl) return null;

      const pdfCanvas = pageEl.querySelector("canvas") as HTMLCanvasElement;
      if (!pdfCanvas) return null;

      // Calculate offset from page to selection
      const pageRect = pageEl.getBoundingClientRect();
      const offsetX = viewportX - pageRect.left;
      const offsetY = viewportY - pageRect.top;

      // Scale factor (PDF canvas may be higher res than CSS pixels)
      const scaleX = pdfCanvas.width / pageRect.width;
      const scaleY = pdfCanvas.height / pageRect.height;

      // 1. Create BASE canvas (PDF only)
      const baseCanvas = document.createElement("canvas");
      baseCanvas.width = width;
      baseCanvas.height = height;
      const baseCtx = baseCanvas.getContext("2d");
      if (!baseCtx) return null;

      baseCtx.drawImage(
        pdfCanvas,
        offsetX * scaleX,
        offsetY * scaleY,
        width * scaleX,
        height * scaleY,
        0,
        0,
        width,
        height,
      );
      const baseDataUrl = baseCanvas.toDataURL("image/png");

      // 2. Create OVERLAY canvas (annotations only)
      // Use scrollContainer with filter (like MOSessionStructure) - temporarily make bg transparent
      let overlayDataUrl = "";
      let overlayImg: HTMLImageElement | null = null;
      const scrollContainer = scrollContainerRef.current;
      try {
        if (!scrollContainer) throw new Error("No scroll container");

        // Temporarily make container background transparent
        const originalBg = scrollContainer.style.backgroundColor;
        scrollContainer.style.backgroundColor = "transparent";

        const fullOverlayDataUrl = await domToDataUrl(scrollContainer, {
          backgroundColor: null,
          scale: 1,
          filter: (node: Node) => {
            // Skip images
            if (node instanceof HTMLImageElement) return false;
            // Skip the PDF viewer content (we already have that)
            if (
              node instanceof HTMLElement &&
              node.hasAttribute("data-testid") &&
              node.getAttribute("data-testid") === "core__viewer"
            )
              return false;
            // Skip PDF page layers
            if (
              node instanceof HTMLElement &&
              node.classList.contains("rpv-core__page-layer")
            )
              return false;
            // Include everything else (overlays, textboxes, etc.)
            return true;
          },
        });

        // Restore original background
        scrollContainer.style.backgroundColor = originalBg;

        // Load and crop overlay
        overlayImg = new Image();
        await new Promise<void>((resolve, reject) => {
          overlayImg!.onload = () => resolve();
          overlayImg!.onerror = reject;
          overlayImg!.src = fullOverlayDataUrl;
        });

        // Calculate crop coords relative to scrollContainer
        const containerRect = scrollContainer.getBoundingClientRect();
        const cropX = viewportX - containerRect.left;
        const cropY = viewportY - containerRect.top;

        // Create cropped overlay canvas
        const croppedOverlayCanvas = document.createElement("canvas");
        croppedOverlayCanvas.width = width;
        croppedOverlayCanvas.height = height;
        const croppedOverlayCtx = croppedOverlayCanvas.getContext("2d");
        if (croppedOverlayCtx) {
          croppedOverlayCtx.drawImage(overlayImg, cropX, cropY, width, height, 0, 0, width, height);
          overlayDataUrl = croppedOverlayCanvas.toDataURL("image/png");

          // Store for composite
          overlayImg = new Image();
          overlayImg.src = overlayDataUrl;
          await new Promise<void>((resolve) => {
            overlayImg!.onload = () => resolve();
          });
        }
      } catch (err) {
        console.warn("Failed to capture overlay annotations:", err);
        // Restore background in case of error
        if (scrollContainer) scrollContainer.style.backgroundColor = "";
      }

      // 3. Create COMPOSITE canvas (base + overlay)
      const compositeCanvas = document.createElement("canvas");
      compositeCanvas.width = width;
      compositeCanvas.height = height;
      const compositeCtx = compositeCanvas.getContext("2d");
      if (!compositeCtx) return null;

      // Draw base layer
      compositeCtx.drawImage(baseCanvas, 0, 0);

      // Draw cropped overlay on top if available (already cropped to correct region)
      if (overlayImg && overlayDataUrl) {
        compositeCtx.drawImage(overlayImg, 0, 0);
      }
      const compositeDataUrl = compositeCanvas.toDataURL("image/png");

      return {
        baseDataUrl,
        overlayDataUrl: overlayDataUrl || baseDataUrl, // fallback if overlay capture failed
        compositeDataUrl,
        x,
        y,
        width,
        height,
      };
    },
    [findCurrentPageElement],
  );

  // Helper to clear screenshot selection (both local state and chat context)
  const clearScreenshotSelection = useCallback(() => {
    setCompletedSelectionBox(null);
    setSelectionPreview(null);
    updateSelectedScreenshot(null);
  }, [updateSelectedScreenshot]);

  // Selection box: document-level listeners for click-and-drag in select mode
  // Uses elementsFromPoint to check if over text - if so, let native selection work
  useEffect(() => {
    if (inputMode !== "select") return;

    let isDrawing = false;

    const handleMouseDown = (e: MouseEvent) => {
      // If the user is currently dragging items in the sidebar, ignore selection-box behavior.
      // Sidebar DnD uses document-level listeners too, and without this the two features fight.
      try {
        if ((window as any).__medlyOpenSidebarDndActive) return;
      } catch {
        // no-op
      }
      const container = scrollContainerRef.current;
      if (!container) return;

      // Critical: only start rectangle selection if the original mousedown happened on a node
      // inside the PDF container. Since this listener is attached at document-level, clicks
      // on the sidebar can still fall "within" the container rect even though the event target
      // is not part of the PDF subtree (sidebar overlays the page).
      const targetNode = e.target as Node | null;
      if (!targetNode || !container.contains(targetNode)) return;

      // Check if click is within the container
      const containerRect = container.getBoundingClientRect();
      if (
        e.clientX < containerRect.left ||
        e.clientX > containerRect.right ||
        e.clientY < containerRect.top ||
        e.clientY > containerRect.bottom
      )
        return;

      // Check if clicking on text or textboxes using elementsFromPoint
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const isOverText = elements.some(
        (el) =>
          el.closest(".rpv-core__text-layer span") ||
          el.closest('[data-selection-menu="true"]') ||
          el.closest('[data-highlight-menu="true"]'),
      );
      const isOverTextbox = elements.some(
        (el) =>
          el.closest("[data-textbox-index]") ||
          el.closest('[contenteditable="true"]') ||
          el.closest("math-field"),
      );

      if (isOverText || isOverTextbox) return; // Let native text selection or textbox interaction work

      // Start selection box
      const overlay = overlayRef.current;
      if (!overlay) return;

      const rect = overlay.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Check if click is inside existing completed selection box (on the same page)
      const existingBox = completedSelectionBoxRef.current;
      if (existingBox) {
        const onSamePage = existingBox.page === currentPage;
        const insideBox =
          onSamePage &&
          clickX >= existingBox.x &&
          clickX <= existingBox.x + existingBox.width &&
          clickY >= existingBox.y &&
          clickY <= existingBox.y + existingBox.height;

        if (!insideBox) {
          // Click outside or on different page - clear existing selection
          clearScreenshotSelection();
        }
      }

      // Prevent browser text selection while drawing
      e.preventDefault();
      // Clear any existing text selection
      window.getSelection()?.removeAllRanges();

      isDrawing = true;
      setSelectionBox({ startX: clickX, startY: clickY, endX: clickX, endY: clickY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      try {
        if ((window as any).__medlyOpenSidebarDndActive) return;
      } catch {
        // no-op
      }
      if (!isDrawing) return;

      const overlay = overlayRef.current;
      if (!overlay) return;

      const rect = overlay.getBoundingClientRect();
      setSelectionBox((prev) =>
        prev
          ? {
            ...prev,
            endX: e.clientX - rect.left,
            endY: e.clientY - rect.top,
          }
          : null,
      );
    };

    const handleMouseUp = async () => {
      try {
        if ((window as any).__medlyOpenSidebarDndActive) return;
      } catch {
        // no-op
      }
      if (!isDrawing) return;
      isDrawing = false;

      // Get current selection box from ref before clearing drawing state
      const currentBox = selectionBoxRef.current;
      setSelectionBox(null);

      if (currentBox) {
        // Calculate final box dimensions
        const x = Math.min(currentBox.startX, currentBox.endX);
        const y = Math.min(currentBox.startY, currentBox.endY);
        const width = Math.abs(currentBox.endX - currentBox.startX);
        const height = Math.abs(currentBox.endY - currentBox.startY);

        // Only process if box is big enough
        if (width >= 10 && height >= 10) {
          // Track PDF selection drag
          track("pdf_selection_dragged", { document_id: documentId });

          // Capture screenshot FIRST (before showing the completed selection box)
          const preview = await captureSelectionArea(currentBox);

          // Now show the completed selection box (store page so it only shows on this page)
          setCompletedSelectionBox({ x, y, width, height, page: currentPage });

          if (preview) {
            setSelectionPreview(preview);
            // Also update chat context for input bar preview
            updateSelectedScreenshot({
              dataUrl: preview.compositeDataUrl,
              width: preview.width,
              height: preview.height,
            });

            // First time user drags a screenshot: auto-send "Explain this"
            if (!hasDraggedScreenshot) {
              setHasDraggedScreenshot(true);
              localStorage.setItem(LOCALSTORAGE_KEY_HAS_DRAGGED, "true");
              // Auto-send explain message with the screenshot
              sendMessage("Explain this", { screenshot: { dataUrl: preview.compositeDataUrl } });
            }
          }
        }
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [inputMode, captureSelectionArea, updateSelectedScreenshot, clearScreenshotSelection, hasDraggedScreenshot, LOCALSTORAGE_KEY_HAS_DRAGGED, sendMessage, track, documentId, currentPage]);

  // Clear rectangle selection when user selects text
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim() && completedSelectionBoxRef.current) {
        clearScreenshotSelection();
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [clearScreenshotSelection]);

  // Track mouse position for "Drag to take a screenshot" tooltip (first-time users)
  useEffect(() => {
    if (inputMode !== "select" || hasDraggedScreenshot) {
      setTooltipMousePos(null);
      return;
    }

    const container = scrollContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return;

      // Check if mouse is over the actual page content, not overlaying UI
      const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
      if (!elementUnderMouse) {
        setTooltipMousePos(null);
        return;
      }

      // Check if the element is within the scroll container AND is part of actual page content
      // (not a dropdown, popover, overlay, or background area around the slides)
      const isInScrollContainer = container.contains(elementUnderMouse);
      const isOverPageContent = elementUnderMouse.closest('.rpv-core__page-layer');
      const isInPortal = elementUnderMouse.closest('[data-radix-popper-content-wrapper]') ||
        elementUnderMouse.closest('[role="dialog"]') ||
        elementUnderMouse.closest('[role="menu"]');

      if (isInScrollContainer && isOverPageContent && !isInPortal && !selectionBoxRef.current) {
        setTooltipMousePos({ x: e.clientX, y: e.clientY });
      } else {
        setTooltipMousePos(null);
      }
    };

    const handleMouseLeave = () => setTooltipMousePos(null);

    document.addEventListener("mousemove", handleMouseMove);
    container?.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      container?.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [inputMode, hasDraggedScreenshot]);

  // Sync: when screenshot is cleared externally (X button or send), clear local box
  // Track previous value to only clear on transition from truthy → falsy
  const prevSelectedScreenshotRef = useRef(selectedScreenshot);
  useEffect(() => {
    const wasSet = !!prevSelectedScreenshotRef.current;
    const isSet = !!selectedScreenshot;
    prevSelectedScreenshotRef.current = selectedScreenshot;

    // Only clear when transitioning from having a screenshot to not having one
    if (wasSet && !isSet && completedSelectionBox) {
      setCompletedSelectionBox(null);
      setSelectionPreview(null);
    }
  }, [selectedScreenshot, completedSelectionBox]);

  // Add comment programmatically by finding text in PDF and creating a highlight
  // Searches across all pages in the PDF, not just the current page
  const addComment = useCallback(
    async (text: string, comment: string) => {
      const container = scrollContainerRef.current;
      if (!container) {
        console.error("addComment: No container ref");
        return;
      }

      // Normalize text for comparison (similar to flashHighlightText logic)
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^\w\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      const normText = normalize(text);
      const tokensTarget = normText.split(" ").filter(Boolean);
      if (tokensTarget.length === 0) {
        console.error("addComment: Empty text after normalization");
        return;
      }

      // Get all page layers (not just the current one)
      const allPageLayers = Array.from(
        container.querySelectorAll(".rpv-core__page-layer"),
      ) as HTMLElement[];

      if (allPageLayers.length === 0) {
        console.error("addComment: No page layers found");
        return;
      }

      // Helper function to extract page number from data-testid
      // Format is typically: "core__page-layer-{pageNumber}" (0-based) or similar
      const extractPageNumber = (pageEl: HTMLElement): number | null => {
        const testId = pageEl.getAttribute("data-testid");
        if (!testId) return null;

        // Try to extract page number from data-testid (e.g., "core__page-layer-0" -> 0)
        const match = testId.match(/page-layer-(\d+)/);
        if (match) {
          return parseInt(match[1], 10) + 1; // Convert to 1-based
        }
        return null;
      };

      // Search through all pages for the text
      let foundPageEl: HTMLElement | null = null;
      let foundPageNumber: number | null = null;
      let matchedRects: DOMRect[] = [];

      for (const pageEl of allPageLayers) {
        const textLayer = pageEl.querySelector(
          ".rpv-core__text-layer",
        ) as HTMLElement | null;
        if (!textLayer) continue;

        // Build tokens from spans
        const spans = Array.from(
          textLayer.querySelectorAll("span"),
        ) as HTMLSpanElement[];
        type Tok = { norm: string; rect: DOMRect; span: HTMLSpanElement };
        const toks: Tok[] = [];
        for (const sp of spans) {
          const rect = sp.getBoundingClientRect();
          const parts = (sp.textContent || "").split(/\s+/).filter(Boolean);
          for (const p of parts) {
            const n = normalize(p);
            if (n) toks.push({ norm: n, rect, span: sp });
          }
        }

        const norms = toks.map((t) => t.norm);
        const L = tokensTarget.length;

        // Find matching sequence
        for (let i = 0; i <= norms.length - L; i++) {
          let ok = true;
          for (let j = 0; j < L; j++) {
            if (norms[i + j] !== tokensTarget[j]) {
              ok = false;
              break;
            }
          }
          if (ok) {
            matchedRects = toks.slice(i, i + L).map((t) => t.rect);
            foundPageEl = pageEl;
            foundPageNumber = extractPageNumber(pageEl);
            break;
          }
        }

        if (foundPageEl) break; // Found the text, stop searching
      }

      if (!foundPageEl || matchedRects.length === 0) {
        console.error("addComment: Text not found in PDF across all pages");
        return;
      }

      // Determine target page number (use extracted or fallback to current page)
      const targetPage = foundPageNumber ?? currentPage;
      const pageIndex0 = targetPage - 1; // 0-based for highlightAreas

      // Navigate to the target page if it's not the current page
      if (targetPage !== currentPage) {
        try {
          console.log(`📄 Navigating to page ${targetPage} to add comment`);
          (pageNavigationPluginInstance as any).jumpToPage(pageIndex0);

          // Wait for page to load and render (give it time for text layer to render)
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Re-find the page element after navigation
          const updatedPageEl = Array.from(
            container.querySelectorAll(".rpv-core__page-layer"),
          ).find((el) => {
            const pageNum = extractPageNumber(el as HTMLElement);
            return pageNum === targetPage;
          }) as HTMLElement | null;

          if (updatedPageEl) {
            foundPageEl = updatedPageEl;

            // Re-extract matched rects from the newly visible page
            const textLayer = foundPageEl.querySelector(
              ".rpv-core__text-layer",
            ) as HTMLElement | null;
            if (textLayer) {
              const spans = Array.from(
                textLayer.querySelectorAll("span"),
              ) as HTMLSpanElement[];
              type Tok = { norm: string; rect: DOMRect; span: HTMLSpanElement };
              const toks: Tok[] = [];
              for (const sp of spans) {
                const rect = sp.getBoundingClientRect();
                const parts = (sp.textContent || "")
                  .split(/\s+/)
                  .filter(Boolean);
                for (const p of parts) {
                  const n = normalize(p);
                  if (n) toks.push({ norm: n, rect, span: sp });
                }
              }

              const norms = toks.map((t) => t.norm);
              const L = tokensTarget.length;

              // Re-find matching sequence
              for (let i = 0; i <= norms.length - L; i++) {
                let ok = true;
                for (let j = 0; j < L; j++) {
                  if (norms[i + j] !== tokensTarget[j]) {
                    ok = false;
                    break;
                  }
                }
                if (ok) {
                  matchedRects = toks.slice(i, i + L).map((t) => t.rect);
                  break;
                }
              }
            }
          }
        } catch (error) {
          console.error("addComment: Error navigating to page", error);
          // Continue anyway - might still work if page is already loaded
        }
      }

      // Merge rects per line (similar to flashHighlightText)
      const threshold = 6;
      const sorted = matchedRects
        .slice()
        .sort((a, b) => a.top - b.top || a.left - b.left);
      const groups: DOMRect[][] = [];
      for (const r of sorted) {
        const last = groups[groups.length - 1];
        if (!last) {
          groups.push([r]);
          continue;
        }
        if (Math.abs(r.top - last[0].top) <= threshold) {
          last.push(r);
        } else {
          groups.push([r]);
        }
      }

      const merged = groups.map((g) => {
        const left = Math.min(...g.map((r) => r.left));
        const top = Math.min(...g.map((r) => r.top));
        const right = Math.max(...g.map((r) => r.right));
        const bottom = Math.max(...g.map((r) => r.bottom));
        return new DOMRect(left, top, right - left, bottom - top);
      });

      // Get page rect for percentage conversion
      const pageRect = foundPageEl.getBoundingClientRect();

      // Convert merged rects to highlight areas (percentages relative to page)
      const highlightAreas: HighlightArea[] = merged.map((m) => {
        const left = ((m.left - pageRect.left) / pageRect.width) * 100;
        const top = ((m.top - pageRect.top) / pageRect.height) * 100;
        const width = (m.width / pageRect.width) * 100;
        const height = (m.height / pageRect.height) * 100;

        return {
          pageIndex: pageIndex0,
          left,
          top,
          width,
          height,
        };
      });

      // Create new note with highlight areas and comment
      const newNote: Note = {
        id: ++noteIdCounter.current,
        content: comment,
        highlightAreas,
        quote: text,
      };

      // Add to notes and save immediately (don't mark as unsaved since content is provided)
      // Use the target page for the update
      applyUserNotesUpdate((prev) => [...prev, newNote], targetPage);
      // Note: applyUserNotesUpdate already persists via updateDocumentHighlights, so no need to mark as unsaved

      console.log("✅ addComment: Created and saved comment", {
        text,
        comment,
        noteId: newNote.id,
        page: targetPage,
      });
    },
    [currentPage, applyUserNotesUpdate, pageNavigationPluginInstance],
  );

  // Expose addComment function via ref callback - only when function is ready
  useEffect(() => {
    if (setAddCommentRef) {
      setAddCommentRef(addComment);
    }
    return () => {
      if (setAddCommentRef) {
        setAddCommentRef(null);
      }
    };
  }, [setAddCommentRef, addComment]);

  // ----------------------------------------
  // Chat context: Register context collector
  // ----------------------------------------
  const collectDocumentContext = useCallback(async () => {
    // Get highlighted text from current page's notes
    const currentPageHighlights = documentHighlights?.[currentPage] || [];
    const highlightedTextList = currentPageHighlights
      .map((note: DocumentNote) => note.quote)
      .filter((quote: string) => quote && quote.trim().length > 0);

    // Capture hybrid screenshot (PDF + overlay composite)
    const { pageScreenshot } = await captureHybridScreenshot(
      scrollContainerRef.current
    );

    return {
      currentPage,
      totalPages,
      documentNotes: documentNotes?.[currentPage] || "",
      highlightedText: highlightedTextList,
      pageScreenshot,
      currentPageText: localCurrentPageText,
      allPagesText: localAllPagesText,
    };
  }, [currentPage, totalPages, documentNotes, documentHighlights, localCurrentPageText, localAllPagesText]);

  useRegisterContextCollector("document", collectDocumentContext);

  // ----------------------------------------
  // Chat context: Register capabilities
  // ----------------------------------------

  // Capability: Add a comment/highlight to text in the PDF
  const handleAiAddComment = useCallback(
    async (params: { text: string; comment: string }) => {
      await addComment(params.text, params.comment);
    },
    [addComment],
  );
  useRegisterCapability("addComment", handleAiAddComment, "document");

  // Capability: Navigate to a specific PDF page
  const handleAiNavigateToPage = useCallback(
    async (params: { page: number }) => {
      if (params.page >= 1 && params.page <= totalPages) {
        // react-pdf-viewer expects 0-based index
        (pageNavigationPluginInstance as any).jumpToPage(params.page - 1);
      }
    },
    [totalPages, pageNavigationPluginInstance],
  );
  useRegisterCapability("navigateToPage", handleAiNavigateToPage, "document");

  // Capability: Create a yellow text highlight (like user clicking "Highlight")
  const handleAiHighlightText = useCallback(
    async (params: { text: string; page?: number }) => {
      const container = scrollContainerRef.current;
      if (!container) {
        console.error("highlightText: No container ref");
        return;
      }

      // Normalize text for comparison
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^\w\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      const normText = normalize(params.text);
      const tokensTarget = normText.split(" ").filter(Boolean);
      if (tokensTarget.length === 0) {
        console.error("highlightText: Empty text after normalization");
        return;
      }

      // Get all page layers
      const allPageLayers = Array.from(
        container.querySelectorAll(".rpv-core__page-layer"),
      ) as HTMLElement[];

      if (allPageLayers.length === 0) {
        console.error("highlightText: No page layers found");
        return;
      }

      // Helper to extract page number from data-testid
      const extractPageNumber = (pageEl: HTMLElement): number | null => {
        const testId = pageEl.getAttribute("data-testid");
        if (!testId) return null;
        const match = testId.match(/page-layer-(\d+)/);
        if (match) {
          return parseInt(match[1], 10) + 1; // Convert to 1-based
        }
        return null;
      };

      // If specific page requested, navigate first
      if (params.page && params.page >= 1 && params.page <= totalPages && params.page !== currentPage) {
        try {
          (pageNavigationPluginInstance as any).jumpToPage(params.page - 1);
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error("highlightText: Error navigating to page", error);
        }
      }

      // Search through all pages for the text
      let foundPageEl: HTMLElement | null = null;
      let foundPageNumber: number | null = null;
      let matchedRects: DOMRect[] = [];

      for (const pageEl of allPageLayers) {
        const textLayer = pageEl.querySelector(
          ".rpv-core__text-layer",
        ) as HTMLElement | null;
        if (!textLayer) continue;

        // Build tokens from spans
        const spans = Array.from(
          textLayer.querySelectorAll("span"),
        ) as HTMLSpanElement[];
        type Tok = { norm: string; rect: DOMRect };
        const toks: Tok[] = [];
        for (const sp of spans) {
          const rect = sp.getBoundingClientRect();
          const parts = (sp.textContent || "").split(/\s+/).filter(Boolean);
          for (const p of parts) {
            const n = normalize(p);
            if (n) toks.push({ norm: n, rect });
          }
        }

        const norms = toks.map((t) => t.norm);
        const L = tokensTarget.length;

        // Find matching sequence
        for (let i = 0; i <= norms.length - L; i++) {
          let ok = true;
          for (let j = 0; j < L; j++) {
            if (norms[i + j] !== tokensTarget[j]) {
              ok = false;
              break;
            }
          }
          if (ok) {
            matchedRects = toks.slice(i, i + L).map((t) => t.rect);
            foundPageEl = pageEl;
            foundPageNumber = extractPageNumber(pageEl);
            break;
          }
        }

        if (foundPageEl) break;
      }

      if (!foundPageEl || matchedRects.length === 0) {
        console.error("highlightText: Text not found in PDF");
        return;
      }

      const targetPage = foundPageNumber ?? currentPage;
      const pageIndex0 = targetPage - 1;

      // Merge rects per line
      const threshold = 6;
      const sorted = matchedRects
        .slice()
        .sort((a, b) => a.top - b.top || a.left - b.left);
      const groups: DOMRect[][] = [];
      for (const r of sorted) {
        const last = groups[groups.length - 1];
        if (!last) {
          groups.push([r]);
          continue;
        }
        if (Math.abs(r.top - last[0].top) <= threshold) {
          last.push(r);
        } else {
          groups.push([r]);
        }
      }

      const merged = groups.map((g) => {
        const left = Math.min(...g.map((r) => r.left));
        const top = Math.min(...g.map((r) => r.top));
        const right = Math.max(...g.map((r) => r.right));
        const bottom = Math.max(...g.map((r) => r.bottom));
        return new DOMRect(left, top, right - left, bottom - top);
      });

      // Get page rect for percentage conversion
      const pageRect = foundPageEl.getBoundingClientRect();

      // Convert merged rects to highlight areas (percentages relative to page)
      const highlightAreas: HighlightArea[] = merged.map((m) => ({
        pageIndex: pageIndex0,
        left: ((m.left - pageRect.left) / pageRect.width) * 100,
        top: ((m.top - pageRect.top) / pageRect.height) * 100,
        width: (m.width / pageRect.width) * 100,
        height: (m.height / pageRect.height) * 100,
      }));

      // Create new note with highlight areas (no comment content)
      const newNote: Note = {
        id: ++noteIdCounter.current,
        content: "",
        highlightAreas,
        quote: params.text,
      };

      applyUserNotesUpdate((prev) => [...prev, newNote], targetPage);

      console.log("✅ highlightText: Created highlight", {
        text: params.text,
        noteId: newNote.id,
        page: targetPage,
      });
    },
    [currentPage, totalPages, applyUserNotesUpdate, pageNavigationPluginInstance],
  );
  useRegisterCapability("highlightText", handleAiHighlightText, "document");

  // Capability: Show a bounding box overlay at specific coordinates
  const handleAiHighlightArea = useCallback(
    async (params: {
      label?: string;
      box_2d: [number, number, number, number];
      page?: number;
      clear?: boolean;
    }) => {
      // Clear the overlay if requested
      if (params.clear) {
        setAiHighlightArea(null);
        console.log("✅ highlightArea: Cleared overlay");
        return;
      }

      // Navigate to page if specified
      if (params.page && params.page >= 1 && params.page <= totalPages && params.page !== currentPage) {
        try {
          (pageNavigationPluginInstance as any).jumpToPage(params.page - 1);
        } catch (error) {
          console.error("highlightArea: Error navigating to page", error);
        }
      }

      // Set the AI highlight area (overwrites any previous)
      setAiHighlightArea({
        label: params.label || "",
        box_2d: params.box_2d,
        show: true,
      });

      console.log("✅ highlightArea: Set bounding box overlay", {
        label: params.label,
        box_2d: params.box_2d,
        page: params.page || currentPage,
      });
    },
    [currentPage, totalPages, pageNavigationPluginInstance],
  );
  useRegisterCapability("highlightArea", handleAiHighlightArea, "document");

  // Helper: get translated text for a span
  const getTranslatedText = useCallback(
    (originalText: string): string => {
      const pageTranslations = translatedText?.[currentPage];
      if (pageTranslations) {
        const match = pageTranslations.find(
          (t) => t.original.trim() === originalText.trim(),
        );
        if (match) return match.translated;
      }
      return originalText;
    },
    [translatedText, currentPage],
  );

  return (
    <div className={`flex-1 w-full flex ${SIDEBAR_POSITION === "left" ? "flex-row" : "flex-col"} h-full`}>
      {/* Left Thumbnail Sidebar (only when SIDEBAR_POSITION === "left" and thumbnails enabled) */}
      {SHOW_THUMBNAILS && SIDEBAR_POSITION === "left" && (
        <div className="w-40 overflow-y-auto">
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Thumbnails />
          </Worker>
        </div>
      )}

      {/* PDF Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          ref={scrollContainerRef}
          data-screenshot-target="true"
          className={`relative flex-1 overflow-hidden flex flex-col ${inputMode === "grab"
              ? isDraggingPage
                ? "cursor-grabbing"
                : "cursor-grab"
              : ""
            } ${showTranslation ? "rpv-translation-active" : ""} ${!isLandscape ? "rpv-portrait-mode" : ""}`}
          style={{ minHeight: 0, "--portrait-overlay-color": portraitOverlayColor } as React.CSSProperties}
          onDoubleClick={handleContainerDoubleClick}
        >
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <div className="h-full w-full flex justify-center">
              <div className="w-full">
                <Viewer
                  fileUrl={url}
                  plugins={[
                    highlightPluginInstance,
                    scrollModePluginInstance,
                    pageNavigationPluginInstance,
                    thumbnailPluginInstance,
                  ]}
                  defaultScale={isWideScreen ? undefined : SpecialZoomLevel.PageWidth}
                  scrollMode={
                    SCROLL_MODE === "page" && isLandscape
                      ? ScrollMode.Page
                      : ScrollMode.Vertical
                  }
                  pageLayout={pageLayout}
                  enableSmoothScroll={false}
                  renderLoader={() => (
                    <div className="flex items-center justify-center h-full">
                      <Spinner />
                    </div>
                  )}
                  onDocumentLoad={async (e) => {
                    setTotalPages(e.doc.numPages);
                    // Detect document orientation from first page
                    try {
                      const firstPage = await e.doc.getPage(1);
                      const viewport = firstPage.getViewport({ scale: 1 });
                      const isLandscapeDoc = viewport.width > viewport.height;
                      setIsLandscape(isLandscapeDoc);
                      console.log(
                        `📄 Document orientation: ${isLandscapeDoc ? "landscape" : "portrait"} (${viewport.width}x${viewport.height})`,
                      );
                    } catch (err) {
                      console.error("Error detecting orientation:", err);
                    }
                    // Extract text from first page on load
                    extractTextFromPage(e.doc, 1);
                    // Extract text from all pages
                    const allPagesText = await extractAllPagesText(e.doc);

                    // Align overlay after document layout stabilizes
                    requestAnimationFrame(syncOverlayToPage);
                  }}
                  onPageChange={async (e) => {
                    const newPage = e.currentPage + 1;
                    console.log("📄 [onPageChange] ->", {
                      newPage,
                      prevPage: currentPage,
                      docHighlightsCount:
                        (documentHighlights &&
                          (documentHighlights as any)[newPage]?.length) ??
                        "undefined",
                      localNotesCount: notes.length,
                    });
                    setCurrentPage(newPage);
                    setCurrentSelectionNote(null);
                    // Close highlight menu on page change
                    setSelectedNoteId(null);
                    setHighlightMenuPosition(null);
                    // Notify parent component of PDF page change
                    if (onPdfPageChange) {
                      onPdfPageChange(newPage);
                    }
                    // Extract text from new page when page changes (updates local state)
                    await extractTextFromPage(e.doc, newPage);
                    // Align overlay to the new page
                    requestAnimationFrame(syncOverlayToPage);
                  }}
                />
              </div>
            </div>
          </Worker>

          {/* Translation text overlay - renders translated text on top of faded original */}
          {showTranslation && translationSpans.length > 0 && (
            <div
              className="absolute pointer-events-none"
              style={{
                // Position relative to scroll container - will be synced with page
                zIndex: 4, // Above canvas (faded), below text layer
              }}
            >
              {(() => {
                const pageEl = findCurrentPageElement();
                if (!pageEl) return null;

                const container = scrollContainerRef.current;
                if (!container) return null;

                const containerRect = container.getBoundingClientRect();
                const pageRect = pageEl.getBoundingClientRect();

                return (
                  <div
                    style={{
                      position: "absolute",
                      left: pageRect.left - containerRect.left,
                      top: pageRect.top - containerRect.top,
                      width: pageRect.width,
                      height: pageRect.height,
                    }}
                  >
                    {translationSpans.map((span, idx) => (
                      <span
                        key={idx}
                        style={{
                          position: "absolute",
                          left: span.left,
                          top: span.top - 4,
                          fontSize: span.fontSize,
                          fontFamily: span.fontFamily,
                          transform: span.transform,
                          transformOrigin: "left top",
                          color: "#000",
                          fontWeight: 500,
                          whiteSpace: "pre",
                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                          blur: "1px",
                          padding: "0 2px",
                        }}
                      >
                        {getTranslatedText(span.text)}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* SketchCanvas overlay for textboxes and drawing */}
          <div
            ref={overlayRef}
            className="absolute overflow-visible rounded-[16px] z-5"
            style={{ pointerEvents: inputMode === "select" ? "none" : "auto" }}
          >
            <div>
              <SketchCanvas
                inputMode={inputMode}
                isDraggingPage={isDraggingPage}
                setInputMode={setInputMode}
                isReadOnly={false}
                canvas={documentCanvases?.[currentPage]}
                updateQuestionCanvas={handleUpdateCanvas}
                questionGroupId={currentPage}
                questionLegacyId={`document-page-${currentPage}`}
                questionAnnotations={undefined}
                handleSendMessage={() => { }}
                canvasMessage={undefined}
              />
            </div>

            {/* Selection box for click-and-drag selection in select mode (drawing state - with fill) */}
            {selectionBox && (
              <div
                style={{
                  position: "absolute",
                  left: Math.min(selectionBox.startX, selectionBox.endX),
                  top: Math.min(selectionBox.startY, selectionBox.endY),
                  width: Math.abs(selectionBox.endX - selectionBox.startX),
                  height: Math.abs(selectionBox.endY - selectionBox.startY),
                  border: "1.5px solid #05B0FF",
                  backgroundColor: "rgba(5, 176, 255, 0.1)",
                  pointerEvents: "none",
                  zIndex: 100,
                }}
              />
            )}

            {/* Completed selection box (persisted after drawing - with fill, only on the page where it was drawn) */}
            {!selectionBox && completedSelectionBox && completedSelectionBox.page === currentPage && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: completedSelectionBox.x,
                    top: completedSelectionBox.y,
                    width: completedSelectionBox.width,
                    height: completedSelectionBox.height,
                    backgroundColor: "rgba(5, 176, 255, 0.1)",
                    pointerEvents: "none",
                    zIndex: 100,
                  }}
                />
                {/* Tooltip menu above the selection box */}
                <div
                  data-selection-menu="true"
                  className="font-rounded-bold bg-white rounded-lg px-2.5 py-1.5 text-[13px] font-bold whitespace-nowrap pointer-events-auto drop-shadow-[0_0_10px_rgba(0,0,0,0.2)] flex gap-2"
                  style={{
                    position: "absolute",
                    left: completedSelectionBox.x,
                    top: completedSelectionBox.y - 40,
                    zIndex: 101,
                  }}
                >
                  <button
                    className="cursor-pointer hover:opacity-70"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Focus the input bar (screenshot is already attached)
                      const el = document.getElementById("userInput") as HTMLTextAreaElement | null;
                      if (el) {
                        el.focus();
                      }
                    }}
                  >
                    Ask
                  </button>
                  <div className="w-px bg-gray-300" />
                  <button
                    className="cursor-pointer hover:opacity-70"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Send /Define with the screenshot context
                      sendMessage("/Define", selectionPreview ? { screenshot: { dataUrl: selectionPreview.compositeDataUrl } } : undefined);
                      clearScreenshotSelection();
                    }}
                  >
                    Define
                  </button>
                  <div className="w-px bg-gray-300" />
                  <button
                    className="cursor-pointer hover:opacity-70"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Send /Explain with the screenshot context
                      sendMessage("/Explain", selectionPreview ? { screenshot: { dataUrl: selectionPreview.compositeDataUrl } } : undefined);
                      clearScreenshotSelection();
                    }}
                  >
                    Explain
                  </button>
                </div>
              </>
            )}

            {/* Bounding Box Rectangle (debug): maps screenshot-space bbox → overlay coords */}
            {(() => {
              // Hardcoded bbox for testing.
              // Auto-detect input space and scale appropriately:
              //  - If max value <= 1 → normalized [0,1]
              //  - Else if max value <= 1000 → normalized [0,1000]
              //  - Else → screenshot pixels
              // bbox format selector:
              //  - 'xyxy' => [x1, y1, x2, y2]
              //  - 'yxyx' => [y1, x1, y2, x2] (spatial-understanding box_2d order)
              //  - 'xywh' => [x, y, width, height]
              const XYXY: string = "xyxy";
              const YXYX: string = "yxyx";
              const XYWH: string = "xywh";
              const bboxFormat: string = YXYX;
              // Example matching spatial-understanding semantics ([ymin, xmin, ymax, xmax])
              // Use AI highlight area state if set, otherwise fall back to prop
              const effectiveHighlightArea = aiHighlightArea || highlightArea;
              const bbox: [number, number, number, number] | undefined =
                effectiveHighlightArea?.show && effectiveHighlightArea?.box_2d
                  ? (effectiveHighlightArea.box_2d as [number, number, number, number])
                  : undefined;

              // No bounding box to render if highlight area not set
              if (!bbox) {
                return null;
              }

              const container = scrollContainerRef.current;
              if (!container) {
                console.log("🔲 No container ref");
                return null;
              }

              const pageEl = findCurrentPageElement();
              if (!pageEl) {
                console.log("🔲 No page element found");
                return null;
              }

              const containerRect = container.getBoundingClientRect();
              // Determine capture size from SessionStructureOpen (if available)
              let captureWidth = containerRect.width;
              let captureHeight = containerRect.height;
              try {
                const cap = (window as any).__medlyScreenshotSize;
                if (
                  cap &&
                  typeof cap.width === "number" &&
                  typeof cap.height === "number" &&
                  cap.width > 0 &&
                  cap.height > 0
                ) {
                  captureWidth = cap.width;
                  captureHeight = cap.height;
                }
              } catch { }
              const pageRect = pageEl.getBoundingClientRect();

              const EXTRA_WIDTH = 400;
              const EXTRA_HEIGHT_TOP = 800;
              const overlayLeft =
                pageRect.left - containerRect.left - EXTRA_WIDTH;
              const overlayTop =
                pageRect.top - containerRect.top - EXTRA_HEIGHT_TOP;

              // Convert from screenshot space → container CSS pixels
              let xPx: number, yPx: number, widthPx: number, heightPx: number;
              const scaleX = containerRect.width / captureWidth;
              const scaleY = containerRect.height / captureHeight;

              const maxVal = Math.max(bbox[0], bbox[1], bbox[2], bbox[3]);
              const isNorm01 = maxVal <= 1;
              const isNorm1000 = !isNorm01 && maxVal <= 1000;
              const normBase = isNorm01 ? 1 : isNorm1000 ? 1000 : 0; // 0 => pixel space

              const toPx = (val: number, isX: boolean) => {
                if (normBase > 0) {
                  return (
                    (val / normBase) *
                    (isX ? containerRect.width : containerRect.height)
                  );
                }
                return val * (isX ? scaleX : scaleY);
              };

              if (bboxFormat === XYXY) {
                const x1 = toPx(bbox[0], true);
                const y1 = toPx(bbox[1], false);
                const x2 = toPx(bbox[2], true);
                const y2 = toPx(bbox[3], false);
                xPx = x1;
                yPx = y1;
                widthPx = x2 - x1;
                heightPx = y2 - y1;
              } else if (bboxFormat === YXYX) {
                // Spatial-understanding order: [ymin, xmin, ymax, xmax]
                const y1 = toPx(bbox[0], false);
                const x1 = toPx(bbox[1], true);
                const y2 = toPx(bbox[2], false);
                const x2 = toPx(bbox[3], true);
                xPx = x1;
                yPx = y1;
                widthPx = x2 - x1;
                heightPx = y2 - y1;
              } else {
                // 'xywh'
                const x1 = toPx(bbox[0], true);
                const y1 = toPx(bbox[1], false);
                const w = toPx(bbox[2], true);
                const h = toPx(bbox[3], false);
                xPx = x1;
                yPx = y1;
                widthPx = w;
                heightPx = h;
              }

              // Container CSS pixels → overlay local coordinates
              const x = xPx - overlayLeft;
              const y = yPx - overlayTop;
              const width = widthPx;
              const height = heightPx;

              console.log("🔲 Bounding box conversion:", {
                bbox,
                bboxFormat,
                inferred: { normBase: normBase || "px" },
                capture: { width: captureWidth, height: captureHeight },
                scale: { x: scaleX, y: scaleY },
                containerRect: {
                  width: containerRect.width,
                  height: containerRect.height,
                },
                pageRect: {
                  width: pageRect.width,
                  height: pageRect.height,
                  left: pageRect.left,
                  top: pageRect.top,
                },
                overlayOffset: { left: overlayLeft, top: overlayTop },
                overlayCoords: { x, y, width, height },
                overlayDimensions: overlayRef.current
                  ? {
                    width: overlayRef.current.style.width,
                    height: overlayRef.current.style.height,
                    left: overlayRef.current.style.left,
                    top: overlayRef.current.style.top,
                  }
                  : "no overlay ref",
              });

              return (
                <div
                  className="highlight-area-fade"
                  style={{
                    position: "absolute",
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    border: "2px solid #06B0FF",
                    backgroundColor: "#06B0FF",
                    opacity: 0.2,
                    pointerEvents: "none",
                    borderRadius: "8px",
                    zIndex: 10,
                    transformOrigin: "center",
                  }}
                ></div>
              );
            })()}

            {isAwaitingResponse && (
              <div className="absolute top-0 left-0 w-full h-full z-[20]">
                <ShimmerEffect isVisible={true} />
              </div>
            )}
          </div>
          {/* Comments overlay - floats to the right of the visible page */}
          <div
            ref={commentsOverlayRef}
            className="absolute overflow-visible z-10"
            style={{ pointerEvents: "none" }}
          >
            {(() => {
              const container = scrollContainerRef.current;
              if (!container) return null;
              const pageEl = findCurrentPageElement();
              if (!pageEl) return null;

              const containerRect = container.getBoundingClientRect();
              const pageRect = pageEl.getBoundingClientRect();

              const EXTRA_WIDTH = 400;
              const EXTRA_HEIGHT_TOP = 800;
              const pageLeftInOverlay = EXTRA_WIDTH;
              const pageTopInOverlay = EXTRA_HEIGHT_TOP;
              const overlayLeft =
                pageRect.left - containerRect.left - EXTRA_WIDTH;
              const rightX = pageLeftInOverlay + pageRect.width + 24; // 24px gap to the page
              const pageIndex0 = currentPage - 1;
              const pageHeight = pageRect.height;

              const pageNotes = notes.filter(
                (n) =>
                  n.highlightAreas.some((a) => a.pageIndex === pageIndex0) &&
                  (n.content.trim().length > 0 || unsavedNoteIds.has(n.id)),
              );

              return pageNotes.map((n) => {
                const anchor =
                  n.highlightAreas.find((a) => a.pageIndex === pageIndex0) ||
                  n.highlightAreas[0];
                const y =
                  pageTopInOverlay +
                  ((anchor.top + anchor.height / 2) / 100) * pageHeight;

                // Clamp horizontal position so the card never gets cut off by container bounds
                const CARD_WIDTH = 240;
                const CARD_MARGIN = 16;
                const maxLeft =
                  containerRect.width - overlayLeft - CARD_WIDTH - CARD_MARGIN;
                const clampedLeft = Math.min(rightX, Math.max(0, maxLeft));

                const handleChange = (
                  e: React.ChangeEvent<HTMLTextAreaElement>,
                ) => {
                  const val = e.target.value;
                  // Update local state immediately for responsive UI
                  setNotes((prev) =>
                    prev.map((nn) =>
                      nn.id === n.id ? { ...nn, content: val } : nn,
                    ),
                  );
                  // Debounce persist so quick typing doesn't spam saves
                  if (commentSaveTimeoutRef.current) {
                    clearTimeout(commentSaveTimeoutRef.current);
                  }
                  const pageAtSchedule = currentPage;
                  const noteIdAtSchedule = n.id;
                  const valAtSchedule = val;
                  commentSaveTimeoutRef.current = setTimeout(() => {
                    applyUserNotesUpdate(
                      (prev) =>
                        prev.map((nn) =>
                          nn.id === noteIdAtSchedule
                            ? { ...nn, content: valAtSchedule }
                            : nn,
                        ),
                      pageAtSchedule,
                    );
                  }, 350);
                };

                const handleKeyDown = (
                  e: React.KeyboardEvent<HTMLTextAreaElement>,
                ) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    (e.target as HTMLTextAreaElement).blur(); // treat Enter as save
                  }
                };
                const handleSaveClick = (
                  e: React.MouseEvent<HTMLButtonElement>,
                ) => {
                  e.preventDefault();
                  const containerEl = scrollContainerRef.current;
                  if (containerEl) {
                    const input = containerEl.querySelector(
                      `[data-note-input-id="${n.id}"]`,
                    ) as HTMLTextAreaElement | null;
                    // Commit immediately with the latest DOM value (avoids race with debounce)
                    const latestVal = (input?.value ?? n.content) || "";
                    if (commentSaveTimeoutRef.current) {
                      clearTimeout(commentSaveTimeoutRef.current);
                    }
                    applyUserNotesUpdate(
                      (prev) =>
                        prev.map((nn) =>
                          nn.id === n.id ? { ...nn, content: latestVal } : nn,
                        ),
                      currentPage,
                    );
                    // Mark as saved
                    setUnsavedNoteIds((prev) => {
                      const s = new Set(prev);
                      s.delete(n.id);
                      return s;
                    });
                    // Blur after committing
                    input?.blur();
                  }
                };
                const handleBlur = () => {
                  if (!unsavedNoteIds.has(n.id)) return;
                  const trimmed = (n.content || "").trim();
                  if (trimmed.length === 0) {
                    // Remove empty unsaved comment entirely
                    applyUserNotesUpdate((prev) =>
                      prev.filter((nn) => nn.id !== n.id),
                    );
                  } else {
                    // Ensure latest content is persisted (in case debounce didn't fire)
                    if (commentSaveTimeoutRef.current) {
                      clearTimeout(commentSaveTimeoutRef.current);
                    }
                    applyUserNotesUpdate(
                      (prev) =>
                        prev.map((nn) =>
                          nn.id === n.id ? { ...nn, content: trimmed } : nn,
                        ),
                      currentPage,
                    );
                  }
                  // Mark as saved (or cleanup flag if removed)
                  setUnsavedNoteIds((prev) => {
                    const s = new Set(prev);
                    s.delete(n.id);
                    return s;
                  });
                };
                const isUnsaved = unsavedNoteIds.has(n.id);

                return (
                  <div
                    key={n.id}
                    className="absolute"
                    style={{
                      left: `${clampedLeft}px`,
                      top: `${y}px`,
                      transform: "translateY(-50%)",
                      width: "240px",
                      pointerEvents: "auto",
                      zIndex: 10000,
                    }}
                    onMouseEnter={() => setHoveredCommentId(n.id)}
                    onMouseLeave={() => setHoveredCommentId(null)}
                  >
                    <div className="bg-white border border-[#F2F2F7] rounded-[12px] shadow-[0_0_16px_rgba(0,0,0,0.10)] p-2 w-[240px] font-rounded-bold text-[14px] text-black flex flex-col gap-2 relative">
                      {hoveredCommentId === n.id && !isUnsaved && (
                        <button
                          className="absolute top-[5px] right-1.5 bg-red-50 rounded-[8px] px-2 py-1 text-[12px] text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            applyUserNotesUpdate((prev) =>
                              prev.filter((nn) => nn.id !== n.id),
                            );
                          }}
                        >
                          Remove
                        </button>
                      )}
                      <textarea
                        data-note-input-id={n.id}
                        className={`w-full rounded-[8px] px-2 py-0 outline-none resize-none focus:none`}
                        placeholder="Add a comment..."
                        rows={1}
                        value={n.content}
                        onChange={(e) => {
                          if (isUnsaved) {
                            handleChange(e);
                          }
                          adjustTextareaHeight(e.currentTarget);
                        }}
                        onKeyDown={isUnsaved ? handleKeyDown : undefined}
                        readOnly={!isUnsaved}
                        onBlur={(e) => {
                          handleBlur();
                          adjustTextareaHeight(e.currentTarget);
                        }}
                        ref={(ref) => {
                          if (ref) adjustTextareaHeight(ref);
                        }}
                        style={{ overflow: "hidden" }}
                      />
                      {isUnsaved && (
                        <div className="flex justify-end">
                          <button onClick={handleSaveClick} className="">
                            <ArrowWithTailUpIcon
                              backgroundColor={
                                n.content.trim().length > 0
                                  ? "#00AEFF"
                                  : "#EBEBEB"
                              }
                              fillColor={
                                n.content.trim().length > 0
                                  ? "white"
                                  : "#7A7A7A"
                              }
                              size={24}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Highlight menu rendered via portal to avoid clipping */}
        {highlightMenuPosition &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={highlightMenuRef}
              className="fixed font-rounded-bold bg-white rounded-lg px-2.5 py-1.5 text-[13px] font-bold whitespace-nowrap pointer-events-auto drop-shadow-[0_0_10px_rgba(0,0,0,0.2)] flex gap-2"
              data-highlight-menu="true"
              style={{
                left: `${highlightMenuPosition.left}px`,
                top: `${highlightMenuPosition.top}px`,
                zIndex: 10,
              }}
            >
              <button
                className="cursor-pointer hover:opacity-70"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const note = notes.find(
                    (n) => n.id === highlightMenuPosition.noteId,
                  );
                  if (note) {
                    // Create or focus comment for this highlight
                    if (!note.content.trim() && !unsavedNoteIds.has(note.id)) {
                      // Create new comment
                      setUnsavedNoteIds((prev) => {
                        const s = new Set(prev);
                        s.add(note.id);
                        return s;
                      });
                      setFocusCommentId(note.id);
                    } else {
                      // Focus existing comment
                      setFocusCommentId(note.id);
                    }
                  }
                  setSelectedNoteId(null);
                  setHighlightMenuPosition(null);
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                Comment
              </button>
              <div className="w-px bg-gray-300" />
              <button
                className="cursor-pointer hover:opacity-70"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const note = notes.find(
                    (n) => n.id === highlightMenuPosition.noteId,
                  );
                  if (note) {
                    console.log("Ask - Highlight text:", note.quote);
                    // Populate input with highlighted text and focus input bar (uses chat context)
                    updateSelectedText(note.quote);
                    // Suppress the next selection clear so chip remains
                    suppressNextSelectionClearRef.current = true;
                    window.setTimeout(() => {
                      const el = document.getElementById(
                        "userInput",
                      ) as HTMLTextAreaElement | null;
                      if (el) {
                        el.focus();
                        try {
                          const len = el.value.length;
                          el.setSelectionRange(len, len);
                        } catch {
                          /* ignore */
                        }
                      }
                    }, 0);
                  }
                  setSelectedNoteId(null);
                  setHighlightMenuPosition(null);
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                Ask
              </button>
              <div className="w-px bg-gray-300" />
              <button
                className="cursor-pointer hover:opacity-70"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const note = notes.find(
                    (n) => n.id === highlightMenuPosition.noteId,
                  );
                  if (note) {
                    console.log("Define - Highlight text:", note.quote);
                    // Set selected text in context first (so it appears as attachment)
                    updateSelectedText(note.quote);
                    // Send /Define message (uses chat context)
                    sendMessage(`/Define`);
                  }
                  setSelectedNoteId(null);
                  setHighlightMenuPosition(null);
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                Define
              </button>
              <div className="w-px bg-gray-300" />
              <button
                className="cursor-pointer hover:opacity-70"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Remove note
                  applyUserNotesUpdate((prev) =>
                    prev.filter((n) => n.id !== highlightMenuPosition.noteId),
                  );
                  setSelectedNoteId(null);
                  setHighlightMenuPosition(null);
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                Remove Highlight
              </button>
            </div>,
            document.body,
          )}

        {/* "Drag to take a screenshot" tooltip for first-time users */}
        {tooltipMousePos &&
          !selectionBox &&
          !showDragTutorialModal &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed pointer-events-none font-rounded-bold text-[13px] text-white bg-black/75 rounded-[8px] px-3 py-1.5 whitespace-nowrap"
              style={{
                left: tooltipMousePos.x + 12,
                top: tooltipMousePos.y + 12,
                zIndex: 1300,
              }}
            >
              Drag to take a screenshot
            </div>,
            document.body,
          )}

        {isLandscape && false && (
          <div
            className="w-full"
            style={{ height: `${textareaHeight}px` }}
          >
            <div
              className="w-[64px] h-[4px] my-2 rounded-full bg-[#F2F2F7] mx-auto cursor-ns-resize hover:bg-[#E5E5EA] transition-colors"
              onMouseDown={handleResizeStart}
            ></div>

            <textarea
              className="w-full h-full bg-[white] border border-[#F2F2F7] rounded-[16px] p-4 font-medium text-[14px] focus:outline-none resize-none"
              placeholder="Add notes"
              value={documentNotes?.[currentPage] || ""}
              onChange={(e) =>
                updateDocumentNotes?.(currentPage, e.target.value)
              }
            />
          </div>
        )}

        {/* Bottom Horizontal Thumbnail Bar (only when SIDEBAR_POSITION === "bottom", landscape, and thumbnails enabled) */}
        {SHOW_THUMBNAILS && SIDEBAR_POSITION === "bottom" && isLandscape && (
          <div
            className="border-t border-[#F2F2F7] bg-white flex items-center"
            style={{ height: `${THUMBNAIL_BAR_HEIGHT}px`, flexShrink: 0 }}
          >
            {/* Left Arrow */}
            {/* <button
              onClick={scrollThumbnailsLeft}
              className="flex-shrink-0 w-8 h-full flex items-center justify-center hover:bg-[#F2F2F7] transition-colors cursor-pointer"
              aria-label="Scroll thumbnails left"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button> */}

            {/* Thumbnails Container */}
            <div
              ref={thumbnailBarRef}
              className="flex-1 overflow-x-auto overflow-y-hidden rpv-thumbnail-horizontal"
              style={{
                cursor: isDraggingThumbnails ? "grabbing" : "grab",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Thumbnails />
              </Worker>
            </div>

            {/* Right Arrow */}
            {/* <button
              onClick={scrollThumbnailsRight}
              className="flex-shrink-0 w-8 h-full flex items-center justify-center hover:bg-[#F2F2F7] transition-colors cursor-pointer"
              aria-label="Scroll thumbnails right"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button> */}
          </div>
        )}

        {/* Selection preview modal (debug) */}
        {/* {selectionPreview && (
          <div
            className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl p-3 z-50"
            style={{ maxWidth: 700 }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-rounded-bold text-gray-600">
                Selection Preview (Debug)
              </span>
              <button
                onClick={() => setSelectionPreview(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">Base (PDF)</span>
                <img
                  src={selectionPreview.baseDataUrl}
                  alt="Base layer"
                  className="rounded border border-gray-200"
                  style={{ maxWidth: 200, maxHeight: 200, objectFit: "contain" }}
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">Overlay (Annotations)</span>
                <img
                  src={selectionPreview.overlayDataUrl}
                  alt="Overlay layer"
                  className="rounded border border-gray-200 bg-gray-100"
                  style={{ maxWidth: 200, maxHeight: 200, objectFit: "contain" }}
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">Composite</span>
                <img
                  src={selectionPreview.compositeDataUrl}
                  alt="Composite"
                  className="rounded border border-gray-200"
                  style={{ maxWidth: 200, maxHeight: 200, objectFit: "contain" }}
                />
              </div>
            </div>
          </div>
        )} */}

        {/* Drag Tutorial Modal */}
        {isWideScreen && (
          <DragTutorialModal
            isOpen={showDragTutorialModal}
            onComplete={handleDragTutorialComplete}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentPage;
