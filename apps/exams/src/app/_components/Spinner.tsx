"use client";

import React from "react";

interface SpinnerProps {
  size?: "small" | "normal" | "large";
  style?: "light" | "dark";
  className?: string;
}

export default function Spinner({
  size = "normal",
  style = "dark",
  className = "",
}: SpinnerProps) {
  const sizeClasses =
    size === "large"
      ? "ispinner-large"
      : size === "small"
        ? "ispinner-small"
        : "";
  const styleClasses = style === "light" ? "ispinner-light" : "";

  return (
    <div className={`ispinner ${sizeClasses} ${styleClasses} ${className}`}>
      <div className="ispinner-blade"></div>
      <div className="ispinner-blade"></div>
      <div className="ispinner-blade"></div>
      <div className="ispinner-blade"></div>
      <div className="ispinner-blade"></div>
      <div className="ispinner-blade"></div>
      <div className="ispinner-blade"></div>
      <div className="ispinner-blade"></div>
      <style jsx>{`
        .ispinner {
          position: relative;
          width: 24px;
          height: 24px;
        }

        .ispinner .ispinner-blade {
          position: absolute;
          top: 7.8px;
          left: 10.2px;
          width: 3px;
          height: 7.8px;
          background-color: #8e8e93;
          border-radius: 1.5px;
          animation: iSpinnerBlade 1s linear infinite;
          will-change: opacity;
        }

        .ispinner .ispinner-blade:nth-child(1) {
          transform: rotate(45deg) translateY(-7.8px);
          animation-delay: -1.625s;
        }

        .ispinner .ispinner-blade:nth-child(2) {
          transform: rotate(90deg) translateY(-7.8px);
          animation-delay: -1.5s;
        }

        .ispinner .ispinner-blade:nth-child(3) {
          transform: rotate(135deg) translateY(-7.8px);
          animation-delay: -1.375s;
        }

        .ispinner .ispinner-blade:nth-child(4) {
          transform: rotate(180deg) translateY(-7.8px);
          animation-delay: -1.25s;
        }

        .ispinner .ispinner-blade:nth-child(5) {
          transform: rotate(225deg) translateY(-7.8px);
          animation-delay: -1.125s;
        }

        .ispinner .ispinner-blade:nth-child(6) {
          transform: rotate(270deg) translateY(-7.8px);
          animation-delay: -1s;
        }

        .ispinner .ispinner-blade:nth-child(7) {
          transform: rotate(315deg) translateY(-7.8px);
          animation-delay: -0.875s;
        }

        .ispinner .ispinner-blade:nth-child(8) {
          transform: rotate(360deg) translateY(-7.8px);
          animation-delay: -0.75s;
        }

        .ispinner.ispinner-large {
          width: 35px;
          height: 35px;
        }

        .ispinner.ispinner-large .ispinner-blade {
          top: 11.5px;
          left: 15px;
          width: 5px;
          height: 12px;
          border-radius: 2.5px;
        }

        .ispinner.ispinner-large .ispinner-blade:nth-child(1) {
          transform: rotate(45deg) translateY(-11.5px);
        }

        .ispinner.ispinner-large .ispinner-blade:nth-child(2) {
          transform: rotate(90deg) translateY(-11.5px);
        }

        .ispinner.ispinner-large .ispinner-blade:nth-child(3) {
          transform: rotate(135deg) translateY(-11.5px);
        }

        .ispinner.ispinner-large .ispinner-blade:nth-child(4) {
          transform: rotate(180deg) translateY(-11.5px);
        }

        .ispinner.ispinner-large .ispinner-blade:nth-child(5) {
          transform: rotate(225deg) translateY(-11.5px);
        }

        .ispinner.ispinner-large .ispinner-blade:nth-child(6) {
          transform: rotate(270deg) translateY(-11.5px);
        }

        .ispinner.ispinner-large .ispinner-blade:nth-child(7) {
          transform: rotate(315deg) translateY(-11.5px);
        }

        .ispinner.ispinner-large .ispinner-blade:nth-child(8) {
          transform: rotate(360deg) translateY(-11.5px);
        }

        .ispinner.ispinner-small {
          width: 16px;
          height: 16px;
        }

        .ispinner.ispinner-small .ispinner-blade {
          top: 5.2px;
          left: 6.8px;
          width: 2px;
          height: 5.2px;
          border-radius: 1px;
        }

        .ispinner.ispinner-small .ispinner-blade:nth-child(1) {
          transform: rotate(45deg) translateY(-5.2px);
        }

        .ispinner.ispinner-small .ispinner-blade:nth-child(2) {
          transform: rotate(90deg) translateY(-5.2px);
        }

        .ispinner.ispinner-small .ispinner-blade:nth-child(3) {
          transform: rotate(135deg) translateY(-5.2px);
        }

        .ispinner.ispinner-small .ispinner-blade:nth-child(4) {
          transform: rotate(180deg) translateY(-5.2px);
        }

        .ispinner.ispinner-small .ispinner-blade:nth-child(5) {
          transform: rotate(225deg) translateY(-5.2px);
        }

        .ispinner.ispinner-small .ispinner-blade:nth-child(6) {
          transform: rotate(270deg) translateY(-5.2px);
        }

        .ispinner.ispinner-small .ispinner-blade:nth-child(7) {
          transform: rotate(315deg) translateY(-5.2px);
        }

        .ispinner.ispinner-small .ispinner-blade:nth-child(8) {
          transform: rotate(360deg) translateY(-5.2px);
        }

        .ispinner.ispinner-light .ispinner-blade {
          background-color: #ffffff;
        }

        @keyframes iSpinnerBlade {
          0% {
            opacity: 0.85;
          }
          50% {
            opacity: 0.25;
          }
          100% {
            opacity: 0.25;
          }
        }
      `}</style>
    </div>
  );
}
