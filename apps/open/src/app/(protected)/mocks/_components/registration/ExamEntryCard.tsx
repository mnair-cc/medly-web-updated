import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import ReferralStats from "./ReferralStats";
import { MockRegistrationData } from "@/app/types/types";
import { useUser } from "@/app/_context/UserProvider";

// Scrollbar styles for the subjects list
const scrollbarStyles = `
  .subjects-scrollable::-webkit-scrollbar {
    width: 8px;
  }
  .subjects-scrollable::-webkit-scrollbar-track {
    background: transparent;
  }
  .subjects-scrollable::-webkit-scrollbar-thumb {
    background-color: #9CA3AF;
    border-radius: 4px;
  }
  .subjects-scrollable::-webkit-scrollbar-thumb:hover {
    background-color: #6B7280;
  }
`;

const ExamEntryCard = ({
  data,
  hasActivePlan = false,
}: {
  data: MockRegistrationData;
  hasActivePlan?: boolean;
}) => {
  const { user } = useUser();
  const isUserWaitingList =
    (data.referrals?.length || 0) < 3 &&
    (data.waitListPosition || 0) > 0 &&
    !hasActivePlan;
  const waitingListPosition = data.waitListPosition || 0;

  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const spinningRef = useRef<{
    velocity: number;
    lastTimestamp: number;
    animationFrameId: number | null;
    totalRotation: number;
    settling: boolean;
    targetRotation?: number;
  }>({
    velocity: 0,
    lastTimestamp: 0,
    animationFrameId: null,
    totalRotation: 0,
    settling: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isSpinning) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();

    // Calculate mouse position relative to the center of the card
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate the tilt based on mouse distance from center
    // Normalize to a value between -10 and 10 degrees
    const maxTilt = 10;
    const tiltX = -((e.clientY - centerY) / (rect.height / 2)) * maxTilt;
    const tiltY = ((e.clientX - centerX) / (rect.width / 2)) * maxTilt;

    setTilt({ x: tiltX, y: tiltY });
  };

  // Add tap/swipe handler for spinning
  const handleCardTap = () => {
    if (isSpinning) {
      // If already spinning, add more velocity from the tap
      if (!spinningRef.current.settling) {
        spinningRef.current.velocity += 5 + Math.random() * 3; // Random boost for natural feel
      }
      return;
    }

    // Start a new spin with initial velocity
    const initialVelocity = 10 + Math.random() * 5; // Random initial velocity
    spinningRef.current.velocity = initialVelocity;
    spinningRef.current.lastTimestamp = performance.now();
    spinningRef.current.totalRotation = rotation; // Start from current rotation
    spinningRef.current.settling = false;
    setIsSpinning(true);

    // Start animation
    startSpinAnimation();
  };

  // Spin animation with physics
  const startSpinAnimation = () => {
    const spinStep = (timestamp: number) => {
      if (!spinningRef.current.lastTimestamp) {
        spinningRef.current.lastTimestamp = timestamp;
        spinningRef.current.animationFrameId = requestAnimationFrame(spinStep);
        return;
      }

      spinningRef.current.lastTimestamp = timestamp;

      // Determine if we're in the main spinning phase or settling phase
      if (!spinningRef.current.settling) {
        // Main spinning phase - Apply friction (deceleration)
        const friction = 0.98; // Smoother deceleration
        spinningRef.current.velocity *= friction;

        // Update total rotation
        spinningRef.current.totalRotation += spinningRef.current.velocity;

        // Update the displayed rotation
        setRotation(spinningRef.current.totalRotation);

        // Enter settling phase when velocity gets low enough
        if (Math.abs(spinningRef.current.velocity) < 1) {
          // Check absolute velocity
          spinningRef.current.settling = true;

          // Calculate the closest multiple of 360 degrees
          const currentTotal = spinningRef.current.totalRotation;
          const remainder = currentTotal % 360;
          let targetAngle;

          // If the remainder is more than 180 degrees away from 0,
          // move to the next multiple in the current direction.
          // Otherwise, move back to the previous multiple.
          if (Math.abs(remainder) <= 180) {
            targetAngle = currentTotal - remainder; // Snap to the closer multiple (could be backward)
          } else {
            targetAngle = currentTotal - remainder + 360 * Math.sign(remainder);
          }

          spinningRef.current.targetRotation = targetAngle;
        }
      } else {
        // Settling phase - smoothly move to nearest 360 multiple
        const difference =
          (spinningRef.current.targetRotation ?? 0) -
          spinningRef.current.totalRotation;
        const step = difference * 0.08; // Take a percentage of the remaining distance

        if (Math.abs(difference) < 0.5) {
          // Close enough to target, finish the animation
          spinningRef.current.totalRotation =
            spinningRef.current.targetRotation ??
            spinningRef.current.totalRotation;
          setRotation(spinningRef.current.totalRotation);
          setIsSpinning(false);
          spinningRef.current.animationFrameId = null;
          return;
        }

        // Move toward target
        spinningRef.current.totalRotation += step;
        setRotation(spinningRef.current.totalRotation);
      }

      // Continue animation logic
      if (spinningRef.current.animationFrameId !== null) {
        spinningRef.current.animationFrameId = requestAnimationFrame(spinStep);
      }
    };

    // Cancel any existing frame before starting a new one
    if (spinningRef.current.animationFrameId) {
      cancelAnimationFrame(spinningRef.current.animationFrameId);
    }
    spinningRef.current.animationFrameId = requestAnimationFrame(spinStep);
  };

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (spinningRef.current.animationFrameId) {
        cancelAnimationFrame(spinningRef.current.animationFrameId);
      }
    };
  }, []);

  // Check initial scroll state and update when data changes
  useEffect(() => {
    if (scrollableRef.current && !isUserWaitingList) {
      handleScroll();
    }
  }, [data.selectedExams, isUserWaitingList]);

  const handleMouseEnter = () => {
    if (!isSpinning) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    // Reset tilt with a smooth transition
    setTilt({ x: 0, y: 0 });
  };

  const handleScroll = () => {
    if (!scrollableRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollableRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5; // 5px threshold for rounding
    setIsScrolledToBottom(isAtBottom);
  };

  // Helper function to format the exam title
  const formatExamTitle = (subject: string, series: string | null) => {
    if (
      subject === "English Literature & Language" ||
      subject === "Mathematics"
    ) {
      return subject;
    }

    // For science subjects
    if (series === "Combined") {
      return `${subject} Combined Tier H`;
    } else {
      return `${subject} Tier H`;
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <div className="relative mt-0 hover:cursor-grab text-black">
        <div
          ref={cardRef}
          style={{
            transform: `perspective(1000px) rotate(${rotation}deg) ${
              isSpinning
                ? "scale3d(1, 1, 1)"
                : isHovering
                  ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`
                  : "rotateX(0) rotateY(0) scale3d(1, 1, 1)"
            }`,
            transformStyle: "preserve-3d",
            touchAction: "manipulation",
            transition: isSpinning ? "none" : "transform 0.3s ease-out",
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleCardTap}
          onTouchStart={handleCardTap}
        >
          <svg
            width="422"
            height="588"
            viewBox="0 0 422 588"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g filter="url(#filter0_d_454_2453)">
              <mask id="path-1-inside-1_454_2453" fill="white">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M11 27C11 18.1635 18.1634 11 27 11H395C403.837 11 411 18.1634 411 27L411 140.402C391.111 140.402 374.987 157.477 374.987 178.541C374.987 199.605 391.111 216.681 411 216.681L411 560.281C411 569.118 403.837 576.281 395 576.281H27C18.1635 576.281 11 569.118 11 560.281V216.681C30.8893 216.68 47.0127 199.605 47.0127 178.541C47.0127 157.477 30.8893 140.402 11 140.402V27Z"
                />
              </mask>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11 27C11 18.1635 18.1634 11 27 11H395C403.837 11 411 18.1634 411 27L411 140.402C391.111 140.402 374.987 157.477 374.987 178.541C374.987 199.605 391.111 216.681 411 216.681L411 560.281C411 569.118 403.837 576.281 395 576.281H27C18.1635 576.281 11 569.118 11 560.281V216.681C30.8893 216.68 47.0127 199.605 47.0127 178.541C47.0127 157.477 30.8893 140.402 11 140.402V27Z"
                fill="#FFFDEA"
              />
              <path
                d="M411 27L410 27L410 27L411 27ZM411 140.402V141.402H412L412 140.402L411 140.402ZM411 216.681L412 216.681L412 215.681H411V216.681ZM411 560.281L410 560.281V560.281H411ZM11 216.681L11 215.681L10 215.681V216.681H11ZM11 140.402H10V141.402L11 141.402L11 140.402ZM27 10C17.6112 10 10 17.6112 10 27H12C12 18.7157 18.7157 12 27 12V10ZM395 10H27V12H395V10ZM412 27C412 17.6112 404.389 10 395 10V12C403.284 12 410 18.7157 410 27H412ZM412 140.402L412 27L410 27L410 140.402L412 140.402ZM375.987 178.541C375.987 157.975 391.716 141.402 411 141.402V139.402C390.505 139.402 373.987 156.98 373.987 178.541H375.987ZM411 215.681C391.716 215.681 375.987 199.107 375.987 178.541H373.987C373.987 200.102 390.505 217.681 411 217.681V215.681ZM412 560.281L412 216.681L410 216.681L410 560.281L412 560.281ZM395 577.281C404.389 577.281 412 569.67 412 560.281H410C410 568.565 403.284 575.281 395 575.281V577.281ZM27 577.281H395V575.281H27V577.281ZM10 560.281C10 569.67 17.6112 577.281 27 577.281V575.281C18.7157 575.281 12 568.565 12 560.281H10ZM10 216.681V560.281H12V216.681H10Z"
                fill="#D7D7DF"
                mask="url(#path-1-inside-1_454_2453)"
              />
            </g>
            <line
              x1="49.1418"
              y1="173.825"
              x2="373.836"
              y2="173.825"
              stroke="#D7D7DF"
              strokeDasharray="8 8"
            />
            <defs>
              <filter
                id="filter0_d_454_2453"
                x="0"
                y="0"
                width="422"
                height="587.281"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feColorMatrix
                  in="SourceAlpha"
                  type="matrix"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                  result="hardAlpha"
                />
                <feMorphology
                  radius="1"
                  operator="dilate"
                  in="SourceAlpha"
                  result="effect1_dropShadow_454_2453"
                />
                <feOffset />
                <feGaussianBlur stdDeviation="5" />
                <feComposite in2="hardAlpha" operator="out" />
                <feColorMatrix
                  type="matrix"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"
                />
                <feBlend
                  mode="normal"
                  in2="BackgroundImageFix"
                  result="effect1_dropShadow_454_2453"
                />
                <feBlend
                  mode="normal"
                  in="SourceGraphic"
                  in2="effect1_dropShadow_454_2453"
                  result="shape"
                />
              </filter>
            </defs>
          </svg>

          <div className="absolute top-0 p-10 h-full w-full flex flex-col justify-between overflow-hidden">
            <div className="flex-shrink-0">
              <div className="flex flex-row items-center justify-between gap-2">
                <div>
                  <div className="text-5xl font-heavy">
                    {user?.userName || "Loading..."}
                  </div>
                  <div className="mt-2 text-base font-heavy leading-none">
                    Candidate ID:
                    <br />
                    <span className="font-heavy text-black">
                      {data.candidateId || "Loading..."}
                    </span>
                  </div>
                </div>
                <div>
                  <Image
                    src="/microqr.gif"
                    width={80}
                    height={80}
                    alt="QR Code"
                    className="p-2 bg-white"
                  />
                </div>
              </div>

              {isUserWaitingList ? (
                <div className="mt-[72px]">
                  <div className="text-center text-[100px] leading-none font-mono font-bold mt-2">
                    {waitingListPosition > 0 ? waitingListPosition : "-"}
                  </div>
                  <div className="text-center text-sm font-mono">
                    Waitlist Position
                  </div>
                  <ReferralStats
                    referrals={data.referrals || []}
                    setOffWaitlist={(shouldRemove) => {
                      if (shouldRemove) {
                        // setIsUserWaitingList(false);
                        // The state is managed in the parent component
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="mt-[108px] relative">
                  {/* Bottom fade gradient - only show when not scrolled to bottom */}
                  {!isScrolledToBottom && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#FFFDEA] to-transparent pointer-events-none z-20" />
                  )}
                  <div
                    ref={scrollableRef}
                    className="subjects-scrollable h-[200px] overflow-y-auto overflow-x-hidden pr-2"
                    style={{
                      scrollbarWidth: "thin",
                      scrollbarColor: "#9CA3AF transparent",
                    }}
                    onScroll={handleScroll}
                  >
                    <table className="w-full text-left text-sm font-mono">
                      <thead className="sticky top-0 bg-[#FFFDEA] z-10">
                        <tr className="font-header">
                          <th className="py-1 pr-4">Entries</th>
                          <th className="py-1 pr-4">Title</th>
                        </tr>
                      </thead>
                      <tbody className="text-black">
                        {data.selectedExams.length > 0 ? (
                          data.selectedExams.map((exam) => (
                            <tr key={exam.examId}>
                              <td className="py-1 pr-4">{exam.board}</td>
                              <td className="py-1 pr-4">
                                {formatExamTitle(exam.subject, exam.series)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="py-1 text-center">
                              Loading selections...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0">
              {!isUserWaitingList && (
                <p className="text-[10px] leading-none mt-6">
                  Please check that all details, including your nickname,
                  candidate number, entries etc are correct. Medly mock exams
                  are provided for practice purposes only and do not predict or
                  guarantee your performance in official examinations.
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm font-heavy px-2 py-1 border-2 border-black rounded-md">
                  2025 MOCKS
                </div>
                <div className="text-black font-heavy text-sm flex items-center gap-1">
                  <svg
                    width="24"
                    height="20"
                    viewBox="0 0 35 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M30.1038 2.05113C28.8099 1.26658 22.6391 -2.84884 13.246 8.34164L11.5665 10.1294C11.5665 10.1294 3.5874 6.65043 0.885153 10.4343C-1.39144 13.622 1.13812 16.9426 3.79415 16.9426C6.7307 16.9426 9.42301 14.5391 11.3799 12.447L17.9862 17.135C19.9767 18.5389 22.3032 19.3334 24.6794 19.3334C27.1179 19.3202 30.253 18.5786 32.3307 15.5591C36.4255 9.37165 32.7577 3.66019 30.1038 2.05113ZM4.3069 12.9559C4.17661 12.2654 4.49444 11.7324 4.95493 11.496C6.37222 10.7684 9.70037 11.8511 9.70037 11.8511C9.70037 11.8511 7.2985 13.9 5.69703 14.0261C5.04749 14.0772 4.46021 13.7684 4.3069 12.9559ZM27.4285 9.3218C27.0553 11.4407 25.3256 14.0323 18.4091 12.2483C14.1791 11.0565 13.0916 10.534 13.0916 10.534C13.0916 10.534 17.7907 5.31039 21.6438 4.69976C26.3102 3.96022 27.8018 7.2029 27.4285 9.3218Z"
                      fill="url(#paint0_linear_224_7832)"
                    />
                    <defs>
                      <linearGradient
                        id="paint0_linear_224_7832"
                        x1="17.0823"
                        y1="0.666748"
                        x2="17.0823"
                        y2="19.3334"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#A1A1A1" />
                        <stop offset="1" />
                      </linearGradient>
                    </defs>
                  </svg>
                  Medly AI
                </div>
              </div>
            </div>

            {/* Light reflection effect */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ zIndex: 5 }}
            >
              <div
                className="absolute bg-gradient-to-br from-white via-white to-transparent opacity-0 transition-opacity duration-300 pointer-events-none"
                style={{
                  opacity: isHovering ? 0.1 : 0,
                  transform: `translateX(${tilt.y * 1.5}px) translateY(${
                    -tilt.x * 1.5
                  }px)`,
                  top: "-10%",
                  left: "-10%",
                  right: "-10%",
                  bottom: "-10%",
                  width: "120%",
                  height: "120%",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExamEntryCard;
