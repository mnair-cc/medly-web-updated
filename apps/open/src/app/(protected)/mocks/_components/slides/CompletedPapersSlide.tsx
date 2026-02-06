import React, { useEffect, useRef } from "react";
import Matter from "matter-js";
import { PaperInsight } from "@/app/(protected)/mocks/_types/types";
import { deconstructSubjectLegacyId } from "@/app/_lib/utils/utils";

interface PaperData {
  body: Matter.Body;
  title: string;
  width: number;
  height: number;
}

const CompletedPapersSlide = ({
  paperInsights,
}: {
  paperInsights?: PaperInsight[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const papersRef = useRef<PaperData[]>([]); // Ref to store paper data for rendering
  const runnerRef = useRef<Matter.Runner | null>(null); // Ref for the runner

  useEffect(() => {
    if (!paperInsights || !containerRef.current) return;

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

    // Paper titles from props - use subjectId for subject name, extract paper number from paperId
    const titles = paperInsights.map((paperInsight) => {
      const { subjectTitle } = deconstructSubjectLegacyId(
        paperInsight.subjectId
      );

      // Extract paper number from paperId (e.g., "medlymock_xmas2025_aqaGCSEBio_higher_1" -> "1")
      const parts = paperInsight.paperId.split("_");
      const lastPart = parts[parts.length - 1];

      return `${subjectTitle} Paper ${lastPart}`;
    });

    // const titles = paperInsights.flatMap((paperInsight) => {
    //   const { examBoard, subjectTitle, mockPaperNumber } =
    //     deconstructMockPaperId(paperInsight.paperId);
    //   const title = `${subjectTitle} ${examBoard} Paper ${mockPaperNumber}`;
    //   // Duplicate each title 5 times
    //   return Array(5).fill(title);
    // });

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

    // Create paper bodies
    const fontSize = 64; // Adjusted font size for potentially smaller elements
    const paperHeight = 64;
    papersRef.current = []; // Reset papers on effect run

    const createPaper = (title: string, index: number) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.font = `bold ${fontSize}px Arial`; // Match font used in rendering
      const textWidth = ctx.measureText(title).width;
      const paperWidth = textWidth + 30; // Padding for text

      // Random initial position at the top, slightly offset
      const x =
        containerWidth * 0.2 + Math.random() * (containerWidth - paperWidth);
      const y = -100 - index * 80; // Stagger initial Y position

      // Random initial rotation and velocity
      const angle = (Math.random() - 0.5) * 0.8;
      const vx = (Math.random() - 0.5) * 2;

      const paperBody = Bodies.rectangle(x, y, paperWidth, paperHeight, {
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
        height: paperHeight,
      });

      return paperBody;
    };

    // Add papers staggered
    const paperBodies: Matter.Body[] = [];
    const addPaperTimeouts: NodeJS.Timeout[] = []; // Store timeouts for cleanup
    const initialDelayTimeout = setTimeout(() => {
      titles.forEach((title, index) => {
        const timeoutId = setTimeout(() => {
          const paperBody = createPaper(title, index);
          if (paperBody) {
            World.add(world, paperBody);
            paperBodies.push(paperBody);
          }
        }, index * 500);
        addPaperTimeouts.push(timeoutId); // Store timeout ID
      });
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
      context.font = `bold ${fontSize}px Helvetica Neue`; // Consistent font style
      context.fillStyle = "white"; // Text color

      papersRef.current.forEach((paperData) => {
        const { body, title } = paperData;
        // Ensure the body still exists in the world (it might be removed)
        if (Composite.get(world, body.id, body.type)) {
          const { x, y } = body.position;
          const angle = body.angle;

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
  }, [paperInsights]); // Re-run effect if paperInsights changes

  if (!paperInsights) return null; // Render nothing if no data

  return (
    <div
      ref={containerRef}
      className="w-screen h-dvh overflow-hidden absolute bottom-0 pointer-events-none" // Ensure container has dimensions and hides overflow
      style={{}} // Set background color
    ></div>
  );
};

export default CompletedPapersSlide;
