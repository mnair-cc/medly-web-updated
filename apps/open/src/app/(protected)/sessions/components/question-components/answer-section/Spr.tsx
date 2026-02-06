import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";

// Convert basic math expressions to LaTeX format
const convertToLatex = (input: string): string => {
  if (!input || typeof input !== "string") return "";

  let latex = input.trim();

  // Convert simple fractions like "2/3" to "\frac{2}{3}"
  latex = latex.replace(
    /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g,
    "\\frac{$1}{$2}"
  );

  // Convert negative numbers to proper LaTeX format
  latex = latex.replace(/^-/, "-");

  // Wrap in dollar signs for inline math rendering
  return `$${latex}$`;
};

const Spr = ({
  userAnswer,
  setUserAnswer,
  isMarked,
  correctAnswer,
  explanation,
}: {
  userAnswer: string | string[] | { left?: string; right?: string } | undefined;
  setUserAnswer: (
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
  isMarked: boolean;
  correctAnswer: string;
  explanation: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      {!isMarked && (
        <div
          className={`w-32 bg-[#F7F7FB] rounded-[16px] border p-4 cursor-text transition-all duration-200 ${isFocused
            ? "border-blue-500 ring-2 ring-blue-200"
            : "border-[#EFEFF6] hover:border-gray-300"
            }`}
          onClick={handleContainerClick}
        >
          <input
            ref={inputRef}
            type="text"
            className="border-b border-[#EFEFF6] bg-transparent focus:outline-none w-full text-2xl"
            value={userAnswer as string}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => {
              // Only allow digits, forward slash, decimal point, and minus sign
              const sanitized = e.target.value.replace(/[^0-9/.-]/g, "");
              // Limit to 6 characters for negative numbers (including -), 5 for positive
              const maxLength = sanitized.startsWith("-") ? 6 : 5;
              const limited = sanitized.slice(0, maxLength);
              setUserAnswer(limited);
            }}
            disabled={isMarked}
          />
        </div>
      )}

      <div className="flex items-end h-10">
        <div className="flex items-end h-10 font-bold">
          {isMarked ? "Your answer:" : "Answer preview:"}
          {(userAnswer as string) && (
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
                [remarkMath, { singleDollarTextMath: true }],
              ]}
              rehypePlugins={[rehypeKatex]}
              className="inline-block text-xl ml-1"
            >
              {convertToLatex(userAnswer as string)}
            </ReactMarkdown>
          )}
        </div>

      </div>
      {isMarked && (
        <>
          <div className="flex items-end h-10 font-bold">
            Correct answer:
            {(correctAnswer) && (
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                  [remarkMath, { singleDollarTextMath: true }],
                ]}
                rehypePlugins={[rehypeKatex]}
                className="inline-block text-xl ml-1"
              >
                {convertToLatex(correctAnswer)}
              </ReactMarkdown>
            )}
          </div>

          {(explanation && isMarked) && (
            <div className="flex items-end h-10 font-bold">
              Explanation:
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                  [remarkMath, { singleDollarTextMath: true }],
                ]}
                rehypePlugins={[rehypeKatex]}
                className="inline-block text-xl ml-1"
              >
                {convertToLatex(explanation)}
              </ReactMarkdown>
            </div>
          )}

        </>
      )}

    </div>
  );
};

export default Spr;
