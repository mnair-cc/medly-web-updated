import HowMedlyMocksWork from "./HowMedlyMocksWork";
import BestOfLuck from "./BestOfLuck";
import ExamTimetable from "./ExamTimetable";
import Countdown from "./Countdown";
import Header from "./Header";
import FAQSection from "./FAQSection";
import { MockRegistrationData } from "@/app/types/types";

const RegistrationClosedFlow = ({
  setData,
}: {
  setData: (data: MockRegistrationData) => void;
}) => {
  return (
    <>
      <Header isRegistrationOpen={false} setData={setData} />
      <Countdown countDownTo="registration_opens" type="light" size="large" />
      <ExamTimetable />
      <HowMedlyMocksWork />
      <FAQSection />
      <BestOfLuck />
    </>
  );
};

export default RegistrationClosedFlow;
