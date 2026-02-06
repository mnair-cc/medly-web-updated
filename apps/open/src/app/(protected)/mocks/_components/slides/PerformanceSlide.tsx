import { useState, useEffect, useRef } from "react";

const PerformanceSlide = () => {
  const [position, setPosition] = useState({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  });

  const targetPosition = useRef({ x: position.x, y: position.y });
  const animationFrameId = useRef<number>();

  useEffect(() => {
    const edgePadding = 100;
    const bottomPadding = 200;
    const smoothing = 0.12;

    const handleMouseMove = (e: MouseEvent): void => {
      const isWithinBounds =
        e.clientX >= edgePadding &&
        e.clientX <= window.innerWidth - edgePadding &&
        e.clientY >= edgePadding &&
        e.clientY <= window.innerHeight - bottomPadding;

      if (isWithinBounds) {
        targetPosition.current = { x: e.clientX, y: e.clientY };
      }
    };

    const animate = () => {
      setPosition((prev) => ({
        x: prev.x + (targetPosition.current.x - prev.x) * smoothing,
        y: prev.y + (targetPosition.current.y - prev.y) * smoothing,
      }));
      animationFrameId.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <img
      src="/assets/magnifying_glass_emoji.png"
      alt="Magnifying glass"
      className="fixed pointer-events-none z-50 w-auto h-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
    />
  );
};

export default PerformanceSlide;
