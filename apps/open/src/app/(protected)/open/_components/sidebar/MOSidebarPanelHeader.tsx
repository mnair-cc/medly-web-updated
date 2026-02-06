"use client";

import FolderEditPanel from "@/app/(protected)/open/_components/sidebar/FolderEditPanel";
import { useSidebar } from "@/app/(protected)/open/_components/sidebar/MOSidebarLayoutClient";
import { useResponsive } from "@/app/_hooks/useResponsive";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface SidebarPanelHeaderProps {
  title: string;
  isHomePage?: boolean;
  primaryColor?: string;
  onCreate?: () => void;
}

export default function SidebarPanelHeader({
  title,
  isHomePage = false,
}: SidebarPanelHeaderProps) {
  const router = useRouter();
  const {
    sidebarState,
    closeSidebar,
    selectedCollection,
    getCollectionContent,
    createPracticeDocument,
    createFlashcardDocument,
    createNotesDocument,
    addFolder,
  } = useSidebar();
  const { isBelowSm } = useResponsive();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDropdownPinned, setIsDropdownPinned] = useState(false);

  // State for folder/assignment creation panel
  const [creatingType, setCreatingType] = useState<
    "folder" | "assignment" | null
  >(null);
  const [isCreatePanelAnimated, setIsCreatePanelAnimated] = useState(false);
  const createPanelRef = useRef<HTMLDivElement>(null);

  const closeDropdown = () => {
    setIsDropdownOpen(false);
    setIsDropdownPinned(false);
  };

  const closeCreatePanel = useCallback(() => {
    setIsCreatePanelAnimated(false);
    setTimeout(() => {
      setCreatingType(null);
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

  const handleCreatePractice = async () => {
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
    router.push(`/open/doc/${doc.id}`);
    closeDropdown();
  };

  const handleCreateFlashcards = async () => {
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
    router.push(`/open/doc/${doc.id}`);
    closeDropdown();
  };

  const handleAddPage = async () => {
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
    closeDropdown();
  };

  const handleOpenCreateFolder = () => {
    closeDropdown();
    setCreatingType("folder");
    setTimeout(() => setIsCreatePanelAnimated(true), 10);
  };

  const handleOpenCreateAssignment = () => {
    closeDropdown();
    setCreatingType("assignment");
    setTimeout(() => setIsCreatePanelAnimated(true), 10);
  };

  const handleCreateFolder = async (values: { name: string }) => {
    if (!selectedCollection) return;
    try {
      await addFolder(selectedCollection, values.name);
      closeCreatePanel();
    } catch (error) {
      console.error("Failed to create folder:", error);
      closeCreatePanel();
    }
  };

  const handleCreateAssignment = async (values: {
    name: string;
    deadline?: string;
    weighting?: number;
  }) => {
    if (!selectedCollection) return;
    try {
      await addFolder(
        selectedCollection,
        values.name,
        "assignment",
        undefined, // position
        values.deadline,
        values.weighting,
      );
      closeCreatePanel();
    } catch (error) {
      console.error("Failed to create assignment:", error);
      closeCreatePanel();
    }
  };

  return (
    <div className="pt-0 gap-2 flex flex-col">
      <div className="flex flex-col gap-2 pb-2 border-b border-[#F2F2F7] px-2">
        {/* Title row with chevron button */}
        <div className="flex items-center justify-between px-2 py-2">
          {/* Title - plain text */}
          <span className="text-left leading-tight font-rounded-bold text-[17px] truncate">
            {title}
          </span>

          {/* Chevron icon button - toggles sidebar (hidden in semi-open state) */}
          {sidebarState === "open" && (
            <div className="relative group flex-shrink-0">
              <button
                onClick={closeSidebar}
                className="hover:bg-[#F7F7FA] rounded-[8px] p-1"
                aria-label="Hide menu"
              >
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.2 8.4C13.6 8 13.6 7.3 13.2 6.9C12.8 6.5 12.1 6.5 11.7 6.9L5.3 13.3C4.9 13.7 4.9 14.3 5.3 14.7L11.7 21.1C12.1 21.5 12.8 21.5 13.2 21.1C13.6 20.7 13.6 20 13.2 19.6L7.6 14L13.2 8.4Z" fill="black" fillOpacity="0.85" />
                  <path d="M22.2 8.4C22.6 8 22.6 7.3 22.2 6.9C21.8 6.5 21.1 6.5 20.7 6.9L14.3 13.3C13.9 13.7 13.9 14.3 14.3 14.7L20.7 21.1C21.1 21.5 21.8 21.5 22.2 21.1C22.6 20.7 22.6 20 22.2 19.6L16.6 14L22.2 8.4Z" fill="black" fillOpacity="0.85" />
                </svg>
              </button>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 flex items-center justify-center bg-[#333333] rounded-[4px] opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-[1600]">
                <div className="font-medium text-[12px] text-white">
                  Hide menu
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Old header */}
      {false && !isBelowSm && (
        <div className="flex justify-between items-center px-2">
          {/* Left side: Close button + Title */}
          <div className="flex items-center gap-1">
            <div
              className={`relative ${
                sidebarState === "semi-open" ? "group" : ""
              }`}
            >
              <button
                className={`text-left leading-tight font-rounded-bold text-[17px] rounded-[8px] px-2 py-2 flex items-center gap-1 ${
                  sidebarState === "semi-open"
                    ? "hover:bg-[#F7F7FA] cursor-pointer"
                    : "cursor-default"
                }`}
                onClick={() => {
                  // TODO: Re-add openSidebar() from useSidebar if this code is re-enabled
                }}
              >
                <svg
                  className={`mr-2 ${
                    sidebarState === "semi-open" ? "block" : "hidden"
                  }`}
                  fill="none"
                  height="24"
                  viewBox="0 0 28 28"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.78223 10.5078H22.209C22.6484 10.5078 23.0088 10.1475 23.0088 9.70801C23.0088 9.26855 22.6484 8.91699 22.209 8.91699H5.78223C5.34277 8.91699 4.99121 9.26855 4.99121 9.70801C4.99121 10.1387 5.34277 10.5078 5.78223 10.5078ZM5.78223 14.4629H22.209C22.6484 14.4629 23.0088 14.1025 23.0088 13.6719C23.0088 13.2236 22.6484 12.8633 22.209 12.8633H5.78223C5.34277 12.8633 4.99121 13.2236 4.99121 13.6719C4.99121 14.1025 5.34277 14.4629 5.78223 14.4629ZM5.78223 18.4268H22.209C22.6484 18.4268 23.0088 18.0664 23.0088 17.6182C23.0088 17.1787 22.6484 16.8271 22.209 16.8271H5.78223C5.34277 16.8271 4.99121 17.1875 4.99121 17.6182C4.99121 18.0576 5.34277 18.4268 5.78223 18.4268Z"
                    fill="black"
                  />
                </svg>

                {title}
              </button>

              {sidebarState === "semi-open" && (
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2 py-1 flex items-center justify-center bg-[#333333] rounded-[4px] opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-[1600]">
                  <div className="font-medium text-[12px] text-white">
                    Show menu
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side: Create button with dropdown */}
          {!isHomePage && selectedCollection && (
            <div
              className="relative mr-2 z-[102]"
              onMouseEnter={() => !creatingType && setIsDropdownOpen(true)}
              onMouseLeave={() => {
                if (!isDropdownPinned) setIsDropdownOpen(false);
              }}
            >
              <button
                className="flex flex-row items-center justify-center gap-1 font-rounded-bold text-[14px] px-4 pl-2 h-9 rounded-[10px] bg-[#05B0FF] hover:bg-[#05B0FF]/80 text-white"
                onClick={() => {
                  setIsDropdownOpen(true);
                  setIsDropdownPinned(true);
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.63672 14.6562H12.998V20.0176C12.998 20.5625 13.4463 21.0195 14 21.0195C14.5537 21.0195 15.002 20.5625 15.002 20.0176V14.6562H20.3633C20.9082 14.6562 21.3652 14.208 21.3652 13.6543C21.3652 13.1006 20.9082 12.6523 20.3633 12.6523H15.002V7.29102C15.002 6.74609 14.5537 6.28906 14 6.28906C13.4463 6.28906 12.998 6.74609 12.998 7.29102V12.6523H7.63672C7.0918 12.6523 6.63477 13.1006 6.63477 13.6543C6.63477 14.208 7.0918 14.6562 7.63672 14.6562Z"
                    fill="white"
                  />
                </svg>
                New
              </button>

              {isDropdownPinned && (
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={closeDropdown}
                />
              )}

              <div
                className={`absolute top-9 right-0 w-[200px] bg-white/95 backdrop-blur-[16px] rounded-[12px] shadow-[0_0_16px_rgba(0,0,0,0.16)] flex flex-col border border-white p-2 gap-1 transition-all duration-150 ease-out z-[101] ${
                  isDropdownOpen
                    ? "opacity-100 scale-100 pointer-events-auto"
                    : "opacity-0 scale-90 pointer-events-none"
                }`}
                style={{ transformOrigin: "top right" }}
              >
                <button
                  onClick={handleCreatePractice}
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
                      d="M9.31543 23.1816H18.6846C20.5742 23.1816 21.5498 22.1885 21.5498 20.29V12.3096C21.5498 11.0791 21.3916 10.5166 20.627 9.73438L16.0303 5.06738C15.2832 4.31152 14.668 4.13574 13.5605 4.13574H9.31543C7.43457 4.13574 6.4502 5.12891 6.4502 7.03613V20.29C6.4502 22.1885 7.43457 23.1816 9.31543 23.1816ZM9.46484 21.4238C8.62109 21.4238 8.19922 20.9844 8.19922 20.1758V7.1416C8.19922 6.3418 8.62109 5.89355 9.47363 5.89355H13.2002V10.6748C13.2002 11.9492 13.8242 12.5645 15.0898 12.5645H19.8008V20.1758C19.8008 20.9844 19.3789 21.4238 18.5264 21.4238H9.46484ZM15.2568 11.0264C14.8877 11.0264 14.7295 10.8682 14.7295 10.5078V6.12207L19.5635 11.0264H15.2568Z"
                      fill="#05B0FF"
                    />
                  </svg>
                  Practice Test
                </button>

                <button
                  onClick={handleCreateFlashcards}
                  className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 hover:bg-[#F9F9FB] text-left"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_614_1247_panel)">
                      <path
                        d="M5.78223 18.5938H7.33789V19.9209C7.33789 21.8018 8.32227 22.7686 10.2207 22.7686H22.2178C24.1162 22.7686 25.1006 21.793 25.1006 19.9209V11.5713C25.1006 9.69043 24.1162 8.71484 22.2178 8.71484H20.583V7.39648C20.583 5.51562 19.5898 4.54004 17.7002 4.54004H5.78223C3.88379 4.54004 2.89941 5.51562 2.89941 7.39648V15.7461C2.89941 17.6182 3.88379 18.5938 5.78223 18.5938ZM5.8877 16.8711C5.07031 16.8711 4.62207 16.4492 4.62207 15.5967V7.53711C4.62207 6.68457 5.07031 6.2627 5.8877 6.2627H17.5947C18.4033 6.2627 18.8604 6.68457 18.8604 7.53711V8.71484H10.2207C8.32227 8.71484 7.33789 9.69043 7.33789 11.5713V16.8711H5.8877ZM10.3262 21.0547C9.50879 21.0547 9.06055 20.624 9.06055 19.7715V11.7207C9.06055 10.8682 9.50879 10.4375 10.3262 10.4375H22.1123C22.9209 10.4375 23.3779 10.8682 23.3779 11.7207V19.7715C23.3779 20.624 22.9209 21.0547 22.1123 21.0547H10.3262Z"
                        fill="#05B0FF"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_614_1247_panel">
                        <rect width="28" height="28" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                  Flashcards
                </button>

                <button
                  onClick={handleAddPage}
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
                  Add Page
                </button>

                {/* Divider */}
                <div className="h-px bg-[#F2F2F7] my-1" />

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
              </div>

              {/* Create folder/assignment panel */}
              {creatingType && (
                <>
                  <div
                    className="fixed inset-0 z-[100]"
                    onClick={closeCreatePanel}
                  />
                  <div
                    ref={createPanelRef}
                    className="absolute top-9 right-0 z-[101]"
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
                </>
              )}
            </div>
          )}
        </div>
      )}

      {isBelowSm && (
        <div className="flex justify-between items-center px-6">
          <h2 className="font-rounded-bold text-xl text-black">{title}</h2>
        </div>
      )}
    </div>
  );
}
