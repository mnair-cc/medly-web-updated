import Image from "next/image";
import { motion } from "framer-motion";

const LoadingSlide = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Image
          src="/logo-large.svg"
          alt="Medly Logo"
          width={120}
          height={120}
          className="mb-4"
          style={{
            filter: "brightness(0) saturate(100%) invert(56%) sepia(89%) saturate(2090%) hue-rotate(170deg) brightness(101%) contrast(104%)",
          }}
        />
      </motion.div>
      <motion.h1
        className="text-6xl font-heavy tracking-[-0.05em] text-[#05B0FF]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
      >
        <span className="font-rounded-bold">medly</span> Results
      </motion.h1>
    </div>
  );
};

export default LoadingSlide;
