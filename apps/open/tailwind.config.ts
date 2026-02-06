import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#0ea5e9",
        success: "#84cc16",
        special: "#4549F3",
      },
      fontFamily: {
        sans: ["var(--font-helvetica)"],
        medium: ["var(--font-helvetica-medium)"],
        "rounded-semibold": ["var(--font-sf-pro-rounded-semibold)"],
        "rounded-bold": ["var(--font-sf-pro-rounded-bold)"],
        "rounded-heavy": ["var(--font-sf-pro-rounded-heavy)"],
        "rounded-black": ["var(--font-sf-pro-rounded-black)"],
        heading: ["var(--font-sf-pro-display-bold)"],
        heavy: ["var(--font-sf-pro-display-heavy)"],
        charter: ["var(--font-charter)"],
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "bounce-subtle": {
          "0%, 100%": {
            transform: "translateY(0px)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)",
          },
          "50%": {
            transform: "translateY(2px)",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
          },
        },
        "swipe-up": {
          "0%": { transform: "translateY(240px)", opacity: "0" },
          "20%": { opacity: "1" },
          "40%, 100%": { transform: "translateY(0)", opacity: "1" },
        },
        documentEntrance: {
          "0%": { transform: "scale(0.97)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        documentExit: {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(0.97)", opacity: "0" },
        },
        progressFill: {
          "0%": { strokeDashoffset: "62.83" },
          "100%": { strokeDashoffset: "6.28" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) forwards",
        float: "float 3s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-in-out forwards",
        "bounce-subtle": "bounce-subtle 1.5s ease-in-out infinite",
        "swipe-up": "swipe-up 3s ease-out infinite",
        // Small delay keeps the item invisible for a beat so layout can settle before fading in.
        documentEntrance: "documentEntrance 300ms ease-out 80ms backwards",
        documentExit: "documentExit 300ms ease-out forwards",
        progressFill: "progressFill 4s ease-out forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
