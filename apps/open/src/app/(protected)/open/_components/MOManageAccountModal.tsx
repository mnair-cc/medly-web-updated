"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@/app/_context/UserProvider";
import { useMOUserContext } from "@/app/(protected)/open/_context/MOUserProvider";
import { useSession } from "next-auth/react";
import Spinner from "@/app/_components/Spinner";
import PlanCard from "@/app/_components/sidebar/components/PlanCard";
import CrossInCircleIcon from "@/app/_components/icons/CrossInCircleIcon";

interface MOManageAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOManageAccountModal = ({
  isOpen,
  onClose,
}: MOManageAccountModalProps) => {
  const { user } = useUser();
  const { user: moUser, updateProfile } = useMOUserContext();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    userName: "",
    year: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    userName: "",
    year: "",
  });
  const [apiError, setApiError] = useState("");

  // Extract profile data from the OP user's data field
  const moUserData = moUser.data as {
    userName?: string;
    avatar?: string;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize edit data when user changes or editing starts
  useEffect(() => {
    if (user && isEditing) {
      setEditData({
        userName: moUserData.userName || user.userName || "",
        year: user.year || 0,
      });
    }
  }, [user, moUserData.userName, isEditing]);

  // Validation functions
  const validateUserName = (name: string): string => {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return "Name cannot be empty";
    }

    if (trimmedName.length < 2) {
      return "Name must be at least 2 characters long";
    }

    if (trimmedName.length > 50) {
      return "Name must be no more than 50 characters long";
    }

    const nameRegex = /^[a-zA-Z0-9\s\-_'.]+$/;
    if (!nameRegex.test(trimmedName)) {
      return "Name contains invalid characters. Only letters, numbers, spaces, hyphens, underscores, apostrophes, and periods are allowed";
    }

    return "";
  };

  const validateYear = (year: number): string => {
    const validYears = [9, 10, 11, 12, 13];
    if (!validYears.includes(year)) {
      return "Please select a valid year";
    }
    return "";
  };

  const validateForm = (): boolean => {
    const userNameError = validateUserName(editData.userName);
    const yearError = validateYear(editData.year);

    setValidationErrors({
      userName: userNameError,
      year: yearError,
    });

    return !userNameError && !yearError;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setValidationErrors({ userName: "", year: "" });
    setApiError("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValidationErrors({ userName: "", year: "" });
    setApiError("");
    setEditData({
      userName: moUserData.userName || user?.userName || "",
      year: user?.year || 0,
    });
  };

  const handleSave = async () => {
    if (!user) return;

    // Clear previous API errors
    setApiError("");

    // Check if there are actually changes to save
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Save userName to Open Platform user in Postgres
      const trimmedName = editData.userName.trim();
      if (trimmedName !== displayName) {
        await updateProfile({ userName: trimmedName });
      }

      setIsEditing(false);
      setValidationErrors({ userName: "", year: "" });
    } catch (error: unknown) {
      console.error("Failed to save user data:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save changes. Please try again.";
      setApiError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Real-time validation handlers
  const handleUserNameChange = (value: string) => {
    setEditData((prev) => ({ ...prev, userName: value }));

    if (validationErrors.userName) {
      setValidationErrors((prev) => ({ ...prev, userName: "" }));
    }

    if (apiError) {
      setApiError("");
    }
  };

  const handleYearChange = (value: number) => {
    setEditData((prev) => ({ ...prev, year: value }));

    if (validationErrors.year) {
      setValidationErrors((prev) => ({ ...prev, year: "" }));
    }

    if (apiError) {
      setApiError("");
    }
  };

  const yearOptions = [
    { value: 9, label: "Year 9" },
    { value: 10, label: "Year 10" },
    { value: 11, label: "Year 11" },
    { value: 12, label: "Year 12" },
    { value: 13, label: "Year 13" },
  ];

  // Check if values have actually changed
  const displayName = moUserData.userName || user?.userName || "";
  const hasChanges =
    user &&
    (editData.userName.trim() !== displayName || editData.year !== user.year);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-[0_0_32px_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
        >
          <CrossInCircleIcon />
        </button>

        {!user ? (
          <div className="w-full h-[300px] flex items-center justify-center p-6">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col w-full">
            <div className="flex flex-col pt-10 px-6 md:px-10 h-40 relative bg-[#F9F9FB] rounded-t-[16px]">
              <div className="absolute top-24 left-2 md:left-10 flex flex-row justify-between items-center text-[80px] px-4 rounded-full">
                {moUserData.avatar || "👤"}
              </div>
            </div>

            <div className="flex flex-col mt-14 px-4 md:px-10 mb-4">
              <h1 className="text-2xl md:text-3xl font-rounded-bold">
                Your Account
              </h1>
              <p className="leading-normal my-4">
                Manage your account settings and billing information.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row w-full justify-between gap-4 px-4 md:px-10 pb-10 max-w-[1000px]">
              <div className="flex-1 border border-[#E6E6E6] rounded-[16px]">
                <div className="p-6 relative">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-medium text-gray-500">
                      Your information
                    </h3>
                    {!isEditing ? (
                      <button
                        onClick={handleEdit}
                        className="px-3 py-1.5 rounded-full text-[13px] text-black bg-[#F2F2F7] hover:bg-[#F2F2F7]/80 font-rounded-semibold"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded-full text-[13px] text-black bg-[#F2F2F7] hover:bg-[#F2F2F7]/80 font-rounded-semibold disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={
                            isSaving || !editData.userName.trim() || !hasChanges
                          }
                          className="px-3 py-1.5 rounded-full text-[13px] text-white bg-[#05B0FF] hover:bg-[#05B0FF]/90 font-rounded-semibold disabled:opacity-50"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* API Error Message */}
                  {apiError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-2xl">
                      <p className="text-sm text-red-600 font-medium">
                        {apiError}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Name</span>
                      {isEditing ? (
                        <div className="flex flex-col">
                          <input
                            type="text"
                            value={editData.userName}
                            onChange={(e) =>
                              handleUserNameChange(e.target.value)
                            }
                            className={`mt-1 w-full py-3 px-4 border rounded-2xl bg-[#F9F9FB] focus:outline-[#05B0FF] font-medium ${
                              validationErrors.userName
                                ? "border-red-300 bg-red-50"
                                : "border-gray-300"
                            }`}
                            placeholder="Your name"
                          />
                          {validationErrors.userName && (
                            <span className="mt-2 text-sm text-red-600">
                              {validationErrors.userName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">{displayName}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Year</span>
                      {isEditing ? (
                        <div className="flex flex-col">
                          <select
                            value={editData.year}
                            onChange={(e) =>
                              handleYearChange(parseInt(e.target.value))
                            }
                            className={`mt-1 w-full py-3 px-4 border rounded-2xl bg-[#F9F9FB] focus:outline-[#05B0FF] font-medium ${
                              validationErrors.year
                                ? "border-red-300 bg-red-50"
                                : "border-gray-300"
                            }`}
                          >
                            {yearOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {validationErrors.year && (
                            <span className="mt-2 text-sm text-red-600">
                              {validationErrors.year}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">Year {user.year}</span>
                      )}
                    </div>
                    {session?.user?.email && (
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Email</span>
                        <span className="font-medium">
                          {session.user.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* <PlanCard /> */}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MOManageAccountModal;
