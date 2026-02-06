import { auth } from "@/auth";
import { userRepo } from "@/db/repositories";

export interface OpenProfile {
  userId: string;
  hasCompletedOpenOnboarding: boolean;
  userName?: string;
  avatar?: string;
}

/**
 * Open onboarding state lives in PostgreSQL (`open_platform_user` table).
 * Keep this helper Open-only to avoid coupling global user fetching to Open.
 */
export async function fetchOpenProfile(): Promise<OpenProfile | null> {
  const session = await auth();
  const authProviderId = session?.user?.id;
  if (!authProviderId) return null;

  const user = await userRepo.findByAuthProviderId(authProviderId);

  if (!user) {
    return {
      userId: authProviderId,
      hasCompletedOpenOnboarding: false,
    };
  }

  const data = user.data as {
    hasCompletedOpenOnboarding?: boolean;
    userName?: string;
    avatar?: string;
  };

  return {
    userId: authProviderId,
    hasCompletedOpenOnboarding: data.hasCompletedOpenOnboarding ?? false,
    userName: data.userName,
    avatar: data.avatar,
  };
}
