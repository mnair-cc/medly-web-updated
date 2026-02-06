import { exams } from "@/app/(protected)/mocks/_utils/utils";

// Exam Timetable Component
const ExamTimetable = ({
  userSelections = {},
}: {
  userSelections?: Record<string, any>;
}) => {
  // Mock exam data
  const getMonthAbbr = (date: Date) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months[date.getMonth()];
  };

  // Filter exams based on user selections if provided
  const filteredExams =
    Object.keys(userSelections).length > 0
      ? exams.filter((exam) =>
          Object.keys(userSelections).includes(exam.id.toString())
        )
      : exams;

  return (
    <div className="md:w-1/2 mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-1 gap-2">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white rounded-xl overflow-hidden border border-[rgba(0,0,0,0.08)] shadow-[0_4px_8px_rgba(0,0,0,0.08),0_0_1px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.1),0_0_1px_rgba(0,0,0,0.15)] transition-shadow duration-300"
          >
            <div className="flex">
              <div className="w-24 h-24 bg-gradient-to-br from-[#4549F3] to-[#4549F3] text-white flex flex-col items-center justify-center">
                <span className="text-5xl font-rounded-bold">
                  {exam.date.getDate()}
                </span>
                <span className="text-base -mt-1">
                  {getMonthAbbr(exam.date)}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-center">
                <h3 className="text-base font-medium text-black">
                  GCSE {exam.subject}
                </h3>
                <p className="text-sm text-[rgba(0,0,0,0.5)]">
                  {userSelections[exam.id]
                    ? `${userSelections[exam.id].board}${
                        userSelections[exam.id].series
                          ? ` - ${userSelections[exam.id].series}`
                          : ""
                      }`
                    : exam.board}
                </p>
                {/* <p className="text-sm text-[rgba(0,0,0,0.7)] mt-2 line-clamp-2">{exam.description}</p> */}
              </div>
            </div>
          </div>
        ))}
        <div className="bg-white rounded-xl overflow-hidden border border-[rgba(0,0,0,0.08)] shadow-[0_4px_8px_rgba(0,0,0,0.08),0_0_1px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.1),0_0_1px_rgba(0,0,0,0.15)] transition-shadow duration-300">
          <div className="flex">
            <div className="w-24 h-24 bg-gradient-to-br from-[#FF9292] to-[#4549F3] text-white flex flex-col items-center justify-center">
              <span className="text-5xl font-rounded-bold">20</span>
              <span className="text-base -mt-1">Apr</span>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-center">
              <h3 className="text-base font-medium text-black">
                Medly Mocks Results Day
              </h3>
              <p className="text-sm text-[rgba(0,0,0,0.5)]">
                Predicted grades and exam report released
              </p>
              {/* <p className="text-sm text-[rgba(0,0,0,0.7)] mt-2 line-clamp-2">{exam.description}</p> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamTimetable;
