import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SeriesTimeline } from "./SeriesTimeline";

interface SeriesAccordionProps {
  series: string;
  count: number;
}

export function SeriesAccordion({ series, count }: SeriesAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-2 border-border mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left p-8 flex items-baseline justify-between transition-colors cursor-pointer ${
          isOpen ? "bg-surface" : "bg-background hover:bg-surface/50"
        }`}
        aria-expanded={isOpen}
      >
        <span className="text-4xl font-display font-bold">{series}</span>
        <span className="text-xl text-muted font-mono">{count} Part{count !== 1 ? 's' : ''}</span>
      </button>

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
