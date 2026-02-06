"use client";

import PrimaryButtonClicky from "./PrimaryButtonClicky";

interface ConfirmationModalProps {
  status: "end-paper" | "quit-paper" | "start-paper" | "custom-message";
  isOpen: boolean;
  onClose: () => void;
  onClickConfirm: () => void;
  customHeading?: string;
  customDescription?: string;
  customButtonText?: string;
  showFeedbackButton?: boolean;
  hideCancelButton?: boolean;
}

const ConfirmationModal = ({
  status,
  isOpen,
  onClose,
  onClickConfirm,
  customHeading,
  customDescription,
  customButtonText = "Confirm",
  showFeedbackButton = true,
  hideCancelButton = false,
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-[16px] text-center shadow-[0_0_32px_rgba(0,0,0,0.2)] overflow-hidden relative flex flex-col items-center w-[400px] max-h-[80vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            onClick={onClose}
            className="cursor-pointer"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12.0001 13.0607L6.53039 18.5304L5.46973 17.4697L10.9394 12.0001L5.46973 6.53039L6.53039 5.46973L12.0001 10.9394L17.4697 5.46973L18.5304 6.53039L13.0607 12.0001L18.5304 17.4697L17.4697 18.5304L12.0001 13.0607Z"
              fill="black"
            />
          </svg>
        </button>

        <div className="flex-1 flex flex-col p-5 pb-6 pt-12 justify-center items-center">
          <h1 className="text-3xl mb-4 font-rounded-bold mx-4 md:mx-0 text-black">
            {status === "end-paper"
              ? "Finish paper?"
              : status === "start-paper"
                ? "Ready to start?"
                : status === "quit-paper"
                  ? "Exit paper?"
                  : customHeading}
          </h1>
          <p className="text-base mb-4 w-[80%] text-gray-500">
            {status === "end-paper"
              ? "Submit your answers for marking. You will be unable to change your answers after you finish."
              : status === "start-paper"
                ? "Your mock exam will begin once you click 'Start'. We will save your answers as you progress."
                : status === "quit-paper"
                  ? "You will be unable to change your answers after you exit."
                  : customDescription}
          </p>
          <div className="w-full gap-2 flex flex-col pt-5">
            <PrimaryButtonClicky
              buttonText={
                status === "end-paper"
                  ? "Finish"
                  : status === "start-paper"
                    ? "Start"
                    : status === "quit-paper"
                      ? "Exit"
                      : customButtonText
              }
              showKeyboardShortcut={false}
              doesStretch={true}
              buttonState={"filled"}
              onPress={onClickConfirm}
            />
            {!hideCancelButton && (
              <PrimaryButtonClicky
                buttonText={"Cancel"}
                showKeyboardShortcut={false}
                doesStretch={true}
                onPress={onClose}
              />
            )}
            {showFeedbackButton && (
              <button
                onClick={() => {
                  window.open(
                    "https://medlyai.tawk.help/article/frequently-asked-questions"
                  );
                }}
                className="mt-2 mb-5 text-sm font-medium text-red-500"
              >
                Report a problem
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
