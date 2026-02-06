import SidebarLayoutClient from "@/app/_components/sidebar/SidebarLayoutClient";
import { fetchUserSubjects } from "@/app/_components/sidebar/_lib/fetchUserSubjects";
import { fetchMocksData } from "@/app/_components/sidebar/_lib/fetchMocksData";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user data server-side
  const [userSubjects, mocksData] = await Promise.all([
    fetchUserSubjects(),
    fetchMocksData(),
  ]);

  return (
    <SidebarLayoutClient
      initialUserSubjects={userSubjects}
      initialMocksData={mocksData}
    >
      {children}
    </SidebarLayoutClient>
  );
}
