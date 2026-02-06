"use client";

import { useState, useEffect, useRef } from "react";
import ExamRegistration from "../../../_components/registration/ExamRegistration";
import CrossIcon from "@/app/_components/icons/CrossIcon";
import { MockRegistrationData } from "@/app/types/types";
import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";

interface SubjectSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  setData: (data: MockRegistrationData) => void;
  initialSelectedExams?: {
    examId: string;
    board: string | null;
    series: string | null;
    subject: string;
    subjectId: string;
  }[];
  isEditing?: boolean;
}

export default function SubjectSelectionModal({
  isOpen,
  onClose,
  setData,
  initialSelectedExams,
  isEditing,
}: SubjectSelectionModalProps) {
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [isUserWaitingList, setIsUserWaitingList] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number>(0);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const examRegistrationParentRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsUserRegistered(false);
      setIsUserWaitingList(false);
      setWaitlistPosition(0);
    }
  }, [isOpen]);

  // Close modal and fetch updated data when user successfully registers
  useEffect(() => {
    if (isUserRegistered) {
      const fetchRegistrationData = async () => {
        try {
          const response = await curriculumApiV2Client.get(`/mocks/register`);
          setData(response.data.data);
          onClose();
        } catch (error) {
          console.error("Error fetching registration data:", error);
        }
      };
      fetchRegistrationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserRegistered]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-10 rounded-full p-2 transition-colors hover:bg-gray-100"
          aria-label="Close"
        >
          <CrossIcon color="#000000" />
        </button>

        {/* Modal content */}
        <div ref={examRegistrationParentRef} className="px-8 py-12">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="font-rounded-bold mb-4 text-[36px] leading-[42px] tracking-[-0.02em] text-black">
              {isEditing ? "Edit your subjects" : "Choose your subjects"}
            </h2>
            <p className="text-base text-black/50">
              Choose your mock exam subjects, boards, and tiers to continue. You
              can edit this later.
            </p>
          </div>

          {/* ExamRegistration Component */}
          <ExamRegistration
            setIsUserRegistered={setIsUserRegistered}
            setIsUserWaitingList={setIsUserWaitingList}
            setWaitlistPosition={setWaitlistPosition}
            hasActiveSubscription={hasActiveSubscription}
            initialSelectedExams={initialSelectedExams}
            parentRef={examRegistrationParentRef}
            isEditing={isEditing}
          />
        </div>
      </div>
    </div>
  );
}
