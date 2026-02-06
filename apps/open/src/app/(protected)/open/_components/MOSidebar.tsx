"use client";

import DocumentItem from "@/app/(protected)/open/_components/DocumentItem";
import DocumentPreviewRectangles from "@/app/(protected)/open/_components/DocumentPreviewRectangles";
import FolderItem from "@/app/(protected)/open/_components/FolderItem";
import MOManageAccountModal from "@/app/(protected)/open/_components/MOManageAccountModal";
import AddModuleModal from "@/app/(protected)/open/_components/AddModuleModal";
import FolderEditPanel from "@/app/(protected)/open/_components/sidebar/FolderEditPanel";
import { useSidebar } from "@/app/(protected)/open/_components/sidebar/MOSidebarLayoutClient";
import SidebarCollectionsList from "@/app/(protected)/open/_components/SidebarCollectionsList";
import type { DragItem } from "@/app/(protected)/open/_components/useDragAndDrop";
import { useDragAndDrop } from "@/app/(protected)/open/_components/useDragAndDrop";
import { useAIOrganization } from "@/app/(protected)/open/_hooks/useAIOrganization";
import { useGenerateDocument } from "@/app/(protected)/open/_hooks/useGenerateDocument";
import { fileUrls } from "@/app/(protected)/open/_lib/fileUrls";
import ShimmerEffect from "@/app/(protected)/sessions/components/question-components/ShimmerEffect";
import EditIcon from "@/app/_components/icons/EditIcon";
import LogoutIcon from "@/app/_components/icons/LogoutIcon";
import { useAuth } from "@/app/_context/AuthProvider";
import { useUser } from "@/app/_context/UserProvider";
import { useResponsive } from "@/app/_hooks/useResponsive";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { lessonIdToSubjectId } from "@/app/_lib/utils/utils";
import { useRouter } from "next/navigation";
import { useOpenPathname } from "../_hooks/useOpenPathname";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAiChat } from "./chat/MOChatLayoutClient";
import MOTooltip from "./MOTooltip";
import MOSidebarHeader from "./sidebar/MOSidebarHeader";
import SidebarPanelHeader from "./sidebar/MOSidebarPanelHeader";
import SidebarUserSection from "./sidebar/MOSidebarUserSection";
import { useAITaskSafe } from "../_context/AITaskProvider";
import { toast } from "sonner";
import {
  isSupportedFormat,
  getSupportedFormatsMessage,
  MAX_FILE_SIZE,
  SUPPORTED_FILE_ACCEPT,
} from "../_utils/convertDocument";

interface SubjectForGradeSelection {
  id: number;
  legacyId: string;
  title: string;
  course: string;
  examBoard: string;
  currentGrade?: string;
  targetGrade?: string;
  priorQualificationGrade?: string;
  units?: { topics?: { lessons?: { legacyId: string }[] }[] }[];
}

