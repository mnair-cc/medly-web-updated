"use client";

import { FolderSuggestion } from "@/app/(protected)/open/_types/aiOrganization";
import { Folder } from "@/app/(protected)/open/_types/content";
import { Check, X } from "lucide-react";
import FolderIcon from "@/app/_components/icons/FolderIcon";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface FolderSuggestionBadgeProps {
  suggestion: FolderSuggestion;
  onAccept: () => void;
  onReject: () => void;
  folders?: Folder[];
  currentFolderId?: string | null;
  onSelectFolder?: (folderId: string | null) => void;
}

/**
 * Badge shown on documents when AI suggests a different folder
 * Appears when user drags to specific location but AI disagrees
 */
export default function FolderSuggestionBadge({
  suggestion,
  onAccept,
  onReject,
  folders = [],
  currentFolderId,
  onSelectFolder,
}: FolderSuggestionBadgeProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // Calculate menu position
  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!folders?.length || !onSelectFolder) return;

    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSelectFolder = (folderId: string | null) => {
    onSelectFolder?.(folderId);
    setIsMenuOpen(false);
  };

  return (
    <>
      <div
        ref={badgeRef}
        className="absolute -right-2 top-2 z-10 flex items-center gap-1 bg-white border border-[#F2F2F7] rounded-full px-2 py-0.5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] text-xs cursor-pointer hover:shadow-[0px_2px_4px_0px_rgba(0,0,0,0.1)] transition-shadow"
        onClick={handleBadgeClick}
      >
        <FolderIcon className="w-3 h-3 text-[#5EC4FF]" />
        <span className="text-[#595959] font-rounded-bold max-w-[80px] truncate">
          {suggestion.suggestedFolderName || "Move to folder"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAccept();
          }}
          className="p-0.5 hover:bg-[#F2F2F7] rounded-full transition-colors"
          title="Accept suggestion"
        >
          <Check className="w-3 h-3 text-green-600" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReject();
          }}
          className="p-0.5 hover:bg-[#F2F2F7] rounded-full transition-colors"
          title="Dismiss suggestion"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      {/* Folder Selection Menu */}
      {isMenuOpen && folders.length > 0 && createPortal(
        <div
          className="p-2 shadow-[0_0_16px_rgba(0,0,0,0.10)] rounded-[12px] font-rounded-bold text-[14px] text-black w-[180px] bg-white flex flex-col gap-1 pointer-events-auto fixed max-h-[300px] overflow-y-auto"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 20000,
          }}
        >
          {/* Root option */}
          {/* <button
            onClick={() => handleSelectFolder(null)}
            className={`text-left px-2 py-1 rounded-[8px] hover:bg-[#F2F2F7] flex items-center gap-2 ${
              currentFolderId === null ? 'bg-[#F2F2F7]' : ''
            }`}
          >
            <div className="w-3 h-3" />
            <span>No folder</span>
          </button> */}

          {/* Folder options */}
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleSelectFolder(folder.id)}
              className={`text-left px-2 py-1 rounded-[8px] hover:bg-[#F2F2F7] flex items-center gap-2 ${
                currentFolderId === folder.id ? 'bg-[#F2F2F7]' : ''
              }`}
            >
              <FolderIcon className="w-4 h-4 text-[#41C3FF]" />
              <span className="flex-1 truncate">{folder.name}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
