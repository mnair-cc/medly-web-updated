"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMockDates } from "../../../_hooks/useMockDates";

export default function FAQSectionRedesigned() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { mocksStart, mocksEnd, resultsDay } = useMockDates();

  const examDateRange = (() => {
    const startDay = mocksStart.format("D");
    const endDay = mocksEnd.format("D");
    const startMonth = mocksStart.format("MMMM");
    const endMonth = mocksEnd.format("MMMM");
    const year = mocksEnd.format("YYYY");

    if (startMonth === endMonth) {
      return `${startDay}-${endDay} ${startMonth} ${year}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  })();

  const resultsDate = resultsDay.format("D MMMM YYYY");

  const FAQ_ITEMS = [
    {
      question: "What are the Medly Christmas Mocks?",
      answer:
        "Comprehensive GCSE and A Level practice exams designed to help you start the year strong and prepare for your mocks in the new year. They recreate real exam conditions across:\n\n**Sciences**: Biology, Chemistry, Physics (Triple and Combined Science)\n**English**: Literature and Language\n**Maths**: All three papers\n\nAvailable for **AQA**, **OCR**, and **Edexcel** exam boards for GCSE, and **AQA** and **OCR** for A Level, with AI-powered marking and personalised feedback.",
    },
    {
      question: "Are the Mocks free?",
      answer:
        "Yes, completely free for all students on the free and pro plans. Spaces are limited to **1000 participants**.",
    },
    {
      question: "Who are the Christmas Mocks for?",
      answer:
        "**Any GCSE or A Level student preparing for their exams.** Whether you're taking AQA or Edexcel, studying Triple or Combined Science, or sitting Foundation or Higher tier, the mocks are designed to help you practice under real exam conditions and identify areas to improve.\n\nOver **20,000 students** have taken Medly Mocks, with many reporting improved confidence and exam technique heading into their real exams.",
    },
    {
      question: "When and how do I take the exams?",
      answer: `Exams run **${examDateRange}**. Each mock is available for **24 hours** from **9:00am** on its scheduled day until **8:59am** the next morning.\n\nTake them online through Medly at any time within this window. You'll need:\n\n• A device with internet\n• A calculator for maths/science\n• Paper for working out\n\nIf you miss a paper, it will be locked unless you are subscribed to **Medly Pro**.`,
    },
    {
      question: "How are the mocks marked and what feedback will I receive?",
      answer: `Medly marks your papers like a human examiner—understanding different correct answers, awarding partial credit, and providing detailed explanations.\n\nFull results will be released on **${resultsDate}**. This allows time for adjustments based on how students nationwide have performed, ensuring the most accurate grading possible. Your final results will include:\n\n• Estimated grades for each subject\n• Detailed mark breakdown by topic\n• Question-by-question explanations\n• Personalised study recommendations`,
    },
    {
      question: "Can I skip the waitlist?",
      answer:
        "If we've reached capacity, you'll be added to our **waitlist** and we'll notify you as soon as a spot opens up.\n\nWant to skip the queue? Here's how:\n\n• **Refer 3 friends** - Share your unique referral code with friends. Once three of them sign up using your code, you'll automatically get off the waitlist and secure your place.\n• Medly Pro subscribers also get priority access.",
    },
    {
      question: "Do you offer school partnerships?",
      answer:
        "Yes, for schools interested in offering Medly Mocks to their students or bulk licensing, please contact us at contact@medlyai.com.",
    },
  ];

  return (
    <div className="flex w-full max-w-[960px] flex-col items-center gap-[40px]">
      <p className="font-rounded-bold text-center text-[40px] leading-[54px] tracking-[-0.36px] text-neutral-950">
        Frequently Asked Questions
      </p>

      <div className="flex w-full flex-col items-start">
        {FAQ_ITEMS.map((item, index) => (
          <FAQItem
            key={index}
            question={item.question}
            answer={item.answer}
            isOpen={openIndex === index}
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            isLast={index === FAQ_ITEMS.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
  isLast: boolean;
}

function parseBoldText(text: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let match;
  let keyCounter = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Add bold text
    parts.push(
      <strong key={`bold-${keyCounter++}`} className="font-semibold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function parseMarkdown(text: string) {
  // Split by newlines to handle line breaks
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check if this is a bullet point
    if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
      // Collect consecutive bullet points
      const bulletItems: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("• "))
      ) {
        const prefix = lines[i].trim().startsWith("- ") ? "- " : "• ";
        bulletItems.push(lines[i].trim().substring(prefix.length)); // Remove prefix
        i++;
      }

      // Render as a list with margin top if not first element
      result.push(
        <ul
          key={`list-${i}`}
          className={`ml-5 list-disc space-y-1 ${result.length > 0 ? "mt-4" : ""}`}
        >
          {bulletItems.map((item, idx) => (
            <li key={idx}>{parseBoldText(item)}</li>
          ))}
        </ul>
      );
    } else if (line.trim() === "") {
      // Empty line - skip but it will create spacing via margin classes on next element
      i++;
    } else {
      // Regular line with bold text
      // Add margin top if previous line was empty (to create paragraph spacing)
      const prevLineEmpty = i > 0 && lines[i - 1].trim() === "";
      result.push(
        <span
          key={`line-${i}`}
          className={
            prevLineEmpty && result.length > 0 ? "block mt-4" : "block"
          }
        >
          {parseBoldText(line)}
        </span>
      );
      i++;
    }
  }

  return result;
}

function FAQItem({ question, answer, isOpen, onClick, isLast }: FAQItemProps) {
  return (
    <div
      className={`w-full shrink-0 ${!isLast ? "border-b border-[#f2f2f7]" : ""}`}
    >
      <div className="size-full">
        <div className="flex w-full flex-col items-start py-0">
          <button
            onClick={onClick}
            className="relative h-[80px] w-full text-left"
          >
            <p className="font-rounded-bold absolute left-0 top-[28px] pr-[60px] text-[20px] leading-[26px] text-neutral-950">
              {question}
            </p>
            <motion.div
              className="absolute right-0 top-[28px] size-[24px]"
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <svg
                className="block size-full"
                fill="none"
                viewBox="0 0 24 24"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mb-6 pr-[60px] pt-2 text-[16px] leading-[24px] text-[#4a5565]">
                  {parseMarkdown(answer)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
