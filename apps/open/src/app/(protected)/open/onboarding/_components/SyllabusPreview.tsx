"use client";

import { useEffect, useRef, useState } from "react";
import type { ExtractedSyllabus } from "../_types/syllabus";

function formatDueDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${day} ${month}`;
}

interface SyllabusPreviewProps {
  syllabus: ExtractedSyllabus;
  onModuleNameChange?: (name: string) => void;
}

export default function SyllabusPreview({
  syllabus,
  onModuleNameChange,
}: SyllabusPreviewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [visibleSections, setVisibleSections] = useState({
    moduleName: false,
    description: false,
    weeks: false,
    assignments: false,
  });
  const [visibleWeeks, setVisibleWeeks] = useState<number[]>([]);
  const [visibleAssignments, setVisibleAssignments] = useState<number[]>([]);

  // Progressive reveal animation
  useEffect(() => {
    // Show module name first
    const timer1 = setTimeout(() => {
      setVisibleSections((prev) => ({ ...prev, moduleName: true }));
    }, 100);

    // Show description
    const timer2 = setTimeout(() => {
      setVisibleSections((prev) => ({ ...prev, description: true }));
    }, 300);

    // Show weeks section
    const timer3 = setTimeout(() => {
      setVisibleSections((prev) => ({ ...prev, weeks: true }));
    }, 500);

    // Show assignments section
    const timer4 = setTimeout(() => {
      setVisibleSections((prev) => ({ ...prev, assignments: true }));
    }, 700);

    // Progressively reveal weeks
    syllabus.weeks.forEach((_, index) => {
      setTimeout(() => {
        setVisibleWeeks((prev) => [...prev, index]);
      }, 800 + index * 150);
    });

    // Progressively reveal assignments (after weeks)
    const weeksDelay = 800 + syllabus.weeks.length * 150;
    syllabus.assignments.forEach((_, index) => {
      setTimeout(() => {
        setVisibleAssignments((prev) => [...prev, index]);
      }, weeksDelay + 300 + index * 180);
    });

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [syllabus.weeks, syllabus.assignments]);

  // Auto-resize textarea on mount and when value changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [syllabus.moduleName]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
    onModuleNameChange?.(e.target.value);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Module Name (editable) */}
      <div
        style={{
          opacity: visibleSections.moduleName ? 1 : 0,
          transform: visibleSections.moduleName
            ? "translateY(0)"
            : "translateY(10px)",
          transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          className="w-full text-center font-rounded-bold text-4xl leading-tight focus:outline-none resize-none overflow-hidden"
          value={syllabus.moduleName}
          onChange={handleTextareaChange}
          placeholder="Module name"
        />
        {syllabus.moduleCode && (
          <p className="text-center text-sm text-gray-500 mt-1">
            {syllabus.moduleCode}
          </p>
        )}
      </div>

      {/* Description */}
      {syllabus.description && (
        <p
          className="text-[15px] text-gray-600 text-center mb-5"
          style={{
            opacity: visibleSections.description ? 1 : 0,
            transform: visibleSections.description
              ? "translateY(0)"
              : "translateY(10px)",
            transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
          }}
        >
          {syllabus.description}
        </p>
      )}

      {/* Weeks Summary */}
      {syllabus.weeks.length > 0 && (
        <div
          className="bg-[#F9F9FB] rounded-2xl p-4"
          style={{
            opacity: visibleSections.weeks ? 1 : 0,
            transform: visibleSections.weeks
              ? "translateY(0)"
              : "translateY(10px)",
            transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
          }}
        >
          <h4 className="font-rounded-bold text-sm mb-3">
            {syllabus.weeks.length} Weeks
          </h4>
          <div className="flex flex-col gap-2">
            {syllabus.weeks.map((week, index) => (
              <div
                key={week.weekNumber}
                className="flex items-center gap-2 text-sm"
                style={{
                  opacity: visibleWeeks.includes(index) ? 1 : 0,
                  transform: visibleWeeks.includes(index)
                    ? "translateX(0)"
                    : "translateX(-10px)",
                  transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
                }}
              >
                <span className="text-gray-400 w-16 shrink-0">
                  Week {week.weekNumber}
                </span>
                <span className="text-gray-700 truncate">{week.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignments Summary */}
      {syllabus.assignments.length > 0 && (
        <div
          className="bg-[#F9F9FB] rounded-2xl p-4"
          style={{
            opacity: visibleSections.assignments ? 1 : 0,
            transform: visibleSections.assignments
              ? "translateY(0)"
              : "translateY(10px)",
            transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
          }}
        >
          <h4 className="font-rounded-bold text-sm mb-3">
            {syllabus.assignments.length} Assignments
          </h4>
          <div className="flex flex-col gap-2">
            {syllabus.assignments.map((assignment, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
                style={{
                  opacity: visibleAssignments.includes(index) ? 1 : 0,
                  transform: visibleAssignments.includes(index)
                    ? "translateX(0)"
                    : "translateX(-10px)",
                  transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
                }}
              >
                <span className="text-gray-700 flex-1">{assignment.title}</span>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  {assignment.weighting != null && assignment.weighting > 0 && (
                    <span className="font-rounded-bold text-black px-3 py-1 rounded-full bg-[#F2F2F7] flex items-center gap-1">
                      <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.72754 19.5605C4.72754 20.958 5.71191 22.083 7.24121 22.083H20.75C22.2881 22.083 23.2725 20.958 23.2725 19.5605C23.2725 19.1475 23.1582 18.7256 22.9385 18.3301L16.1709 6.52637C15.6875 5.69141 14.8525 5.25195 14 5.25195C13.1387 5.25195 12.3125 5.69141 11.8291 6.52637L5.06152 18.3213C4.8418 18.7168 4.72754 19.1475 4.72754 19.5605ZM6.47656 19.4814C6.47656 19.3408 6.51172 19.1738 6.59961 19.0244L13.209 7.44043C13.3848 7.1416 13.6924 7.00098 14 7.00098V20.4307H7.39941C6.85449 20.4307 6.47656 19.9736 6.47656 19.4814Z" fill="#1FADFF" />
                      </svg>

                      {assignment.weighting}%
                    </span>
                  )}

                  {assignment.dueDate && (
                    <span className="font-rounded-bold text-black px-3 py-1 rounded-full bg-[#F2F2F7] flex items-center gap-1">
                      <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.94434 21.8809H20.0469C21.9541 21.8809 22.9473 20.8965 22.9473 19.0156V8.31934C22.9473 6.43848 21.9541 5.4541 20.0469 5.4541H7.94434C6.0459 5.4541 5.05273 6.42969 5.05273 8.31934V19.0156C5.05273 20.8965 6.0459 21.8809 7.94434 21.8809ZM7.93555 20.1318C7.20605 20.1318 6.80176 19.7539 6.80176 18.9805V10.8945C6.80176 10.1211 7.20605 9.74316 7.93555 9.74316H20.0557C20.7852 9.74316 21.1895 10.1211 21.1895 10.8945V18.9805C21.1895 19.7539 20.7852 20.1318 20.0557 20.1318H7.93555ZM12.3037 12.7754H12.8223C13.1387 12.7754 13.2441 12.6787 13.2441 12.3711V11.8525C13.2441 11.5361 13.1387 11.4395 12.8223 11.4395H12.3037C11.9873 11.4395 11.8818 11.5361 11.8818 11.8525V12.3711C11.8818 12.6787 11.9873 12.7754 12.3037 12.7754ZM15.1777 12.7754H15.6963C16.0039 12.7754 16.1094 12.6787 16.1094 12.3711V11.8525C16.1094 11.5361 16.0039 11.4395 15.6963 11.4395H15.1777C14.8613 11.4395 14.7559 11.5361 14.7559 11.8525V12.3711C14.7559 12.6787 14.8613 12.7754 15.1777 12.7754ZM18.043 12.7754H18.5615C18.8779 12.7754 18.9834 12.6787 18.9834 12.3711V11.8525C18.9834 11.5361 18.8779 11.4395 18.5615 11.4395H18.043C17.7354 11.4395 17.6299 11.5361 17.6299 11.8525V12.3711C17.6299 12.6787 17.7354 12.7754 18.043 12.7754ZM9.43848 15.6055H9.94824C10.2646 15.6055 10.3701 15.5088 10.3701 15.1924V14.6738C10.3701 14.3662 10.2646 14.2695 9.94824 14.2695H9.43848C9.12207 14.2695 9.0166 14.3662 9.0166 14.6738V15.1924C9.0166 15.5088 9.12207 15.6055 9.43848 15.6055ZM12.3037 15.6055H12.8223C13.1387 15.6055 13.2441 15.5088 13.2441 15.1924V14.6738C13.2441 14.3662 13.1387 14.2695 12.8223 14.2695H12.3037C11.9873 14.2695 11.8818 14.3662 11.8818 14.6738V15.1924C11.8818 15.5088 11.9873 15.6055 12.3037 15.6055ZM15.1777 15.6055H15.6963C16.0039 15.6055 16.1094 15.5088 16.1094 15.1924V14.6738C16.1094 14.3662 16.0039 14.2695 15.6963 14.2695H15.1777C14.8613 14.2695 14.7559 14.3662 14.7559 14.6738V15.1924C14.7559 15.5088 14.8613 15.6055 15.1777 15.6055ZM18.043 15.6055H18.5615C18.8779 15.6055 18.9834 15.5088 18.9834 15.1924V14.6738C18.9834 14.3662 18.8779 14.2695 18.5615 14.2695H18.043C17.7354 14.2695 17.6299 14.3662 17.6299 14.6738V15.1924C17.6299 15.5088 17.7354 15.6055 18.043 15.6055ZM9.43848 18.4268H9.94824C10.2646 18.4268 10.3701 18.3301 10.3701 18.0225V17.5039C10.3701 17.1875 10.2646 17.0908 9.94824 17.0908H9.43848C9.12207 17.0908 9.0166 17.1875 9.0166 17.5039V18.0225C9.0166 18.3301 9.12207 18.4268 9.43848 18.4268ZM12.3037 18.4268H12.8223C13.1387 18.4268 13.2441 18.3301 13.2441 18.0225V17.5039C13.2441 17.1875 13.1387 17.0908 12.8223 17.0908H12.3037C11.9873 17.0908 11.8818 17.1875 11.8818 17.5039V18.0225C11.8818 18.3301 11.9873 18.4268 12.3037 18.4268ZM15.1777 18.4268H15.6963C16.0039 18.4268 16.1094 18.3301 16.1094 18.0225V17.5039C16.1094 17.1875 16.0039 17.0908 15.6963 17.0908H15.1777C14.8613 17.0908 14.7559 17.1875 14.7559 17.5039V18.0225C14.7559 18.3301 14.8613 18.4268 15.1777 18.4268Z" fill="#FF5153" />
                      </svg>

                      {formatDueDate(assignment.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Readings Summary
      {syllabus.readings && syllabus.readings.length > 0 && (
        <div className="bg-[#F9F9FB] rounded-2xl p-4">
          <h4 className="font-rounded-bold text-sm mb-2">
            {syllabus.readings.length} Reading{syllabus.readings.length !== 1 ? "s" : ""}
          </h4>
          <p className="text-xs text-gray-500">
            {syllabus.readings.filter((r) => r.required).length} required
          </p>
        </div>
      )} */}
    </div>
  );
}
