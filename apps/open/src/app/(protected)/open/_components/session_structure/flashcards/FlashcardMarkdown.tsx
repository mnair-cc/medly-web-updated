"use client";

import { FlashcardSourceReference } from "@/app/(protected)/open/_types/flashcardTypes";
import React, { useMemo } from "react";

interface FlashcardMarkdownProps {
  content: string;
  sourceReferences: FlashcardSourceReference[];
  onCitationClick?: (ref: FlashcardSourceReference) => void;
}

// Simple markdown renderer with citation support
// Supports: **bold**, *italic*, `code`, [n] citations
const FlashcardMarkdown: React.FC<FlashcardMarkdownProps> = ({
  content,
  sourceReferences,
  onCitationClick,
}) => {
  const rendered = useMemo(() => {
    // Split content by citation markers [n]
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const citationRegex = /\[(\d+)\]/g;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {renderMarkdown(content.slice(lastIndex, match.index))}
          </span>,
        );
      }

      // Add citation button
      const citationIndex = parseInt(match[1], 10);
      const ref = sourceReferences[citationIndex - 1];
      if (ref) {
        parts.push(
          <button
            key={`cite-${match.index}`}
            onClick={(e) => {
              e.stopPropagation();
              onCitationClick?.(ref);
            }}
            className="inline-flex items-center px-1 py-0.5 mx-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors align-baseline"
            title={`Page ${ref.pageIndex + 1}: "${ref.sourceSegment}"`}
          >
            [{citationIndex}]
          </button>,
        );
      } else {
        // Reference not found, show as plain text
        parts.push(<span key={`cite-${match.index}`}>[{citationIndex}]</span>);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {renderMarkdown(content.slice(lastIndex))}
        </span>,
      );
    }

    return parts.length > 0 ? parts : renderMarkdown(content);
  }, [content, sourceReferences, onCitationClick]);

  return <>{rendered}</>;
};

// Simple markdown renderer for basic formatting
function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  // Process bold **text**
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);
    const codeMatch = remaining.match(/`(.+?)`/);

    // Find the earliest match
    const matches = [
      { match: boldMatch, type: "bold" },
      { match: italicMatch, type: "italic" },
      { match: codeMatch, type: "code" },
    ]
      .filter((m) => m.match !== null)
      .sort((a, b) => (a.match!.index ?? 0) - (b.match!.index ?? 0));

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const earliest = matches[0];
    const matchObj = earliest.match!;
    const matchIndex = matchObj.index ?? 0;

    // Add text before match
    if (matchIndex > 0) {
      parts.push(remaining.slice(0, matchIndex));
    }

    // Add formatted text
    switch (earliest.type) {
      case "bold":
        parts.push(
          <strong key={`bold-${keyIndex++}`}>{matchObj[1]}</strong>,
        );
        break;
      case "italic":
        // Make sure it's not actually bold (** contains *)
        if (remaining[matchIndex + 1] !== "*") {
          parts.push(<em key={`italic-${keyIndex++}`}>{matchObj[1]}</em>);
        } else {
          parts.push(remaining.slice(matchIndex, matchIndex + matchObj[0].length));
        }
        break;
      case "code":
        parts.push(
          <code
            key={`code-${keyIndex++}`}
            className="px-1 py-0.5 bg-gray-100 rounded text-sm font-mono"
          >
            {matchObj[1]}
          </code>,
        );
        break;
    }

    remaining = remaining.slice(matchIndex + matchObj[0].length);
  }

  return parts.length === 1 && typeof parts[0] === "string"
    ? parts[0]
    : parts;
}

export default FlashcardMarkdown;
