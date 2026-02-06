import { useExams } from "@/app/_hooks/useExams";
import { Exam, Paper } from "@/app/types/types";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import PapersList, { PapersListExam } from "./PapersList";
import Spinner from "../../Spinner";
import axios from "axios";
import { useTracking } from "@/app/_lib/posthog/useTracking";

interface SidebarPracticePapersLayoutProps {
  subjectId?: string;
  searchQuery?: string;
}

function SidebarPracticePapersLayout({
  subjectId,
  searchQuery = "",
}: SidebarPracticePapersLayoutProps) {
  const { track } = useTracking();

  const {
    data: exams,
    isLoading: isLoadingExams,
    error: examsError,
  } = useExams(subjectId || "");

  const {
    hasActivePlan,
    isLoading: planDetailsLoading,
    error: planDetailsError,
  } = useHasActivePlan();

  const isLoading = isLoadingExams || planDetailsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Spinner size="normal" style="dark" />
      </div>
    );
  }

  if (planDetailsError) {
    return (
      <div className="flex justify-center items-center h-full px-4">
        <p className="text-sm text-gray-500">Error loading practice papers</p>
      </div>
    );
  }

  if (examsError) {
    const is404 = axios.isAxiosError(examsError)
      ? examsError.response?.status === 404
      : false;

    if (is404) {
      return (
        <div className="px-4 flex justify-center items-center h-32">
          <p className="text-sm text-gray-500">No practice papers available</p>
        </div>
      );
    }

    return (
      <div className="flex justify-center items-center h-full px-4">
        <p className="text-sm text-gray-500">Error loading practice papers</p>
      </div>
    );
  }

  const showLock = !hasActivePlan;

  if (!exams || exams.length === 0) {
    return (
      <div className="px-4 flex justify-center items-center h-32">
        <p className="text-sm text-gray-500">No practice papers available</p>
      </div>
    );
  }

  // Filter exams based on search query
  const filteredExams = searchQuery
    ? exams
        .map((exam: Exam) => ({
          ...exam,
          papers: exam.papers.filter(
            (paper: Paper) =>
              `Paper ${paper.number}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              (exam.title &&
                exam.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
              `Series ${exam.series}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((exam: Exam) => exam.papers.length > 0)
    : exams;

  const examsForList: PapersListExam[] = filteredExams.map((exam: Exam) => ({
    title: exam.title || `Series ${exam.series}`,
    items: exam.papers.map((paper: Paper) => ({
      key: paper.legacyId,
      label: `Paper ${paper.number}`,
      href: `/subjects/${subjectId}/papers/${paper.legacyId}`,
    })),
  }));

  return (
    <>
      {searchQuery && filteredExams.length === 0 && (
        <div className="px-4 flex justify-center items-center h-32">
          <p className="text-sm text-gray-500">
            No practice papers found for "{searchQuery}"
          </p>
        </div>
      )}
      <PapersList
        exams={examsForList}
        showLock={showLock}
        onItemClick={(key: string) =>
          track("clicked_practice_paper", { paper_id: key })
        }
      />
    </>
  );
}

export default SidebarPracticePapersLayout;
