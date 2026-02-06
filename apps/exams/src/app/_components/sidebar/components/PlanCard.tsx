import { usePlanDetails } from "@/app/_hooks/usePlanDetails";
import { PlanCode } from "@/app/types/types";
import moment from "moment";
import Link from "next/link";
import { ArrowRightIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import Spinner from "@/app/_components/Spinner";
import { useState } from "react";
import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import { useUser } from "@/app/_context/UserProvider";
import { toast } from "sonner";

const PlanCard = () => {
  const { planDetails, isLoading } = usePlanDetails();
  const { refetchUser } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const onSync = async () => {
    if (isSyncing) return;
    const now = Date.now();
    if (cooldownUntil && now < cooldownUntil) return;

    try {
      setIsSyncing(true);
      const res = await curriculumApiV2Client.post("/users/me/plan/sync");

      if (res.status === 204) {
        toast("No changes found", {
          description: "Your plan is already up to date.",
        });
      } else if (res.status >= 200 && res.status < 300) {
        toast.success("Plan synced", {
          description: "Your subscription details were refreshed.",
        });
      } else {
        toast.error("Sync failed", {
          description: "Please try again in a moment.",
        });
      }
    } catch {
      toast.error("Sync failed", {
        description: "Please try again in a moment.",
      });
    } finally {
      // Always refetch user to reflect potential updates
      await refetchUser();
      setIsSyncing(false);
      setCooldownUntil(Date.now() + 60_000); // 60s cooldown
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 border border-[#E6E6E6] rounded-2xl">
        <div className="flex justify-center items-center h-full p-6">
          <Spinner />
        </div>
      </div>
    );
  }

  const isClientCooldown = cooldownUntil ? Date.now() < cooldownUntil : false;
  const lastManual = planDetails?.lastManuallySyncedAt
    ? Date.parse(planDetails.lastManuallySyncedAt)
    : 0;
  const isServerCooldown = lastManual
    ? Date.now() - lastManual < 60_000
    : false;
  const isOnCooldown = isClientCooldown || isServerCooldown;

  const remainingMsClient = cooldownUntil
    ? Math.max(cooldownUntil - Date.now(), 0)
    : 0;
  const remainingMsServer = lastManual
    ? Math.max(60_000 - (Date.now() - lastManual), 0)
    : 0;
  const remainingMs = Math.max(remainingMsClient, remainingMsServer);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  const titleText = isOnCooldown
    ? `Sync available in ${remainingSeconds}s`
    : "Sync subscription";

  return (
    <div className="flex-1 border border-[#E6E6E6] rounded-2xl">
      <div className="p-6 flex flex-col h-full">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-medium text-gray-500">Your plan</h3>
          <div className="relative group">
            <button
              onClick={onSync}
              disabled={isSyncing || isOnCooldown}
              aria-label="Sync subscription"
              title={titleText}
              className={`inline-flex items-center gap-2 justify-center h-8 px-3 rounded-full border transition-colors ${
                isSyncing || isOnCooldown
                  ? "bg-gray-100 text-gray-400 border-gray-200"
                  : "bg-[#F5FAFF] text-blue-600 border-[#BFE7FF] hover:bg-[#EAF6FF]"
              }`}
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span className="text-xs font-medium">Sync</span>
            </button>
            {isOnCooldown && (
              <div className="absolute right-0 top-[110%] z-10 hidden w-max max-w-[14rem] group-hover:block">
                <div className="rounded-md bg-black px-3 py-2 text-xs text-white shadow-lg">
                  You can sync again in {remainingSeconds}s
                </div>
              </div>
            )}
          </div>
        </div>
        {planDetails && planDetails.isActive ? (
          <>
            <div className="text-[24px] font-heavy tracking-[-0.02em] mb-2">
              {planDetails.planCode === PlanCode.MONTHLY ||
              planDetails.status === "$rc_monthly"
                ? "Monthly"
                : planDetails.planCode === PlanCode.ANNUAL
                  ? "Yearly"
                  : planDetails.planCode === PlanCode.BLOCK
                    ? "2025 Exams"
                    : planDetails.planCode === PlanCode.BLOCK_ANNUAL
                      ? "2026 Exams"
                      : planDetails.planCode === PlanCode.BLOCK_ANNUAL_2027
                        ? "2027 Exams"
                        : "Unknown plan"}
            </div>
            <div className="text-[15px] leading-normal mb-4">
              {planDetails.willRenew ? (
                <>
                  Your next payment of £24.99 is on{" "}
                  {planDetails.endDate
                    ? moment(planDetails.endDate * 1000)
                        .subtract(1, "day")
                        .format("Do MMMM YYYY")
                    : "N/A"}
                </>
              ) : (
                <>
                  Active until{" "}
                  {planDetails.endDate
                    ? moment(planDetails.endDate * 1000)
                        .subtract(1, "day")
                        .format("Do MMMM YYYY")
                    : "N/A"}
                </>
              )}
            </div>
            <div className="mt-auto text-left">
              {planDetails.isSubscription &&
                (planDetails.paymentProvider === "stripe" ? (
                  <a
                    href="/api/user/stripe/portal"
                    className="text-blue-600 hover:underline inline-flex items-center gap-2"
                  >
                    Manage in Stripe <br />{" "}
                    <ArrowRightIcon className="w-4 h-4" />
                  </a>
                ) : (
                  <Link
                    href="https://apps.apple.com/account/subscriptions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-2"
                  >
                    Manage in the App Store{" "}
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-[24px] font-heavy tracking-[-0.02em] mb-2">
              No active plan
            </div>
            <div className="text-[15px] leading-normal mb-4">
              Get access to all our premium content and features.
            </div>
            <div className="mt-auto text-right">
              <Link
                href="/plan"
                className="text-blue-600 hover:underline inline-flex items-center gap-2"
              >
                Start a plan <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlanCard;
