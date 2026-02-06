"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  caption?: string;
  onClose: () => void;
}

const ImageLightbox = ({ src, alt, caption, onClose }: ImageLightboxProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lightboxContent = (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] cursor-pointer"
      onClick={onClose}
    >
      <div
        className="max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt || ""}
          className="max-w-full max-h-[85vh] object-contain"
        />
        {caption && (
          <p className="text-white text-center text-sm mt-4 max-w-[70%]">
            {caption}
          </p>
        )}
      </div>
    </div>
  );

  if (!mounted) return null;

  return createPortal(lightboxContent, document.body);
};

export default ImageLightbox;
