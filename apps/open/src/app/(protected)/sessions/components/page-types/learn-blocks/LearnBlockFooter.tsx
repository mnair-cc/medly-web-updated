import React from "react";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";

interface LearnBlockFooterProps {
  buttonText: string;
  buttonState?: "filled" | "greyed" | "correct" | "incorrect";
  onPress: () => void;
  disabled?: boolean;
}

const LearnBlockFooter: React.FC<LearnBlockFooterProps> = React.memo(
  ({ buttonText, buttonState = "filled", onPress, disabled = false }) => {
    return (
      <div className="flex justify-end w-full">
        <div className="w-full sm:w-48">
          <PrimaryButtonClicky
            buttonText={buttonText}
            buttonState={buttonState}
            onPress={onPress}
            disabled={disabled}
            showKeyboardShortcut={false}
            doesStretch={true}
          />
        </div>
      </div>
    );
  }
);

LearnBlockFooter.displayName = "LearnBlockFooter";

export default LearnBlockFooter;
