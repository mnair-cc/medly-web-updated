"use client";

import { useState, memo, useEffect } from "react";
import { motion } from "framer-motion";

interface SnowflakeProps {
  size: number;
  startX: number;
  delay: number;
  duration: number;
}

function Snowflake({ size, startX, delay, duration }: SnowflakeProps) {
  // Create a curvy motion with sinusoidal wave
  const amplitude = Math.random() * 80 + 40; // Wave amplitude (40-120px)
  const frequency = Math.random() * 2 + 1; // Wave frequency (2-5 cycles)
  const baseDirection = (Math.random() - 0.5) * 2; // -1 to 1 for left/right bias

  // Create keyframes for curvy motion
  const curveKeyframes = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const wave = Math.sin(progress * Math.PI * frequency) * amplitude;
    curveKeyframes.push(wave * baseDirection);
  }

  // Reduced blur - subtle effect
  const blurAmount = (size / 10) * 1.2;
  const glowSize = (size / 2) * 4;

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: `${startX}%`,
        top: 0,
      }}
      initial={{
        y: -200,
        x: 0,
        opacity: 0,
      }}
      animate={{
        y: 1000,
        x: curveKeyframes,
        opacity: [0, 1, 1, 1, 0],
      }}
      transition={{
        y: {
          duration,
          repeat: Infinity,
          ease: "linear",
          delay: -delay, // Negative delay makes it start mid-animation
          repeatDelay: 0,
          repeatType: "loop",
        },
        x: {
          duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: -delay,
          repeatDelay: 0,
          repeatType: "loop",
        },
        opacity: {
          duration,
          repeat: Infinity,
          ease: "linear",
          delay: -delay,
          repeatDelay: 0,
          repeatType: "loop",
          times: [0, 0.1, 0.85, 0.95, 1],
        },
      }}
    >
      <div
        className="rounded-full bg-white"
        style={{
          width: size,
          height: size,
          filter: `blur(${blurAmount}px) drop-shadow(0 0 ${glowSize}px rgba(255, 255, 255, 0.6))`,
        }}
      />
    </motion.div>
  );
}

const SnowfallEffect = memo(function SnowfallEffect() {
  const [mounted, setMounted] = useState(false);
  const [snowflakes, setSnowflakes] = useState<
    Array<{
      id: number;
      size: number;
      startX: number;
      delay: number;
      duration: number;
    }>
  >([]);

  useEffect(() => {
    // Only generate snowflakes on the client side to avoid hydration mismatch
    setMounted(true);
    const flakes = [];
    const count = 35;

    for (let i = 0; i < count; i++) {
      const duration = Math.random() * 40 + 20; // 20-40 seconds (more variance)
      // Mix of sizes
      const rand = Math.random();
      let size;
      if (rand < 0.25) {
        size = Math.random() * 2 + 6; // Small
      } else if (rand < 0.6) {
        size = Math.random() * 2 + 10; // Medium
      } else if (rand < 0.9) {
        size = Math.random() * 3 + 16; // Large
      } else {
        size = Math.random() * 4 + 24; // Extra large
      }

      // Avoid the middle 30% of the screen to prevent text overlap
      let startX = Math.random() * 100;
      if (startX > 35 && startX < 65) {
        startX = startX < 50 ? Math.random() * 35 : Math.random() * 35 + 65;
      }

      flakes.push({
        id: i,
        size,
        startX,
        delay: (i / count) * duration,
        duration,
      });
    }

    setSnowflakes(flakes);
  }, []);

  // Don't render anything during SSR or before mount
  if (!mounted) {
    return null;
  }

  return (
    <>
      {snowflakes.map((flake) => (
        <Snowflake
          key={flake.id}
          size={flake.size}
          startX={flake.startX}
          delay={flake.delay}
          duration={flake.duration}
        />
      ))}
    </>
  );
});

export default SnowfallEffect;
