"use client";

import { useState, ReactNode } from "react";

type TooltipProps = {
  text: string | ReactNode;
  title?: string;
  subtitle?: string;
  showClose?: boolean;
  type?:
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "none"
  | "bottom-right"
  | "top-middle";
  onClose?: () => void;
  showDoneButton?: boolean;
  onDone?: () => void;
};

export default function Tooltip({
  text,
  title,
  subtitle,
  showClose = false,
  type = "bottom",
  onClose,
  showDoneButton = false,
  onDone,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(true);

  const getArrowStyles = () => {
    switch (type) {
      case "top":
        return "rotate-180 -mt-3 right-8";
      case "top-middle":
        return "-mt-3 -ml-2 left-1/2 rotate-180";
      case "bottom":
        return "-mt-2 -ml-2 left-1/2";
      case "bottom-right":
        return "-mt-2 ml-40";
      case "right":
        return "rotate-[270deg] -ml-1";
      case "left":
        return "rotate-[90deg] -ml-2 -mt-10";
      default:
        return "";
    }
  };

  if (!isVisible) return null;

  return (
    <div className="relative z-50 w-[220px] drop-shadow-[0_0_10px_rgba(0,0,0,0.15)] animate-float">
      {["top", "top-middle"].includes(type) && (
        <div className={`${getArrowStyles()} absolute z-[-1]`}>
          <svg width="13" height="17" viewBox="0 0 13 17" fill="none">
            <path
              d="M11.4055 -9.29314e-08L1.59452 -6.64733e-07C0.625301 -7.21221e-07 1.88129e-07 1.02035 2.4074e-08 2.2714C-2.47933e-08 2.64405 0.0687827 3.02557 0.206349 3.38048L5.12121 15.8377C5.42136 16.6096 5.95911 17 6.49687 17C7.03463 17 7.57864 16.6096 7.87879 15.8377L12.7874 3.38048C12.925 3.0167 13 2.64405 13 2.2714C13 1.02036 12.3747 -3.64437e-08 11.4055 -9.29314e-08Z"
              fill="#333333"
            />
          </svg>
        </div>
      )}

      <div className="p-4 py-3 bg-[#333333] rounded-[16px] flex flex-col gap-4 text-white">
        {showClose && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setIsVisible(false);
                onClose?.();
              }}
            >
              <svg width="15" height="15" viewBox="0 0 28 28" fill="none">
                <path
                  d="M13.9912 22.7422C18.9746 22.7422 23.0879 18.6289 23.0879 13.6543C23.0879 8.67969 18.9658 4.56641 13.9824 4.56641C9.00781 4.56641 4.90332 8.67969 4.90332 13.6543C4.90332 18.6289 9.0166 22.7422 13.9912 22.7422ZM10.9941 17.4863C10.5283 17.4863 10.1592 17.1172 10.1592 16.6426C10.1592 16.4316 10.2471 16.2207 10.4141 16.0625L12.8047 13.6631L10.4141 11.2725C10.2471 11.1143 10.1592 10.9033 10.1592 10.6924C10.1592 10.2178 10.5283 9.85742 10.9941 9.85742C11.2402 9.85742 11.4336 9.93652 11.5918 10.0947L13.9912 12.4854L16.3994 10.0859C16.5752 9.91895 16.7598 9.83984 16.9971 9.83984C17.4629 9.83984 17.832 10.209 17.832 10.6748C17.832 10.8945 17.7441 11.0879 17.5771 11.2637L15.1865 13.6631L17.5771 16.0537C17.7354 16.2207 17.8232 16.4229 17.8232 16.6426C17.8232 17.1172 17.4541 17.4863 16.9795 17.4863C16.7422 17.4863 16.54 17.3984 16.373 17.2402L13.9912 14.8584L11.6094 17.2402C11.4512 17.4072 11.2402 17.4863 10.9941 17.4863Z"
                  fill="#333333"
                />
              </svg>
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {subtitle && <div className="text-[12px] text-left">{subtitle}</div>}
          {title && (
            <div className="text-base md:text-[14px] font-rounded-heavy text-left">
              {title}
            </div>
          )}
          <div className="text-sm md:text-[14px] leading-tight whitespace-pre-line text-center font-rounded-heavy">
            {text}
          </div>
        </div>

        {showDoneButton && (
          <div className="flex justify-end">
            <button
              onClick={onDone}
              className="px-3 py-1 bg-[#00aeff] rounded-full"
            >
              <span className="text-[12px] font-rounded-heavy">Okay</span>
            </button>
          </div>
        )}
      </div>

      {["bottom", "bottom-right", "right", "left"].includes(type) && (
        <div className={`${getArrowStyles()} absolute`}>
          <svg
            width="19"
            height="19"
            viewBox="0 0 19 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9.13281 16.8398C8.37695 16.8398 7.62109 16.4531 7.19922 15.6885L0.291017 3.34863C0.0976575 2.99707 0.000977806 2.61914 0.000977838 2.25C0.000977946 1.01074 0.879884 -1.52059e-06 2.24219 -1.4015e-06L16.0322 -1.95933e-07C17.3945 -7.68364e-08 18.2734 1.01074 18.2734 2.25C18.2734 2.61914 18.168 2.98828 17.9746 3.34863L11.0752 15.6885C10.6533 16.4531 9.88867 16.8398 9.13281 16.8398Z"
              fill="#333333"
            />
            <path
              d="M9.13281 16.8398C8.37695 16.8398 7.62109 16.4531 7.19922 15.6885L0.291017 3.34863C0.0976575 2.99707 0.000977806 2.61914 0.000977838 2.25C0.000977946 1.01074 0.879884 -1.52059e-06 2.24219 -1.4015e-06L16.0322 -1.95933e-07C17.3945 -7.68364e-08 18.2734 1.01074 18.2734 2.25C18.2734 2.61914 18.168 2.98828 17.9746 3.34863L11.0752 15.6885C10.6533 16.4531 9.88867 16.8398 9.13281 16.8398Z"
              stroke="#2F2F2F"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
