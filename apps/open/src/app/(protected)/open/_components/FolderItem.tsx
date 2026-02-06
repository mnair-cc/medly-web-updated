import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DragItem } from "./useDragAndDrop";
import { formatDeadline } from "../_utils/dateHelpers";
import FolderEditPanel from "./sidebar/FolderEditPanel";

interface FolderItemProps {
  id: string;
  title: string;
  date: string;
  position?: number;
  index: number;
  isHovered: boolean;
  isDragging: boolean;
  isDraggedItem: boolean;
  /** True when a nested document inside this folder has its ellipsis menu open. */
  isChildMenuOpen?: boolean;
  collectionId: string;
  onMouseDown: (e: React.MouseEvent, item: DragItem, index: number) => void;
  onTouchStart: (e: React.TouchEvent, item: DragItem, index: number) => void;
  setRef: (id: string, el: HTMLDivElement | null) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onToggle?: () => void;
  children?: React.ReactNode;
  onRename?: (id: string, newName: string) => Promise<void>;
  onUpdate?: (
    id: string,
    updates: { name?: string; deadline?: string; weighting?: number }
  ) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onGeneratePractice?: (id: string) => Promise<void>;
  onGenerateFlashcards?: (id: string) => Promise<void>;
  /** True when folder contains any documents that haven't been viewed yet */
  hasNewDocuments?: boolean;
  /** True when folder has no documents inside */
  isEmpty?: boolean;
  /** Thumbnail URLs of the first 4 documents in the folder */
  thumbnails?: string[];
  // Assignment folder fields
  type?: "assignment";
  deadline?: string; // ISO date (YYYY-MM-DD)
  weighting?: number; // Percentage (e.g., 20)
  // Animation states
  isExiting?: boolean;
  shouldAnimate?: boolean;
  /** When true, uses relative positioning instead of absolute (for mobile layouts) */
  isMobile?: boolean;
}

