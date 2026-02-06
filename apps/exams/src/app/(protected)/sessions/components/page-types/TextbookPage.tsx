"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGemoji from "remark-gemoji";
import remarkGfm from "remark-gfm";
import supersub from "remark-supersub";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { TextbookContent } from "../../types";
import { preprocessLaTeX } from "@/app/_hooks/useLatexPreprocessing";
import ImageLightbox from "@/app/_components/ImageLightbox";
import "katex/dist/katex.min.css";
import styles from "./textbook.module.css";

const TextbookPage = ({ content }: { content: TextbookContent }) => {
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt?: string;
    title?: string;
  } | null>(null);
  // Check if content is missing or empty
  const hasContent = content && content.trim().length > 0;

  return (
    <div className="flex-1 w-full pt-16">
      <div className="flex flex-col flex-1 overflow-y-auto px-4 sm:px-12 py-8 sm:py-16 bg-white rounded-none sm:rounded-[16px] max-w-[800px] mx-auto my-0 sm:my-8 border-0 sm:border sm:border-[#F2F2F7]">
        {hasContent ? (
          <ReactMarkdown
            className={styles.markdownContent}
            remarkPlugins={[
              remarkGfm,
              remarkGemoji,
              supersub,
              [remarkMath, { singleDollarTextMath: true }],
            ]}
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={{
              table: ({ children }) => (
                <div className={styles.tableWrapper}>
                  <table>{children}</table>
                </div>
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
                    className="max-w-full h-auto max-h-[800px] mx-auto block object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => src && setLightboxImage({ src, alt, title })}
                  />
                  {title && (
                    <figcaption className="text-center text-sm text-gray-500 mt-2">
                      {title}
                    </figcaption>
                  )}
                </figure>
              ),
            }}
          >
            {preprocessLaTeX(content || "")}
          </ReactMarkdown>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 text-4xl">📚</div>
            <h2 className="text-xl font-rounded-bold text-gray-900 mb-2">
              Textbook Content Unavailable
            </h2>
            <p className="text-sm text-gray-500 max-w-md">
              We&apos;re having trouble loading the textbook content for this
              lesson. Don&apos;t worry - you can still practice the questions!
            </p>
          </div>
        )}
      </div>
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          caption={lightboxImage.title}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};

export default TextbookPage;
