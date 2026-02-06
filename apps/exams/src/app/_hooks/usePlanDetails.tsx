import { useMemo } from "react";
import { PlanDetails } from "../types/types";
import { useUser } from "../_context/UserProvider";

export function usePlanDetails() {
  const { user, loading, error } = useUser();

  const planDetails = useMemo(() => {
    const subscription = user?.subscription;

    if (!subscription) {
      return undefined;
    }

    // Plan is active if it's not expired and has one of the valid statuses
    const validStatuses = [
      "active",
      "monthly",
      "block",
      "blockAnnual",
      "blockAnnual2027",
      "complete",
      "$rc_monthly",
    ];
    const isNotExpired =
      !subscription.end || subscription.end * 1000 > Date.now();
    const isActive =
      isNotExpired && validStatuses.includes(subscription.status);

    return {
      isActive,
      endDate: subscription.end,
      willRenew: subscription.willRenew,
      isSubscription: subscription.isSubscription,
      planCode: subscription.planCode,
      paymentProvider: subscription.paymentProvider,
      status: subscription.status,
      lastManuallySyncedAt: subscription.lastManuallySyncedAt,
    } as PlanDetails;
  }, [user]);

  return { planDetails, isLoading: loading, error: error || null };
}
