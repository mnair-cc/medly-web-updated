import { redirect } from "next/navigation";
import { getCachedUser } from "@/app/_lib/server/getCachedUser";
import { isActivePlan } from "@/app/_lib/utils/planUtils";
import PlanPageClient from "./PlanPageClient";

export default async function PlanPage() {
  const user = await getCachedUser();

  // If user already has an active plan, redirect to home
  if (isActivePlan(user?.subscription)) {
    redirect("/");
  }

  return <PlanPageClient />;
}
