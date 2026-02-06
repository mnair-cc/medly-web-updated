"use client";

import { useState, useEffect } from "react";
import Scale from "../../../(protected)/onboarding/_components/Scale";
import { getGradeScale } from "../../../(protected)/onboarding/_utils/gradeScales";
import { CourseType } from "../../../types/types";
import PrimaryButtonClicky from "../../PrimaryButtonClicky";
import ArrowRightIcon from "../../icons/ArrowRightIcon";
import { useTracking } from "../../../_lib/posthog/useTracking";

interface GradeSelectionProps {
  subject: {
    title: string;
    course: string;
    examBoard: string;
    legacyId: string;
  };
  onComplete: (
    currentGrade: string,
    targetGrade: string,
    priorQualificationGrade?: string
  ) => void;
}

export default function GradeSelection({
  subject,
  onComplete,
}: GradeSelectionProps) {
  const { track } = useTracking();

  const eligibleALevelSubject = (() => {
    const isALevel = subject.course?.toLowerCase().includes("a-level");
    const t = subject.title.toLowerCase();
    const isEligibleTitle =
      t.includes("math") ||
      t.includes("english language") ||
      t.includes("english literature") ||
      t.includes("physics") ||
      t.includes("biology") ||
      t.includes("chemistry");
    return Boolean(isALevel && isEligibleTitle);
  })();

  const [step, setStep] = useState<"prior" | "current" | "target">(
    eligibleALevelSubject ? "prior" : "current"
  );
  const [currentGrade, setCurrentGrade] = useState<string>("");
  const [targetGrade, setTargetGrade] = useState<string>("");
  const [priorQualificationGrade, setPriorQualificationGrade] =
    useState<string>("");

  // Reset state when subject changes
  useEffect(() => {
    setStep(eligibleALevelSubject ? "prior" : "current");
    setCurrentGrade("");
    setTargetGrade("");
    setPriorQualificationGrade("");
  }, [subject.legacyId, eligibleALevelSubject]); // Use legacyId as the dependency to detect subject changes

  // Tracking handlers
  const handlePriorGradeChange = (grade: string) => {
    setPriorQualificationGrade(grade);
    track("gcse_grade_selected", {
      grade,
      subject: subject.title,
      course: subject.course,
      examBoard: subject.examBoard,
      step: "prior",
    });
  };

  const handleCurrentGradeChange = (grade: string) => {
    setCurrentGrade(grade);
    track("current_grade_selected", {
      grade,
      subject: subject.title,
      course: subject.course,
      examBoard: subject.examBoard,
      step: "current",
    });
  };

  const handleTargetGradeChange = (grade: string) => {
    setTargetGrade(grade);
    track("target_grade_selected", {
      grade,
      subject: subject.title,
      course: subject.course,
      examBoard: subject.examBoard,
      step: "target",
    });
  };

  const gradeOptions = getGradeScale(
    subject.course as CourseType,
    subject.examBoard
  )
    .options.slice()
    .reverse();

  const priorGradeOptions = getGradeScale(
    "GCSE" as unknown as CourseType,
    subject.examBoard
  )
    .options.slice()
    .reverse();

  const handleNext = () => {
    if (
      step === "prior" &&
      (!eligibleALevelSubject || priorQualificationGrade)
    ) {
      setStep("current");
    } else if (step === "current" && currentGrade) {
      setStep("target");
    } else if (step === "target" && targetGrade) {
      // Track grade selection completion
      track("grade_selection_completed", {
        currentGrade,
        targetGrade,
        priorGrade: eligibleALevelSubject ? priorQualificationGrade : undefined,
        subject: subject.title,
        course: subject.course,
        examBoard: subject.examBoard,
        hasGcseGrade: Boolean(eligibleALevelSubject && priorQualificationGrade),
      });

      onComplete(
        currentGrade,
        targetGrade,
        eligibleALevelSubject ? priorQualificationGrade : undefined
      );
    }
  };

  // Removed unused back handler

  const isNextDisabled =
    (step === "prior" && eligibleALevelSubject && !priorQualificationGrade) ||
    (step === "current" && !currentGrade) ||
    (step === "target" && !targetGrade);

  return (
    <div className="flex flex-col gap-4 px-4 h-full">
      {step === "prior" && (
        <div className="flex-1 flex flex-col justify-center mb-6">
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-2xl font-rounded-bold text-center max-w-[260px] mx-auto mb-8">
              What was your GCSE {subject.title} grade?
            </p>
            <div className="flex justify-center items-center gap-4">
              <div className="bg-[#8FDCFF]/30 text-[#05B0FF] border-2 border-[#06B0FF] text-4xl font-rounded-semibold rounded-xl w-20 h-24 flex items-center justify-center">
                {priorQualificationGrade || "?"}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Scale
              options={priorGradeOptions}
              value={priorQualificationGrade}
              onChange={handlePriorGradeChange}
            />

            <PrimaryButtonClicky
              buttonText="Next"
              onPress={handleNext}
              disabled={isNextDisabled}
              buttonState="filled"
              showKeyboardShortcut={false}
              doesStretch={true}
            />
          </div>
        </div>
      )}
      {step === "current" && (
        <div className="flex-1 flex flex-col justify-center mb-6">
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-2xl font-rounded-bold text-center max-w-[200px] mx-auto mb-8">
              What&apos;s Your Current Grade?
            </p>
            <div className="flex justify-center items-center gap-4">
              <div className="bg-[#8FDCFF]/30 text-[#05B0FF] border-2 border-[#06B0FF] text-4xl font-rounded-semibold rounded-xl w-20 h-24 flex items-center justify-center">
                {currentGrade || "?"}
              </div>

              <ArrowRightIcon />
              <div className="bg-[#F2F2F7] text-[#595959]/50 text-4xl font-rounded-semibold rounded-xl w-20 h-24 flex items-center justify-center">
                ?
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Scale
              options={gradeOptions}
              value={currentGrade}
              onChange={handleCurrentGradeChange}
            />

            <PrimaryButtonClicky
              buttonText="Next"
              onPress={handleNext}
              disabled={isNextDisabled}
              buttonState="filled"
              showKeyboardShortcut={false}
              doesStretch={true}
            />
          </div>
        </div>
      )}

      {step === "target" && (
        <div className="flex-1 flex flex-col justify-center mb-6">
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-2xl font-rounded-bold text-center max-w-[200px] mx-auto mb-8">
              What&apos;s Your Target Grade?
            </p>
            <div className="flex justify-center items-center gap-4">
              <div className="bg-[#F2F2F7] text-black text-4xl font-rounded-semibold rounded-xl  w-20 h-24 flex items-center justify-center">
                {currentGrade}
              </div>

              <ArrowRightIcon />
              <div className="bg-[#8FDCFF]/30 text-[#05B0FF] border-2 border-[#06B0FF] text-4xl font-rounded-semibold rounded-xl  w-20 h-24 flex items-center justify-center">
                {targetGrade || "?"}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Scale
              options={gradeOptions}
              value={targetGrade}
              onChange={handleTargetGradeChange}
            />

            <PrimaryButtonClicky
              buttonText="Save"
              onPress={handleNext}
              disabled={isNextDisabled}
              buttonState="filled"
              showKeyboardShortcut={false}
              doesStretch={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