export default function Sidebar() {
  const {
    sidebarState,
    selectedCollection,
    setSelectedCollection,
    collections,
    folders,
    documents,
    getCollectionContent,
    getFolderDocuments,
    moveDocument,
    reorderDocuments,
    updateMixedOrder,
    addCollection,
    groupDocumentsIntoFolder,
    uploadDocument,
    uploadIntoPlaceholder,
    renameDocument,
    renameFolder,
    updateFolder,
    setFolderExpanded,
    renameCollection,
    deleteDocument,
    deleteFolder,
    deleteCollection,
    addFolder,
    createPracticeDocument,
    createFlashcardDocument,
    createNotesDocument,
    leftSidebarWidth,
    setLeftSidebarWidth,
    docsPanelWidth,
    setDocsPanelWidth,
    closeSidebar,
    setDocumentLoading,
    updateLastViewed,
    isExternalFileDragGlobal,
    setIsExternalFileDragGlobal,
    externalFileDropRef,
    isContentLoading,
    refetchContent,
  } = useSidebar();

  const { track } = useTracking();
  const { sendTriggerEvent } = useAiChat();
  const aiTask = useAITaskSafe();


  // Check if user has completed onboarding (seen the select tooltip)
  const hasSeenSelectDocumentTooltip = useCallback(() => {
    try {
      return localStorage.getItem("open_select_document_seen") === "true";
    } catch {
      return false;
    }
  }, []);

  // Wrapper that uploads + triggers AI event in one call
  const uploadAndTrigger = useCallback(
    async (
      file: File,
      collectionId: string | null,
      overrides?: {
        collectionId?: string;
        folderId?: string | null;
        position?: number;
      },
      source: "sidebar_upload" | "drag_drop" = "sidebar_upload",
    ) => {
      const uploadedDoc = await uploadDocument(file, collectionId, overrides);
      if (uploadedDoc?.id) {
        // Immediately mark as loaded so document appears in place
        setDocumentLoading(uploadedDoc.id, false);

        // Track document creation
        track("document_created", {
          document_type: uploadedDoc.type || "document",
          source,
        });
        track("document_uploaded", {
          file_size_mb: Math.round((file.size / (1024 * 1024)) * 100) / 100,
          success: true,
        });

        // Only trigger AI processing during onboarding (before user has seen tooltip)
        if (!hasSeenSelectDocumentTooltip()) {
          sendTriggerEvent({
            documentId: uploadedDoc.id,
            documentName: uploadedDoc.name,
            extractedText: (uploadedDoc as any).extractedText || "",
            fileType: "pdf",
            collectionId: uploadedDoc.collectionId,
            folderId: uploadedDoc.folderId,
          });
        }

        // Mark checklist step based on AI-detected label
        const label = uploadedDoc.label;
        if (label === "slides") {
          window.dispatchEvent(
            new CustomEvent("medly:checklist-step", { detail: { stepId: "review-lecture" } })
          );
        } else if (label === "assignment") {
          window.dispatchEvent(
            new CustomEvent("medly:checklist-step", { detail: { stepId: "start-assignment" } })
          );
        }
      }
      return uploadedDoc;
    },
    [
      uploadDocument,
      sendTriggerEvent,
      hasSeenSelectDocumentTooltip,
      track,
      setDocumentLoading,
    ],
  );

  // Wrapper for placeholder uploads + trigger
  const uploadIntoPlaceholderAndTrigger = useCallback(
    async (placeholderId: string, file: File) => {
      const uploadedDoc = await uploadIntoPlaceholder(placeholderId, file);
      if (uploadedDoc?.id) {
        // Immediately mark as loaded
        setDocumentLoading(uploadedDoc.id, false);

        // Only trigger AI processing during onboarding (before user has seen tooltip)
        if (!hasSeenSelectDocumentTooltip()) {
          sendTriggerEvent({
            documentId: uploadedDoc.id,
            documentName: uploadedDoc.name,
            extractedText: (uploadedDoc as any).extractedText || "",
            fileType: "pdf",
            collectionId: uploadedDoc.collectionId,
            folderId: uploadedDoc.folderId,
          });
        }

        // Mark checklist step based on AI-detected label
        const label = uploadedDoc.label;
        if (label === "slides") {
          window.dispatchEvent(
            new CustomEvent("medly:checklist-step", { detail: { stepId: "review-lecture" } })
          );
        } else if (label === "assignment") {
          window.dispatchEvent(
            new CustomEvent("medly:checklist-step", { detail: { stepId: "start-assignment" } })
          );
        }
      }
      return uploadedDoc;
    },
    [
      uploadIntoPlaceholder,
      sendTriggerEvent,
      setDocumentLoading,
      hasSeenSelectDocumentTooltip,
    ],
  );

  const {
    generatePracticeFromDocument,
    generatePracticeFromFolder,
    generateFlashcardsFromDocument,
    generateFlashcardsFromFolder,
  } = useGenerateDocument();

  // AI Organization hook for folder suggestions
  const {
    pendingSuggestions,
    processingDocIds,
    requestSuggestionForTargetedDrop,
    requestAutoOrganize,
    acceptSuggestion: acceptSuggestionFromHook,
    rejectSuggestion,
  } = useAIOrganization({
    folders,
    documents,
    moveDocument,
  });

  const [shouldAnimate] = useState(true);
  const [isManageAccountOpen, setIsManageAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingPlaceholderId, setPendingPlaceholderId] = useState<
    string | null
  >(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileAvatarBtnRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = useOpenPathname();
  const router = useRouter();
  const isLessonView = pathname.startsWith("/lessons/");
  const isSubjectView = pathname.startsWith("/subjects/");
  const isMockView = pathname.includes("/mocks/");
  const isHomePage = pathname === "/" || pathname === "";
  const isOpenDocView = pathname.startsWith("/open/doc/");
  const activeDocumentId = isOpenDocView ? pathname.split("/")[3] : null;
  const lessonId = isLessonView ? pathname.split("/")[2] : null;
  const subjectId = isLessonView
    ? lessonIdToSubjectId(lessonId ?? "")
    : isSubjectView
      ? pathname.split("/")[2]
      : null;

  // When true, we avoid auto-syncing selected subject from the URL.
  // This preserves manual selections (e.g., after adding grades) until the route changes.
  const suppressUrlSyncRef = useRef<boolean>(false);

  const { isBelowSm, isMeasured } = useResponsive();
  const { user } = useUser();
  const { logout } = useAuth();

  // State for sidebar mode - "all" or "assignments"
  const [sidebarMode, setSidebarMode] = useState<"all" | "assignments">("all");

  // State for grade selection
  const [subjectNeedingGrades, setSubjectNeedingGrades] =
    useState<SubjectForGradeSelection | null>(null);

  // State for search functionality
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // State for mock panel
  const [isMockPanelOpen, setIsMockPanelOpen] = useState(isMockView);

  // State for "New" button dropdown
  const [isNewDropdownOpen, setIsNewDropdownOpen] = useState(false);
  const [isNewDropdownPinned, setIsNewDropdownPinned] = useState(false);
  const [creatingType, setCreatingType] = useState<
    "folder" | "assignment" | null
  >(null);
  const [isCreatePanelAnimated, setIsCreatePanelAnimated] = useState(false);
  const createPanelRef = useRef<HTMLDivElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const [createPanelPosition, setCreatePanelPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [newDropdownPosition, setNewDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // State for "Organize" button dropdown
  const [isOrganizeDropdownOpen, setIsOrganizeDropdownOpen] = useState(false);
  const organizeButtonRef = useRef<HTMLButtonElement>(null);
  const [organizeDropdownPosition, setOrganizeDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // State for module creation modal
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  // Drag and drop hook for documents
  const dragHook = useDragAndDrop();

  // External file drag state (for OS-level file drops over list)
  const [isExternalFileDragging, setIsExternalFileDragging] = useState(false);
  const [externalHoverFolderId, setExternalHoverFolderId] = useState<
    string | null
  >(null);
  const [externalHoverPlaceholderId, setExternalHoverPlaceholderId] = useState<
    string | null
  >(null);
  const [externalInsertIndex, setExternalInsertIndex] = useState<number | null>(
    null,
  );
  const [externalFolderInsertIndex, setExternalFolderInsertIndex] = useState<
    number | null
  >(null);

  // Internal drag: track insertion index within folder
  const [internalFolderInsertIndex, setInternalFolderInsertIndex] = useState<
    number | null
  >(null);

  // Track which folder currently has a nested document menu open.
  // Needed so the folder can bump z-index above root items while the popover is visible.
  const [folderIdWithOpenChildMenu, setFolderIdWithOpenChildMenu] = useState<
    string | null
  >(null);

  // Helper to get expansion state from folder data (defaults to true)
  const getFolderExpanded = useCallback(
    (folderId: string) => {
      const folder = folders.find((f) => f.id === folderId);
      return folder?.isExpanded ?? true;
    },
    [folders]
  );

  // Remember if a folder was open when drag started, to restore on drop
  const folderReopenOnDropRef = useRef<{
    folderId: string;
    shouldReopen: boolean;
  } | null>(null);

  // Wrap item mouse/touch starts to capture folder pre-collapse state
  const handleItemMouseDown = useCallback(
    (e: React.MouseEvent, item: DragItem, index: number) => {
      // Prevent text selection while initiating a drag (before the drag threshold kicks in).
      e.preventDefault();
      e.stopPropagation();

      // Disable folder reordering in assignments mode (only file moves allowed)
      if (sidebarMode === "assignments" && item.type === "folder") {
        return;
      }

      if (item.type === "folder") {
        const wasOpen = getFolderExpanded(item.id);
        folderReopenOnDropRef.current = {
          folderId: item.id,
          shouldReopen: wasOpen,
        };
      }
      dragHook.onMouseDown(e, item, index);
    },
    [dragHook, sidebarMode, getFolderExpanded],
  );

  const handleItemTouchStart = useCallback(
    (e: React.TouchEvent, item: DragItem, index: number) => {
      // Prevent long-press selection / scrolling artifacts when starting a drag.
      e.preventDefault();
      e.stopPropagation();

      // Disable folder reordering in assignments mode (only file moves allowed)
      if (sidebarMode === "assignments" && item.type === "folder") {
        return;
      }

      if (item.type === "folder") {
        const wasOpen = getFolderExpanded(item.id);
        folderReopenOnDropRef.current = {
          folderId: item.id,
          shouldReopen: wasOpen,
        };
      }
      dragHook.onTouchStart(e, item, index);
    },
    [dragHook, sidebarMode, getFolderExpanded],
  );

  // Auto-scroll support during drag
  const autoScrollRafRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  // Get content for selected collection (memoized to prevent re-renders during drag)
  const collectionContent = useMemo(() => {
    return selectedCollection
      ? getCollectionContent(selectedCollection)
      : { folders: [], documents: [] };
  }, [selectedCollection, getCollectionContent]);

  // Track documents transitioning: exiting (fade out at bottom) then entering (appear at final position)
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const animationTimeoutsRef = useRef<number[]>([]);

  // Reorganization animation state (diff-based)
  const [isReorganizing, setIsReorganizing] = useState(false);
  const [showShimmer, setShowShimmer] = useState(false);
  const [reorganizationDiff, setReorganizationDiff] = useState<{
    movingDocIds: Set<string>;
    deletingFolderIds: Set<string>;
    creatingFolders: string[];
    stayingItemIds: Set<string>;
  } | null>(null);
  const [exitingFolderIds, setExitingFolderIds] = useState<Set<string>>(
    new Set(),
  );
  const [enteringFolderIds, setEnteringFolderIds] = useState<Set<string>>(
    new Set(),
  );

  const EXIT_MS = 300;
  // Tailwind: documentEntrance is 80ms delay + 300ms animation
  const ENTER_TOTAL_MS = 430;

  const clearAnimationTimeouts = useCallback(() => {
    animationTimeoutsRef.current.forEach((t) => clearTimeout(t));
    animationTimeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearAnimationTimeouts();
    };
  }, [clearAnimationTimeouts]);

  // Animate document relocation (exit → scroll → move → enter)
  const animateDocumentRelocation = useCallback(
    (documentId: string, targetFolderId: string | null) => {
      // Start exit animation (fade out at current position)
      setExitingIds((prev) => new Set(prev).add(documentId));

      // After exit animation, scroll to target and relocate
      const exitTimeout = window.setTimeout(() => {
        // Scroll to target folder if exists
        if (targetFolderId && dragHook.containerRef.current) {
          const folderElement = dragHook.containerRef.current.querySelector(
            `[data-folder-id="${targetFolderId}"]`,
          );
          if (folderElement) {
            folderElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }

        // Delay before entrance animation to let scroll complete
        const enterDelayTimeout = window.setTimeout(() => {
          // Move document to new position
          const doc = documents.find((d) => d.id === documentId);
          if (!doc) return;

          const newPosition =
            targetFolderId !== null
              ? getFolderDocuments(targetFolderId).length
              : collectionContent.documents.length;

          moveDocument(
            documentId,
            doc.collectionId,
            targetFolderId,
            newPosition,
          );

          // Switch from exit to enter animation
          setExitingIds((prev) => {
            const next = new Set(prev);
            next.delete(documentId);
            return next;
          });
          setEnteringIds((prev) => new Set(prev).add(documentId));

          // Clear enter animation after it completes
          const enterClearTimeout = window.setTimeout(() => {
            setEnteringIds((prev) => {
              const next = new Set(prev);
              next.delete(documentId);
              return next;
            });
          }, ENTER_TOTAL_MS);
          animationTimeoutsRef.current.push(enterClearTimeout);
        }, 800); // Delay for scroll to complete
        animationTimeoutsRef.current.push(enterDelayTimeout);
      }, EXIT_MS);
      animationTimeoutsRef.current.push(exitTimeout);
    },
    [
      documents,
      getFolderDocuments,
      moveDocument,
      collectionContent.documents.length,
      dragHook.containerRef,
    ],
  );

  // Wrapper that triggers animation when accepting suggestion
  const acceptSuggestion = useCallback(
    async (documentId: string) => {
      const suggestion = pendingSuggestions.find(
        (s) => s.documentId === documentId,
      );
      if (!suggestion) return;

      console.log(
        "[Sidebar] Accepting suggestion for:",
        documentId,
        "to folder:",
        suggestion.suggestedFolderId,
      );

      // Trigger the animated relocation
      animateDocumentRelocation(documentId, suggestion.suggestedFolderId);

      // Remove from pending suggestions
      rejectSuggestion(documentId);
    },
    [pendingSuggestions, animateDocumentRelocation, rejectSuggestion],
  );

  // Debug logging for pending suggestions
  useEffect(() => {
    console.log(
      "[Sidebar] Pending suggestions count:",
      pendingSuggestions.length,
    );
    if (pendingSuggestions.length > 0) {
      console.log("[Sidebar] Current pending suggestions:", pendingSuggestions);
    }
  }, [pendingSuggestions]);

  // Register handler for external file drops (from overlay)
  useEffect(() => {
    const handleExternalFileDrop = async (files: File[]) => {
      // Scroll to bottom to show upload progress
      setTimeout(() => {
        dragHook.containerRef.current?.scrollTo({
          top: dragHook.containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);

      // Upload all files in parallel
      const uploadPromises = files.map(async (file) => {
        try {
          const uploadedDoc = await uploadAndTrigger(
            file,
            selectedCollection,
            undefined,
            "drag_drop",
          );
          if (!uploadedDoc?.id) {
            return;
          }

          // Request AI organization in background (suggestions will show as badges)
          if (selectedCollection) {
            console.log(
              "[Sidebar] Requesting AI organization for:",
              uploadedDoc.name,
            );
            await requestAutoOrganize(
              uploadedDoc,
              selectedCollection,
              (uploadedDoc as any).extractedText || "",
            );
          }
        } catch (err) {
          console.error("Failed to upload PDF:", err);
        }
      });

      await Promise.all(uploadPromises);
    };

    externalFileDropRef.current = handleExternalFileDrop;

    return () => {
      externalFileDropRef.current = null;
    };
  }, [
    uploadAndTrigger,
    selectedCollection,
    requestAutoOrganize,
    externalFileDropRef,
    dragHook.containerRef,
  ]);

  // Build document order for position tracking (mix folders and documents by position)
  // Loading and exiting docs go to the bottom
  const documentOrder = useMemo(() => {
    // Normal items (not loading, not exiting)
    const normalItems = [
      ...collectionContent.folders.map((f) => ({
        id: f.id,
        position: f.position,
        type: "folder" as const,
      })),
      ...collectionContent.documents
        .filter((d) => !d.isLoading && !exitingIds.has(d.id))
        .map((d) => ({
          id: d.id,
          position: d.position,
          type: "document" as const,
        })),
    ];

    // Sort normal items by position
    normalItems.sort((a, b) => a.position - b.position);

    // Loading and exiting docs go at the bottom
    const bottomDocs = collectionContent.documents
      .filter((d) => d.isLoading || exitingIds.has(d.id))
      .map((d) => ({ id: d.id, type: "document" as const }));

    return [...normalItems, ...bottomDocs].map((item) => item.id);
  }, [collectionContent.folders, collectionContent.documents, exitingIds]);

  // Assignment folders filtered and sorted by deadline (earliest first)
  const assignmentFolders = useMemo(() => {
    return collectionContent.folders
      .filter((f) => f.type === "assignment")
      .sort((a, b) => {
        // Sort by deadline (earliest first), folders without deadline go last
        if (!a.deadline && !b.deadline) return a.position - b.position;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  }, [collectionContent.folders]);

  // Spacer height for the absolute-positioned list items.
  // Keeps the scroll container height fixed while enabling scroll overflow.
  const listContentHeight = useMemo(() => {
    if (documentOrder.length === 0) return 0;

    const baseHeight =
      sidebarMode === "assignments"
        ? assignmentFolders.reduce(
            (sum, f) => sum + (dragHook.itemHeights[f.id] ?? 48) + dragHook.GAP,
            0,
          )
        : Object.keys(dragHook.itemPositions).length > 0
          ? Math.max(0, ...Object.values(dragHook.itemPositions)) +
            Math.max(0, ...Object.values(dragHook.itemHeights)) +
            dragHook.GAP
          : documentOrder.length * 48;

    return Math.max(100, baseHeight);
  }, [
    assignmentFolders,
    documentOrder.length,
    dragHook.GAP,
    dragHook.itemHeights,
    dragHook.itemPositions,
    sidebarMode,
  ]);

  // Helper to get position with proper fallback for new items
  // Prevents items from starting at position 0 and animating down from the top
  const getPositionWithFallback = useCallback(
    (itemId: string) => {
      const existingPosition = dragHook.itemPositions[itemId];
      if (existingPosition !== undefined) {
        return existingPosition;
      }

      // Calculate fallback position based on order index and cumulative heights
      const itemIndex = documentOrder.indexOf(itemId);
      if (itemIndex === -1) return 0;

      let fallbackPosition = 0;
      for (let i = 0; i < itemIndex; i++) {
        const id = documentOrder[i];
        fallbackPosition += (dragHook.itemHeights[id] ?? 48) + dragHook.GAP;
      }
      return fallbackPosition;
    },
    [documentOrder, dragHook.itemPositions, dragHook.itemHeights, dragHook.GAP],
  );

  // Right panel sizing (desktop): fixed width via Tailwind classes

  // Module modal handlers
  const handleOpenAddModule = useCallback(() => {
    setIsCreatingModule(true);
  }, []);

  const closeModuleModal = useCallback(() => {
    setIsCreatingModule(false);
  }, []);

  const handleCreateModule = useCallback(
    async (values: { name: string; color: string }) => {
      try {
        const newCollection = await addCollection(values.name, values.color);
        setSelectedCollection(newCollection.id);
        closeModuleModal();
      } catch (error) {
        console.error("Failed to add collection:", error);
      }
    },
    [addCollection, setSelectedCollection, closeModuleModal],
  );

  // Handle document click - navigate to document view or trigger upload for placeholders
  const handleDocumentClick = useCallback(
    (documentId: string) => {
      const doc = documents.find((d) => d.id === documentId);

      // If placeholder, trigger file upload instead of navigating
      if (doc?.isPlaceholder) {
        setPendingPlaceholderId(documentId);
        fileInputRef.current?.click();
        return;
      }

      // If already viewing this document, deselect by going to /open
      if (documentId === activeDocumentId) {
        router.push("/open");
        return;
      }

      // Update last viewed timestamp (for blue dot indicator)
      updateLastViewed(documentId);

      router.push(`/open/doc/${documentId}`);
    },
    [router, documents, updateLastViewed, activeDocumentId],
  );

  // Handle document rename
  const handleDocumentRename = useCallback(
    async (documentId: string, newName: string) => {
      try {
        await renameDocument(documentId, newName);
      } catch (error) {
        console.error("Failed to rename document:", error);
        throw error;
      }
    },
    [renameDocument],
  );

  // Handle document delete
  const handleDocumentDelete = useCallback(
    async (documentId: string) => {
      try {
        // Get document type before deleting for tracking
        const docToDelete = documents.find((d) => d.id === documentId);
        const deletedDocument = await deleteDocument(documentId);

        if (!deletedDocument) {
          return;
        }

        // Track document deletion
        track("document_deleted", {
          document_type: docToDelete?.type || deletedDocument.type || "unknown",
        });

        // If currently viewing this document, redirect to /open with collection selected
        const isViewingThisDocument = pathname === `/open/doc/${documentId}`;

        if (isViewingThisDocument) {
          // Set collection before redirecting so sidebar opens to that collection
          if (deletedDocument.collectionId && setSelectedCollection) {
            setSelectedCollection(deletedDocument.collectionId);
          }

          router.push("/open");
        }
      } catch (error) {
        throw error;
      }
    },
    [deleteDocument, documents, pathname, router, setSelectedCollection, track],
  );

  // Handle folder rename
  const handleFolderRename = useCallback(
    async (folderId: string, newName: string) => {
      try {
        await renameFolder(folderId, newName);
      } catch (error) {
        console.error("Failed to rename folder:", error);
        throw error;
      }
    },
    [renameFolder],
  );

  // Handle folder update (for assignments: name, deadline, weighting)
  const handleFolderUpdate = useCallback(
    async (
      folderId: string,
      updates: { name?: string; deadline?: string; weighting?: number },
    ) => {
      try {
        await updateFolder(folderId, updates);
      } catch (error) {
        console.error("Failed to update folder:", error);
        throw error;
      }
    },
    [updateFolder],
  );

  // Handle folder delete
  const handleFolderDelete = useCallback(
    async (folderId: string) => {
      try {
        await deleteFolder(folderId);
      } catch (error) {
        console.error("Failed to delete folder:", error);
        throw error;
      }
    },
    [deleteFolder],
  );

  // Wrapper handlers for DocumentItem and FolderItem (use hook)
  const handleDocumentGeneratePractice = useCallback(
    async (documentId: string) => {
      await generatePracticeFromDocument(documentId);
    },
    [generatePracticeFromDocument],
  );

  const handleFolderGeneratePractice = useCallback(
    async (folderId: string) => {
      await generatePracticeFromFolder(folderId);
    },
    [generatePracticeFromFolder],
  );

  // Wrapper handlers for flashcard generation (use hook)
  const handleDocumentGenerateFlashcards = useCallback(
    async (documentId: string) => {
      await generateFlashcardsFromDocument(documentId);
    },
    [generateFlashcardsFromDocument],
  );

  const handleFolderGenerateFlashcards = useCallback(
    async (folderId: string) => {
      await generateFlashcardsFromFolder(folderId);
    },
    [generateFlashcardsFromFolder],
  );

  // "New" dropdown handlers
  const closeNewDropdown = useCallback(() => {
    setIsNewDropdownOpen(false);
    setIsNewDropdownPinned(false);
  }, []);

  const openNewDropdown = useCallback((pinned = false) => {
    if (!newButtonRef.current) return;
    const rect = newButtonRef.current.getBoundingClientRect();
    setNewDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
    });
    // Use requestAnimationFrame to ensure position is applied before showing
    requestAnimationFrame(() => {
      setIsNewDropdownOpen(true);
      if (pinned) {
        setIsNewDropdownPinned(true);
      }
    });
  }, []);

  // "Organize" dropdown handlers
  const closeOrganizeDropdown = useCallback(() => {
    setIsOrganizeDropdownOpen(false);
  }, []);

  const openOrganizeDropdown = useCallback(() => {
    if (!organizeButtonRef.current) return;
    const rect = organizeButtonRef.current.getBoundingClientRect();
    setOrganizeDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
    });
    requestAnimationFrame(() => {
      setIsOrganizeDropdownOpen(true);
    });
  }, []);

  const closeCreatePanel = useCallback(() => {
    setIsCreatePanelAnimated(false);
    setTimeout(() => {
      setCreatingType(null);
      setCreatePanelPosition(null);
    }, 150);
  }, []);

  // Click outside to close create panel
  useEffect(() => {
    if (!creatingType) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        createPanelRef.current &&
        !createPanelRef.current.contains(e.target as Node)
      ) {
        closeCreatePanel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [creatingType, closeCreatePanel]);

  const handleNewCreatePractice = useCallback(async () => {
    if (!selectedCollection) return;
    const content = getCollectionContent(selectedCollection);
    const position = content.folders.length + content.documents.length;
    const doc = await createPracticeDocument(
      [],
      selectedCollection,
      null,
      position,
      "Untitled Practice Test",
    );
    // Mark checklist step: prepare-exam
    window.dispatchEvent(
      new CustomEvent("medly:checklist-step", { detail: { stepId: "prepare-exam" } })
    );
    router.push(`/open/doc/${doc.id}`);
    closeNewDropdown();
  }, [
    selectedCollection,
    getCollectionContent,
    createPracticeDocument,
    router,
    closeNewDropdown,
  ]);

  const handleNewCreateFlashcards = useCallback(async () => {
    if (!selectedCollection) return;
    const content = getCollectionContent(selectedCollection);
    const position = content.folders.length + content.documents.length;
    const doc = await createFlashcardDocument(
      [],
      selectedCollection,
      null,
      position,
      "Untitled Flashcards",
    );
    // Mark checklist step: create-flashcards
    window.dispatchEvent(
      new CustomEvent("medly:checklist-step", { detail: { stepId: "create-flashcards" } })
    );
    router.push(`/open/doc/${doc.id}`);
    closeNewDropdown();
  }, [
    selectedCollection,
    getCollectionContent,
    createFlashcardDocument,
    router,
    closeNewDropdown,
  ]);

  const handleNewAddPage = useCallback(async () => {
    if (!selectedCollection) return;
    const content = getCollectionContent(selectedCollection);
    const position = content.folders.length + content.documents.length;
    const doc = await createNotesDocument(
      selectedCollection,
      null,
      position,
      "",
    );
    router.push(`/open/doc/${doc.id}`);
    closeNewDropdown();
  }, [
    selectedCollection,
    getCollectionContent,
    createNotesDocument,
    router,
    closeNewDropdown,
  ]);

  const handleOpenCreateFolder = useCallback(() => {
    closeOrganizeDropdown();
    if (organizeButtonRef.current) {
      const rect = organizeButtonRef.current.getBoundingClientRect();
      setCreatePanelPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setCreatingType("folder");
    setTimeout(() => setIsCreatePanelAnimated(true), 10);
  }, [closeOrganizeDropdown]);

  const handleOpenCreateAssignment = useCallback(() => {
    closeOrganizeDropdown();
    if (organizeButtonRef.current) {
      const rect = organizeButtonRef.current.getBoundingClientRect();
      setCreatePanelPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setCreatingType("assignment");
    setTimeout(() => setIsCreatePanelAnimated(true), 10);
  }, [closeOrganizeDropdown]);

  const handleCreateFolder = useCallback(
    async (values: { name: string }) => {
      if (!selectedCollection) return;
      try {
        await addFolder(selectedCollection, values.name);
        closeCreatePanel();
      } catch (error) {
        console.error("Failed to create folder:", error);
        closeCreatePanel();
      }
    },
    [selectedCollection, addFolder, closeCreatePanel],
  );

  const handleCreateAssignment = useCallback(
    async (values: { name: string; deadline?: string; weighting?: number }) => {
      if (!selectedCollection) return;
      try {
        await addFolder(
          selectedCollection,
          values.name,
          "assignment",
          undefined,
          values.deadline,
          values.weighting,
        );
        closeCreatePanel();
      } catch (error) {
        console.error("Failed to create assignment:", error);
        closeCreatePanel();
      }
    },
    [selectedCollection, addFolder, closeCreatePanel],
  );

  // Handle AI reorganization of collection with diff-based animations
  const handleReorganizeCollection = useCallback(async () => {
    if (!selectedCollection) return;

    const collection = collections.find((c) => c.id === selectedCollection);
    if (!collection) return;

    console.log(
      "[Reorganize] Starting reorganization for collection:",
      collection.name,
    );

    // Start AI task for global loading indicator
    let aiTaskId: string | null = null;
    if (aiTask) {
      aiTaskId = aiTask.startTask({
        label: "Organizing files",
        // No undo for reorganization currently
      });
    }

    try {
      // Get current folder structure
      const collectionContent = getCollectionContent(selectedCollection);
      console.log("[Reorganize] Current structure:", {
        folders: collectionContent.folders.length,
        documents: collectionContent.documents.length,
      });

      // Phase 1: Show shimmer effect during API call
      setIsReorganizing(true);
      setShowShimmer(true);

      // Call reorganization API
      console.log("[Reorganize] Calling API...");
      const response = await fetch(
        "/api/open/documents/reorganize-collection",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collectionId: selectedCollection,
            collectionName: collection.name,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to reorganize collection");
      }

      const data = await response.json();
      const { operations } = data.reorganization;
      console.log("[Reorganize] AI suggested operations:", {
        foldersToCreate: operations.foldersToCreate,
        documentsToMove: operations.documentsToMove.length,
        foldersToDelete: operations.foldersToDelete,
      });

      // Filter out no-op moves (docs already in the target folder/root)
      const effectiveMoves = operations.documentsToMove.filter((move: any) => {
        const doc = collectionContent.documents.find(
          (d) => d.id === move.documentId,
        );
        if (!doc) return false;

        const currentFolderId = doc.folderId ?? null;
        const targetFolderId = move.targetFolderId ?? null;

        if (targetFolderId === null) {
          return currentFolderId !== null;
        }

        if (
          typeof targetFolderId === "string" &&
          targetFolderId.startsWith("new_")
        ) {
          return true;
        }

        return targetFolderId !== currentFolderId;
      });

      // Phase 2: Calculate diff
      const movingDocIds = new Set<string>();
      const deletingFolderIds = new Set<string>(operations.foldersToDelete);
      const stayingItemIds = new Set<string>();

      // Identify moving documents
      effectiveMoves.forEach((move: any) => {
        movingDocIds.add(move.documentId);
      });

      // Identify staying items (not moving or deleting)
      collectionContent.folders.forEach((f) => {
        if (!deletingFolderIds.has(f.id)) {
          stayingItemIds.add(f.id);
        }
      });
      collectionContent.documents.forEach((d) => {
        if (!movingDocIds.has(d.id)) {
          stayingItemIds.add(d.id);
        }
      });

      setReorganizationDiff({
        movingDocIds,
        deletingFolderIds,
        creatingFolders: operations.foldersToCreate,
        stayingItemIds,
      });

      // Remove shimmer after API response
      setShowShimmer(false);

      // Wait a moment for shimmer to fade
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Phase 3: Fade out affected items only
      setExitingIds(movingDocIds);
      setExitingFolderIds(deletingFolderIds);

      // Wait for fade-out animations
      await new Promise((resolve) => setTimeout(resolve, EXIT_MS + 100));

      // Keep moved docs hidden between exit and enter to avoid re-running exit animation
      setHiddenIds(new Set(movingDocIds));
      setExitingIds(new Set());

      // Phase 4: Apply structural changes (create folders, move docs, delete folders)
      const createdFolderIds: string[] = [];
      const newFolderIdMap = new Map<string, string>();

      // Create new folders (but don't show them yet)
      for (const folderName of operations.foldersToCreate) {
        console.log("[Reorganize] Creating folder:", folderName);
        const newFolder = await addFolder(selectedCollection, folderName);
        if (newFolder?.id) {
          createdFolderIds.push(newFolder.id);
          newFolderIdMap.set(`new_${folderName}`, newFolder.id);
          console.log("[Reorganize] Mapped new folder:", {
            name: folderName,
            tempId: `new_${folderName}`,
            id: newFolder.id,
          });
          // Don't add to entering set yet - we'll do staggered animation
        }
      }

      // Move documents (but don't show them yet)
      for (const move of effectiveMoves) {
        const { documentId, targetFolderId } = move;
        const doc = documents.find((d) => d.id === documentId);
        if (!doc) continue;

        // Resolve folder ID if needed
        let actualFolderId = targetFolderId;
        if (targetFolderId && targetFolderId.startsWith("new_")) {
          const mappedId = newFolderIdMap.get(targetFolderId);
          if (mappedId) {
            actualFolderId = mappedId;
          } else {
            const folderName = targetFolderId.replace("new_", "");
            const updatedContent = getCollectionContent(selectedCollection);
            const folder = updatedContent.folders.find(
              (f) => f.name.toLowerCase() === folderName.toLowerCase(),
            );
            if (folder) {
              actualFolderId = folder.id;
            } else {
              console.warn("[Reorganize] Could not resolve new folder ID:", {
                documentId,
                targetFolderId,
              });
            }
          }
        }

        console.log(
          "[Reorganize] Moving document:",
          doc.name,
          "to folder:",
          actualFolderId || "root",
        );

        // Calculate target position
        let targetPosition = 0;
        if (actualFolderId) {
          const folderDocs = getFolderDocuments(actualFolderId);
          targetPosition = folderDocs.length;
        } else {
          const rootContent = getCollectionContent(selectedCollection);
          targetPosition = rootContent.documents.filter(
            (d) => !d.folderId,
          ).length;
        }

        // Move document
        await moveDocument(
          documentId,
          selectedCollection,
          actualFolderId,
          targetPosition,
        );
      }

      // Delete empty folders
      for (const folderId of operations.foldersToDelete) {
        const folderToDelete = folders.find((f) => f.id === folderId);
        console.log(
          "[Reorganize] Deleting folder:",
          folderToDelete?.name || folderId,
        );
        await deleteFolder(folderId);
      }

      // Keep deleted folders hidden (they're gone now)
      // But keep moved documents hidden until they're ready to fade in
      setExitingFolderIds(new Set()); // Clear deleted folders (they're removed from DOM)
      // Keep exitingIds for moved docs - we'll remove them as they fade in

      // Wait for DOM to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Phase 5: Staggered fade-in of new/moved items
      let animationIndex = 0;
      const STAGGER_DELAY = 100;

      // Fade in new folders with stagger
      for (const folderId of createdFolderIds) {
        setTimeout(() => {
          setEnteringFolderIds((prev) => new Set(prev).add(folderId));
        }, animationIndex * STAGGER_DELAY);
        animationIndex++;
      }

      // Fade in moved documents with stagger (and remove from exiting as they enter)
      for (const move of effectiveMoves) {
        const docId = move.documentId;
        setTimeout(() => {
          // Reveal from hidden state just before adding to entering set
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.delete(docId);
            return next;
          });
          setEnteringIds((prev) => new Set(prev).add(docId));
        }, animationIndex * STAGGER_DELAY);
        animationIndex++;
      }

      // Wait for all animations to complete
      await new Promise((resolve) =>
        setTimeout(resolve, animationIndex * STAGGER_DELAY + ENTER_TOTAL_MS),
      );

      // Track reorganization event
      track("collection_reorganized", {
        collection_id: selectedCollection,
        folders_created: operations.foldersToCreate.length,
        documents_moved: effectiveMoves.length,
        folders_deleted: operations.foldersToDelete.length,
      });

      console.log("[Reorganize] ✅ Collection reorganized successfully!");

      // Complete AI task
      if (aiTask && aiTaskId) {
        aiTask.completeTask(aiTaskId);
      }

      // Clear all animation state
      setIsReorganizing(false);
      setReorganizationDiff(null);
      setEnteringFolderIds(new Set());
      setEnteringIds(new Set());
      setHiddenIds(new Set());
    } catch (error) {
      console.error("[Reorganize] ❌ Failed to reorganize collection:", error);

      // Fail AI task
      if (aiTask && aiTaskId) {
        const errorMessage = error instanceof Error ? error.message : "Failed to reorganize";
        aiTask.failTask(aiTaskId, errorMessage);
      }

      // Clear all animation state on error
      setIsReorganizing(false);
      setShowShimmer(false);
      setReorganizationDiff(null);
      setExitingFolderIds(new Set());
      setExitingIds(new Set());
      setEnteringFolderIds(new Set());
      setEnteringIds(new Set());
      setHiddenIds(new Set());

      toast.error("Failed to reorganize collection. Please try again.");
    }
  }, [
    selectedCollection,
    collections,
    getCollectionContent,
    documents,
    folders,
    getFolderDocuments,
    moveDocument,
    addFolder,
    deleteFolder,
    track,
    EXIT_MS,
    ENTER_TOTAL_MS,
    aiTask,
  ]);

  // Handle PDF drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setIsExternalFileDragGlobal(false);

      const files = Array.from(e.dataTransfer.files);
      const supportedFiles = files.filter((f) => isSupportedFormat(f.name));

      if (supportedFiles.length === 0) {
        toast.error(getSupportedFormatsMessage());
        return;
      }

      const oversizedFiles = supportedFiles.filter(
        (f) => f.size > MAX_FILE_SIZE,
      );
      if (oversizedFiles.length > 0) {
        toast.error("File too large. Maximum size is 50MB.");
        return;
      }

      // Scroll to bottom to show upload progress
      setTimeout(() => {
        dragHook.containerRef.current?.scrollTo({
          top: dragHook.containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);

      // Upload all files in parallel - AI will auto-organize each
      const uploadPromises = supportedFiles.map(async (file) => {
        try {
          const uploadedDoc = await uploadAndTrigger(
            file,
            selectedCollection,
            undefined,
            "drag_drop",
          );
          if (!uploadedDoc?.id) {
            return;
          }

          // Request AI organization (will show suggestion badge if applicable)
          if (selectedCollection) {
            await requestAutoOrganize(uploadedDoc, selectedCollection);
          }
        } catch (err) {
          console.error("Failed to upload PDF:", err);
          toast.error("Upload failed. Please try again.");
        }
      });

      await Promise.all(uploadPromises);
    },
    [
      uploadAndTrigger,
      selectedCollection,
      requestAutoOrganize,
      setDocumentLoading,
      setIsExternalFileDragGlobal,
      dragHook.containerRef,
    ],
  );

  // Handle file selection from input
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const supportedFiles = files.filter((f) => isSupportedFormat(f.name));

      if (supportedFiles.length === 0) {
        if (files.length > 0) {
          toast.error(getSupportedFormatsMessage());
        }
        return;
      }

      const oversizedFiles = supportedFiles.filter(
        (f) => f.size > MAX_FILE_SIZE,
      );
      if (oversizedFiles.length > 0) {
        toast.error("File too large. Maximum size is 50MB.");
        return;
      }

      // Check if we're uploading into a placeholder (single file only)
      if (pendingPlaceholderId) {
        // Upload into placeholder - only use first file
        uploadIntoPlaceholderAndTrigger(pendingPlaceholderId, supportedFiles[0])
          .catch((error) => {
            console.error("Upload into placeholder failed:", error);
            toast.error("Upload failed. Please try again.");
          })
          .finally(() => {
            setPendingPlaceholderId(null);
          });
      } else {
        // Normal upload - upload all files in parallel
        // AI will auto-organize since this is generic drop zone
        const uploadPromises = supportedFiles.map(async (file) => {
          try {
            const uploadedDoc = await uploadAndTrigger(
              file,
              selectedCollection,
            );
            if (uploadedDoc?.id) {
              // Request AI organization (will show suggestion badge if applicable)
              if (selectedCollection) {
                console.log(
                  "[Sidebar] File select - requesting AI organization for:",
                  uploadedDoc.name,
                );
                await requestAutoOrganize(uploadedDoc, selectedCollection);
              }
            }
          } catch (err) {
            console.error("Failed to upload PDF:", err);
            toast.error("Upload failed. Please try again.");
          }
        });

        await Promise.all(uploadPromises);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [
      uploadAndTrigger,
      uploadIntoPlaceholderAndTrigger,
      selectedCollection,
      pendingPlaceholderId,
      requestAutoOrganize,
      setDocumentLoading,
    ],
  );

  // Handle click on drag container to open file picker
  const handleContainerClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Update mock panel state based on route
  useEffect(() => {
    setIsMockPanelOpen(isMockView);
    // Clear selected subject when mock panel opens via route navigation
    if (isMockView) {
    }
  }, [isMockView]);

  // Removed dynamic right panel measurement; width is fixed on desktop

  // Theme for the currently selected collection (used for styling)
  const selectedTheme = useMemo(() => {
    const collection = collections.find((c) => c.id === selectedCollection);
    return {
      primaryColor: collection?.primaryColor || "#41C3FF",
    };
  }, [collections, selectedCollection]);

  // Get selected collection's initialFlowType for conditional UI
  const selectedCollectionFlowType = useMemo(() => {
    const collection = collections.find((c) => c.id === selectedCollection);
    return collection?.initialFlowType;
  }, [collections, selectedCollection]);

  // Width logic: user can resize freely (saved width, clamped 64-240px)
  const effectiveLeftSidebarWidth = leftSidebarWidth !== null
    ? Math.max(64, Math.min(240, leftSidebarWidth))
    : 64;

  const leftWidthForRender = isBelowSm
    ? isHomePage ? 360 : 64
    : effectiveLeftSidebarWidth;

  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);
  const leftWidthRef = useRef<number>(leftSidebarWidth);

  // Keep a ref of leftSidebarWidth to avoid re-running resize effect on every width change
  useEffect(() => {
    leftWidthRef.current = leftSidebarWidth;
  }, [leftSidebarWidth]);

  // Load saved width from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebarLeftWidth");
    if (savedWidth) {
      setLeftSidebarWidth(Number(savedWidth));
    }
  }, [setLeftSidebarWidth]);

  // Clear suppression BEFORE syncing selection from the URL when the route's subject changes
  // This ensures that on first render after navigation (e.g., from home → lesson/practice),
  // the auto-sync effect below is allowed to set the selected subject immediately.
  useEffect(() => {
    suppressUrlSyncRef.current = false;
  }, [subjectId]);

  // Removed auto-resize based on mocks banner to allow truncation instead

  // Handle drag events for middle resize handle (icon panel)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (sidebarState !== "open" || isBelowSm) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartWidth.current = leftSidebarWidth ?? 64;
    },
    [sidebarState, leftSidebarWidth, isBelowSm],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX.current;
      // Icon panel: min 64px (icons-only), max 240px (icons+text with truncation)
      const newWidth = Math.min(
        240,
        Math.max(64, dragStartWidth.current + deltaX),
      );
      setLeftSidebarWidth(newWidth);
    },
    [isDragging, setLeftSidebarWidth],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    // Save to localStorage
    if (leftSidebarWidth !== null) {
      localStorage.setItem("sidebarLeftWidth", leftSidebarWidth.toString());
    }
  }, [isDragging, leftSidebarWidth]);

  // Add global mouse event listeners for dragging (icon panel)
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Docs panel resize state and handlers
  const [isDraggingDocsPanel, setIsDraggingDocsPanel] = useState(false);
  const docsStartX = useRef<number>(0);
  const docsStartWidth = useRef<number>(0);

  const handleDocsPanelMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (sidebarState !== "open" || isBelowSm) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingDocsPanel(true);
      docsStartX.current = e.clientX;
      docsStartWidth.current = docsPanelWidth ?? 320;
    },
    [sidebarState, docsPanelWidth, isBelowSm],
  );

  const handleDocsPanelMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingDocsPanel) return;

      const deltaX = e.clientX - docsStartX.current;
      // Docs panel: min 280px, max 400px
      const newWidth = Math.min(
        400,
        Math.max(280, docsStartWidth.current + deltaX),
      );
      setDocsPanelWidth(newWidth);
    },
    [isDraggingDocsPanel, setDocsPanelWidth],
  );

  const handleDocsPanelMouseUp = useCallback(() => {
    if (!isDraggingDocsPanel) return;
    setIsDraggingDocsPanel(false);
    // Save to localStorage
    if (docsPanelWidth !== null) {
      localStorage.setItem("docsPanelWidth", docsPanelWidth.toString());
    }
  }, [isDraggingDocsPanel, docsPanelWidth]);

  // Add global mouse event listeners for docs panel dragging
  useEffect(() => {
    if (isDraggingDocsPanel) {
      document.addEventListener("mousemove", handleDocsPanelMouseMove);
      document.addEventListener("mouseup", handleDocsPanelMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";

      return () => {
        document.removeEventListener("mousemove", handleDocsPanelMouseMove);
        document.removeEventListener("mouseup", handleDocsPanelMouseUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
    }
  }, [isDraggingDocsPanel, handleDocsPanelMouseMove, handleDocsPanelMouseUp]);

  // Close mobile account menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        mobileAvatarBtnRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !mobileAvatarBtnRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  // Focus search input when opening the overlay
  useEffect(() => {
    if (isSearchOpen) {
      // Delay to ensure visibility before focusing
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isSearchOpen]);

  // Function to measure and update heights/positions
  const measureHeights = useCallback(() => {
    if (documentOrder.length === 0 || dragHook.isDragging) return;

    const newHeights: Record<string, number> = {};

    documentOrder.forEach((itemId) => {
      const element = dragHook.itemRefs.current.get(itemId);
      if (element) {
        const height = element.offsetHeight;
        newHeights[itemId] = height;
      } else {
        // Fallback to last-known height (or a sensible default) so newly-added/moved
        // items don't start at position 0 and "float down" once measured.
        newHeights[itemId] = dragHook.itemHeights[itemId] ?? 48;
      }
    });

    dragHook.setItemHeights(newHeights);
    const newPositions = dragHook.calculatePositions(documentOrder, newHeights);
    dragHook.setItemPositions(newPositions);
  }, [documentOrder, dragHook]);

  // Scroll to top when sidebar mode changes
  useEffect(() => {
    dragHook.containerRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarMode]);

  // Compute mixed-order insert index from mouse Y within the container
  const computeExternalInsertIndex = useCallback(
    (clientY: number) => {
      if (!dragHook.containerRef.current || documentOrder.length === 0)
        return null;
      // If we don't have measured heights yet, bail
      if (Object.keys(dragHook.itemHeights).length === 0) return null;

      const containerRect =
        dragHook.containerRef.current.getBoundingClientRect();
      // scroll container: convert viewport Y to content Y
      const relativeY =
        clientY -
        containerRect.top +
        (dragHook.containerRef.current.scrollTop ?? 0);

      let currentY = 0;
      for (let i = 0; i < documentOrder.length; i++) {
        const itemId = documentOrder[i];
        const height = dragHook.itemHeights[itemId] || 48;
        const itemEnd = currentY + height + dragHook.GAP;
        if (relativeY < currentY + height / 2) {
          return i;
        } else if (relativeY < itemEnd) {
          return Math.min(i + 1, documentOrder.length);
        }
        currentY = itemEnd;
      }
      return documentOrder.length;
    },
    [dragHook.containerRef, dragHook.itemHeights, dragHook.GAP, documentOrder],
  );

  // Detect external file drag targets (folder hover or root insert index)
  const handleContainerDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (dragHook.isDragging) return;
      if (Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
        e.stopPropagation();
        setIsExternalFileDragging(true);
      }
    },
    [dragHook.isDragging],
  );

  const handleContainerDragOver = useCallback(
    (e: React.DragEvent) => {
      if (dragHook.isDragging) return;
      if (!Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
      e.stopPropagation();

      const clientX = e.clientX;
      const clientY = e.clientY;

      // Check if hovering over a placeholder document first (for single-file drops)
      let hoveredPlaceholderId: string | null = null;
      const allDocs = [
        ...collectionContent.documents,
        ...collectionContent.folders.flatMap((f) => getFolderDocuments(f.id)),
      ];
      for (const doc of allDocs) {
        if (!doc.isPlaceholder) continue;
        const el = dragHook.itemRefs.current.get(doc.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const inside =
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom;
          if (inside) {
            hoveredPlaceholderId = doc.id;
            break;
          }
        }
      }

      if (hoveredPlaceholderId) {
        setExternalHoverPlaceholderId(hoveredPlaceholderId);
        setExternalHoverFolderId(null);
        setExternalFolderInsertIndex(null);
        setExternalInsertIndex(null);
        return;
      }
      setExternalHoverPlaceholderId(null);

      // Check folder hover
      let hoveredFolderId: string | null = null;
      collectionContent.folders.forEach((folder) => {
        const el = dragHook.itemRefs.current.get(folder.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const padding = 20;
          const inside =
            clientX >= rect.left - padding &&
            clientX <= rect.right + padding &&
            clientY >= rect.top - padding &&
            clientY <= rect.bottom + padding;
          if (inside) hoveredFolderId = folder.id;
        }
      });

      if (hoveredFolderId) {
        setExternalHoverFolderId(hoveredFolderId);
        // Compute insertion index inside the folder if expanded; append to end if collapsed
        const isExpanded = getFolderExpanded(hoveredFolderId);
        const folderDocs = getFolderDocuments(hoveredFolderId);
        let insertIdx = folderDocs.length;

        if (isExpanded && folderDocs.length > 0) {
          let found = false;
          for (let i = 0; i < folderDocs.length; i++) {
            const docId = folderDocs[i].id;
            const el = dragHook.itemRefs.current.get(docId);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (clientY < mid) {
              insertIdx = i;
              found = true;
              break;
            }
          }
          if (!found) {
            insertIdx = folderDocs.length;
          }
        } else if (!isExpanded) {
          // Collapsed: default to end of folder
          insertIdx = folderDocs.length;
        } else {
          // Expanded but empty: index 0
          insertIdx = 0;
        }

        setExternalFolderInsertIndex(insertIdx);
        setExternalInsertIndex(null);
        return;
      }

      // Otherwise compute root insert index
      setExternalHoverFolderId(null);
      setExternalFolderInsertIndex(null);
      const idx = computeExternalInsertIndex(clientY);
      setExternalInsertIndex(idx);
    },
    [
      dragHook.isDragging,
      dragHook.itemRefs,
      collectionContent.folders,
      collectionContent.documents,
      computeExternalInsertIndex,
      getFolderExpanded,
      getFolderDocuments,
    ],
  );

  const handleContainerDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (dragHook.isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      // Only clear when leaving the container entirely
      if (dragHook.containerRef.current) {
        const rect = dragHook.containerRef.current.getBoundingClientRect();
        const { clientX, clientY } = e;
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          setIsExternalFileDragging(false);
          setExternalHoverFolderId(null);
          setExternalHoverPlaceholderId(null);
          setExternalInsertIndex(null);
          setExternalFolderInsertIndex(null);
        }
      } else {
        setIsExternalFileDragging(false);
        setExternalHoverFolderId(null);
        setExternalHoverPlaceholderId(null);
        setExternalInsertIndex(null);
        setExternalFolderInsertIndex(null);
      }
    },
    [dragHook.isDragging, dragHook.containerRef],
  );

  const handleContainerDrop = useCallback(
    async (e: React.DragEvent) => {
      if (dragHook.isDragging) return;
      if (!Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files);
      const supportedFiles = files.filter((f) => isSupportedFormat(f.name));
      if (supportedFiles.length === 0) {
        toast.error(getSupportedFormatsMessage());
        setIsExternalFileDragging(false);
        setIsExternalFileDragGlobal(false);
        setExternalHoverFolderId(null);
        setExternalHoverPlaceholderId(null);
        setExternalInsertIndex(null);
        return;
      }

      const oversizedFiles = supportedFiles.filter(
        (f) => f.size > MAX_FILE_SIZE,
      );
      if (oversizedFiles.length > 0) {
        toast.error("File too large. Maximum size is 50MB.");
        setIsExternalFileDragging(false);
        setIsExternalFileDragGlobal(false);
        setExternalHoverFolderId(null);
        setExternalHoverPlaceholderId(null);
        setExternalInsertIndex(null);
        return;
      }

      // Upload documents - stay on sidebar (no navigation)
      try {
        // Single file dropped onto placeholder - upload into placeholder
        if (externalHoverPlaceholderId && supportedFiles.length === 1) {
          await uploadIntoPlaceholderAndTrigger(
            externalHoverPlaceholderId,
            supportedFiles[0],
          );
        } else if (externalHoverFolderId && selectedCollection) {
          // Targeted drop into folder - upload all files in parallel
          const folderDocs = getFolderDocuments(externalHoverFolderId);
          const baseInsertIdx = Math.max(
            0,
            Math.min(
              externalFolderInsertIndex ?? folderDocs.length,
              folderDocs.length,
            ),
          );

          const uploadPromises = supportedFiles.map(async (file, idx) => {
            const insertIdx = baseInsertIdx + idx;
            const uploadedDoc = await uploadAndTrigger(
              file,
              selectedCollection,
              {
                collectionId: selectedCollection,
                folderId: externalHoverFolderId,
                position: insertIdx,
              },
              "drag_drop",
            );
            // AI: Compare with user's choice, show badge if AI disagrees
            await requestSuggestionForTargetedDrop(
              uploadedDoc.id,
              selectedCollection,
              externalHoverFolderId,
            );
            return uploadedDoc;
          });

          const uploadedDocs = await Promise.all(uploadPromises);

          // Reorder docs inside folder to include all new docs at their positions
          const newFolderOrder = [...folderDocs.map((d) => d.id)];
          uploadedDocs.forEach((doc, idx) => {
            newFolderOrder.splice(baseInsertIdx + idx, 0, doc.id);
          });
          reorderDocuments(externalHoverFolderId, newFolderOrder, true);
        } else if (selectedCollection) {
          // Generic drop zone - root insertion at mixed index, upload all files in parallel
          const baseTargetIndex =
            typeof externalInsertIndex === "number"
              ? Math.max(0, Math.min(externalInsertIndex, documentOrder.length))
              : documentOrder.length;

          const uploadPromises = supportedFiles.map(async (file, idx) => {
            const targetIndex = baseTargetIndex + idx;
            const uploadedDoc = await uploadAndTrigger(
              file,
              selectedCollection,
              {
                collectionId: selectedCollection,
                folderId: null,
                position: targetIndex,
              },
              "drag_drop",
            );

            // AI: Auto-organize (will show suggestion badge if applicable)
            console.log(
              "[Sidebar] Container drop - requesting AI organization for:",
              uploadedDoc.name,
            );
            await requestAutoOrganize(uploadedDoc, selectedCollection);
            return uploadedDoc;
          });

          const uploadedDocs = await Promise.all(uploadPromises);

          // Update mixed order to place all new docs at their intended positions
          const newOrder = [...documentOrder];
          uploadedDocs.forEach((doc, idx) => {
            newOrder.splice(baseTargetIndex + idx, 0, doc.id);
          });
          updateMixedOrder(selectedCollection, newOrder);
        } else {
          // No collection context; fall back to default behavior, upload all in parallel
          const uploadPromises = supportedFiles.map(async (file) => {
            await uploadAndTrigger(file, selectedCollection);
          });
          await Promise.all(uploadPromises);
        }
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error("Upload failed. Please try again.");
      } finally {
        setIsExternalFileDragging(false);
        setIsExternalFileDragGlobal(false);
        setExternalHoverFolderId(null);
        setExternalHoverPlaceholderId(null);
        setExternalInsertIndex(null);
        setExternalFolderInsertIndex(null);
        // Remeasure after state updates
        setTimeout(measureHeights, 50);
      }
    },
    [
      dragHook.isDragging,
      selectedCollection,
      externalHoverFolderId,
      externalHoverPlaceholderId,
      externalInsertIndex,
      externalFolderInsertIndex,
      documentOrder,
      uploadAndTrigger,
      uploadIntoPlaceholderAndTrigger,
      updateMixedOrder,
      getFolderDocuments,
      reorderDocuments,
      measureHeights,
      requestSuggestionForTargetedDrop,
      requestAutoOrganize,
      setDocumentLoading,
      setIsExternalFileDragGlobal,
    ],
  );

  // Wrapper to toggle folder expansion and recalculate heights
  const handleSetFolderExpanded = useCallback(
    (folderId: string, expanded: boolean) => {
      setFolderExpanded(folderId, expanded);
      // Recalculate positions after DOM updates
      setTimeout(measureHeights, 50);
    },
    [setFolderExpanded, measureHeights],
  );


  // Initialize document positions and heights (only once on mount or when document structure changes)
  useLayoutEffect(() => {
    // Do a synchronous measurement pass before paint so items render directly
    // at their correct translateY positions (avoids the "float down" animation).
    const raf = requestAnimationFrame(() => {
      measureHeights();
    });
    return () => cancelAnimationFrame(raf);
    // Depend on the full order, not just length, so reorders/moves don't flash at y=0.
  }, [documentOrder, measureHeights]);

  // Global mouse/touch event listeners for dragging
  useEffect(() => {
    if (!dragHook.isDragging) return;

    // Prevent text selection during drag
    document.body.style.userSelect = "none";

    const checkHoverTargets = (clientX: number, clientY: number) => {
      // Only detect folder hover when dragging a document, not when dragging a folder
      if (dragHook.draggedItem?.type !== "document") {
        dragHook.setHoveredFolder(null);
        dragHook.setHoveredDocument(null);
        setInternalFolderInsertIndex(null);
        return;
      }

      // First: check if hovering over a root-level document (center region)
      let hoveredDocumentId: string | null = null;
      collectionContent.documents.forEach((doc) => {
        const element = dragHook.itemRefs.current.get(doc.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          const horizontalPadding = 16;
          const topBound = rect.top + rect.height * 0.25; // middle 50% vertical band
          const bottomBound = rect.bottom - rect.height * 0.25;

          const isInside =
            clientX >= rect.left - horizontalPadding &&
            clientX <= rect.right + horizontalPadding &&
            clientY >= topBound &&
            clientY <= bottomBound;

          if (isInside && doc.id !== dragHook.draggedItem?.id) {
            hoveredDocumentId = doc.id;
          }
        }
      });

      if (hoveredDocumentId) {
        dragHook.setHoveredDocument(hoveredDocumentId);
        dragHook.setHoveredFolder(null);
        return;
      }

      // Otherwise: check if dragging over any folder
      let hoveredFolderId: string | null = null;

      collectionContent.folders.forEach((folder) => {
        const element = dragHook.itemRefs.current.get(folder.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          const padding = 20;

          const isInside =
            clientX >= rect.left - padding &&
            clientX <= rect.right + padding &&
            clientY >= rect.top - padding &&
            clientY <= rect.bottom + padding;

          if (isInside) {
            hoveredFolderId = folder.id;
          }
        }
      });

      dragHook.setHoveredFolder(hoveredFolderId);
      dragHook.setHoveredDocument(null);

      // Calculate insertion index within folder for precise positioning
      // Use filtered list (excluding dragged item) so index matches rendering
      if (hoveredFolderId) {
        const isExpanded = getFolderExpanded(hoveredFolderId);
        const folderDocs = getFolderDocuments(hoveredFolderId);
        // Filter out the dragged item for calculation
        const docsForCalculation = folderDocs.filter(
          (d) => d.id !== dragHook.draggedItem?.id,
        );
        let insertIdx = docsForCalculation.length;

        if (isExpanded && docsForCalculation.length > 0) {
          for (let i = 0; i < docsForCalculation.length; i++) {
            const el = dragHook.itemRefs.current.get(docsForCalculation[i].id);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (clientY < mid) {
              insertIdx = i;
              break;
            }
          }
        } else if (isExpanded) {
          // Expanded but empty: index 0
          insertIdx = 0;
        }

        setInternalFolderInsertIndex(insertIdx);
      } else {
        setInternalFolderInsertIndex(null);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      dragHook.handleDragMove(e.clientX, e.clientY, documentOrder);
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      checkHoverTargets(e.clientX, e.clientY);
    };

    const handleDrop = async (
      newOrder: string[],
      fromIndex: number,
      toIndex: number,
      targetIndex: number,
    ) => {
      if (!selectedCollection || !dragHook.draggedItem) {
        return;
      }

      const draggedItem = dragHook.draggedItem;

      // Check if dropping onto a document (group into new folder)
      if (dragHook.hoveredDocument) {
        const targetDocId = dragHook.hoveredDocument;
        const targetDoc = documents.find((d) => d.id === targetDocId);
        if (!targetDoc) {
          return;
        }

        // Only allow grouping when target is a root-level document (no subfolders supported)
        if (targetDoc.folderId !== null) {
          // Target is nested; grouping into subfolders not supported
        } else {
          const insertIndex = Math.max(0, documentOrder.indexOf(targetDocId));
          try {
            const newFolder = await groupDocumentsIntoFolder(
              targetDocId,
              draggedItem.id,
              selectedCollection,
              insertIndex,
            );

            // Build new mixed order: replace target doc with new folder, remove dragged doc if it was in root
            const rootOrder = [...documentOrder];
            const targetIdx = rootOrder.indexOf(targetDocId);
            if (targetIdx !== -1) {
              rootOrder.splice(targetIdx, 1, newFolder.id);
            } else {
              rootOrder.splice(insertIndex, 0, newFolder.id);
            }
            const draggedRootIdx = rootOrder.indexOf(draggedItem.id);
            if (draggedRootIdx !== -1) {
              rootOrder.splice(draggedRootIdx, 1);
            }

            updateMixedOrder(selectedCollection, rootOrder);

            // Auto-open the new folder (handleSetFolderExpanded already calls measureHeights)
            handleSetFolderExpanded(newFolder.id, true);
          } catch (err) {
            console.error("Failed to group documents into folder:", err);
          }
          return;
        }
      }

      // Check if dropping into a folder
      if (dragHook.hoveredFolder) {
        // Get documents in target folder to determine position
        const folderDocs = getFolderDocuments(dragHook.hoveredFolder);
        // Use calculated insertion index, or append to end if not set
        const newPosition = internalFolderInsertIndex ?? folderDocs.length;

        moveDocument(
          draggedItem.id,
          selectedCollection,
          dragHook.hoveredFolder,
          newPosition,
        );

        // Reorder docs inside folder to reflect the insertion position
        const existingDocIds = folderDocs
          .filter((d) => d.id !== draggedItem.id)
          .map((d) => d.id);
        const newFolderOrder = [...existingDocIds];
        newFolderOrder.splice(newPosition, 0, draggedItem.id);
        reorderDocuments(dragHook.hoveredFolder, newFolderOrder, true);

        // If the document was previously in root, update the mixed order to remove it
        if (draggedItem.folderId === null) {
          // Remove the dragged document from the current mixed order
          const updatedMixedOrder = documentOrder.filter(
            (id) => id !== draggedItem.id,
          );
          updateMixedOrder(selectedCollection, updatedMixedOrder);
        }

        // Auto-open the target folder (handleSetFolderExpanded already calls measureHeights)
        handleSetFolderExpanded(dragHook.hoveredFolder, true);
        // Clear the insertion index
        setInternalFolderInsertIndex(null);

        // If we were dragging a folder, restore its expansion if it was open
        if (
          dragHook.draggedItem?.type === "folder" &&
          folderReopenOnDropRef.current?.shouldReopen
        ) {
          handleSetFolderExpanded(folderReopenOnDropRef.current.folderId, true);
          folderReopenOnDropRef.current = null;
        }
        return;
      }

      // Check if moving from folder to root or staying in root
      if (draggedItem.folderId !== null) {
        // Moving FROM folder TO root
        // Move document to root with targetIndex position
        moveDocument(draggedItem.id, selectedCollection, null, targetIndex);

        // Insert the document into the mixed order at the target position
        const updatedMixedOrder = [...documentOrder];
        updatedMixedOrder.splice(targetIndex, 0, draggedItem.id);
        updateMixedOrder(selectedCollection, updatedMixedOrder);

        // Remeasure after state updates
        setTimeout(() => {
          measureHeights();
        }, 50);
      } else {
        // Reordering within root - update the mixed order
        updateMixedOrder(selectedCollection, newOrder);
      }

      // If we were dragging a folder, restore its expansion if it was open
      if (
        dragHook.draggedItem?.type === "folder" &&
        folderReopenOnDropRef.current?.shouldReopen
      ) {
        handleSetFolderExpanded(folderReopenOnDropRef.current.folderId, true);
        folderReopenOnDropRef.current = null;
      }
    };

    const handleMouseUp = () => {
      // Check if drop is over the chat drop zone
      const chatDropZone = document.querySelector("[data-chat-drop-zone]");
      const pointer = lastPointerRef.current;

      if (chatDropZone && pointer && dragHook.draggedItem) {
        const rect = chatDropZone.getBoundingClientRect();
        const isOverChat =
          pointer.x >= rect.left &&
          pointer.x <= rect.right &&
          pointer.y >= rect.top &&
          pointer.y <= rect.bottom;

        if (isOverChat) {
          // Dispatch custom event to add context to chat
          const draggedItem = dragHook.draggedItem;

          if (draggedItem.type === "document") {
            const doc = documents.find((d) => d.id === draggedItem.id);
            if (doc) {
              window.dispatchEvent(
                new CustomEvent("medly:addChatContext", {
                  detail: {
                    id: doc.id,
                    name: doc.name,
                    type: "document",
                    documentType: doc.type,
                    documentIds: [doc.id],
                  },
                }),
              );
            }
          } else if (draggedItem.type === "folder") {
            const folder = folders.find((f) => f.id === draggedItem.id);
            const folderDocs = getFolderDocuments(draggedItem.id);
            if (folder) {
              window.dispatchEvent(
                new CustomEvent("medly:addChatContext", {
                  detail: {
                    id: folder.id,
                    name: folder.name,
                    type: "folder",
                    documentIds: folderDocs.map((d) => d.id),
                  },
                }),
              );
            }
          }

          // Cancel the normal drag operation
          dragHook.handleDragEnd(documentOrder, () => {});
          setInternalFolderInsertIndex(null);
          if (folderReopenOnDropRef.current?.shouldReopen) {
            handleSetFolderExpanded(folderReopenOnDropRef.current.folderId, true);
            folderReopenOnDropRef.current = null;
          }
          return;
        }
      }

      dragHook.handleDragEnd(documentOrder, handleDrop);
      // Clear folder insertion index
      setInternalFolderInsertIndex(null);
      // Ensure folder gets reopened even if no onDrop happened (no-op drag)
      if (folderReopenOnDropRef.current?.shouldReopen) {
        handleSetFolderExpanded(folderReopenOnDropRef.current.folderId, true);
        folderReopenOnDropRef.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent page scrolling during drag; we'll control the scroll programmatically
      e.preventDefault();
      if (e.touches[0]) {
        const touch = e.touches[0];
        dragHook.handleDragMove(touch.clientX, touch.clientY, documentOrder);
        lastPointerRef.current = { x: touch.clientX, y: touch.clientY };
        checkHoverTargets(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      // Check if drop is over the chat drop zone (same as mouse)
      const chatDropZone = document.querySelector("[data-chat-drop-zone]");
      const pointer = lastPointerRef.current;

      if (chatDropZone && pointer && dragHook.draggedItem) {
        const rect = chatDropZone.getBoundingClientRect();
        const isOverChat =
          pointer.x >= rect.left &&
          pointer.x <= rect.right &&
          pointer.y >= rect.top &&
          pointer.y <= rect.bottom;

        if (isOverChat) {
          const draggedItem = dragHook.draggedItem;

          if (draggedItem.type === "document") {
            const doc = documents.find((d) => d.id === draggedItem.id);
            if (doc) {
              window.dispatchEvent(
                new CustomEvent("medly:addChatContext", {
                  detail: {
                    id: doc.id,
                    name: doc.name,
                    type: "document",
                    documentType: doc.type,
                    documentIds: [doc.id],
                  },
                }),
              );
            }
          } else if (draggedItem.type === "folder") {
            const folder = folders.find((f) => f.id === draggedItem.id);
            const folderDocs = getFolderDocuments(draggedItem.id);
            if (folder) {
              window.dispatchEvent(
                new CustomEvent("medly:addChatContext", {
                  detail: {
                    id: folder.id,
                    name: folder.name,
                    type: "folder",
                    documentIds: folderDocs.map((d) => d.id),
                  },
                }),
              );
            }
          }

          dragHook.handleDragEnd(documentOrder, () => {});
          setInternalFolderInsertIndex(null);
          return;
        }
      }

      dragHook.handleDragEnd(documentOrder, handleDrop);
      // Clear folder insertion index
      setInternalFolderInsertIndex(null);
    };

    // Auto-scroll loop while dragging near top/bottom of the scroll container
    const startAutoScroll = () => {
      if (autoScrollRafRef.current !== null) return;
      const step = () => {
        if (!dragHook.isDragging) {
          if (autoScrollRafRef.current !== null) {
            cancelAnimationFrame(autoScrollRafRef.current);
            autoScrollRafRef.current = null;
          }
          return;
        }
        const pointer = lastPointerRef.current;
        const container = dragHook.containerRef.current;
        if (pointer && container) {
          const rect = container.getBoundingClientRect();
          const threshold = 60; // px from top/bottom
          const maxSpeedPerFrame = 12; // px per frame (slowed by half)
          let deltaY = 0;
          if (pointer.y < rect.top + threshold) {
            const distance = Math.max(0, rect.top + threshold - pointer.y);
            const closeness = Math.min(1, distance / threshold);
            deltaY = -Math.ceil(closeness * maxSpeedPerFrame);
          } else if (pointer.y > rect.bottom - threshold) {
            const distance = Math.max(0, pointer.y - (rect.bottom - threshold));
            const closeness = Math.min(1, distance / threshold);
            deltaY = Math.ceil(closeness * maxSpeedPerFrame);
          }
          if (deltaY !== 0) {
            const maxScroll = container.scrollHeight - container.clientHeight;
            const next = Math.min(
              maxScroll,
              Math.max(0, container.scrollTop + deltaY),
            );
            if (next !== container.scrollTop) {
              container.scrollTop = next;
              // Re-run hover detection as geometry changed
              checkHoverTargets(pointer.x, pointer.y);
              // Keep drag model updated relative to new scroll offset
              dragHook.handleDragMove(pointer.x, pointer.y, documentOrder);
            }
          }
        }
        autoScrollRafRef.current = requestAnimationFrame(step);
      };
      autoScrollRafRef.current = requestAnimationFrame(step);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    // Keep drag model and preview aligned when user manually scrolls the container during drag
    const handleContainerScroll = () => {
      const pointer = lastPointerRef.current;
      if (!pointer) return;
      dragHook.handleDragMove(pointer.x, pointer.y, documentOrder);
      checkHoverTargets(pointer.x, pointer.y);
    };
    const containerEl = dragHook.containerRef.current;
    if (containerEl) {
      containerEl.addEventListener("scroll", handleContainerScroll, {
        passive: true,
      });
    }

    // Kick off auto-scroll loop while dragging
    startAutoScroll();

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      if (containerEl) {
        containerEl.removeEventListener("scroll", handleContainerScroll);
      }

      // Restore text selection
      document.body.style.userSelect = "";
      // Stop auto-scroll loop
      if (autoScrollRafRef.current !== null) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
    };
  }, [
    dragHook.isDragging,
    documentOrder,
    dragHook,
    collectionContent.folders,
    collectionContent.documents,
    documents,
    selectedCollection,
    updateMixedOrder,
    getFolderDocuments,
    moveDocument,
    setFolderExpanded,
    measureHeights,
  ]);

  // When closing the sidebar, reset state to match the current page
  const prevSidebarStateRef = useRef(sidebarState);
  useEffect(() => {
    const prev = prevSidebarStateRef.current;
    if (
      (prev === "open" || prev === "semi-open") &&
      sidebarState === "closed"
    ) {
      // Clear URL sync suppression to allow normal URL-based selection
      suppressUrlSyncRef.current = false;

      // Clear any pending grade selection when the sidebar is closed
      setSubjectNeedingGrades(null);

      // Reset state based on current page type (prioritize mock view over practice)
      if (isMockView) {
        // If on mock page, restore mock panel and clear selected subject
        setIsMockPanelOpen(true);
      } else {
        // Default case
        setIsMockPanelOpen(false);
      }
    }
    prevSidebarStateRef.current = sidebarState;
  }, [sidebarState, isMockView]);

  return (
    <>
      <div
        className={`bg-white/95 backdrop-blur-[16px] h-full overflow-visible rounded-none flex flex-col border-0 sm:border border-white relative z-[1106]
          ${
            sidebarState === "closed"
              ? `opacity-0 -translate-x-full pointer-events-none`
              : sidebarState === "semi-open"
                ? `opacity-100 scale-100 translate-x-0 pointer-events-auto shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]`
                : "opacity-100 scale-100 translate-x-0 mt-0 pointer-events-auto"
          }
          `}
        style={{
          borderRadius: sidebarState === "semi-open" ? "20px" : "0px",
          width: isBelowSm
            ? "100vw"
            : sidebarState === "open"
              ? "100%" // Fill container (controlled by layout)
              : "320px", // semi-open overlay
          transform: sidebarState === "closed" ? "scale(0.93)" : "scale(1)",
          transformOrigin: "top left",
          transition: shouldAnimate
            ? isDragging
              ? "transform 150ms ease-out, opacity 150ms ease-out"
              : "transform 150ms ease-out, opacity 150ms ease-out"
            : "none",
        }}
      >
        {isBelowSm && (
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-9" />
            <div className="font-rounded-heavy text-[22px]">medly</div>
            <div className="relative">
              <button
                ref={mobileAvatarBtnRef}
                className="w-9 h-9 rounded-full bg-[#DBDEEA] flex items-center justify-center"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
              >
                <span className="text-xl">{user?.avatar}</span>
              </button>
              {isMobileMenuOpen && (
                <div
                  ref={mobileMenuRef}
                  className="absolute top-full right-0 mt-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 min-w-64 z-[15000]"
                >
                  <div className="flex flex-col gap-0 p-2">
                    <div
                      className="cursor-pointer flex w-full px-4 py-3 justify-between items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg-[rgba(0,0,0,0.05)]"
                      onClick={() => {
                        window.open(
                          "https://medlyai.tawk.help/article/frequently-asked-questions",
                        );
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span>Provide feedback</span>
                      <EditIcon fill="rgba(0,0,0,0.8)" />
                    </div>
                    <button
                      className="cursor-pointer flex w-full px-4 py-3 justify-between items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg-[rgba(0,0,0,0.05)]"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsManageAccountOpen(true);
                      }}
                    >
                      <span>Manage account</span>
                      <svg
                        fill="none"
                        height="28"
                        viewBox="0 0 28 28"
                        width="28"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M14 13.8477C16.127 13.8477 17.8496 11.9668 17.8496 9.66406C17.8496 7.39648 16.127 5.59473 14 5.59473C11.8818 5.59473 10.1416 7.42285 10.1504 9.68164C10.1592 11.9756 11.873 13.8477 14 13.8477ZM14 12.3096C12.7871 12.3096 11.7588 11.1582 11.7588 9.68164C11.75 8.24023 12.7783 7.13281 14 7.13281C15.2305 7.13281 16.2412 8.22266 16.2412 9.66406C16.2412 11.1406 15.2217 12.3096 14 12.3096ZM8.51562 22.0215H19.4756C20.9961 22.0215 21.7256 21.5381 21.7256 20.501C21.7256 18.084 18.7109 14.8672 14 14.8672C9.28906 14.8672 6.26562 18.084 6.26562 20.501C6.26562 21.5381 6.99512 22.0215 8.51562 22.0215ZM8.24316 20.4834C8.03223 20.4834 7.95312 20.4131 7.95312 20.2549C7.95312 18.9102 10.124 16.4053 14 16.4053C17.8672 16.4053 20.0381 18.9102 20.0381 20.2549C20.0381 20.4131 19.959 20.4834 19.748 20.4834H8.24316Z"
                          fill="rgba(0,0,0,0.8)"
                        />
                      </svg>
                    </button>
                    <div
                      className="cursor-pointer flex w-full px-4 py-3 justify-between items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg...[TRUNCATED]"
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span>Log out</span>
                      <LogoutIcon fill="rgba(0,0,0,0.8)" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-row flex-1 min-h-0 overflow-visible">
          {/* Left side - hidden in semi-open state */}
          <div
            className={`flex flex-col h-full relative flex-shrink-0 ${
              sidebarState !== "open"
                ? "opacity-0 -translate-x-full w-0 overflow-visible "
                : "opacity-100 translate-x-0 overflow-visible z-10"
            }`}
            style={{
              width:
                sidebarState === "open"
                  ? isBelowSm
                      ? isHomePage
                        ? "100vw"
                        : `${leftWidthForRender}px`
                      : selectedCollection || isMockPanelOpen
                        ? `${effectiveLeftSidebarWidth}px`
                        : "100%"
                  : "0px",
            }}
          >
            <div className="pt-3.5 gap-2 flex flex-col flex-1 min-h-0">
              {/* Header */}
              <MOSidebarHeader
                leftSidebarWidth={
                  isBelowSm
                    ? leftWidthForRender
                    : effectiveLeftSidebarWidth
                }
                hideTitle={false}
              />

              {/* Modules Header */}
              {(isBelowSm ? leftWidthForRender : effectiveLeftSidebarWidth) >= 140 && (
                <div className="px-5">
                  <span className="font-rounded-bold text-[14px] text-[#595959]/50">
                    Modules
                  </span>
                </div>
              )}

              {/* Collections List - Scrollable */}
              <SidebarCollectionsList
                collections={collections}
                isLoading={isContentLoading}
                leftSidebarWidth={
                  isBelowSm
                    ? leftWidthForRender
                    : effectiveLeftSidebarWidth
                }
                selectedCollection={selectedCollection}
                onAddCollection={handleOpenAddModule}
                onCollectionSelect={(collection) => {
                  // If viewing a doc from a different collection, navigate away
                  if (activeDocumentId) {
                    const currentDoc = documents.find(
                      (d) => d.id === activeDocumentId,
                    );
                    if (
                      currentDoc &&
                      currentDoc.collectionId !== collection.id
                    ) {
                      router.push("/open");
                    }
                  }
                  setSelectedCollection(collection.id);
                }}
                onDeleteCollection={deleteCollection}
                onRenameCollection={renameCollection}
              />
            </div>

            {/* Draggable border between icon panel and docs panel */}
            {isMeasured && !isBelowSm && (selectedCollection || isMockPanelOpen) && (
              <div
                className={`absolute top-0 right-0 h-full w-[4px] cursor-ew-resize hover:bg-[#E5E5EA] active:bg-[#D1D1D6]`}
                style={{
                  borderRight: "1px solid #F2F2F7",
                  transition: isDragging
                    ? "none"
                    : "background-color 150ms ease-out",
                }}
                onMouseDown={handleMouseDown}
              />
            )}
          </div>

          {/* Right side - docs panel */}
          {(isBelowSm || selectedCollection || isMockPanelOpen) &&
            !(isHomePage && !selectedCollection && !isMockPanelOpen) && (
              <div
                className={`flex flex-col h-full min-h-0 pt-2 overflow-x-hidden relative z-20 ${
                  isBelowSm
                    ? "border-t border-l border-[#F2F2F7] rounded-tl-3xl flex-1"
                    : "flex-shrink-0"
                }`}
                style={{
                  width: isBelowSm
                    ? `calc(100vw - ${leftWidthForRender + 1}px)`
                    : sidebarState === "semi-open"
                      ? "100%"
                      : `${docsPanelWidth ?? 320}px`,
                  minWidth: isBelowSm || sidebarState === "semi-open" ? undefined : "280px",
                  maxWidth: isBelowSm || sidebarState === "semi-open" ? undefined : "400px",
                }}
              >
                {/* Right resize handle for docs panel */}
                {isMeasured && !isBelowSm && (
                  <div
                    className="absolute top-0 right-0 h-full w-[4px] cursor-ew-resize hover:bg-[#E5E5EA] active:bg-[#D1D1D6] z-30"
                    style={{
                      transition: isDraggingDocsPanel
                        ? "none"
                        : "background-color 150ms ease-out",
                    }}
                    onMouseDown={handleDocsPanelMouseDown}
                  />
                )}
                <div className="flex flex-col h-full min-h-0">
                  {!isBelowSm && (
                    <SidebarPanelHeader
                      isHomePage={isHomePage}
                      primaryColor={selectedTheme.primaryColor}
                      title={
                        selectedCollection
                          ? collections.find((c) => c.id === selectedCollection)
                              ?.name || "Collection"
                          : "Select a collection"
                      }
                      onCreate={handleContainerClick}
                    />
                  )}

                  <>
                    <div className="flex flex-col h-full min-h-0 overflow-hidden">
                      {/* New sidebar header - Docs | Organise | Create */}
                      <div 
                        className="flex h-[56px] px-4 justify-between items-center flex-shrink-0"
                      >
                        {/* Left side - Docs label */}
                        <span className="font-rounded-bold text-[15px] text-black">
                          Docs
                        </span>

                        {/* Right side - Add and Organize buttons */}
                        {(() => {
                          const showButtonLabels = (docsPanelWidth ?? 320) >= 300;
                          return (
                            <div className="flex flex-row items-center gap-1">
                              {/* Add button with dropdown - Option 1: max-width transition */}
                              {selectedCollection && (
                                <div className={`relative z-[102] ${showButtonLabels ? "" : "group"}`}>
                                  <button
                                    ref={newButtonRef}
                                    className="flex flex-row items-center hover:bg-[#F9F9FB] rounded-lg cursor-pointer text-[#1C1C1E] p-1.5 transition-all duration-200 ease-out"
                                    onClick={() => openNewDropdown(true)}
                                  >
                                    <svg
                                      className="transition-all duration-200 ease-out"
                                      width={showButtonLabels ? "16" : "20"}
                                      height={showButtonLabels ? "16" : "20"}
                                      viewBox="0 0 28 28"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M7.63672 14.6562H12.998V20.0176C12.998 20.5625 13.4463 21.0195 14 21.0195C14.5537 21.0195 15.002 20.5625 15.002 20.0176V14.6562H20.3633C20.9082 14.6562 21.3652 14.208 21.3652 13.6543C21.3652 13.1006 20.9082 12.6523 20.3633 12.6523H15.002V7.29102C15.002 6.74609 14.5537 6.28906 14 6.28906C13.4463 6.28906 12.998 6.74609 12.998 7.29102V12.6523H7.63672C7.0918 12.6523 6.63477 13.1006 6.63477 13.6543C6.63477 14.208 7.0918 14.6562 7.63672 14.6562Z"
                                        fill="currentColor"
                                      />
                                    </svg>
                                    <span 
                                      className={`font-rounded-bold text-[13px] overflow-hidden whitespace-nowrap transition-all duration-200 ease-out ${
                                        showButtonLabels 
                                          ? "max-w-[40px] opacity-100 ml-1.5" 
                                          : "max-w-0 opacity-0 ml-0"
                                      }`}
                                    >
                                      Add
                                    </span>
                                  </button>
                                  {!showButtonLabels && (
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-[#333333] rounded-[4px] opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-[1600] transition-opacity duration-150 delay-0 group-hover:delay-500">
                                      <span className="font-medium text-[12px] text-white">Add</span>
                                    </div>
                                  )}

                                  {/* Add dropdown */}
                              {isNewDropdownOpen &&
                                newDropdownPosition &&
                                createPortal(
                                  <>
                                    <div
                                      className="fixed inset-0 z-[10000]"
                                      onClick={closeNewDropdown}
                                    />
                                    <div
                                      className="fixed w-[200px] bg-white/95 backdrop-blur-[16px] rounded-[12px] shadow-[0_0_16px_rgba(0,0,0,0.16)] flex flex-col border border-white p-2 gap-1 z-[10001]"
                                      style={{
                                        transformOrigin: "top left",
                                        top: newDropdownPosition.top,
                                        left: newDropdownPosition.left,
                                      }}
                                    >
                                      {/* Upload */}
                                      <button
                                        onClick={() => {
                                          closeNewDropdown();
                                          fileInputRef.current?.click();
                                        }}
                                        className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 hover:bg-[#F9F9FB] text-left"
                                      >
                                        <svg
                                          width="24"
                                          height="24"
                                          viewBox="0 0 28 28"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M14 21.5381C14.5625 21.5381 14.958 21.1426 14.958 20.5625V12.3799L14.8701 10.5342L17.2168 13.1094L19.0273 14.8848C19.2031 15.0605 19.4492 15.1748 19.7217 15.1748C20.249 15.1748 20.6445 14.7793 20.6445 14.2344C20.6445 13.9795 20.5391 13.7422 20.3281 13.5312L14.7119 7.96777C14.5713 7.81836 14.3955 7.71289 14.2021 7.67773H19.792C20.3369 7.67773 20.7324 7.27344 20.7324 6.72852C20.7324 6.18359 20.3369 5.7793 19.792 5.7793H8.18164C7.64551 5.7793 7.25879 6.18359 7.25879 6.72852C7.25879 7.27344 7.64551 7.67773 8.18164 7.67773H13.7891C13.5957 7.71289 13.4199 7.81836 13.2793 7.96777L7.66309 13.5312C7.45215 13.7422 7.35547 13.9795 7.35547 14.2344C7.35547 14.7793 7.74219 15.1748 8.27832 15.1748C8.55078 15.1748 8.78809 15.0693 8.97266 14.8848L10.7744 13.1094L13.1211 10.5254L13.0332 12.3799V20.5625C13.0332 21.1426 13.4287 21.5381 14 21.5381Z"
                                            fill="#05B0FF"
                                          />
                                        </svg>
                                        Upload file
                                      </button>

                                      {/* Divider */}
                                      <div className="h-px bg-[#F2F2F7] my-1" />

                                      {/* Page */}
                                      <button
                                        onClick={handleNewAddPage}
                                        className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 hover:bg-[#F9F9FB] text-left"
                                      >
                                        <svg
                                          width="24"
                                          height="24"
                                          viewBox="0 0 28 28"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M6.44141 14.542C6.73145 14.498 7.0127 14.4717 7.31152 14.4717C7.60156 14.4717 7.8916 14.498 8.19043 14.5508V7.1416C8.19043 6.3418 8.6123 5.89355 9.46484 5.89355H13.1914V10.6748C13.1914 11.9492 13.8154 12.5645 15.0811 12.5645H19.792V20.1758C19.792 20.9844 19.3701 21.4238 18.5176 21.4238H12.9365C12.8311 22.0566 12.5938 22.6543 12.2686 23.1816H18.6758C20.5654 23.1816 21.541 22.1885 21.541 20.29V12.3096C21.541 11.0791 21.3828 10.5166 20.6182 9.73438L16.0215 5.06738C15.2744 4.31152 14.6592 4.13574 13.5518 4.13574H9.30664C7.42578 4.13574 6.44141 5.12891 6.44141 7.03613V14.542ZM14.7207 10.5078V6.12207L19.5547 11.0264H15.248C14.8789 11.0264 14.7207 10.8682 14.7207 10.5078ZM7.32031 24.7812C9.78125 24.7812 11.8467 22.7246 11.8467 20.2461C11.8467 17.7676 9.79883 15.7197 7.32031 15.7197C4.8418 15.7197 2.79395 17.7676 2.79395 20.2461C2.79395 22.7334 4.8418 24.7812 7.32031 24.7812ZM4.44629 20.2461C4.44629 19.8857 4.69238 19.6484 5.05273 19.6484H6.71387V17.9873C6.71387 17.627 6.95117 17.3809 7.32031 17.3809C7.68945 17.3809 7.92676 17.627 7.92676 17.9873V19.6484H9.58789C9.94824 19.6484 10.1855 19.8857 10.1855 20.2461C10.1855 20.6152 9.94824 20.8525 9.58789 20.8525H7.92676V22.5225C7.92676 22.8828 7.68945 23.1289 7.32031 23.1289C6.95117 23.1289 6.71387 22.8828 6.71387 22.5225V20.8525H5.05273C4.69238 20.8525 4.44629 20.6152 4.44629 20.2461Z"
                                            fill="#05B0FF"
                                          />
                                        </svg>
                                        Add page
                                      </button>

                                      {/* Flashcards */}
                                      <button
                                        onClick={handleNewCreateFlashcards}
                                        className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 hover:bg-[#F9F9FB] text-left"
                                      >
                                        <svg
                                          width="24"
                                          height="24"
                                          viewBox="0 0 28 28"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <g clipPath="url(#clip0_614_1247)">
                                            <path
                                              d="M5.78223 18.5938H7.33789V19.9209C7.33789 21.8018 8.32227 22.7686 10.2207 22.7686H22.2178C24.1162 22.7686 25.1006 21.793 25.1006 19.9209V11.5713C25.1006 9.69043 24.1162 8.71484 22.2178 8.71484H20.583V7.39648C20.583 5.51562 19.5898 4.54004 17.7002 4.54004H5.78223C3.88379 4.54004 2.89941 5.51562 2.89941 7.39648V15.7461C2.89941 17.6182 3.88379 18.5938 5.78223 18.5938ZM5.8877 16.8711C5.07031 16.8711 4.62207 16.4492 4.62207 15.5967V7.53711C4.62207 6.68457 5.07031 6.2627 5.8877 6.2627H17.5947C18.4033 6.2627 18.8604 6.68457 18.8604 7.53711V8.71484H10.2207C8.32227 8.71484 7.33789 9.69043 7.33789 11.5713V16.8711H5.8877ZM10.3262 21.0547C9.50879 21.0547 9.06055 20.624 9.06055 19.7715V11.7207C9.06055 10.8682 9.50879 10.4375 10.3262 10.4375H22.1123C22.9209 10.4375 23.3779 10.8682 23.3779 11.7207V19.7715C23.3779 20.624 22.9209 21.0547 22.1123 21.0547H10.3262Z"
                                              fill="#05B0FF"
                                            />
                                          </g>
                                          <defs>
                                            <clipPath id="clip0_614_1247">
                                              <rect width="28" height="28" fill="white" />
                                            </clipPath>
                                          </defs>
                                        </svg>
                                        Add flashcards
                                      </button>

                                      {/* Practice Test */}
                                      <button
                                        onClick={handleNewCreatePractice}
                                        className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 hover:bg-[#F9F9FB] text-left"
                                      >
                                        <svg
                                          width="24"
                                          height="24"
                                          viewBox="0 0 28 28"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <g clipPath="url(#clip0_614_579)">
                                            <path
                                              d="M9.31543 23.1729H18.6758C20.5566 23.1729 21.5322 22.1797 21.5322 20.29V12.3184C21.5322 11.0967 21.374 10.5342 20.6094 9.76074L15.9951 5.06738C15.2568 4.32031 14.6504 4.14453 13.5518 4.14453H9.31543C7.43457 4.14453 6.45898 5.1377 6.45898 7.02734V20.29C6.45898 22.1885 7.43457 23.1729 9.31543 23.1729ZM9.45605 21.4502C8.60352 21.4502 8.18164 21.002 8.18164 20.1846V7.13281C8.18164 6.32422 8.60352 5.86719 9.45605 5.86719H13.2002V10.6836C13.2002 11.9404 13.8242 12.5469 15.0723 12.5469H19.8096V20.1846C19.8096 21.002 19.3789 21.4502 18.5264 21.4502H9.45605ZM15.2305 11.0352C14.8701 11.0352 14.7207 10.877 14.7207 10.5166V6.10449L19.5723 11.0352H15.2305Z"
                                              fill="#05B0FF"
                                            />
                                          </g>
                                          <defs>
                                            <clipPath id="clip0_614_579">
                                              <rect width="28" height="28" fill="white" />
                                            </clipPath>
                                          </defs>
                                        </svg>
                                        Add practice test
                                      </button>
                                    </div>
                                  </>,
                                  document.body,
                                )}

                              {/* Create folder/assignment panel - rendered via portal */}
                              {creatingType &&
                                createPanelPosition &&
                                createPortal(
                                  <>
                                    <div
                                      className="fixed inset-0 z-[10000]"
                                      onClick={closeCreatePanel}
                                    />
                                    <div
                                      ref={createPanelRef}
                                      className="fixed z-[10001]"
                                      style={{
                                        top: createPanelPosition.top,
                                        right: createPanelPosition.right,
                                      }}
                                    >
                                      <FolderEditPanel
                                        mode="create"
                                        type={creatingType}
                                        onSave={
                                          creatingType === "assignment"
                                            ? handleCreateAssignment
                                            : handleCreateFolder
                                        }
                                        onCancel={closeCreatePanel}
                                        isAnimated={isCreatePanelAnimated}
                                      />
                                    </div>
                                  </>,
                                  document.body,
                                )}
                                </div>
                              )}

                              {/* Organize button with dropdown */}
                              <div className={`relative ${showButtonLabels ? "" : "group"}`}>
                                <button
                                  ref={organizeButtonRef}
                                  className="flex flex-row items-center hover:bg-[#F9F9FB] rounded-lg cursor-pointer text-[#1C1C1E] p-1.5 transition-all duration-200 ease-out"
                                  onClick={openOrganizeDropdown}
                                >
                                  <svg
                                    className="transition-all duration-200 ease-out"
                                    width={showButtonLabels ? "16" : "20"}
                                    height={showButtonLabels ? "16" : "20"}
                                    viewBox="0 0 28 28"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M6.81055 21.7578H21.4092C23.0879 21.7578 24.0635 20.7822 24.0635 18.9014V9.86621C24.0635 7.98535 23.0791 7.00977 21.1807 7.00977H13.0068C12.374 7.00977 12.0049 6.86035 11.5215 6.46484L11.0117 6.06055C10.3965 5.55078 9.93945 5.38379 9.02539 5.38379H6.53809C4.89453 5.38379 3.92773 6.3418 3.92773 8.1875V18.9014C3.92773 20.7822 4.91211 21.7578 6.81055 21.7578ZM5.65039 8.33691C5.65039 7.52832 6.08984 7.10645 6.88086 7.10645H8.56836C9.19238 7.10645 9.55273 7.24707 10.0449 7.65137L10.5547 8.06445C11.1611 8.56543 11.6357 8.73242 12.5498 8.73242H21.084C21.8926 8.73242 22.3408 9.1543 22.3408 10.0156V10.5254H5.65039V8.33691ZM6.91602 20.0352C6.09863 20.0352 5.65039 19.6133 5.65039 18.7607V12.0459H22.3408V18.7607C22.3408 19.6133 21.8926 20.0352 21.084 20.0352H6.91602Z"
                                      fill="currentColor"
                                    />
                                  </svg>
                                  <span 
                                    className={`font-rounded-bold text-[13px] overflow-hidden whitespace-nowrap transition-all duration-200 ease-out ${
                                      showButtonLabels 
                                        ? "max-w-[70px] opacity-100 ml-1.5" 
                                        : "max-w-0 opacity-0 ml-0"
                                    }`}
                                  >
                                    Organize
                                  </span>
                                </button>
                                {!showButtonLabels && (
                                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-[#333333] rounded-[4px] opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-[1600] transition-opacity duration-150 delay-0 group-hover:delay-500">
                                    <span className="font-medium text-[12px] text-white">Organize</span>
                                  </div>
                                )}

                                {/* Organize dropdown */}
                            {isOrganizeDropdownOpen &&
                              organizeDropdownPosition &&
                              createPortal(
                                <>
                                  <div
                                    className="fixed inset-0 z-[10000]"
                                    onClick={closeOrganizeDropdown}
                                  />
                                  <div
                                    className="fixed w-[200px] bg-white/95 backdrop-blur-[16px] rounded-[12px] shadow-[0_0_16px_rgba(0,0,0,0.16)] flex flex-col border border-white p-2 gap-1 z-[10001]"
                                    style={{
                                      transformOrigin: "top left",
                                      top: organizeDropdownPosition.top,
                                      left: organizeDropdownPosition.left,
                                    }}
                                  >
                                    {/* Add Folder */}
                                    <button
                                      onClick={handleOpenCreateFolder}
                                      className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 hover:bg-[#F9F9FB] text-left"
                                    >
                                      <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 28 28"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M6.81934 21.7666H21.4004C23.0879 21.7666 24.0811 20.7822 24.0811 18.9014V15.4824H25.0479C26.9463 15.4824 27.9395 14.5068 27.9395 12.6172V7.30859C27.9395 5.42773 26.9463 4.44336 25.0479 4.44336H17.4365C15.6348 4.44336 14.6592 5.31348 14.5537 6.99219H13.0332C12.5234 6.99219 12.0225 6.85156 11.5391 6.44727L11.0381 6.04297C10.4141 5.5332 9.95703 5.36621 9.03418 5.36621H6.54688C4.90332 5.36621 3.91895 6.33301 3.91895 8.1875V18.9014C3.91895 20.791 4.91211 21.7666 6.81934 21.7666ZM17.4893 13.8037C16.6719 13.8037 16.2236 13.3818 16.2236 12.5205V7.40527C16.2236 6.54395 16.6719 6.12207 17.4893 6.12207H24.9863C25.8037 6.12207 26.2607 6.54395 26.2607 7.40527V12.5205C26.2607 13.3818 25.8037 13.8037 25.0039 13.8037H17.4893ZM19.0537 10.6748H20.5303V12.1514C20.5303 12.5469 20.8467 12.8633 21.2422 12.8633C21.6465 12.8633 21.9541 12.5469 21.9541 12.1514V10.6748H23.4219C23.8262 10.6748 24.1338 10.3584 24.1338 9.96289C24.1338 9.56738 23.8262 9.25098 23.4219 9.25098H21.9541V7.77441C21.9541 7.37891 21.6377 7.0625 21.2422 7.0625C20.8467 7.0625 20.5303 7.37891 20.5303 7.77441V9.25098H19.0537C18.6582 9.25098 18.3418 9.56738 18.3418 9.96289C18.3418 10.3584 18.6582 10.6748 19.0537 10.6748ZM5.67676 8.33691C5.67676 7.53711 6.11621 7.11523 6.89844 7.11523H8.56836C9.19238 7.11523 9.56152 7.26465 10.0625 7.66895L10.5635 8.08203C11.1699 8.57422 11.7676 8.75 12.6904 8.75H14.5361V10.5342H5.67676V8.33691ZM17.4365 15.4824H22.3232V18.752C22.3232 19.5957 21.875 20.0176 21.0664 20.0176H6.9248C6.11621 20.0176 5.67676 19.5957 5.67676 18.7432V12.0723H14.5361V12.6172C14.5361 14.5068 15.5293 15.4824 17.4365 15.4824Z"
                                          fill="#05B0FF"
                                        />
                                      </svg>
                                      Add Folder
                                    </button>

                                    {/* Add Assignment */}
                                    <button
                                      onClick={handleOpenCreateAssignment}
                                      className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 hover:bg-[#F9F9FB] text-left"
                                    >
                                      <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 28 28"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M6.81934 21.7666H21.4004C23.0879 21.7666 24.0811 20.7822 24.0811 18.9014V15.4824H25.0479C26.9463 15.4824 27.9395 14.5068 27.9395 12.6172V7.30859C27.9395 5.42773 26.9463 4.44336 25.0479 4.44336H17.4365C15.6348 4.44336 14.6592 5.31348 14.5537 6.99219H13.0332C12.5234 6.99219 12.0225 6.85156 11.5391 6.44727L11.0381 6.04297C10.4141 5.5332 9.95703 5.36621 9.03418 5.36621H6.54688C4.90332 5.36621 3.91895 6.33301 3.91895 8.1875V18.9014C3.91895 20.791 4.91211 21.7666 6.81934 21.7666ZM17.4893 13.8037C16.6719 13.8037 16.2236 13.3818 16.2236 12.5205V7.40527C16.2236 6.54395 16.6719 6.12207 17.4893 6.12207H24.9863C25.8037 6.12207 26.2607 6.54395 26.2607 7.40527V12.5205C26.2607 13.3818 25.8037 13.8037 25.0039 13.8037H17.4893ZM19.0537 10.6748H20.5303V12.1514C20.5303 12.5469 20.8467 12.8633 21.2422 12.8633C21.6465 12.8633 21.9541 12.5469 21.9541 12.1514V10.6748H23.4219C23.8262 10.6748 24.1338 10.3584 24.1338 9.96289C24.1338 9.56738 23.8262 9.25098 23.4219 9.25098H21.9541V7.77441C21.9541 7.37891 21.6377 7.0625 21.2422 7.0625C20.8467 7.0625 20.5303 7.37891 20.5303 7.77441V9.25098H19.0537C18.6582 9.25098 18.3418 9.56738 18.3418 9.96289C18.3418 10.3584 18.6582 10.6748 19.0537 10.6748ZM5.67676 8.33691C5.67676 7.53711 6.11621 7.11523 6.89844 7.11523H8.56836C9.19238 7.11523 9.56152 7.26465 10.0625 7.66895L10.5635 8.08203C11.1699 8.57422 11.7676 8.75 12.6904 8.75H14.5361V10.5342H5.67676V8.33691ZM17.4365 15.4824H22.3232V18.752C22.3232 19.5957 21.875 20.0176 21.0664 20.0176H6.9248C6.11621 20.0176 5.67676 19.5957 5.67676 18.7432V12.0723H14.5361V12.6172C14.5361 14.5068 15.5293 15.4824 17.4365 15.4824Z"
                                          fill="#05B0FF"
                                        />
                                      </svg>
                                      Add Assignment
                                    </button>

                                    {/* Divider */}
                                    <div className="h-px bg-[#F2F2F7] my-1" />

                                    {/* Auto-organize */}
                                    <button
                                      disabled={isReorganizing}
                                      onClick={async () => {
                                        closeOrganizeDropdown();
                                        await handleReorganizeCollection();
                                      }}
                                      className={`w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 hover:bg-[#F9F9FB] text-left ${isReorganizing ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                      {/* Sparkle icon */}
                                      <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 28 28"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M11.6621 8.9873C11.7852 8.9873 11.8555 8.89941 11.8818 8.78516C12.1719 7.32617 12.1543 7.29102 13.6748 6.99219C13.8066 6.96582 13.8857 6.89551 13.8857 6.77246C13.8857 6.64941 13.8066 6.5791 13.6836 6.55273C12.1455 6.23633 12.1543 6.20117 11.8818 4.75098C11.8643 4.63672 11.7852 4.55762 11.6621 4.55762C11.5391 4.55762 11.4688 4.63672 11.4512 4.75098C11.1523 6.21875 11.1787 6.27148 9.64941 6.55273C9.52637 6.57031 9.44727 6.64941 9.44727 6.77246C9.44727 6.88672 9.52637 6.96582 9.64941 6.99219C11.1787 7.2998 11.1699 7.33496 11.4512 8.78516C11.4688 8.89941 11.5391 8.9873 11.6621 8.9873ZM19.1943 12.1162C19.335 12.1162 19.4229 12.0107 19.4492 11.8789C19.7656 10.1738 19.748 10.0859 21.541 9.77832C21.6904 9.75195 21.7871 9.66406 21.7871 9.52344C21.7871 9.38281 21.6904 9.29492 21.5498 9.26855C19.748 8.94336 19.7217 8.86426 19.4492 7.16797C19.4229 7.02734 19.335 6.93066 19.1943 6.93066C19.0537 6.93066 18.957 7.02734 18.9395 7.16797C18.6318 8.88184 18.6406 8.9873 16.8301 9.26855C16.6982 9.28613 16.5928 9.38281 16.5928 9.52344C16.6016 9.66406 16.6895 9.75195 16.8301 9.77832C18.6406 10.0947 18.6582 10.1826 18.9395 11.8789C18.957 12.0107 19.0537 12.1162 19.1943 12.1162ZM6.81934 14.7529C6.95996 14.7529 7.05664 14.6562 7.07422 14.5156C7.35547 12.8105 7.38184 12.7227 9.1748 12.415C9.31543 12.3887 9.41211 12.3008 9.41211 12.1602C9.41211 12.0195 9.31543 11.9316 9.18359 11.9053C7.37305 11.5801 7.37305 11.501 7.07422 9.80469C7.04785 9.66406 6.95996 9.56738 6.81934 9.56738C6.67871 9.56738 6.59082 9.66406 6.56445 9.80469C6.2832 11.5186 6.26562 11.6064 4.46387 11.9053C4.32324 11.9316 4.22656 12.0195 4.22656 12.1602C4.22656 12.3008 4.32324 12.3887 4.45508 12.415C6.26562 12.7314 6.26562 12.8281 6.56445 14.5244C6.59082 14.6562 6.67871 14.7529 6.81934 14.7529ZM21.8662 22.2939C22.2969 22.7334 23.0352 22.7246 23.457 22.2939C23.8877 21.8457 23.8789 21.1426 23.457 20.7031L15.1074 12.3096C14.6768 11.8789 13.9385 11.8789 13.5166 12.3096C13.0859 12.7578 13.0947 13.4697 13.5166 13.9004L21.8662 22.2939ZM16.9092 16.2031L14.2637 13.5576C14.0879 13.373 14.0264 13.1621 14.2021 12.9863C14.3604 12.8281 14.5801 12.8721 14.7734 13.0566L17.4102 15.7021L16.9092 16.2031ZM11.0557 22.5137C11.2402 22.5137 11.3721 22.3906 11.3984 22.1885C11.6797 19.8154 11.7939 19.7451 14.2109 19.3672C14.4307 19.332 14.5625 19.2178 14.5625 19.0244C14.5625 18.8398 14.4307 18.7168 14.2549 18.6816C11.8027 18.207 11.6797 18.2246 11.3984 15.8604C11.3721 15.6582 11.2402 15.5352 11.0557 15.5352C10.8711 15.5352 10.7393 15.6582 10.7129 15.8516C10.4141 18.2598 10.3262 18.3477 7.86523 18.6816C7.68945 18.6992 7.54883 18.8398 7.54883 19.0244C7.54883 19.209 7.68066 19.332 7.85645 19.3672C10.335 19.8418 10.4053 19.8418 10.7129 22.2061C10.7393 22.3906 10.8711 22.5137 11.0557 22.5137Z"
                                          fill="#05B0FF"
                                        />
                                      </svg>
                                      Auto-organize
                                    </button>
                                  </div>
                                </>,
                                document.body,
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Document Directory with Drag & Drop */}
                      {(sidebarMode === "all" ||
                        sidebarMode === "assignments") && (
                        <div
                          className={`${sidebarState !== "closed" ? "flex-1" : "hidden"} flex flex-col justify-between pb-0 min-h-0 overflow-hidden relative`}
                        >
                          <div
                            ref={dragHook.containerRef}
                            className={`flex flex-col mr-1 relative overflow-y-auto scrollbar-minimal ${
                              isExternalFileDragGlobal ||
                              isDragOver ||
                              documentOrder.length === 0
                                ? "hidden"
                                : "flex-1"
                            }`}
                            style={{
                              userSelect: dragHook.isDragging ? "none" : "auto",
                            }}
                            onMouseDown={(e) => {
                              // Prevent text selection when clicking in gaps between items
                              // Only prevent if clicking on container itself or the spacer div
                              const target = e.target as HTMLElement;
                              const isContainerOrSpacer =
                                target === e.currentTarget ||
                                target.getAttribute("aria-hidden") === "true";
                              if (isContainerOrSpacer) {
                                e.preventDefault();
                              }
                            }}
                            onDragEnter={handleContainerDragEnter}
                            onDragLeave={handleContainerDragLeave}
                            onDragOver={handleContainerDragOver}
                            onDrop={handleContainerDrop}
                          >
                            <div
                              aria-hidden="true"
                              className="flex-none pointer-events-none"
                              style={{ height: listContentHeight }}
                            />

                            {/* Shimmer Effect during reorganization */}
                            {showShimmer && (
                              <div className="absolute inset-0 z-[200] pointer-events-none">
                                <ShimmerEffect />
                              </div>
                            )}

                            {/* External file drop insertion indicator (root only) */}
                            {isExternalFileDragging &&
                              externalHoverFolderId === null &&
                              typeof externalInsertIndex === "number" &&
                              documentOrder.length >= 0 &&
                              (() => {
                                // Compute line top using measured positions
                                let lineTop = 0;
                                if (
                                  externalInsertIndex === 0 &&
                                  documentOrder.length > 0
                                ) {
                                  lineTop =
                                    dragHook.itemPositions[documentOrder[0]] ??
                                    0;
                                } else if (
                                  externalInsertIndex >= documentOrder.length &&
                                  documentOrder.length > 0
                                ) {
                                  const lastId =
                                    documentOrder[documentOrder.length - 1];
                                  const lastTop =
                                    dragHook.itemPositions[lastId] ?? 0;
                                  const lastH =
                                    dragHook.itemHeights[lastId] ?? 48;
                                  lineTop = lastTop + lastH + dragHook.GAP / 2;
                                } else if (
                                  externalInsertIndex > 0 &&
                                  externalInsertIndex < documentOrder.length
                                ) {
                                  const nextId =
                                    documentOrder[externalInsertIndex];
                                  lineTop = dragHook.itemPositions[nextId] ?? 0;
                                }
                                return (
                                  <div
                                    className="absolute left-0 right-0 pointer-events-none"
                                    style={{ top: lineTop - 2, zIndex: 100 }}
                                  >
                                    <div className="mx-0 h-[3px] bg-[#F2F2F7] rounded-full opacity-90" />
                                  </div>
                                );
                              })()}
                            {/* External file drop insertion indicator (inside folder) */}
                            {isExternalFileDragging &&
                              externalHoverFolderId !== null &&
                              typeof externalFolderInsertIndex === "number" &&
                              (() => {
                                if (!dragHook.containerRef.current) return null;
                                const containerRect =
                                  dragHook.containerRef.current.getBoundingClientRect();
                                const folderDocs = getFolderDocuments(
                                  externalHoverFolderId,
                                );
                                let lineTopWithinContainer = 0;

                                if (folderDocs.length > 0) {
                                  if (externalFolderInsertIndex <= 0) {
                                    const firstEl =
                                      dragHook.itemRefs.current.get(
                                        folderDocs[0].id,
                                      );
                                    if (firstEl) {
                                      const rect =
                                        firstEl.getBoundingClientRect();
                                      lineTopWithinContainer =
                                        rect.top - containerRect.top;
                                    }
                                  } else if (
                                    externalFolderInsertIndex >=
                                    folderDocs.length
                                  ) {
                                    const lastEl =
                                      dragHook.itemRefs.current.get(
                                        folderDocs[folderDocs.length - 1].id,
                                      );
                                    if (lastEl) {
                                      const rect =
                                        lastEl.getBoundingClientRect();
                                      lineTopWithinContainer =
                                        rect.bottom - containerRect.top;
                                    }
                                  } else {
                                    const nextEl =
                                      dragHook.itemRefs.current.get(
                                        folderDocs[externalFolderInsertIndex]
                                          .id,
                                      );
                                    if (nextEl) {
                                      const rect =
                                        nextEl.getBoundingClientRect();
                                      lineTopWithinContainer =
                                        rect.top - containerRect.top;
                                    }
                                  }
                                } else {
                                  // No docs: place just below the folder header (assume ~44px header)
                                  const folderEl =
                                    dragHook.itemRefs.current.get(
                                      externalHoverFolderId,
                                    );
                                  if (folderEl) {
                                    const rect =
                                      folderEl.getBoundingClientRect();
                                    lineTopWithinContainer =
                                      rect.top - containerRect.top + 44;
                                  }
                                }

                                return (
                                  <div
                                    className="absolute left-0 right-0 pointer-events-none"
                                    style={{
                                      top: lineTopWithinContainer - 2,
                                      zIndex: 100,
                                    }}
                                  >
                                    <div className="mx-0 h-[3px] bg-[#F2F2F7] rounded-full opacity-90" />
                                  </div>
                                );
                              })()}
                            {/* Render folders */}
                            {(sidebarMode === "assignments"
                              ? assignmentFolders
                              : collectionContent.folders
                            ).map((folder, filteredIndex) => {
                              // In assignments mode, calculate position from cumulative heights of previous filtered items
                              let position: number;
                              if (sidebarMode === "assignments") {
                                let cumulative = 0;
                                for (let i = 0; i < filteredIndex; i++) {
                                  const prevId = assignmentFolders[i].id;
                                  cumulative +=
                                    (dragHook.itemHeights[prevId] ?? 48) +
                                    dragHook.GAP;
                                }
                                position = cumulative;
                              } else {
                                position = getPositionWithFallback(folder.id);
                              }
                              const folderDocs = getFolderDocuments(folder.id);
                              const folderIndex = documentOrder.indexOf(
                                folder.id,
                              );
                              const isDraggedItem =
                                dragHook.draggedItem?.id === folder.id;

                              return (
                                <FolderItem
                                  key={folder.id}
                                  collectionId={folder.collectionId}
                                  date={new Date(
                                    folder.createdAt,
                                  ).toLocaleDateString()}
                                  expanded={folder.isExpanded ?? true}
                                  id={folder.id}
                                  index={folderIndex}
                                  isDraggedItem={isDraggedItem}
                                  isDragging={dragHook.isDragging}
                                  isHovered={
                                    (dragHook.hoveredFolder === folder.id &&
                                      dragHook.draggedItem?.type ===
                                        "document") ||
                                    (isExternalFileDragging &&
                                      externalHoverFolderId === folder.id)
                                  }
                                  isChildMenuOpen={
                                    folderIdWithOpenChildMenu === folder.id
                                  }
                                  position={position}
                                  setRef={(id, el) => {
                                    if (el)
                                      dragHook.itemRefs.current.set(id, el);
                                  }}
                                  title={folder.name}
                                  type={folder.type}
                                  deadline={folder.deadline}
                                  weighting={folder.weighting}
                                  onDelete={handleFolderDelete}
                                  onExpandedChange={(exp) =>
                                    handleSetFolderExpanded(folder.id, exp)
                                  }
                                  onMouseDown={handleItemMouseDown}
                                  onGeneratePractice={
                                    handleFolderGeneratePractice
                                  }
                                  onGenerateFlashcards={
                                    handleFolderGenerateFlashcards
                                  }
                                  onRename={handleFolderRename}
                                  onUpdate={handleFolderUpdate}
                                  onToggle={measureHeights}
                                  onTouchStart={handleItemTouchStart}
                                  hasNewDocuments={folderDocs.some(
                                    (doc) => !doc.lastViewedAt,
                                  )}
                                  isEmpty={folderDocs.length === 0}
                                  thumbnails={folderDocs
                                    .filter((d) => d.thumbnailUrl)
                                    .slice(0, 4)
                                    .map((d) => fileUrls.thumbnail(d.id, d.thumbnailUrl!))}
                                  isExiting={exitingFolderIds.has(folder.id)}
                                  shouldAnimate={enteringFolderIds.has(
                                    folder.id,
                                  )}
                                >
                                  {(() => {
                                    // Nested docs: render as absolute-positioned rows so they animate smoothly
                                    // when we insert/remove a placeholder.
                                    const ROW_H = 48;
                                    const NESTED_GAP = 6;
                                    const docsToRender = folderDocs.filter(
                                      (d) => d.id !== dragHook.draggedItem?.id,
                                    );
                                    const showPlaceholder =
                                      dragHook.isDragging &&
                                      dragHook.draggedItem?.type ===
                                        "document" &&
                                      dragHook.hoveredFolder === folder.id;
                                    const insertIdx =
                                      internalFolderInsertIndex ??
                                      docsToRender.length;

                                    const PLACEHOLDER_ID =
                                      "__folder_placeholder__";
                                    const renderOrder: string[] =
                                      docsToRender.map((d) => d.id);
                                    if (showPlaceholder) {
                                      renderOrder.splice(
                                        Math.max(
                                          0,
                                          Math.min(
                                            insertIdx,
                                            renderOrder.length,
                                          ),
                                        ),
                                        0,
                                        PLACEHOLDER_ID,
                                      );
                                    }

                                    return (
                                      <div
                                        className="relative"
                                        style={{
                                          height: `${renderOrder.length * ROW_H + Math.max(0, renderOrder.length - 1) * NESTED_GAP}px`,
                                        }}
                                      >
                                        {renderOrder.map((id, idx) => {
                                          const top = idx * (ROW_H + NESTED_GAP);
                                          if (id === PLACEHOLDER_ID) {
                                            // Keep the placeholder in the ordering math (so items shift/animate),
                                            // but don't render any visible debug UI.
                                            return null;
                                          }

                                          const doc = docsToRender.find(
                                            (d) => d.id === id,
                                          );
                                          if (!doc) return null;

                                          const suggestion =
                                            pendingSuggestions.find(
                                              (s) => s.documentId === doc.id,
                                            );
                                          const isBeingDragged =
                                            dragHook.draggedItem?.id === doc.id;

                                          return (
                                            <div
                                              key={doc.id}
                                              className="absolute left-0 right-0"
                                              style={{
                                                transform: `translateY(${top}px)`,
                                                transition:
                                                  "transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                                              }}
                                            >
                                              <DocumentItem
                                                isNested
                                                collectionId={doc.collectionId}
                                                date={new Date(
                                                  doc.createdAt,
                                                ).toLocaleDateString()}
                                                folderId={doc.folderId}
                                                height={ROW_H}
                                                id={doc.id}
                                                type={doc.type}
                                                // Folder reorders are local; index is only used for initial drag start.
                                                index={idx}
                                                isDraggedItem={isBeingDragged}
                                                isDragging={dragHook.isDragging}
                                                isActive={
                                                  activeDocumentId === doc.id
                                                }
                                                position={0}
                                                onMenuOpenChange={(open) => {
                                                  setFolderIdWithOpenChildMenu(
                                                    (prev) => {
                                                      if (open)
                                                        return folder.id;
                                                      return prev === folder.id
                                                        ? null
                                                        : prev;
                                                    },
                                                  );
                                                }}
                                                setRef={(id, el) => {
                                                  if (el)
                                                    dragHook.itemRefs.current.set(
                                                      id,
                                                      el,
                                                    );
                                                }}
                                                thumbnailUrl={doc.thumbnailUrl}
                                                title={doc.name}
                                                label={doc.label}
                                                isPlaceholder={
                                                  doc.isPlaceholder
                                                }
                                                isLoading={doc.isLoading}
                                                isExiting={exitingIds.has(
                                                  doc.id,
                                                )}
                                                isHidden={hiddenIds.has(doc.id)}
                                                isNew={!doc.lastViewedAt}
                                                shouldAnimate={enteringIds.has(
                                                  doc.id,
                                                )}
                                                onClick={handleDocumentClick}
                                                onDelete={handleDocumentDelete}
                                                onGeneratePractice={
                                                  handleDocumentGeneratePractice
                                                }
                                                onGenerateFlashcards={
                                                  handleDocumentGenerateFlashcards
                                                }
                                                onMouseDown={
                                                  dragHook.onMouseDown
                                                }
                                                onRename={handleDocumentRename}
                                                onTouchStart={
                                                  dragHook.onTouchStart
                                                }
                                                suggestion={suggestion}
                                                onAcceptSuggestion={() =>
                                                  acceptSuggestion(doc.id)
                                                }
                                                onRejectSuggestion={() =>
                                                  rejectSuggestion(doc.id)
                                                }
                                                folders={folders}
                                                onSelectFolder={(
                                                  targetFolderId,
                                                ) => {
                                                  // Remove from pending suggestions since user manually selected
                                                  rejectSuggestion(doc.id);
                                                  // Animate and move
                                                  animateDocumentRelocation(
                                                    doc.id,
                                                    targetFolderId,
                                                  );
                                                }}
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                                </FolderItem>
                              );
                            })}

                            {/* Render root documents (hidden in assignments mode) */}
                            {sidebarMode === "all" &&
                              collectionContent.documents.map(
                                (doc, mapIndex) => {
                                  const position = getPositionWithFallback(
                                    doc.id,
                                  );
                                  const height =
                                    dragHook.itemHeights[doc.id] || 48;
                                  const isDraggedItem =
                                    dragHook.draggedItem?.id === doc.id;
                                  const suggestion = pendingSuggestions.find(
                                    (s) => s.documentId === doc.id,
                                  );
                                  const docIndex = documentOrder.indexOf(
                                    doc.id,
                                  );
                                  const isFirstDocument = mapIndex === 0;

                                  return (
                                    <Fragment key={doc.id}>
                                      <DocumentItem
                                        collectionId={doc.collectionId}
                                        date={new Date(
                                          doc.createdAt,
                                        ).toLocaleDateString()}
                                        folderId={doc.folderId}
                                        height={height}
                                        id={doc.id}
                                        type={doc.type}
                                        index={docIndex}
                                        isDraggedItem={isDraggedItem}
                                        isDragging={dragHook.isDragging}
                                        isActive={activeDocumentId === doc.id}
                                        isHovered={
                                          dragHook.hoveredDocument === doc.id &&
                                          dragHook.draggedItem?.type ===
                                            "document"
                                        }
                                        position={position}
                                        setRef={(id, el) => {
                                          if (el)
                                            dragHook.itemRefs.current.set(
                                              id,
                                              el,
                                            );
                                        }}
                                        thumbnailUrl={doc.thumbnailUrl}
                                        title={doc.name}
                                        label={doc.label}
                                        isPlaceholder={doc.isPlaceholder}
                                        isLoading={doc.isLoading}
                                        isExiting={exitingIds.has(doc.id)}
                                        isHidden={hiddenIds.has(doc.id)}
                                        isNew={!doc.lastViewedAt}
                                        shouldAnimate={enteringIds.has(doc.id)}
                                        onClick={handleDocumentClick}
                                        onDelete={handleDocumentDelete}
                                        onGeneratePractice={
                                          handleDocumentGeneratePractice
                                        }
                                        onGenerateFlashcards={
                                          handleDocumentGenerateFlashcards
                                        }
                                        onMouseDown={dragHook.onMouseDown}
                                        onRename={handleDocumentRename}
                                        onTouchStart={dragHook.onTouchStart}
                                        suggestion={suggestion}
                                        onAcceptSuggestion={() =>
                                          acceptSuggestion(doc.id)
                                        }
                                        onRejectSuggestion={() =>
                                          rejectSuggestion(doc.id)
                                        }
                                        folders={collectionContent.folders}
                                        onSelectFolder={(folderId) => {
                                          // Trigger animation to move to selected folder
                                          animateDocumentRelocation(
                                            doc.id,
                                            folderId,
                                          );
                                          // Remove suggestion after manual selection
                                          rejectSuggestion(doc.id);
                                        }}
                                      />
                                    </Fragment>
                                  );
                                },
                              )}

                            {/* Dragged item visual feedback */}
                            {dragHook.isDragging &&
                              dragHook.draggedItem &&
                              dragHook.dragPosition &&
                              createPortal(
                                <div
                                  className="fixed pointer-events-none z-[15000]"
                                  style={{
                                    left:
                                      lastPointerRef.current?.x ??
                                      (dragHook.containerRef.current?.getBoundingClientRect()
                                        .left ?? 0) +
                                        (dragHook.dragPosition?.x ?? 0),
                                    top:
                                      lastPointerRef.current?.y ??
                                      (dragHook.containerRef.current?.getBoundingClientRect()
                                        .top ?? 0) +
                                        (dragHook.dragPosition?.y ?? 0),
                                    transform:
                                      "translate(-50%, -50%) scale(1.02)",
                                    width: "280px",
                                  }}
                                >
                                  <div className="flex flex-row items-center gap-2 px-2 h-[44px] bg-white rounded-[12px] shadow-[0_0_16px_rgba(0,0,0,0.10)]">
                                    {dragHook.draggedItem.type === "folder" ? (
                                      <>
                                        {/* Chevron */}
                                        <div
                                          style={{
                                            visibility:
                                              getFolderDocuments(
                                                dragHook.draggedItem.id,
                                              ).length === 0
                                                ? "hidden"
                                                : "visible",
                                          }}
                                        >
                                          <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            style={{
                                              transform: "rotate(90deg)",
                                            }}
                                          >
                                            <path
                                              d="M16.844 11.7037C16.8365 11.44 16.7386 11.214 16.5352 11.0106L10.6741 5.27762C10.5008 5.11189 10.2974 5.02148 10.0488 5.02148C9.54408 5.02148 9.15234 5.41323 9.15234 5.91797C9.15234 6.15904 9.25028 6.38504 9.42355 6.55831L14.697 11.7037L9.42355 16.8491C9.25028 17.0223 9.15234 17.2408 9.15234 17.4894C9.15234 17.9941 9.54408 18.3859 10.0488 18.3859C10.2899 18.3859 10.5008 18.2955 10.6741 18.1297L16.5352 12.3892C16.7461 12.1934 16.844 11.9674 16.844 11.7037Z"
                                              fill="#05B0FF"
                                            />
                                          </svg>
                                        </div>
                                        {/* Folder icon */}
                                        <div className="flex items-center justify-center flex-shrink-0">
                                          {(() => {
                                            const folder = folders.find(
                                              (f) =>
                                                f.id ===
                                                dragHook.draggedItem?.id,
                                            );
                                            if (folder?.type === "assignment") {
                                              return (
                                                <svg
                                                  width="24"
                                                  height="24"
                                                  viewBox="0 0 28 28"
                                                  fill="none"
                                                  xmlns="http://www.w3.org/2000/svg"
                                                >
                                                  <path
                                                    d="M6.47656 21.3535H21.5146C23.4219 21.3535 24.415 20.3691 24.415 18.4883V13.5664C24.415 12.582 24.2744 12.1602 23.8174 11.5625L20.9346 7.72168C19.9062 6.35938 19.3701 5.98145 17.7881 5.98145H10.2119C8.62109 5.98145 8.08496 6.35938 7.06543 7.72168L4.17383 11.5625C3.72559 12.1602 3.58496 12.582 3.58496 13.5664V18.4883C3.58496 20.3691 4.57812 21.3535 6.47656 21.3535ZM14 15.9482C12.6641 15.9482 11.8291 14.8848 11.8291 13.7861V13.7158C11.8291 13.3115 11.583 12.9248 11.082 12.9248H5.79102C5.46582 12.9248 5.41309 12.6611 5.5625 12.4502L8.77051 8.14355C9.13965 7.63379 9.60547 7.44043 10.2031 7.44043H17.7969C18.3857 7.44043 18.8516 7.63379 19.2295 8.14355L22.4287 12.4502C22.5781 12.6611 22.5254 12.9248 22.2002 12.9248H16.9092C16.4082 12.9248 16.1709 13.3115 16.1709 13.7158V13.7861C16.1709 14.8848 15.3359 15.9482 14 15.9482Z"
                                                    fill="#41C3FF"
                                                  />
                                                </svg>
                                              );
                                            }
                                            return (
                                              <svg
                                                width="24"
                                                height="24"
                                                viewBox="0 0 36 28"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                              >
                                                <path
                                                  d="M4.97756 28H31.4981C34.3355 28 36 26.4088 36 23.2569V7.54316C36 4.39125 34.3198 2.8 31.0225 2.8H15.0119C13.934 2.8 13.284 2.55519 12.4914 1.89727L11.5245 1.13224C10.4782 0.275409 9.66976 0 8.1004 0H4.37517C1.60106 0 0 1.53005 0 4.60546V23.2569C0 26.424 1.66447 28 4.97756 28ZM2.93263 8.01749V7.16065C2.93263 6.22732 3.61427 5.6306 4.80317 5.6306H31.1335C32.3065 5.6306 33.004 6.22732 33.004 7.16065V8.01749H2.93263Z"
                                                  fill="#41C3FF"
                                                />
                                              </svg>
                                            );
                                          })()}
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1 ml-1">
                                          {(() => {
                                            const folder = folders.find(
                                              (f) =>
                                                f.id ===
                                                dragHook.draggedItem?.id,
                                            );
                                            return (
                                              <div className="font-rounded-bold text-[14px] text-black truncate">
                                                {folder?.name || ""}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex items-center justify-center flex-shrink-0 pl-4">
                                          {(() => {
                                            const doc = documents.find(
                                              (d) =>
                                                d.id ===
                                                dragHook.draggedItem?.id,
                                            );
                                            const isPortrait =
                                              doc?.label &&
                                              [
                                                "notes",
                                                "reading",
                                                "assignment",
                                                "syllabus",
                                                "practice",
                                              ].includes(doc.label);
                                            const sizeClass = isPortrait
                                              ? "w-[20px] h-[30px]"
                                              : "w-[30px] h-[20px]";
                                            const effectiveThumbnailUrl =
                                              (() => {
                                                if (!doc?.thumbnailUrl)
                                                  return undefined;
                                                if (
                                                  doc.type === "document" ||
                                                  !doc.type
                                                ) {
                                                  return fileUrls.thumbnail(
                                                    doc.id,
                                                    doc.thumbnailUrl,
                                                  );
                                                }
                                                return doc.thumbnailUrl;
                                              })();

                                            if (effectiveThumbnailUrl) {
                                              return (
                                                <div
                                                  className={`${sizeClass} rounded-[6px] overflow-hidden border border-[#F2F2F7]`}
                                                >
                                                  <img
                                                    alt={doc?.name ?? ""}
                                                    className="w-full h-full object-cover"
                                                    src={effectiveThumbnailUrl}
                                                    style={{
                                                      transform: "scale(1.1)",
                                                    }}
                                                  />
                                                </div>
                                              );
                                            }
                                            return (
                                              <div
                                                className={`${sizeClass} rounded-[6px] border border-[#F2F2F7] flex items-center justify-center`}
                                              />
                                            );
                                          })()}
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                          {(() => {
                                            const doc = documents.find(
                                              (d) =>
                                                d.id ===
                                                dragHook.draggedItem?.id,
                                            );
                                            return (
                                              <div className="font-rounded-bold text-[14px] text-black truncate">
                                                {doc?.name || ""}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>,
                                document.body,
                              )}
                          </div>

                          {/* Hidden file input - always rendered so upload button works */}
                          <input
                            ref={fileInputRef}
                            accept="application/*,text/*"
                            className="hidden"
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                          />

                          {(isExternalFileDragGlobal ||
                            isDragOver ||
                            (!isContentLoading &&
                              collectionContent.documents.length === 0 &&
                              collectionContent.folders.length === 0)) && (
                            <div className="w-full px-4 flex items-center justify-center flex-1 relative">
                              <div
                                className="rounded-[24px] px-4 py-2 w-full h-full flex flex-col items-center justify-center"
                                style={{
                                  backgroundColor:
                                    isDragOver || isExternalFileDragGlobal
                                      ? "#E6F7FF"
                                      : "transparent",
                                  border:
                                    isDragOver || isExternalFileDragGlobal
                                      ? "2px dashed #06B0FF"
                                      : "none",
                                }}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                              >
                                <div className="flex flex-col items-center justify-center gap-4">
                                  <DocumentPreviewRectangles />
                                  <div className="relative overflow-hidden">
                                    <div className="text-[14px] text-center font-rounded-bold transition-colors duration-200 text-black/80 leading-tight">
                                      Drop your materials here
                                    </div>
                                    <div className="text-[12px] text-center text-[#808080] leading-tight mt-3 px-4">
                                      Lecture slides, syllabuses, past papers -
                                      whatever you're working with. Medly will
                                      help you make sense of it.
                                    </div>
                                    <button
                                      className="font-rounded-bold text-[14px] text-center text-white mt-5 bg-[#06B0FF] hover:bg-[#05A0E8] rounded-full px-6 py-2 transition-colors duration-200 block mx-auto cursor-pointer relative z-[150]"
                                      onClick={handleContainerClick}
                                    >
                                      Upload
                                    </button>

                                    {!isExternalFileDragGlobal &&
                                      !isDragOver &&
                                      collectionContent.documents.length < 1 &&
                                      collectionContent.folders.length < 1 && (
                                        <ShimmerEffect />
                                      )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          <p className="text-[11px] text-center text-[#808080] py-4 flex-shrink-0">
                            No storage limits here. Add away.
                          </p>
                        </div>
                      )}

                      {/* TODO: Re-enable glossary mode when ready
                      {sidebarMode === "glossary" && (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-full h-full flex flex-col gap-4 px-4 items-center justify-center">
                            {true && (
                              <div
                                className="text-[14px] text-center font-rounded-bold transition-colors duration-200"
                                style={{ color: "#C1C0C5" }}
                              >
                                Medly will keep updating your glossary as you
                                learn.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      */}
                    </div>
                  </>
                </div>
              </div>
            )}
        </div>

        {/* User section - hidden in semi-open state */}
        {sidebarState === "open" && (
          <SidebarUserSection leftSidebarWidth={leftSidebarWidth ?? 64} />
        )}
      </div>
      {isBelowSm && isManageAccountOpen && (
        <MOManageAccountModal
          isOpen={isManageAccountOpen}
          onClose={() => setIsManageAccountOpen(false)}
        />
      )}

      {/* Add Module Modal - rendered outside conditionals so it works even with no collections */}
      <AddModuleModal
        isOpen={isCreatingModule}
        onClose={closeModuleModal}
        onSave={handleCreateModule}
      />
    </>
  );
}
