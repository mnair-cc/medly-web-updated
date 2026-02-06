import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGemoji from "remark-gemoji";
import remarkGfm from "remark-gfm";
import supersub from "remark-supersub";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { preprocessLaTeX } from "@/app/_hooks/useLatexPreprocessing";
import "katex/dist/katex.min.css";
import styles from "../textbook.module.css";

interface MemoizedMarkdownProps {
  content: string;
  className?: string;
  highlightedText?: string[];
}

// Memoize the remarkPlugins and rehypePlugins arrays to prevent recreation
const remarkPlugins = [
  remarkGfm,
  remarkGemoji,
  supersub,
  [remarkMath, { singleDollarTextMath: true }],
] as const;

const rehypePlugins = [rehypeKatex, rehypeRaw] as const;

// Memoize component overrides
const components = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto max-w-[calc(100vw-112px)] my-4" data-scrollable>
      <table>{children}</table>
    </div>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 border-r border-[#f2f2f7] text-center">{children}</td>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-4 border-b border-r bg-[#F8F8FB] border-[#f2f2f7] font-medium text-center">
      {children}
    </th>
  ),
  img: ({
    src,
    alt,
    title,
  }: {
    src?: string;
    alt?: string;
    title?: string;
  }) => (
    <figure className="my-4">
      <img
        src={src}
        alt={alt || ""}
        className="max-w-full h-auto max-h-[800px] mx-auto block object-contain"
      />
      {title && (
        <figcaption className="text-center text-sm text-gray-500 mt-2">
          {title}
        </figcaption>
      )}
    </figure>
  ),
};

/**
 * Escape special regex characters in a string
 */
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Normalize highlight text to match the preprocessed content format
 * - Convert \\[...\\] to $$...$$ (display math)
 * - Convert \\(...\\) to $...$ (inline math)
 * - Convert double backslashes to single backslashes
 */
const normalizeHighlight = (highlight: string): string => {
  let normalized = highlight;

  // Convert \\[...\\] to $$...$$
  if (normalized.startsWith("\\\\[") && normalized.endsWith("\\\\]")) {
    normalized = "$$" + normalized.slice(3, -3) + "$$";
  } else if (normalized.startsWith("\\[") && normalized.endsWith("\\]")) {
    normalized = "$$" + normalized.slice(2, -2) + "$$";
  }

  // Convert \\(...\\) to $...$
  if (normalized.startsWith("\\\\(") && normalized.endsWith("\\\\)")) {
    normalized = "$" + normalized.slice(3, -3) + "$";
  } else if (normalized.startsWith("\\(") && normalized.endsWith("\\)")) {
    normalized = "$" + normalized.slice(2, -2) + "$";
  }

  // Normalize double backslashes to single (e.g., \\text -> \text)
  normalized = normalized.replace(/\\\\/g, "\\");

  return normalized;
};

/**
 * Apply highlights to text by wrapping matches in HTML mark tags
 * This works because we use rehypeRaw which allows raw HTML
 */
const applyHighlights = (text: string, highlights: string[]): string => {
  if (!highlights || highlights.length === 0) return text;

  let result = text;
  highlights.forEach((highlight) => {
    if (!highlight) return;

    // Normalize the highlight to match preprocessed content format
    const normalizedHighlight = normalizeHighlight(highlight);
    const escapedHighlight = escapeRegExp(normalizedHighlight);
    const regex = new RegExp(`(${escapedHighlight})`, "gi");
    result = result.replace(
      regex,
      '<mark class="bg-[#CDEFFF] px-1 -mx-0.5 py-0.5 rounded-[4px] text-black underline underline-offset-2 decoration-[2px] decoration-[#05B0FF]">$1</mark>'
    );
  });
  return result;
};

/**
 * MemoizedMarkdown - A performance-optimized ReactMarkdown wrapper
 *
 * This component memoizes the preprocessed content and only re-renders
 * when the actual content string changes, preventing expensive re-parsing
 * of markdown/LaTeX on unrelated parent re-renders.
 */
const MemoizedMarkdown: React.FC<MemoizedMarkdownProps> = React.memo(
  ({ content, className, highlightedText = [] }) => {
    // Memoize the preprocessed LaTeX content with highlights applied
    const processedContent = useMemo(() => {
      let processed = preprocessLaTeX(content);

      // Apply highlights after LaTeX preprocessing
      if (highlightedText.length > 0) {
        processed = applyHighlights(processed, highlightedText);
      }
      return processed;
    }, [content, highlightedText]);

    return (
      <ReactMarkdown
        className={`${styles.markdownContent} !text-[15px] !font-sans ${className || ""}`}
        remarkPlugins={remarkPlugins as any}
        rehypePlugins={rehypePlugins as any}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    );
  }
);

MemoizedMarkdown.displayName = "MemoizedMarkdown";

export default MemoizedMarkdown;
