import UserNotRegisteredFlow from "./UserNotRegisteredFlow";
import UserRegisteredFlow from "./UserRegisteredFlow";
import { MockRegistrationData } from "@/app/types/types";
import { useState } from "react";
import { useHasActivePlan } from "@/app/_context/PlanProvider";

const RegistrationOpenFlow = ({
  data,
  setData,
}: {
  data: MockRegistrationData | null;
  setData: (data: MockRegistrationData | null) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { hasActivePlan } = useHasActivePlan();

  if (data && data.isRegistered && !isEditing) {
    return <UserRegisteredFlow data={data} onEdit={() => setIsEditing(true)} hasActivePlan={hasActivePlan} />;
  } else {
    return (
      <UserNotRegisteredFlow
        setData={(d) => {
          setData(d);
          setIsEditing(false);
        }}
        initialSelectedExams={data?.selectedExams}
        isEditing={isEditing}
      />
    );
  }
};

export default RegistrationOpenFlow;
