"use client";

import { useEffect, useMemo, useState } from "react";
import TickIcon from "@/app/_components/icons/TickIcon";

const MotivationalStep = ({
  faded = false,
  medly = false,
}: {
  faded?: boolean;
  medly?: boolean;
}) => {
  const nonMedlySteps = useMemo(
    () => [
      "Understand your materials deeply",
      "Practice active recall regularly",
      "Connect ideas across topics",
    ],
    []
  );

  const medlySteps = useMemo(
    () => [
      "Medly organizes your materials for deep understanding",
      "Medly creates flashcards for active recall",
      "Medly helps you connect ideas across your documents",
    ],
    []
  );

  const [stepStates, setStepStates] = useState(() =>
    nonMedlySteps.map(() => ({
      opacity: 0,
      isMedly: false,
      text: "",
    }))
  );

  // Phase 1: Fade in non-Medly steps
  useEffect(() => {
    if (!faded && !medly) {
      nonMedlySteps.forEach((step, index) => {
        setTimeout(
          () => {
            setStepStates((prev) =>
              prev.map((state, i) =>
                i === index ? { opacity: 1, isMedly: false, text: step } : state
              )
            );
          },
          300 + index * 300
        );
      });
    }
  }, [faded, medly, nonMedlySteps]);

  // Phase 2: Fade all steps to 50%
  useEffect(() => {
    if (faded && !medly) {
      setStepStates((prev) =>
        prev.map((state, index) => ({
          opacity: 0.5,
          isMedly: false,
          text: nonMedlySteps[index],
        }))
      );
    }
  }, [faded, medly, nonMedlySteps]);

  // Phase 3: Replace with Medly steps
  useEffect(() => {
    if (medly) {
      medlySteps.forEach((step, index) => {
        setTimeout(() => {
          setStepStates((prev) =>
            prev.map((state, i) =>
              i === index ? { opacity: 1, isMedly: true, text: step } : state
            )
          );
        }, index * 300);
      });
    }
  }, [medly, medlySteps]);

  return (
    <div className="flex flex-col justify-center items-center flex-1 gap-6 mt-4 overflow-y-auto mx-auto pb-16">
      {stepStates.map((stepState, index) => (
        <div
          key={index}
          className="flex sm:flex-row flex-col justify-center items-center max-w-[250px] sm:max-w-none gap-3 text-xl md:text-2xl font-rounded-bold text-center transition-opacity duration-300 ease-in-out"
          style={{ opacity: stepState.opacity }}
        >
          <p
            className={`inline-flex items-center justify-center text-white rounded-full w-8 h-8 ${
              stepState.isMedly ? "bg-success" : "bg-[#05B0FF]"
            }`}
          >
            {stepState.isMedly ? <TickIcon fill="white" /> : index + 1}
          </p>
          <p>{stepState.text}</p>
        </div>
      ))}
    </div>
  );
};

export default MotivationalStep;
