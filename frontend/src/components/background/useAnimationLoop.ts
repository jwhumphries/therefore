import { useEffect, useRef, useState } from "react";

export interface AnimationLoopState {
  /** Current animation time in milliseconds */
  time: number;
  /** Time since last frame in milliseconds */
  deltaTime: number;
  /** Whether animation is currently running */
  isRunning: boolean;
}

export interface UseAnimationLoopOptions {
  /** Callback function called each animation frame */
  onFrame: (state: AnimationLoopState) => void;
  /** Whether to pause when the page is hidden */
  pauseOnHidden?: boolean;
}

/**
 * Hook for managing a requestAnimationFrame loop
 * Handles delta time calculation, page visibility, and reduced motion preference
 */
export function useAnimationLoop({ onFrame, pauseOnHidden = true }: UseAnimationLoopOptions) {
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(true);
  const onFrameRef = useRef(onFrame);

  // Keep callback ref updated
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (!isRunningRef.current) {
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      const deltaTime = lastTimeRef.current ? timestamp - lastTimeRef.current : 16.67;
      lastTimeRef.current = timestamp;

      // Cap delta time to prevent huge jumps after tab switch
      const cappedDelta = Math.min(deltaTime, 100);
      accumulatedTimeRef.current += cappedDelta;

      onFrameRef.current({
        time: accumulatedTimeRef.current,
        deltaTime: cappedDelta,
        isRunning: true,
      });

      frameRef.current = requestAnimationFrame(loop);
    };

    // Start the loop
    frameRef.current = requestAnimationFrame(loop);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (pauseOnHidden) {
        if (document.hidden) {
          isRunningRef.current = false;
        } else {
          // Reset lastTime to prevent huge delta on resume
          lastTimeRef.current = 0;
          isRunningRef.current = true;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pauseOnHidden]);
}

/**
 * Hook to detect reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to track canvas dimensions with devicePixelRatio
 */
export function useCanvasDimensions(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
): { width: number; height: number; dpr: number } {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    const updateDimensions = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance

      setDimensions({
        width: rect.width,
        height: rect.height,
        dpr,
      });

      // Set actual canvas resolution
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Scale canvas display size
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    updateDimensions();

    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [canvasRef]);

  return dimensions;
}
