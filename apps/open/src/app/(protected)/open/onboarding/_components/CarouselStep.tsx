"use client";

import type { CarouselSlide } from "../_types/types";

interface CarouselStepProps {
  slides: CarouselSlide[];
  currentSlide: number;
}

export default function CarouselStep({ slides, currentSlide }: CarouselStepProps) {
  const slide = slides[currentSlide];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Image - same style as InfoPage */}
      {slide.imagePath && (
        <div className="w-full max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.imagePath}
            alt={slide.title || "Onboarding illustration"}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Image placeholder if no image */}
      {!slide.imagePath && (
        <div className="w-full max-w-md aspect-video bg-[#F9F9FB] border-2 border-dashed border-[#E6E6E6] rounded-2xl flex items-center justify-center">
          <span className="text-gray-400 text-sm">Image placeholder</span>
        </div>
      )}

      {/* Slide indicators */}
      <div className="flex gap-2">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${
              index === currentSlide ? "bg-black" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
