import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import {
  preprocessLaTeX,
  removeAltText,
} from "@/app/_hooks/useLatexPreprocessing";

interface QuestionReviewCardProps {
  id: string;
  marks: string;
  topic: string;
  question: string;
  color: string;
  retryMarksGained?: string; // Marks gained from retry attempts (e.g., "+2")
  isFoundationGap?: boolean;
  onClick?: () => void;
}

const QuestionReviewCard = ({
  id,
  marks,
  topic,
  question,
  color,
  retryMarksGained,
  isFoundationGap,
  onClick,
}: QuestionReviewCardProps) => {
  return (
    <div
      className={`p-4 border border-[#F2F2F7] rounded-[16px] flex flex-row gap-4 ${onClick ? "cursor-pointer hover:bg-gray-50 transition-colors duration-150" : ""}`}
      onClick={onClick}
    >
      {/* Main content */}
      <div className="flex flex-col gap-2 flex-1">
        <div className="text-[13px] text-[#8E8E93] font-rounded">{topic}</div>
        <div className="flex flex-row items-center gap-2">
          <div className="font-rounded-bold">Question {id}</div>
          <span style={{ color }} className="font-rounded-bold text-sm">
            {marks} marks
          </span>
          {retryMarksGained && (
            <span
              className={`font-rounded-bold text-sm px-1.5 rounded-full ${
                isFoundationGap
                  ? "text-[#06B0FF] bg-[#06B0FF1A]"
                  : "text-[#7CC500] bg-[#ECFFCC]"
              }`}
            >
              {retryMarksGained}
            </span>
          )}
        </div>
        <div className="text-[15px] text-[#666]">
          <ReactMarkdown
            remarkPlugins={[
              remarkGfm,
              [remarkMath, { singleDollarTextMath: true }],
            ]}
            rehypePlugins={[rehypeKatex]}
          >
            {removeAltText(preprocessLaTeX(question))}
          </ReactMarkdown>
        </div>
      </div>

      {/* Arrow - vertically centered and to the right */}
      <div className="flex items-center">
        <svg
          width="25"
          height="25"
          viewBox="0 0 25 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.344 12.2037C17.3365 11.94 17.2386 11.714 17.0352 11.5106L11.1741 5.77762C11.0008 5.61189 10.7974 5.52148 10.5488 5.52148C10.0441 5.52148 9.65234 5.91323 9.65234 6.41797C9.65234 6.65904 9.75028 6.88504 9.92355 7.05831L15.197 12.2037L9.92355 17.3491C9.75028 17.5223 9.65234 17.7408 9.65234 17.9894C9.65234 18.4941 10.0441 18.8859 10.5488 18.8859C10.7899 18.8859 11.0008 18.7955 11.1741 18.6297L17.0352 12.8892C17.2461 12.6934 17.344 12.4674 17.344 12.2037Z"
            fill="black"
            fillOpacity="0.4"
          />
        </svg>
      </div>
    </div>
  );
};

export default QuestionReviewCard;
