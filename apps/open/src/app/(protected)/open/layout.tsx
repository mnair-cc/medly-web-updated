import { auth } from "@/auth";
import { userRepo } from "@/db/repositories";
import { redirect } from "next/navigation";
import { MOUserProvider } from "./_context/MOUserProvider";

export default async function OpenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const authProviderId = session?.user?.id;

  if (!authProviderId) {
    redirect("/auth/login");
  }

  const user = await userRepo.getOrCreateUser(authProviderId);

  return <MOUserProvider user={user}>{children}</MOUserProvider>;
}
