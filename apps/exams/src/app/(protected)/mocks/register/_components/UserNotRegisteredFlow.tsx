import RedesignedHeroSection from "./christmas/RedesignedHeroSection";
import HowItWorksRedesigned from "./christmas/HowItWorksRedesigned";
import FAQSectionRedesigned from "./christmas/FAQSectionRedesigned";

interface UserNotRegisteredFlowProps {
  onOpenModal: () => void;
  isRegistrationOpen: boolean;
}

const UserNotRegisteredFlow = ({
  onOpenModal,
  isRegistrationOpen,
}: UserNotRegisteredFlowProps) => {
  return (
    <>
      <div className="relative flex w-full flex-col items-start gap-[24px] overflow-x-hidden bg-white">
        {/* Hero Section */}
        <RedesignedHeroSection
          onClick={onOpenModal}
          isRegistrationOpen={isRegistrationOpen}
        />

        {/* Main Content */}
        <div className="relative w-full">
          <div className="flex w-full flex-col items-center">
            <div className="flex w-full flex-col items-center gap-[128px] px-[24px] py-[56px] sm:px-[48px] sm:py-[80px] lg:p-[112px]">
              <HowItWorksRedesigned onButtonClick={onOpenModal} />
              <FAQSectionRedesigned />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserNotRegisteredFlow;
