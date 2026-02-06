"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useResponsive } from "@/app/_hooks/useResponsive";
import ShimmerEffect from "@/app/(protected)/sessions/components/question-components/canvas/ShimmerEffect";

export type IntroStep = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  hasSkip?: boolean;
  isFinal?: boolean;
  buttonText?: string;
  isDisabled?: boolean;
};

interface IntroTutorialProps {
  storageKey: string;
  steps: IntroStep[];
  isSkippable?: boolean;
  onComplete?: () => void;
  onFeedback?: () => void;
}

export default function IntroTutorial({
  storageKey,
  steps,
  isSkippable = false,
  onComplete,
  onFeedback,
}: IntroTutorialProps) {
  const { isBelowSm, isMeasured } = useResponsive();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasHoveredDropdown, setHasHoveredDropdown] = useState(false);

  // Gate visibility via localStorage flag
  useEffect(() => {
    if (!isMeasured || isBelowSm) return;
    try {
      const seen = localStorage.getItem(storageKey);
      setIsOpen(seen !== "true");
    } catch {
      setIsOpen(true);
    }
  }, [storageKey, isMeasured, isBelowSm]);

  // Check localStorage for mode dropdown hover + listen for custom event
  useEffect(() => {
    const checkHover = () => {
      try {
        const hovered = localStorage.getItem("has_hovered_mode_dropdown") === "true";
        setHasHoveredDropdown(hovered);
      } catch { }
    };

    checkHover(); // Check on mount
    window.addEventListener("mode-dropdown-hovered", checkHover);

    return () => window.removeEventListener("mode-dropdown-hovered", checkHover);
  }, []);

  const closeAndPersist = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // no-op
    }
    setIsOpen(false);
    onComplete?.();
  };

  if (!isOpen || !isMeasured || isBelowSm || steps.length === 0) return null;

  const current = steps[stepIndex];
  const isLast = Boolean(current?.isFinal);
  const canGoNext = stepIndex < steps.length - 1;
  const isButtonDisabled = current?.isDisabled && !hasHoveredDropdown;

  return (
    <div className="absolute w-full h-full pointer-events-auto flex bg-[rgba(255,255,255,0.8)]">
      {false && !hasHoveredDropdown && (
        <div className="absolute top-20 right-10 z-[1300] flex flex-col items-center justify-center">
          <ShimmerEffect isVisible={true} />
          <svg style={{ transform: "scaleX(-1)" }}
            width="30" height="84" viewBox="0 0 30 84" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M28.3251 83.732C28.7293 84.1084 29.362 84.0858 29.7384 83.6816C30.1147 83.2773 30.0921 82.6446 29.6879 82.2682L29.0065 83.0001L28.3251 83.732ZM13.5031 60.5L14.4764 60.2706L13.5031 60.5ZM23.9978 43L23.7688 43.9734L23.9978 43ZM1.5 35L0.5 34.9999L1.5 35ZM6.00309 17L6.968 17.2626L6.00309 17ZM9.24741 0.335636C8.88049 -0.0771466 8.24842 -0.114327 7.83564 0.252591L1.10895 6.23187C0.69617 6.59878 0.658989 7.23086 1.02591 7.64364C1.39282 8.05642 2.0249 8.0936 2.43768 7.72668L8.41695 2.41177L13.7319 8.39105C14.0988 8.80383 14.7309 8.84101 15.1436 8.47409C15.5564 8.10718 15.5936 7.4751 15.2267 7.06232L9.24741 0.335636ZM29.0065 83.0001L29.6879 82.2682C27.3242 80.0676 23.9048 76.2542 20.8721 72.1157C17.8184 67.9485 15.258 63.5866 14.4764 60.2706L13.5031 60.5L12.5298 60.7294C13.4101 64.4645 16.1846 69.1026 19.2589 73.2978C22.354 77.5215 25.8554 81.4327 28.3251 83.732L29.0065 83.0001ZM13.5031 60.5L14.4764 60.2706C13.528 56.2465 14.1266 51.6494 15.8834 48.3237C16.7582 46.6677 17.8922 45.3783 19.207 44.6076C20.5018 43.8486 22.0199 43.5619 23.7688 43.9734L23.9978 43L24.2269 42.0266C21.9757 41.4969 19.9316 41.8646 18.1956 42.8822C16.4796 43.8881 15.1143 45.4977 14.115 47.3895C12.1236 51.1593 11.4748 56.2533 12.5298 60.7294L13.5031 60.5ZM23.9978 43L23.7688 43.9734C25.1183 44.291 25.9685 45.0282 26.4477 45.94C26.9395 46.8759 27.0754 48.068 26.8309 49.3003C26.3388 51.7801 24.378 54.1329 21.3791 54.5077L21.5031 55.5L21.6271 56.4923C25.6293 55.992 28.1637 52.8589 28.7926 49.6896C29.1086 48.0973 28.9614 46.4241 28.2181 45.0097C27.4622 43.5712 26.1251 42.4732 24.2269 42.0266L23.9978 43ZM21.5031 55.5L21.3791 54.5077C17.7647 54.9595 13.0439 53.142 9.17866 49.5809C5.34179 46.0458 2.4994 40.9239 2.5 35.0001L1.5 35L0.5 34.9999C0.499334 41.5863 3.65849 47.2144 7.82348 51.0518C11.9602 54.8631 17.2415 57.0405 21.6271 56.4923L21.5031 55.5ZM1.5 35L2.5 35.0001C2.50029 32.1497 3.15976 29.3491 4.0599 26.4237C4.94043 23.5621 6.10383 20.4378 6.968 17.2626L6.00309 17L5.03819 16.7374C4.1753 19.9079 3.08745 22.7836 2.14835 25.8355C1.22886 28.8237 0.500319 31.8503 0.5 34.9999L1.5 35ZM6.00309 17L6.968 17.2626C8.49008 11.6701 9.32951 3.92771 9.49827 1.05872L8.5 1L7.50173 0.941278C7.33716 3.73896 6.50992 11.3299 5.03819 16.7374L6.00309 17Z" 
            fill="#595959" fill-opacity="0.8" />
          </svg>
          <p className="font-rounded-bold mt-2 text-[15px] text-center text-[#595959]/80  ">
            Hover here
          </p>
          <p className="max-w-[170px] mx-auto text-[12px] text-center text-[#595959]/80">
            Switch between revision notes, practice questions and exam-style questions.
          </p>
        </div>)}

      <div className={`absolute ${true ? "bottom-6 right-6" : "top-20 right-0"} 6 right-6 bg-white/95 backdrop-blur-[16px] rounded-3xl shadow-[0_0_16px_rgba(0,0,0,0.16)] border border-white w-[300px] p-4 z-[1300]`}>
        <div className="relative w-full h-[160px] rounded-xl overflow-hidden mb-4 bg-black/5">
          {steps.map((s, i) =>
            s.imageUrl ? (
              <Image
                key={`preload-${i}`}
                src={s.imageUrl}
                alt="tutorial preview"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${i === stepIndex ? "opacity-100" : "opacity-0"
                  }`}
                width={360}
                height={160}
                unoptimized
                sizes="360px"
                loading="eager"
                priority={i === 0}
              />
            ) : null
          )}
        </div>
        <div className="mb-2">
          <p className="font-rounded-bold">{current?.title}</p>
          {current?.description ? (
            <p className="text-[14px] leading-5 mt-1 opacity-80">
              {current.description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between mt-4 gap-2 flex-row">
          {isLast ? (
            <>
              <button
                type="button"
                className={`px-6 py-2.5 rounded-xl text-white font-rounded-bold text-[14px] ${isButtonDisabled
                  ? "bg-[#06B0FF]/50 cursor-not-allowed"
                  : "bg-[#06B0FF] hover:bg-[#05B0FF]/80"
                  }`}
                onClick={closeAndPersist}
                disabled={isButtonDisabled}
              >
                {current?.buttonText || "I'm Ready!"}
              </button>
              {onFeedback && (
                <button
                  type="button"
                  className="text-[#06B0FF] font-rounded-bold px-2 py-1 text-[14px]"
                  onClick={onFeedback}
                >
                  Give feedback
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className={`px-6 py-2.5 rounded-xl text-white font-rounded-bold text-[14px] ${isButtonDisabled
                  ? "bg-[#06B0FF]/50 cursor-not-allowed"
                  : "bg-[#06B0FF] hover:bg-[#05B0FF]/80"
                  }`}
                onClick={() => {
                  if (canGoNext) setStepIndex((i) => i + 1);
                }}
                disabled={isButtonDisabled}
              >
                {current?.buttonText || "Next"}
              </button>
              {(current?.hasSkip || isSkippable) && (
                <button
                  type="button"
                  className="text-[#06B0FF] font-rounded-bold px-2 py-1 text-[14px]"
                  onClick={closeAndPersist}
                >
                  Skip
                </button>
              )}
            </>
          )}

          <span className="ml-auto text-[13px] text-[#595959]/50 font-rounded-bold select-none  mr-4">
            {stepIndex + 1}/{steps.length}
          </span>
        </div>
      </div>
    </div>
  );
}