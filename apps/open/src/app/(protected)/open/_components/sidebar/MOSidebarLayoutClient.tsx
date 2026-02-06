"use client";

import MOManageAccountModal from "@/app/(protected)/open/_components/MOManageAccountModal";
import { useContentStructure } from "@/app/(protected)/open/_hooks/useContentStructure";
import type {
  Collection,
  Document,
  Folder,
  SourceReference,
} from "@/app/(protected)/open/_types/content";
import { isSupportedFormat, getSupportedFormatsMessage } from "@/app/(protected)/open/_utils/convertDocument";
import MobileBottomNav from "@/app/_components/MobileBottomNav";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import { SaveManagerProvider } from "@/app/_context/SaveManagerProvider";
import { applyWhiteOverlay } from "@/app/_lib/utils/colorUtils";
import {} from "@/app/_lib/utils/utils";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Create context for sidebar state
type SidebarState = "closed" | "semi-open" | "open";

const SidebarContext = createContext<{
  sidebarState: SidebarState;
  isSidebarOpen: boolean; // for backward compatibility
  toggleSidebar: () => void;
  openSidebar: () => void;
  semiOpenSidebar: () => void;
  closeSidebar: () => void;
  scheduleClose: (delay: number) => void;
  isManageAccountOpen: boolean;
  setIsManageAccountOpen: (open: boolean) => void;
  selectedCollection: string | null;
  setSelectedCollection: (collection: string | null) => void;
  collections: Collection[];
  folders: Folder[];
  documents: Document[];
  refetchContent: () => Promise<void>;
  getCollectionContent: (collectionId: string) => {
    folders: Folder[];
    documents: Document[];
  };
  getFolderDocuments: (folderId: string) => Document[];
  moveDocument: (
    docId: string,
    targetCollectionId: string,
    targetFolderId: string | null,
    newPosition: number,
  ) => void;
  reorderDocuments: (
    containerId: string,
    orderedDocIds: string[],
    isFolder: boolean,
  ) => void;
  updateMixedOrder: (collectionId: string, orderedIds: string[]) => void;
  addCollection: (
    name: string,
    color?: string,
    icon?: string,
  ) => Promise<Collection>;
  renameCollection: (collectionId: string, newName: string) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  addFolder: (
    collectionId: string,
    name: string,
    type?: "assignment",
    position?: number,
    deadline?: string,
    weighting?: number,
  ) => Promise<Folder>;
  updateFolder: (
    folderId: string,
    updates: { name?: string; deadline?: string; weighting?: number; isExpanded?: boolean },
  ) => Promise<void>;
  setFolderExpanded: (folderId: string, isExpanded: boolean) => void;
  setFoldersExpanded: (updates: Array<{ folderId: string; isExpanded: boolean }>) => void;
  renameDocument: (documentId: string, newName: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<Document | null>;
  deleteFolder: (folderId: string) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  groupDocumentsIntoFolder: (
    targetDocumentId: string,
    draggedDocumentId: string,
    collectionId: string,
    insertIndex: number,
  ) => Promise<Folder>;
  uploadDocument: (
    file: File,
    selectedCollection: string | null,
    overrides?: {
      collectionId?: string;
      folderId?: string | null;
      position?: number;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>;
  uploadIntoPlaceholder: (
    placeholderId: string,
    file: File,
  ) => Promise<Document>;
  createPracticeDocument: (
    sourceReferences: SourceReference[],
    collectionId: string,
    folderId: string | null,
    position: number,
    name: string,
  ) => Promise<Document>;
  createFlashcardDocument: (
    sourceReferences: SourceReference[],
    collectionId: string,
    folderId: string | null,
    position: number,
    name: string,
  ) => Promise<Document>;
  createNotesDocument: (
    collectionId: string,
    folderId: string | null,
    position: number,
    name: string,
  ) => Promise<Document>;
  setDocumentLoading: (documentId: string, loading: boolean) => void;
  updateLastViewed: (documentId: string) => Promise<void>;
  isContentLoading: boolean;
  leftSidebarWidth: number | null;
  setLeftSidebarWidth: (width: number) => void;
  rightChatWidth: number | null;
  setRightChatWidth: (width: number) => void;
  docsPanelWidth: number | null;
  setDocsPanelWidth: (width: number) => void;
  isExternalFileDragGlobal: boolean;
  setIsExternalFileDragGlobal: (value: boolean) => void;
  // Callback for external file drops (implemented by MOSidebar)
  externalFileDropRef: React.MutableRefObject<
    ((files: File[]) => Promise<void>) | null
  >;
  // Mobile layout state
  mobilePageIndex: number;
  setMobilePageIndex: (index: number) => void;
  mobileChatSnapPoint: number;
  setMobileChatSnapPoint: (point: number) => void;
  // Accent color derived from selected collection's primaryColor
  accentBgColor: string;
} | null>(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
};

interface MOSidebarLayoutClientProps {
  children: React.ReactNode;
}

export default function MOSidebarLayoutClient({
  children,
}: MOSidebarLayoutClientProps) {
  const pathname = usePathname();
  useHasActivePlan();

  // Sidebar state - always starts open
  const [sidebarState, setSidebarState] = useState<SidebarState>("open");
  const isSidebarOpen = sidebarState !== "closed"; // for backward compatibility

  // Content structure (collections, folders, documents)
  const contentStructure = useContentStructure();

  // Ref for external file drop handler - MOSidebar registers its handler here
  const externalFileDropRef = useRef<((files: File[]) => Promise<void>) | null>(
    null,
  );

  // Selected collection state - initialize to null for SSR/hydration consistency
  // localStorage is loaded in useEffect below
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  // Track if localStorage has been loaded to avoid race condition with auto-select
  const localStorageLoadedRef = useRef(false);

  // Mobile layout state
  const [mobilePageIndex, setMobilePageIndex] = useState(1); // Default to document/chat page on mobile
  const [mobileChatSnapPoint, setMobileChatSnapPoint] = useState(1); // Default to full chat (for /open route)

  // Load selectedCollection from localStorage after mount (client-only)
  // This ensures server and client render the same initial HTML
  useEffect(() => {
    try {
      const saved = localStorage.getItem("selectedCollection");
      if (saved) {
        setSelectedCollection(saved);
      }
    } catch {}
    localStorageLoadedRef.current = true;
  }, []);

  // Load sidebarState from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebarState");
      if (saved === "closed" || saved === "open") {
        setSidebarState(saved);
      }
    } catch {}
  }, []);

  // Persist sidebarState to localStorage (only "open" or "closed", not "semi-open")
  useEffect(() => {
    if (sidebarState === "open" || sidebarState === "closed") {
      try {
        localStorage.setItem("sidebarState", sidebarState);
      } catch {}
    }
  }, [sidebarState]);

  // Persist selectedCollection to localStorage
  useEffect(() => {
    if (selectedCollection) {
      try {
        localStorage.setItem("selectedCollection", selectedCollection);
      } catch {}
    }
  }, [selectedCollection]);

  // Auto-select first collection if none selected or invalid
  // Only run after localStorage has been loaded to avoid race condition
  // Use JSON.stringify of collection IDs as dependency to avoid infinite loops from array reference changes
  const collectionIds = contentStructure.collections.map((c) => c.id).join(",");
  useEffect(() => {
    if (!localStorageLoadedRef.current) return;

    if (contentStructure.collections.length > 0) {
      if (!selectedCollection) {
        setSelectedCollection(contentStructure.collections[0].id);
      } else {
        // Validate selectedCollection exists in collections
        const collectionExists = contentStructure.collections.some(
          (c) => c.id === selectedCollection,
        );
        if (!collectionExists) {
          setSelectedCollection(contentStructure.collections[0].id);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollection, collectionIds]);

  // Auto-refetch content when navigating to /open pages
  useEffect(() => {
    if (pathname.startsWith("/open")) {
      contentStructure.refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Derive accent color from selected collection's primaryColor (15% blended with white)
  const accentBgColor = useMemo(() => {
    const collection = contentStructure.collections.find(
      (c) => c.id === selectedCollection,
    );
    const primary = collection?.primaryColor;
    if (!primary) return "#F9F9FB";
    return applyWhiteOverlay(primary, 0.9);
  }, [contentStructure.collections, selectedCollection]);

  // Panel width state - initialized after mount to avoid SSR hydration mismatch
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number | null>(null);
  const [rightChatWidth, setRightChatWidth] = useState<number | null>(null);
  const [docsPanelWidth, setDocsPanelWidth] = useState<number | null>(null);

  // Load widths from localStorage after mount (client-side only)
  useEffect(() => {
    const defaultWidth = Math.floor(window.innerWidth * 0.2);
    const savedLeft = localStorage.getItem("sidebarLeftWidth");
    const savedRight = localStorage.getItem("chatPanelWidth");
    const savedDocs = localStorage.getItem("docsPanelWidth");
    // Default to fully expanded (240px) for first-time users
    setLeftSidebarWidth(savedLeft ? Number(savedLeft) : 240);
    setRightChatWidth(savedRight ? Number(savedRight) : defaultWidth);
    setDocsPanelWidth(savedDocs ? Number(savedDocs) : 320);
  }, []);

  // Global external file drag detection
  const [isExternalFileDragGlobal, setIsExternalFileDragGlobal] =
    useState(false);
  const sidebarStateBeforeDragRef = useRef<SidebarState | null>(null);

  // Ref for scheduled close timeout (for hover menu behavior)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Manage account modal state - lifted here so it persists when sidebar closes
  const [isManageAccountOpen, setIsManageAccountOpen] = useState(false);

  const toggleSidebar = () => {
    const newState = sidebarState === "closed" ? "open" : "closed";
    setSidebarState(newState);
  };

  const openSidebar = useCallback(() => {
    setSidebarState("open");
  }, []);

  const semiOpenSidebar = useCallback(() => {
    // Cancel any scheduled close when entering sidebar area
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setSidebarState("semi-open");
  }, []);

  const closeSidebar = useCallback(() => {
    // Cancel any scheduled close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setSidebarState("closed");
  }, []);

  const scheduleClose = useCallback((delay: number) => {
    // Cancel any existing scheduled close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setSidebarState("closed");
      closeTimeoutRef.current = null;
    }, delay);
  }, []);

  // Mouse position tracking to close sidebar when leaving the area
  // Only applies to semi-open state, not fully open state
  useEffect(() => {
    if (sidebarState !== "semi-open") return;

    const handleMouseMove = (e: MouseEvent) => {
      // Only close from semi-open state when mouse leaves the area
      const sidebarAreaWidth = 400;

      if (e.clientX > sidebarAreaWidth + 50) {
        // Add 50px buffer
        closeSidebar();
      }
    };

    // Add mouse move listener to document
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [sidebarState, closeSidebar]);

  // Global file drag detection - auto-open sidebar when dragging files from OS
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        // Remember previous state to restore on cancel
        if (!isExternalFileDragGlobal) {
          sidebarStateBeforeDragRef.current = sidebarState;
        }
        setIsExternalFileDragGlobal(true);
        // Only semi-open if sidebar is closed (don't change if already open)
        if (sidebarState === "closed") {
          semiOpenSidebar();
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Clear when leaving window (relatedTarget is null) - drag canceled
      if (e.relatedTarget === null) {
        setIsExternalFileDragGlobal(false);
        // Restore previous sidebar state (close if it was closed)
        if (sidebarStateBeforeDragRef.current === "closed") {
          closeSidebar();
        }
        sidebarStateBeforeDragRef.current = null;
      }
    };

    const handleDrop = () => {
      setIsExternalFileDragGlobal(false);
      sidebarStateBeforeDragRef.current = null; // Keep sidebar open after successful drop
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [semiOpenSidebar, closeSidebar, sidebarState, isExternalFileDragGlobal]);

  return (
    <SidebarContext.Provider
      value={{
        sidebarState,
        isSidebarOpen,
        toggleSidebar,
        openSidebar,
        semiOpenSidebar,
        closeSidebar,
        scheduleClose,
        isManageAccountOpen,
        setIsManageAccountOpen,
        selectedCollection,
        setSelectedCollection,
        collections: contentStructure.collections,
        folders: contentStructure.folders,
        documents: contentStructure.documents,
        refetchContent: contentStructure.refetch,
        getCollectionContent: contentStructure.getCollectionContent,
        getFolderDocuments: contentStructure.getFolderDocuments,
        moveDocument: contentStructure.moveDocument,
        reorderDocuments: contentStructure.reorderDocuments,
        updateMixedOrder: contentStructure.updateMixedOrder,
        addCollection: contentStructure.addCollection,
        renameCollection: contentStructure.renameCollection,
        renameFolder: contentStructure.renameFolder,
        addFolder: contentStructure.addFolder,
        updateFolder: contentStructure.updateFolder,
        setFolderExpanded: contentStructure.setFolderExpanded,
        setFoldersExpanded: contentStructure.setFoldersExpanded,
        renameDocument: contentStructure.renameDocument,
        deleteDocument: contentStructure.deleteDocument,
        deleteFolder: contentStructure.deleteFolder,
        deleteCollection: contentStructure.deleteCollection,
        groupDocumentsIntoFolder: contentStructure.groupDocumentsIntoFolder,
        uploadDocument: contentStructure.uploadDocument,
        uploadIntoPlaceholder: contentStructure.uploadIntoPlaceholder,
        createPracticeDocument: contentStructure.createPracticeDocument,
        createFlashcardDocument: contentStructure.createFlashcardDocument,
        createNotesDocument: contentStructure.createNotesDocument,
        setDocumentLoading: contentStructure.setDocumentLoading,
        updateLastViewed: contentStructure.updateLastViewed,
        isContentLoading: contentStructure.isLoading,
        leftSidebarWidth,
        setLeftSidebarWidth,
        rightChatWidth,
        setRightChatWidth,
        docsPanelWidth,
        setDocsPanelWidth,
        isExternalFileDragGlobal,
        setIsExternalFileDragGlobal,
        externalFileDropRef,
        mobilePageIndex,
        setMobilePageIndex,
        mobileChatSnapPoint,
        setMobileChatSnapPoint,
        accentBgColor,
      }}
    >
      <SaveManagerProvider>
        <div
          className={`flex flex-col h-dvh md:h-dvh overflow-hidden overscroll-none`}
        >
          {/* {!hasActivePlan && <TrialPrompt />} */}
          <main
            className={`flex flex-row w-full flex-1 overflow-hidden`}
            style={{ backgroundColor: accentBgColor }}
          >
            <div className={`flex flex-col flex-1 overflow-hidden relative`}>
              <div className={`flex-1 md:pt-0 overflow-hidden min-h-0`}>
                {children}
              </div>
              <MobileBottomNav />

              {/* Drop zone overlay when dragging files from OS */}
              {isExternalFileDragGlobal && (
                <div
                  className="absolute"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Clear the drag state immediately
                    setIsExternalFileDragGlobal(false);
                    sidebarStateBeforeDragRef.current = null;

                    const files = Array.from(e.dataTransfer.files);
                    const supportedFiles = files.filter((f) => isSupportedFormat(f.name));

                    if (supportedFiles.length === 0) {
                      alert(getSupportedFormatsMessage());
                      return;
                    }

                    // Open sidebar fully to show upload progress
                    openSidebar();

                    // Use the same handler as the sidebar drop zone
                    if (externalFileDropRef.current) {
                      await externalFileDropRef.current(supportedFiles);
                    }
                  }}
                />
              )}
            </div>
          </main>
        </div>
        {/* Render modal at layout level so it persists when sidebar closes */}
        {isManageAccountOpen && (
          <MOManageAccountModal
            isOpen={isManageAccountOpen}
            onClose={() => setIsManageAccountOpen(false)}
          />
        )}
      </SaveManagerProvider>
    </SidebarContext.Provider>
  );
}
