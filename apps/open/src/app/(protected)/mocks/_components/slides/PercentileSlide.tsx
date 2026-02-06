import React, { useEffect, useRef } from "react";
import Matter from "matter-js";

interface PaperData {
  body: Matter.Body;
  title: string;
  width: number;
  height: number;
  isAvatar: boolean;
}

const PercentileSlide = ({
  avatar,
  award,
}: {
  avatar: string;
  award: string;
}) => {
  // Extract "Top X%" from award string (e.g., "Top 10% of topic: Geometry..." -> "Top 10%")
  const topPercentage = award.match(/Top \d+%/)?.[0] || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const papersRef = useRef<PaperData[]>([]); // Ref to store paper data for rendering
  const runnerRef = useRef<Matter.Runner | null>(null); // Ref for the runner

  useEffect(() => {
    if (!containerRef.current) return;

    // Basic check to prevent multiple initializations
    if (engineRef.current) return;

    const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner, // Import Runner
      Events = Matter.Events, // Import Events
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Composite = Matter.Composite;

    // Create engine
    const engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 },
    });
    engineRef.current = engine;
    const world = engine.world;

    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Create renderer
    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: {
        width: containerWidth,
        height: containerHeight,
        wireframes: false, // Show filled shapes
        background: "transparent", // Use container background
        pixelRatio: window.devicePixelRatio || 1,
      },
    });
    renderRef.current = render;

    // Paper titles from props
    let emojis = [
      "🐶",
      "❄️",
      "🐱",
      "⛄",
      "🐭",
      "❄️",
      "🐹",
      "🐰",
      "⛄",
      "🦊",
      "❄️",
      "🐻",
      "🐼",
      "⛄",
      "🐨",
      "❄️",
      "🐯",
      "🦁",
      "⛄",
      "🐮",
      "❄️",
      "🐷",
      "🐸",
      "⛄",
      "🐵",
      "❄️",
      "🐔",
      "🦋",
      "⛄",
      "🐙",
      "❄️",
      "🐻‍❄️",
      "🦊",
      "⛄",
      "🦦",
      "❄️",
      "🦁",
      "🐷",
      "⛄",
      "🐼",
      "❄️",
      "🐻",
      "🦋",
      "⛄",
      "🐙",
      "❄️",
      "🐻‍❄️",
      "🦊",
      "⛄",
      "🦦",
      "❄️",
      "🦁",
      "🐷",
      "⛄",
      "🐼",
      "❄️",
      "🐻",
      "🐼",
      "⛄",
      "🐨",
      "❄️",
      "🐯",
      "🦁",
      "⛄",
      "🐮",
      "❄️",
      "🐷",
      "🐸",
      "⛄",
      "🐵",
      "❄️",
      "🐔",
    ];

    // Filter out the avatar emoji to avoid duplicates
    emojis = emojis.filter((emoji) => emoji !== avatar);

    // Create boundaries
    const ground = Bodies.rectangle(
      containerWidth / 2,
      containerHeight + 30, // Position below the view
      containerWidth,
      60,
      { isStatic: true, render: { visible: false } }
    );
    const leftWall = Bodies.rectangle(
      -30, // Position outside left
      containerHeight / 2,
      60,
      containerHeight,
      { isStatic: true, render: { visible: false } }
    );
    const rightWall = Bodies.rectangle(
      containerWidth + 30, // Position outside right
      containerHeight / 2,
      60,
      containerHeight,
      { isStatic: true, render: { visible: false } }
    );

    World.add(world, [ground, leftWall, rightWall]);

    // Click explosion handler
    const handleClick = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const explosionRadius = 200; // How far the explosion reaches
      const explosionForce = 0.15; // Strength of the explosion

      // Apply force to all bodies near the click
      papersRef.current.forEach((paperData) => {
        const body = paperData.body;
        const dx = body.position.x - clickX;
        const dy = body.position.y - clickY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < explosionRadius && distance > 0) {
          // Calculate force direction (away from click point)
          const forceMagnitude =
            (1 - distance / explosionRadius) * explosionForce;
          const forceX = (dx / distance) * forceMagnitude;
          const forceY = (dy / distance) * forceMagnitude - 0.1; // Add upward bias

          Body.applyForce(body, body.position, { x: forceX, y: forceY });
          // Add some spin
          Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.3);
        }
      });
    };

    containerRef.current.addEventListener("click", handleClick);

    // Create paper bodies
    const fontSize = 64; // Adjusted font size for potentially smaller elements
    const paperHeight = 48; // Reduced from 64 to make emojis pack tighter
    papersRef.current = []; // Reset papers on effect run

    // Helper function to generate normally distributed random numbers
    const normalRandom = () => {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      // Return a value between -1 and 1, with more values clustering around 0
      return z * 0.3; // Scale factor to control spread
    };

    const createPaper = (title: string, index: number, isAvatar = false) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Use larger font size for avatar
      const emojiSize = isAvatar ? fontSize * 4 : fontSize;
      ctx.font = `bold ${emojiSize}px Arial`;
      const textWidth = ctx.measureText(title).width;
      const paperWidth = textWidth * 0.7; // Reduced bounding box to make emojis touch

      // Adjust height for avatar
      const paperHeightValue = isAvatar ? paperHeight * 5 : paperHeight;

      // Calculate x position
      let x;
      if (isAvatar) {
        // Center the avatar
        x = containerWidth / 2 - paperWidth / 2;
      } else {
        // Normal distribution for emojis (more in the middle, fewer at edges)
        const normalValue = normalRandom(); // Value between roughly -1 and 1
        // Scale to container width and center it
        x = containerWidth * 0.5 + normalValue * containerWidth * 0.4;
        // Ensure within boundaries
        x = Math.max(
          paperWidth / 2,
          Math.min(containerWidth - paperWidth / 2, x)
        );
      }

      const y = -100 - index * 40; // Stagger initial Y position

      // Random initial rotation and velocity
      const angle = (Math.random() - 0.5) * 0.8;
      const vx = (Math.random() - 0.5) * 2;

      const paperBody = Bodies.rectangle(x, y, paperWidth, paperHeightValue, {
        // chamfer: { radius: 5 },
        render: {
          fillStyle: "transparent",
          lineWidth: 0,
        },
        friction: 0.8,
        restitution: 0.3,
      });

      Body.setVelocity(paperBody, { x: vx, y: 0 });
      Body.setAngle(paperBody, angle);

      // Store paper data for custom rendering
      papersRef.current.push({
        body: paperBody,
        title: title,
        width: paperWidth,
        height: paperHeightValue,
        isAvatar, // Store isAvatar flag to use in rendering
      });

      return paperBody;
    };

    // Add papers staggered
    const paperBodies: Matter.Body[] = [];
    const addPaperTimeouts: NodeJS.Timeout[] = []; // Store timeouts for cleanup

    // First drop emojis
    const initialDelayTimeout = setTimeout(() => {
      emojis.forEach((emoji, index) => {
        const timeoutId = setTimeout(() => {
          const paperBody = createPaper(emoji, index, false);
          if (paperBody) {
            World.add(world, paperBody);
            paperBodies.push(paperBody);
          }
        }, index * 100); // Drop emojis faster
        addPaperTimeouts.push(timeoutId);
      });

      // Then drop the avatar after all emojis have been added
      const avatarDelayTimeout = setTimeout(
        () => {
          const paperBody = createPaper(avatar, emojis.length, true);
          if (paperBody) {
            World.add(world, paperBody);
            paperBodies.push(paperBody);
          }
        },
        emojis.length * 100 + 1000
      ); // Wait for emojis to drop + 1 second delay

      addPaperTimeouts.push(avatarDelayTimeout);
    }, 500); // Initial delay before starting

    // Create runner
    const runner = Runner.create();
    runnerRef.current = runner;

    // Run the engine
    Runner.run(runner, engine);
    // Run the renderer
    Render.run(render);

    // --- Custom Text Rendering using 'afterRender' event ---
    const handleAfterRender = () => {
      const context = render.context; // Get the canvas context from the renderer
      if (!context) return;

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "white"; // Text color

      papersRef.current.forEach((paperData) => {
        const { body, title, isAvatar } = paperData;
        // Ensure the body still exists in the world (it might be removed)
        if (Composite.get(world, body.id, body.type)) {
          const { x, y } = body.position;
          const angle = body.angle;

          // Use larger font size for avatar
          const emojiSize = isAvatar ? fontSize * 4 : fontSize;
          context.font = `bold ${emojiSize}px Helvetica Neue`;

          context.save();
          context.translate(x, y);
          context.rotate(angle);
          context.fillText(title, 0, 0);
          context.restore();
        }
      });
    };

    Events.on(render, "afterRender", handleAfterRender);
    // --- End Custom Text Rendering ---

    // --- Resize Handler ---
    const handleResize = () => {
      // Check refs and container again
      if (!renderRef.current || !containerRef.current || !engineRef.current)
        return;
      const render = renderRef.current; // Use stored ref

      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      // Update render bounds
      render.bounds.max.x = newWidth;
      render.bounds.max.y = newHeight;
      render.options.width = newWidth;
      render.options.height = newHeight;
      render.canvas.width = newWidth;
      render.canvas.height = newHeight;

      // Update ground and wall positions/vertices
      Body.setPosition(ground, {
        x: newWidth / 2,
        y: newHeight + 30,
      });
      Body.setVertices(
        ground,
        Matter.Vertices.fromPath(
          `L 0 0 L ${newWidth} 0 L ${newWidth} 60 L 0 60`
        )
      );

      Body.setPosition(rightWall, {
        x: newWidth + 30,
        y: newHeight / 2,
      });
      Body.setVertices(
        rightWall,
        Matter.Vertices.fromPath(
          `L 0 0 L 60 0 L 60 ${newHeight} L 0 ${newHeight}`
        )
      );

      Body.setPosition(leftWall, {
        x: -30,
        y: newHeight / 2,
      });
      Body.setVertices(
        leftWall,
        Matter.Vertices.fromPath(
          `L 0 0 L 60 0 L 60 ${newHeight} L 0 ${newHeight}`
        )
      );
    };

    window.addEventListener("resize", handleResize);
    // --- End Resize Handler ---

    // Cleanup function
    return () => {
      // Clear timeouts
      clearTimeout(initialDelayTimeout);
      addPaperTimeouts.forEach(clearTimeout);

      window.removeEventListener("resize", handleResize);
      containerRef.current?.removeEventListener("click", handleClick);

      // Remove the afterRender listener
      if (renderRef.current) {
        Events.off(renderRef.current, "afterRender", handleAfterRender); // Use Events.off
        Render.stop(renderRef.current);
        if (renderRef.current.canvas && renderRef.current.canvas.parentNode) {
          renderRef.current.canvas.remove();
        }
      }

      // Stop the runner
      if (runnerRef.current) {
        Runner.stop(runnerRef.current);
      }

      // Clear the engine and world
      if (engineRef.current) {
        World.clear(engineRef.current.world, false);
        Engine.clear(engineRef.current);
      }

      // Reset refs
      renderRef.current = null;
      engineRef.current = null;
      runnerRef.current = null;
      papersRef.current = [];

      // Forcefully remove any canvas orphans if cleanup is imperfect
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector("canvas");
        if (canvas) {
          canvas.remove();
        }
      }
    };
  }, [avatar]); // Re-run effect if paperInsights changes

  if (!avatar) return null; // Render nothing if no data

  return (
    <div
      ref={containerRef}
      className="w-screen h-dvh overflow-hidden absolute bottom-0 cursor-pointer"
    >
      {topPercentage && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
          <div className="font-rounded-bold text-[120px] sm:text-[160px] text-[#FFE28A] leading-none">
            {topPercentage}
          </div>
        </div>
      )}
    </div>
  );
};

export default PercentileSlide;
