"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";

const DRAG_TUTORIAL_IMAGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fopen%2Fhighlight_tutorial.png?alt=media&token=bea52bc9-359c-4148-a19c-124d59662d7c";

interface DragTutorialModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export default function DragTutorialModal({
  isOpen,
  onComplete,
}: DragTutorialModalProps) {
  const [isAnimatedIn, setIsAnimatedIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger entrance animation
      const timer = requestAnimationFrame(() => setIsAnimatedIn(true));
      return () => cancelAnimationFrame(timer);
    } else {
      setIsAnimatedIn(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1400] transition-opacity duration-300"
      style={{ opacity: isAnimatedIn ? 1 : 0 }}
    >
      <div
        className="bg-white rounded-[24px] p-6 max-w-[400px] mx-4 shadow-xl transition-all duration-300"
        style={{
          transform: isAnimatedIn ? "scale(1)" : "scale(0.95)",
          opacity: isAnimatedIn ? 1 : 0,
        }}
      >
        {/* Image */}
        <div className="w-full max-w-md mb-6 overflow-hidden rounded-xl">
          <img
            src={DRAG_TUTORIAL_IMAGE_URL}
            alt=""
            className="w-full h-auto"
            style={{ marginTop: "-20px" }}
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-rounded-bold text-center mb-2">
          Drag anywhere to ask
        </h1>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6 text-[15px]">
          Confused by a graph, concept, or quote? Drag anywhere in your document
          to ask about it.
        </p>

        {/* Button - matching onboarding carousel style */}
        <div className="w-full">
          <PrimaryButtonClicky
            buttonState="filled"
            buttonText="Get Started"
            onPress={onComplete}
            showKeyboardShortcut={false}
            doesStretch={true}
            colorScheme={{
              backgroundColor: "#000000",
              primaryColor: "#000000",
              textColor: "#FFFFFF",
            }}
          />
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
