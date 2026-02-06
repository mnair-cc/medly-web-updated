import { SessionType } from "@/app/(protected)/sessions/types";
import { lessonIdToSubjectId } from "@/app/_lib/utils/utils";
import SessionStructure from "@/app/(protected)/sessions/components/SessionStructure";
import { fetchSessionData } from "./data/orchestrator";
import SessionMessageShell from "@/app/(protected)/sessions/components/SessionMessageShell";
import { cookies } from "next/headers";
import { calculateInitialPageIndex } from "@/app/(protected)/sessions/utils/lessonNavigation";
import { lessonSlug } from "@/app/(protected)/sessions/utils/lessonSlug";
import {
  LLQ_COOKIE_NAME,
  findIndexInLlq,
} from "@/app/(protected)/sessions/utils/llq";
import { isForbiddenError } from "@/app/(protected)/sessions/utils/errors";
import { redirect } from "next/navigation";

const PracticeNewPage = async ({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) => {
  const { lessonId } = await params;
  const subjectId = lessonIdToSubjectId(lessonId);

  try {
    const sessionData = await fetchSessionData(lessonId);

    // Compute initial page index from compact LRU cookie; fallback to legacy cookie
    const cookieStore = await cookies();
    const llqRaw = cookieStore.get(LLQ_COOKIE_NAME)?.value;
    const slug = lessonSlug(lessonId);
    const llqIndex = findIndexInLlq(llqRaw, slug);
    const legacyKey = `lastLessonQuestion_${lessonId}`;
    const legacyRaw = cookieStore.get(legacyKey)?.value;
    const legacyIndex = legacyRaw !== undefined ? Number(legacyRaw) : null;
    const lastIndex = llqIndex ?? legacyIndex;
    const initialPageIndex = calculateInitialPageIndex(
      sessionData.pages,
      Number.isFinite(lastIndex) ? (lastIndex as number) : null
    );

    return (
      <div className="flex flex-col flex-1 overflow-hidden w-full h-full">
        <SessionStructure
          returnUrl="/"
          subjectId={subjectId}
          lessonId={lessonId}
          sessionType={SessionType.LessonSession}
          initialSessionData={sessionData}
          initialPageIndex={initialPageIndex}
        />
      </div>
    );
  } catch (error) {
    if (isForbiddenError(error)) {
      redirect("/forbidden-redirect");
    }
    return (
      <SessionMessageShell
        sessionType={SessionType.LessonSession}
        lessonId={lessonId}
        sessionTitle={"Practice"}
      />
    );
  }
};

export default PracticeNewPage;
