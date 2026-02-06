import { useRef, useState, useEffect } from "react";
import { PaperInsight } from "../../_types/types";
import { deconstructSubjectLegacyId } from "@/app/_lib/utils/utils";

const ExamEntryCardForSlides = ({
  userName,
  candidateId,
  paperResults,
}: {
  userName: string;
  candidateId: string;
  paperResults: PaperInsight[];
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const [needsScroll, setNeedsScroll] = useState(false);
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
            // Snap forward to the next multiple in the current direction
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

  // Check if content needs scrolling
  useEffect(() => {
    const el = scrollableRef.current;
    if (el) {
      setNeedsScroll(el.scrollHeight > el.clientHeight);
    }
  }, [paperResults]);

  // Handle scroll to track if at bottom
  const handleScroll = () => {
    const el = scrollableRef.current;
    if (el) {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 5;
      setIsScrolledToBottom(isAtBottom);
    }
  };

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

  if (!paperResults) return null;

  return (
    <div className="relative mt-0 hover:cursor-grab text-black w-[422px] text-left">
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
          viewBox="0 0 333 463"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="url(#filter0_d_1089_1710)">
            <mask id="path-1-inside-1_1089_1710" fill="white">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11 27C11 18.1634 18.1634 11 27 11H306C314.837 11 322 18.1634 322 27V321C306.536 321 294 334.321 294 350.754C294 367.187 306.536 380.508 322 380.508V436C322 444.837 314.837 452 306 452H27C18.1635 452 11 444.837 11 436V380.508C26.464 380.508 39 367.187 39 350.754C39 334.321 26.464 321 11 321V27Z"
              />
            </mask>
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11 27C11 18.1634 18.1634 11 27 11H306C314.837 11 322 18.1634 322 27V321C306.536 321 294 334.321 294 350.754C294 367.187 306.536 380.508 322 380.508V436C322 444.837 314.837 452 306 452H27C18.1635 452 11 444.837 11 436V380.508C26.464 380.508 39 367.187 39 350.754C39 334.321 26.464 321 11 321V27Z"
              fill="#FAF6F0"
            />
            <path
              d="M322 321V322H323V321H322ZM322 380.508H323V379.508H322V380.508ZM11 380.508V379.508H10V380.508H11ZM11 321H10V322H11V321ZM27 10C17.6112 10 10 17.6112 10 27H12C12 18.7157 18.7157 12 27 12V10ZM306 10H27V12H306V10ZM323 27C323 17.6112 315.389 10 306 10V12C314.284 12 321 18.7157 321 27H323ZM323 321V27H321V321H323ZM295 350.754C295 334.816 307.145 322 322 322V320C305.927 320 293 333.827 293 350.754H295ZM322 379.508C307.145 379.508 295 366.693 295 350.754H293C293 367.681 305.927 381.508 322 381.508V379.508ZM323 436V380.508H321V436H323ZM306 453C315.389 453 323 445.389 323 436H321C321 444.284 314.284 451 306 451V453ZM27 453H306V451H27V453ZM10 436C10 445.389 17.6112 453 27 453V451C18.7157 451 12 444.284 12 436H10ZM10 380.508V436H12V380.508H10ZM38 350.754C38 366.693 25.8553 379.508 11 379.508V381.508C27.0726 381.508 40 367.681 40 350.754H38ZM11 322C25.8553 322 38 334.816 38 350.754H40C40 333.827 27.0726 320 11 320V322ZM10 27V321H12V27H10Z"
              fill="#D7D7DF"
              mask="url(#path-1-inside-1_1089_1710)"
            />
          </g>
          <defs>
            <filter
              id="filter0_d_1089_1710"
              x="0"
              y="0"
              width="333"
              height="463"
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
                result="effect1_dropShadow_1089_1710"
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
                result="effect1_dropShadow_1089_1710"
              />
              <feBlend
                mode="normal"
                in="SourceGraphic"
                in2="effect1_dropShadow_1089_1710"
                result="shape"
              />
            </filter>
          </defs>
        </svg>

        <div className="absolute top-0 p-8 pt-10 h-full w-full flex flex-col">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex flex-row items-center justify-between gap-2">
              <div>
                <div className="text-5xl font-heavy">{userName}</div>
                <div className="mt-2 text-base font-heavy leading-none">
                  Candidate ID:
                  <br />
                  <span className="font-heavy text-black">{candidateId}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex-1 min-h-0 relative">
              {/* Bottom fade gradient - only show when content overflows and not scrolled to bottom */}
              {needsScroll && !isScrolledToBottom && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#FAF6F0] to-transparent pointer-events-none z-20" />
              )}
              <div
                ref={scrollableRef}
                className="h-full overflow-y-auto"
                onScroll={handleScroll}
              >
                <table className="w-full text-left text-[13px] font-mono">
                  <thead className="sticky top-0 bg-[#FAF6F0] z-10">
                    <tr className="font-header">
                      <th className="py-1 pr-4">Papers</th>
                      <th className="py-1 pr-4">Score</th>
                      <th className="py-1 pr-4">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="text-black">
                    {paperResults
                      .sort((a, b) => {
                        const { subjectTitle: subjectA } =
                          deconstructSubjectLegacyId(a.subjectId);
                        const { subjectTitle: subjectB } =
                          deconstructSubjectLegacyId(b.subjectId);
                        const paperNumberA = a.paperId.split("_").pop() || "";
                        const paperNumberB = b.paperId.split("_").pop() || "";

                        // First sort by subject title alphabetically
                        const subjectComparison =
                          subjectA.localeCompare(subjectB);

                        // If same subject, sort by paper number (lower first)
                        if (subjectComparison === 0) {
                          return (
                            parseInt(paperNumberA) - parseInt(paperNumberB)
                          );
                        }

                        return subjectComparison;
                      })
                      .map((paperResult) => {
                        const { examBoard, subjectTitle } =
                          deconstructSubjectLegacyId(paperResult.subjectId);
                        const paperNumber =
                          paperResult.paperId.split("_").pop() || "";
                        return (
                          <tr key={paperResult.paperId}>
                            <td className="py-1 pr-4">
                              {examBoard} {subjectTitle} P{paperNumber}
                            </td>
                            <td className="py-1 pr-4">
                              {Math.round(paperResult.percentage) + "%"}
                            </td>
                            <td className="py-1 pr-4">{paperResult.grade}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            {/* <p className="text-[10px] leading-none mt-6">
              Medly mock exams are provided for
              practice purposes only and do not predict or guarantee your
              performance in official examinations.
            </p> */}

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm font-heavy px-2 py-1 border-2 border-black rounded-md">
                2025 XMAS MOCKS
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
        </div>
      </div>
    </div>
  );
};

export default ExamEntryCardForSlides;
