import MOChatLayoutClient from "@/app/(protected)/open/_components/chat/MOChatLayoutClient";
import MobileBlocker from "@/app/(protected)/open/_components/MobileBlocker";
import MOSidebarLayoutClient from "@/app/(protected)/open/_components/sidebar/MOSidebarLayoutClient";
import { AITaskProvider } from "@/app/(protected)/open/_context/AITaskProvider";
import { fetchInitialThreads } from "@/app/(protected)/open/_lib/fetchInitialThreads";
import { fetchOpenProfile } from "@/app/(protected)/open/_lib/fetchOpenProfile";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OpenMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await fetchOpenProfile();

  // Defensive: middleware should already require auth, but keep this safe.
  if (!profile) {
    redirect("/auth/login");
  }

  if (!profile.hasCompletedOpenOnboarding) {
    redirect("/open/onboarding");
  }

  const initialThreadIdsByCollection = await fetchInitialThreads(
    profile.userId,
  );

  return (
    <>
      <MOSidebarLayoutClient>
        <AITaskProvider>
          <MOChatLayoutClient
            initialThreadIdsByCollection={initialThreadIdsByCollection}
          >
            {children}
          </MOChatLayoutClient>
        </AITaskProvider>
      </MOSidebarLayoutClient>
      {/* <MobileBlocker /> */}
    </>
  );
}
