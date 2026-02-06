"use client";

import type { Collection } from "@/app/(protected)/open/_types/content";
import PlusIcon from "@/app/_components/icons/PlusIcon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@/app/_context/UserProvider";

interface SidebarCollectionsListProps {
  collections: Collection[];
  selectedCollection: string | null;
  leftSidebarWidth: number;
  onCollectionSelect: (collection: Collection) => void;
  onAddCollection?: () => void;
  onRenameCollection?: (collectionId: string, newName: string) => Promise<void>;
  onDeleteCollection?: (collectionId: string) => Promise<void>;
  /** Hide empty state during content loading */
  isLoading?: boolean;
}

export default function SidebarCollectionsList({
  collections,
  selectedCollection,
  leftSidebarWidth,
  onCollectionSelect,
  onAddCollection,
  onRenameCollection,
  onDeleteCollection,
  isLoading,
}: SidebarCollectionsListProps) {
  const { user } = useUser();
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(
    null,
  );
  const [tooltip, setTooltip] = useState<{
    top: number;
    left: number;
    content: string;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Welcome tooltip state - shows on first visit
  const [showWelcomeTooltip, setShowWelcomeTooltip] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("open_welcome_tooltip_seen") !== "true";
  });

  // Handle module click - dismiss welcome tooltip
  const handleCollectionClick = useCallback((collection: Collection) => {
    if (showWelcomeTooltip) {
      setShowWelcomeTooltip(false);
      try {
        localStorage.setItem("open_welcome_tooltip_seen", "true");
      } catch {
        // localStorage not available
      }
    }
    onCollectionSelect(collection);
  }, [showWelcomeTooltip, onCollectionSelect]);

  // Get user's first name for the welcome message
  const firstName = useMemo(() => {
    if (!user?.userName) return "";
    // Get first name (first word before space)
    return user.userName.split(" ")[0];
  }, [user?.userName]);

  // Menu state management - track which collection has menu open
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isMenuAnimated, setIsMenuAnimated] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) => a.position - b.position);
  }, [collections]);

  const updateTooltipFromEvent = (e: React.MouseEvent, content: string) => {
    if (leftSidebarWidth >= 140) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setTooltip({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
      content,
    });
  };

  // Menu handlers
  const handleCloseMenu = useCallback(() => {
    setIsMenuAnimated(false);
    setTimeout(() => {
      setOpenMenuId(null);
      setRenamingId(null);
      setRenameValue("");
    }, 150);
  }, []);

  const handleOpenMenu = useCallback(
    (e: React.MouseEvent, collectionId: string, collectionName: string) => {
      e.stopPropagation();
      e.preventDefault();

      // Toggle: if already open, close it
      if (openMenuId === collectionId) {
        handleCloseMenu();
        return;
      }

      setOpenMenuId(collectionId);
      setRenameValue(collectionName);
      setTimeout(() => setIsMenuAnimated(true), 10);
    },
    [openMenuId, handleCloseMenu],
  );

  const handleRenameClick = useCallback(() => {
    if (!openMenuId) return;
    setRenamingId(openMenuId);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [openMenuId]);

  const handleSaveRename = useCallback(async () => {
    if (!renameValue.trim() || !openMenuId || !onRenameCollection) return;
    handleCloseMenu();
    try {
      await onRenameCollection(openMenuId, renameValue.trim());
    } catch (error) {
      console.error("Failed to rename collection:", error);
    }
  }, [openMenuId, renameValue, onRenameCollection, handleCloseMenu]);

  const handleDeleteClick = useCallback(
    async (collectionId: string, collectionName: string) => {
      if (!onDeleteCollection) return;
      if (confirm(`Delete "${collectionName}" and all its contents?`)) {
        try {
          await onDeleteCollection(collectionId);
          handleCloseMenu();
        } catch (error) {
          console.error("Failed to delete collection:", error);
        }
      }
    },
    [onDeleteCollection, handleCloseMenu],
  );

  // Keyboard shortcuts for rename
  useEffect(() => {
    if (!renamingId) return;

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
  }, [renamingId, handleCloseMenu, handleSaveRename]);

  // Click outside to close menu
  useEffect(() => {
    if (!openMenuId) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleCloseMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId, handleCloseMenu]);

  if (!isMounted) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex flex-col gap-1 px-4 overflow-y-auto flex-1">
          {/* Loading placeholder */}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${leftSidebarWidth >= 140 ? "w-full" : "w-[64px]"}`}>
      {/* Collections List - Scrollable */}
      <div className={`flex flex-col gap-1 overflow-y-auto flex-1 ${leftSidebarWidth >= 140 ? "px-3" : "items-center"}`}>
        {sortedCollections.map((collection, index) => {
          const isSelected = selectedCollection === collection.id;
          const color = collection.primaryColor || "#41C3FF";
          const isHovered = hoveredCollection === collection.id;
          const hasMenu = openMenuId === collection.id;
          const isFirstModule = index === 0;

          return (
            <div key={collection.id} className="relative">
              {/* Welcome tooltip - points to first module - DISABLED */}
              {/* {isFirstModule && showWelcomeTooltip && (
                <MOTooltip
                  storageKey={null}
                  steps={[
                    {
                      id: "welcome",
                      title: firstName ? `Hi ${firstName}, welcome to your Medly!` : "Welcome to your Medly!",
                      description: "Click on any module to get started.",
                      hideButton: true,
                      isFinal: true,
                    },
                  ]}
                />
              )} */}
              <button
                onClick={() => handleCollectionClick(collection)}
                onMouseEnter={(e) => {
                  setHoveredCollection(collection.id);
                  updateTooltipFromEvent(e, collection.name);
                }}
                onMouseMove={(e) => updateTooltipFromEvent(e, collection.name)}
                onMouseLeave={() => {
                  setHoveredCollection(null);
                  setTooltip(null);
                }}
                className={`relative group flex flex-row items-center w-full ${leftSidebarWidth < 140 ? "justify-center px-2" : "gap-2 px-2"
                  } rounded-[8px] py-2 ${isSelected
                    ? "bg-[#F7F7FA]"
                    : isHovered
                      ? "bg-[#F7F7FA]"
                      : "bg-transparent"
                  }`}
                title={leftSidebarWidth < 140 ? collection.name : undefined}
              >
                {/* Icon - small like subjects */}
                <div
                  style={{ color }}
                  className="w-6 h-6 flex items-center justify-center flex-shrink-0 [&>svg]:w-full [&>svg]:h-full"
                >
                  {collection.icon ? (
                    <span className="text-[20px]">{collection.icon}</span>
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </div>

                {/* Collection Name */}
                {leftSidebarWidth >= 140 && (
                  <div
                    className={`text-left font-rounded-bold text-[15px] whitespace-nowrap truncate flex-1 ${isSelected ? "text-black" : "text-gray-600"
                      }`}
                  >
                    {collection.name}
                  </div>
                )}

                {/* Three-dot menu button (avoid nesting a button inside the row button) */}
                {leftSidebarWidth >= 140 &&
                  (onRenameCollection || onDeleteCollection) && (
                    <div className="relative flex items-center ellipsis-button">
                      <div
                        role="button"
                        aria-label="Open collection menu"
                        tabIndex={0}
                        onClick={(e) =>
                          handleOpenMenu(
                            e as unknown as React.MouseEvent,
                            collection.id,
                            collection.name,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            // Synthesize a mouse-like event for handler typing
                            handleOpenMenu(
                              e as unknown as React.MouseEvent,
                              collection.id,
                              collection.name,
                            );
                          }
                        }}
                        className={`flex items-center justify-center ${isHovered || hasMenu ? "opacity-100" : "opacity-0"}`}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g clipPath="url(#clip0_4045_36)">
                            <path
                              d="M21.3672 15.7012C22.3926 15.7012 23.2227 14.8809 23.2227 13.8555C23.2227 12.8301 22.3926 12 21.3672 12C20.3418 12 19.5117 12.8301 19.5117 13.8555C19.5117 14.8809 20.3418 15.7012 21.3672 15.7012Z"
                              fill="#595959"
                            />
                            <path
                              d="M14.1113 15.7012C15.1367 15.7012 15.957 14.8809 15.957 13.8555C15.957 12.8301 15.1367 12 14.1113 12C13.0859 12 12.2559 12.8301 12.2559 13.8555C12.2559 14.8809 13.0859 15.7012 14.1113 15.7012Z"
                              fill="#595959"
                            />
                            <path
                              d="M6.85547 15.7012C7.88086 15.7012 8.70117 14.8809 8.70117 13.8555C8.70117 12.8301 7.88086 12 6.85547 12C5.83008 12 5 12.8301 5 13.8555C5 14.8809 5.83008 15.7012 6.85547 15.7012Z"
                              fill="#595959"
                            />
                          </g>
                        </svg>
                      </div>
                    </div>
                  )}
              </button>

              {/* Menu dropdown */}
              {hasMenu && (
                <div
                  ref={menuRef}
                  className={`absolute right-2 top-full -mt-2 p-2 shadow-[0_0_16px_rgba(0,0,0,0.10)] rounded-[12px] font-rounded-bold text-[14px] text-black w-[180px] bg-white flex flex-col gap-1 pointer-events-auto transition-all duration-150 ease-out z-[12000] ${isMenuAnimated
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-90"
                    }`}
                  style={{
                    transformOrigin: "top right",
                  }}
                  onMouseEnter={(e) => e.stopPropagation()}
                  onMouseLeave={(e) => e.stopPropagation()}
                >
                  {renamingId === collection.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="bg-[#F2F2F7] rounded-[8px] px-2 py-1 w-full outline-none focus:ring-2 focus:ring-[#05B0FF]/30"
                        placeholder="Module title"
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
                      {onRenameCollection && (
                        <button
                          onClick={handleRenameClick}
                          className="text-left px-2 py-1 rounded-[8px] hover:bg-[#F2F2F7]"
                        >
                          Rename
                        </button>
                      )}
                      {onDeleteCollection && (
                        <button
                          onClick={() =>
                            handleDeleteClick(collection.id, collection.name)
                          }
                          className="text-left px-2 py-1 rounded-[8px] hover:bg-red-50 text-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add Module Button - inside scrollable area */}
        {!(isLoading && collections.length === 0) && (
          <div className="relative">
            <button
              className={`relative group flex flex-row items-center w-full ${leftSidebarWidth < 140 ? "justify-center px-2" : "gap-2 px-2"
                } rounded-[8px] py-2 transition-colors duration-150 hover:bg-[#F7F7FA] bg-transparent`}
              title={leftSidebarWidth < 140 ? "Add Module" : undefined}
              onClick={() => onAddCollection?.()}
              onMouseEnter={(e) => updateTooltipFromEvent(e, "Add module")}
              onMouseMove={(e) => updateTooltipFromEvent(e, "Add module")}
              onMouseLeave={() => setTooltip(null)}
            >
              <div
                className={`text-[#A9A9AA] ${leftSidebarWidth < 140 ? "text-[20px]" : ""
                  }`}
              >
                <PlusIcon fill="currentColor" />
              </div>
              {leftSidebarWidth >= 140 && (
                <div className="font-rounded-bold py-1 text-[15px] text-[#A9A9AA] text-left leading-tight">
                  {collections.length > 0 ? "Add module" : "Add module"}
                </div>
              )}
            </button>
          </div>
        )}

        {/* Empty State - when no user-created modules (0 modules or only Medly 101) */}
        {!isLoading && (collections.length === 0 || (collections.length === 1 && collections[0].name === "Medly 101")) && leftSidebarWidth >= 140 && (
          <div className="flex flex-col gap-1 justify-center items-center text-center text-[#808080] mt-2">
            <svg
              width="30"
              height="84"
              viewBox="0 0 30 84"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M28.3251 83.732C28.7293 84.1084 29.362 84.0858 29.7384 83.6816C30.1147 83.2773 30.0921 82.6446 29.6879 82.2682L29.0065 83.0001L28.3251 83.732ZM13.5031 60.5L14.4764 60.2706L13.5031 60.5ZM23.9978 43L23.7688 43.9734L23.9978 43ZM1.5 35L0.5 34.9999L1.5 35ZM6.00309 17L6.968 17.2626L6.00309 17ZM9.24741 0.335636C8.88049 -0.0771466 8.24842 -0.114327 7.83564 0.252591L1.10895 6.23187C0.696169 6.59878 0.658989 7.23086 1.02591 7.64364C1.39282 8.05642 2.0249 8.0936 2.43768 7.72668L8.41695 2.41177L13.7319 8.39105C14.0988 8.80383 14.7309 8.84101 15.1436 8.47409C15.5564 8.10718 15.5936 7.4751 15.2267 7.06232L9.24741 0.335636ZM29.0065 83.0001L29.6879 82.2682C27.3242 80.0676 23.9048 76.2542 20.8721 72.1157C17.8184 67.9485 15.258 63.5866 14.4764 60.2706L13.5031 60.5L12.5298 60.7294C13.4101 64.4645 16.1846 69.1026 19.2589 73.2978C22.354 77.5215 25.8554 81.4327 28.3251 83.732L29.0065 83.0001ZM13.5031 60.5L14.4764 60.2706C13.528 56.2465 14.1266 51.6494 15.8834 48.3237C16.7582 46.6677 17.8922 45.3783 19.207 44.6076C20.5018 43.8486 22.0199 43.5619 23.7688 43.9734L23.9978 43L24.2269 42.0266C21.9757 41.4969 19.9316 41.8646 18.1956 42.8822C16.4796 43.8881 15.1143 45.4977 14.115 47.3895C12.1236 51.1593 11.4748 56.2533 12.5298 60.7294L13.5031 60.5ZM23.9978 43L23.7688 43.9734C25.1183 44.291 25.9685 45.0282 26.4477 45.94C26.9395 46.8759 27.0754 48.068 26.8309 49.3003C26.3388 51.7801 24.378 54.1329 21.3791 54.5077L21.5031 55.5L21.6271 56.4923C25.6293 55.992 28.1637 52.8589 28.7926 49.6896C29.1086 48.0973 28.9614 46.4241 28.2181 45.0097C27.4622 43.5712 26.1251 42.4732 24.2269 42.0266L23.9978 43ZM21.5031 55.5L21.3791 54.5077C17.7647 54.9595 13.0439 53.142 9.17866 49.5809C5.34179 46.0458 2.4994 40.9239 2.5 35.0001L1.5 35L0.5 34.9999C0.499334 41.5863 3.65849 47.2144 7.82348 51.0518C11.9602 54.863 17.2415 57.0405 21.6271 56.4923L21.5031 55.5ZM1.5 35L2.5 35.0001C2.50029 32.1497 3.15976 29.3491 4.0599 26.4237C4.94043 23.5621 6.10383 20.4378 6.968 17.2626L6.00309 17L5.03819 16.7374C4.1753 19.9079 3.08745 22.7836 2.14835 25.8355C1.22886 28.8237 0.500319 31.8503 0.5 34.9999L1.5 35ZM6.00309 17L6.968 17.2626C8.49008 11.6701 9.32951 3.92771 9.49827 1.05872L8.5 1L7.50173 0.941278C7.33716 3.73896 6.50992 11.3299 5.03819 16.7374L6.00309 17Z"
                fill="black"
                fillOpacity="0.3"
              />
            </svg>

            <p className="font-rounded-bold mt-4 text-[15px]">
              Let&apos;s Get Started
            </p>
            <p className="max-w-[170px] mx-auto text-[14px] leading-tight">
              {collections.length > 0
                ? "Add a module to get started"
                : "Add your first module to get started"}
            </p>
          </div>
        )}
      </div>

      {/* Global portal tooltip for collapsed sidebar */}
      {tooltip &&
        leftSidebarWidth < 140 &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed px-2 py-1 flex items-center justify-center bg-[#333333] rounded-[4px] whitespace-nowrap pointer-events-none z-[9999]"
            style={{
              top: tooltip.top,
              left: tooltip.left,
              transform: "translateY(-50%)",
            }}
          >
            <div className="font-medium text-[12px] text-white">
              {tooltip.content}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
