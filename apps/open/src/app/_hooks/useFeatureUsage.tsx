import { useUser } from "@/app/_context/UserProvider";
import { useEffect, useState } from "react";
import moment from "moment";

const MAX_DAILY_FEATURES = 10;
const MAX_DAYS_OF_FREE_USE = 3;

export function useFeatureUsage() {
  const { user } = useUser();
  const [featureUsage, setFeatureUsage] = useState<{
    featuresUsedToday: number;
    maxDailyFeatures: number;
    daysSinceFirstUse: number;
    maxDaysOfFreeUse: number;
    isFreeUseFinished: boolean;
  }>({
    featuresUsedToday: user?.featuresUsedToday || 0,
    maxDailyFeatures: MAX_DAILY_FEATURES,
    daysSinceFirstUse: user?.dateOfFirstUse
      ? moment().diff(moment(user.dateOfFirstUse), "days")
      : 0,
    maxDaysOfFreeUse: MAX_DAYS_OF_FREE_USE,
    isFreeUseFinished:
      (user?.dateOfFirstUse
        ? moment().diff(moment(user.dateOfFirstUse), "days") >=
          MAX_DAYS_OF_FREE_USE
        : false) || (user?.featuresUsedToday ?? 0) >= MAX_DAILY_FEATURES,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkPremium() {
      if (!user) {
        setFeatureUsage({
          featuresUsedToday: 0,
          maxDailyFeatures: MAX_DAILY_FEATURES,
          daysSinceFirstUse: 0,
          maxDaysOfFreeUse: MAX_DAYS_OF_FREE_USE,
          isFreeUseFinished: true,
        });
        setIsLoading(false);
        return;
      }

      try {
        setFeatureUsage({
          featuresUsedToday: user?.featuresUsedToday || 0,
          maxDailyFeatures: MAX_DAILY_FEATURES,
          daysSinceFirstUse: user?.dateOfFirstUse
            ? moment().diff(moment(user.dateOfFirstUse), "days")
            : 0,
          maxDaysOfFreeUse: MAX_DAYS_OF_FREE_USE,
          isFreeUseFinished:
            (user?.dateOfFirstUse
              ? moment().diff(moment(user.dateOfFirstUse), "days") >=
                MAX_DAYS_OF_FREE_USE
              : false) || (user?.featuresUsedToday ?? 0) >= MAX_DAILY_FEATURES,
        });
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking premium status:", error);
        setIsLoading(false);
      }
    }

    setIsLoading(true);
    checkPremium();
  }, [user]);

  return { featureUsage, isLoading };
}
