/**
 * Shared document type icons used across the sidebar and mobile input bar.
 * Based on the chip icons from DocumentItem.tsx
 */

import React from "react";

// Document types that have icons
export type DocumentType = "document" | "practice" | "flashcards" | "notes" | "canvas";
export type DocumentLabel = "slides" | "syllabus" | "assignment" | "notes" | "reading" | "practice" | "flashcards";

// Icon types that we actually render
export type IconType = "practice" | "flashcards" | "notes" | "slides" | "document";

// Icon configuration with colors
export const ICON_CONFIG: Record<IconType, { bg: string; color: string }> = {
  slides: {
    bg: "#F2493D",
    color: "white",
  },
  practice: {
    bg: "#1FADFF",
    color: "white",
  },
  flashcards: {
    bg: "#05B0FF",
    color: "white",
  },
  notes: {
    bg: "#1FADFF",
    color: "white",
  },
  document: {
    bg: "#8E8E93",
    color: "white",
  },
};

// Helper to determine which icon type to show
export function getIconType(docType: DocumentType | undefined, label: DocumentLabel | undefined): IconType {
  // For user-created types: practice, flashcards, notes
  if (docType === "practice" || docType === "flashcards" || docType === "notes") {
    return docType;
  }
  // For uploaded documents with slides label
  if (label === "slides") {
    return "slides";
  }
  if (label === "notes") {
    return "notes";
  }
  // Default to document icon
  return "document";
}

