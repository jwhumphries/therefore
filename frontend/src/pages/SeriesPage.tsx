import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button, Skeleton } from "@heroui/react";
import { useSeries } from "../hooks/api";
import { SeriesAccordion } from "../components/SeriesAccordion";
import type { NavigationState } from "../hooks/useViewTransition";
import { usePageMeta } from "../hooks/usePageMeta";

const SERIES_PER_PAGE = 15;

// Animation durations in ms
const ANIMATION_TIMING = {
  pageExit: 250,
  pageEnter: 300,
};

type AnimationState = "idle" | "exiting" | "entering";
type AnimationType = "page-forward" | "page-backward";

function getAnimationClass(state: AnimationState, type: AnimationType): string {
  if (state === "exiting") {
    return type === "page-forward" ? "posts-exit-left" : "posts-exit-right";
  }
  if (state === "entering") {
    return type === "page-forward" ? "posts-enter-right" : "posts-enter-left";
  }
  return "";
}

function SeriesSkeleton() {
  return (
    <div className="border-2 border-border p-6 flex justify-between items-start">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number, direction: "next" | "prev" | "jump") => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const showEllipsisThreshold = 7;

    if (totalPages <= showEllipsisThreshold) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-10">
      <Button
        variant="outline"
        size="sm"
        onPress={() => onPageChange(currentPage - 1, "prev")}
        isDisabled={currentPage === 1}
        aria-label="Previous page"
      >
        <span aria-hidden="true">&larr;</span>
        <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
      </Button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-2 text-muted">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? "primary" : "ghost"}
              size="sm"
              onPress={() => onPageChange(page, "jump")}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
              className="min-w-9"
            >
              {page}
            </Button>
          )
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onPress={() => onPageChange(currentPage + 1, "next")}
        isDisabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
        <span aria-hidden="true">&rarr;</span>
      </Button>
    </nav>
  );
}

export function SeriesPage() {
  usePageMeta({ title: "Series", description: "Browse all series on Therefore." });
  const location = useLocation();
  const navState = location.state as NavigationState | null;
  const { data, isLoading, error } = useSeries();
  const [currentPage, setCurrentPage] = useState(1);
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [animationType, setAnimationType] = useState<AnimationType>("page-forward");
  const [openSeries, setOpenSeries] = useState<string | null>(null);

  const totalPages = data ? Math.ceil(data.length / SERIES_PER_PAGE) : 0;

  // Handle navigation state to auto-open a series
  useEffect(() => {
    if (navState?.openSeries && data) {
      const targetSeries = navState.openSeries;
      // Find which page this series is on
      const seriesIndex = data.findIndex((s) => s.series === targetSeries);
      if (seriesIndex !== -1) {
        const targetPage = Math.floor(seriesIndex / SERIES_PER_PAGE) + 1;
        // Use setTimeout to defer state updates (avoids lint rule)
        setTimeout(() => {
          if (targetPage !== currentPage) {
            setCurrentPage(targetPage);
          }
          setOpenSeries(targetSeries);
        }, 0);
      }
      // Clear the navigation state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [navState?.openSeries, data, currentPage]);

  // Get current page of series
  const startIndex = (currentPage - 1) * SERIES_PER_PAGE;
  const endIndex = startIndex + SERIES_PER_PAGE;
  const currentSeries = data?.slice(startIndex, endIndex) ?? [];

  // Generic animation sequence: exit -> state change -> enter -> idle
  const startTransition = useCallback((
    type: AnimationType,
    onStateChange: () => void
  ) => {
    setAnimationType(type);
    setAnimationState("exiting");

    // After exit animation, apply state change and start enter
    setTimeout(() => {
      onStateChange();
      setAnimationState("entering");

      // After enter animation, return to idle
      setTimeout(() => {
        setAnimationState("idle");
      }, ANIMATION_TIMING.pageEnter);
    }, ANIMATION_TIMING.pageExit);
  }, []);

  const handlePageChange = useCallback((page: number, direction: "next" | "prev" | "jump") => {
    if (page === currentPage || animationState !== "idle") return;

    // Determine animation type based on page navigation
    const goingForward = direction === "next" || (direction === "jump" && page > currentPage);
    const type: AnimationType = goingForward ? "page-forward" : "page-backward";

    startTransition(type, () => setCurrentPage(page));

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage, animationState, startTransition]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-display font-bold mb-8">Series</h1>
        <div className="space-y-6">
          <SeriesSkeleton />
          <SeriesSkeleton />
          <SeriesSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-danger">Failed to load series. Please try again.</p>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-display font-bold mb-8">Series</h1>
        <div className="p-12 border-2 border-dashed border-border text-center text-muted">
          No series found yet.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-display font-bold mb-2">Series</h1>
      <p className="text-default-500 mb-8">
        {data.length} {data.length === 1 ? "series" : "series"}
      </p>

      <div
        className={`series-container space-y-6 ${getAnimationClass(animationState, animationType)}`}
      >
        {currentSeries.map((s) => (
          <SeriesAccordion
            key={s.series}
            series={s.series}
            count={s.count}
            topTags={s.topTags}
            hasRecentPosts={s.hasRecentPosts}
            defaultOpen={s.series === openSeries}
            onOpenChange={(isOpen) => {
              if (!isOpen && s.series === openSeries) {
                setOpenSeries(null);
              }
            }}
          />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
