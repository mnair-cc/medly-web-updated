import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DragItem } from "./useDragAndDrop";
import { fileUrls } from "../_lib/fileUrls";
import { FolderSuggestion } from "../_types/aiOrganization";
import { Folder } from "../_types/content";
import FolderSuggestionBadge from "./ai/FolderSuggestionBadge";

type DocumentLabel =
  | "slides"
  | "syllabus"
  | "assignment"
  | "notes"
  | "reading"
  | "practice"
  | "flashcards";

type DocumentType = "document" | "practice" | "flashcards" | "notes" | "canvas";

const LABEL_DISPLAY: Record<DocumentLabel, string> = {
  slides: "Lecture",
  syllabus: "Syllabus",
  assignment: "Assignment",
  notes: "Notes",
  reading: "Reading",
  practice: "Practice",
  flashcards: "Flashcards",
};

const PORTRAIT_LABELS: DocumentLabel[] = [
  "notes",
  "reading",
  "assignment",
  "syllabus",
  "practice",
];

// =============================================================================
// DOCUMENT TYPE CHIP CONFIGURATION
// Configure colors and icons for each document type chip
// Only shows chips for: slides, practice, flashcards, notes
// =============================================================================

type ChipType = "practice" | "flashcards" | "notes" | "slides";

const CHIP_CONFIG: Record<ChipType, { bg: string; icon: React.ReactNode }> = {
  slides: {
    bg: "#F2493D",
    icon: <svg width="12" height="12" viewBox="0 0 24 19" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.8916 14.6953H4.52637V16.0225C4.52637 17.9033 5.51953 18.8877 7.42676 18.8877H20.3027C22.2012 18.8877 23.2031 17.9033 23.2031 16.0225V7.04883C23.2031 5.16797 22.2012 4.18359 20.3027 4.18359H18.668V2.86523C18.668 0.984375 17.6748 0 15.7764 0H2.8916C0.984375 0 0 0.984375 0 2.86523V11.8301C0 13.7197 0.984375 14.6953 2.8916 14.6953ZM3.00586 12.9463C2.19727 12.9463 1.74902 12.5244 1.74902 11.6719V3.02344C1.74902 2.1709 2.19727 1.75781 3.00586 1.75781H15.6621C16.4619 1.75781 16.9189 2.1709 16.9189 3.02344V4.18359H7.42676C5.51953 4.18359 4.52637 5.16797 4.52637 7.04883V12.9463H3.00586ZM7.54102 17.1299C6.72363 17.1299 6.28418 16.708 6.28418 15.8643V7.20703C6.28418 6.36328 6.72363 5.94141 7.54102 5.94141H20.1885C20.9971 5.94141 21.4453 6.36328 21.4453 7.20703V15.8643C21.4453 16.708 20.9971 17.1299 20.1885 17.1299H7.54102Z" fill="white" />
    </svg>
  },
  practice: {
    bg: "#1FADFF", // TODO: Replace with actual color
    icon: <svg width="12" height="12" viewBox="0 0 23 19" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.3184 14.0537C21.2168 14.0537 22.2012 13.0869 22.2012 11.2061L22.2012 2.85645C22.2012 0.975586 21.2168 -4.30284e-08 19.3184 -1.26012e-07L7.40039 -6.46963e-07C5.51074 -7.29562e-07 4.51758 0.975585 4.51758 2.85644L4.51758 4.1748L2.88281 4.1748C0.984375 4.1748 -2.25515e-07 5.15918 -3.07346e-07 7.03125L-6.72319e-07 15.3809C-7.5415e-07 17.2529 0.984374 18.2373 2.88281 18.2373L14.8799 18.2373C16.7783 18.2373 17.7627 17.2617 17.7627 15.3809L17.7627 14.0537L19.3184 14.0537ZM6.24023 2.99707C6.24023 2.14453 6.69727 1.72266 7.50586 1.72266L19.2129 1.72266C20.0303 1.72266 20.4785 2.14453 20.4785 2.99707L20.4785 11.0566C20.4785 11.9092 20.0303 12.3311 19.2129 12.3311L17.7627 12.3311L17.7627 7.03125C17.7627 5.15039 16.7783 4.1748 14.8799 4.1748L6.24023 4.1748L6.24023 2.99707ZM14.7744 16.5146L2.98828 16.5146C2.17969 16.5146 1.72266 16.084 1.72266 15.2314L1.72266 7.18066C1.72266 6.32812 2.17969 5.89746 2.98828 5.89746L14.7744 5.89746C15.5918 5.89746 16.04 6.32812 16.04 7.18066L16.04 15.2314C16.04 16.084 15.5918 16.5146 14.7744 16.5146Z"
        fill="white" />
    </svg>
  },
  flashcards: {
    bg: "#05B0FF",
    icon: <svg width="12" height="12" viewBox="0 0 23 19" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.3184 14.0537C21.2168 14.0537 22.2012 13.0869 22.2012 11.2061L22.2012 2.85645C22.2012 0.975586 21.2168 -4.30284e-08 19.3184 -1.26012e-07L7.40039 -6.46963e-07C5.51074 -7.29562e-07 4.51758 0.975585 4.51758 2.85644L4.51758 4.1748L2.88281 4.1748C0.984375 4.1748 -2.25515e-07 5.15918 -3.07346e-07 7.03125L-6.72319e-07 15.3809C-7.5415e-07 17.2529 0.984374 18.2373 2.88281 18.2373L14.8799 18.2373C16.7783 18.2373 17.7627 17.2617 17.7627 15.3809L17.7627 14.0537L19.3184 14.0537ZM6.24023 2.99707C6.24023 2.14453 6.69727 1.72266 7.50586 1.72266L19.2129 1.72266C20.0303 1.72266 20.4785 2.14453 20.4785 2.99707L20.4785 11.0566C20.4785 11.9092 20.0303 12.3311 19.2129 12.3311L17.7627 12.3311L17.7627 7.03125C17.7627 5.15039 16.7783 4.1748 14.8799 4.1748L6.24023 4.1748L6.24023 2.99707ZM14.7744 16.5146L2.98828 16.5146C2.17969 16.5146 1.72266 16.084 1.72266 15.2314L1.72266 7.18066C1.72266 6.32812 2.17969 5.89746 2.98828 5.89746L14.7744 5.89746C15.5918 5.89746 16.04 6.32812 16.04 7.18066L16.04 15.2314C16.04 16.084 15.5918 16.5146 14.7744 16.5146Z"
        fill="white" />
    </svg>
  },
  notes: {
    bg: "#1FADFF", // TODO: Replace with actual color
    icon: <svg width="12" height="12" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.86523 19.0459H12.2344C14.124 19.0459 15.0996 18.0527 15.0996 16.1543V8.17383C15.0996 6.94336 14.9414 6.38086 14.1768 5.59863L9.58008 0.931641C8.83301 0.175781 8.21777 0 7.11035 0H2.86523C0.984375 0 0 0.993164 0 2.90039V16.1543C0 18.0527 0.984375 19.0459 2.86523 19.0459ZM3.01465 17.2881C2.1709 17.2881 1.74902 16.8486 1.74902 16.04V3.00586C1.74902 2.20605 2.1709 1.75781 3.02344 1.75781H6.75V6.53906C6.75 7.81348 7.37402 8.42871 8.63965 8.42871H13.3506V16.04C13.3506 16.8486 12.9287 17.2881 12.0762 17.2881H3.01465ZM8.80664 6.89062C8.4375 6.89062 8.2793 6.73242 8.2793 6.37207V1.98633L13.1133 6.89062H8.80664ZM10.6436 10.7314H4.29785C3.96387 10.7314 3.72656 10.9688 3.72656 11.2764C3.72656 11.5928 3.96387 11.8389 4.29785 11.8389H10.6436C10.96 11.8389 11.1973 11.5928 11.1973 11.2764C11.1973 10.9688 10.96 10.7314 10.6436 10.7314ZM10.6436 13.667H4.29785C3.96387 13.667 3.72656 13.9131 3.72656 14.2295C3.72656 14.5371 3.96387 14.7744 4.29785 14.7744H10.6436C10.96 14.7744 11.1973 14.5371 11.1973 14.2295C11.1973 13.9131 10.96 13.667 10.6436 13.667Z" 
    fill="white"/>
    </svg>
    

  },
};

