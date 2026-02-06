"use client";

import { useMOUser } from "@/app/(protected)/open/_context/MOUserProvider";
import { useSidebar } from "@/app/(protected)/open/_components/sidebar/MOSidebarLayoutClient";
import EditIcon from "@/app/_components/icons/EditIcon";
import LogoutIcon from "@/app/_components/icons/LogoutIcon";
import { useAuth } from "@/app/_context/AuthProvider";
import { useEffect, useRef, useState } from "react";

interface SidebarUserSectionProps {
  leftSidebarWidth: number;
}

export default function SidebarUserSection({
  leftSidebarWidth,
}: SidebarUserSectionProps) {
  const moUser = useMOUser();
  const { logout } = useAuth();

  // Extract profile data from the OP user's data field
  const userData = moUser.data as {
    userName?: string;
    avatar?: string;
  };
  const { setIsManageAccountOpen } = useSidebar();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
              className="flex items-center gap-2 hover:bg-[#F9F9FB] rounded-[10px] pl-2 pr-4 py-2"
              onClick={() => setShowMenu(!showMenu)}
            >
              <div className="text-2xl font-bold bg-[#DBDEEA] rounded-full px-2 py-1 hover:bg-[#C8CCD8] transition-colors">
                {userData.avatar || "👤"}
              </div>
              <p className="font-rounded-bold">
                {userData.userName
                  ? userData.userName.charAt(0).toUpperCase() +
                    userData.userName.slice(1)
                  : ""}
              </p>
            </button>

            {showMenu && (
              <div
                ref={menuRef}
                className="absolute bottom-full left-0 mb-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 z-50 whitespace-nowrap"
              >
                <div className="flex flex-col gap-0 p-2">
                  <div
                    className="cursor-pointer flex w-full px-4 py-3 gap-2 items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg-[rgba(0,0,0,0.05)]"
                    onClick={() => {
                      window.open(
                        "https://medlyai.tawk.help/article/frequently-asked-questions",
                      );
                      setShowMenu(false);
                    }}
                  >
                    <EditIcon fill="rgba(0,0,0,0.8)" />
                    <span>Provide feedback</span>
                  </div>

                  <button
                    className="cursor-pointer flex w-full px-4 py-3 gap-2 items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg-[rgba(0,0,0,0.05)]"
                    onClick={() => {
                      setShowMenu(false);
                      setIsManageAccountOpen(true);
                    }}
                  >
                    <svg
                      fill="none"
                      height="28"
                      viewBox="0 0 28 28"
                      width="28"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M14 13.8477C16.127 13.8477 17.8496 11.9668 17.8496 9.66406C17.8496 7.39648 16.127 5.59473 14 5.59473C11.8818 5.59473 10.1416 7.42285 10.1504 9.68164C10.1592 11.9756 11.873 13.8477 14 13.8477ZM14 12.3096C12.7871 12.3096 11.7588 11.1582 11.7588 9.68164C11.75 8.24023 12.7783 7.13281 14 7.13281C15.2305 7.13281 16.2412 8.22266 16.2412 9.66406C16.2412 11.1406 15.2217 12.3096 14 12.3096ZM8.51562 22.0215H19.4756C20.9961 22.0215 21.7256 21.5381 21.7256 20.501C21.7256 18.084 18.7109 14.8672 14 14.8672C9.28906 14.8672 6.26562 18.084 6.26562 20.501C6.26562 21.5381 6.99512 22.0215 8.51562 22.0215ZM8.24316 20.4834C8.03223 20.4834 7.95312 20.4131 7.95312 20.2549C7.95312 18.9102 10.124 16.4053 14 16.4053C17.8672 16.4053 20.0381 18.9102 20.0381 20.2549C20.0381 20.4131 19.959 20.4834 19.748 20.4834H8.24316Z"
                        fill="rgba(0,0,0,0.8)"
                      />
                    </svg>
                    <span>Manage account</span>
                  </button>

                  {/* TODO: Uncomment "Get help" menu item when the documentation page it links to is built
                  <div
                    className="cursor-pointer flex w-full px-4 py-3 gap-2 items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg-[rgba(0,0,0,0.05)]"
                    onClick={() => {
                      window.open("https://medlyai.tawk.help");
                      setShowMenu(false);
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 28 28"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g clipPath="url(#clip0_614_2528)">
                        <path
                          d="M14 22.7334C18.9658 22.7334 23.0791 18.6289 23.0791 13.6543C23.0791 8.68848 18.9658 4.5752 13.9912 4.5752C9.02539 4.5752 4.9209 8.68848 4.9209 13.6543C4.9209 18.6289 9.03418 22.7334 14 22.7334ZM14 20.9492C9.95703 20.9492 6.71387 17.6973 6.71387 13.6543C6.71387 9.61133 9.94824 6.36816 13.9912 6.36816C18.0342 6.36816 21.2861 9.61133 21.2949 13.6543C21.2949 17.6973 18.043 20.9492 14 20.9492ZM13.7979 15.4033C14.2812 15.4033 14.5889 15.1309 14.6152 14.7705C14.6152 14.7354 14.6152 14.6914 14.6152 14.665C14.6416 14.208 14.958 13.9004 15.5293 13.5312C16.3906 12.96 16.9531 12.459 16.9531 11.4395C16.9531 9.97168 15.6348 9.13672 14.0791 9.13672C12.5762 9.13672 11.5479 9.82227 11.2754 10.6484C11.2227 10.7979 11.1963 10.9473 11.1963 11.1055C11.1963 11.5273 11.5303 11.791 11.8818 11.791C12.207 11.791 12.418 11.6592 12.5938 11.4219L12.7344 11.2461C13.0244 10.7627 13.4463 10.5078 13.9736 10.5078C14.6855 10.5078 15.1689 10.9297 15.1689 11.5273C15.1689 12.0811 14.7998 12.3535 14.0527 12.8721C13.4287 13.3027 12.9717 13.7598 12.9717 14.5596V14.6562C12.9717 15.1484 13.2705 15.4033 13.7979 15.4033ZM13.7891 18.1016C14.3516 18.1016 14.8174 17.6885 14.8174 17.1348C14.8174 16.5811 14.3516 16.1768 13.7891 16.1768C13.2178 16.1768 12.7607 16.5898 12.7607 17.1348C12.7607 17.6885 13.2266 18.1016 13.7891 18.1016Z"
                          fill="#1C1C1E"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_614_2528">
                          <rect width="28" height="28" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                    <span>Get help</span>
                  </div>
                  */}

                  <div
                    className="cursor-pointer flex w-full px-4 py-3 gap-2 items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg-[rgba(0,0,0,0.05)]"
                    onClick={() => {
                      logout();
                      setShowMenu(false);
                    }}
                  >
                    <LogoutIcon fill="rgba(0,0,0,0.8)" />
                    <span>Log out</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
