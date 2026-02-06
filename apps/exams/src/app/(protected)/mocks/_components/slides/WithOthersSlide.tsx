import React from "react";
import { motion } from "framer-motion";

const WithOthersSlide = () => {
  const emojis = ["🐷", "🦊", "🐔", "🐭", "🐙", "🐻", "🦁"];
  const [visibleEmojis, setVisibleEmojis] = React.useState<number[]>([]);

  React.useEffect(() => {
    emojis.forEach((_, index) => {
      setTimeout(() => {
        setVisibleEmojis((prev) => [...prev, index]);
      }, index * 300); // 300ms delay between each emoji
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-full">
        <div className="absolute top-72 w-full flex justify-center cursor-default">
          {emojis.map((emoji, index) => {
            const angle = (index - (emojis.length - 1) / 2) * 20;
            const radius = 600;
            const x = Math.sin((angle * Math.PI) / 180) * radius;
            const y = -Math.cos((angle * Math.PI) / 180) * radius;

            return (
              <div
                key={index}
                className="absolute text-9xl"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  animate={
                    visibleEmojis.includes(index)
                      ? { opacity: 1, scale: 1, rotate: 0 }
                      : { opacity: 0, scale: 0, rotate: -180 }
                  }
                  transition={{
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                  whileHover={{
                    scale: 1.3,
                    rotate: [0, Math.random() * 10],
                    transition: {
                      scale: {
                        duration: 0.3,
                        type: "spring",
                        stiffness: 300,
                        damping: 8,
                      },
                      rotate: { duration: 0.5, ease: "easeInOut" },
                    },
                  }}
                >
                  {emoji}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col -mt-20">
        <h1 className="text-4xl font-rounded-bold tracking-[-0.05em]">
          10,879 students sat the Mocks.
        </h1>
        <h2 className="text-4xl font-rounded-bold tracking-[-0.05em]">
          Let&apos;s see how you compare!
        </h2>
      </div>
    </div>
  );
};

export default WithOthersSlide;
