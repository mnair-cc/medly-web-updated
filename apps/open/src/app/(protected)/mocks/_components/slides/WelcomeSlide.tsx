import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import ConfirmationModal from "@/app/_components/ConfirmationModal";
import { useState, useEffect, useCallback } from "react";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import SnowfallEffect from "@/app/(protected)/mocks/register/_components/christmas/SnowfallEffect";

interface Snowball {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  blur: number;
}

const SnowballTransition = ({ onComplete }: { onComplete: () => void }) => {
  const [snowballs, setSnowballs] = useState<Snowball[]>([]);
  const [showWhiteOverlay, setShowWhiteOverlay] = useState(false);

  useEffect(() => {
    // Generate snowballs
    const balls: Snowball[] = [];
    const count = 180; // Reduced count for less density

    for (let i = 0; i < count; i++) {
      const size = Math.random() * 30 + 20;
      balls.push({
        id: i,
        x: Math.random() * 100, // Random x position (percentage)
        size, // Size between 20-50px
        delay: Math.random() * 1.8, // More staggered start (0-1.8s)
        duration: Math.random() * 1.2 + 1.0, // Fall duration 1.0-2.2s
        blur: Math.random() * (size / 20) + 1, // All have some blur (1px minimum), varying amounts
      });
    }

    setSnowballs(balls);

    // Start fading to white after snowballs have been falling for a while
    const whiteTimeout = setTimeout(() => {
      setShowWhiteOverlay(true);
    }, 1400);

    // Transition to next slide after the white overlay is fully visible
    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(whiteTimeout);
      clearTimeout(completeTimeout);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* Falling snowballs */}
      {snowballs.map((ball) => (
        <motion.div
          key={ball.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${ball.x}%`,
            width: ball.size,
            height: ball.size,
            filter: `blur(${ball.blur * 0.7}px)`,
            boxShadow: `0 0 ${ball.size / 2}px rgba(255, 255, 255, 0.9)`,
          }}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: "120vh", opacity: 1 }}
          transition={{
            duration: ball.duration,
            delay: ball.delay,
            ease: "easeIn",
          }}
        />
      ))}

      {/* White overlay that fades in */}
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: showWhiteOverlay ? 1 : 0 }}
        transition={{ duration: 0.5, ease: "easeIn" }}
      />
    </div>
  );
};

const WelcomeSlide = ({ onNext }: { onNext: () => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { track } = useTracking();

  const handleTransitionComplete = useCallback(() => {
    onNext();
    track("mock_results_opened");
  }, [onNext, track]);

  const startTransition = () => {
    setIsModalOpen(false);
    setIsTransitioning(true);
  };

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      {/* Full-screen gradient background (subtle) */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#1D9AEE] via-[#1D9AEE] via-70% to-[#4BB8F0] z-0" />

      {/* Snowfall Effect */}
      <div className="fixed inset-0 z-[1] overflow-hidden pointer-events-none">
        <SnowfallEffect />
      </div>

      {/* Decorative snowflakes */}
      <div className="pointer-events-none fixed right-[60px] top-[100px] z-[1] -rotate-[20deg]">
        <p className="text-[112px] leading-[60px] text-white/50 blur-[2px]">
          ❄️
        </p>
      </div>
      <div className="pointer-events-none fixed left-[60px] top-[40px] z-[1] -rotate-[36deg]">
        <p className="text-[180px] leading-[60px] text-white/50 blur-sm">
          ❄️
        </p>
      </div>

      {/* Spinning emoji background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 1.5 }}
        className="fixed w-[180%] h-[800px] z-[1] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <motion.div
          className="relative w-full h-full origin-center"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 300, repeat: Infinity, ease: "linear" }}
        >
          <Image
            src="/medly_friends_large.png"
            alt="Circle of different animal emojis"
            fill
            sizes="(max-width: 1040px) 120vw, 100vw"
            className="object-contain object-center"
            priority
          />
        </motion.div>
      </motion.div>

      <div className="flex flex-col gap-4 text-center justify-center items-center flex-1 z-10 px-8">
        <motion.div
          className="flex flex-col"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div>
            <motion.p
              className="text-2xl font-heavy tracking-[0.02em] uppercase leading-none [text-shadow:rgba(0,0,0,0.15)_0px_0px_15px] mb-3"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              2025-26
            </motion.p>
            <motion.h1
              className="text-7xl font-heavy tracking-[-0.05em] leading-none [text-shadow:rgba(0,0,0,0.15)_0px_0px_15px]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.3 }}
            >
              Christmas Mocks
            </motion.h1>
            <motion.h1
              className="text-7xl font-heavy tracking-[-0.05em] leading-none [text-shadow:rgba(0,0,0,0.15)_0px_0px_15px] -mt-1"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.5 }}
            >
              Results Day
            </motion.h1>
            <div className="my-12 mb-16" />
            <motion.div
              className="flex w-full justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.9 }}
            >
              <button
                onClick={() => setIsModalOpen(true)}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "translateY(2px)";
                  e.currentTarget.style.borderBottomWidth = "1px";
                  e.currentTarget.style.marginBottom = "3px";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderBottomWidth = "4px";
                  e.currentTarget.style.marginBottom = "0px";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderBottomWidth = "4px";
                  e.currentTarget.style.marginBottom = "0px";
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = "translateY(2px)";
                  e.currentTarget.style.borderBottomWidth = "1px";
                  e.currentTarget.style.marginBottom = "3px";
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderBottomWidth = "4px";
                  e.currentTarget.style.marginBottom = "0px";
                }}
                disabled={isTransitioning}
                className="relative flex h-[72px] w-[280px] items-center justify-center gap-[8px] overflow-visible rounded-[16px] border border-[#1CA4FF] bg-[#05B0FF] px-4 py-4 text-center text-[20px] font-rounded-bold leading-[24px] text-white transition-all duration-100 hover:border-[#32ADFF] hover:bg-[#1EB8FF]"
                style={{
                  borderBottomWidth: "4px",
                  marginBottom: "0px",
                }}
              >
                {/* Snow decoration image */}
                <img
                  src="/Button-snow.png"
                  alt=""
                  className="pointer-events-none absolute left-0 top-0 h-auto w-[125px]"
                  style={{
                    transform: "translate(-6px, -18px)",
                  }}
                />
                <span className="relative z-10">View my results</span>
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <ConfirmationModal
        status="custom-message"
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onClickConfirm={startTransition}
        customHeading="Before you jump in..."
        customDescription="Just remember - these mock results are for practice and learning only. While they're super helpful for revision, they may not match exactly what you'd get in the real exam."
        customButtonText="I understand"
        hideCancelButton={true}
        showFeedbackButton={false}
      />

      {/* Snowball transition effect */}
      <AnimatePresence>
        {isTransitioning && (
          <SnowballTransition onComplete={handleTransitionComplete} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default WelcomeSlide;
