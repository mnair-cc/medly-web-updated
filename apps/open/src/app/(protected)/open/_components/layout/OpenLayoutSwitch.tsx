"use client";

import { useResponsive } from "@/app/_hooks/useResponsive";
import DesktopOpenLayout from "./DesktopOpenLayout";
import MobileOpenLayout from "./MobileOpenLayout";

interface OpenLayoutSwitchProps {
  children: React.ReactNode;
}

/**
 * Single conditional to switch between desktop and mobile layouts.
 * This is the ONLY file with mobile/desktop branching logic.
 */
export default function OpenLayoutSwitch({ children }: OpenLayoutSwitchProps) {
  const { isBelowSm, isMeasured } = useResponsive();

  // Prevent hydration mismatch - render nothing until client-side measurement
  if (!isMeasured) {
    return <div className="h-full w-full" />;
  }

  if (isBelowSm) {
    return <MobileOpenLayout>{children}</MobileOpenLayout>;
  }

  return <DesktopOpenLayout>{children}</DesktopOpenLayout>;
}
