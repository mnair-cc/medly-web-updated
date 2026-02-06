import { auth } from "@/auth";
import { getOrCreateUser, userRepo, collectionRepo } from "@/db/repositories";
import type { UserData } from "@/db/repositories/types";
import { NextRequest, NextResponse } from "next/server";
import { createMedly101Module } from "../_lib/createMedly101Module";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await userRepo.getProfile(session.user.id);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching open profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Get or create user first
    const user = await getOrCreateUser(session.user.id);
    const userData = user.data as UserData;

    // Check if this is a new onboarding completion (user hasn't completed before)
    const isFirstOnboardingCompletion = !userData.hasCompletedOpenOnboarding;

    // Update profile with all provided fields
    await userRepo.updateProfile(user.id, {
      userName: body.userName,
      avatar: body.avatar,
      focusArea: body.focusArea,
      university: body.university,
      hasCompletedOpenOnboarding: true,
    });

    // If this is the first time completing onboarding and user has no modules,
    // create the Medly 101 starter module
    if (isFirstOnboardingCompletion) {
      const existingCollections = await collectionRepo.findAll(session.user.id);
      if (existingCollections.length === 0) {
        try {
          const collectionId = await createMedly101Module(session.user.id, body.focusArea);
          // Store the collection ID in tutorialWalkthrough state
          const existingTutorialState = userData.tutorialWalkthrough;
          await userRepo.updateProfile(user.id, {
            tutorialWalkthrough: {
              currentStep: existingTutorialState?.currentStep ?? null,
              startedAt: existingTutorialState?.startedAt ?? null,
              completedAt: existingTutorialState?.completedAt ?? null,
              skippedAt: existingTutorialState?.skippedAt ?? null,
              gettingStartedCollectionId: collectionId,
              checklistProgress: existingTutorialState?.checklistProgress,
              checklistCompletedAt: existingTutorialState?.checklistCompletedAt,
              checklistDismissedAt: existingTutorialState?.checklistDismissedAt,
              welcomeSeenAt: existingTutorialState?.welcomeSeenAt,
            },
          });
        } catch (error) {
          // Log but don't fail the onboarding if module creation fails
          console.error("[Profile API] Error creating Medly 101 module:", error);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating open profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
