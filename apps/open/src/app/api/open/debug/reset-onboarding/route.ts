/**
 * TEMPORARY DEBUG ENDPOINT - Delete after testing
 * Resets onboarding by deleting the current user (cascades to collections/documents)
 */

import { auth } from "@/auth";
import { db, openPlatformUser } from "@/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select()
    .from(openPlatformUser)
    .where(eq(openPlatformUser.authProviderId, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ message: "No user found - already reset" });
  }

  await db.delete(openPlatformUser).where(eq(openPlatformUser.id, user.id));

  return NextResponse.json({ message: "User deleted. Refresh to restart onboarding." });
}
