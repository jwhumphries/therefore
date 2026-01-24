import { useState, useEffect, useCallback, useRef } from "react";

export interface Heading {
  id: string;
  text: string;
  level: number;
}

interface UseScrollspyOptions {
  /** Container element to find headings in */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Ref to the TOC element itself for dynamic horizon calculation */
  tocRef?: React.RefObject<HTMLElement | null>;
  /** Throttle delay in ms */
  throttleMs?: number;
}

/**
 * Extract headings from a container element
 */
function extractHeadings(container: HTMLElement | null): Heading[] {
  if (!container) return [];

  const headingElements = container.querySelectorAll<HTMLElement>(
    "h2[id], h3[id]"
  );
  const extracted: Heading[] = [];

  headingElements.forEach((el) => {
    extracted.push({
      id: el.id,
      text: el.textContent ?? "",
      level: parseInt(el.tagName.charAt(1), 10),
    });
  });

  return extracted;
}

/**
 * Get header height from CSS variable or default
 */
function getHeaderHeight(): number {
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue("--header-height");
  if (value) {
    // Parse rem value (e.g., "4rem" -> 64)
    const match = value.match(/^([\d.]+)rem$/);
    if (match) {
      const fontSize = parseFloat(getComputedStyle(root).fontSize);
      return parseFloat(match[1]) * fontSize;
    }
    // Parse px value
    const pxMatch = value.match(/^([\d.]+)px$/);
    if (pxMatch) {
      return parseFloat(pxMatch[1]);
    }
  }
  return 64; // Default fallback
}

/**
 * Custom hook for table of contents scrollspy
 * Uses getBoundingClientRect with reverse iteration for efficient TOC highlighting
 */
export function useScrollspy({
  containerRef,
  tocRef,
  throttleMs = 10,
}: UseScrollspyOptions) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sectionsRef = useRef<HTMLElement[]>([]);
  const horizonRef = useRef<number>(100);
  const initializedRef = useRef(false);

  // Update horizon based on TOC position (like swup-docs)
  const updateHorizon = useCallback(() => {
    if (tocRef?.current) {
      // Dynamic: TOC's top position + small buffer
      horizonRef.current = tocRef.current.getBoundingClientRect().top + 50;
    } else {
      // Fallback: header height + buffer
      horizonRef.current = getHeaderHeight() + 40;
    }
  }, [tocRef]);

  // Extract headings from container when it changes
  const updateHeadings = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const extracted = extractHeadings(container);
    setHeadings(extracted);

    // Store elements in reverse order for efficient lookup
    const headingElements = container.querySelectorAll<HTMLElement>(
      "h2[id], h3[id]"
    );
    sectionsRef.current = [...headingElements].reverse();

    // Set initial active heading (only once)
    if (extracted.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      setActiveId(extracted[0].id);
    }
  }, [containerRef]);

  // Schedule heading extraction after render
  useEffect(() => {
    const frame = requestAnimationFrame(updateHeadings);
    return () => cancelAnimationFrame(frame);
  }, [updateHeadings]);

  // Update horizon on mount and resize
  useEffect(() => {
    updateHorizon();
    window.addEventListener("resize", updateHorizon, { passive: true });
    return () => window.removeEventListener("resize", updateHorizon);
  }, [updateHorizon]);

  // Get the currently active section using reverse iteration
  const getCurrentSection = useCallback(() => {
    const sections = sectionsRef.current;
    if (!sections.length) return null;

    const firstSection = sections[sections.length - 1]; // First in document order
    const lastSection = sections[0]; // Last in document order

    // If at the bottom of the document, return the last section
    const scrolledToBottom =
      window.scrollY >=
      document.documentElement.scrollHeight - window.innerHeight - 5;
    if (scrolledToBottom) {
      return lastSection;
    }

    // Find the first section (from bottom) that is above the horizon
    const current = sections.find((section) => {
      const rect = section.getBoundingClientRect();
      // Skip invisible sections
      if (!rect.height) return false;
      return rect.top < horizonRef.current;
    });

    return current || firstSection;
  }, []);

  // Update active section on scroll
  useEffect(() => {
    if (!headings.length) return;

    let lastCall = 0;

    const handleScroll = () => {
      const now = performance.now();
      if (now - lastCall < throttleMs) return;
      lastCall = now;

      const currentSection = getCurrentSection();
      if (currentSection) {
        setActiveId(currentSection.id);
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings, getCurrentSection, throttleMs]);

  // Smooth scroll to a heading with easing
  const scrollToHeading = useCallback((id: string) => {
    const targetElement = document.getElementById(id);
    if (!targetElement) return;

    const headerHeight = getHeaderHeight();
    const targetRect = targetElement.getBoundingClientRect();
    const targetY = window.scrollY + targetRect.top - headerHeight - 16; // header + breathing room
    const startY = window.scrollY;
    const distance = targetY - startY;

    // Dynamic duration based on distance (200ms min, 600ms max)
    const duration = Math.min(Math.max(Math.abs(distance) * 0.5, 200), 600);
    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, startY + distance * eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Update URL hash without triggering scroll
        history.pushState(null, "", `#${id}`);
      }
    }

    requestAnimationFrame(step);
  }, []);

  return {
    headings,
    activeId,
    scrollToHeading,
  };
}
