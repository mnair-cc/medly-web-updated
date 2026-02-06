import ExamEntryCardForSlides from "./ExamEntryCardForSlides";
import { PaperInsight } from "../../_types/types";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";

interface Snowball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  blur: number;
  opacity: number;
}

const GradesSlide = ({
  userName,
  candidateId,
  paperResults,
  onAnimationStart,
  onEnvelopeOpened,
}: {
  userName: string;
  candidateId: string;
  paperResults: PaperInsight[];
  onAnimationStart?: (duration?: number) => void;
  onEnvelopeOpened?: () => void;
}) => {
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [showSnowballs, setShowSnowballs] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [snowballs, setSnowballs] = useState<Snowball[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEnvelope(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Physics simulation for snowballs
  useEffect(() => {
    if (!showSnowballs) {
      setSnowballs([]);
      return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2 - 50;
    const gravity = 0.5;
    const friction = 0.99;

    // Initialize snowballs with gentle velocities
    const initialSnowballs: Snowball[] = [];
    const count = 45;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 6;
      const size = Math.random() * 20 + 8; // Bigger snowflakes (8-28)

      initialSnowballs.push({
        id: i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6, // Gentle upward bias
        size,
        blur: Math.random() * 0.6 + 0.2, // Subtle blur (0.2-0.8px)
        opacity: Math.random() * 0.3 + 0.6, // Higher opacity (0.6-0.9)
      });
    }

    setSnowballs(initialSnowballs);

    // Animation loop
    let animationId: number;
    const animate = () => {
      setSnowballs(prev => {
        // Filter out snowballs that are off screen
        return prev
          .filter(ball => ball.y < window.innerHeight + 100 && ball.x > -100 && ball.x < window.innerWidth + 100)
          .map(ball => {
            let newVy = ball.vy + gravity;
            let newY = ball.y + newVy;
            let newX = ball.x + ball.vx;
            let newVx = ball.vx * friction;

            return {
              ...ball,
              x: newX,
              y: newY,
              vx: newVx,
              vy: newVy,
            };
          });
      });
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [showSnowballs]);

  const startAnimation = async () => {
    if (isAnimating) return;
    setIsAnimating(true);

    // Start progress animation (3.2 seconds total: 2.2s shake + 1s reveal)
    onAnimationStart?.(3200);

    // Shake envelope for 2.2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2200));
    setShowEnvelope(false);
    setShowSnowballs(true);

    // Show the card
    setShowCard(true);
    onEnvelopeOpened?.();

    // Keep snowballs visible for physics to play out
    await new Promise((resolve) => setTimeout(resolve, 6000));
    setShowSnowballs(false);
  };

  return (
    <div className="">

      {!isAnimating ?
        <div className="text-lg text-white/80 text-center -mt-5">
          Tap on the envelope to open your results
        </div>
        :
        <div className="h-1" />
      }
      <div className="h-[520px] flex flex-col items-center justify-center transform scale-[0.9]">


        <AnimatePresence mode="wait">
          {showEnvelope && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate: isAnimating
                  ? [
                    0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7, -8, 8,
                    -9, 9, -10, 10, -11, 11, -12, 12, -13, 13, -14, 14, -15,
                    15, -16, 16, 0,
                  ]
                  : 0,
              }}
              whileHover={{ scale: 1.05 }}
              transition={{
                default: {
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  duration: 0.5,
                },
                rotate: isAnimating
                  ? {
                    duration: 2.2,
                    ease: [0.4, 0, 0.2, 1],
                  }
                  : undefined,
              }}
              className="flex justify-center cursor-pointer relative "
              onClick={startAnimation}
            >

              {/* <span className="text-[160px] transform rotate-[-4deg]">✉️</span> */}
              <img src="/assets/envelope.png" alt="Envelope" className="w-[420px] transform rotate-[-4deg]" />
            </motion.div>
          )}

          {!showEnvelope && (
            <div className="relative flex items-center justify-center">
              {showCard && (
                <motion.div
                  initial={{ scale: 0.2, opacity: 0, y: 20 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.3,
                    duration: 1.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute z-10"
                >
                  <ExamEntryCardForSlides
                    userName={userName}
                    candidateId={candidateId}
                    paperResults={paperResults}
                  />
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Snowflake explosion - rendered outside AnimatePresence */}
      {showSnowballs && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {snowballs.map((ball) => (
            <div
              key={ball.id}
              className="absolute"
              style={{
                left: ball.x - ball.size,
                top: ball.y - ball.size,
                fontSize: ball.size * 2.5,
                filter: `blur(${ball.blur}px)`,
                opacity: ball.opacity,
              }}
            >
              ❄️
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GradesSlide;
