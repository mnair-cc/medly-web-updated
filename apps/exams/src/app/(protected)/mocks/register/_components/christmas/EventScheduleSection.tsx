"use client";

export default function EventScheduleSection() {
  return (
    <div className="flex w-full shrink-0 flex-col items-center gap-[40px]">
      {/* Header */}
      <div className="flex w-full flex-col items-center gap-[16px] text-center">
        <p className="font-rounded-bold min-w-full text-[36px] leading-[54px] tracking-[-0.36px] text-neutral-950">
          Event Schedule
        </p>
        <p className="w-[397px] text-[15px] leading-[24px] text-[#4a5565]">
          All exams will be held online. You'll receive a reminder email 24
          hours before each scheduled mock.
        </p>
      </div>

      {/* October Section */}
      <div className="flex w-[480px] flex-col items-start gap-[24px]">
        <p className="font-rounded-bold w-full text-[20px] leading-[32px] text-neutral-950">
          October
        </p>
        <ScheduleItem
          day="28"
          dayOfWeek="Friday, 12:00 PM"
          title="Registration Opens"
        />
      </div>

      {/* Exam Days Section */}
      <div className="flex w-[480px] flex-col items-start gap-[16px]">
        <p className="font-rounded-bold h-[48px] w-full text-[20px] leading-[32px] text-neutral-950">
          27 Dec - 2 Jan
        </p>
        <ScheduleItem
          day="22"
          dayOfWeek="Monday, 12:00 PM"
          title="Biology"
        />
        <ScheduleItem
          day="23"
          dayOfWeek="Tuesday, 12:00 PM"
          title="English Language"
        />
        <ScheduleItem
          day="24"
          dayOfWeek="Wednesday, 12:00 PM"
          title="Physics"
        />
        <ScheduleItem
          day="27"
          dayOfWeek="Saturday, 12:00 PM"
          title="Chemistry"
        />
        <ScheduleItem
          day="28"
          dayOfWeek="Sunday, 12:00 PM"
          title="Mathematics"
        />
        <ScheduleItem
          day="29"
          dayOfWeek="Monday, 12:00 PM"
          title="English Literature"
        />
        <div className="flex h-[112px] w-full items-start gap-[40px] pb-0 pt-[24px] px-0">
          <div className="flex size-[48px] flex-col items-center justify-center gap-[10px] rounded-[999px] bg-[#f2f2f7]">
            <p className="font-rounded-black text-nowrap whitespace-pre text-center text-[20px] leading-[28px] text-black">
              30
            </p>
          </div>
          <div className="font-rounded-bold flex flex-col gap-[4px] text-nowrap whitespace-pre">
            <p className="text-center text-[12px] leading-[14px] text-black/60">
              Tuesday, 6:00 PM
            </p>
            <p className="text-[21px] leading-[31.5px] text-neutral-950">
              Results Day
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScheduleItemProps {
  day: string;
  dayOfWeek: string;
  title: string;
}

function ScheduleItem({ day, dayOfWeek, title }: ScheduleItemProps) {
  return (
    <div className="flex w-full items-start gap-[40px]">
      <div className="flex h-[64px] flex-col items-center gap-[4px]">
        <div className="flex size-[48px] flex-col items-center justify-center gap-[10px] rounded-[999px] bg-[#f2f2f7]">
          <p className="font-rounded-black text-nowrap whitespace-pre text-center text-[20px] leading-[28px] text-black">
            {day}
          </p>
        </div>
      </div>
      <div className="font-rounded-bold flex flex-col gap-[4px] text-nowrap whitespace-pre">
        <p className="text-center text-[12px] leading-[14px] text-black/60">
          {dayOfWeek}
        </p>
        <p className="text-[21px] leading-[31.5px] text-neutral-950">{title}</p>
      </div>
    </div>
  );
}
