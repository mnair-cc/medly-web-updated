"use client";

import React, { useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSidebar } from "../sidebar/MOSidebarLayoutClient";
import MobileModuleDropdown from "./MobileModuleDropdown";
import DocumentItem from "../DocumentItem";
import FolderItem from "../FolderItem";
import FolderEditPanel from "../sidebar/FolderEditPanel";
import { fileUrls } from "../../_lib/fileUrls";
import { SUPPORTED_FILE_ACCEPT } from "../../_utils/convertDocument";
import type { Collection, Document, Folder } from "@/app/(protected)/open/_types/content";

interface MobileSidebarPageProps {
  onDocumentSelect?: () => void;
}

// No-op functions for disabled drag handlers
const noop = () => {};
const noopRef = () => {};

// Item types for mixed ordering
type OrderedItem =
  | { type: "folder"; data: Folder }
  | { type: "document"; data: Document };

/**
 * MobileSidebarPage - Page 1 of mobile layout
 *
 * Shows module dropdown at top and document list below using the same
 * DocumentItem and FolderItem components as desktop for visual consistency.
 * Tapping a document triggers navigation and onDocumentSelect to navigate to page 2.
 */
export default function MobileSidebarPage({ onDocumentSelect }: MobileSidebarPageProps) {
  const router = useRouter();
  const {
    collections,
    selectedCollection,
    setSelectedCollection,
    getCollectionContent,
    getFolderDocuments,
    setFolderExpanded,
    addCollection,
    addFolder,
    uploadDocument,
    createPracticeDocument,
    createFlashcardDocument,
    createNotesDocument,
  } = useSidebar();

  // File input ref for uploads
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for "Add" button dropdown
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // State for "Organize" button dropdown
  const [isOrganizeDropdownOpen, setIsOrganizeDropdownOpen] = useState(false);
  const organizeButtonRef = useRef<HTMLButtonElement>(null);

  // State for folder/assignment creation panel
  const [creatingType, setCreatingType] = useState<"folder" | "assignment" | null>(null);
  const [isCreatePanelAnimated, setIsCreatePanelAnimated] = useState(false);
  const createPanelRef = useRef<HTMLDivElement>(null);

  const selectedCollectionObj = collections.find((c) => c.id === selectedCollection) || null;
  const content = selectedCollection ? getCollectionContent(selectedCollection) : { folders: [], documents: [] };

  // Build mixed order of folders and documents sorted by position (same as MOSidebar)
  const orderedItems = useMemo((): OrderedItem[] => {
    const items: OrderedItem[] = [
      ...content.folders.map((f) => ({ type: "folder" as const, data: f })),
      ...content.documents.map((d) => ({ type: "document" as const, data: d })),
    ];
    // Sort by position to get correct interleaved order
    items.sort((a, b) => a.data.position - b.data.position);
    return items;
  }, [content.folders, content.documents]);

  const handleCollectionSelect = (collection: Collection) => {
    setSelectedCollection(collection.id);
  };

  const handleDocumentClick = (documentId: string) => {
    // Slide to document page first (updates state and triggers scroll)
    onDocumentSelect?.();
    // Then navigate to the document route
    router.push(`/open/doc/${documentId}`);
  };

  const handleSetFolderExpanded = (folderId: string, isExpanded: boolean) => {
    setFolderExpanded(folderId, isExpanded);
  };

  const handleAddModule = async () => {
    try {
      await addCollection("New Module");
    } catch (error) {
      console.error("Failed to add collection:", error);
    }
  };

  // Add dropdown handlers
  const closeAddDropdown = useCallback(() => {
    setIsAddDropdownOpen(false);
  }, []);

  const openAddDropdown = useCallback(() => {
    setIsAddDropdownOpen(true);
  }, []);

  // Organize dropdown handlers
  const closeOrganizeDropdown = useCallback(() => {
    setIsOrganizeDropdownOpen(false);
  }, []);

  const openOrganizeDropdown = useCallback(() => {
    setIsOrganizeDropdownOpen(true);
  }, []);

  // Create panel handlers
  const closeCreatePanel = useCallback(() => {
    setIsCreatePanelAnimated(false);
    setTimeout(() => {
      setCreatingType(null);
    }, 150);
  }, []);

  const handleOpenCreateFolder = useCallback(() => {
    closeOrganizeDropdown();
    setCreatingType("folder");
    setTimeout(() => setIsCreatePanelAnimated(true), 10);
  }, [closeOrganizeDropdown]);

  const handleOpenCreateAssignment = useCallback(() => {
    closeOrganizeDropdown();
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
    [selectedCollection, addFolder, closeCreatePanel]
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
          values.weighting
        );
        closeCreatePanel();
      } catch (error) {
        console.error("Failed to create assignment:", error);
        closeCreatePanel();
      }
    },
    [selectedCollection, addFolder, closeCreatePanel]
  );

  // Add menu item handlers
  const handleUploadFile = useCallback(() => {
    closeAddDropdown();
    fileInputRef.current?.click();
  }, [closeAddDropdown]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0 || !selectedCollection) return;

      for (const file of files) {
        try {
          await uploadDocument(file, selectedCollection);
        } catch (error) {
          console.error("Failed to upload file:", error);
        }
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [selectedCollection, uploadDocument]
  );

  const handleAddPage = useCallback(async () => {
    if (!selectedCollection) return;
    closeAddDropdown();
    const content = getCollectionContent(selectedCollection);
    const position = content.folders.length + content.documents.length;
    const doc = await createNotesDocument(selectedCollection, null, position, "");
    router.push(`/open/doc/${doc.id}`);
    onDocumentSelect?.();
  }, [selectedCollection, getCollectionContent, createNotesDocument, router, closeAddDropdown, onDocumentSelect]);

  const handleAddFlashcards = useCallback(async () => {
    if (!selectedCollection) return;
    closeAddDropdown();
    const content = getCollectionContent(selectedCollection);
    const position = content.folders.length + content.documents.length;
    const doc = await createFlashcardDocument([], selectedCollection, null, position, "Untitled Flashcards");
    router.push(`/open/doc/${doc.id}`);
    onDocumentSelect?.();
  }, [selectedCollection, getCollectionContent, createFlashcardDocument, router, closeAddDropdown, onDocumentSelect]);

  const handleAddPractice = useCallback(async () => {
    if (!selectedCollection) return;
    closeAddDropdown();
    const content = getCollectionContent(selectedCollection);
    const position = content.folders.length + content.documents.length;
    const doc = await createPracticeDocument([], selectedCollection, null, position, "Untitled Practice Test");
    router.push(`/open/doc/${doc.id}`);
    onDocumentSelect?.();
  }, [selectedCollection, getCollectionContent, createPracticeDocument, router, closeAddDropdown, onDocumentSelect]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Header with module dropdown */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        <MobileModuleDropdown
          collections={collections}
          selectedCollection={selectedCollectionObj}
          onCollectionSelect={handleCollectionSelect}
          onAddCollection={handleAddModule}
        />
      </div>

      {/* Section header with Add and Organize buttons */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-[#F2F2F7] flex items-center justify-between">
        <span className="text-[15px] text-gray-500 font-medium font-rounded-bold">Docs</span>

        {selectedCollection && (
          <div className="flex items-center gap-1">
            {/* Add button */}
            <button
              ref={addButtonRef}
              onClick={openAddDropdown}
              className="flex items-center gap-1 px-3 py-2 rounded-lg active:bg-[#F2F2F7]"
            >
              <svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M7.63672 14.6562H12.998V20.0176C12.998 20.5625 13.4463 21.0195 14 21.0195C14.5537 21.0195 15.002 20.5625 15.002 20.0176V14.6562H20.3633C20.9082 14.6562 21.3652 14.208 21.3652 13.6543C21.3652 13.1006 20.9082 12.6523 20.3633 12.6523H15.002V7.29102C15.002 6.74609 14.5537 6.28906 14 6.28906C13.4463 6.28906 12.998 6.74609 12.998 7.29102V12.6523H7.63672C7.0918 12.6523 6.63477 13.1006 6.63477 13.6543C6.63477 14.208 7.0918 14.6562 7.63672 14.6562Z"
                  fill="#1C1C1E"
                />
              </svg>
              <span className="text-[14px] font-rounded-bold text-[#1C1C1E]">Add</span>
            </button>

            {/* Organize button */}
            <button
              ref={organizeButtonRef}
              onClick={openOrganizeDropdown}
              className="flex items-center gap-1 px-3 py-2 rounded-lg active:bg-[#F2F2F7]"
            >
              <svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M6.81055 21.7578H21.4092C23.0879 21.7578 24.0635 20.7822 24.0635 18.9014V9.86621C24.0635 7.98535 23.0791 7.00977 21.1807 7.00977H13.0068C12.374 7.00977 12.0049 6.86035 11.5215 6.46484L11.0117 6.06055C10.3965 5.55078 9.93945 5.38379 9.02539 5.38379H6.53809C4.89453 5.38379 3.92773 6.3418 3.92773 8.1875V18.9014C3.92773 20.7822 4.91211 21.7578 6.81055 21.7578ZM5.65039 8.33691C5.65039 7.52832 6.08984 7.10645 6.88086 7.10645H8.56836C9.19238 7.10645 9.55273 7.24707 10.0449 7.65137L10.5547 8.06445C11.1611 8.56543 11.6357 8.73242 12.5498 8.73242H21.084C21.8926 8.73242 22.3408 9.1543 22.3408 10.0156V10.5254H5.65039V8.33691ZM6.91602 20.0352C6.09863 20.0352 5.65039 19.6133 5.65039 18.7607V12.0459H22.3408V18.7607C22.3408 19.6133 21.8926 20.0352 21.084 20.0352H6.91602Z"
                  fill="#1C1C1E"
                />
              </svg>
              <span className="text-[14px] font-rounded-bold text-[#1C1C1E]">Organize</span>
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/*,text/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Add dropdown portal */}
      {isAddDropdownOpen && typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[10000]" onClick={closeAddDropdown} />
            <div
              className="fixed w-[200px] bg-white/95 backdrop-blur-[16px] rounded-[12px] shadow-[0_0_16px_rgba(0,0,0,0.16)] flex flex-col border border-white p-2 gap-1 z-[10001]"
              style={{
                top: addButtonRef.current?.getBoundingClientRect().bottom ?? 0 + 4,
                left: Math.min(
                  addButtonRef.current?.getBoundingClientRect().left ?? 0,
                  window.innerWidth - 208
                ),
              }}
            >
              {/* Upload */}
              <button
                onClick={handleUploadFile}
                className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 active:bg-[#F2F2F7] text-left"
              >
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M14 21.5381C14.5625 21.5381 14.958 21.1426 14.958 20.5625V12.3799L14.8701 10.5342L17.2168 13.1094L19.0273 14.8848C19.2031 15.0605 19.4492 15.1748 19.7217 15.1748C20.249 15.1748 20.6445 14.7793 20.6445 14.2344C20.6445 13.9795 20.5391 13.7422 20.3281 13.5312L14.7119 7.96777C14.5713 7.81836 14.3955 7.71289 14.2021 7.67773H19.792C20.3369 7.67773 20.7324 7.27344 20.7324 6.72852C20.7324 6.18359 20.3369 5.7793 19.792 5.7793H8.18164C7.64551 5.7793 7.25879 6.18359 7.25879 6.72852C7.25879 7.27344 7.64551 7.67773 8.18164 7.67773H13.7891C13.5957 7.71289 13.4199 7.81836 13.2793 7.96777L7.66309 13.5312C7.45215 13.7422 7.35547 13.9795 7.35547 14.2344C7.35547 14.7793 7.74219 15.1748 8.27832 15.1748C8.55078 15.1748 8.78809 15.0693 8.97266 14.8848L10.7744 13.1094L13.1211 10.5254L13.0332 12.3799V20.5625C13.0332 21.1426 13.4287 21.5381 14 21.5381Z"
                    fill="#05B0FF"
                  />
                </svg>
                Upload file
              </button>

              <div className="h-px bg-[#F2F2F7] my-1" />

              {/* Page */}
              <button
                onClick={handleAddPage}
                className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 active:bg-[#F2F2F7] text-left"
              >
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M6.44141 14.542C6.73145 14.498 7.0127 14.4717 7.31152 14.4717C7.60156 14.4717 7.8916 14.498 8.19043 14.5508V7.1416C8.19043 6.3418 8.6123 5.89355 9.46484 5.89355H13.1914V10.6748C13.1914 11.9492 13.8154 12.5645 15.0811 12.5645H19.792V20.1758C19.792 20.9844 19.3701 21.4238 18.5176 21.4238H12.9365C12.8311 22.0566 12.5938 22.6543 12.2686 23.1816H18.6758C20.5654 23.1816 21.541 22.1885 21.541 20.29V12.3096C21.541 11.0791 21.3828 10.5166 20.6182 9.73438L16.0215 5.06738C15.2744 4.31152 14.6592 4.13574 13.5518 4.13574H9.30664C7.42578 4.13574 6.44141 5.12891 6.44141 7.03613V14.542ZM14.7207 10.5078V6.12207L19.5547 11.0264H15.248C14.8789 11.0264 14.7207 10.8682 14.7207 10.5078ZM7.32031 24.7812C9.78125 24.7812 11.8467 22.7246 11.8467 20.2461C11.8467 17.7676 9.79883 15.7197 7.32031 15.7197C4.8418 15.7197 2.79395 17.7676 2.79395 20.2461C2.79395 22.7334 4.8418 24.7812 7.32031 24.7812ZM4.44629 20.2461C4.44629 19.8857 4.69238 19.6484 5.05273 19.6484H6.71387V17.9873C6.71387 17.627 6.95117 17.3809 7.32031 17.3809C7.68945 17.3809 7.92676 17.627 7.92676 17.9873V19.6484H9.58789C9.94824 19.6484 10.1855 19.8857 10.1855 20.2461C10.1855 20.6152 9.94824 20.8525 9.58789 20.8525H7.92676V22.5225C7.92676 22.8828 7.68945 23.1289 7.32031 23.1289C6.95117 23.1289 6.71387 22.8828 6.71387 22.5225V20.8525H5.05273C4.69238 20.8525 4.44629 20.6152 4.44629 20.2461Z"
                    fill="#05B0FF"
                  />
                </svg>
                Add page
              </button>

              {/* Flashcards */}
              <button
                onClick={handleAddFlashcards}
                className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 active:bg-[#F2F2F7] text-left"
              >
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_mobile_flashcards)">
                    <path
                      d="M5.78223 18.5938H7.33789V19.9209C7.33789 21.8018 8.32227 22.7686 10.2207 22.7686H22.2178C24.1162 22.7686 25.1006 21.793 25.1006 19.9209V11.5713C25.1006 9.69043 24.1162 8.71484 22.2178 8.71484H20.583V7.39648C20.583 5.51562 19.5898 4.54004 17.7002 4.54004H5.78223C3.88379 4.54004 2.89941 5.51562 2.89941 7.39648V15.7461C2.89941 17.6182 3.88379 18.5938 5.78223 18.5938ZM5.8877 16.8711C5.07031 16.8711 4.62207 16.4492 4.62207 15.5967V7.53711C4.62207 6.68457 5.07031 6.2627 5.8877 6.2627H17.5947C18.4033 6.2627 18.8604 6.68457 18.8604 7.53711V8.71484H10.2207C8.32227 8.71484 7.33789 9.69043 7.33789 11.5713V16.8711H5.8877ZM10.3262 21.0547C9.50879 21.0547 9.06055 20.624 9.06055 19.7715V11.7207C9.06055 10.8682 9.50879 10.4375 10.3262 10.4375H22.1123C22.9209 10.4375 23.3779 10.8682 23.3779 11.7207V19.7715C23.3779 20.624 22.9209 21.0547 22.1123 21.0547H10.3262Z"
                      fill="#05B0FF"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_mobile_flashcards">
                      <rect width="28" height="28" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                Add flashcards
              </button>

              {/* Practice Test */}
              <button
                onClick={handleAddPractice}
                className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 active:bg-[#F2F2F7] text-left"
              >
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_mobile_practice)">
                    <path
                      d="M9.31543 23.1729H18.6758C20.5566 23.1729 21.5322 22.1797 21.5322 20.29V12.3184C21.5322 11.0967 21.374 10.5342 20.6094 9.76074L15.9951 5.06738C15.2568 4.32031 14.6504 4.14453 13.5518 4.14453H9.31543C7.43457 4.14453 6.45898 5.1377 6.45898 7.02734V20.29C6.45898 22.1885 7.43457 23.1729 9.31543 23.1729ZM9.45605 21.4502C8.60352 21.4502 8.18164 21.002 8.18164 20.1846V7.13281C8.18164 6.32422 8.60352 5.86719 9.45605 5.86719H13.2002V10.6836C13.2002 11.9404 13.8242 12.5469 15.0723 12.5469H19.8096V20.1846C19.8096 21.002 19.3789 21.4502 18.5264 21.4502H9.45605ZM15.2305 11.0352C14.8701 11.0352 14.7207 10.877 14.7207 10.5166V6.10449L19.5723 11.0352H15.2305Z"
                      fill="#05B0FF"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_mobile_practice">
                      <rect width="28" height="28" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                Add practice test
              </button>
            </div>
          </>,
          document.body
        )}

      {/* Organize dropdown portal */}
      {isOrganizeDropdownOpen && typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[10000]" onClick={closeOrganizeDropdown} />
            <div
              className="fixed w-[200px] bg-white/95 backdrop-blur-[16px] rounded-[12px] shadow-[0_0_16px_rgba(0,0,0,0.16)] flex flex-col border border-white p-2 gap-1 z-[10001]"
              style={{
                top: organizeButtonRef.current?.getBoundingClientRect().bottom ?? 0 + 4,
                right: Math.max(
                  8,
                  window.innerWidth - (organizeButtonRef.current?.getBoundingClientRect().right ?? window.innerWidth)
                ),
              }}
            >
              {/* Add Folder */}
              <button
                onClick={handleOpenCreateFolder}
                className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 active:bg-[#F2F2F7] text-left"
              >
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 active:bg-[#F2F2F7] text-left"
              >
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M6.47656 21.3535H21.5146C23.4219 21.3535 24.415 20.3691 24.415 18.4883V13.5664C24.415 12.582 24.2744 12.1602 23.8174 11.5625L20.9346 7.72168C19.9062 6.35938 19.3701 5.98145 17.7881 5.98145H10.2119C8.62109 5.98145 8.08496 6.35938 7.06543 7.72168L4.17383 11.5625C3.72559 12.1602 3.58496 12.582 3.58496 13.5664V18.4883C3.58496 20.3691 4.57812 21.3535 6.47656 21.3535ZM14 15.9482C12.6641 15.9482 11.8291 14.8848 11.8291 13.7861V13.7158C11.8291 13.3115 11.583 12.9248 11.082 12.9248H5.79102C5.46582 12.9248 5.41309 12.6611 5.5625 12.4502L8.77051 8.14355C9.13965 7.63379 9.60547 7.44043 10.2031 7.44043H17.7969C18.3857 7.44043 18.8516 7.63379 19.2295 8.14355L22.4287 12.4502C22.5781 12.6611 22.5254 12.9248 22.2002 12.9248H16.9092C16.4082 12.9248 16.1709 13.3115 16.1709 13.7158V13.7861C16.1709 14.8848 15.3359 15.9482 14 15.9482Z"
                    fill="#05B0FF"
                  />
                </svg>
                Add Assignment
              </button>
            </div>
          </>,
          document.body
        )}

      {/* Create folder/assignment panel portal */}
      {creatingType && typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[10000]" onClick={closeCreatePanel} />
            <div
              ref={createPanelRef}
              className="fixed z-[10001] left-4 right-4"
              style={{
                top: "50%",
                transform: "translateY(-50%)",
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
          document.body
        )}

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {!selectedCollection ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center text-gray-500">
            <p className="font-rounded-bold text-[15px]">Select a module</p>
            <p className="text-[14px] mt-1">Choose a module from the dropdown above</p>
          </div>
        ) : orderedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center text-gray-500">
            <p className="font-rounded-bold text-[15px]">No documents yet</p>
            <p className="text-[14px] mt-1">Upload documents to get started</p>
          </div>
        ) : (
          <div className="py-2 px-2 flex flex-col gap-1">
            {/* Render items in position order (mixed folders and documents) */}
            {orderedItems.map((item, index) => {
              if (item.type === "folder") {
                const folder = item.data;
                const folderDocs = getFolderDocuments(folder.id);
                const thumbnails = folderDocs
                  .filter((d) => d.thumbnailUrl)
                  .slice(0, 4)
                  .map((d) => fileUrls.thumbnail(d.id, d.thumbnailUrl!));

                return (
                  <FolderItem
                    key={folder.id}
                    id={folder.id}
                    title={folder.name}
                    date={new Date(folder.createdAt).toLocaleDateString()}
                    index={index}
                    position={0}
                    isDragging={false}
                    isDraggedItem={false}
                    isHovered={false}
                    collectionId={folder.collectionId}
                    onMouseDown={noop}
                    onTouchStart={noop}
                    setRef={noopRef}
                    expanded={folder.isExpanded ?? true}
                    onExpandedChange={(exp) => handleSetFolderExpanded(folder.id, exp)}
                    type={folder.type}
                    deadline={folder.deadline ?? undefined}
                    weighting={folder.weighting ?? undefined}
                    hasNewDocuments={folderDocs.some((d) => !d.lastViewedAt)}
                    isEmpty={folderDocs.length === 0}
                    thumbnails={thumbnails}
                    isMobile
                  >
                    {/* Nested documents inside folder */}
                    {folderDocs.map((doc, docIndex) => (
                      <DocumentItem
                        key={doc.id}
                        isNested
                        isMobile
                        id={doc.id}
                        title={doc.name}
                        date={new Date(doc.createdAt).toLocaleDateString()}
                        index={docIndex}
                        position={0}
                        height={52}
                        isDragging={false}
                        isDraggedItem={false}
                        collectionId={doc.collectionId}
                        folderId={doc.folderId}
                        onMouseDown={noop}
                        onTouchStart={noop}
                        setRef={noopRef}
                        onClick={handleDocumentClick}
                        thumbnailUrl={doc.thumbnailUrl ?? undefined}
                        label={doc.label ?? undefined}
                        type={doc.type}
                        isNew={!doc.lastViewedAt}
                      />
                    ))}
                  </FolderItem>
                );
              } else {
                // Root document (not in a folder)
                const doc = item.data;
                return (
                  <DocumentItem
                    key={doc.id}
                    isMobile
                    id={doc.id}
                    title={doc.name}
                    date={new Date(doc.createdAt).toLocaleDateString()}
                    index={index}
                    position={0}
                    height={52}
                    isDragging={false}
                    isDraggedItem={false}
                    collectionId={doc.collectionId}
                    folderId={doc.folderId}
                    onMouseDown={noop}
                    onTouchStart={noop}
                    setRef={noopRef}
                    onClick={handleDocumentClick}
                    thumbnailUrl={doc.thumbnailUrl ?? undefined}
                    label={doc.label ?? undefined}
                    type={doc.type}
                    isNew={!doc.lastViewedAt}
                  />
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}
