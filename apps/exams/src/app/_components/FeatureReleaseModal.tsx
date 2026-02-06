"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import type {
  FeatureReleaseConfig,
  FeatureReleaseMedia,
} from "@/app/_config/featureReleases";

interface FeatureReleaseModalProps {
  isOpen: boolean;
  config: FeatureReleaseConfig;
  onClose: () => void;
  onCTA: () => void;
  /** Override URL for dynamic URL resolution */
  resolvedUrl?: string;
}

export default function FeatureReleaseModal({
  isOpen,
  config,
  onClose,
  onCTA,
}: FeatureReleaseModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset slide when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const slides = config.slides;
  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];

  const handleContinue = () => {
    if (isLastSlide) {
      onClose();
      onCTA();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleDismiss = () => {
    onClose();
  };

  // Parse title and description for line breaks
  // hideBreaksOnMobile: hides <br /> on mobile screens
  const renderText = (text: string, hideBreaksOnMobile = false) => {
    return text.split("\n").map((line, i, arr) => (
      <span key={i}>
        {line}
        {i < arr.length - 1 && (
          hideBreaksOnMobile ? (
            <br className="hidden sm:inline" />
          ) : (
            <br />
          )
        )}
      </span>
    ));
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] px-4">
      <div
        className="w-full max-w-[440px] px-8 pt-8 pb-6 bg-white rounded-3xl shadow-[0px_0px_24px_0px_rgba(0,0,0,0.16)] flex flex-col items-center gap-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media area */}
        <MediaRenderer media={slide.media} />

        {/* Title and description */}
        <div className="self-stretch pb-2 mt-2 flex flex-col justify-center items-center gap-4">
          <h2 className="w-80 text-center text-black text-[28px] font-bold font-['SF_Pro_Rounded'] leading-8">
            {renderText(slide.title)}
          </h2>
          <p className="self-stretch text-center text-black/80 text-base font-normal leading-5">
            {renderText(slide.description, true)}
          </p>
        </div>

        {/* Buttons */}
        <div className="self-stretch flex flex-col items-center gap-2">
          <PrimaryButtonClicky
            buttonState="filled"
            buttonText={slide.ctaText || (isLastSlide ? "Get Started" : "Continue")}
            onPress={handleContinue}
            doesStretch={true}
            showKeyboardShortcut={false}
          />
          <button
            type="button"
            onClick={handleDismiss}
            className="text-center text-[#06B0FF] text-[15px] font-rounded-bold leading-6 py-1 cursor-pointer"
          >
            {slide.dismissText || "Dismiss"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================
// MEDIA RENDERER
// ============================================

function MediaRenderer({ media }: { media: FeatureReleaseMedia }) {
  if (media.type === "component" && media.componentId === "mathsLearnModeMenu") {
    return <MathsLearnModeMenuMockup />;
  }

  if (media.type === "image" && media.url) {
    return (
      <div className="self-stretch rounded-2xl overflow-hidden shadow-[0px_0px_20px_0px_rgba(0,0,0,0.10)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.url} alt="" className="w-full h-auto" />
      </div>
    );
  }

  if (media.type === "gif" && media.url) {
    return (
      <div className="self-stretch rounded-2xl overflow-hidden shadow-[0px_0px_20px_0px_rgba(0,0,0,0.10)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.url} alt="" className="w-full h-auto" />
      </div>
    );
  }

  return null;
}

// ============================================
// CUSTOM COMPONENTS
// ============================================

function MathsLearnModeMenuMockup() {
  return (
    <div className="self-stretch py-4 rounded-3xl flex flex-col justify-center items-center">
      <div className="w-56 px-2 py-1.5 bg-white rounded-[16px] shadow-[0px_0px_16px_0px_rgba(0,0,0,0.10)] border border-gray-100 flex flex-col justify-center items-start gap-0.5">
        {/* Textbook row */}
        <div className="self-stretch p-2.5 rounded-xl flex items-center gap-2.5">
          <div className="w-7 h-7 flex justify-center items-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.67383 21.8721H19.3174C21.2158 21.8721 22.2002 20.8877 22.2002 19.0156V8.31934C22.2002 6.43848 21.2158 5.46289 19.3174 5.46289H8.67383C6.77539 5.46289 5.79102 6.43848 5.79102 8.31934V19.0156C5.79102 20.8965 6.77539 21.8721 8.67383 21.8721ZM8.7793 20.1494C7.96191 20.1494 7.51367 19.7188 7.51367 18.8662V8.45996C7.51367 7.60742 7.96191 7.18555 8.7793 7.18555H19.2119C20.0205 7.18555 20.4775 7.60742 20.4775 8.45996V18.8662C20.4775 19.7188 20.0205 20.1494 19.2119 20.1494H8.7793ZM9.20996 9.53223V11.5713C9.20996 12.1426 9.54395 12.4678 10.1064 12.4678H12.1455C12.7168 12.4678 13.0508 12.1426 13.0508 11.5713V9.53223C13.0508 8.96094 12.7168 8.63574 12.1455 8.63574H10.1064C9.54395 8.63574 9.20996 8.96094 9.20996 9.53223ZM9.75488 15.3945H18.1748C18.4912 15.3945 18.7285 15.1484 18.7285 14.832C18.7285 14.5244 18.4912 14.2871 18.1748 14.2871H9.75488C9.42969 14.2871 9.19238 14.5244 9.19238 14.832C9.19238 15.1484 9.42969 15.3945 9.75488 15.3945ZM9.75488 18.2949H15.9775C16.2939 18.2949 16.5312 18.0488 16.5312 17.7412C16.5312 17.4248 16.2939 17.1787 15.9775 17.1787H9.75488C9.42969 17.1787 9.19238 17.4248 9.19238 17.7412C9.19238 18.0488 9.42969 18.2949 9.75488 18.2949Z"
                fill="black"
                fillOpacity="0.3"
              />
            </svg>
          </div>
          <span className="text-black/50 text-base font-bold font-['SF_Pro_Rounded']">
            Textbook
          </span>
        </div>

        {/* Learn row - highlighted */}
        <div className="self-stretch p-2.5 bg-gray-50 rounded-xl flex items-center gap-2.5">
          <div className="w-7 h-7 flex justify-center items-center">
            <svg
              width="22"
              height="22"
              viewBox="0 0 14.0918 17.0996"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.6989 2.01359C8.69516 2.02699 8.69237 2.04077 8.69067 2.05494C8.67555 2.12938 8.66416 2.20523 8.65635 2.28219C8.65571 2.28616 8.65531 2.2902 8.65527 2.29435C8.64675 2.37792 8.64258 2.46285 8.64258 2.54883C8.64258 2.63464 8.6468 2.71943 8.65534 2.80292C8.65536 2.80624 8.65568 2.80947 8.65619 2.81265C8.66397 2.8882 8.67519 2.9627 8.6901 3.03585C8.6926 3.05505 8.69644 3.07379 8.70177 3.09194C8.71285 3.14271 8.72577 3.19279 8.74027 3.24219L4.12109 3.24219C2.45117 3.24219 1.40625 4.01367 1.40625 5.24414C1.40625 6.49414 2.5293 7.32422 4.85352 7.56836L9.10156 8.00781C12.1875 8.33008 13.7305 9.70703 13.7305 11.8555C13.7305 13.9453 12.1387 15.2637 9.60938 15.2637L4.99525 15.2637C5.01266 15.2054 5.02792 15.1461 5.04087 15.086C5.04465 15.0726 5.04746 15.0588 5.04917 15.0447C5.06441 14.9702 5.07589 14.8944 5.08377 14.8174C5.08441 14.8135 5.08482 14.8094 5.08486 14.8053C5.09344 14.7217 5.09766 14.6368 5.09766 14.5508C5.09766 14.465 5.0934 14.3802 5.08479 14.2967C5.08477 14.2934 5.08444 14.2901 5.08393 14.287C5.07608 14.2114 5.06477 14.1369 5.04975 14.0637C5.04722 14.0446 5.04335 14.0258 5.03798 14.0077C5.02682 13.9569 5.0138 13.9068 4.99919 13.8574L9.60938 13.8574C11.2793 13.8574 12.3242 13.0859 12.3242 11.8555C12.3242 10.6055 11.2109 9.77539 8.88672 9.53125L4.62891 9.0918C1.55273 8.76953 0 7.39258 0 5.24414C0 3.1543 1.5918 1.83594 4.12109 1.83594L8.74418 1.83594C8.7269 1.89423 8.71175 1.95347 8.6989 2.01359Z"
                fill="#05B0FF"
                fillOpacity="0.85"
              />
              <path
                d="M11.1914 5.08789C12.5879 5.08789 13.7305 3.95508 13.7305 2.54883C13.7305 1.13281 12.5879 0 11.1914 0C9.77539 0 8.64258 1.13281 8.64258 2.54883C8.64258 3.95508 9.77539 5.08789 11.1914 5.08789ZM2.53906 17.0996C3.95508 17.0996 5.09766 15.9668 5.09766 14.5508C5.09766 13.1445 3.95508 12.0117 2.53906 12.0117C1.14258 12.0117 0 13.1445 0 14.5508C0 15.9668 1.14258 17.0996 2.53906 17.0996ZM2.53906 15.7324C1.89453 15.7324 1.36719 15.2148 1.36719 14.5508C1.36719 13.8867 1.89453 13.3789 2.53906 13.3789C3.21289 13.3789 3.7207 13.8867 3.7207 14.5508C3.7207 15.2148 3.21289 15.7324 2.53906 15.7324Z"
                fill="#05B0FF"
                fillOpacity="0.85"
              />
            </svg>
          </div>
          <span className="text-black/80 text-base font-bold font-['SF_Pro_Rounded']">
            Learn
          </span>
        </div>

        {/* Practice row */}
        <div className="self-stretch p-2.5 rounded-xl flex items-center gap-2.5">
          <div className="w-7 h-7 flex justify-center items-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.31543 23.1816H18.6846C20.5742 23.1816 21.5498 22.1885 21.5498 20.29V12.3096C21.5498 11.0791 21.3916 10.5166 20.627 9.73438L16.0303 5.06738C15.2832 4.31152 14.668 4.13574 13.5605 4.13574H9.31543C7.43457 4.13574 6.4502 5.12891 6.4502 7.03613V20.29C6.4502 22.1885 7.43457 23.1816 9.31543 23.1816ZM9.46484 21.4238C8.62109 21.4238 8.19922 20.9844 8.19922 20.1758V7.1416C8.19922 6.3418 8.62109 5.89355 9.47363 5.89355H13.2002V10.6748C13.2002 11.9492 13.8242 12.5645 15.0898 12.5645H19.8008V20.1758C19.8008 20.9844 19.3789 21.4238 18.5264 21.4238H9.46484ZM15.2568 11.0264C14.8877 11.0264 14.7295 10.8682 14.7295 10.5078V6.12207L19.5635 11.0264H15.2568Z"
                fill="black"
                fillOpacity="0.3"
              />
            </svg>
          </div>
          <span className="text-black/50 text-base font-bold font-['SF_Pro_Rounded']">
            Practice
          </span>
        </div>
      </div>
    </div>
  );
}
