const ShimmerEffect = ({
    isVisible,
    loop = true,
    opacity = 1,
    variant = "default"
}: {
    isVisible: boolean;
    loop?: boolean;
    opacity?: number;
    variant?: "default" | "chroma";
}) => {
    if (!isVisible) return null;

    const gradients = {
        default: "linear-gradient(115deg, transparent 10%, rgba(255, 255, 255, 0.8) 50%, transparent 90%)",
        chroma: `linear-gradient(115deg,
            transparent 10%,
            rgba(183, 246, 82, 0.8) 30%,
            rgba(70, 231, 144, 0.8) 40%,
            rgba(31, 173, 255, 0.8) 50%,
            rgba(170, 100, 245, 0.8) 60%,
            rgba(246, 176, 206, 0.8) 70%,
            transparent 90%
        )`,
    };

    return (
        <>
            <div
                className="shimmer-effect absolute pointer-events-none z-[100]"
                style={{
                    top: "-50%",
                    left: "-50%",
                    width: "200%",
                    height: "200%",
                    background: gradients[variant],
                    transform: "translateX(-100%)",
                    animation: loop ? "shimmer 3s infinite forwards" : "shimmer 3s forwards 1",
                    zIndex: 100,
                    opacity: opacity,
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