import { redirect } from "next/navigation";
import { getCachedUser } from "@/app/_lib/server/getCachedUser";
import OnboardingPageClient from "./OnboardingPageClient";

export default async function OnboardingPage() {
  const user = await getCachedUser();

  // If user has already completed onboarding, redirect to home
  if (user?.hasCompletedOnboarding) {
    redirect("/");
  }

  return <OnboardingPageClient />;
}
