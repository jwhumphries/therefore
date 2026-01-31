import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "motion/react";

const BAR_COUNT = 30;
const INITIAL_WIDTH = 20;
const MAX_WIDTH = 35;

interface ScrollProgressBarsProps {
  /** Ref to the content element to track scroll progress within */
  contentRef: React.RefObject<HTMLElement | null>;
}

/**
 * Calculates bar width based on scroll position
 * Three-bar pattern: center at max, adjacent bars at 50%
 * Smooth transitions as scroll position changes
 */
function calculateBarWidth(
  barIndex: number,
  totalBars: number,
  scrollProgress: number
): number {
  const percentilePosition = (barIndex + 1) / totalBars;
  const barSpacing = 1 / totalBars;
  const distance = Math.abs(percentilePosition - scrollProgress);
  const minWidth = INITIAL_WIDTH / 5;

  // Center bar (within half a bar spacing)
  if (distance < barSpacing * 0.5) {
    // Smooth transition to full width as we approach center
    const t = 1 - distance / (barSpacing * 0.5);
    return minWidth + (MAX_WIDTH - minWidth) * t;
  }
  // Adjacent bars (within 1.5 bar spacings)
  if (distance < barSpacing * 1.5) {
    // Smooth transition for adjacent bars (50% max)
    const t = 1 - (distance - barSpacing * 0.5) / barSpacing;
    return minWidth + (MAX_WIDTH * 0.5 - minWidth) * t;
  }
  // All other bars at minimum
  return minWidth;
}

interface BarProps {
  index: number;
  scrollYProgress: MotionValue<number>;
}

function Bar({ index, scrollYProgress }: BarProps) {
  const width = useTransform(scrollYProgress, (progress) =>
    calculateBarWidth(index, BAR_COUNT, progress)
  );

  return (
    <motion.div
      className="scroll-progress-bar h-[0.2vh] min-h-[0.5px]"
      style={{ width }}
    />
  );
}

export function ScrollProgressBars({ contentRef }: ScrollProgressBarsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: contentRef,
    // Start tracking when top of content hits top of viewport
    // End when bottom of content hits bottom of viewport
    offset: ["start start", "end end"],
  });

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-start justify-between h-full"
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <Bar key={i} index={i} scrollYProgress={scrollYProgress} />
      ))}
    </div>
  );
}
