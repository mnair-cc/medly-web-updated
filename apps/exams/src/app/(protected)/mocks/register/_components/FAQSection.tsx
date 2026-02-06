"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { useMockDates } from "../../_hooks/useMockDates";

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { mocksStart, mocksEnd, resultsDay: resultsDayDate } = useMockDates();

  // Format dates for display
  const dateRange = (() => {
    const startDay = mocksStart.format("D");
    const endDay = mocksEnd.format("D");
    const month = mocksStart.format("MMMM");
    return `${startDay}-${endDay} ${month}`;
  })();

  const resultsDay = resultsDayDate.format("D MMMM");

  const faqs = [
    {
      question: "What are Medly Christmas Mocks?",
      answer:
        "Medly Christmas Mocks are comprehensive GCSE practice examinations that recreate the authentic exam experience across multiple subjects including Biology, Chemistry, Physics, English Literature & Language, and Mathematics. Available for both AQA and Edexcel exam boards, these mocks provide students with realistic practice before their official GCSEs.",
    },
    {
      question: "How does Medly's AI-powered marking work?",
      answer:
        "Our platform uses advanced AI technology to mark your papers just like a human examiner would:\n\n1. **Intelligent marking** that understands different ways to express the same correct answer\n\n2. **Partial credit scoring** for method marks in subjects like Mathematics\n\n3. **Detailed feedback** with explanations for each question\n\nThis ensures you get accurate, consistent marking with personalized feedback to help you improve.",
    },
    {
      question: "Which subjects and exam boards are available?",
      answer:
        "We offer mocks for all major GCSE subjects:\n\n- **Sciences**: Biology, Chemistry, Physics (both Triple and Combined Science)\n- **English**: Literature and Language\n- **Mathematics**: All three papers\n\nAvailable for both **AQA** and **Edexcel** exam boards, so you can practice with papers that match your actual GCSE specifications.",
    },
    {
      question: "How are the mocks structured?",
      answer: `Each subject follows the official GCSE paper structure:\n\n- **Science subjects**: Paper 1 and Paper 2 (with separate Triple/Combined options)\n- **English**: Separate Literature and Language papers\n- **Mathematics**: Papers 1, 2, and 3\n\nAll papers are timed according to official GCSE specifications and can be completed at any time between ${dateRange}.`,
    },
    {
      question: "What feedback do I receive?",
      answer:
        "After completing your mocks, you'll receive:\n\n- **Predicted GCSE grades** for each subject\n- **Detailed mark breakdown** showing your performance across different topics\n- **Personalized feedback** highlighting strengths and areas for improvement\n- **Question-by-question explanations** to help you understand where you went wrong\n- **Study recommendations** to focus your revision effectively",
    },
    {
      question: "When are the results released?",
      answer: `All mock results will be released on ${resultsDay}, giving you comprehensive feedback across all your chosen subjects. You'll receive your predicted grades, detailed feedback, and personalized study recommendations to help guide your revision in the final weeks before your actual GCSEs.`,
    },
    {
      question: "Do you offer school partnerships?",
      answer:
        "Yes, for schools interested in offering Medly Mocks to their students or bulk licensing, please contact us at <a href='mailto:contact@medlyai.com'>contact@medlyai.com</a>.",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-10 w-full mt-20 max-w-[900px] mx-auto">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="font-rounded-bold text-[32px] md:text-[48px] leading-[36px] md:leading-[54px] text-center text-black tracking-[-0.02em]">
          FAQs
        </div>
      </div>

      <div className="w-full flex flex-col gap-6">
        {faqs.map((faq, index) => (
          <div key={index} className="w-full pb-4">
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex justify-between items-center text-left"
            >
              <div className="md:text-[18px] font-medium text-black">
                {faq.question}
              </div>
              <div
                className={`transform transition-transform duration-200 ${
                  openIndex === index ? "rotate-180" : ""
                }`}
              >
                <svg
                  width="32"
                  height="33"
                  viewBox="0 0 32 33"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16.0001 21.4199C16.3516 21.4099 16.673 21.2793 16.9342 20.998L24.5681 13.1833C24.7891 12.9623 24.9097 12.6811 24.9097 12.3496C24.9097 11.6867 24.3873 11.1543 23.7244 11.1543C23.403 11.1543 23.0916 11.2849 22.8605 11.5159L16.0101 18.5572L9.13956 11.5159C8.90853 11.2949 8.6072 11.1543 8.27572 11.1543C7.61278 11.1543 7.09045 11.6867 7.09045 12.3496C7.09045 12.6811 7.21099 12.9623 7.43197 13.1833L15.0759 20.998C15.3472 21.2793 15.6485 21.4199 16.0001 21.4199Z"
                    fill="#1C1C1E"
                  />
                </svg>
              </div>
            </button>
            {openIndex === index && (
              <div className="mt-4 text-[15px] leading-[22px] text-black/80 text-left">
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    p: ({ children }) => <p className="mb-2">{children}</p>,
                    a: ({ node, children, ...props }) => (
                      <a className="underline text-[#007AFF]" {...props}>
                        {children}
                      </a>
                    ),
                  }}
                >
                  {faq.answer}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQSection;
