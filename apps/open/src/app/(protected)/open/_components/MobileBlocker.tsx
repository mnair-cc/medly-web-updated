"use client";

import { useResponsive } from "@/app/_hooks/useResponsive";
import { MedlyFullLogo } from "@/app/_components/icons/MedlyLogoIcon";

const OPEN_URL = "https://open.medlyai.com";

export default function MobileBlocker() {
  const { isBelowSm, isMeasured } = useResponsive();

  if (!isMeasured || !isBelowSm) {
    return null;
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Medly",
          text: "Check out Medly on your computer",
          url: OPEN_URL,
        });
      } catch {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(OPEN_URL);
      alert("Link copied to clipboard!");
    } catch {
      alert(`Visit ${OPEN_URL} on your computer`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center">
      <div className="mb-8">
        <MedlyFullLogo />
      </div>

      <h1 className="mb-3 text-xl font-semibold text-gray-900">
        Medly isn't optimized for mobile yet
      </h1>

      <p className="mb-8 text-gray-600">
        Visit open.medlyai.com on your computer for the best experience
      </p>

      <button
        onClick={handleShare}
        className="flex items-center gap-2 rounded-lg bg-black px-6 py-3 text-white"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share link
      </button>
    </div>
  );
}
