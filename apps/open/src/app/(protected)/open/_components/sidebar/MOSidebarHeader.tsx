"use client";

import MedlyLogoIcon from "@/app/_components/icons/MedlyLogoIcon";
import { useLastLesson } from "@/app/_hooks/useLastLesson";
import Link from "next/link";

interface SidebarHeaderProps {
  leftSidebarWidth: number;
  hideTitle?: boolean;
}

export default function SidebarHeader({
  leftSidebarWidth,
  hideTitle,
}: SidebarHeaderProps) {
  const { setIntentionalHomeVisit } = useLastLesson();

  const handleHomeClick = () => {
    setIntentionalHomeVisit();
  };

  if (hideTitle) {
    return null;
  }

  return (
    <div
      className={`flex items-center py-2 ${
        leftSidebarWidth < 140 ? "px-2 justify-center" : "px-5"
      }`}
    >
      <Link
        href="/open"
        onClick={handleHomeClick}
        className="flex items-center"
      >
        <MedlyLogoIcon />
      </Link>
    </div>
  );
}
