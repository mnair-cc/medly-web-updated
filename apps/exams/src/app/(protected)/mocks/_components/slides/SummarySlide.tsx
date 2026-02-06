import PrimaryButton from "@/app/_components/PrimaryButton";
import { InsightsData } from "../../_types/types";
import { deconstructSubjectLegacyId } from "@/app/_lib/utils/utils";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "@/app/_components/ConfirmationModal";
import { useState } from "react";
import rankings from "@/app/(protected)/mocks/_constants/rankings.json";
import { useSession } from "next-auth/react";
import SnowfallEffect from "@/app/(protected)/mocks/register/_components/christmas/SnowfallEffect";

const SummarySlide = ({ insightsData }: { insightsData: InsightsData }) => {
  const { data: session } = useSession();
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const { subjectTitle: bestSubject } = deconstructSubjectLegacyId(
    insightsData.subjectInsights[0]?.subjectId
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Find user's ranking and code from the rankings JSON
  const hasRanking =
    rankings.findIndex((item) => item.email === session?.user?.id) !== -1;
  const userRanking =
    rankings.findIndex((item) => item.email === session?.user?.id) + 1;
  const userCode =
    rankings.find((item) => item.email === session?.user?.id)?.code || "THX25";

  return (
    <div className="relative w-full h-full">
      {/* Toast for code copied */}
      <AnimatePresence>
        {showCopiedToast && (
          <motion.div
            className="fixed top-4 inset-x-0 z-[100] flex justify-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white/90 text-black text-sm py-2 px-4 rounded-full font-rounded-bold">
              Code Copied
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winter gradient background - fixed to cover full screen */}
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
        <p className="text-[180px] leading-[60px] text-white/50 blur-sm">❄️</p>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        status="custom-message"
        onClose={() => setIsModalOpen(false)}
        onClickConfirm={() => {
          setIsModalOpen(false);
          window.open(
            "https://checkout.medlyai.com/b/3cscPT52h0gCaHegwt",
            "_blank"
          );
        }}
        customHeading="Claim your Free Capybara Pin"
        customButtonText="Claim your Pin"
        showFeedbackButton={false}
        customDescription={`Use your exclusive code, '${userCode}', to redeem your free gift.`}
      />
      {hasRanking && (
        <div className="absolute w-full h-full z-10 flex flex-col items-center">
          <div className="mt-16 z-10">
            <h1 className="text-4xl font-rounded-bold">
              You ranked {userRanking}
              {userRanking === 1
                ? "st"
                : userRanking === 2
                  ? "nd"
                  : userRanking === 3
                    ? "rd"
                    : "th"}{" "}
              in the country!
            </h1>
          </div>

          <div className="flex flex-col items-center gap-2 mt-5">
            <div className="text-lg text-white/80 text-center">
              You're in the top 1% of 24,461 students who sat Medly Mocks!
              <br />
              You've earned a rare Capybara Pin - only 500 exist and they're
              just for top students like you!
              <br />
              Click the pin to claim your free gift.
            </div>
            <div className="text-lg text-white/80 text-center"></div>
          </div>

          <motion.div
            className="relative cursor-pointer"
            initial={{ scale: 0, rotate: 10 }}
            animate={{
              scale: 1,
              rotate: -5,
              transition: {
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: 0.5,
                duration: 0.6,
              },
            }}
            whileHover={{
              scale: 1.2,
              rotate: 6,
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
            whileTap={{ scale: 1.1 }}
            transition={{
              scale: { type: "spring", stiffness: 200, damping: 15 },
              rotate: { duration: 0.5, ease: "easeInOut" },
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <img
              src="/assets/capybara_pin.png"
              alt="Magnifying glass"
              className="w-[400px]"
            />
          </motion.div>
        </div>
      )}

      <div className="relative w-full h-full flex flex-col items-center z-10 pt-16">
        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-4xl font-rounded-bold">
            Thank you for sitting the
          </h1>
          <h1 className="text-4xl font-rounded-bold">2025 Christmas Mocks!</h1>
        </div>

        <div className="flex flex-col items-center gap-2 mb-5">
          <div className="text-lg text-white/80 text-center leading-relaxed">
            Here&apos;s a special gift to help you keep up the good work:
            <br />
            Use code <span className="font-bold">THX25</span> to get 10% off
            Medly Pro!
          </div>
        </div>

        <motion.div
          className="relative cursor-pointer"
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
            },
          }}
          whileHover={{
            scale: 1.2,
            rotate: 6,
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
          whileTap={{ scale: 1.1 }}
          transition={{
            scale: { type: "spring", stiffness: 200, damping: 15 },
            rotate: { duration: 0.5, ease: "easeInOut" },
          }}
          onClick={() => {
            navigator.clipboard.writeText("THX25");
            setShowCopiedToast(true);
            setTimeout(() => setShowCopiedToast(false), 2000);
          }}
        >
          <img
            src="/assets/coupon.png"
            alt="Discount coupon"
            className="w-[480px]"
          />
        </motion.div>

        {/* <PrimaryButtonClicky
          buttonText="Review your papers"
          onPress={() => { }}
          showKeyboardShortcut={false}
          isLong={true}
        /> */}
        {/* <div className="flex text-left gap-8 relative z-10 p-8">
          <div className="flex flex-col gap-8 bg-white/10 p-8 rounded-2xl">
            <div className="flex flex-col gap-3">
              <h3 className="font-bold">Minutes of Mocks</h3>
              <p className="text-4xl font-heavy tracking-[-0.05em]">
                {insightsData.timeSpentInMinutes}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-bold">Top Subject</h3>
              <p className="text-4xl font-heavy tracking-[-0.05em]">
                {bestSubject}
              </p>
            </div>
          </div>
          <div className="flex gap-32 bg-white/10 p-8 rounded-2xl">
            <div>
              <h3 className="font-bold mb-4">Top Topics</h3>
              <ol className="flex flex-col list-decimal list-inside gap-2">
                {insightsData.strongestTopics.map((topic, index) => (
                  <li key={index}>{topic.title}</li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="font-bold mb-4">Worst Topics</h3>
              <ol className="flex flex-col list-decimal list-inside gap-2">
                {insightsData.weakestTopics.map((topic, index) => (
                  <li key={index}>{topic.title}</li>
                ))}
              </ol>
            </div>
          </div>
          <div className="flex gap-16 bg-white/10 p-8 rounded-2xl">
            <div>
              <h3 className="font-bold mb-4">Awards</h3>
              <ol className="flex flex-col list-decimal list-inside gap-2">
                {insightsData.awards.map((award, index) => (
                  <li key={index}>{award}</li>
                ))}
              </ol >
            </div >
          </div >
        </div > */}
      </div>
    </div>
  );
};

export default SummarySlide;