// Helper to determine which chip type to show (returns null if no chip should be shown)
function getChipType(docType: DocumentType | undefined, label: DocumentLabel | undefined): ChipType | null {
  // For user-created types: practice, flashcards, notes
  if (docType === "practice" || docType === "flashcards" || docType === "notes") {
    return docType;
  }
  // For uploaded documents with slides label
  if (label === "slides" || label === "notes") {
    return label;
  }
  // No chip for other types (document, canvas, other labels)
  return null;
}

// =============================================================================

/** iOS-style pie chart progress indicator */
function UploadProgressPie() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 4000; // 4 seconds to reach 90%
    const targetProgress = 324; // 90% of 360deg
    const startTime = Date.now();
    let rafId: number;
    let cancelled = false;

    const animate = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased * targetProgress);

      if (t < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="w-4 h-4 rounded-full"
        style={{
          background: `conic-gradient(transparent ${progress}deg, rgba(0,0,0,0.2) ${progress}deg)`,
          border: '1px solid rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
}

interface DocumentItemProps {
  id: string;
  title: string;
  date: string;
  index: number;
  position?: number;
  height: number;
  isDragging: boolean;
  isDraggedItem: boolean;
  isHovered?: boolean;
  collectionId: string;
  folderId: string | null;
  onMouseDown: (e: React.MouseEvent, item: DragItem, index: number) => void;
  onTouchStart: (e: React.TouchEvent, item: DragItem, index: number) => void;
  onClick?: (id: string, collectionId: string) => void;
  setRef: (id: string, el: HTMLDivElement | null) => void;
  isNested?: boolean;
  onMenuOpenChange?: (isOpen: boolean) => void;
  onRename?: (id: string, newName: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onGeneratePractice?: (id: string) => Promise<void>;
  onGenerateFlashcards?: (id: string) => Promise<void>;
  thumbnailUrl?: string;
  label?: DocumentLabel;
  type?: "document" | "practice" | "flashcards" | "notes" | "canvas";
  isPlaceholder?: boolean;
  /** True during upload + AI processing - shows faded/disabled state */
  isLoading?: boolean;
  /** True when document has never been viewed - shows blue dot indicator */
  isNew?: boolean;
  /** True when document just finished uploading - triggers entrance animation */
  shouldAnimate?: boolean;
  /** True when document is transitioning out (exiting) before appearing at final position */
  isExiting?: boolean;
  /** True when document should remain hidden between exit and enter */
  isHidden?: boolean;
  /** True when this document is currently open/active */
  isActive?: boolean;
  /** AI folder suggestion for this document */
  suggestion?: FolderSuggestion;
  /** Callback when user accepts the AI suggestion */
  onAcceptSuggestion?: () => void;
  /** Callback when user rejects the AI suggestion */
  onRejectSuggestion?: () => void;
  /** List of available folders for manual selection */
  folders?: Folder[];
  /** Callback when user manually selects a folder from dropdown */
  onSelectFolder?: (folderId: string | null) => void;
  /** When true, uses relative positioning instead of absolute (for mobile layouts) */
  isMobile?: boolean;
}

export default function DocumentItem({
  id,
  title,
  date,
  index,
  position = 0,
  height,
  isDragging,
  isDraggedItem,
  isHovered = false,
  collectionId,
  folderId,
  onMouseDown,
  onTouchStart,
  onClick,
  setRef,
  isNested = false,
  onMenuOpenChange,
  onRename,
  onDelete,
  onGeneratePractice,
  onGenerateFlashcards,
  thumbnailUrl,
  label,
  type,
  isPlaceholder,
  isLoading,
  isNew,
  shouldAnimate,
  isExiting,
  isHidden,
  isActive,
  suggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  folders,
  onSelectFolder,
  isMobile = false,
}: DocumentItemProps) {
  const isPortrait = label && PORTRAIT_LABELS.includes(label);
  const labelDisplay = label ? LABEL_DISPLAY[label] : "Document";
  const chipType = getChipType(type, label);
  const chipConfig = chipType ? CHIP_CONFIG[chipType] : null;

  // Use cached proxy for document thumbnails *only if* the document actually has a thumbnail.
  // Otherwise, keep the old behavior (no <img>) to avoid broken images for legacy/failed thumbs.
  const effectiveThumbnailUrl =
    (type === "document" || !type) && thumbnailUrl
      ? fileUrls.thumbnail(id, thumbnailUrl)
      : thumbnailUrl;
  // Store initial height to prevent growing placeholder
  const initialHeightRef = useRef<number>(height);

  useEffect(() => {
    if (!isDraggedItem && height > 0) {
      initialHeightRef.current = height;
    }
  }, [height, isDraggedItem]);

  const placeholderHeight = isDraggedItem ? initialHeightRef.current : height;

  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const restoreUserSelectRef = useRef<string | null>(null);

  // Menu state
  const [isItemHovered, setIsItemHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuAnimated, setIsMenuAnimated] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  // Track if menu was opened via right-click (positions at cursor) vs button (positions at button)
  const contextMenuPositionRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // On mobile, don't intercept - let onClick handle it
    if (isMobile) return;

    // Ignore right-clicks (handled by context menu)
    if (e.button === 2) return;
    // Don't start drag if clicking on the menu button
    if ((e.target as HTMLElement).closest(".ellipsis-button")) {
      return;
    }
    // Prevent text selection during the "pre-drag" phase (before threshold is crossed).
    e.preventDefault();
    if (restoreUserSelectRef.current === null) {
      restoreUserSelectRef.current = document.body.style.userSelect || "";
      document.body.style.userSelect = "none";
    }
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // On mobile, don't intercept - let onClick handle it
    if (isMobile) return;

    if (!dragStartPos.current) return;

    const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
    const deltaY = Math.abs(e.clientY - dragStartPos.current.y);

    // If moved more than 5px, consider it a drag
    if ((deltaX > 5 || deltaY > 5) && !isDraggingRef.current) {
      e.preventDefault();
      isDraggingRef.current = true;
      onMouseDown(e, { id, type: "document", collectionId, folderId }, index);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // On mobile, don't intercept - let onClick handle it
    if (isMobile) return;

    // Don't navigate if clicking on the menu button
    if ((e.target as HTMLElement).closest(".ellipsis-button")) {
      dragStartPos.current = null;
      isDraggingRef.current = false;
      return;
    }
    if (!isDraggingRef.current && dragStartPos.current) {
      // It was a click, not a drag - navigate to document
      if (onClick) {
        onClick(id, collectionId);
      }
    }
    dragStartPos.current = null;
    isDraggingRef.current = false;
    if (restoreUserSelectRef.current !== null) {
      document.body.style.userSelect = restoreUserSelectRef.current;
      restoreUserSelectRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // On mobile, don't intercept touches - allow native scrolling
    if (isMobile) return;

    e.preventDefault();
    if (restoreUserSelectRef.current === null) {
      restoreUserSelectRef.current = document.body.style.userSelect || "";
      document.body.style.userSelect = "none";
    }
    if (e.touches[0]) {
      dragStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      isDraggingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // On mobile, don't intercept touches - allow native scrolling
    if (isMobile) return;

    if (!dragStartPos.current || !e.touches[0]) return;

    const deltaX = Math.abs(e.touches[0].clientX - dragStartPos.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - dragStartPos.current.y);

    // If moved more than 5px, consider it a drag
    if ((deltaX > 5 || deltaY > 5) && !isDraggingRef.current) {
      e.preventDefault();
      isDraggingRef.current = true;
      onTouchStart(e, { id, type: "document", collectionId, folderId }, index);
    }
  };

  const handleTouchEnd = () => {
    // On mobile, don't intercept touches - allow native scrolling
    if (isMobile) return;

    if (!isDraggingRef.current && dragStartPos.current) {
      // It was a tap, not a drag - navigate to document
      if (onClick) {
        onClick(id, collectionId);
      }
    }
    dragStartPos.current = null;
    isDraggingRef.current = false;
    if (restoreUserSelectRef.current !== null) {
      document.body.style.userSelect = restoreUserSelectRef.current;
      restoreUserSelectRef.current = null;
    }
  };

  // Menu handlers
  const handleCloseMenu = useCallback(() => {
    setIsMenuAnimated(false);
    setIsItemHovered(false);
    setTimeout(() => {
      setIsMenuOpen(false);
      setIsRenaming(false);
      setRenameValue(title);
      contextMenuPositionRef.current = null;
    }, 150);
  }, [title]);

  const handleOpenMenu = useCallback(
    (e: React.MouseEvent, contextPosition?: { x: number; y: number }) => {
      e.stopPropagation();
      e.preventDefault();

      // Toggle: if already open, close it
      if (isMenuOpen) {
        handleCloseMenu();
        return;
      }

      // Store context menu position if provided (right-click)
      contextMenuPositionRef.current = contextPosition || null;

      setIsMenuOpen(true);
      setTimeout(() => setIsMenuAnimated(true), 10);
    },
    [isMenuOpen, handleCloseMenu],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Don't show context menu for loading/placeholder items
      if (isLoading || isPlaceholder) return;

      handleOpenMenu(e, { x: e.clientX, y: e.clientY });
    },
    [handleOpenMenu, isLoading, isPlaceholder],
  );

  const handleRenameClick = useCallback(() => {
    setRenameValue(title);
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [title]);

  const handleSaveRename = useCallback(async () => {
    if (!renameValue.trim() || !onRename) return;
    handleCloseMenu();
    try {
      await onRename(id, renameValue.trim());
    } catch (error) {
      console.error("Failed to rename document:", error);
    }
  }, [id, renameValue, onRename, handleCloseMenu]);

  const handleDeleteClick = useCallback(async () => {
    if (!onDelete) return;
    if (confirm(`Delete "${title}"?`)) {
      try {
        await onDelete(id);
        handleCloseMenu();
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
    }
  }, [id, title, onDelete, handleCloseMenu]);

  const handleGeneratePracticeClick = useCallback(async () => {
    if (!onGeneratePractice) return;
    handleCloseMenu();
    try {
      await onGeneratePractice(id);
    } catch (error) {
      console.error("Failed to generate practice test:", error);
    }
  }, [id, onGeneratePractice, handleCloseMenu]);

  const handleGenerateFlashcardsClick = useCallback(async () => {
    if (!onGenerateFlashcards) return;
    handleCloseMenu();
    try {
      await onGenerateFlashcards(id);
    } catch (error) {
      console.error("Failed to generate flashcards:", error);
    }
  }, [id, onGenerateFlashcards, handleCloseMenu]);

  // Keyboard shortcuts for rename
  useEffect(() => {
    if (!isRenaming) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseMenu();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSaveRename();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isRenaming, handleCloseMenu, handleSaveRename]);

  // Click outside to close menu
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleCloseMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen, handleCloseMenu]);

  const updateMenuPosition = useCallback(() => {
    const MENU_W = 180;
    const PAD = 8;

    // If opened via right-click, position at cursor (to the right)
    if (contextMenuPositionRef.current) {
      const { x, y } = contextMenuPositionRef.current;
      const left = Math.max(PAD, Math.min(window.innerWidth - MENU_W - PAD, x));
      const top = Math.min(window.innerHeight - PAD, y);
      setMenuPosition({ top, left });
      return;
    }

    // Otherwise position at button
    const btn = menuButtonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();

    const left = Math.max(MENU_W + PAD, Math.min(window.innerWidth - PAD, rect.right));
    const top = Math.min(window.innerHeight - PAD, rect.bottom + 4);
    setMenuPosition({ top, left });
  }, []);

  // When menu opens, compute a fixed-position portal location anchored to the ellipsis button.
  // This avoids stacking-context issues (transforms/absolute positioning) in nested folder rows.
  useLayoutEffect(() => {
    if (!isMenuOpen) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();

    let raf: number | null = null;
    const schedule = () => {
      if (raf !== null) return;
      raf = window.requestAnimationFrame(() => {
        raf = null;
        updateMenuPosition();
      });
    };

    window.addEventListener("resize", schedule);
    // Capture scroll events from any scroll container (sidebar list, window, etc)
    window.addEventListener("scroll", schedule, true);
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (raf !== null) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [isMenuOpen, updateMenuPosition]);

  // Let parents (e.g. FolderItem) know when a nested menu is open so they can bump z-index.
  useEffect(() => {
    onMenuOpenChange?.(isMenuOpen);
  }, [isMenuOpen, onMenuOpenChange]);

  // Determine positioning mode: isMobile or isNested = relative, otherwise absolute
  const useRelativePosition = isMobile || isNested;

  return (
    <div
      ref={(el) => setRef(id, el)}
      className={`${useRelativePosition ? "relative" : "absolute"} ${isNested ? "pl-12" : ""}`}
      style={{
        transform: useRelativePosition ? undefined : `translateY(${position}px)`,
        transition: useRelativePosition
          ? undefined
          : "transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        zIndex: isDraggedItem && isDragging ? 50 : isMenuOpen ? 2000 : isItemHovered || isActive ? 20 : 10,
        left: useRelativePosition ? undefined : 4,
        right: useRelativePosition ? undefined : 1,
        height: isMobile ? undefined : (height || 52),
      }}
    >
      {/* AI Suggestion Badge */}
      {suggestion && !isDraggedItem && onAcceptSuggestion && onRejectSuggestion && (
        <div className="absolute right-2 z-20 pointer-events-auto">
          <FolderSuggestionBadge
            suggestion={suggestion}
            onAccept={onAcceptSuggestion}
            onReject={onRejectSuggestion}
            folders={folders}
            currentFolderId={folderId}
            onSelectFolder={onSelectFolder}
          />
        </div>
      )}
      <div
        onClick={isMobile ? () => onClick?.(id, collectionId) : undefined}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={isMobile ? undefined : () => setIsItemHovered(true)}
        onMouseLeave={isMobile ? undefined : () => setIsItemHovered(false)}
        onContextMenu={handleContextMenu}
        className={`relative flex flex-row items-center gap-2 px-2 py-2 min-h-[52px]
          ${isDraggedItem && isDragging
            ? "opacity-0"
            : isHidden
              ? "opacity-0 cursor-default"
              : isLoading || isExiting
                ? "opacity-50 cursor-default"
                : isActive || isMenuOpen
                  ? "bg-[#F2F2F7]/50 cursor-pointer"
                  : isHovered
                    ? "bg-[#F2F2F7]/50 cursor-pointer"
                    : isDragging
                      ? "cursor-pointer"
                      : "cursor-pointer hover:bg-[#F2F2F7]/50"
          } rounded-[12px] transition-all duration-100 ${isExiting
            ? "animate-documentExit"
            : shouldAnimate
              ? "animate-documentEntrance"
              : ""
          }`}
        style={{
          touchAction: isMobile ? "auto" : "none",
          pointerEvents:
            (isDraggedItem && isDragging) || isLoading || isExiting || isHidden
              ? "none"
              : "auto",
        }}
      >
        <div className={`relative flex items-center justify-center flex-shrink-0 w-[32px] h-[32px] ${isNested ? "" : "ml-4"}`}>
          {isLoading ? (
            <div
              className={`${isPortrait ? "w-[24px] h-[32px]" : "w-[32px] h-[24px]"} rounded-[6px] bg-[#F2F2F7] relative`}
            >
              <UploadProgressPie />
            </div>
          ) : isPlaceholder ? (
            <div
              className={`${isPortrait ? "w-[24px] h-[32px]" : "w-[32px] h-[24px]"} rounded-[6px] border border-[#F2F2F7] flex items-center justify-center`}
            >
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 21.5381C14.5625 21.5381 14.958 21.1426 14.958 20.5625V12.3799L14.8701 10.5342L17.2168 13.1094L19.0273 14.8848C19.2031 15.0605 19.4492 15.1748 19.7217 15.1748C20.249 15.1748 20.6445 14.7793 20.6445 14.2344C20.6445 13.9795 20.5391 13.7422 20.3281 13.5312L14.7119 7.96777C14.5713 7.81836 14.3955 7.71289 14.2021 7.67773H19.792C20.3369 7.67773 20.7324 7.27344 20.7324 6.72852C20.7324 6.18359 20.3369 5.7793 19.792 5.7793H8.18164C7.64551 5.7793 7.25879 6.18359 7.25879 6.72852C7.25879 7.27344 7.64551 7.67773 8.18164 7.67773H13.7891C13.5957 7.71289 13.4199 7.81836 13.2793 7.96777L7.66309 13.5312C7.45215 13.7422 7.35547 13.9795 7.35547 14.2344C7.35547 14.7793 7.74219 15.1748 8.27832 15.1748C8.55078 15.1748 8.78809 15.0693 8.97266 14.8848L10.7744 13.1094L13.1211 10.5254L13.0332 12.3799V20.5625C13.0332 21.1426 13.4287 21.5381 14 21.5381Z" fill="#595959" />
              </svg>
            </div>
          ) : effectiveThumbnailUrl ? (
            <div
              className={`${isPortrait ? "w-[24px] h-[32px]" : "w-[32px] h-[24px]"} rounded-[6px] overflow-hidden border border-[#F2F2F7]`}
            >
              <img
                src={effectiveThumbnailUrl}
                alt={title}
                className="w-full h-full object-cover"
                style={{ transform: "scale(1.1)" }}
              />
            </div>
          ) : (
            <div
              className={`${isPortrait ? "w-[24px] h-[32px]" : "w-[32px] h-[24px]"} rounded-[6px] border border-[#F2F2F7] flex items-center justify-center`}
            />
          )}
          {/* Document type chip */}
          {!isLoading && !isPlaceholder && chipConfig && (
            <div
              className="absolute -top-1 -left-1 w-4 h-4 rounded-[0px] flex items-center justify-center"
              style={{ backgroundColor: chipConfig.bg }}
            >
              {chipConfig.icon}
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isNew && (
              <div className="w-2 h-2 rounded-full bg-[#1FADFF] flex-shrink-0" />
            )}
            <div
              className={`font-rounded-bold text-[14px] truncate ${isActive ? "text-black" : "text-black"} ${isPlaceholder ? "opacity-50" : ""}`}
            >
              {title || "Untitled"}
            </div>
          </div>
          <div className="text-[12px] text-[#595959]/50 -mt-0.5">
            {isLoading ? "Uploading" : labelDisplay}
          </div>
        </div>

        {/* Ellipsis menu button */}
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center ellipsis-button ${(isItemHovered || isActive || isMenuOpen) && !isDragging ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className={`w-6 h-6 bg-gradient-to-r from-transparent ${isItemHovered || isActive || isMenuOpen ? "to-[#F9F9FB]" : "to-white"}`} />
          <button
            ref={menuButtonRef}
            onClick={handleOpenMenu}
            className={`flex items-center justify-center ${isItemHovered || isActive || isMenuOpen ? "bg-[#F9F9FB]" : "bg-white"}`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="rotate-90"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="18.5" cy="12" r="1.5" fill="#595959" />
              <circle cx="12" cy="12" r="1.5" fill="#595959" />
              <circle cx="5.5" cy="12" r="1.5" fill="#595959" />
            </svg>
          </button>
        </div>
      </div>

      {isMenuOpen &&
        menuPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Invisible backdrop to capture clicks outside menu */}
            <div
              className="fixed inset-0"
              style={{ zIndex: 19999 }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleCloseMenu();
              }}
            />
            <div
              ref={menuRef}
              className={`p-2 shadow-[0_0_16px_rgba(0,0,0,0.10)] rounded-[12px] font-rounded-bold text-[14px] text-black w-[180px] bg-white flex flex-col gap-1 pointer-events-auto transition-all duration-150 ease-out ${isMenuAnimated ? "opacity-100 scale-100" : "opacity-0 scale-90"
                }`}
              style={{
                position: "fixed",
                top: menuPosition.top,
                left: menuPosition.left,
                transformOrigin: contextMenuPositionRef.current ? "top left" : "top right",
                transform: contextMenuPositionRef.current
                  ? (isMenuAnimated ? "scale(1)" : "scale(0.9)")
                  : `translateX(-100%) ${isMenuAnimated ? "scale(1)" : "scale(0.9)"}`,
                zIndex: 20000,
              }}
              onMouseEnter={(e) => e.stopPropagation()}
              onMouseLeave={(e) => e.stopPropagation()}
            >
              {isRenaming ? (
                <div className="flex flex-col gap-2">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="bg-[#F2F2F7] rounded-[8px] px-2 py-1 w-full outline-none focus:ring-2 focus:ring-[#05B0FF]/30"
                    placeholder="Document name"
                  />
                  <button
                    onClick={handleSaveRename}
                    className="bg-[#05B0FF] rounded-[8px] px-3 py-1 text-white hover:bg-[#0396D6] transition-colors w-full"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleRenameClick}
                    className="text-left px-2 py-1 rounded-[8px] hover:bg-[#F2F2F7]"
                  >
                    Rename
                  </button>
                  {onGeneratePractice && (
                    <button
                      onClick={handleGeneratePracticeClick}
                      className="text-left px-2 py-1 rounded-[8px] hover:bg-[#F2F2F7]"
                    >
                      New Practice Test
                    </button>
                  )}
                  {onGenerateFlashcards && (
                    <button
                      onClick={handleGenerateFlashcardsClick}
                      className="text-left px-2 py-1 rounded-[8px] hover:bg-[#F2F2F7]"
                    >
                      New Flashcards
                    </button>
                  )}
                  <button
                    onClick={handleDeleteClick}
                    className="text-left px-2 py-1 rounded-[8px] hover:bg-red-50 text-red-600"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
