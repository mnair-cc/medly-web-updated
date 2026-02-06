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
        className="relative w-full max-w-[440px] pb-6 bg-white rounded-3xl shadow-[0px_0px_24px_0px_rgba(0,0,0,0.16)] flex flex-col items-center gap-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="absolute top-4 left-4 z-10 flex gap-2 bg-[white] p-2 rounded-full pr-3">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${index === currentSlide ? "bg-black" : "bg-gray-300"}`}
            />
          ))}
        </div>

        {/* Media area */}
        <MediaRenderer media={slide.media} />

        {/* Title and description */}
        <div className="self-stretch pb-2 mt-2 flex flex-col justify-center items-center gap-4 px-4">
          <h2 className="w-80 text-center text-black text-[27px] font-bold font-['SF_Pro_Rounded'] leading-tight">
            {renderText(slide.title)}
          </h2>
          <p className="self-stretch text-center text-black/80 text-[15px] font-normal leading-5 px-4">
            {renderText(slide.description, true)}
          </p>
        </div>

        {/* Buttons */}
        <div className="self-stretch flex flex-col items-center px-6">
          <PrimaryButtonClicky
            buttonState="filled"
            buttonText={slide.ctaText || (isLastSlide ? "Get Started" : "Continue")}
            onPress={handleContinue}
            doesStretch={true}
            showKeyboardShortcut={false}
          />
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
  if (media.type === "image" && media.url) {
    return (
      <div className="self-stretch overflow-hidden">
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