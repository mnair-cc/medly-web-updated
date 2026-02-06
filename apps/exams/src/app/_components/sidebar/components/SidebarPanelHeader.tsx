"use client";

import { useSidebar } from "@/app/_components/sidebar/SidebarLayoutClient";
import { useMockDates } from "@/app/(protected)/mocks/_hooks/useMockDates";
import { useResponsive } from "@/app/_hooks/useResponsive";
import Link from "next/link";
import CloseSidebarIcon from "../../icons/CloseSidebarIcon";
import WrappedIcon from "../../icons/WrappedIcon";

interface SidebarPanelHeaderProps {
  title: string;
  isHomePage?: boolean;
  isMockPanelOpen?: boolean;
}

export default function SidebarPanelHeader({
  title,
  isHomePage = false,
  isMockPanelOpen = false,
}: SidebarPanelHeaderProps) {
  const { sidebarState, closeSidebar, openSidebar } = useSidebar();
  const { isBelowSm } = useResponsive();
  const { isAfterResultsDay } = useMockDates();

  return (
    <div className="pt-2 gap-2 flex flex-col">
      {!isBelowSm && (
        <div className="flex justify-between px-2">
          <div className="flex items-center">
            <div
              className={`relative ${
                sidebarState === "semi-open" ? "group" : ""
              }`}
            >
              <button
                onClick={() => {
                  if (sidebarState === "semi-open") {
                    openSidebar();
                  }
                }}
                className={`text-left leading-tight font-rounded-bold text-[17px] rounded-[8px] px-2 py-2 flex gap-1 ${
                  sidebarState === "semi-open"
                    ? "hover:bg-[#F7F7FA] cursor-pointer"
                    : "cursor-default"
                }`}
              >
                <svg
                  className={`mr-2 ${
                    sidebarState === "semi-open" ? "block" : "hidden"
                  }`}
                  width="24"
                  height="24"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.78223 10.5078H22.209C22.6484 10.5078 23.0088 10.1475 23.0088 9.70801C23.0088 9.26855 22.6484 8.91699 22.209 8.91699H5.78223C5.34277 8.91699 4.99121 9.26855 4.99121 9.70801C4.99121 10.1387 5.34277 10.5078 5.78223 10.5078ZM5.78223 14.4629H22.209C22.6484 14.4629 23.0088 14.1025 23.0088 13.6719C23.0088 13.2236 22.6484 12.8633 22.209 12.8633H5.78223C5.34277 12.8633 4.99121 13.2236 4.99121 13.6719C4.99121 14.1025 5.34277 14.4629 5.78223 14.4629ZM5.78223 18.4268H22.209C22.6484 18.4268 23.0088 18.0664 23.0088 17.6182C23.0088 17.1787 22.6484 16.8271 22.209 16.8271H5.78223C5.34277 16.8271 4.99121 17.1875 4.99121 17.6182C4.99121 18.0576 5.34277 18.4268 5.78223 18.4268Z"
                    fill="black"
                  />
                </svg>

                {title}
              </button>

              {sidebarState === "semi-open" && (
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2 py-1 flex items-center justify-center bg-[#333333] rounded-[4px] opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-[1600]">
                  <div className="font-medium text-[12px] text-white">
                    Show subjects
                  </div>
                </div>
              )}
            </div>

            {sidebarState === "open" &&
              isMockPanelOpen &&
              isAfterResultsDay && (
                <div className="relative group">
                  <Link
                    href="/mocks/insights"
                    className="cursor-pointer hover:bg-[#F7F7FA] rounded-[8px] p-1 flex items-center"
                  >
                    <WrappedIcon />
                  </Link>

                  <div className="absolute left-0 top-full mt-1 px-2 py-1 flex items-center justify-center bg-[#333333] rounded-[4px] opacity-0 group-hover:opacity-100 pointer-events-none z-[1600]">
                    <div className="font-medium text-[12px] text-white">
                      Replay Results
                    </div>
                  </div>
                </div>
              )}
          </div>

          {sidebarState === "open" && !isHomePage && (
            <div className="relative group">
              <button
                className="cursor-pointer hover:bg-[#F7F7FA] rounded-[8px] p-1 mr-2"
                onClick={closeSidebar}
              >
                <CloseSidebarIcon />
              </button>

              <div className="absolute right-0 px-2 py-1 flex items-center justify-center bg-[#333333] rounded-[4px] opacity-0 group-hover:opacity-100 pointer-events-none z-[1600]">
                <div className="font-medium text-[12px] text-white">
                  Close sidebar
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isBelowSm && (
        <div className="flex justify-between items-center px-6">
          <h2 className="font-rounded-bold text-xl text-black">{title}</h2>
        </div>
      )}
    </div>
  );
}
