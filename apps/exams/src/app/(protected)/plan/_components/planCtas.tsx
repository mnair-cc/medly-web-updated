import React, { useState } from "react";
import { useTracking } from "@/app/_lib/posthog/useTracking";

interface PlanCtasProps {
  handleContinue: (planId: string) => void;
  isLoading: string | null;
}

export default function PlanCtas({ handleContinue, isLoading }: PlanCtasProps) {
  const { track } = useTracking();
  const [activeTab, setActiveTab] = useState("2026");

  const plans2026 = [
    {
      duration: "Monthly",
      description: "Monthly billing, full access, cancel anytime.",
      originalPrice: "£29.99",
      price: "24.99",
      savings: null,
      isPopular: false,
      billingNote: "£24.99 billed monthly. Cancel anytime.",
      planId: "monthly",
      ctaText: "Subscribe Monthly",
    },
    {
      duration: "2026 Exams",
      description:
        "One-time payment. Get unlimited access until 31st July 2026.",
      originalPrice: "300.00",
      price: "125.00",
      savings: "58%",
      isPopular: true,
      billingNote: "£125 billed once.",
      planId: "blockAnnual",
      ctaText: "Get Exam Access",
    },
  ];

  const plans2027 = [
    {
      duration: "Monthly",
      description: "Monthly billing, full access, cancel anytime.",
      originalPrice: "£29.99",
      price: "24.99",
      savings: null,
      isPopular: false,
      billingNote: "£24.99 billed monthly. Cancel anytime.",
      planId: "monthly",
      ctaText: "Subscribe Monthly",
    },
    {
      duration: "2027 Exams",
      description:
        "One-time payment. Get unlimited access until 31st July 2027.",
      originalPrice: "£575.00",
      price: "200.00",
      savings: "65%",
      isPopular: true,
      billingNote: "£200 billed once.",
      planId: "blockAnnual2027",
      ctaText: "Get Exam Access",
    },
  ];

  const activePlans = activeTab === "2026" ? plans2026 : plans2027;

  return (
    <div
      id="pricing-section"
      className="flex flex-col items-center justify-center p-4 gap-8 w-full"
    >
      <div className="p-1 bg-[#F4F4F4] rounded-full shadow-inner flex relative">
        {/* Animated white background pill */}
        <div
          className="absolute h-[calc(100%-8px)] top-1 transition-all duration-300 ease-in-out rounded-full bg-white shadow-sm"
          style={{
            width: "calc(50% - 8px)", // Reduced width to account for padding on both sides
            left: activeTab === "2026" ? "4px" : "calc(50% + 4px)",
            right: activeTab === "2026" ? undefined : "4px", // Add right padding when on 2027 tab
          }}
        />

        {/* Tab buttons */}
        <button
          onClick={() => setActiveTab("2026")}
          className={`px-6 py-2.5 rounded-full transition-all text-[17px] font-heading z-10 relative flex-1 flex justify-center items-center whitespace-nowrap ${
            activeTab === "2026"
              ? "text-black"
              : "text-[#595959] hover:text-black"
          }`}
        >
          2026 Exams
        </button>
        <button
          onClick={() => setActiveTab("2027")}
          className={`px-6 py-2.5 rounded-full transition-all text-[17px] font-heading z-10 relative flex-1 flex justify-center items-center whitespace-nowrap ${
            activeTab === "2027"
              ? "text-black"
              : "text-[#595959] hover:text-black"
          }`}
        >
          2027 Exams
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 max-w-[640px]">
        {activePlans.map((plan, index) => (
          <div
            key={index}
            className={`flex-1 rounded-2xl overflow-visible border border-[#E6E6E6] ${
              plan.isPopular ? "relative" : ""
            }`}
            style={{ animationDelay: `${index * 200}ms` }}
          >
            <div className="overflow-hidden rounded-2xl">
              <div
                className={`p-6 flex flex-col relative ${
                  plan.isPopular
                    ? "bg-gradient-to-r from-[#05B0FF] to-[#007AFF]"
                    : "bg-white border-b border-[#E6E6E6]"
                }`}
              >
                {plan.savings && (
                  <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-[white] text-[12px] font-medium text-[#00AEFF] flex items-center z-10">
                    Save {plan.savings}
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <div
                    className={`text-[24px] font-heavy tracking-[-0.02em] ${
                      plan.isPopular ? "text-white" : "text-black"
                    }`}
                  >
                    {plan.duration}
                  </div>
                </div>
                <div
                  className={`text-[15px] leading-normal mt-2 ${
                    plan.isPopular ? "text-white" : "text-black/60"
                  }`}
                >
                  {plan.description}
                </div>
              </div>

              <div className="p-6 pb-4 flex flex-col bg-white h-[260px] justify-between">
                <div className="mb-8">
                  <div className="flex items-baseline">
                    <span
                      className={`text-[40px] font-heavy font-['Helvetica Neue'] tracking-[-0.02em] ${
                        plan.isPopular
                          ? "bg-gradient-to-r from-[#05B0FF] to-[#007AFF] text-transparent bg-clip-text"
                          : "bg-gradient-to-r from-[#818181] to-black text-transparent bg-clip-text"
                      }`}
                    >
                      £{plan.price}
                    </span>
                    <span
                      className={`text-[15px] ${
                        plan.isPopular
                          ? "bg-gradient-to-r from-[#05B0FF] to-[#007AFF] text-transparent bg-clip-text"
                          : "bg-gradient-to-r from-[#818181] to-black text-transparent bg-clip-text"
                      }`}
                    >
                      {plan.duration.includes("Exams") ? "once" : "/month"}
                    </span>
                  </div>
                  <div className="text-[15px] text-black/50 line-through">
                    {!plan.duration.includes("Monthly") &&
                      plan.originalPrice && (
                        <>
                          {plan.originalPrice.startsWith("£")
                            ? plan.originalPrice
                            : `£${plan.originalPrice}`}
                          {plan.duration.includes("Exams") ? " " : "/month"}
                        </>
                      )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 relative">
                  <button
                    type="button"
                    onClick={() => {
                      track("click_plan_cta", {
                        plan_id: plan.planId,
                      });
                      handleContinue(plan.planId);
                    }}
                    disabled={isLoading !== null}
                    className={`w-full px-6 py-4 rounded-full font-medium text-[15px] 
                    ${
                      plan.isPopular
                        ? "bg-gradient-to-r from-[#05B0FF] to-[#007AFF] text-white"
                        : "border border-[rgba(0,0,0,0.1)] bg-white text-black"
                    }
                    ${
                      isLoading === plan.planId
                        ? "opacity-70 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isLoading === plan.planId ? "Processing..." : plan.ctaText}
                  </button>
                  {plan.billingNote && (
                    <div className="text-[13px] text-black/50 text-center mt-1">
                      {plan.billingNote}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
