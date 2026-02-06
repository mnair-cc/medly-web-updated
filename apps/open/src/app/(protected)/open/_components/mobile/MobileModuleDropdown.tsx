"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { Collection } from "@/app/(protected)/open/_types/content";

interface MobileModuleDropdownProps {
  collections: Collection[];
  selectedCollection: Collection | null;
  onCollectionSelect: (collection: Collection) => void;
  onAddCollection?: () => void;
}

/**
 * MobileModuleDropdown - A dropdown to select modules on mobile
 *
 * Shows current module with chevron, opens dropdown on tap.
 */
export default function MobileModuleDropdown({
  collections,
  selectedCollection,
  onCollectionSelect,
  onAddCollection,
}: MobileModuleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sortedCollections = [...collections].sort((a, b) => a.position - b.position);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      setIsAnimated(false);
      setTimeout(() => setIsOpen(false), 150);
    } else {
      setIsOpen(true);
      setTimeout(() => setIsAnimated(true), 10);
    }
  }, [isOpen]);

  const handleSelect = useCallback((collection: Collection) => {
    onCollectionSelect(collection);
    setIsAnimated(false);
    setTimeout(() => setIsOpen(false), 150);
  }, [onCollectionSelect]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAnimated(false);
        setTimeout(() => setIsOpen(false), 150);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside as EventListener);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside as EventListener);
    };
  }, [isOpen]);

  const displayColor = selectedCollection?.primaryColor || "#41C3FF";

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1 py-0 rounded-[12px]"
      >
        {/* Module icon */}
        <div
          className="hidden w-6 h-6 flex items-center justify-center flex-shrink-0"
          style={{ color: displayColor }}
        >
          {selectedCollection?.icon ? (
            <span className="text-[20px]">{selectedCollection.icon}</span>
          ) : (
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: displayColor }}
            />
          )}
        </div>

        {/* Module name */}
        <span className="font-rounded-bold text-[22px] text-black truncate max-w-[180px]">
          {selectedCollection?.name || "Select module"}
        </span>

        {/* Chevron */}
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 18.4883C14.3076 18.4795 14.5889 18.3652 14.8174 18.1191L21.4971 11.2812C21.6904 11.0879 21.7959 10.8418 21.7959 10.5518C21.7959 9.97168 21.3389 9.50586 20.7588 9.50586C20.4775 9.50586 20.2051 9.62012 20.0029 9.82227L14.0088 15.9834L7.99707 9.82227C7.79492 9.62891 7.53125 9.50586 7.24121 9.50586C6.66113 9.50586 6.2041 9.97168 6.2041 10.5518C6.2041 10.8418 6.30957 11.0879 6.50293 11.2812L13.1914 18.1191C13.4287 18.3652 13.6924 18.4883 14 18.4883Z" fill="#1C1C1E" />
        </svg>


      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={`absolute top-full left-0 w-[240px] max-h-[300px] overflow-y-auto bg-white border border-white rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.15)] z-50 transition-all duration-150 ${isAnimated ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          style={{ transformOrigin: "top left" }}
        >
          <div className="py-0">
            {sortedCollections.map((collection) => {
              const isSelected = selectedCollection?.id === collection.id;
              const color = collection.primaryColor || "#41C3FF";

              return (
                <button
                  key={collection.id}
                  onClick={() => handleSelect(collection)}
                  className={`w-full flex items-center gap-3 px-4 py-3 ${isSelected ? "bg-[#F7F7FA]" : "hover:bg-[#F7F7FA] active:bg-[#EDEDF0]"
                    }`}
                >
                  {/* Icon */}
                  <div
                    className="w-6 h-6 flex items-center justify-center flex-shrink-0"
                    style={{ color }}
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

                  {/* Name */}
                  <span className={`font-rounded-bold text-[15px] text-left flex-1 truncate ${isSelected ? "text-black" : "text-gray-700"
                    }`}>
                    {collection.name}
                  </span>

                  {/* Checkmark for selected */}
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M13.5 4.5L6.5 11.5L3 8"
                        stroke="#05B0FF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}

            {/* Add module option */}
            {onAddCollection && (
              <>
                <div className="h-[1px] bg-[#F2F2F7] mx-3" />
                <button
                  onClick={() => {
                    setIsAnimated(false);
                    setTimeout(() => {
                      setIsOpen(false);
                      onAddCollection();
                    }, 150);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F7FA] active:bg-[#EDEDF0]"
                >
                  <div className="w-6 h-6 flex items-center justify-center text-[#A9A9AA]">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 3V13M3 8H13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <span className="font-rounded-bold text-[15px] text-[#A9A9AA]">
                    Add module
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
