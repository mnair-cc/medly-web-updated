"use client";

import React from "react";
import Header from "./header/Header";
import { SessionType, MockPage } from "../types";
import { SaveState } from "../hooks/useSession";

export default function SessionMessageShell({
  sessionType,
  lessonId,
  sessionTitle,
  title = "Coming soon",
  line1 = "We're adding new subjects every week.",
  line2 = "Please check back later.",
}: {
  sessionType: SessionType;
  lessonId?: string;
  sessionTitle?: string;
  title?: string;
  line1?: string;
  line2?: string;
}) {
  const emptyPages: MockPage[] = [];

  return (
    <div className="flex flex-col flex-1 overflow-hidden w-full h-full">
      <Header
        currentPageIndex={0}
        handleSetCurrentPageIndex={() => {}}
        pages={emptyPages}
        hasStarted={false}
        hasFinished={false}
        isTimed={false}
        durationInMinutes={null}
        timeStarted={null}
        setIsExitConfirmationModalOpen={() => {}}
        saveState={SaveState.SAVED}
        sessionType={sessionType}
        handleSave={() => {}}
        sessionTitle={sessionTitle || "Session"}
        sessionSubtitle={""}
        isAnnotating={false}
        setIsAnnotating={() => {}}
        returnUrl="/"
        showCalculator={false}
        showReference={false}
        setIsCalculatorOpen={() => {}}
        setIsReferenceOpen={() => {}}
        showStrategy={false}
        setIsStrategyOpen={() => {}}
        showCalculatorTooltip={false}
        isReadOnly={true}
        lessonId={lessonId}
      />

      <div className="flex flex-col justify-center items-center flex-1 overflow-y-auto bg-[#FBFBFD] h-full">
        <div className="bg-transparent rounded-2xl overflow-hidden min-w-[720px] max-w-[800px] mx-auto bg-black">
          <div className="px-8 text-center">
            <p className="text-lg font-rounded-bold text-black">{title}</p>
            <p className="mt-1 text-sm text-black/50 font-rounded-semibold">
              {line1}
            </p>
            <p className="mt-1 text-sm text-black/50 font-rounded-semibold">
              {line2}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
