import { getCachedUser } from "@/app/_lib/server/getCachedUser";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserProvider } from "../_context/UserProvider";
import { UserFetchError } from "./_components/UserFetchError";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  // User fetch failed - this shouldn't happen for authenticated users
  // (auth flow creates user via POST /api/v2/users). Likely a temporary API error.
  // Show error inline so user can refresh to retry (instead of redirecting).
  if (!user) {
    return <UserFetchError />;
  }

  // Redirect to onboarding if not completed (except when already on onboarding)
  // Skip for /open routes - they have their own onboarding flow at /open/onboarding
  if (
    !user.hasCompletedOnboarding &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/open")
  ) {
    redirect("/onboarding");
  }

  return <UserProvider initialUser={user}>{children}</UserProvider>;
}
