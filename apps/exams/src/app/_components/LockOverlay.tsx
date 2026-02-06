"use client";

import ReturnIcon from "@/app/_components/icons/ReturnIcon";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import Image from "next/image";
export default function LockOverlay() {
  const handleHomeClick = () => {
    // Set cookie to bypass the "redirect to last lesson" middleware logic
    document.cookie = "intentionalHomeVisit=true; path=/; max-age=10";
    // Use window.location for a full navigation so middleware sees the cookie
    window.location.href = "/";
  };

  return (
    <div className="absolute inset-0 backdrop-blur-[2px] bg-black/50 flex items-center justify-center z-[1100]">
      <div className="bg-white rounded-[8px] text-center shadow-[0_0_32px_rgba(0,0,0,0.2)] w-[90%] md:w-[420px] overflow-hidden relative flex flex-col items-center md:max-h-[75%]">
        <div className="absolute top-4 left-4">
          <button
            onClick={handleHomeClick}
            className="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-md"
          >
            <ReturnIcon />
          </button>
        </div>

        <div className="flex flex-col justify-center md:h-[240px] max-h-[240px] overflow-hidden bg-[#F2F2F7]">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fsidebar.gif?alt=media&token=c1b3f5d1-ee2c-4b5a-a2cc-79b88cffea1d"
            alt="Unlock all questions"
            width={1200}
            height={800}
            className="pt-10"
          />
        </div>

        <div className="flex-1 px-6 pt-4 pb-8 flex flex-col justify-center items-center">
          <h1 className="text-3xl mb-2 font-rounded-heavy">
            Unlock all questions
          </h1>
          <p className="text-sm mb-4">
            Learn how to answer every question in your exam syllabus with Medly.
            Unlock unlimited access to all questions and revision notes.
          </p>
          <PrimaryButtonClicky
            buttonState="filled"
            buttonText="Upgrade Now"
            href="/plan"
            showKeyboardShortcut={false}
            isLong={true}
            doesStretch={true}
          />
        </div>
      </div>
    </div>
  );
}
