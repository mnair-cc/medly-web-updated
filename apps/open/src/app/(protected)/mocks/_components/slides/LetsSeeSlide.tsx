import { motion, useMotionValue, useTransform } from "framer-motion";

const LetsSeeSlide = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Transform mouse position into eye movement
  const leftEyeX = useTransform(mouseX, [-800, 800], [-120, 50]);
  const leftEyeY = useTransform(mouseY, [-800, 800], [-50, 50]);
  const rightEyeX = useTransform(mouseX, [-800, 800], [-120, 50]);
  const rightEyeY = useTransform(mouseY, [-800, 800], [-50, 50]);

  const handleMouseMove = (event: React.MouseEvent) => {
    const { clientX, clientY } = event;
    const { left, top, width, height } =
      event.currentTarget.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    mouseX.set(clientX - centerX);
    mouseY.set(clientY - centerY);
  };

  return (
    <div
      className="absolute top-0 left-0 flex flex-col items-center justify-center h-screen w-screen overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <div className="flex gap-12 mb-12 translate-y-96 relative">
        {/* Left Eye */}
        <div className="w-[450px] h-[900px] rounded-[50%] flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[#FFF2F4] rounded-[50%]" />
          <motion.div
            className="w-48 h-48 bg-[#353C39] rounded-full absolute"
            style={{ x: leftEyeX, y: leftEyeY }}
            animate={{
              scaleY: [1, 0.1, 1],
            }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              repeatDelay: 4,
              ease: "easeInOut",
            }}
          >
            <div className="w-12 h-12 bg-[#69726F] rounded-full absolute top-12 right-6" />
          </motion.div>
        </div>

        {/* Right Eye */}
        <div className="w-[450px] h-[900px] rounded-[50%] flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[#FFF2F4] rounded-[50%]" />
          <motion.div
            className="w-48 h-48 bg-[#353C39] rounded-full absolute"
            style={{ x: rightEyeX, y: rightEyeY }}
            animate={{
              scaleY: [1, 0.1, 1],
            }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              repeatDelay: 4,
              ease: "easeInOut",
            }}
          >
            <div className="w-12 h-12 bg-[#69726F] rounded-full absolute top-12 right-6" />
          </motion.div>
        </div>

        {/* Single cover rectangle */}
        {/* <motion.div
          className="absolute bottom-0 left-[-24px] right-[-24px] h-full bg-[#05486A]"
          initial={{ y: 0 }}
          animate={{ y: "-100%" }}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.5 }}
        /> */}
      </div>
    </div>
  );
};

export default LetsSeeSlide;
