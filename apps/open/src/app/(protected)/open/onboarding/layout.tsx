import { fetchOpenProfile } from "@/app/(protected)/open/_lib/fetchOpenProfile";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OpenOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await fetchOpenProfile();

  if (!profile) {
    redirect("/auth/login");
  }
  // If onboarding is already complete, keep users out of the onboarding flow.
  if (profile?.hasCompletedOpenOnboarding) {
    redirect("/open");
  }

  return children;
}
