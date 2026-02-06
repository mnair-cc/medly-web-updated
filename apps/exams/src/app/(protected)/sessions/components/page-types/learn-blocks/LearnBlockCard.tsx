import React from "react";
import MemoizedMarkdown from "./MemoizedMarkdown";

interface LearnBlockCardProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const LearnBlockCard: React.FC<LearnBlockCardProps> = React.memo(
  ({ title, children, footer }) => {
    return (
      <div className="mb-6 bg-white rounded-[16px] border border-[#F2F2F7] p-8 relative md:w-[800px] mx-auto overflow-x-hidden">
        <h3 className="mb-4 [&_p]:m-0 [&_.katex]:text-[1em]">
          <MemoizedMarkdown
            content={title}
            className="!font-rounded-heavy !text-[14px] [&_p]:!font-rounded-heavy"
          />
        </h3>
        {children}
        {footer && footer}
      </div>
    );
  }
);

LearnBlockCard.displayName = "LearnBlockCard";

export default LearnBlockCard;
