import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Chip } from "@heroui/react";
import { SeriesTimeline } from "./SeriesTimeline";
import { TagLink } from "./TagLink";

interface SeriesAccordionProps {
  series: string;
  count: number;
  topTags?: string[];
  hasRecentPosts?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function SeriesAccordion({
  series,
  count,
  topTags,
  hasRecentPosts,
  defaultOpen = false,
  onOpenChange,
}: SeriesAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const accordionRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  // Sync isOpen when defaultOpen changes (e.g., from navigation state)
  useEffect(() => {
    if (defaultOpen && !isOpen) {
      // Delay opening to let the page transition settle
      setTimeout(() => setIsOpen(true), 400);
    }
  }, [defaultOpen, isOpen]);

  // Scroll into view when opened via defaultOpen (from navigation)
  useEffect(() => {
    if (defaultOpen && !hasScrolled.current && accordionRef.current) {
      hasScrolled.current = true;
      // Delay scroll to sync with accordion opening, then animate smoothly
      setTimeout(() => {
        if (accordionRef.current) {
          // Calculate target position with offset for header
          const headerOffset = 80;
          const elementPosition = accordionRef.current.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }, 350);
    }
  }, [defaultOpen]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  };

  return (
    <div ref={accordionRef} className="border-2 border-border">
      <div
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
        className={`w-full text-left p-6 flex items-start justify-between transition-colors cursor-pointer ${
          isOpen ? "bg-surface" : "bg-background hover:bg-surface/50"
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-display font-semibold">{series}</span>
            {hasRecentPosts && (
              <Chip size="sm" color="accent">Recently Updated</Chip>
            )}
          </div>
          {topTags && topTags.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              {topTags.map((tag) => (
                <TagLink
                  key={tag}
                  tag={tag}
                  className="text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              ))}
            </div>
          )}
        </div>
        <span className="text-sm text-muted">{count} part{count !== 1 ? 's' : ''}</span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden bg-surface/30"
          >
            <SeriesTimeline series={series} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
