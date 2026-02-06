"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLastLesson } from "@/app/_hooks/useLastLesson";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { setIntentionalHomeVisit } = useLastLesson();
  const isLearnAndPractice = pathname.includes("learn-and-practice");
  const isQuestionBank = pathname.includes("question-bank");
  const isPredictedPapers =
    pathname.includes("papers") || pathname.includes("exam-paper");
  const isSession = pathname.includes("session");
  const isLesson = pathname.includes("lessons");

  const handleHomeClick = () => {
    setIntentionalHomeVisit();
  };

  if (
    isSession ||
    isLesson ||
    !(isLearnAndPractice || isQuestionBank || isPredictedPapers)
  ) {
    return null;
  }

  return (
    <div className="md:hidden h-16 bg-white flex flex-row justify-between items-center fixed bottom-0 left-0 right-0 border-t border-gray-200">
      <Link
        href="/"
        className={`flex flex-col items-center justify-center flex-1 ${pathname === "/" ? "text-blue-600" : ""
          }`}
        onClick={handleHomeClick}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2.78662 11.3269C2.78662 11.7186 3.08796 12.0576 3.5701 12.0576C3.80364 12.0576 4.01458 11.9295 4.20292 11.7789L5.06173 11.0557V18.0618C5.06173 19.1768 5.73221 19.8397 6.88484 19.8397H17.0776C18.2227 19.8397 18.9007 19.1768 18.9007 18.0618V11.018L19.8048 11.7789C19.9856 11.9295 20.1965 12.0576 20.43 12.0576C20.8745 12.0576 21.2135 11.7789 21.2135 11.3419C21.2135 11.0858 21.1156 10.8824 20.9197 10.7167L18.9007 9.01409V5.80483C18.9007 5.46582 18.6823 5.25488 18.3433 5.25488H17.3036C16.9722 5.25488 16.7462 5.46582 16.7462 5.80483V7.20605L13.0774 4.12486C12.4219 3.57492 11.5933 3.57492 10.9378 4.12486L3.08796 10.7167C2.88456 10.8824 2.78662 11.1084 2.78662 11.3269ZM14.1697 13.4061C14.1697 13.052 13.9437 12.826 13.5896 12.826H10.4256C10.0715 12.826 9.83796 13.052 9.83796 13.4061V18.3405H7.28411C6.81703 18.3405 6.5609 18.0769 6.5609 17.6023V9.79757L11.6761 5.50349C11.8871 5.32268 12.1281 5.32268 12.3391 5.50349L17.394 9.75237V17.6023C17.394 18.0769 17.1379 18.3405 16.6708 18.3405H14.1697V13.4061Z"
            fill="currentColor"
          />
        </svg>
        <span className="text-xs mt-1">Home</span>
      </Link>
      <Link
        href={`/subjects/${pathname.split("/")[2]}/learn-and-practice`}
        className={`flex flex-col items-center justify-center flex-1 ${isLearnAndPractice ? "text-blue-600" : ""
          }`}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5.57408 13.6579C7.53278 13.6579 9.12737 12.0821 9.19643 10.1674C9.46638 10.0669 9.76144 10.0293 10 10.0293C10.2448 10.0293 10.5336 10.0669 10.8036 10.1674C10.8789 12.101 12.4672 13.6579 14.4322 13.6579C16.2967 13.6579 17.8348 12.2516 18.042 10.4499H18.8142C19.1155 10.4499 19.2285 10.2741 19.2285 10.023V9.74048C19.2285 9.48308 19.1155 9.31986 18.8142 9.31986H17.998C17.6653 7.66249 16.1963 6.40063 14.4322 6.40063C12.7434 6.40063 11.3372 7.54949 10.9229 9.09385C10.6278 8.98085 10.2825 8.93691 10 8.93691C9.71749 8.93691 9.37221 8.98085 9.07715 9.09385C8.66281 7.54949 7.25028 6.40063 5.57408 6.40063C3.81627 6.40063 2.35352 7.64994 2.01451 9.28847H1.1921C0.890765 9.28847 0.771484 9.45169 0.771484 9.70909V10.023C0.771484 10.2741 0.890765 10.4499 1.1921 10.4499H1.95801C2.16518 12.2516 3.70326 13.6579 5.57408 13.6579ZM5.57408 12.5404C4.18666 12.5404 3.06292 11.423 3.06292 10.0293C3.06292 8.64185 4.18666 7.52438 5.57408 7.52438C6.95522 7.52438 8.07896 8.64185 8.07896 10.0293C8.07896 11.423 6.96777 12.5404 5.57408 12.5404ZM14.4322 12.5404C13.0322 12.5404 11.921 11.423 11.921 10.0293C11.921 8.64185 13.0322 7.52438 14.4322 7.52438C15.8133 7.52438 16.9371 8.64185 16.9371 10.0293C16.9371 11.423 15.8133 12.5404 14.4322 12.5404Z"
            fill="currentColor"
          />
        </svg>
        <span className="text-xs mt-1 text-center">Learn</span>
      </Link>
      <Link
        href={`/subjects/${pathname.split("/")[2]}/question-bank`}
        className={`flex flex-col items-center justify-center flex-1 ${isQuestionBank ? "text-blue-600" : ""
          }`}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_1444_819)">
            <path
              d="M8.53725 17.304C8.0978 17.8627 7.37584 17.4986 7.63323 16.808L9.49777 11.8924H5.90681C5.63058 11.8924 5.42969 11.6978 5.42969 11.4404C5.42969 11.2898 5.49247 11.1579 5.60547 11.0135L11.4628 3.53655C11.9022 2.97154 12.6242 3.33566 12.3668 4.02623L10.5085 8.9481H14.0932C14.3694 8.9481 14.5703 9.13644 14.5703 9.40011C14.5703 9.55078 14.5138 9.68262 14.4008 9.82073L8.53725 17.304ZM11.061 10.8817L9.37221 14.5543L12.8376 9.95884H8.93276L10.6278 6.28627L7.15611 10.8817H11.061Z"
              fill="currentColor"
            />
          </g>
          <defs>
            <clipPath id="clip0_1444_819">
              <rect width="20" height="20" fill="white" />
            </clipPath>
          </defs>
        </svg>
        <span className="text-xs mt-1">Question Bank</span>
      </Link>
      <Link
        href={`/subjects/${pathname.split("/")[2]}/papers`}
        className={`flex flex-col items-center justify-center flex-1 ${isPredictedPapers ? "text-blue-600" : ""
          }`}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9.99373 16.2446C13.5533 16.2446 16.4914 13.3066 16.4914 9.75328C16.4914 8.31564 16.008 6.97845 15.1981 5.89865L15.7003 5.39641C15.8636 5.23319 15.9515 5.03857 15.9515 4.85024C15.9515 4.46101 15.6438 4.15339 15.2483 4.15339C15.0161 4.15339 14.8528 4.22245 14.6896 4.37939L14.2188 4.84396C13.252 4.009 12.0403 3.45654 10.722 3.2996V2.66553C10.722 2.25119 10.3955 1.91846 9.99373 1.91846C9.59822 1.91846 9.26549 2.25119 9.26549 2.66553V3.2996C6.04493 3.66999 3.50238 6.44482 3.50238 9.75328C3.50238 13.3066 6.44044 16.2446 9.99373 16.2446ZM9.99373 14.9514C7.11217 14.9514 4.80818 12.6348 4.80818 9.75328C4.80818 6.87172 7.11217 4.56145 9.98745 4.56145C12.869 4.56145 15.1856 6.87172 15.1918 9.75328C15.1981 12.6348 12.8753 14.9514 9.99373 14.9514ZM9.99373 10.8456C10.5964 10.8456 11.0798 10.356 11.0798 9.75956C11.0798 9.34521 10.8475 8.99365 10.496 8.79904V5.9112C10.496 5.6287 10.2762 5.40897 9.98745 5.40897C9.71122 5.40897 9.4915 5.6287 9.4915 5.9112V8.79904C9.13994 8.99365 8.90765 9.35149 8.90765 9.75956C8.90765 10.356 9.39105 10.8456 9.99373 10.8456Z"
            fill="currentColor"
          />
        </svg>
        <span className="text-xs mt-1">Practice Papers</span>
      </Link>
    </div>
  );
}
