"use client";

import { useState, useEffect } from "react";
import { MockRegistrationData } from "@/app/types/types";
import { useMockDates } from "../../_hooks/useMockDates";
import SubjectSelectionModal from "./christmas/SubjectSelectionModal";
import UserRegisteredFlow from "./UserRegisteredFlow";
import UserNotRegisteredFlow from "./UserNotRegisteredFlow";
import { useHasActivePlan } from "@/app/_context/PlanProvider";

interface MocksRegistrationClientProps {
  initialData: MockRegistrationData | null;
  isRegistrationOpen: boolean;
}

function MocksRegistrationClient({
  initialData,
  isRegistrationOpen: initialIsRegistrationOpen,
}: MocksRegistrationClientProps) {
  const [data, setData] = useState<MockRegistrationData | null>(initialData);
  const { isRegistrationOpen: hookIsRegistrationOpen } = useMockDates();
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(
    initialIsRegistrationOpen
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { hasActivePlan } = useHasActivePlan();

  // Sync registration state with hook (handles date overrides)
  useEffect(() => {
    setIsRegistrationOpen(hookIsRegistrationOpen);
  }, [hookIsRegistrationOpen]);

  const handleOpenModal = () => {
    if (isRegistrationOpen) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDataUpdate = (newData: MockRegistrationData) => {
    setData(newData);
  };

  return (
    <>
      {data?.isRegistered && isRegistrationOpen ? (
        <UserRegisteredFlow
          data={data}
          onEdit={handleOpenModal}
          hasActivePlan={hasActivePlan}
        />
      ) : (
        <UserNotRegisteredFlow
          onOpenModal={handleOpenModal}
          isRegistrationOpen={isRegistrationOpen}
        />
      )}

      {/* Subject Selection Modal */}
      <SubjectSelectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        setData={handleDataUpdate}
        initialSelectedExams={data?.selectedExams}
        isEditing={data?.isRegistered}
      />
    </>
  );
}

export default MocksRegistrationClient;
