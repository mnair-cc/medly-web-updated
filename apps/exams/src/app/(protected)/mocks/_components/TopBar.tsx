import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ProgressBar from "@/app/_components/ProgressBar";
import CrossIcon from "@/app/_components/icons/CrossIcon";
import { fromTopVariants } from "../_constants/slides";
import { UserDetails } from "@/app/types/types";
import { Slide } from "../_types/types";

const TopBar = ({
  currentSlideIndex,
  progress,
  user,
  onSlideChange,
  slides,
}: {
  currentSlideIndex: number;
  progress: number;
  user?: UserDetails;
  onSlideChange?: (index: number) => void;
  slides: Slide[];
}) => {
  const showProgressBars = currentSlideIndex > 1;
  // Skip welcome (0) and loading (1) slides from the progress bar
  const slidesWithContent = slides.slice(2);

  return (
    <div className="flex flex-col sm:flex-row items-center sm:justify-between w-full gap-6 sm:gap-0 pt-4 sm:pt-0 z-50 relative">
      {/* Mobile: Logo and X button row */}
      <div className="flex sm:hidden items-center justify-between w-[80%]">
        <div className="w-20">
          <Image
            src="/logo-with-text.svg"
            alt="Medly Logo"
            className="w-20"
            width={80}
            height={80}
          />
        </div>
        <Link href="/" className="opacity-50">
          <CrossIcon color="white" />
        </Link>
      </div>

      {/* Desktop: Logo on left */}
      <div className="hidden sm:block w-24">
        <Image
          src="/logo-with-text.svg"
          alt="Medly Logo"
          className="w-24"
          width={100}
          height={100}
        />
      </div>

      {/* Progress bars - 80% width on mobile, flex-1 on desktop */}
      <AnimatePresence>
        {showProgressBars && (
          <motion.div
            className="flex justify-center items-center gap-2 w-[80%] sm:w-auto sm:flex-1 sm:px-40"
            variants={fromTopVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {slidesWithContent.map((slide, index) => {
              // Offset by 2 since we skip welcome and loading slides
              const isPreviousSlide = index < currentSlideIndex - 2;
              const isCurrentSlide = index === currentSlideIndex - 2;
              return (
                <div
                  key={slide.type}
                  className={`w-8 ${isPreviousSlide ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (isPreviousSlide && onSlideChange) {
                      // For first tab (index 0), go to loading slide (1) which auto-advances to papers
                      // For other tabs, go directly to that slide
                      onSlideChange(index === 0 ? 1 : index + 2);
                    }
                  }}
                >
                  <ProgressBar
                    progress={
                      isPreviousSlide ? 100 : isCurrentSlide ? progress : 0
                    }
                    avatar={isCurrentSlide ? user?.avatar : undefined}
                    colorEmpty="rgba(255,255,255,0.3)"
                    colorFilled="rgba(255,255,255,0.8)"
                    type="tall"
                  />
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      {!showProgressBars && <div className="hidden sm:block flex-1"></div>}

      {/* Desktop: X button on right */}
      <div className="hidden sm:flex w-24 justify-end">
        <Link href="/" className="opacity-50">
          <CrossIcon color="white" />
        </Link>
      </div>
    </div>
  );
};

export default TopBar;