// Slides icon (presentation)
export const SlidesIcon = ({ color = "white", size = 12 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 19" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.8916 14.6953H4.52637V16.0225C4.52637 17.9033 5.51953 18.8877 7.42676 18.8877H20.3027C22.2012 18.8877 23.2031 17.9033 23.2031 16.0225V7.04883C23.2031 5.16797 22.2012 4.18359 20.3027 4.18359H18.668V2.86523C18.668 0.984375 17.6748 0 15.7764 0H2.8916C0.984375 0 0 0.984375 0 2.86523V11.8301C0 13.7197 0.984375 14.6953 2.8916 14.6953ZM3.00586 12.9463C2.19727 12.9463 1.74902 12.5244 1.74902 11.6719V3.02344C1.74902 2.1709 2.19727 1.75781 3.00586 1.75781H15.6621C16.4619 1.75781 16.9189 2.1709 16.9189 3.02344V4.18359H7.42676C5.51953 4.18359 4.52637 5.16797 4.52637 7.04883V12.9463H3.00586ZM7.54102 17.1299C6.72363 17.1299 6.28418 16.708 6.28418 15.8643V7.20703C6.28418 6.36328 6.72363 5.94141 7.54102 5.94141H20.1885C20.9971 5.94141 21.4453 6.36328 21.4453 7.20703V15.8643C21.4453 16.708 20.9971 17.1299 20.1885 17.1299H7.54102Z" fill={color} />
  </svg>
);

// Practice/Flashcards icon (stacked cards)
export const CardsIcon = ({ color = "white", size = 12 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 23 19" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.3184 14.0537C21.2168 14.0537 22.2012 13.0869 22.2012 11.2061L22.2012 2.85645C22.2012 0.975586 21.2168 -4.30284e-08 19.3184 -1.26012e-07L7.40039 -6.46963e-07C5.51074 -7.29562e-07 4.51758 0.975585 4.51758 2.85644L4.51758 4.1748L2.88281 4.1748C0.984375 4.1748 -2.25515e-07 5.15918 -3.07346e-07 7.03125L-6.72319e-07 15.3809C-7.5415e-07 17.2529 0.984374 18.2373 2.88281 18.2373L14.8799 18.2373C16.7783 18.2373 17.7627 17.2617 17.7627 15.3809L17.7627 14.0537L19.3184 14.0537ZM6.24023 2.99707C6.24023 2.14453 6.69727 1.72266 7.50586 1.72266L19.2129 1.72266C20.0303 1.72266 20.4785 2.14453 20.4785 2.99707L20.4785 11.0566C20.4785 11.9092 20.0303 12.3311 19.2129 12.3311L17.7627 12.3311L17.7627 7.03125C17.7627 5.15039 16.7783 4.1748 14.8799 4.1748L6.24023 4.1748L6.24023 2.99707ZM14.7744 16.5146L2.98828 16.5146C2.17969 16.5146 1.72266 16.084 1.72266 15.2314L1.72266 7.18066C1.72266 6.32812 2.17969 5.89746 2.98828 5.89746L14.7744 5.89746C15.5918 5.89746 16.04 6.32812 16.04 7.18066L16.04 15.2314C16.04 16.084 15.5918 16.5146 14.7744 16.5146Z"
      fill={color} />
  </svg>
);

// Notes icon (document with lines)
export const NotesIcon = ({ color = "white", size = 12 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.86523 19.0459H12.2344C14.124 19.0459 15.0996 18.0527 15.0996 16.1543V8.17383C15.0996 6.94336 14.9414 6.38086 14.1768 5.59863L9.58008 0.931641C8.83301 0.175781 8.21777 0 7.11035 0H2.86523C0.984375 0 0 0.993164 0 2.90039V16.1543C0 18.0527 0.984375 19.0459 2.86523 19.0459ZM3.01465 17.2881C2.1709 17.2881 1.74902 16.8486 1.74902 16.04V3.00586C1.74902 2.20605 2.1709 1.75781 3.02344 1.75781H6.75V6.53906C6.75 7.81348 7.37402 8.42871 8.63965 8.42871H13.3506V16.04C13.3506 16.8486 12.9287 17.2881 12.0762 17.2881H3.01465ZM8.80664 6.89062C8.4375 6.89062 8.2793 6.73242 8.2793 6.37207V1.98633L13.1133 6.89062H8.80664ZM10.6436 10.7314H4.29785C3.96387 10.7314 3.72656 10.9688 3.72656 11.2764C3.72656 11.5928 3.96387 11.8389 4.29785 11.8389H10.6436C10.96 11.8389 11.1973 11.5928 11.1973 11.2764C11.1973 10.9688 10.96 10.7314 10.6436 10.7314ZM10.6436 13.667H4.29785C3.96387 13.667 3.72656 13.9131 3.72656 14.2295C3.72656 14.5371 3.96387 14.7744 4.29785 14.7744H10.6436C10.96 14.7744 11.1973 14.5371 11.1973 14.2295C11.1973 13.9131 10.96 13.667 10.6436 13.667Z"
      fill={color} />
  </svg>
);

// Generic document icon
export const DocumentIcon = ({ color = "white", size = 12 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.86523 19.0459H12.2344C14.124 19.0459 15.0996 18.0527 15.0996 16.1543V8.17383C15.0996 6.94336 14.9414 6.38086 14.1768 5.59863L9.58008 0.931641C8.83301 0.175781 8.21777 0 7.11035 0H2.86523C0.984375 0 0 0.993164 0 2.90039V16.1543C0 18.0527 0.984375 19.0459 2.86523 19.0459ZM3.01465 17.2881C2.1709 17.2881 1.74902 16.8486 1.74902 16.04V3.00586C1.74902 2.20605 2.1709 1.75781 3.02344 1.75781H6.75V6.53906C6.75 7.81348 7.37402 8.42871 8.63965 8.42871H13.3506V16.04C13.3506 16.8486 12.9287 17.2881 12.0762 17.2881H3.01465ZM8.80664 6.89062C8.4375 6.89062 8.2793 6.73242 8.2793 6.37207V1.98633L13.1133 6.89062H8.80664Z"
      fill={color} />
  </svg>
);

// Get the icon component for a given type
export function getDocumentIcon(iconType: IconType, props?: { color?: string; size?: number }) {
  switch (iconType) {
    case "slides":
      return <SlidesIcon {...props} />;
    case "practice":
    case "flashcards":
      return <CardsIcon {...props} />;
    case "notes":
      return <NotesIcon {...props} />;
    case "document":
    default:
      return <DocumentIcon {...props} />;
  }
}

// Combined component that renders the icon with its background chip
interface DocumentTypeChipProps {
  type?: DocumentType;
  label?: DocumentLabel;
  size?: "small" | "medium";
}

export function DocumentTypeChip({ type, label, size = "small" }: DocumentTypeChipProps) {
  const iconType = getIconType(type, label);
  const config = ICON_CONFIG[iconType];
  const iconSize = size === "small" ? 12 : 16;
  const chipSize = size === "small" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div
      className={`${chipSize} rounded-[2px] flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: config.bg }}
    >
      {getDocumentIcon(iconType, { color: config.color, size: iconSize })}
    </div>
  );
}
