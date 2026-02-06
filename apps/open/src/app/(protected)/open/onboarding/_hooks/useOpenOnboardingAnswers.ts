import { useState } from "react";
import {
  OpenOnboardingData,
  ModuleOnboardingData,
  MODULE_COLORS,
} from "../_types/types";
import type { University } from "../_types/universityApi";
import { toast } from "sonner";
import { identifyUser } from "@/app/_lib/posthog/analytics";
import { useSession } from "next-auth/react";

export const useOpenOnboardingAnswers = () => {
  const { data: session } = useSession();
  const [onboardingData, setOnboardingData] = useState<OpenOnboardingData>({
    avatar: "🦊",
    userName: "",
    focusArea: "",
    university: "",
    universityId: null,
    universityLogo: null,
    flowType: "lecture",
  });

  const [moduleData, setModuleData] = useState<ModuleOnboardingData>({
    moduleName: "",
    moduleColor: MODULE_COLORS[4].hex, // Default to blue
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleAnswerChange = (fieldName: string, value: string) => {
    setOnboardingData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleUniversitySelect = (name: string, university?: University) => {
    setOnboardingData((prev) => ({
      ...prev,
      university: name,
      universityId: university?.id ?? null,
      universityLogo: university?.logo_link ?? null,
    }));
  };

  const handleModuleDataChange = (
    fieldName: keyof ModuleOnboardingData,
    value: string
  ) => {
    setModuleData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // Create collection with name, color, and flowType
  const createCollection = async (): Promise<string | null> => {
    if (!moduleData.moduleName?.trim()) {
      toast.error("Please enter a module name");
      return null;
    }

    try {
      const response = await fetch("/api/open/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: moduleData.moduleName.trim(),
          primaryColor: moduleData.moduleColor,
          initialFlowType: onboardingData.flowType,
        }),
      });

      const data = await response.json();

      if (data.success && data.id) {
        return data.id;
      } else {
        toast.error(data.error || "Failed to create module");
        return null;
      }
    } catch (error) {
      console.error("Error creating collection:", error);
      toast.error("Failed to create module. Please try again.");
      return null;
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // 1. Save profile
      const profileResponse = await fetch("/api/open/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: onboardingData.userName,
          avatar: onboardingData.avatar,
          focusArea: onboardingData.focusArea,
          university: onboardingData.university,
          universityId: onboardingData.universityId,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to save profile");
      }

      // 2. Update PostHog user properties
      if (session?.user?.id) {
        await identifyUser(session.user.id, {
          focusArea: onboardingData.focusArea || "",
          university: onboardingData.university || "",
          universityId: onboardingData.universityId || null,
          has_completed_open_onboarding: true,
        });
      }

      return true;
    } catch (error) {
      console.error("Error saving onboarding:", error);
      toast.error("Failed to save your details. Please try again.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    onboardingData,
    moduleData,
    isLoading,
    handleAnswerChange,
    handleUniversitySelect,
    handleModuleDataChange,
    handleSubmit,
  };
};
