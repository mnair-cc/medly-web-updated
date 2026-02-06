const ShimmerEffect = () => {
  return (
    <>
      <div
        className="shimmer-effect absolute inset-0 pointer-events-none z-[100]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent)",
          transform: "translateX(-100%)",
          animation: "shimmer 3s forwards 1",
          zIndex: 100,
        }}
      />

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .shimmer-effect {
          background-size: 200% 100%;
        }
      `}</style>
    </>
  );
};

export default ShimmerEffect;
