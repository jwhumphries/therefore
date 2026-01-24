import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SeriesTimeline } from "./SeriesTimeline";
import { TagLink } from "./TagLink";

interface SeriesAccordionProps {
  series: string;
  count: number;
  topTags?: string[];
}

export function SeriesAccordion({ series, count, topTags }: SeriesAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-2 border-border">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full text-left p-6 flex items-start justify-between transition-colors cursor-pointer ${
          isOpen ? "bg-surface" : "bg-background hover:bg-surface/50"
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-display font-semibold">{series}</span>
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
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-surface/30"
          >
            <SeriesTimeline series={series} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
