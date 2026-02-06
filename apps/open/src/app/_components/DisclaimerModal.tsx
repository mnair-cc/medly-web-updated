"use client";

import { useState, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

interface ModalContent {}

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
  icon?: ReactNode;
}

const DisclaimerModal = ({
  isOpen,
  onClose,
  children,
}: DisclaimerModalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[99999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] text-center shadow-[0_0_32px_rgba(0,0,0,0.2)] w-[90%] md:w-[60%] max-w-[800px] overflow-hidden relative flex flex-col items-center p-4 pt-10 md:p-20 max-h-[90%] overflow-y-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-5 right-5">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="mb-5">
          <svg
            width="35"
            height="20"
            viewBox="0 0 35 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M30.1038 2.05101C28.8099 1.26646 22.6391 -2.84896 13.246 8.34152L11.5665 10.1293C11.5665 10.1293 3.5874 6.65031 0.885153 10.4341C-1.39144 13.6219 1.13812 16.9425 3.79415 16.9425C6.7307 16.9425 9.42301 14.5389 11.3799 12.4469L17.9862 17.1349C19.9767 18.5387 22.3032 19.3333 24.6794 19.3333C27.1179 19.3201 30.253 18.5785 32.3307 15.559C36.4255 9.37153 32.7577 3.66007 30.1038 2.05101ZM4.3069 12.9558C4.17661 12.2653 4.49444 11.7323 4.95493 11.4959C6.37222 10.7683 9.70037 11.8509 9.70037 11.8509C9.70037 11.8509 7.2985 13.8999 5.69703 14.026C5.04749 14.0771 4.46021 13.7682 4.3069 12.9558ZM27.4285 9.32167C27.0553 11.4406 25.3256 14.0321 18.4091 12.2482C14.1791 11.0564 13.0916 10.5338 13.0916 10.5338C13.0916 10.5338 17.7907 5.31027 21.6438 4.69964C26.3102 3.9601 27.8018 7.20277 27.4285 9.32167Z"
              fill="black"
            />
          </svg>
        </div>

        <h1 className="text-3xl mb-2 font-rounded-bold mx-4 md:mx-0">
          Medly is giving me incorrect or confusing answers.
        </h1>

        <div className="text-left w-full mb-4">
          <ReactMarkdown
            components={{
              p: ({ node, ...props }) => (
                <p className="mb-3 text-base" {...props} />
              ),
              h1: ({ node, ...props }) => (
                <h2 className="mt-10 mb-2 text-base font-medium" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-5 mb-3" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal pl-5 mb-3" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="mb-1 text-base" {...props} />
              ),
            }}
          >
            {`# What is going on?

In an attempt to be a helpful tutor, Medly can occasionally give you incorrect or confusing feedback on your work, especially for:

- Complex calculation problems
- Questions with multiple valid approaches
- Unconventional but correct solution methods
- Answers requiring specific scientific terminology

# Why does this happen?
Our AI is powerful but not perfect. It:
- May misunderstand your approach if steps aren't clearly shown
- Cannot fully replicate a teacher's judgment and experience
- Sometimes struggles with evaluating mathematical notation


# What can you do?
If you think the AI feedback is wrong:
- Trust your understanding if you're confident in your solution
- Check your work against textbook examples
- Try explaining your method differently
- Ask a teacher for verification when important
- Let us know through the report button

# Our commitment
We continuously improve Medly's AI tutoring capabilities based on your feedback. While AI tutoring provides immediate guidance, it's designed to supplement rather than replace teacher instruction.
            `}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DisclaimerModal;
