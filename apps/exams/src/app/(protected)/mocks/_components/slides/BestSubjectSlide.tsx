import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
import { SubjectInsight } from "../../_types/types";
import { deconstructSubjectLegacyId } from "@/app/_lib/utils/utils";

const subjects: { title: string; emojis: string[] }[] = [
  { title: "Biology", emojis: ["🦠", "🌿", "🌼", "🫁"] },
  { title: "Chemistry", emojis: ["💥", "🧪", "🔬", "💧"] },
  { title: "Physics", emojis: ["⚡️", "🔭", "🚀", "🧲"] },
  { title: "Maths", emojis: ["➗", "📐", "🎲", "🧮"] },
  { title: "English Literature", emojis: ["🌹", "📖", "🦢", "🕯️"] },
  { title: "English Language", emojis: ["📣", "📝", "🔎", "💌"] },
];

const BestSubjectSlide = ({
  bestSubject,
}: {
  bestSubject?: SubjectInsight;
}) => {
  const [visibleEmojis, setVisibleEmojis] = useState<number>(0);
  const [textHeight, setTextHeight] = useState<number>(200);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  const { subjectTitle } = bestSubject?.subjectId
    ? deconstructSubjectLegacyId(bestSubject.subjectId)
    : { subjectTitle: "" };

  // Match on base subject name (e.g., "Biology A" or "Biology (Combined)" should match "Biology")
  const subject = subjects.find((s) => subjectTitle.startsWith(s.title));
  const orderedSubjects = subject
    ? [...subjects.filter((s) => s.title !== subject.title), subject]
    : subjects;
  const subjectsToCycleThrough = [
    ...orderedSubjects,
    ...orderedSubjects,
    ...orderedSubjects,
    ...orderedSubjects,
    ...orderedSubjects,
    ...orderedSubjects,
    ...orderedSubjects,
    ...orderedSubjects,
    ...orderedSubjects,
    orderedSubjects[0],
  ];

  const getDisplayTitle = (title: string) => {
    if (title === "English Literature") return "English Lit";
    if (title === "English Language") return "English Lang";
    return title;
  };

  useEffect(() => {
    if (textRef.current) {
      const height = textRef.current.getBoundingClientRect().height;
      setTextHeight(height);
    }
  }, []);

  useEffect(() => {
    // Wait for scroll animation to complete (5 seconds) before starting emoji animations
    const scrollTimer = setTimeout(() => {
      const emojiTimer = setInterval(() => {
        setVisibleEmojis((prev) => {
          if (prev >= 4) {
            clearInterval(emojiTimer);
            return prev;
          }
          return prev + 1;
        });
      }, 200);

      return () => clearInterval(emojiTimer);
    }, 5800);

    return () => clearTimeout(scrollTimer);
  }, []);

  if (!bestSubject?.subjectId || !subject) {
    return null;
  }
  const [emoji1, emoji2, emoji3, emoji4] = subject.emojis;

  return (
    <div className="flex flex-col items-center justify-center h-full z-1 mb-32">
      <div className="relative" ref={containerRef}>
        <div className={`flex h-[128px] xl:h-[200px] w-full overflow-hidden`}>
          <AnimatePresence>
            <motion.div
              initial={{
                y: textHeight,
              }}
              animate={{
                y:
                  -textHeight * (subjectsToCycleThrough.length - 1) +
                  textHeight -
                  15,
              }}
              transition={{
                duration: 5,
                ease: [0.25, 0.1, 0.35, 1.0],
                delay: 0.5,
              }}
              className="z-10"
            >
              {subjectsToCycleThrough.map((subject, index) => (
                <h2
                  ref={index === 0 ? textRef : undefined}
                  className="text-9xl xl:text-[200px] font-rounded-bold whitespace-nowrap"
                  key={index}
                >
                  {subject ? getDisplayTitle(subject.title) : ""}
                </h2>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        {visibleEmojis >= 1 && (
          <span
            className="absolute text-9xl xl:text-[150px] animate-float1 animate-sprout"
            style={{ top: "-90px", left: "15%", zIndex: 0 }}
          >
            {emoji1}
          </span>
        )}
        {visibleEmojis >= 2 && (
          <span
            className="absolute text-9xl xl:text-[150px] animate-float2 animate-sprout"
            style={{ top: "-80px", right: "10%", zIndex: 20 }}
          >
            {emoji2}
          </span>
        )}
        {visibleEmojis >= 3 && (
          <span
            className="absolute text-9xl xl:text-[150px] animate-float3 animate-sprout"
            style={{ bottom: "-80px", left: "25%", zIndex: 20 }}
          >
            {emoji3}
          </span>
        )}
        {visibleEmojis >= 4 && (
          <span
            className="absolute text-9xl xl:text-[150px] animate-float4 animate-sprout"
            style={{ bottom: "-90px", right: "20%", zIndex: 0 }}
          >
            {emoji4}
          </span>
        )}
      </div>
      <style jsx global>{`
        @keyframes float1 {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          50% {
            transform: translate(-5px, -5px) rotate(2deg);
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
        }
        @keyframes float2 {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          50% {
            transform: translate(5px, -5px) rotate(-2deg);
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
        }
        @keyframes float3 {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          50% {
            transform: translate(-5px, 5px) rotate(-2deg);
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
        }
        @keyframes float4 {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          50% {
            transform: translate(5px, 5px) rotate(2deg);
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
        }
        @keyframes sprout {
          0% {
            transform: scale(0);
          }
          70% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-float1 {
          animation: float1 8s ease-in-out infinite;
        }
        .animate-float2 {
          animation: float2 9s ease-in-out infinite;
        }
        .animate-float3 {
          animation: float3 10s ease-in-out infinite;
        }
        .animate-float4 {
          animation: float4 9.5s ease-in-out infinite;
        }
        .animate-sprout {
          animation: sprout 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-float1.animate-sprout {
          animation:
            sprout 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            float1 8s ease-in-out infinite 0.3s;
        }
        .animate-float2.animate-sprout {
          animation:
            sprout 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            float2 9s ease-in-out infinite 0.3s;
        }
        .animate-float3.animate-sprout {
          animation:
            sprout 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            float3 10s ease-in-out infinite 0.3s;
        }
        .animate-float4.animate-sprout {
          animation:
            sprout 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            float4 9.5s ease-in-out infinite 0.3s;
        }
      `}</style>
    </div>
  );
};

export default BestSubjectSlide;
