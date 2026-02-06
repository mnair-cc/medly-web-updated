"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { MAX_FILE_SIZE } from "../../_utils/convertDocument";

interface UploadStepProps {
  title: string;
  description?: string;
  uploadType: "curriculum" | "materials";
  onUpload: (file: File) => void;
}

export const UploadStep = ({
  title,
  description,
  uploadType,
  onUpload,
}: UploadStepProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes =
    uploadType === "curriculum"
      ? ".pdf,.docx,.pptx,.odt,.rtf,.txt,.html,.htm,.md,.markdown,.tex,.epub"
      : ".pdf,.docx,.pptx,.odt,.rtf,.txt,.html,.htm,.md,.markdown,.tex,.epub,.jpg,.jpeg,.png";

  const fileTypeText =
    uploadType === "curriculum"
      ? "PDF, Word, PowerPoint, or other documents"
      : "PDF, Word, PowerPoint, other documents, or images";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large. Maximum size is 50MB.");
        return;
      }

      // Validate file type for drag-drop (bypasses input accept attribute)
      const fileName = file.name.toLowerCase();
      const isSupported = acceptedTypes
        .split(",")
        .some((t) => fileName.endsWith(t));
      if (!isSupported) {
        toast.error(`Please upload a ${fileTypeText.toLowerCase()}.`);
        return;
      }

      setSelectedFile(file);
      onUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large. Maximum size is 50MB.");
        return;
      }

      setSelectedFile(file);
      onUpload(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <h1 className="text-2xl font-semibold text-center">{title}</h1>
      {description && (
        <p className="text-gray-600 text-center max-w-md">{description}</p>
      )}

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          w-full max-w-lg h-48 rounded-2xl border-2 border-dashed cursor-pointer
          flex flex-col items-center justify-center gap-3 transition-colors
          ${
            isDragging
              ? "border-[#05B0FF] bg-blue-50"
              : selectedFile
                ? "border-green-400 bg-green-50"
                : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="hidden"
        />

        {selectedFile ? (
          <>
            <div className="text-4xl">✓</div>
            <p className="font-medium text-gray-800">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">Click to change file</p>
          </>
        ) : (
          <>
            <div className="text-4xl text-gray-400">📄</div>
            <p className="font-medium text-gray-600">
              Drop your file here or click to browse
            </p>
            <p className="text-sm text-gray-400">{fileTypeText}</p>
          </>
        )}
      </div>
    </div>
  );
};
