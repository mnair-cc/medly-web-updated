import MocksScheduleCards from "../../_components/registration/MocksScheduleCards";

// Exam Timetable Component
const ExamTimetable = () => {

  return (
    <div className="w-full py-0 flex flex-col items-center gap-2">
      <div className="mt-4 w-full flex flex-col items-center gap-6">
        <div className="md:w-1/2 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-2">
            <MocksScheduleCards />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center mt-5">
        <div className="text-[12px] text-center w-1/2 text-gray-500">
          The Medly Christmas Mock is provided for practice purposes only and
          does not predict or guarantee your performance on official exams. By
          taking our mock test, you acknowledge that results may vary from
          actual GCSE or A-level outcomes.
        </div>
      </div>
    </div>
  );
};

export default ExamTimetable;
