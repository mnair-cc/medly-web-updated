"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { useResponsive } from "@/app/_hooks/useResponsive";
import { X } from "lucide-react";

interface PromoPopupProps {
  /** localStorage key for dismissal persistence */
  storageKey: string;
  /** Image URL to display */
  imageUrl: string;
  /** Bold heading text */
  title: string;
  /** Body description text or JSX */
  description: ReactNode;
  /** External visibility control */
  isVisible: boolean;
  /** Alt text for image (defaults to title) */
  imageAlt?: string;
  /** Callback when popup is dismissed */
  onDismiss?: () => void;
}

export default function PromoPopup({
  storageKey,
  imageUrl,
  title,
  description,
  isVisible,
  imageAlt,
  onDismiss,
}: PromoPopupProps) {
  const { isBelowSm, isMeasured } = useResponsive();
  const [isOpen, setIsOpen] = useState(false);

  // Gate visibility via localStorage flag
  useEffect(() => {
    if (!isMeasured || isBelowSm || !isVisible) return;
    try {
      const dismissed = localStorage.getItem(storageKey);
      setIsOpen(dismissed !== "true");
    } catch {
      setIsOpen(true);
    }
  }, [storageKey, isMeasured, isBelowSm, isVisible]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // no-op
    }
    setIsOpen(false);
    onDismiss?.();
  };

  if (!isOpen || !isMeasured || isBelowSm || !isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-white/95 backdrop-blur-[16px] rounded-3xl shadow-[0_0_16px_rgba(0,0,0,0.16)] border border-white w-[300px] z-[1300] overflow-hidden">
      {/* Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 z-10 p-1 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>

      {/* Image */}
      <div className="relative w-full h-[160px] overflow-hidden">
        <Image
          src={imageUrl}
          alt={imageAlt || title}
          className="w-full h-full object-cover"
          width={300}
          height={160}
          priority
        />
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="font-rounded-bold text-[16px]">{title}</p>
        <p className="text-[14px] leading-5 mt-1 opacity-80">{description}</p>
      </div>
    </div>
  );
}
