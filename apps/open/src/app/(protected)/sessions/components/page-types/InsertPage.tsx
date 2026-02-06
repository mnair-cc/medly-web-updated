import React, { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGemoji from "remark-gemoji";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import supersub from "remark-supersub";
import styles from "../paper.module.css";
import { preprocessLaTeX } from "@/app/_hooks/useLatexPreprocessing";

const InsertPage = ({
  insertText,
  highlightedText,
  hideLineNumbers,
}: {
  insertText: string;
  highlightedText: string[];
  hideLineNumbers: boolean;
}) => {
  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights || !highlights.length) {
      return text;
    }

    // Escape all regex special characters, including colons
    const escapedHighlights = highlights.map((h) =>
      h.replace(/[[\]{}()*+?.\\^$|]/g, "\\$&")
    );

    // Create a regex that matches any of the highlight strings (removed 'i' flag)
    const highlightRegex = new RegExp(`(${escapedHighlights.join("|")})`, "g");

    const parts = text.split(highlightRegex);
    return parts.map((part, index) => {
      // Case-sensitive comparison (removed toLowerCase)
      const isHighlighted = highlights.some((highlight) => part === highlight);

      return isHighlighted ? (
        <span
          key={`${part}-${index}`}
          className="bg-[#9ADFFF] px-1 -mx-1 py-0.25 -my-0.25 rounded-sm text-black"
        >
          {part}
        </span>
      ) : (
        part
      );
    });
  };

  // Process content but without line number calculations yet
  const [content, setContent] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const [lineNumbers, setLineNumbers] = useState<
    { number: number; top: number }[]
  >([]);
  const [lineHeight, setLineHeight] = useState(21); // Default line height

  useEffect(() => {
    // Prepare content for rendering
    const processedContent = preprocessLaTeX(insertText.replace(/\n/g, "\n\n"));
    setContent(processedContent);
  }, [insertText]);

  // Calculate visual line numbers after content renders
  useEffect(() => {
    if (contentRef.current) {
      // Need to wait for content to render fully
      setTimeout(() => {
        calculateVisualLineNumbers();
      }, 300);
    }
  }, [content]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      calculateVisualLineNumbers();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const calculateVisualLineNumbers = () => {
    if (!contentRef.current) return;

    const contentElement = contentRef.current;
    const paragraphs = contentElement.querySelectorAll("p");
    const calculatedLineNumbers: { number: number; top: number }[] = [];

    // Get the computed style for font size and line height from the content
    if (paragraphs.length > 0) {
      const computedStyle = window.getComputedStyle(paragraphs[0]);
      // If line-height is set as a unitless value or with 'em', we need to calculate it
      // based on the font size
      const fontSize = parseInt(computedStyle.fontSize);
      let computedLineHeight = parseInt(computedStyle.lineHeight);

      if (isNaN(computedLineHeight) || computedLineHeight === 0) {
        // If line-height is not directly available in pixels, use the 1.4 value from CSS
        computedLineHeight = Math.round(fontSize * 1.4);
      }

      if (!isNaN(computedLineHeight) && computedLineHeight > 0) {
        setLineHeight(computedLineHeight);
      }
    }

    let lineCount = 1;

    paragraphs.forEach((paragraph) => {
      // Get paragraph position and dimensions
      const paragraphRect = paragraph.getBoundingClientRect();
      const contentRect = contentElement.getBoundingClientRect();
      const paragraphTop = paragraphRect.top - contentRect.top;
      const paragraphHeight = paragraph.offsetHeight;

      // Calculate number of lines in this paragraph
      const linesInParagraph = Math.max(
        1,
        Math.round(paragraphHeight / lineHeight)
      );

      // Only add a line number for the first line of each paragraph
      calculatedLineNumbers.push({
        number: lineCount,
        top: paragraphTop,
      });

      // Increment the line counter for the next paragraph
      lineCount += linesInParagraph;
    });

    setLineNumbers(calculatedLineNumbers);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden min-w-[720px] max-w-[800px] mx-auto">
      <div className="flex flex-col flex-1 overflow-x-hidden relative px-16 py-5">
        <div ref={contentRef} className="relative">
          {/* Line numbers column */}
          {!hideLineNumbers && (
            <div className="absolute left-0 w-20 top-0 bottom-0">
              {lineNumbers.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-end w-full text-black text-right pr-5 absolute"
                  style={{
                    top: `${line.top}px`,
                    height: `${lineHeight}px`,
                  }}
                >
                  {line.number}
                </div>
              ))}
            </div>
          )}

          {/* Content with left padding to make room for line numbers */}
          <div className={`${hideLineNumbers ? "pl-0" : "pl-12"}`}>
            <ReactMarkdown
              className={styles.markdownContent}
              remarkPlugins={[
                remarkGfm,
                [remarkMath, { singleDollarTextMath: true }],
                remarkGemoji,
                supersub,
              ]}
              rehypePlugins={[rehypeKatex, rehypeRaw]}
              disallowedElements={["strikethrough"]}
              components={{
                p: ({ children }) => (
                  <p
                    className={`${hideLineNumbers ? "pl-0" : "pl-10"} pr-20 ${highlightedText.length > 0
                      ? "text-[rgba(0,0,0,0.8)]"
                      : "text-black"
                      }`}
                  >
                    {typeof children === "string"
                      ? highlightText(children, highlightedText)
                      : children}
                  </p>
                ),
                td: ({ children }) => (
                  <td className="px-4 border-r border-[#f2f2f7] text-center">
                    {typeof children === "string"
                      ? highlightText(children, highlightedText)
                      : children}
                  </td>
                ),
                th: ({ children }) => (
                  <th className="px-4 border-b border-r bg-[#F8F8FB] border-[#f2f2f7] font-medium text-center">
                    {typeof children === "string"
                      ? highlightText(children, highlightedText)
                      : children}
                  </th>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="italic p-1 text-black">
                    {typeof children === "string"
                      ? highlightText(children, highlightedText)
                      : children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsertPage;
