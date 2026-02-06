const DocumentPreviewRectangles = () => {
  return (
    <div className="relative w-[200px] h-[88px] mx-auto">
      {/* Left rectangle - rotated -10deg */}
      <div
        className="rect-left absolute w-[50px] h-[70px] rounded-lg border border-[#F2F2F7] bg-[#FBFBFD]"
        style={{ boxShadow: '0 8px 12px rgba(0, 0, 0, 0.05)' }}
      />
      {/* Center rectangle - no rotation */}
      <div
        className="rect-center absolute w-[70px] h-[50px] rounded-lg border border-[#F2F2F7] bg-[#FBFBFD]"
        style={{ boxShadow: '0 8px 12px rgba(0, 0, 0, 0.05)' }}
      />
      {/* Right rectangle - rotated +12deg */}
      <div
        className="rect-right absolute w-[70px] h-[50px] rounded-lg border border-[#F2F2F7] bg-[#FBFBFD]"
        style={{ boxShadow: '0 8px 12px rgba(0, 0, 0, 0.05)' }}
      />

      <style jsx>{`
        .rect-left {
          left: 24px;
          top: 5px;
          transform: rotate(-10.19deg);
          z-index: 1;
          animation: shuffleCardL 15s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .rect-center {
          left: 64px;
          top: 17px;
          z-index: 10;
          animation: shuffleCardC 15s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .rect-right {
          left: 119px;
          top: 16px;
          transform: rotate(11.74deg);
          z-index: 1;
          animation: shuffleCardR 15s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        /* X positions: Pos1=24px, Pos2=64px, Pos3=119px */

        /* CardL: Pos1 → Pos3 → Pos3 → Pos2 → Pos1 (keeps top:5px, rotate:-10.19deg) */
        @keyframes shuffleCardL {
          0% { left: 24px; z-index: 1; }
          2% { z-index: 20; }
          5%, 25% { left: 119px; z-index: 20; }
          30%, 50% { left: 119px; z-index: 1; }
          55%, 75% { left: 72px; z-index: 10; }
          85%, 100% { left: 24px; z-index: 1; }
        }

        /* CardC: Pos2 → Pos2 → Pos1 → Pos1 → Pos2 (keeps top:17px, rotate:0) */
        @keyframes shuffleCardC {
          0%, 25% { left: 64px; z-index: 10; }
          27% { z-index: 5; }
          30%, 50% { left: 24px; z-index: 5; }
          55%, 75% { left: 24px; z-index: 5; }
          85%, 100% { left: 64px; z-index: 10; }
        }

        /* CardR: Pos3 → Pos1 → Pos2 → Pos3 → Pos3 (keeps top:5px, rotate:11.74deg) */
        @keyframes shuffleCardR {
          0% { left: 119px; z-index: 1; }
          5%, 25% { left: 24px; z-index: 1; }
          27% { z-index: 15; }
          30%, 50% { left: 64px; z-index: 15; }
          52% { z-index: 20; }
          55%, 75% { left: 119px; z-index: 20; }
          85%, 100% { left: 119px; z-index: 1; }
        }
      `}</style>
    </div>
  );
};

export default DocumentPreviewRectangles;
