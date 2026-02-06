"use client";

import { useEffect } from "react";

/**
 * Updates the iOS Safari status bar color.
 *
 * iOS 26+ ignores theme-color meta tag and derives colors from:
 * 1. Fixed position elements at top/bottom
 * 2. Body background-color as fallback
 *
 * We use all three methods for maximum compatibility.
 */
export function useThemeColor(color: string) {
  useEffect(() => {
    // Method 1: Meta tag (older iOS, other browsers)
    let metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = color;

    // Method 2: Fixed position element at top (iOS 26+)
    const THEME_COLOR_ELEMENT_ID = "safari-theme-color-element";
    let themeElement = document.getElementById(THEME_COLOR_ELEMENT_ID) as HTMLDivElement | null;
    if (!themeElement) {
      themeElement = document.createElement("div");
      themeElement.id = THEME_COLOR_ELEMENT_ID;
      themeElement.setAttribute("aria-hidden", "true");
      Object.assign(themeElement.style, {
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        height: "1px",
        pointerEvents: "none",
        zIndex: "-1",
      });
      document.body.appendChild(themeElement);
    }
    themeElement.style.backgroundColor = color;

    // Method 3: Body background (fallback for iOS 26+)
    document.body.style.backgroundColor = color;
  }, [color]);
}
