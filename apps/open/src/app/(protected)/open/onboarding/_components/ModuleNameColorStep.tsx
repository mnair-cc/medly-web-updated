"use client";

import { useState, useEffect, useRef } from "react";
import ColorPicker from "./ColorPicker";
import { useModuleSuggestions } from "../../_hooks/useModuleSuggestions";
import type { Module } from "../../_types/universityApi";

interface ModuleNameColorStepProps {
  moduleName: string;
  moduleColor: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  universityId: number | null;
  courseId: number | null;
  year: string;
}

// Convert year string to number for API
function parseYearToNumber(year: string): number | null {
  if (!year) return null;
  if (year === "masters" || year === "phd") return null;
  if (year === "4+") return 4;
  const parsed = parseInt(year, 10);
  return isNaN(parsed) ? null : parsed;
}

export default function ModuleNameColorStep({
  moduleName,
  moduleColor,
  onNameChange,
  onColorChange,
  universityId,
  courseId,
  year,
}: ModuleNameColorStepProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const yearNumber = parseYearToNumber(year);
  const { modules } = useModuleSuggestions(moduleName, {
    universityId,
    courseId,
    year: yearNumber,
  });

  // Reset highlighted index when results change or dropdown closes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [modules, isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll("button");
      items[highlightedIndex]?.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
  }, [highlightedIndex]);

  // Update dropdown position
  useEffect(() => {
    const updatePosition = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNameChange(e.target.value);
    setIsOpen(true);
  };

  const handleModuleSelect = (module: Module) => {
    const displayName = module.module_code
      ? `${module.module_title} (${module.module_code})`
      : module.module_title;
    onNameChange(displayName);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || modules.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < modules.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < modules.length) {
          handleModuleSelect(modules[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Only show dropdown if there are results
  const shouldShowDropdown = isOpen && modules.length > 0;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-full py-5 px-4 border rounded-2xl text-center bg-[#F9F9FB] focus:outline-[#05B0FF] font-medium border-[#E6E6E6]"
          value={moduleName}
          placeholder="Enter your module name"
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />

        {shouldShowDropdown && (
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white border border-[#E6E6E6] rounded-2xl shadow-lg max-h-60 overflow-y-auto"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            {modules.map((module, index) => (
              <button
                key={module.id}
                type="button"
                className={`w-full px-4 py-3 text-left first:rounded-t-2xl last:rounded-b-2xl ${
                  index === highlightedIndex ? "bg-[#F0F0F5]" : "hover:bg-[#F9F9FB]"
                }`}
                onClick={() => handleModuleSelect(module)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="font-medium">{module.module_title}</div>
                <div className="text-sm text-gray-500">
                  {module.module_code && `${module.module_code} • `}
                  {module.module_type && `${module.module_type} • `}
                  Year {module.year}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-gray-500">Choose a colour</p>
        <ColorPicker value={moduleColor} onChange={onColorChange} />
      </div>
    </div>
  );
}
