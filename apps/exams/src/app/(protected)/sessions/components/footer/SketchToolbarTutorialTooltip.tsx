import React, { useState, useEffect } from "react";

interface SketchToolbarTutorialTooltipProps {
  isVisible: boolean;
  onClick: () => void;
}

const SketchToolbarTutorialTooltip: React.FC<SketchToolbarTutorialTooltipProps> = ({
  isVisible,
  onClick,
}) => {
  const [hasBeenSeen, setHasBeenSeen] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("isToolbarTutorialSeen");
    if (seen === "true") {
      setHasBeenSeen(true);
    }
  }, []);

  useEffect(() => {
    if (isVisible && !hasBeenSeen) {
      const timer = setTimeout(() => {
        setShouldAnimate(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, hasBeenSeen]);

  const handleDismiss = () => {
    localStorage.setItem("isToolbarTutorialSeen", "true");
    setHasBeenSeen(true);
  };

  const handleTooltipClick = () => {
    // TODO: Open tutorial modal
    onClick();
    handleDismiss();
  };

  if (!isVisible || hasBeenSeen) return null;

  return (
    <div
      className="absolute left-1/2 bottom-24 flex flex-row z-[1000] pointer-events-auto cursor-pointer"
      onClick={handleTooltipClick}
      style={{
        transform: shouldAnimate ? "scale(1)" : "scale(0.93)",
        transformOrigin: "bottom center",
        opacity: shouldAnimate ? 1 : 0,
        transition: shouldAnimate
          ? "transform 150ms ease-out, opacity 150ms ease-out"
          : "none",
      }}
    >
      <div className="-translate-x-1/2 bg-[rgba(255,255,255,0.7)] backdrop-blur-md rounded-[20px] shadow-[0_0_16px_rgba(0,0,0,0.20)] border border-white p-2 pr-4 relative z-10 flex flex-row items-center justify-between gap-4 
      hover:bg-[rgba(255,255,255,1)] transition-all duration-150 hover:ease active:scale-[0.97] active:ease-out">
        <div className="w-[58px] h-[58px] rounded-[12px] bg-[#f2f2f7] flex items-center justify-center">
          <img
            src="https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fcanvas_small.gif?alt=media&token=f3d8a7de-e16d-41f0-9bda-e65a36961d9d"
            alt="Medly canvas in action"
            className="rounded-[10px] w-[46px] h-[46px] object-cover"
            draggable={false}
          />

        </div>
        <div>
          <div className="flex flex-col">
            <div className="flex flex-row items-center gap-4">
              <div className="font-rounded-bold text-[15px]">
                New to the Medly canvas?
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="cursor-pointer"
              >
                <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.313608 10.9341C-0.0555325 11.3032 -0.0731106 11.9624 0.322397 12.3403C0.700327 12.7358 1.3683 12.7183 1.73744 12.3491L6.00013 8.08643L10.2628 12.3491C10.6408 12.7271 11.2911 12.7358 11.6691 12.3403C12.0646 11.9624 12.0558 11.3032 11.6779 10.9253L7.41517 6.6626L11.6779 2.40869C12.0558 2.02197 12.0646 1.37158 11.6691 0.993652C11.2911 0.598145 10.6408 0.606934 10.2628 0.984863L6.00013 5.24756L1.73744 0.984863C1.3683 0.615723 0.700327 0.598145 0.322397 0.993652C-0.0731106 1.37158 -0.0555325 2.03076 0.313608 2.3999L4.5763 6.6626L0.313608 10.9341Z" fill="#595959" fillOpacity="0.5" />
                </svg>
              </button>
            </div>
            <div className="font-rounded-medium text-[14px] text-[#595959]/80 mb-1">
              Tap to begin the tutorial.
            </div>
          </div>
        </div>
      </div>

      {/* Pointer notch (SVG, no shadow) */}
      {/* Shadow arrow behind the card */}
      <svg
        width="25"
        height="21"
        viewBox="0 0 25 21"
        xmlns="http://www.w3.org/2000/svg"
        className={`absolute -bottom-[10px] select-none pointer-events-none drop-shadow-md z-0`}
      >
        <path
          d="M12.1445 20.4063C11.1495 20.4063 10.154 19.9373 9.59863 19.0107L0.504881 4.05762C0.250405 3.63172 0.123118 3.17377 0.123045 2.72656C0.123045 1.22484 1.27986 2.99583e-05 3.07324 1.84501e-06L21.2275 2.57914e-07C23.0208 0.000118327 24.1777 1.22489 24.1777 2.72656C24.1777 3.17376 24.0387 3.62107 23.7842 4.05762L14.7012 19.0107C14.1458 19.9373 13.1396 20.4062 12.1445 20.4063Z"
          fill="white"
        />
      </svg>

      {/* Crisp arrow above the card (no shadow) */}
      <svg
        width="25"
        height="21"
        viewBox="0 0 25 21"
        xmlns="http://www.w3.org/2000/svg"
        className={`absolute -bottom-[10px] select-none pointer-events-none z-20`}
      >
        <path
          d="M12.1445 20.4063C11.1495 20.4063 10.154 19.9373 9.59863 19.0107L0.504881 4.05762C0.250405 3.63172 0.123118 3.17377 0.123045 2.72656C0.123045 1.22484 1.27986 2.99583e-05 3.07324 1.84501e-06L21.2275 2.57914e-07C23.0208 0.000118327 24.1777 1.22489 24.1777 2.72656C24.1777 3.17376 24.0387 3.62107 23.7842 4.05762L14.7012 19.0107C14.1458 19.9373 13.1396 20.4062 12.1445 20.4063Z"
          fill="rgba(255,255,255,0.7)"
        />
      </svg>
    </div>
  );
};

export default SketchToolbarTutorialTooltip;
