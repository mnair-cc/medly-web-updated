"use client";

import { use, useEffect } from "react";
import { usePathname } from "next/navigation";
import React from "react";
import { useLastLesson } from "@/app/_hooks/useLastLesson";

function LessonLayout({
  params,
  children,
}: {
  params: Promise<{ lessonId: string }>;
  children: React.ReactNode;
}) {
  const { lessonId } = use(params);
  const pathname = usePathname();
  const { saveLastLesson } = useLastLesson();

  useEffect(() => {
    // Save the current lesson URL as the last visited lesson
    saveLastLesson(lessonId, pathname);
  }, [lessonId, saveLastLesson, pathname]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-x-scroll md:overflow-hidden">
        <div className={`flex-1 h-full flex justify-center`}>{children}</div>
      </div>
    </div>
  );
}

export default LessonLayout;
