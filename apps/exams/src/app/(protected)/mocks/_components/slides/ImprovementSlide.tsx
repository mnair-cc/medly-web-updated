import Image from "next/image";
import { motion } from "framer-motion";

const ImprovementSlide = () => {
  return (
    <div className="flex flex-col items-center justify-center relative mt-5">
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -10 }}
        animate={{
          scale: 1,
          rotate: 4,
          transition: {
            type: "spring",
            stiffness: 100,
            damping: 15,
            delay: 0.5,
            duration: 0.6,
          }
        }}
        whileHover={{
          scale: 1.2,
          rotate: [0, Math.random() * 10],
          transition: {
            scale: { duration: 0.3, type: "spring", stiffness: 300, damping: 8 },
            rotate: { duration: 0.5, ease: "easeInOut" }
          }
        }}
        transition={{
          scale: { type: "spring", stiffness: 300, damping: 15 },
          rotate: { duration: 0.5, ease: "easeInOut" }
        }}
      >
        <Image
          src="/chart-emoji.png"
          alt="Chart showing increase"
          width={240}
          height={240}
        />
      </motion.div>
    </div >
  );
};

export default ImprovementSlide;