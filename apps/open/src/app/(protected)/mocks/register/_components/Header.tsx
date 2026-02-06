"use client";

import { useState, useEffect } from "react";
import { useMockDates } from "../../_hooks/useMockDates";
import { nextApiClient } from "@/app/_lib/utils/axiosHelper";
import { MockRegistrationData } from "@/app/types/types";
import { useSearchParams } from "next/navigation";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";

const Header = ({
  isRegistrationOpen,
  setData,
}: {
  isRegistrationOpen: boolean;
  setData: (data: MockRegistrationData) => void;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const searchParams = useSearchParams();
  const { mocksStart, registrationOpens } = useMockDates();

  // Auto-populate referral code from URL query parameter
  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
      setIsAutoFilled(true);
      // Remove the animation class after animation completes
      setTimeout(() => setIsAutoFilled(false), 1000);
    }
  }, [searchParams]);

  const handleRegister = async () => {
    setIsSubmitting(true);

    try {
      const response = await nextApiClient.post("/user/mocks/register", {
        referralCodeUsed: referralCode.trim(),
      });

      if (response.status === 200) {
        const mockRegistrationData = response.data as MockRegistrationData;
        setData(mockRegistrationData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center pt-20">
      <svg
        width="80"
        height="80"
        viewBox="0 0 35 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M30.8398 12.1113C28.5053 10.7901 23.1926 7.18115 13.5699 18.4405L11.8493 20.2393C11.8493 20.2393 3.67511 16.7389 0.906796 20.546C-1.42546 23.7534 1.16594 27.0945 3.88691 27.0945C6.89525 27.0945 9.6534 24.6761 11.6581 22.5712L18.4259 27.2881C20.4651 28.7005 22.8485 29.5 25.2828 29.5C27.7809 29.4867 30.9927 28.7405 33.1212 25.7025C37.3161 19.4769 33.5585 13.7303 30.8398 12.1113ZM4.4122 23.0832C4.27873 22.3884 4.60432 21.8522 5.07608 21.6143C6.52802 20.8822 9.93752 21.9716 9.93752 21.9716C9.93752 21.9716 7.47693 24.0332 5.83632 24.16C5.17089 24.2114 4.56925 23.9007 4.4122 23.0832ZM28.0991 19.4267C27.7168 21.5587 25.9448 24.1662 18.8592 22.3713C14.5258 21.1721 13.4117 20.6464 13.4117 20.6464C13.4117 20.6464 18.2257 15.3906 22.173 14.7762C26.9535 14.0321 28.4815 17.2948 28.0991 19.4267Z"
          fill="black"
        />
        <path
          d="M30.8398 12.1113C28.5053 10.7901 23.1926 7.18115 13.5699 18.4405L11.8493 20.2393C11.8493 20.2393 3.67511 16.7389 0.906796 20.546C-1.42546 23.7534 1.16594 27.0945 3.88691 27.0945C6.89525 27.0945 9.6534 24.6761 11.6581 22.5712L18.4259 27.2881C20.4651 28.7005 22.8485 29.5 25.2828 29.5C27.7809 29.4867 30.9927 28.7405 33.1212 25.7025C37.3161 19.4769 33.5585 13.7303 30.8398 12.1113ZM4.4122 23.0832C4.27873 22.3884 4.60432 21.8522 5.07608 21.6143C6.52802 20.8822 9.93752 21.9716 9.93752 21.9716C9.93752 21.9716 7.47693 24.0332 5.83632 24.16C5.17089 24.2114 4.56925 23.9007 4.4122 23.0832ZM28.0991 19.4267C27.7168 21.5587 25.9448 24.1662 18.8592 22.3713C14.5258 21.1721 13.4117 20.6464 13.4117 20.6464C13.4117 20.6464 18.2257 15.3906 22.173 14.7762C26.9535 14.0321 28.4815 17.2948 28.0991 19.4267Z"
          fill="black"
        />
      </svg>

      <div className="font-rounded-bold text-[48px] md:text-[64px] leading-[36px] md:leading-[54px] text-center text-[black] tracking-[-0.02em] mt-5 mb-5 ">
        Medly GCSE Mocks 2025
      </div>

      <p className="text-base font-medium text-center text-[black] ">
        {mocksStart.tz("Europe/London").format("MMMM D, YYYY")}
      </p>

      <p className="text-base text-center text-[rgba(0,0,0,0.5)] mt-5">
        Take the most authentic GCSE practice tests and
        <br className="block" />
        get your predicted scores with detailed feedback.
      </p>

      {isRegistrationOpen ? (
        <div className="flex flex-col items-center justify-center mt-10 max-w-sm gap-5">
          <div className="bg-[#F7F7F7] rounded-[16px] p-6 ">
            <p className="text-[15px] text-[rgba(0,0,0,0.6)] mb-4 text-center">
              Enter a referral code to help a friend skip the waitlist.
            </p>
            <input
              id="referralCode"
              type="text"
              placeholder="Enter code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              maxLength={6}
              className={`w-full bg-white border-[1px] border-[#E6E8FF] rounded-[12px] p-4 text-2xl font-rounded-bold text-[black] tracking-[0.1em] outline-none placeholder:text-[rgba(0,0,0,0.4)] placeholder:text-[15px] placeholder:font-base placeholder:tracking-normal transition-all duration-300 ${
                isAutoFilled ? "scale-105 border-[black] shadow-lg" : ""
              }`}
            />
          </div>
          <PrimaryButtonClicky
            buttonText={
              isSubmitting ? "Registering..." : "Register for Medly Mocks 2025"
            }
            buttonState="filled"
            doesStretch={true}
            onPress={handleRegister}
            disabled={isSubmitting}
            showKeyboardShortcut={false}
          />
        </div>
      ) : (
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 px-6 py-3 rounded-full font-medium text-[15px] bg-gradient-to-r from-[black] to-[black] text-white flex items-center justify-center opacity-50 cursor-not-allowed"
        >
          Registration opens {registrationOpens.tz("Europe/London").format("MMMM D")}
        </button>
      )}

      <div className="text-sm text-center text-gray-500 mt-4">
        <p>Only 1000 spots available</p>
      </div>
    </div>
  );
};

export default Header;
