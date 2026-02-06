"use client";

import Link from "next/link";
import { useLastLesson } from "@/app/_hooks/useLastLesson";
import MocksBanner from "./MocksBanner";
import { useSidebar } from "@/app/_components/sidebar/SidebarLayoutClient";
import { useResponsive } from "@/app/_hooks/useResponsive";

interface SidebarHeaderProps {
  leftSidebarWidth: number;
  onOpenMockPanel?: () => void;
  isRegisteredForMocks?: boolean;
}

export default function SidebarHeader({
  leftSidebarWidth,
  onOpenMockPanel,
  isRegisteredForMocks,
}: SidebarHeaderProps) {
  const { setIntentionalHomeVisit } = useLastLesson();
  const { setLeftSidebarWidth } = useSidebar();
  const { isBelowSm } = useResponsive();

  const handleHomeClick = () => {
    setIntentionalHomeVisit();
  };

  return (
    <>
      <div
        className={`flex items-center justify-between ${
          leftSidebarWidth < 140 ? "px-2 justify-center" : "px-6"
        }`}
      >
        {leftSidebarWidth >= 140 && !isBelowSm && (
          <Link
            href="/"
            className="font-rounded-heavy text-[22px]"
            onClick={handleHomeClick}
          >
            medly
          </Link>
        )}
      </div>
      <div
        className={`${leftSidebarWidth < 140 ? "px-2" : "px-4"} w-full mb-2`}
      >
        <MocksBanner
          isCompact={leftSidebarWidth < 140}
          onOpenMockPanel={onOpenMockPanel}
          isRegisteredForMocks={isRegisteredForMocks}
        />
      </div>
    </>
  );
}
