"use client";

import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import CrossIcon from "@/app/_components/icons/CrossIcon";
import { SessionType } from "../../types";

const ExitConfirmationModal = ({
  isOpen,
  onClose,
  onClickConfirm,
  sessionType,
}: {
  isOpen: boolean;
  onClose: () => void;
  onClickConfirm: () => void;
  sessionType: SessionType;
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute top-0 left-0 bg-black/50 flex items-end md:items-center justify-center w-full h-full z-[5001]"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-t-[16px] md:rounded-[16px] text-center shadow-[0_0_32px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col items-center w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* <button onClick={onClose} className="absolute top-5 right-5">
          <CrossIcon color="black" />
        </button> */}

        <div className="flex-1 flex flex-col p-5 pb-6 pt-12 justify-center items-center">
          <h1 className="text-3xl mb-4 font-rounded-heavy mx-4 md:mx-0 text-black">
            {sessionType === SessionType.PaperSession
              ? "Finish paper?"
              : sessionType === SessionType.MockSession
              ? "Finish paper?"
              : sessionType === SessionType.PracticeSession
              ? "End practice session?"
              : "Finish session?"}
          </h1>
          <p className="text-base mb-10 w-[80%] text-gray-500">
            {sessionType === SessionType.PaperSession
              ? "Submit your answers for marking. You will be unable to change your answers after you finish."
              : sessionType === SessionType.MockSession
              ? "Your progress will be saved and submitted for marking. You will be unable to change your answers after you finish."
              : "You'll lose your progress if you exit."}
          </p>
          <div className="w-full gap-2 flex flex-col pt-0">
            <PrimaryButtonClicky
              buttonText={
                sessionType === SessionType.MockSession
                  ? "Finish Paper"
                  : "End session"
              }
              showKeyboardShortcut={false}
              doesStretch={true}
              buttonState={"filled"}
              onPress={onClickConfirm}
            />
            <PrimaryButtonClicky
              buttonText={"Cancel"}
              showKeyboardShortcut={false}
              doesStretch={true}
              onPress={onClose}
            />
            <button
              onClick={() => {
                window.open("https://tawk.to/medly");
              }}
              className="mt-2 mb-5 text-sm font-medium text-red-500"
            >
              Report a problem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExitConfirmationModal;
