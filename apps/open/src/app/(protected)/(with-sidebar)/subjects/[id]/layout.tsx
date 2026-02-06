"use client";

import { usePathname } from "next/navigation";
import React from "react";

function LessonLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMockView = pathname.includes("/mocks/");

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-x-scroll md:overflow-hidden">
        <div className="flex-1 h-full flex justify-center">
          <div className="w-full h-full">
            <div
              className={`${
                isMockView ? "" : "md:rounded-[16px]"
              } w-full h-full overflow-y-auto relative`}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LessonLayout;
