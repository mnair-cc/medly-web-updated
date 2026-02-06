import { MockRegistrationData } from "@/app/types/types";
import RegisteredHeroSection from "./RegisteredHeroSection";
import ExamEntryCard from "../../_components/registration/ExamEntryCard";
import HowItWorksRedesigned from "./christmas/HowItWorksRedesigned";
import EventScheduleSection from "./christmas/EventScheduleSection";
import FAQSectionRedesigned from "./christmas/FAQSectionRedesigned";
import BestOfLuckRedesigned from "./christmas/BestOfLuckRedesigned";

const UserRegisteredFlow = ({
  data,
  onEdit,
  hasActivePlan,
}: {
  data: MockRegistrationData;
  onEdit: () => void;
  hasActivePlan: boolean;
}) => {
  // isUserWaitingList, waitingListPosition, and setIsUserWaitingList are now derived/managed within ExamEntryCard or its parent
  const isUserOnWaitlist =
    (data.referrals?.length || 0) < 3 &&
    (data.waitListPosition || 0) > 0 &&
    !hasActivePlan;

  return (
    <>
      <div className="relative flex w-full flex-col items-start gap-[24px] overflow-x-hidden bg-white">
        {/* Hero Section */}
        <RegisteredHeroSection
          isUserOnWaitlist={isUserOnWaitlist}
          data={data}
        />

        {/* Exam Entry Card (Ticket) */}
        <div className="relative z-10 mt-[-280px] flex w-full justify-center pb-[80px]">
          <ExamEntryCard data={data} hasActivePlan={hasActivePlan} />
          <button
            onClick={onEdit}
            className="absolute bottom-0 mb-4 text-black/40 hover:text-black/60 font-medium px-4 py-2 rounded-full"
          >
            Edit Subjects
          </button>
        </div>

        {/* Main Content */}
        <div className="relative w-full">
          <div className="flex w-full flex-col items-center">
            <div className="flex w-full flex-col items-center gap-[128px] px-[24px] py-[56px] sm:px-[48px] sm:py-[80px] lg:p-[112px]">
              <HowItWorksRedesigned
                onButtonClick={onEdit}
                isRegistered={data?.isRegistered}
              />
              <FAQSectionRedesigned />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserRegisteredFlow;
