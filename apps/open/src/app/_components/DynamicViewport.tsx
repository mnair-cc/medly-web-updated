"use client";

import { useEffect } from "react";

export function DynamicViewport() {
  useEffect(() => {
    const setViewport = () => {
      const width = window.innerWidth;
      let scale = 1;

      // iPad Air landscape: 1180-1194px width, scale to 0.8
      // iPad Mini landscape: 1024-1133px width, scale to 0.8
      // Mobile devices (<768px): no scaling (scale = 1)
      if ((width >= 1024 && width <= 1133) || (width >= 1180 && width <= 1194)) {
        scale = 0.8;
      }

      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute(
          "content",
          `width=device-width, initial-scale=${scale}, maximum-scale=${scale}, user-scalable=no`
        );
      }
    };

    setViewport();
    window.addEventListener("resize", setViewport);
    return () => window.removeEventListener("resize", setViewport);
  }, []);

  return null;
}
