"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ColorPicker, { MODULE_COLORS } from "./ColorPicker";
import { useModuleSuggestions } from "../_hooks/useModuleSuggestions";
import { useMOUser } from "../_context/MOUserProvider";
import type { Module } from "../_types/universityApi";
import CrossInCircleIcon from "@/app/_components/icons/CrossInCircleIcon";

interface AddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: { name: string; color: string }) => Promise<void>;
}

// Convert year string to number for API
function parseYearToNumber(year: string | undefined): number | null {
  if (!year) return null;
  if (year === "masters" || year === "phd") return null;
  if (year === "4+") return 4;
  const parsed = parseInt(year, 10);
  return isNaN(parsed) ? null : parsed;
}

export default function AddModuleModal({
  isOpen,
  onClose,
  onSave,
}: AddModuleModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(MODULE_COLORS[2].hex); // Default blue
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Get user data for filtering suggestions
  const user = useMOUser();
  const userData = user.data as {
    universityId?: number;
    courseId?: number;
    year?: string;
  };

  // Module suggestions are filtered by user's courseId and year.
  // These fields are not currently collected during signup, so suggestions
  // may not appear. A future flow will collect this data from students.
  const { modules: rawModules } = useModuleSuggestions(
    "", // Empty search to get all suggestions based on filters
    {
      universityId: userData.universityId ?? null,
      courseId: userData.courseId ?? null,
      year: parseYearToNumber(userData.year),
    },
    { limit: 20 }
  );

  // Deduplicate modules by title to avoid showing repeated suggestions
  const modules = useMemo(() => {
    const seen = new Set<string>();
    const unique: Module[] = [];
    for (const module of rawModules) {
      if (!seen.has(module.module_title)) {
        seen.add(module.module_title);
        unique.push(module);
      }
      if (unique.length >= 8) break; // Limit to 8 unique suggestions
    }
    return unique;
  }, [rawModules]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && mounted) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, mounted]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setColor(MODULE_COLORS[2].hex);
      setIsSaving(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleSave = useCallback(async () => {
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), color });
    } finally {
      setIsSaving(false);
    }
  }, [name, color, onSave, isSaving]);

  const handleChipClick = useCallback((module: Module) => {
    const displayName = module.module_code
      ? `${module.module_title} (${module.module_code})`
      : module.module_title;
    setName(displayName);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] w-full max-w-[440px] relative shadow-[0_0_32px_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
        >
          <CrossInCircleIcon />
        </button>

        <div className="p-6 pt-12">
          {/* Title */}
          <h2 className="text-xl font-rounded-bold mb-6">
            Add Module
          </h2>

          {/* Module name input */}
          <div className="mb-4">
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full py-4 px-4 border rounded-2xl bg-[#F9F9FB] focus:outline-[#05B0FF] font-medium border-[#E6E6E6]"
              placeholder="Enter your module name"
            />
          </div>

          {/* Suggestion chips */}
          {modules.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-3">
                Suggestions
              </p>
              <div className="flex flex-wrap gap-2">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => handleChipClick(module)}
                    className="px-3 py-1.5 bg-[#F2F2F7] hover:bg-[#E8E8ED] rounded-full text-sm font-medium text-gray-700 transition-colors"
                  >
                    {module.module_title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color picker */}
          <div className="flex flex-col items-start gap-3 mb-6">
            <p className="text-sm text-gray-500">Choose a colour</p>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="w-full py-3 rounded-2xl bg-[#05B0FF] text-white font-rounded-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0396D6] transition-colors"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
