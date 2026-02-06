import Link from "next/link";
import GoldBadgeIcon from "@/app/_components/icons/GoldBadgeIcon";

function LessonCompleteModal({ legacyId }: { legacyId: string }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex p-4 w-full items-center justify-center">
      <div className="rounded-2xl p-4 text-black flex bg-white border border-[#E5E5E5] pointer-events-auto">
        <div className="w-8/12 flex flex-row items-center">
          <GoldBadgeIcon />

          <div className="flex flex-col ml-4 text-sm">
            <div className="font-bold">Well done!</div>
            <div>You&apos;ve completed this lesson.</div>
          </div>
        </div>

        <div className="flex w-6/12 justify-end text-sm">
          <Link
            href={`/lessons/${legacyId}/practice`}
            className="p-2 px-6 rounded-md text-white flex flex-row items-center bg-[#0B84FF] hover:bg-[#0B84FF]/90 transition-colors"
          >
            Go to practice
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LessonCompleteModal;
