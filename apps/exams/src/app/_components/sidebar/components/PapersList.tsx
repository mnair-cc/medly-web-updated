import Link from "next/link";
import React from "react";

export interface PapersListExamItem {
  key: string;
  label: string;
  href?: string;
  right?: React.ReactNode;
  /** Whether this item is currently active/selected (e.g., currently viewing this paper) */
  isActive?: boolean;
}

export interface PapersListExam {
  title: string;
  headerLabel?: string;
  items: PapersListExamItem[];
  /** Optional date to display above the exam card (e.g., "Monday, 27 Dec") */
  dateLabel?: string;
  /** Whether this exam is active (true) or should be greyed out (false) */
  isActive?: boolean;
}

interface PapersListProps {
  exams: PapersListExam[];
  showLock?: boolean;
  onItemClick?: (key: string) => void;
}

export default function PapersList({
  exams,
  showLock = false,
  onItemClick,
}: PapersListProps) {
  if (!exams || exams.length === 0) {
    return null;
  }

  return (
    <div className="px-4 flex flex-col overflow-x-hidden">
      {exams.map((exam, examIndex) => (
        <div key={examIndex} className="flex flex-col mb-4">
          {exam.dateLabel && (
            <div
              className={`font-rounded-bold text-[13px] mt-2 mb-3 ${
                exam.isActive === false ? "text-black/50" : "text-black"
              }`}
            >
              {exam.dateLabel}
            </div>
          )}
          <div
            className={`flex flex-col border border-[#F2F2F7] rounded-[16px] overflow-hidden ${
              exam.isActive === false ? "opacity-50" : ""
            }`}
          >
            <div className="flex flex-col p-4 bg-[#F7F7FA]">
              <div className="text-[10px] text-black">
                {exam.headerLabel || "MEDLY PRACTICE PAPER"}
              </div>
              <div className="font-rounded-bold text-[15px] text-black">
                {exam.title}
              </div>
            </div>
            <div className="flex flex-col px-4 py-2">
              {exam.items.map((item) => {
                const content = (
                  <div className="flex justify-between items-center text-black text-[14px] py-2 group transition-none duration-150 font-rounded-bold">
                    <div
                      className={`flex flex-row gap-1 items-center truncate transition-all duration-150 ${
                        item.isActive
                          ? "text-[#595959]"
                          : exam.isActive !== false
                            ? "text-[#595959]/50 group-hover:text-[#595959]"
                            : "text-[#595959]/50"
                      }`}
                    >
                      {item.label}
                      {showLock && (
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="flex-shrink-0"
                        >
                          <g clipPath="url(#clip0_298_837)">
                            <path
                              d="M9.87793 22.2148H18.1133C19.4668 22.2148 20.1436 21.5381 20.1436 20.0615V13.8389C20.1436 12.5381 19.6162 11.8613 18.5527 11.7207V9.66406C18.5527 6.32422 16.3291 4.71582 13.9912 4.71582C11.6621 4.71582 9.43848 6.32422 9.43848 9.66406V11.7207C8.375 11.8613 7.84766 12.5381 7.84766 13.8389V20.0615C7.84766 21.5381 8.51562 22.2148 9.87793 22.2148ZM11.1084 9.49707C11.1084 7.43164 12.418 6.31543 13.9912 6.31543C15.5645 6.31543 16.8828 7.43164 16.8828 9.49707V11.6943H11.1084V9.49707ZM10.1328 20.6504C9.74609 20.6504 9.55273 20.4658 9.55273 20V13.9004C9.55273 13.4346 9.74609 13.2676 10.1328 13.2676H17.8672C18.2539 13.2676 18.4385 13.4346 18.4385 13.9004V20C18.4385 20.4658 18.2539 20.6504 17.8672 20.6504H10.1328Z"
                              fill="rgba(0,0,0,0.5)"
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_298_837">
                              <rect width="28" height="28" fill="white" />
                            </clipPath>
                          </defs>
                        </svg>
                      )}
                    </div>
                    {item.right ? (
                      <div className="ml-3 flex-shrink-0">{item.right}</div>
                    ) : null}
                  </div>
                );

                // Only render as clickable link if exam is active (or isActive is undefined)
                return item.href && exam.isActive !== false ? (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => onItemClick?.(item.key)}
                    className="cursor-pointer"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={item.key} className="cursor-default">
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
