"use client";

import { useUser } from "../../../_context/UserProvider";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/app/_context/AuthProvider";
import EditIcon from "../../icons/EditIcon";
import LogoutIcon from "../../icons/LogoutIcon";
import { useGettingStartedProgress } from "@/app/_hooks/useGettingStartedSteps";
import CircularProgressBar from "@/app/_components/CircularProgressBar";
import GettingStartedPopover from "./GettingStartedPopover";
import { useResponsive } from "@/app/_hooks/useResponsive";
import { useSidebar } from "@/app/_components/sidebar/SidebarLayoutClient";

interface SidebarUserSectionProps {
  leftSidebarWidth: number;
}

export default function SidebarUserSection({
  leftSidebarWidth,
}: SidebarUserSectionProps) {
  const { user } = useUser();
  const { logout } = useAuth();
  const { isBelowSm } = useResponsive();
  const { isManageAccountOpen, setIsManageAccountOpen } = useSidebar();
  const [showMenu, setShowMenu] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gsPopoverRef = useRef<HTMLDivElement>(null);
  const gsButtonRef = useRef<HTMLButtonElement>(null);

  // Always call hooks before any conditional returns
  const { completedCount, totalCount } = useGettingStartedProgress();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMenu &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  // Close mobile getting-started popover when clicking outside
  useEffect(() => {
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (
        showGettingStarted &&
        gsPopoverRef.current &&
        gsButtonRef.current &&
        !gsPopoverRef.current.contains(event.target as Node) &&
        !gsButtonRef.current.contains(event.target as Node)
      ) {
        setShowGettingStarted(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [showGettingStarted]);

  if (!user) {
    return null;
  }

  // Mobile: render a fixed Getting Started button in bottom-left
  if (isBelowSm) {
    return (
      <>
        <div className="fixed left-4 bottom-6 z-[15000]">
          <div className="relative">
            <button
              ref={gsButtonRef}
              onClick={() => setShowGettingStarted((v) => !v)}
              className="flex items-center gap-2 bg-white border border-[#F2F2F7] rounded-lg px-3 py-2 pointer-events-auto"
            >
              <CircularProgressBar
                progress={(completedCount / totalCount) * 100}
                size={18}
                strokeWidth={4}
              />
              <span className="font-rounded-bold text-sm">Getting Started</span>
            </button>
            <div
              ref={gsPopoverRef}
              className={`absolute bottom-full left-0 mb-3 ${
                showGettingStarted
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
              style={{
                transition: "opacity 150ms ease-out",
              }}
            >
              <GettingStartedPopover arrowClassName="left-6" />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className={`w-full flex flex-col items-center ${
          leftSidebarWidth < 140 ? "justify-center px-4" : "gap-0 px-4"
        } py-2 border-t border-[#F2F2F7] relative z-[15000]`}
      >
        <div className="flex justify-between items-center gap-1 pointer-events-auto w-full">
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 hover:bg-[#F9F9FB] rounded-[10px] pl-2 pr-4 py-2"
            >
              <div className="text-2xl font-bold bg-[#DBDEEA] rounded-full px-2 py-1 hover:bg-[#C8CCD8] transition-colors">
                {user.avatar}
              </div>
              <p className="font-rounded-bold">
                {user.userName
                  ? user.userName.charAt(0).toUpperCase() +
                    user.userName.slice(1)
                  : ""}
              </p>
            </button>

            {showMenu && (
              <div
                ref={menuRef}
                className="absolute bottom-full left-0 mb-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 min-w-64 z-50"
              >
                <div className="flex flex-col gap-0 p-2">
                  <div
                    onClick={() => {
                      window.open(
                        "https://medlyai.tawk.help/article/frequently-asked-questions"
                      );
                      setShowMenu(false);
                    }}
                    className="cursor-pointer flex w-full px-4 py-3 justify-between items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg-[rgba(0,0,0,0.05)]"
                  >
                    <span>Provide feedback</span>
                    <EditIcon fill="rgba(0,0,0,0.8)" />
                  </div>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setIsManageAccountOpen(true);
                    }}
                    className="cursor-pointer flex w-full px-4 py-3 justify-between items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg-[rgba(0,0,0,0.05)]"
                  >
                    <span>Manage account</span>
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 28 28"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M14 13.8477C16.127 13.8477 17.8496 11.9668 17.8496 9.66406C17.8496 7.39648 16.127 5.59473 14 5.59473C11.8818 5.59473 10.1416 7.42285 10.1504 9.68164C10.1592 11.9756 11.873 13.8477 14 13.8477ZM14 12.3096C12.7871 12.3096 11.7588 11.1582 11.7588 9.68164C11.75 8.24023 12.7783 7.13281 14 7.13281C15.2305 7.13281 16.2412 8.22266 16.2412 9.66406C16.2412 11.1406 15.2217 12.3096 14 12.3096ZM8.51562 22.0215H19.4756C20.9961 22.0215 21.7256 21.5381 21.7256 20.501C21.7256 18.084 18.7109 14.8672 14 14.8672C9.28906 14.8672 6.26562 18.084 6.26562 20.501C6.26562 21.5381 6.99512 22.0215 8.51562 22.0215ZM8.24316 20.4834C8.03223 20.4834 7.95312 20.4131 7.95312 20.2549C7.95312 18.9102 10.124 16.4053 14 16.4053C17.8672 16.4053 20.0381 18.9102 20.0381 20.2549C20.0381 20.4131 19.959 20.4834 19.748 20.4834H8.24316Z"
                        fill="rgba(0,0,0,0.8)"
                      />
                    </svg>
                  </button>

                  <div
                    onClick={() => {
                      logout();
                      setShowMenu(false);
                    }}
                    className="cursor-pointer flex w-full px-4 py-3 justify-between items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg-[rgba(0,0,0,0.05)]"
                  >
                    <span>Log out</span>
                    <LogoutIcon fill="rgba(0,0,0,0.8)" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {completedCount < totalCount && (
            <div
              className="relative m-2 group"
              onMouseEnter={() => {
                if (hoverTimeoutRef.current) {
                  window.clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
                setShowGettingStarted(true);
              }}
              onMouseLeave={() => {
                if (hoverTimeoutRef.current) {
                  window.clearTimeout(hoverTimeoutRef.current);
                }
                hoverTimeoutRef.current = window.setTimeout(() => {
                  setShowGettingStarted(false);
                }, 150);
              }}
            >
              <div className="flex items-center gap-2 bg-transparent group-hover:bg-[#F9F9FB] transition-colors rounded-lg px-3 py-2 cursor-default">
                <CircularProgressBar
                  progress={(completedCount / totalCount) * 100}
                  size={18}
                  strokeWidth={3}
                />
                <span className="font-rounded-bold text-sm">
                  Getting Started
                </span>
              </div>
              <div
                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 ${
                  showGettingStarted
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
                style={{
                  transition: "opacity 80ms ease-out",
                }}
                onMouseEnter={() => {
                  if (hoverTimeoutRef.current) {
                    window.clearTimeout(hoverTimeoutRef.current);
                    hoverTimeoutRef.current = null;
                  }
                  setShowGettingStarted(true);
                }}
                onMouseLeave={() => {
                  if (hoverTimeoutRef.current) {
                    window.clearTimeout(hoverTimeoutRef.current);
                  }
                  hoverTimeoutRef.current = window.setTimeout(() => {
                    setShowGettingStarted(false);
                  }, 150);
                }}
              >
                <GettingStartedPopover />
              </div>
            </div>
          )}

          {/* <div className="flex items-center gap-2 my-2">
          <div className="flex items-center gap-0">
            <FlameIcon />
            <span className="font-rounded-heavy text-md">{user.streak}</span>
          </div>
          <div className="flex items-center gap-0">
            <StarIcon />
            <span className="font-rounded-heavy text-md">
              {user.numberOfStars}
            </span>
          </div>
          <div className="flex items-center gap-0">
            <HeartIcon />
            <span className="font-rounded-heavy text-md">
              {hasActivePlan
                ? "∞"
                : user.dateOfFirstUse !== null &&
                    moment(user.dateOfFirstUse).isBefore(
                      moment().subtract(3, "days")
                    )
                  ? 0
                  : Math.max(0, 3 - (user.featuresUsedToday ?? 0))}
            </span>
          </div>
        </div> */}
        </div>
      </div>
    </>
  );
}
