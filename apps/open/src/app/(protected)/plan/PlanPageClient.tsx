"use client";

import { useTracking } from "@/app/_lib/posthog/useTracking";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect, useRef, useState } from "react";
import Marquee from "react-fast-marquee";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { toast } from "sonner";
import ChevronRightIcon from "../../_components/icons/ChevronRightIcon";
import TickIconLarge from "../../_components/icons/TickIconLarge";
import PlanCtas from "./_components/planCtas";
// FAQ Section Component
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Is Medly specific to the GCSE and A-Level specification?",
      answer:
        "All questions and explanations follow official GCSE and A-Level requirements, ensuring your practice directly matches what you'll encounter in your exams.",
    },
    {
      question: "How are answers marked on Medly?",
      answer:
        "Our proprietary AI system is specifically designed to follow official exam board guidelines and marking schemes, ensuring your work is assessed according to the exact same standards used in real exams.",
    },
    {
      question: "How does Medly help students prepare for exams?",
      answer:
        "Medly is designed for students at all levels. It adapts to their current level and helps build confidence through two key study modes:\n\n - **Learn and Practice Mode**\n\nPerfect for learning a topic from scratch or testing your knowledge after class. Like a smart workbook, it provides instant, personalised feedback as you work through difficult concepts at your own pace.\n\n**Exam Mode**\n\nExam Mode is perfect for exam practice, whether you're 4 months away from your exam or it's the day of. Sessions can be customised to target your weak areas and to the time you have.",
    },
    {
      question:
        "What is the difference between the Medly Mobile App and Medly Exams?",
      answer:
        "**Medly Mobile App**\n\nPerfect for building a consistent study habit. The app features quick, enjoyable multiple-choice questions with our signature feedback system. Ideal for learning on the go and gradually strengthening your understanding of key concepts.\n\n**Medly Exams (Desktop)**\n\nDesigned for focused exam preparation, especially for higher-mark questions (4-8 marks) that often appear towards the end of exam papers. Using a keyboard, you'll practice longer-form answers and improve your exam technique through active recall exercises.\n\nThink of Medly as your daily study companion, while Medly Exams as your intensive exam preparation tool.",
    },
    {
      question: "Does Medly cover everything for the exam?",
      answer:
        "Yes, all our notes and questions are quality checked by experienced GCSE and A-Level teachers for alignment to your exam board, and coverage of every point on the specification.\n\nBest of all, every question you encounter will be new - we perfectly match your exam board's style and requirements. This means you'll get fresh practice material that's always aligned with what you'll see in your actual exam.",
    },
    {
      question: "How do I cancel my subscription?",
      answer:
        "Once logged in at the home screen, click on the manage account button in the bottom left, then log into the stripe payment platform to cancel. You can cancel at any time, for any reason.",
    },
    {
      question: "Do you offer school subscriptions?",
      answer:
        "Yes, for schools interested in bulk licensing or institutional packages, please contact us at <a href='mailto:contact@medlyai.com'>contact@medlyai.com</a>.",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-10 w-full mt-20 max-w-[900px]">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="font-heading text-[32px] md:text-[48px] leading-[36px] md:leading-[54px] text-center text-black tracking-[-0.02em]">
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

// Constants for schools and reviews
const SCHOOLS = [
  { src: "/assets/schools/school_1.png", alt: "School 1" },
  { src: "/assets/schools/school_2.png", alt: "School 2" },
  { src: "/assets/schools/qe.png", alt: "QE School" },
  { src: "/assets/schools/school_4.png", alt: "School 4" },
  { src: "/assets/schools/school_5.png", alt: "School 5" },
  { src: "/assets/schools/school_6.png", alt: "School 6" },
  { src: "/assets/schools/school_7.png", alt: "School 7" },
  { src: "/assets/schools/qe.png", alt: "QE School" },
  { src: "/assets/schools/school_3.png", alt: "School 3" },
];

// Add email validation function
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

function PlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isFromMocks, setIsFromMocks] = useState<boolean>(false);
  const parentsSectionRef = useRef<HTMLDivElement>(null);
  const scrollToParentsSection = () => {
    parentsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const [parentEmail, setParentEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { data: session } = useSession();

  const handleContinue = async (planId: string) => {
    try {
      setIsLoading(planId);

      // Create a form element
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/user/plan";

      // Add the plan input
      const planInput = document.createElement("input");
      planInput.type = "hidden";
      planInput.name = "plan";
      planInput.value = planId;
      form.appendChild(planInput);

      // Append to body and submit
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error("Error processing subscription:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!isValidEmail(parentEmail)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    } else {
      setEmailError("");
    }

    if (!studentName.trim()) {
      setNameError("Please enter your name");
      hasError = true;
    } else {
      setNameError("");
    }

    if (!session?.user?.email) {
      hasError = true;
      setEmailError(
        "Error sending email. Please refresh the page and try again.",
      );
    }

    if (hasError) return;

    setIsSending(true);

    try {
      const response = await fetch("/api/send-parent-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: parentEmail,
          studentName:
            studentName.charAt(0).toUpperCase() + studentName.slice(1),
          uid: session?.user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      // Track event in PostHog
      if (typeof window !== "undefined" && window.posthog) {
        window.posthog.capture("parent_email_sent", {
          student_name: studentName,
          email: parentEmail,
          uid: session?.user?.id,
        });
      }

      // Show toast notification
      toast("Email sent successfully", {
        description: "Your parent has been notified about Medly.",
        icon: "✉️",
        duration: 3000,
        position: "top-center",
      });

      // Clear inputs
      setParentEmail("");
      setStudentName("");
    } catch (error) {
      console.error("Error sending email:", error);
      setEmailError("Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const { track } = useTracking();

  useEffect(() => {
    // Check if user is coming from mocks page
    const fromMocks = searchParams.get("from") === "mocks";
    setIsFromMocks(fromMocks);

    if (fromMocks) {
      track("viewed_plan_from_mocks", {
        location: "plan_page",
        referrer: "mocks_page",
      });
    }
  }, [searchParams, track]);

  return (
    <div className="bg-white min-h-screen relative">
      <Script
        id="google-ads-conversion"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            if (typeof gtag !== 'undefined') {
              gtag('event', 'conversion', {
                'send_to': 'AW-16449487527/22DpCN7GjqIbEKeF3aM9',
                'value': 1.0,
                'currency': 'GBP'
              });
            }
          `,
        }}
      />
      {/* <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div className="text-black text-xl font-medium">
          </div>
        </div>
      </div> */}

      <div className=" mx-auto px-4 py-10 flex flex-col items-center">
        <div className="absolute top-10 right-10">
          <button
            onClick={() => {
              track("click_back_to_home", {
                location: "plan_page",
              });
              router.push("/");
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center">
          <Image
            src="/logo_square_black.png"
            alt="logo"
            height={80}
            width={80}
            priority
          />

          <div className="mx-4 flex flex-col items-center gap-4">
            <div className="h-[54px] flex items-center gap-2">
              <div className="text-black text-lg font-medium">Excellent</div>
              <div className="flex flex-col items-center">
                <div className="text-black text-3xl font-medium leading-tight">
                  4.8
                </div>
                <svg
                  width="70"
                  height="12"
                  viewBox="0 0 87 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#clip0_48_2237)">
                    <path
                      d="M8.05424 11.763L4.46883 14.3418C3.72116 14.8742 2.85455 14.3751 3.19439 13.4267L4.60477 9.31735L0.934398 6.73858C0.169739 6.20619 0.475603 5.29113 1.3762 5.29113H5.91318L7.27259 1.19838C7.54446 0.349888 8.54701 0.349888 8.83589 1.19838L10.1783 5.29113H14.6983C15.6159 5.29113 15.9047 6.20619 15.1571 6.73858L11.5037 9.31735L12.8971 13.4267C13.2369 14.3917 12.3703 14.8742 11.6396 14.3418L8.05424 11.763Z"
                      fill="#FFA935"
                    />
                    <path
                      d="M25.7835 11.763L22.1981 14.3418C21.4504 14.8742 20.5838 14.3751 20.9236 13.4267L22.334 9.31735L18.6636 6.73858C17.899 6.20619 18.2049 5.29113 19.1054 5.29113H23.6424L25.0018 1.19838C25.2737 0.349887 26.2763 0.349887 26.5651 1.19838L27.9076 5.29113H32.4275C33.3451 5.29113 33.6341 6.20619 32.8863 6.73858L29.233 9.31735L30.6262 13.4267C30.9662 14.3917 30.0996 14.8742 29.369 14.3418L25.7835 11.763Z"
                      fill="#FFA935"
                    />
                    <path
                      d="M43.5127 11.763L39.9272 14.3418C39.1796 14.8742 38.313 14.3751 38.6528 13.4267L40.0632 9.31735L36.393 6.73858C35.6282 6.20619 35.9341 5.29113 36.8346 5.29113H41.3717L42.731 1.19838C43.003 0.349887 44.0054 0.349887 44.2944 1.19838L45.6368 5.29113H50.1567C51.0743 5.29113 51.3633 6.20619 50.6155 6.73858L46.9622 9.31735L48.3554 13.4267C48.6955 14.3917 47.8288 14.8742 47.0982 14.3418L43.5127 11.763Z"
                      fill="#FFA935"
                    />
                    <path
                      d="M61.2419 11.763L57.6564 14.3418C56.9089 14.8742 56.0423 14.3751 56.382 13.4267L57.7924 9.31735L54.1222 6.73858C53.3575 6.20619 53.6634 5.29113 54.5638 5.29113H59.1009L60.4603 1.19838C60.7323 0.349887 61.7347 0.349887 62.0236 1.19838L63.366 5.29113H67.8859C68.8036 5.29113 69.0926 6.20619 68.3448 6.73858L64.6915 9.31735L66.0847 13.4267C66.4247 14.3917 65.5581 14.8742 64.8275 14.3418L61.2419 11.763Z"
                      fill="#FFA935"
                    />
                    <path
                      d="M78.9712 11.763L75.3856 14.3418C74.6381 14.8742 73.7715 14.3751 74.1113 13.4267L75.5217 9.31735L71.8514 6.73858C71.0867 6.20619 71.3926 5.29113 72.2931 5.29113H76.8302L78.1895 1.19838C78.4615 0.349888 79.4639 0.349888 79.7529 1.19838L81.0953 5.29113H84.5154V7.83875L82.4207 9.31735L83.8139 13.4267C84.1539 14.3917 83.2873 14.8742 82.5567 14.3418L78.9712 11.763Z"
                      fill="#FFA935"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_48_2237">
                      <rect
                        width="86"
                        height="14"
                        fill="white"
                        transform="translate(0.5 0.562012)"
                      />
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <div className="text-black text-base font-medium">
                1K+ reviews on
              </div>
              <svg
                width="16"
                height="19"
                viewBox="0 0 26 31"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.2657 7.32C16.9242 7.6853 19.8323 3.75836 19.5509 0.562012C15.8923 0.74466 13.125 3.94101 13.2657 7.32Z"
                  fill="#1C1C1E"
                />
                <path
                  d="M22.2713 19.1922C22.928 20.7903 24.0537 21.8862 25.8361 22.6625C25.1794 24.8999 23.6316 27.6853 21.6147 29.5118C21.0049 30.1054 20.1137 30.5164 18.988 30.5164C17.9092 30.5164 17.2526 30.1054 16.3614 29.8314C15.7516 29.6488 14.9543 29.2835 13.9693 29.2835C11.7179 29.2835 10.7329 30.562 8.8567 30.562C7.63719 30.562 6.55839 29.8314 5.19816 28.3246C2.57152 25.4935 0.83606 20.973 0.83606 17.0917C0.83606 14.8086 1.49272 12.4798 2.99366 10.6533C4.26007 9.0095 6.27696 8.0506 8.66908 8.0506C10.9205 8.0506 12.2338 9.42046 13.4064 9.42046C14.8135 9.42046 16.4083 8.00493 19.2226 8.00493C21.6616 8.00493 23.7723 9.0095 25.0387 10.9273C23.3032 11.9319 22.6466 13.1648 22.2713 14.1693C21.7085 15.6762 21.5678 17.4113 22.2713 19.1922Z"
                  fill="#1C1C1E"
                />
              </svg>
            </div>
          </div>

          <div className="font-heading text-[32px] md:text-[48px] leading-[36px] md:leading-[54px] text-center text-black tracking-[-0.02em] mt-10 mb-4">
            {isFromMocks ? (
              <span>
                Skip the waitlist for Medly Mocks,
                <br /> and get unlimited access to Medly
              </span>
            ) : (
              "Get unlimited access to Medly"
            )}
          </div>

          <p className="text-base text-center text-[rgba(0,0,0,0.5)]">
            Pay just once to get all-in-one access until the final day of your
            exams, <br className="hidden md:block" />
            or subscribe to on-the-go learning.
          </p>

          <button
            onClick={() => {
              track("click_ask_parents", {
                location: "plan_page",
              });
              scrollToParentsSection();
            }}
            type="button"
            // className="m-4 px-4 py-2 rounded-full font-medium text-[15px] text-[#007AFF] border border-[#f2f2f7] flex items-center"
            className="m-4 px-4 py-2 rounded-full font-medium text-[15px] text-[#007AFF] flex items-center"
          >
            Ask my parents
            <ChevronRightIcon fill="#007AFF" />
          </button>
        </div>

        {/* <div className="my-8">
          <ul className="flex gap-8">
            <li className="flex items-center gap-4">
              <TickIconLarge />
              <span>Unlimited access to 10,000+ exam-style questions</span>
            </li>
            <li className="flex items-center gap-4">
              <TickIconLarge />
              <span>24/7 step-by-step tutoring</span>
            </li>
            <li className="flex items-center gap-4">
              <TickIconLarge />
              <span>Cancel anytime</span>
            </li>
          </ul>
        </div> */}

        <PlanCtas handleContinue={handleContinue} isLoading={isLoading} />

        <div className="flex justify-center w-full">
          <div className="max-w-[640px] mt-8 p-6">
            <ul className="flex flex-col gap-4">
              {[
                "Boost your grades in just 5 minutes with Medly, your personal AI exam tutor.",
                "Practice with 2,500+ exam-style questions per subject with instant AI marking.",
                "Create custom practice sessions focused on your specific weak areas.",
                "Understand tough concepts with 24/7 step-by-step tutoring and exam strategy guidance.",
                "Prepare with 10+ timed mock papers per subject, designed for your specific exam board.",
                "Get exclusive access to Medly's 2026 Predicted Papers (releasing April).",
                "Study efficiently with concise, exam-focused notes for every point in your curriculum.",
                "Access 40+ subjects from GCSEs, IGCSEs, A Levels and IB across multiple examination boards including AQA, Edexcel, CIE and OCR.",
                "Start immediately - change or cancel your plan anytime.",
              ].map((feature, index) => (
                <li key={index} className="flex items-center gap-4">
                  <TickIconLarge fill="#05B0FF" />
                  <span className="text-[15px] flex-1 text-black/60">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <a
          href="mailto:contact@medlyai.com"
          className="pt-4 pb-20 text-base text-center text-[rgba(0,0,0,0.5)] underline block cursor-pointer"
        >
          Interested for a school or classroom? Contact us here.
        </a>

        <div
          ref={parentsSectionRef}
          className="w-full py-20 flex flex-col items-center gap-4"
        >
          <div className="font-heading text-[32px] md:text-[42px] leading-[36px] md:leading-[48px] text-center text-black tracking-[-0.02em] mb-4">
            Want help asking your parents?
          </div>

          {/* <div className="flex flex-row bg-[#f2f2f7] rounded-full p-1">
            <button
              type="button"
              className="px-4 py-2 rounded-full font-medium text-[15px] bg-white flex items-center"
            >
              Send an email
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-full font-medium text-[15px] bg-transparent flex items-center"
            >
              Send payment link
            </button>
          </div> */}

          <div className="mt-4 md:w-2/3 flex flex-flex items-start gap-4 bg-[#F8F8FB] rounded-[16px] p-10">
            <div className="flex flex-col w-1/2 justify-between flex-1">
              <div className="flex flex-col gap-4">
                <div className="font-medium text-[22px] leading-[28px] text-black">
                  Most students have their subscription covered by their
                  parents.
                </div>
                <div className="text-[16px] text-[rgba(0,0,0,0.5)]">
                  We understand that conversations about subscriptions can be
                  awkward.
                </div>
                <div className="text-[16px] text-[rgba(0,0,0,0.5)]">
                  Medly can send an email on your behalf to explain the
                  subscription details.
                </div>

                {/* <div className="flex flex-row gap-2 items-center text-[#007AFF]">
                  <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.0063 15.7019C15.1604 15.7019 18.6258 11.5459 18.6258 10.2589C18.6258 8.97196 15.1479 4.82227 10.0063 4.82227C4.92744 4.82227 1.37415 8.97196 1.37415 10.2589C1.37415 11.5459 4.91488 15.7019 10.0063 15.7019ZM10.0063 14.4714C6.00096 14.4714 2.83062 11.1378 2.83062 10.2589C2.83062 9.52441 6.00096 6.05273 10.0063 6.05273C13.9927 6.05273 17.1693 9.52441 17.1693 10.2589C17.1693 11.1378 13.9927 14.4714 10.0063 14.4714ZM10.0063 13.6302C11.8771 13.6302 13.3775 12.0921 13.3775 10.2589C13.3775 8.38184 11.8771 6.89397 10.0063 6.89397C8.12289 6.89397 6.61619 8.38184 6.62247 10.2589C6.63503 12.0921 8.12289 13.6302 10.0063 13.6302ZM9.99998 11.345C9.3973 11.345 8.90763 10.8553 8.90763 10.2589C8.90763 9.66253 9.3973 9.17285 9.99998 9.17285C10.6027 9.17285 11.0923 9.66253 11.0923 10.2589C11.0923 10.8553 10.6027 11.345 9.99998 11.345Z" fill="#007BFF" />
                  </svg>
                  Preview email
                </div> */}
              </div>

              <form onSubmit={handleEmailSubmit} className="mt-8 w-full">
                <div className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="studentName"
                      className="text-[14px] text-[rgba(0,0,0,0.7)] font-medium"
                    >
                      Your Name*
                    </label>
                    <input
                      type="text"
                      id="studentName"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full mt-2 px-4 py-3 rounded-full border border-[rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                    />
                    {nameError && (
                      <span className="text-red-500 text-sm ml-4">
                        {nameError}
                      </span>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="parentEmail"
                      className="text-[14px] text-[rgba(0,0,0,0.7)] font-medium"
                    >
                      Parent or Guardian Email*
                    </label>
                    <div className="flex flex-row gap-2 mt-2">
                      <input
                        type="email"
                        id="parentEmail"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="Enter their email address"
                        className="flex-1 px-4 py-3 rounded-full border border-[rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                      />
                    </div>
                    <button
                      onClick={() => {
                        track("click_send_email", {
                          location: "plan_page",
                        });
                      }}
                      type="submit"
                      disabled={isSending}
                      className="w-full mt-4 px-6 py-3 rounded-full font-medium text-[15px] bg-gradient-to-r from-[#05B0FF] to-[#007AFF] text-white flex items-center justify-center disabled:opacity-50"
                    >
                      {isSending ? "Sending..." : "Send Email"}
                    </button>
                    {emailError && (
                      <span className="text-red-500 text-sm ml-4">
                        {emailError}
                      </span>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="hidden md:flex flex-col items-center justify-center flex-1">
              <Image
                src="/email_asset.png"
                alt="email"
                width={1200}
                height={1200}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        <div className="w-full pt-20 pb-8">
          <div className="font-heading text-[32px] md:text-[42px] leading-[36px] md:leading-[48px] text-center text-black tracking-[-0.02em] mb-4">
            Loved by 30,000+ GCSE students
            <br className="hidden md:block" /> from the UK&apos;s top schools
          </div>

          <div className="py-10 flex flex-row gap-4 relative overflow-hidden mt-10 w-full">
            <Marquee gradient={false} speed={10} pauseOnHover={false}>
              {SCHOOLS.map((school, index) => (
                <div key={index} className="mx-4 md:mx-16">
                  <Image
                    src={school.src}
                    alt={school.alt}
                    width={240}
                    height={240}
                    className="object-contain h-[50px] md:h-[120px] w-auto"
                  />
                </div>
              ))}
            </Marquee>
            <div className="absolute left-0 w-1/2 h-full bg-gradient-to-r from-white to-transparent z-10"></div>
            <div className="absolute right-0 w-1/2 h-full bg-gradient-to-l from-white to-transparent z-10"></div>
          </div>
        </div>

        {/* Teacher Discount */}
        <div className="w-full py-12 flex flex-col items-center gap-4">
          <div className="mt-4 md:w-2/3 flex flex-flex items-start gap-4 bg-[#F8F8FB] rounded-[16px] p-10">
            <div className="flex flex-col w-full md:w-4/5">
              <div className="flex flex-col gap-4">
                <div className="font-medium text-[22px] leading-[28px] text-black">
                  Ask your teacher for your school&apos;s 20% discount code.
                </div>
                <div className="text-[16px] text-[rgba(0,0,0,0.5)]">
                  School teachers in every country are eligible to receive a
                  free, personalised discount code offering students 20% off any
                  Medly subscription.
                </div>
                <div className="text-[16px] text-[rgba(0,0,0,0.5)]">
                  No school code yet? Ask them to email{" "}
                  <a
                    href="mailto:contact@medlyai.com"
                    className="text-[#007AFF] hover:underline"
                  >
                    contact@medlyai.com
                  </a>{" "}
                  for one.
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center md:w-1/5">
              <span
                className="text-[140px] leading-none"
                role="img"
                aria-label="Teacher"
              >
                🧑‍🏫
              </span>
            </div>
          </div>
        </div>

        <div className="w-full py-20 flex flex-col items-center">
          <div className="font-heading text-[32px] md:text-[42px] leading-[36px] md:leading-[48px] text-center text-black tracking-[-0.02em] mb-20">
            Award-winning and supported <br className="hidden md:block" />
            by leading institutions
          </div>

          <Image
            src="/assets/supporters.png"
            alt="logo"
            height={800}
            width={800}
            priority
            className="mt-2 mb-20"
          />
        </div>

        {/* FAQ Section */}
        <FAQSection />
      </div>
    </div>
  );
}

function PlanPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen"></div>
      }
    >
      <PlanPage />
    </Suspense>
  );
}

export default PlanPageWrapper;
