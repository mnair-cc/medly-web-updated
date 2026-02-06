"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import Link from "next/link";
import circleConfetti from "@/app/_components/animations/circle_confetti_green.json";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  preprocessLaTeX,
  removeAltText,
} from "@/app/_hooks/useLatexPreprocessing";
import Spinner from "./Spinner";
import LockIcon from "./icons/LockIcon";

const LottieComponent = lazy(() => import("lottie-react"));

export type ButtonState =
  | "selected"
  | "filled"
  | "correct"
  | "incorrect"
  | "greyed"
  | "incomplete"
  | "picked"
  | undefined;

interface PrimaryButtonClickyProps {
  buttonState?: ButtonState;
  buttonText: string;
  description?: string;
  colorScheme?: {
    backgroundColor: string;
    primaryColor: string;
    textColor: string;
  };
  showKeyboardShortcut?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  doesStretch?: boolean;
  isLong?: boolean;
  isLoading?: boolean;
  showLockIcon?: boolean;
  isFontRounded?: boolean;
  isStrikethrough?: boolean;
  letter?: string;
  href?: string; // Add href prop for link functionality
}

const PrimaryButtonClicky = ({
  buttonState,
  buttonText,
  description,
  colorScheme,
  showKeyboardShortcut = true,
  onPress,
  disabled = false,
  doesStretch = false,
  isLong = false,
  isLoading = false,
  showLockIcon = false,
  isFontRounded = true,
  isStrikethrough = false,
  letter,
  href, // Add href to destructuring
}: PrimaryButtonClickyProps) => {
  const [isPressedDown, setIsPressedDown] = useState(false);
  const [isConfettiPlayed, setIsConfettiPlayed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getBackgroundColor = () => {
    if (colorScheme) {
      return colorScheme.backgroundColor;
    }
    switch (buttonState) {
      case "correct":
        return "#E4FFB7";
      case "selected":
        return "#DBF3FF";
      case "filled":
        return "#4BBEFF";
      case "incorrect":
        return "#FDEEEE";
      case "incomplete":
        return "#FDEBD7";
      case "picked":
        return "#F0F0F0";
      default:
        return "white";
    }
  };

  const getBorderColor = () => {
    if (colorScheme) {
      return colorScheme.primaryColor;
    }
    switch (buttonState) {
      case "correct":
        return "#7CC500";
      case "incorrect":
        return "#FF4B4C";
      case "selected":
        return "#06B0FF";
      case "filled":
        return "#06B0FF";
      case "incomplete":
        return "#FFA935";
      case "greyed":
        return "#F0F0F0";
      case "picked":
        return "#F0F0F0";
      default:
        return "#F0F0F0";
    }
  };

  const getTextColor = () => {
    if (colorScheme) {
      return colorScheme.textColor;
    }
    switch (buttonState) {
      case "correct":
        return "#7CC500";
      case "incorrect":
        return "#FF4B4C";
      case "selected":
        return "#06B0FF";
      case "filled":
        return "#FFFFFF";
      case "incomplete":
        return "#FFA935";
      case "greyed":
        return "rgba(0,0,0,0.3)";
      case "picked":
        return "transparent";
      default:
        return "rgba(0,0,0,0.8)";
    }
  };

  const getCircleBackgroundColor = () => {
    if (colorScheme) {
      return colorScheme.primaryColor;
    }
    switch (buttonState) {
      case "correct":
      case "selected":
      case "filled":
        return getBorderColor();
      case "incorrect":
        return getBorderColor();
      case "incomplete":
        return getBorderColor();
      default:
        return "transparent";
    }
  };

  const getCircleTextColor = () => {
    if (colorScheme) {
      return colorScheme.backgroundColor;
    }
    switch (buttonState) {
      case "correct":
      case "selected":
      case "filled":
      case "incorrect":
      case "incomplete":
        return "white";
      case "greyed":
        return "rgba(0,0,0,0.3)";
      default:
        return "rgba(0,0,0,0.8)";
    }
  };

  // Reset confetti state when button state changes to correct
  useEffect(() => {
    if (buttonState === "correct") {
      setIsConfettiPlayed(false);
    }
  }, [buttonState]);

  const commonProps = {
    onMouseDown: () => setIsPressedDown(true),
    onMouseUp: () => setIsPressedDown(false),
    onMouseLeave: () => setIsPressedDown(false),
    onTouchStart: () => setIsPressedDown(true),
    onTouchEnd: () => setIsPressedDown(false),
    className: `
      ${doesStretch || description ? "w-full" : "w-auto"}
      ${isLong ? "px-10" : "px-4"}
      relative flex flex-row items-center
      ${letter || description ? "justify-start" : "justify-center"}
      py-4 rounded-[16px]
      border overflow-visible
      text-[15px] md:text-[14px] md:leading-[24px]
      min-w-[80px]
      transition-transform duration-100 gap-2
      ${isPressedDown || buttonState === "picked" ? "translate-y-[2px]" : ""}
      pointer-events-auto
      ${disabled ? "opacity-50" : ""}
      ${isFontRounded ? "font-rounded-bold" : ""}
      ${isStrikethrough ? "line-through" : ""}
      ${href ? "no-underline" : ""}
    `,
    style: {
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
      color: getTextColor(),
      borderWidth: "1px",
      borderBottomWidth:
        isPressedDown || buttonState === "picked" ? "1px" : "4px",
      marginBottom: isPressedDown || buttonState === "picked" ? "3px" : "0px",
    },
  };

  const buttonContent = (
    <>
      <div className={`absolute ${isLoading ? "opacity-100" : "opacity-0"}`}>
        <Spinner style="light" />
      </div>
      <div className={`flex ${isLoading ? "opacity-0" : "opacity-100"}`}>
        {letter && (
          <div
            className="flex items-center justify-center w-6 h-6 rounded-full border mr-3 font-rounded-bold text-xs"
            style={{
              backgroundColor: getCircleBackgroundColor(),
              borderColor: getBorderColor(),
              color: getCircleTextColor(),
            }}
          >
            {letter}
          </div>
        )}
        <div
          className={`flex-1 flex items-center gap-1 ${letter || description ? "text-left" : "text-center"}`}
        >
          {showLockIcon && <LockIcon fill={getTextColor()} />}
          <div className={`flex flex-col ${description ? "items-start" : "items-center justify-center"}`}>
            <div className="flex items-center leading-tight">
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                  [remarkMath, { singleDollarTextMath: true }],
                ]}
                rehypePlugins={[rehypeKatex]}
              >
                {removeAltText(preprocessLaTeX(buttonText))}
              </ReactMarkdown>
              {showKeyboardShortcut && (
              <svg
                width="59"
                height="24"
                viewBox="0 0 59 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                opacity={0.5}
                className="ml-2"
              >
                <path
                  d="M9.61161 18.7625H14.3803C15.4953 18.7625 16.0979 18.1071 16.0979 17.0449V13.7678H19.0586C19.7291 13.7678 20.2338 13.3685 20.2338 12.7432C20.2338 12.359 20.053 12.0954 19.7291 11.7639L12.9866 5.00635C12.6777 4.69747 12.3538 4.53174 11.9997 4.53174C11.6456 4.53174 11.3142 4.69747 11.0128 5.00635L4.27037 11.7639C3.93136 12.1029 3.76562 12.359 3.76562 12.7432C3.76562 13.3685 4.27037 13.7678 4.93331 13.7678H7.90151V17.0449C7.90151 18.1071 8.50419 18.7625 9.61161 18.7625ZM9.92048 17.2709C9.65681 17.2709 9.46847 17.0901 9.46847 16.8264V12.6453C9.46847 12.472 9.40067 12.3967 9.21987 12.3967H5.95034C5.8976 12.3967 5.875 12.3741 5.875 12.344C5.875 12.3138 5.88253 12.2912 5.91267 12.2611L11.8566 6.33977C11.9093 6.28704 11.9545 6.27197 11.9997 6.27197C12.0449 6.27197 12.0901 6.28704 12.1429 6.33977L18.0868 12.2611C18.1169 12.2912 18.1244 12.3138 18.1244 12.344C18.1244 12.3741 18.1018 12.3967 18.0491 12.3967H14.772C14.5988 12.3967 14.5234 12.472 14.5234 12.6453V16.8264C14.5234 17.0825 14.3351 17.2709 14.079 17.2709H9.92048Z"
                  fill={getTextColor()}
                />
                <path
                  d="M28.6363 9.398H30.3703V12.832H33.7873V14.566H30.3703V18H28.6363V14.566H25.2193V12.832H28.6363V9.398Z"
                  fill={getTextColor()}
                />
                <path
                  d="M44.0021 18.5063C44.4918 18.5063 44.8232 18.1598 44.8232 17.6852C44.8232 17.4366 44.7253 17.2558 44.5746 17.1051L42.6611 15.2368L41.3428 14.1294L43.083 14.2047H52.4848C54.3757 14.2047 55.1818 13.3534 55.1818 11.4851V7.01775C55.1818 5.12685 54.3757 4.31323 52.4848 4.31323H48.3037C47.799 4.31323 47.4449 4.68991 47.4449 5.15698C47.4449 5.61652 47.799 5.9932 48.2962 5.9932H52.4471C53.2005 5.9932 53.5244 6.31714 53.5244 7.07049V11.4324C53.5244 12.2083 53.2005 12.5247 52.4471 12.5247H43.083L41.3428 12.6076L42.6611 11.4926L44.5746 9.63187C44.7253 9.4812 44.8232 9.29286 44.8232 9.04426C44.8232 8.57718 44.4918 8.23064 44.0021 8.23064C43.7912 8.23064 43.5576 8.32858 43.3919 8.49431L39.0752 12.7432C38.9019 12.9089 38.8115 13.1349 38.8115 13.3685C38.8115 13.5945 38.9019 13.8205 39.0752 13.9862L43.3919 18.2426C43.5576 18.4084 43.7912 18.5063 44.0021 18.5063Z"
                  fill={getTextColor()}
                />
              </svg>
            )}
            </div>
            {description && (
              <div className="text-[14px] font-rounded-semibold text-gray-500 leading-tight mt-1">
                {removeAltText(preprocessLaTeX(description))}
              </div>
            )}
          </div>
        </div>
      </div>
      {buttonState === "correct" &&
        circleConfetti &&
        !isConfettiPlayed &&
        isMounted && (
          <div className="absolute pointer-events-none z-50">
            <Suspense fallback={null}>
              <LottieComponent
                animationData={circleConfetti}
                loop={false}
                autoplay={true}
                className="w-[40px] h-[40px]"
                onComplete={() => setIsConfettiPlayed(true)}
              />
            </Suspense>
          </div>
        )}
    </>
  );

  // If href is provided, render as Link, otherwise as button
  if (href) {
    return (
      <Link href={href} {...commonProps}>
        {buttonContent}
      </Link>
    );
  }

  return (
    <button onClick={onPress} disabled={disabled || isLoading} {...commonProps}>
      {buttonContent}
    </button>
  );
};

export default PrimaryButtonClicky;
