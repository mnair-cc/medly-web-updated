"use client";

import { useHasActivePlan } from "@/app/_context/PlanProvider";
import { useFeatureUsage } from "@/app/_hooks/useFeatureUsage";
import { useMedlyMondays } from "@/app/_hooks/useMedlyMondays";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TrialPromptProps {
  subjectLegacyId?: string | null;
}

const TrialPrompt = ({ subjectLegacyId }: TrialPromptProps) => {
  const { hasActivePlan, isLoading: planDetailsLoading } = useHasActivePlan();
  const { featureUsage, isLoading: featureUsageLoading } = useFeatureUsage();
  const { track } = useTracking();
  const { isSubjectUnlocked } = useMedlyMondays();
  const [hasInitialized, setHasInitialized] = useState(false);

  const isFreeSubject = isSubjectUnlocked(subjectLegacyId);

  // Extract subject name from legacy ID for display
  const getSubjectName = (legacyId: string | null | undefined): string => {
    if (!legacyId) return "This subject";
    const subjectMap: Record<string, string> = {
      Bio: "Biology",
      Chem: "Chemistry",
      Phys: "Physics",
      Maths: "Maths",
    };
    for (const [key, name] of Object.entries(subjectMap)) {
      if (legacyId.includes(key)) {
        return name;
      }
    }
    return "This subject";
  };

  const subjectName = getSubjectName(subjectLegacyId);

  // Only block initial render on loading; once shown, keep the banner mounted
  useEffect(() => {
    if (!hasInitialized && !featureUsageLoading && !planDetailsLoading) {
      setHasInitialized(true);
    }
  }, [hasInitialized, featureUsageLoading, planDetailsLoading]);

  const handleUpgradeClick = () => {
    track("upgrade_link_clicked", {
      location: "trial_prompt",
      featuresUsed: featureUsage.featuresUsedToday,
      maxFeatures: featureUsage.maxDailyFeatures,
      isAtLimit: featureUsage.isFreeUseFinished,
    });
  };

  // Hide until we have initial data, and when user has an active plan
  if (!hasInitialized || hasActivePlan) return null;

  // Medly Mondays banner for free subject
  if (isFreeSubject) {
    return (
      <div className="">
        <div
          className="flex items-center justify-center p-2 text-white font-medium text-sm text-center"
          style={{
            background: `repeating-linear-gradient(90deg, #00D26A 0px, #00D26A 60px, #009D4E 60px, #009D4E 120px)`,
          }}
        >
          <div className="flex flex-wrap justify-center space-x-1">
            <span className="font-heavy">Medly Mondays</span>
            <span>-</span>
            <span>{subjectName} is unlocked free today!</span>
          </div>
        </div>
      </div>
    );
  }

  // Default trial banner
  return (
    <div className="">
      <div className="flex items-center justify-center bg-red-500 p-2 text-white font-medium text-sm text-center">
        {featureUsage.isFreeUseFinished ? (
          <div className="flex flex-wrap justify-center space-x-1">
            <span>You&apos;ve reached your limit.</span>
            <Link
              href="/plan"
              className="font-medium underline block sm:inline sm:ml-1"
              onClick={handleUpgradeClick}
            >
              Upgrade for unlimited access.
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center space-x-1">
            <div>
              You&apos;ve used{" "}
              <span className="font-heavy">
                {featureUsage.featuresUsedToday}
              </span>{" "}
              of your{" "}
              <span className="font-heavy">
                {featureUsage.maxDailyFeatures}
              </span>{" "}
              free activities for today.
            </div>
            <div>
              {featureUsage.maxDaysOfFreeUse -
                (featureUsage.daysSinceFirstUse ?? 1) -
                1 ===
              0 ? (
                <span>Expires today.</span>
              ) : (
                <>
                  Expires in{" "}
                  <span className="font-heavy">
                    {featureUsage.maxDaysOfFreeUse -
                      (featureUsage.daysSinceFirstUse ?? 1) -
                      1}
                  </span>{" "}
                  day
                  {featureUsage.maxDaysOfFreeUse -
                    (featureUsage.daysSinceFirstUse ?? 0) ===
                  1
                    ? ""
                    : "s"}
                  .
                </>
              )}
            </div>
            <Link
              href="/plan"
              className="font-medium underline block sm:inline"
              onClick={handleUpgradeClick}
            >
              Upgrade for unlimited access.
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrialPrompt;
