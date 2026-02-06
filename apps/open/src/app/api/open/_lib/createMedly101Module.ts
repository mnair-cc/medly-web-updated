/**
 * Creates the "Your First Module" starter module for new users who complete onboarding.
 * The module contains a single document based on the user's selected focus area.
 */

import { collectionRepo, documentRepo } from "@/db/repositories";
import type { CollectionData, DocumentData } from "@/db/repositories/types";

type FocusArea =
  | "stay_organised"
  | "keep_up_lectures"
  | "help_assignments"
  | "prepare_exams";

const FOCUS_AREA_DOCUMENTS: Record<FocusArea, { name: string; url: string }> = {
  stay_organised: {
    name: "Get Organized",
    url: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/Medly%20Open%20Sandbox%2FUser%20intent%20docs%20pdfs%2FGet%20Organized.pdf?alt=media&token=d0c9028f-2181-4cb2-82d9-8a87fc638857",
  },
  keep_up_lectures: {
    name: "Lectures on Medly",
    url: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/Medly%20Open%20Sandbox%2FUser%20intent%20docs%20pdfs%2FLectures%20with%20summary.pdf?alt=media&token=f63f07bc-67ff-4f4b-a5ec-1aabb90348f4",
  },
  help_assignments: {
    name: "Assignments on Medly",
    url: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/Medly%20Open%20Sandbox%2FUser%20intent%20docs%20pdfs%2FAssignments.pdf?alt=media&token=081ee301-3848-4ec8-8bec-fee1dd874492",
  },
  prepare_exams: {
    name: "Exams on Medly",
    url: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/Medly%20Open%20Sandbox%2FUser%20intent%20docs%20pdfs%2FExams.pdf?alt=media&token=c0098c2b-a099-4a1f-8dc7-57f85d90f289",
  },
};

const DEFAULT_FOCUS_AREA: FocusArea = "stay_organised";

function isValidFocusArea(value: string | undefined): value is FocusArea {
  return (
    value !== undefined &&
    ["stay_organised", "keep_up_lectures", "help_assignments", "prepare_exams"].includes(value)
  );
}

/**
 * Creates the starter module with a single document based on the user's focus area.
 * @param authProviderId - The user's auth provider ID (Firebase UID)
 * @param focusArea - The user's selected focus area from onboarding
 * @returns The created collection ID
 */
export async function createMedly101Module(
  authProviderId: string,
  focusArea?: string
): Promise<string> {
  const collectionData: CollectionData = {
    name: "Your First Module",
    position: 0,
    primaryColor: "#9B59B6",
    icon: undefined,
  };
  const collection = await collectionRepo.create(authProviderId, collectionData);

  const validFocusArea = isValidFocusArea(focusArea) ? focusArea : DEFAULT_FOCUS_AREA;
  const documentConfig = FOCUS_AREA_DOCUMENTS[validFocusArea];

  const docData: DocumentData = {
    name: documentConfig.name,
    position: 0,
    type: "document",
    label: "slides",
    storageUrl: documentConfig.url,
  };
  await documentRepo.create(authProviderId, collection.id, docData);

  return collection.id;
}
