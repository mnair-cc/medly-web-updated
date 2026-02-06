"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface FolderEditPanelProps {
  mode: "create" | "edit";
  type: "folder" | "assignment";
  initialValues?: {
    name: string;
    deadline?: string;
    weighting?: number;
  };
  onSave: (values: {
    name: string;
    deadline?: string;
    weighting?: number;
  }) => Promise<void>;
  onCancel: () => void;
  isAnimated: boolean;
}

export default function FolderEditPanel({
  mode,
  type,
  initialValues,
  onSave,
  onCancel,
  isAnimated,
}: FolderEditPanelProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [deadline, setDeadline] = useState(
    initialValues?.deadline ?? new Date().toISOString().split("T")[0]
  );
  const [weighting, setWeighting] = useState<string>(
    initialValues?.weighting !== undefined
      ? String(initialValues.weighting)
      : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input on mount
  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    const weightingNum = weighting ? parseInt(weighting, 10) : undefined;
    if (weightingNum !== undefined && (weightingNum < 0 || weightingNum > 100)) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        ...(type === "assignment" && {
          deadline: deadline || undefined,
          weighting: weightingNum,
        }),
      });
    } finally {
      setIsSaving(false);
    }
  }, [name, deadline, weighting, type, onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, handleSave]);

  const placeholder =
    type === "assignment"
      ? "Assignment name"
      : mode === "create"
        ? "Folder name"
        : "Topic or week";

  return (
    <div
      className={`p-2 shadow-[0_0_16px_rgba(0,0,0,0.10)] rounded-[12px] font-rounded-bold text-[14px] text-black w-[240px] bg-white flex flex-col gap-2 transition-all duration-150 ease-out ${
        isAnimated ? "opacity-100 scale-100" : "opacity-0 scale-90"
      }`}
      style={{ transformOrigin: "top right" }}
    >
      {/* Name input */}
      <input
        ref={nameInputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-[#F2F2F7] rounded-[8px] px-2 py-1.5 w-full outline-none focus:ring-2 focus:ring-[#05B0FF]/30"
        placeholder={placeholder}
      />

      {/* Assignment fields: deadline + weighting */}
      {type === "assignment" && (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          {/* Deadline */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] text-[#8E8E93] font-rounded">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-[#F2F2F7] rounded-[8px] px-2 py-1.5 w-full outline-none focus:ring-2 focus:ring-[#05B0FF]/30 text-[13px]"
            />
          </div>

          {/* Weighting */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] text-[#8E8E93] font-rounded">
              Weighting
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={weighting}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 100)) {
                    setWeighting(val);
                  }
                }}
                className="bg-[#F2F2F7] rounded-[8px] px-2 py-1.5 w-14 outline-none focus:ring-2 focus:ring-[#05B0FF]/30 text-[13px]"
                placeholder="0"
              />
              <span className="text-[13px] text-[#8E8E93]">%</span>
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!name.trim() || isSaving}
        className="bg-[#05B0FF] rounded-[8px] px-3 py-1.5 text-white hover:bg-[#0396D6] transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
