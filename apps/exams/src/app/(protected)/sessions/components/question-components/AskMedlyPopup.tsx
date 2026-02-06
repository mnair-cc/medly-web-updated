import { SelectionInfo } from "./QuestionTextRenderer";
import { useState } from "react";

interface AskMedlyPopupProps {
  selectionInfo: SelectionInfo;
  onAskMedly: (text: string) => void;
}

const AskMedlyPopup = ({ selectionInfo, onAskMedly }: AskMedlyPopupProps) => {
  const { text, rect } = selectionInfo;
  const [isPressedDown, setIsPressedDown] = useState(false);

  // Calculate position - center the popup above the selection
  const popupWidth = 120;
  const popupHeight = 36;
  const arrowOffset = 10; // Arrow extends 10px below popup
  const arrowHeight = 12; // Arrow is 12px tall
  const gap = -8; // Small gap between arrow tip and selection

  // Position above the selection, centered
  // Popup top + popupHeight + arrowOffset + arrowHeight = rect.top - gap
  const left = rect.left + rect.width / 2 - popupWidth / 2;
  const top = rect.top - popupHeight - arrowOffset - arrowHeight - gap;

  return (
    <div
      className="fixed z-[9999] pointer-events-auto"
      style={{
        left: `${left}px`,
        top: `${top}px`,
      }}
      data-ask-medly-popup
    >
      <div className="bg-white rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.15)] p-1">
        <button
          onClick={() => {
            // Clear browser selection
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
            }

            // Call parent callback
            onAskMedly(text);
          }}
          onMouseDown={() => setIsPressedDown(true)}
          onMouseUp={() => setIsPressedDown(false)}
          onMouseLeave={() => setIsPressedDown(false)}
          onTouchStart={() => setIsPressedDown(true)}
          onTouchEnd={() => setIsPressedDown(false)}
          className="font-rounded-bold text-[14px] px-3 py-0 flex flex-row items-center gap-1 hover:bg-[#F2F2F7]/50 rounded-[8px] cursor-pointer"
        >

          Ask Medly
          <svg width="32" height="32" className="-mr-2" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.9912 22.7422C18.9746 22.7422 23.0879 18.6289 23.0879 13.6543C23.0879 8.67969 18.9658 4.56641 13.9824 4.56641C9.00781 4.56641 4.90332 8.67969 4.90332 13.6543C4.90332 18.6289 9.0166 22.7422 13.9912 22.7422ZM13.9912 18.2773C13.5166 18.2773 13.165 17.9434 13.165 17.4688V13.1973L13.2529 11.3164L12.4355 12.3359L11.4248 13.3994C11.2842 13.5488 11.082 13.6367 10.8623 13.6367C10.4229 13.6367 10.0977 13.3203 10.0977 12.8896C10.0977 12.6699 10.168 12.4941 10.3174 12.3359L13.3408 9.27734C13.543 9.05762 13.7451 8.96094 13.9912 8.96094C14.2549 8.96094 14.457 9.06641 14.6592 9.27734L17.665 12.3359C17.8232 12.4941 17.8936 12.6699 17.8936 12.8896C17.8936 13.3203 17.5684 13.6367 17.1289 13.6367C16.9092 13.6367 16.707 13.5576 16.5664 13.3994L15.5645 12.3447L14.7383 11.3076L14.8262 13.1973V17.4688C14.8262 17.9434 14.4746 18.2773 13.9912 18.2773Z"
              fill="#00AEFF" />
          </svg>
        </button>
      </div>
      {/* Pointer arrow */}
      <svg
        className="absolute left-1/2 transform -translate-x-1/2 -bottom-[8px]"
        width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.0313 -1.95933e-07L2.24121 -1.4015e-06C0.878908 -1.52059e-06 1.38382e-06 1.01074 1.27548e-06 2.25C1.24321e-06 2.61914 0.0966809 2.99707 0.29004 3.34863L7.19824 15.6885C7.62012 16.4531 8.37598 16.8398 9.13184 16.8398C9.8877 16.8398 10.6523 16.4531 11.0742 15.6885L17.9736 3.34863C18.167 2.98828 18.2725 2.61914 18.2725 2.25C18.2725 1.01074 17.3936 -7.68364e-08 16.0313 -1.95933e-07Z"
          fill="white" />
      </svg>


    </div>
  );
};

export default AskMedlyPopup;

