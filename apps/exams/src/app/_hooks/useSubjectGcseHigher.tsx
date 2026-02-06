import { useUserSubjects } from "./useUserSubjects";
import { getDefaultedGcseHigher } from "../_lib/utils/utils";

/**
 * Hook to get the gcseHigher value for a specific subject
 * @param subjectLegacyId - The legacy ID of the subject
 * @returns The gcseHigher value (boolean | undefined)
 */
export const useSubjectGcseHigher = (
  subjectLegacyId: string
): boolean | undefined => {
  const { data: userSubjects } = useUserSubjects();

  if (!subjectLegacyId || !userSubjects) {
    return undefined;
  }

  const userSubject = userSubjects.find(
    (subject) => subject.legacyId === subjectLegacyId
  );

  // Get the stored gcseHigher value and apply defaults if needed
  return getDefaultedGcseHigher(subjectLegacyId, userSubject?.gcseHigher);
};