export default function FolderItem({
  id,
  title,
  date,
  position = 0,
  index,
  isHovered,
  isDragging,
  isDraggedItem,
  isChildMenuOpen,
  collectionId,
  onMouseDown,
  onTouchStart,
  setRef,
  expanded,
  onExpandedChange,
  onToggle,
  children,
  onRename,
  onUpdate,
  onDelete,
  onGeneratePractice,
  onGenerateFlashcards,
  hasNewDocuments,
  isEmpty,
  thumbnails,
  type,
  deadline,
  weighting,
  isExiting = false,
  shouldAnimate = false,
  isMobile = false,
}: FolderItemProps) {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = expanded !== undefined ? expanded : internalExpanded;
  // Sync internal state if becoming uncontrolled → controlled later is not needed; controlled wins
  useEffect(() => {
    if (expanded !== undefined) {
      // no-op, render uses controlled value
    }
  }, [expanded]);

  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const restoreUserSelectRef = useRef<string | null>(null);

  // Menu state
  const [isItemHovered, setIsItemHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuAnimated, setIsMenuAnimated] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditAnimated, setIsEditAnimated] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  // Track if menu was opened via right-click (positions at cursor)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const handleToggle = () => {
    const next = !isExpanded;
    if (onExpandedChange) {
      onExpandedChange(next);
    } else {
      setInternalExpanded(next);
    }
    // Notify parent to recalculate positions
    if (onToggle) {
      setTimeout(onToggle, 50); // Small delay to let DOM update
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // On mobile, skip drag detection - tap is handled by onClick
    if (isMobile) return;

    // Ignore right-clicks (handled by context menu)
    if (e.button === 2) return;
    // Don't start drag if clicking on the menu button
    if ((e.target as HTMLElement).closest(".ellipsis-button")) {
      return;
    }
    // Prevent text selection during the "pre-drag" phase.
    e.preventDefault();
    if (restoreUserSelectRef.current === null) {
      restoreUserSelectRef.current = document.body.style.userSelect || "";
      document.body.style.userSelect = "none";
    }
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // On mobile, skip drag detection
    if (isMobile) return;

    if (!dragStartPos.current) return;

    const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
    const deltaY = Math.abs(e.clientY - dragStartPos.current.y);

    // If moved more than 5px, consider it a drag
    if ((deltaX > 5 || deltaY > 5) && !isDraggingRef.current) {
      e.preventDefault();
      isDraggingRef.current = true;

      // Start drag first so parent can capture pre-collapse state
      onMouseDown(
        e,
        { id, type: "folder", collectionId, folderId: null },
        index,
      );

      // Collapse folder when starting drag
      if (isExpanded) {
        if (onExpandedChange) {
          onExpandedChange(false);
        } else {
          setInternalExpanded(false);
        }
        if (onToggle) {
          setTimeout(onToggle, 50);
        }
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // On mobile, skip drag detection - tap is handled by onClick
    if (isMobile) return;

    // Don't toggle if clicking on the menu button
    if ((e.target as HTMLElement).closest(".ellipsis-button")) {
      dragStartPos.current = null;
      isDraggingRef.current = false;
      return;
    }
    if (!isDraggingRef.current && dragStartPos.current) {
      // It was a click, not a drag - toggle the folder
      handleToggle();
    }
    dragStartPos.current = null;
    isDraggingRef.current = false;
    if (restoreUserSelectRef.current !== null) {
      document.body.style.userSelect = restoreUserSelectRef.current;
      restoreUserSelectRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // On mobile, skip drag detection - just allow normal tap behavior
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
    // On mobile, skip drag detection
    if (isMobile) return;

    if (!dragStartPos.current || !e.touches[0]) return;

    const deltaX = Math.abs(e.touches[0].clientX - dragStartPos.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - dragStartPos.current.y);

    // If moved more than 5px, consider it a drag
    if ((deltaX > 5 || deltaY > 5) && !isDraggingRef.current) {
      e.preventDefault();
      isDraggingRef.current = true;

      // Start drag first so parent can capture pre-collapse state
      onTouchStart(
        e,
        { id, type: "folder", collectionId, folderId: null },
        index,
      );

      // Collapse folder when starting drag
      if (isExpanded) {
        if (onExpandedChange) {
          onExpandedChange(false);
        } else {
          setInternalExpanded(false);
        }
        if (onToggle) {
          setTimeout(onToggle, 50);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    // On mobile, skip drag detection - tap is handled by onClick
    if (isMobile) return;

    if (!isDraggingRef.current && dragStartPos.current) {
      // It was a tap, not a drag - toggle the folder
      handleToggle();
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
    setIsEditAnimated(false);
    setContextMenuPosition(null);
    setMenuPosition(null);
    setIsItemHovered(false);
    setTimeout(() => {
      setIsMenuOpen(false);
      setIsRenaming(false);
      setIsEditing(false);
      setRenameValue(title);
    }, 150);
  }, [title]);

  const updateMenuPosition = useCallback(() => {
    if (!menuButtonRef.current || contextMenuPosition) return;
    const rect = menuButtonRef.current.getBoundingClientRect();
    const menuWidth = 180;
    const padding = 8;

    // Position below and to the left-aligned with the button (like DocumentItem)
    const left = Math.max(menuWidth + padding, Math.min(window.innerWidth - padding, rect.right));
    const top = Math.min(window.innerHeight - padding - 300, rect.bottom + 4);

    setMenuPosition({ top, left });
  }, [contextMenuPosition]);

  const handleOpenMenu = useCallback(
    (e: React.MouseEvent, contextPos?: { x: number; y: number }) => {
      e.stopPropagation();
      e.preventDefault();

      // Toggle: if already open, close it
      if (isMenuOpen) {
        handleCloseMenu();
        return;
      }

      // Store context menu position if provided (right-click)
      setContextMenuPosition(contextPos || null);

      setIsMenuOpen(true);
      setTimeout(() => setIsMenuAnimated(true), 10);
    },
    [isMenuOpen, handleCloseMenu],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      handleOpenMenu(e, { x: e.clientX, y: e.clientY });
    },
    [handleOpenMenu],
  );

  const handleRenameClick = useCallback(() => {
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  }, []);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => setIsEditAnimated(true), 10);
  }, []);

  const handleSaveEdit = useCallback(
    async (values: { name: string; deadline?: string; weighting?: number }) => {
      if (!onUpdate) return;
      handleCloseMenu();
      try {
        await onUpdate(id, values);
      } catch (error) {
        console.error("Failed to update folder:", error);
      }
    },
    [id, onUpdate, handleCloseMenu]
  );

  const handleSaveRename = useCallback(async () => {
    if (!renameValue.trim() || !onRename) return;
    handleCloseMenu();
    try {
      await onRename(id, renameValue.trim());
    } catch (error) {
      console.error("Failed to rename folder:", error);
    }
  }, [id, renameValue, onRename, handleCloseMenu]);

  const handleDeleteClick = useCallback(async () => {
    if (!onDelete) return;
    if (confirm(`Delete folder "${title}" and all its contents?`)) {
      try {
        await onDelete(id);
        handleCloseMenu();
      } catch (error) {
        console.error("Failed to delete folder:", error);
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

  // Update menu position when it opens
  useLayoutEffect(() => {
    if (!isMenuOpen || contextMenuPosition) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();

    // Update position on scroll/resize
    const handleUpdate = () => updateMenuPosition();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [isMenuOpen, contextMenuPosition, updateMenuPosition]);

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

  // Click outside to close menu or edit panel
  useEffect(() => {
    if (!isMenuOpen && !isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleCloseMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen, isEditing, handleCloseMenu]);

  return (
    <div
      ref={(el) => setRef(id, el)}
      data-folder-id={id}
      className={`${isMobile ? "relative" : "absolute"} ${shouldAnimate ? "documentEntrance" : ""}`}
      style={{
        transform: isMobile ? undefined : `translateY(${position}px)`,
        transition: isMobile ? undefined : "transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        zIndex:
          isDraggedItem && isDragging
            ? 50
            : isMenuOpen || isChildMenuOpen
              ? 2000
              : 10,
        left: isMobile ? undefined : 4,
        right: isMobile ? undefined : 1,
      }}
    >
      <div
        className="flex flex-col"
        style={{
          opacity: isDraggedItem && isDragging || isExiting ? 0 : 1,
          pointerEvents: isDraggedItem && isDragging ? "none" : "auto",
          transition: isExiting ? "opacity 300ms ease-out" : undefined,
        }}
      >
        {/* Folder Header */}
        <div
          className={`relative flex flex-row items-center gap-1 pl-4 pr-2 py-2 min-h-[52px] rounded-[12px] cursor-pointer ${isHovered || isMenuOpen
            ? "bg-[#F2F2F7]/50"
            : isDragging
              ? ""
              : isMobile
                ? "active:bg-[#F2F2F7]/30"
                : "hover:bg-[#F2F2F7]/30"
            }`}
          onClick={isMobile ? handleToggle : undefined}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={isMobile ? undefined : () => setIsItemHovered(true)}
          onMouseLeave={isMobile ? undefined : () => setIsItemHovered(false)}
          onContextMenu={handleContextMenu}
          style={{ touchAction: isMobile ? "auto" : "none" }}
        >
          {/* Chevron */}
          <div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition:
                  "transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
            >
              <path
                d="M16.844 11.7037C16.8365 11.44 16.7386 11.214 16.5352 11.0106L10.6741 5.27762C10.5008 5.11189 10.2974 5.02148 10.0488 5.02148C9.54408 5.02148 9.15234 5.41323 9.15234 5.91797C9.15234 6.15904 9.25028 6.38504 9.42355 6.55831L14.697 11.7037L9.42355 16.8491C9.25028 17.0223 9.15234 17.2408 9.15234 17.4894C9.15234 17.9941 9.54408 18.3859 10.0488 18.3859C10.2899 18.3859 10.5008 18.2955 10.6741 18.1297L16.5352 12.3892C16.7461 12.1934 16.844 11.9674 16.844 11.7037Z"
                fill="#05B0FF"
              />
            </svg>
          </div>

          <div className="flex items-center justify-center flex-shrink-0">
            {thumbnails && thumbnails.length > 0 ? (
              <div className="w-[32px] h-[24px] rounded-[4px] bg-[#F2F2F7] overflow-hidden grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5">
                {thumbnails.slice(0, 4).map((url, i) => (
                  <div key={i} className="w-full h-full overflow-hidden">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : type === "assignment" ? (
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.47656 21.3535H21.5146C23.4219 21.3535 24.415 20.3691 24.415 18.4883V13.5664C24.415 12.582 24.2744 12.1602 23.8174 11.5625L20.9346 7.72168C19.9062 6.35938 19.3701 5.98145 17.7881 5.98145H10.2119C8.62109 5.98145 8.08496 6.35938 7.06543 7.72168L4.17383 11.5625C3.72559 12.1602 3.58496 12.582 3.58496 13.5664V18.4883C3.58496 20.3691 4.57812 21.3535 6.47656 21.3535ZM14 15.9482C12.6641 15.9482 11.8291 14.8848 11.8291 13.7861V13.7158C11.8291 13.3115 11.583 12.9248 11.082 12.9248H5.79102C5.46582 12.9248 5.41309 12.6611 5.5625 12.4502L8.77051 8.14355C9.13965 7.63379 9.60547 7.44043 10.2031 7.44043H17.7969C18.3857 7.44043 18.8516 7.63379 19.2295 8.14355L22.4287 12.4502C22.5781 12.6611 22.5254 12.9248 22.2002 12.9248H16.9092C16.4082 12.9248 16.1709 13.3115 16.1709 13.7158V13.7861C16.1709 14.8848 15.3359 15.9482 14 15.9482Z"
                  fill="#41C3FF" />
              </svg>
            ) : (
              <div className="w-[32px] h-[24px] rounded-[4px] bg-[#F2F2F7] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.81055 21.7666H21.3916C23.0879 21.7666 24.0723 20.7822 24.0723 18.9014V9.85742C24.0723 7.97656 23.0791 6.99219 21.1807 6.99219H13.0332C12.4004 6.99219 12.0225 6.85156 11.5303 6.44727L11.0381 6.04297C10.4141 5.5332 9.95703 5.36621 9.03418 5.36621H6.54688C4.89453 5.36621 3.91895 6.33301 3.91895 8.1875V18.9014C3.91895 20.791 4.91211 21.7666 6.81055 21.7666ZM5.66797 8.33691C5.66797 7.53711 6.11621 7.11523 6.89844 7.11523H8.56836C9.19238 7.11523 9.56152 7.26465 10.0625 7.66895L10.5547 8.08203C11.1699 8.57422 11.6445 8.75 12.5674 8.75H21.0664C21.875 8.75 22.3232 9.17188 22.3232 10.0156V10.5342H5.66797V8.33691ZM6.9248 20.0176C6.11621 20.0176 5.66797 19.5957 5.66797 18.7432V12.0723H22.3232V18.752C22.3232 19.5957 21.875 20.0176 21.0664 20.0176H6.9248Z" 
                  fill="rgba(0,0,0,0.12)"/>
                </svg>
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1 ml-1">
            <div className="flex items-center gap-1.5">
              {/* {hasNewDocuments && (
                <div className="w-2 h-2 rounded-full bg-[#1FADFF] flex-shrink-0" />
              )} */}
              <div className="font-rounded-bold text-[14px] text-black truncate">
                {title}
              </div>
            </div>
            {/* Assignment folder subtitle */}
            {type === "assignment" &&
              (deadline || weighting !== undefined) && (
                <div className="text-[12px] text-[#8E8E93] font-rounded truncate">
                  {deadline && `Due ${formatDeadline(deadline)}`}
                  {deadline && weighting !== undefined && " · "}
                  {weighting !== undefined && `${weighting}%`}
                </div>
              )}
          </div>

          {/* Ellipsis menu */}
          <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center ellipsis-button ${(isItemHovered || isMenuOpen) && !isDragging ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <div className={`w-6 h-6 bg-gradient-to-r from-transparent ${isItemHovered || isMenuOpen ? "to-[#F9F9FB]" : "to-white"}`} />
            <button
              ref={menuButtonRef}
              onClick={handleOpenMenu}
              className={`flex items-center justify-center ${isItemHovered || isMenuOpen ? "bg-[#F9F9FB]" : "bg-white"}`}
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

            {/* Edit panel for assignment folders */}
            {isEditing && type === "assignment" && (
              <div
                ref={menuRef}
                className="absolute right-0 top-full mt-1 z-[12000]"
              >
                <FolderEditPanel
                  mode="edit"
                  type="assignment"
                  initialValues={{
                    name: title,
                    deadline: deadline,
                    weighting: weighting,
                  }}
                  onSave={handleSaveEdit}
                  onCancel={handleCloseMenu}
                  isAnimated={isEditAnimated}
                />
              </div>
            )}

          </div>
        </div>

        {/* Menu portal - for both button click and right-click */}
        {isMenuOpen && !isEditing && (menuPosition || contextMenuPosition) && typeof document !== "undefined" &&
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
                className={`p-2 shadow-[0_0_16px_rgba(0,0,0,0.10)] rounded-[12px] font-rounded-bold text-[14px] text-black w-[180px] bg-white flex flex-col gap-1 pointer-events-auto transition-all duration-150 ease-out ${isMenuAnimated
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-90"
                  }`}
                style={{
                  position: "fixed",
                  top: contextMenuPosition ? contextMenuPosition.y : menuPosition?.top,
                  left: contextMenuPosition
                    ? Math.max(8, Math.min(window.innerWidth - 188, contextMenuPosition.x))
                    : menuPosition?.left,
                  transformOrigin: contextMenuPosition ? "top left" : "top right",
                  transform: contextMenuPosition
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
                    placeholder="Topic or week"
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
                  {type === "assignment" ? (
                    <button
                      onClick={handleEditClick}
                      className="text-left px-2 py-1 rounded-[8px] hover:bg-[#F2F2F7] transition-colors"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={handleRenameClick}
                      className="text-left px-2 py-1 rounded-[8px] hover:bg-[#F2F2F7] transition-colors"
                    >
                      Rename
                    </button>
                  )}
                  {onGeneratePractice && (
                    <button
                      onClick={handleGeneratePracticeClick}
                      className="text-left px-2 py-1 rounded-[8px] hover:bg-[#F2F2F7] transition-colors"
                    >
                      New Practice Test
                    </button>
                  )}
                  {onGenerateFlashcards && (
                    <button
                      onClick={handleGenerateFlashcardsClick}
                      className="text-left px-2 py-1 rounded-[8px] hover:bg-[#F2F2F7] transition-colors"
                    >
                      New Flashcards
                    </button>
                  )}
                  <button
                    onClick={handleDeleteClick}
                    className="text-left px-2 py-1 rounded-[8px] hover:bg-[#F2F2F7] transition-colors text-red-600"
                  >
                    Delete
                  </button>
                </>
              )}
              </div>
            </>,
            document.body,
          )}

        {/* Folder Contents */}
        {isExpanded && <div className="relative">{children}</div>}
      </div>
    </div>
  );
}
