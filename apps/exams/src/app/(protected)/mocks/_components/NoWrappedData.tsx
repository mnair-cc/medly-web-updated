"use client";

import { useRouter } from "next/navigation";
import SnowfallEffect from "@/app/(protected)/mocks/register/_components/christmas/SnowfallEffect";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import { WRAPPED_SEEN_KEY } from "../_constants/slides";

const NoWrappedData = () => {
  const router = useRouter();

  const handleBackToHome = () => {
    // Mark wrapped as seen so user doesn't get redirected here again
    localStorage.setItem(WRAPPED_SEEN_KEY, "true");
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#1D9AEE] via-[#1D9AEE] via-70% to-[#4BB8F0]">
      {/* Snowfall Effect */}
      <div className="fixed inset-0 z-[1] overflow-hidden pointer-events-none">
        <SnowfallEffect />
      </div>

      {/* Decorative snowflakes */}
      <div className="pointer-events-none fixed right-[60px] top-[100px] z-[1] -rotate-[20deg]">
        <p className="text-[112px] leading-[60px] text-white/50 blur-[2px]">
          ❄️
        </p>
      </div>
      <div className="pointer-events-none fixed left-[60px] top-[40px] z-[1] -rotate-[36deg]">
        <p className="text-[180px] leading-[60px] text-white/50 blur-sm">❄️</p>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center">
        <div className="text-[80px] mb-6">🎄</div>

        <h1 className="text-white text-3xl sm:text-4xl font-rounded-heavy mb-4">
          No Wrapped Data
        </h1>

        <p className="text-white/80 text-lg sm:text-xl font-rounded-medium max-w-md mb-8">
          You didn&apos;t complete any mocks this time around. We hope to see
          you next year!
        </p>

        <PrimaryButtonClicky
          buttonText="Back to Home"
          onPress={handleBackToHome}
          showKeyboardShortcut={false}
        />
      </div>
    </div>
  );
};

export default NoWrappedData;
