import SidebarLayoutClient from "@/app/_components/sidebar/SidebarLayoutClient";
import { fetchUserSubjects } from "@/app/_components/sidebar/_lib/fetchUserSubjects";
import { fetchMocksData } from "@/app/_components/sidebar/_lib/fetchMocksData";
import { getMedlyMondaysFeatureAsync } from "@/app/_lib/medlyMondays/utils";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user data server-side
  const [userSubjects, mocksData, medlyMondaysFeature] = await Promise.all([
    fetchUserSubjects(),
    fetchMocksData(),
    getMedlyMondaysFeatureAsync(),
  ]);

  return (
    <SidebarLayoutClient
      initialUserSubjects={userSubjects}
      initialMocksData={mocksData}
      initialMedlyMondaysFeature={medlyMondaysFeature}
    >
      {children}
    </SidebarLayoutClient>
  );
}
