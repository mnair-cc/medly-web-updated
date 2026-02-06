"use client";

import { useEffect, useState } from "react";

interface OpenLoadingScreenProps {
  avatar?: string;
}

export default function OpenLoadingScreen({ avatar }: OpenLoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setProgress(100), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col justify-center items-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <svg width="38" height="30" viewBox="0 0 38 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M30.2421 0C31.7786 -1.01451e-07 32.8682 1.53984 33.2713 4.28073C33.6671 6.97231 33.3691 10.6057 32.443 14.4063C32.4149 14.5217 32.4879 14.6155 32.607 14.6155H36.208C37.058 14.6155 37.5834 15.2845 37.3444 16.1086C36.3793 19.4363 35.0147 22.5635 33.4735 24.9502C31.7036 27.6911 29.8461 29.2309 28.3095 29.2309C26.773 29.2309 25.6834 27.6911 25.2803 24.9502C25.1295 23.9242 25.0794 22.7615 25.1265 21.5048C25.1352 21.2715 24.749 21.2719 24.642 21.5053C24.0657 22.7618 23.4399 23.9244 22.7823 24.9502C21.0252 27.6911 19.185 29.2311 17.6665 29.2311C16.1481 29.231 15.0759 27.6911 14.6856 24.9502C14.551 24.005 14.5014 22.9436 14.5337 21.7997C14.5402 21.57 14.1664 21.5696 14.0578 21.7992C13.5168 22.9433 12.9343 24.0048 12.3239 24.9502C10.554 27.6911 8.69652 29.2311 7.16 29.2311C5.6235 29.231 4.53392 27.6911 4.13084 24.9502C3.73501 22.2586 4.03303 18.6252 4.95909 14.8246C4.98722 14.7092 4.91418 14.6155 4.79518 14.6155H1.19416C0.344117 14.6155 -0.181482 13.9464 0.0575401 13.1223C1.02265 9.79461 2.38747 6.66743 3.92861 4.28073C5.69846 1.53984 7.55593 3.73709e-05 9.09243 0C10.6289 -1.01452e-07 11.7187 1.5398 12.1218 4.28073C12.2727 5.30679 12.3227 6.46972 12.2755 7.72659C12.2668 7.95985 12.653 7.95947 12.76 7.72611C13.3364 6.46942 13.9623 5.30665 14.62 4.28073C16.377 1.53988 18.2171 4.08144e-05 19.7355 0C21.254 -1.03701e-07 22.3263 1.53983 22.7167 4.28073C22.8512 5.22584 22.9007 6.28713 22.8683 7.43097C22.8618 7.66071 23.2356 7.66111 23.3442 7.43148C23.8853 6.28745 24.4679 5.22599 25.0783 4.28073C26.8481 1.53985 28.7056 8.12023e-06 30.2421 0Z" fill="black" />
        </svg>

        {/* Loading bar */}
        <div className="w-[120px] h-1 bg-[#F2F2F7] rounded-full mt-1 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(to right, #B7F652 0%, #46E790 25%, #1FADFF 50%, #AA64F5 75%, #F6B0CE 100%)",
            }}
          />
        </div>

        {/* Loading text */}
        <p className="text-gray-300 text-center text-sm w-[320px]">
          Did you know? Medly was made by 2 doctors <br /> who wanted to make personalized <br />education available for all.
        </p>
      </div>
    </div>
  );
}
