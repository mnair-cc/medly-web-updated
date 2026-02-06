/**
 * Feature Release Modal Configuration
 *
 * This file defines all feature release announcements shown to users.
 * To add a new feature release:
 * 1. Add images/GIFs to Firebase Storage
 * 2. Add a new config entry below
 * 3. The modal will automatically show to eligible users once
 */

// ============================================
// TYPES
// ============================================

export interface FeatureReleaseEligibility {
  /** Show to all users */
  all?: boolean;
  /** Show only to users with these subjects (e.g., "maths", "biology") */
  subjects?: string[];
  /** Show only to users in these courses (e.g., "GCSE", "A Level") */
  courses?: ("GCSE" | "A Level")[];
  /** Show only to users with specific subscription status */
  subscription?: "free" | "paid" | "any";
}

export interface FeatureReleaseMedia {
  type: "image" | "gif" | "component";
  /** URL for image or gif */
  url?: string;
  /** Component ID for custom React components (e.g., menu mockup) */
  componentId?: string;
}

export interface FeatureReleaseSlide {
  /** Media to display (image, gif, or custom component) */
  media: FeatureReleaseMedia;
  /** Title text - use \n for line breaks */
  title: string;
  /** Description text - use \n for line breaks */
  description: string;
  /** Button text (defaults to "Continue" for non-final slides) */
  ctaText?: string;
  /** Action when CTA is clicked (only needed for final slide) */
  ctaAction?: FeatureReleaseCTAAction;
  /** Secondary button text (defaults to "Dismiss") */
  dismissText?: string;
}

export type FeatureReleaseCTAAction =
  | { type: "navigate"; url: string }
  | { type: "dismiss" }
  | { type: "custom"; actionId: string };

export interface FeatureReleaseConfig {
  /** Unique identifier for this feature release */
  id: string;
  /** Who should see this modal */
  eligibility: FeatureReleaseEligibility;
  /** Slides to show (1-3 slides) */
  slides: FeatureReleaseSlide[];
  /** Whether this feature release is currently active */
  active: boolean;
  /** Optional: Dynamic URL resolver for CTA (e.g., find first unstarted lesson) */
  dynamicUrl?: "firstUnstartedMathsLesson";
}

// ============================================
// FEATURE RELEASES
// ============================================

export const featureReleases: FeatureReleaseConfig[] = [
  {
    id: "maths-learn-mode-2026",
    active: false,
    eligibility: {
      subjects: ["maths", "mathematics"],
      courses: ["GCSE", "A Level"],
    },
    slides: [
      {
        media: {
          type: "component",
          componentId: "mathsLearnModeMenu",
        },
        title: "Introducing\nMaths Learn Mode",
        description:
          "Each concept in your specification broken\ndown into step-by-step, guided lessons.",
        ctaText: "Continue",
      },
      {
        media: {
          type: "gif",
          url: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fmaths-learn-mode-demo.gif?alt=media&token=8f3cc207-6954-4c85-b934-88e5af6fc2ae",
        },
        title: "Learn Topics\nStep-by-Step",
        description:
          "Build your topic understanding and confidence before moving on to practise.",
        ctaText: "Start Learning",
        ctaAction: { type: "navigate", url: "" }, // URL resolved dynamically
      },
    ],
    dynamicUrl: "firstUnstartedMathsLesson",
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the localStorage key for a feature release
 */
export function getFeatureReleaseStorageKey(featureId: string): string {
  return `feature-release-${featureId}-seen`;
}

/**
 * Check if a feature release has been seen
 */
export function hasSeenFeatureRelease(featureId: string): boolean {
  try {
    return localStorage.getItem(getFeatureReleaseStorageKey(featureId)) === "true";
  } catch {
    return false;
  }
}

/**
 * Mark a feature release as seen
 */
export function markFeatureReleaseSeen(featureId: string): void {
  try {
    localStorage.setItem(getFeatureReleaseStorageKey(featureId), "true");
  } catch {
    // no-op if localStorage unavailable
  }
}
