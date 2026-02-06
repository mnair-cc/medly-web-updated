import { useState, useEffect } from "react";

export function useResponsive() {
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [isTouchScreen, setIsTouchScreen] = useState(false);
  const [isBelowSm, setIsBelowSm] = useState(false);
  const [isMeasured, setIsMeasured] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const checkWindowSize = () => {
      setIsWideScreen(window.innerWidth >= 768); // md breakpoint is 768px
      setIsBelowSm(window.innerWidth < 640); // sm breakpoint is 640px
      setIsMeasured(true);
    };

    const checkTouchSupport = () => {
      try {
        const hasTouch =
          "ontouchstart" in window ||
          (navigator.maxTouchPoints || 0) > 0 ||
          (navigator as any).msMaxTouchPoints > 0;
        setIsTouchScreen(!!hasTouch);
      } catch {
        setIsTouchScreen(false);
      }
    };

    // Check initial size and touch support
    checkWindowSize();
    checkTouchSupport();

    // Add event listener
    window.addEventListener("resize", checkWindowSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkWindowSize);
  }, []);

  return { isWideScreen, isTouchScreen, isBelowSm, isMeasured };
}
