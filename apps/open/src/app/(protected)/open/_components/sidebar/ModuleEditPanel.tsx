"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MODULE_COLORS = [
  { name: "lime", hex: "#B7F652" },
  { name: "teal", hex: "#46E790" },
  { name: "blue", hex: "#1FADFF" },
  { name: "purple", hex: "#AA64F5" },
  { name: "pink", hex: "#F6B0CE" },
] as const;

interface ModuleEditPanelProps {
  onSave: (values: { name: string; color: string }) => Promise<void>;
  onCancel: () => void;
  isAnimated: boolean;
}

export default function ModuleEditPanel({
  onSave,
  onCancel,
  isAnimated,
}: ModuleEditPanelProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1FADFF"); // Default blue
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Focus name input on mount
  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, []);

  // Close color picker on click outside
  useEffect(() => {
    if (!isColorPickerOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setIsColorPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isColorPickerOpen]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), color });
    } finally {
      setIsSaving(false);
    }
  }, [name, color, onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isColorPickerOpen) {
          setIsColorPickerOpen(false);
        } else {
          onCancel();
        }
      } else if (e.key === "Enter" && !e.shiftKey && !isColorPickerOpen) {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, handleSave, isColorPickerOpen]);

  return (
    <div
      className={`p-2 shadow-[0_0_16px_rgba(0,0,0,0.10)] rounded-[12px] font-rounded-bold text-[14px] text-black w-[240px] bg-white flex flex-col gap-2 transition-all duration-150 ease-out ${
        isAnimated ? "opacity-100 scale-100" : "opacity-0 scale-90"
      }`}
      style={{ transformOrigin: "top left" }}
    >
      {/* Color + name input row */}
      <div className="flex items-stretch gap-2">
        {/* Color button */}
        <div className="relative" ref={colorPickerRef}>
          <button
            type="button"
            className="w-8 h-full rounded-[8px] flex-shrink-0 bg-[#F2F2F7] flex items-center justify-center"
            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
            aria-label="Select color"
          >
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: color }}
            />
          </button>

          {/* Color picker dropdown */}
          {isColorPickerOpen && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-[8px] shadow-[0_0_16px_rgba(0,0,0,0.15)] flex gap-1.5 z-10">
              {MODULE_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className={`w-6 h-6 rounded-[4px] ${
                    color === c.hex ? "ring-2 ring-offset-1" : ""
                  }`}
                  style={{
                    backgroundColor: c.hex,
                    ...(color === c.hex && {
                      "--tw-ring-color": c.hex,
                    }),
                  } as React.CSSProperties}
                  onClick={() => {
                    setColor(c.hex);
                    setIsColorPickerOpen(false);
                  }}
                  aria-label={`Select ${c.name} color`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Name input */}
        <input
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-[#F2F2F7] rounded-[8px] px-2 py-1.5 flex-1 min-w-0 outline-none focus:ring-2 focus:ring-[#05B0FF]/30"
          placeholder="Module name"
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!name.trim() || isSaving}
        className="bg-[#05B0FF] rounded-[8px] px-3 py-1.5 text-white w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
