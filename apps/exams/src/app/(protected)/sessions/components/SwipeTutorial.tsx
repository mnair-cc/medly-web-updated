"use client";

import { useEffect, useState } from "react";

export default function SwipeTutorial() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already scrolled
    const hasScrolled = localStorage.getItem("hasTouchScrolled");
    if (!hasScrolled) {
      setIsVisible(true);
    }
  }, []);

  // Hide tutorial when user scrolls
  useEffect(() => {
    if (!isVisible) return;

    const handleScroll = () => {
      localStorage.setItem("hasTouchScrolled", "true");
      setIsVisible(false);
    };

    // Listen for scroll on the question page container
    const container = document.querySelector("[data-question-page-scroll]");
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      <div className="absolute top-0 left-0 w-full h-full bg-black/50">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 mr-4 ml-4 w-4 h-1/2 rounded-full bg-gradient-to-b from-white to-white/10">
          <div className="absolute top-0 left-0 w-[320px] flex flex-row items-center justify-center animate-swipe-up">
            <svg
              width="72"
              height="76"
              viewBox="0 0 72 76"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g filter="url(#filter0_d_4049_240)">
                <path
                  d="M45.2839 58.8398C54.9881 55.319 58.2464 47.2547 54.4647 36.8587L52.895 32.5767C51.4678 28.6515 48.7088 26.9387 46.5682 27.7C46.0686 27.8903 45.9262 28.2471 46.0925 28.6991L46.7822 30.6022C47.0916 31.5062 46.8061 32.1009 46.2827 32.315C45.6882 32.5053 45.0698 32.2436 44.7369 31.3397L44.2848 30.1026C43.4524 27.7713 41.407 26.8198 39.409 27.5334C38.5052 27.8665 38.2436 28.3898 38.529 29.1511L39.4566 31.7441C39.7896 32.6481 39.4804 33.2428 38.9571 33.4569C38.3625 33.671 37.7441 33.3855 37.4349 32.4815L36.5549 30.1026C35.6035 27.5096 33.6531 26.8198 31.7028 27.5334C30.8703 27.8427 30.5611 28.4136 30.8227 29.1511L32.6542 34.2181C32.9872 35.1221 32.7017 35.7168 32.1547 35.9309C31.5839 36.145 30.9655 35.8596 30.6325 34.9556L24.4485 17.994C23.8538 16.3288 22.3792 15.6627 20.9759 16.1623C19.4774 16.7094 18.8353 18.1605 19.4299 19.8258L28.4918 44.6615C28.7059 45.28 28.4205 45.7322 28.0399 45.8747C27.6594 46.0174 27.2788 45.8985 26.7794 45.3753L20.6667 38.8094C19.7629 37.8579 18.8353 37.62 17.8125 38.0006C16.2903 38.5477 15.6957 39.9513 16.1476 41.2358C16.3379 41.7354 16.5995 42.1162 16.8611 42.4492L24.4009 51.9172C30.7752 59.9104 38.1485 61.4329 45.2839 58.8398Z"
                  fill="white"
                />
              </g>
              <defs>
                <filter
                  id="filter0_d_4049_240"
                  x="0"
                  y="0"
                  width="72"
                  height="76"
                  filterUnits="userSpaceOnUse"
                  colorInterpolationFilters="sRGB"
                >
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feColorMatrix
                    in="SourceAlpha"
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                    result="hardAlpha"
                  />
                  <feOffset />
                  <feGaussianBlur stdDeviation="8" />
                  <feComposite in2="hardAlpha" operator="out" />
                  <feColorMatrix
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                  />
                  <feBlend
                    mode="normal"
                    in2="BackgroundImageFix"
                    result="effect1_dropShadow_4049_240"
                  />
                  <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="effect1_dropShadow_4049_240"
                    result="shape"
                  />
                </filter>
              </defs>
            </svg>

            <div className="flex-1 font-rounded-bold text-white leading-tight">
              Swipe the side of the page to scroll up and down
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}