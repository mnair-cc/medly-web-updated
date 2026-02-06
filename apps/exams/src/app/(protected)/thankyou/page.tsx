"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/_context/UserProvider";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import { useSession } from "next-auth/react";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";

export default function ThankYou() {
  const router = useRouter();
  const { user } = useUser();
  const { refetchPlan } = useHasActivePlan();
  const { data: session } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);

  // Load Google Ads on page load
  useEffect(() => {
    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ADS}`;
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);} 
      gtag('js', new Date());
      gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ADS}');
    `;
    document.head.appendChild(script2);
  }, []);

  const greetingLine = useMemo(() => {
    const raw = user?.userName?.trim() || "";
    const name = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
    return name ? `Welcome to Medly Pro, ${name}!` : "Welcome to Medly Pro!";
  }, [user?.userName]);

  // Subtitle rendered inline to allow bolding the email separately

  const handleStart = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await refetchPlan();
    } catch (err) {
      console.error("Plan refetch error", err);
    } finally {
      router.push("/");
    }
  };

  return (
    <div className="min-h-dvh md:min-h-screen flex flex-col bg-gradient-to-b from-[#000102] to-[#002678] text-white pt-10 pb-10">
      <div className="max-w-3xl w-full px-6 mx-auto flex flex-col flex-1">
        {/* Top: Logo */}
        <div className="flex justify-center mb-10">
          <GlowMedlyLogo />
        </div>

        {/* Middle: Text positioned at ~1/3 between logo and button */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1" />
          <div className="text-center">
            <h1 className="text-white text-4xl mb-3 max-w-[488px] mx-auto font-rounded-bold">
              {greetingLine}
            </h1>
            <p className="text-white max-w-80 mx-auto">
              {session?.user?.email ? (
                <>
                  {"You've activated a Medly Pro subscription for "}
                  <span className="font-bold">{session.user.email}</span>
                  {"."}
                </>
              ) : (
                "You've activated a Medly Pro subscription."
              )}
            </p>
          </div>
          <div className="flex-[2]" />
        </div>

        {/* Bottom: CTA */}
        <div className="flex justify-center mt-10">
          <PrimaryButtonClicky
            buttonState="filled"
            buttonText={
              isSyncing
                ? "Checking your plan…"
                : "Start Learning With Medly Pro"
            }
            onPress={handleStart}
            isLoading={isSyncing}
            disabled={isSyncing}
            isFontRounded={true}
            showKeyboardShortcut={false}
            isLong={true}
          />
        </div>
      </div>
    </div>
  );
}

function GlowMedlyLogo() {
  return (
    <div className="relative inline-block">
      <span className="text-white text-3xl font-rounded-bold">medly</span>
      <svg
        viewBox="0 0 212 185"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute left-full top-1/2 -translate-x-1/2 -translate-y-1/2"
        width="212"
        height="185"
        aria-hidden
        focusable="false"
      >
        <path
          d="M111.459 89.9178C111.805 89.9178 112.067 89.6673 112.115 89.3095C112.974 82.8445 113.892 81.8306 120.286 81.1269C120.655 81.0792 120.918 80.8048 120.918 80.4589C120.918 80.113 120.655 79.8387 120.286 79.7909C113.916 79.0514 113.01 78.0972 112.115 71.6083C112.055 71.2505 111.805 71 111.459 71C111.113 71 110.851 71.2505 110.803 71.6083C109.944 78.0733 109.026 79.0872 102.632 79.7909C102.25 79.8387 102 80.113 102 80.4589C102 80.8048 102.25 81.0792 102.632 81.1269C108.978 81.9738 109.861 82.8207 110.803 89.3095C110.863 89.6673 111.113 89.9178 111.459 89.9178Z"
          fill="white"
        />
        <path
          d="M121.117 98.8864C121.081 99.1249 120.902 99.2919 120.664 99.2919C120.413 99.2919 120.234 99.1249 120.211 98.8625C119.817 95.7016 119.686 95.6062 116.453 95.0933C116.167 95.0575 116 94.9024 116 94.64C116 94.4014 116.167 94.2344 116.406 94.1867C119.674 93.5784 119.817 93.5784 120.211 90.4294C120.234 90.167 120.413 90 120.664 90C120.902 90 121.081 90.167 121.117 90.4175C121.523 93.638 121.642 93.7335 124.91 94.1867C125.149 94.2225 125.328 94.4014 125.328 94.64C125.328 94.8905 125.149 95.0575 124.922 95.0933L124.903 95.0969C121.63 95.7136 121.534 95.7316 121.117 98.8864Z"
          fill="white"
        />
        <g filter="url(#filter0_f_115_6)">
          <ellipse
            cx="106"
            cy="92.5"
            rx="23.5"
            ry="37"
            transform="rotate(-90 106 92.5)"
            fill="white"
          />
        </g>
        <path
          d="M108.209 98.6062C108.185 98.7612 108.089 98.8567 107.934 98.8567C107.779 98.8567 107.684 98.7612 107.648 98.6062C107.302 96.638 107.314 96.6142 105.262 96.2086C105.095 96.1848 105 96.0894 105 95.9224C105 95.7673 105.095 95.6719 105.25 95.648C107.326 95.2305 107.266 95.1948 107.648 93.2505C107.684 93.0954 107.779 93 107.934 93C108.089 93 108.185 93.0954 108.209 93.2505C108.602 95.2186 108.555 95.2544 110.606 95.648C110.761 95.6719 110.869 95.7673 110.869 95.9224C110.869 96.0894 110.761 96.1848 110.606 96.2086C108.543 96.6142 108.566 96.638 108.209 98.6062Z"
          fill="white"
        />
        <defs>
          <filter
            id="filter0_f_115_6"
            x="0.808052"
            y="0.808052"
            width="210.384"
            height="183.384"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="34.096"
              result="effect1_foregroundBlur_115_6"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
