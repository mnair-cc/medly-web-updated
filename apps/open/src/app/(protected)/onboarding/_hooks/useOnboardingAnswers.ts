import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OnboardingData, OnboardingSubject } from "../types";
import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import { useUpdateSubjects } from "@/app/_hooks/useUpdateSubjects";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { identifyUser } from "@/app/_lib/posthog/analytics";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { useAllSubjects } from "@/app/_hooks/useAllSubjects";
import { queryKeys } from "@/app/_lib/query-keys";

export const useOnboardingAnswers = () => {
  const { track } = useTracking();
  const queryClient = useQueryClient();
  const { data: courses } = useAllSubjects();
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    avatar: "",
    userName: "",
    year: null as unknown as number,
    focusArea: "",
    source: "",
    parentEmail: "",
    parentEmailMarketingOptOut: false,
    selectedSubjects: [],
    hasCompletedOnboarding: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { updateSubjects } = useUpdateSubjects();
  const { data: session } = useSession();

  const handleAnswerChange = (
    questionFieldName: keyof OnboardingData,
    value: OnboardingData[keyof OnboardingData] | OnboardingSubject
  ) => {
    setOnboardingData((prev) => {
      if (questionFieldName === "selectedSubjects") {
        const subjectValue = value as OnboardingSubject;
        const currentSubjects = prev.selectedSubjects || [];

        // Check if subject is already selected by legacyId
        const isAlreadySelected = currentSubjects.some(
          (subject) => subject.legacyId === subjectValue.legacyId
        );

        const newSelectedSubjects = isAlreadySelected
          ? currentSubjects.filter(
              (subject) => subject.legacyId !== subjectValue.legacyId
            ) // Remove if already selected
          : [...currentSubjects, subjectValue]; // Add if not selected

        return {
          ...prev,
          selectedSubjects: newSelectedSubjects,
        };
      }

      // Handle other fields normally
      return {
        ...prev,
        [questionFieldName]: value,
      };
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Adding a 1-second pause before throwing the test error
      if (onboardingData) {
        await curriculumApiV2Client.put("/users/me", {
          avatar: onboardingData.avatar,
          userName: onboardingData.userName,
          year: Number(onboardingData.year),
          focusArea: onboardingData.focusArea,
          source: onboardingData.source,
          parentEmail: onboardingData.parentEmail,
          parentEmailMarketingOptOut: onboardingData.parentEmailMarketingOptOut,
          hasCompletedOnboarding: true,
        });

        // Handle multiple subjects from selectedSubjects array
        const subjectsToAdd = [];

        if (
          onboardingData.selectedSubjects &&
          onboardingData.selectedSubjects.length > 0
        ) {
          // Create subjects from selectedSubjects array (now containing rich data)
          for (const onboardingSubject of onboardingData.selectedSubjects) {
            // Find the subject details from courses data to get the ID
            let subjectId = 0;

            if (courses) {
              for (const course of courses) {
                for (const examBoard of course.examBoards) {
                  for (const subject of examBoard.subjects) {
                    if (subject.legacyId === onboardingSubject.legacyId) {
                      subjectId = subject.id;
                      break;
                    }
                  }
                  if (subjectId) break;
                }
                if (subjectId) break;
              }
            }

            subjectsToAdd.push({
              id: subjectId,
              legacyId: onboardingSubject.legacyId,
              title: onboardingSubject.title,
              examBoard: onboardingSubject.examBoard,
              currentGrade: "", // Default grade
              targetGrade: "", // Default grade
              gcseHigher: onboardingSubject.gcseHigher,
            });
          }
        }

        if (subjectsToAdd.length > 0) {
          await updateSubjects(subjectsToAdd);
        }

        // Invalidate user and subjects cache after onboarding
        queryClient.invalidateQueries({ queryKey: queryKeys.user });
        queryClient.invalidateQueries({ queryKey: queryKeys.userSubjects });

        if (session?.user?.id) {
          await identifyUser(session.user.id, {
            // Basic user info
            userName: onboardingData.userName,
            avatar: onboardingData.avatar,
            year: Number(onboardingData.year) || 0,

            // User preferences and characteristics
            focusArea: onboardingData.focusArea || "",
            source: onboardingData.source || "",

            // Parent/guardian info (privacy-safe)
            hasParentEmail: !!onboardingData.parentEmail,
            parentEmailMarketingOptOut:
              onboardingData.parentEmailMarketingOptOut,

            // Subject selection info
            selectedSubjectsCount: onboardingData.selectedSubjects.length,
            selectedSubjectNames: onboardingData.selectedSubjects.map(
              (s) => s.title
            ),
            selectedCourses: [
              ...new Set(onboardingData.selectedSubjects.map((s) => s.course)),
            ],
            selectedExamBoards: [
              ...new Set(
                onboardingData.selectedSubjects.map((s) => s.examBoard)
              ),
            ],
            primaryCourse: (() => {
              if (
                !onboardingData.selectedSubjects ||
                onboardingData.selectedSubjects.length === 0
              )
                return "";

              const courseCounts = onboardingData.selectedSubjects.reduce(
                (acc, subject) => {
                  acc[subject.course] = (acc[subject.course] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              );

              const courseKeys = Object.keys(courseCounts);
              if (courseKeys.length === 0) return "";

              return courseKeys.reduce((a, b) =>
                courseCounts[a] > courseCounts[b] ? a : b
              );
            })(),

            // Onboarding completion status
            has_completed_onboarding: true,
          });
          track("completed_onboarding", {
            // Basic user info
            userName: onboardingData.userName,
            avatar: onboardingData.avatar,
            year: Number(onboardingData.year) || 0,

            // User preferences and source
            focusArea: onboardingData.focusArea || "",
            source: onboardingData.source || "",

            // Parent/guardian info (privacy-safe)
            hasParentEmail: !!onboardingData.parentEmail,
            parentEmailMarketingOptOut:
              onboardingData.parentEmailMarketingOptOut,

            // Subject selection summary
            selectedSubjectsCount: onboardingData.selectedSubjects.length,
            selectedSubjectNames: onboardingData.selectedSubjects.map(
              (s) => s.title
            ),
            selectedCourses: [
              ...new Set(onboardingData.selectedSubjects.map((s) => s.course)),
            ],
            selectedExamBoards: [
              ...new Set(
                onboardingData.selectedSubjects.map((s) => s.examBoard)
              ),
            ],

            // Full subject details for analysis
            selectedSubjects: onboardingData.selectedSubjects,
          });
        }
        return true;
      }
    } catch (error) {
      console.error("Error saving user details:", error);
      toast.error("Failed to save your details. Please try again.");
      // Re-throw the error so the caller knows it failed
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    onboardingData,
    isLoading,
    handleAnswerChange,
    handleSubmit,
  };
};
