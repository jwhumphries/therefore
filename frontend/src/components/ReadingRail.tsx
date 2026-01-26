import { Chip, Skeleton } from "@heroui/react";
import { useSeries } from "../hooks/api";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";

function RailSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="w-0.5 h-12 mt-2" />
          </div>
          <div className="flex-1 pt-0.5">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReadingRail() {
  const { data, isLoading } = useSeries();
  const navigate = useViewTransitionNavigate();

  // Filter to only active series (those with recent posts - within 30 days)
  // The API already sorts active series first, so we just take those
  const activeSeries = data?.filter((s) => s.hasRecentPosts) ?? [];

  // If no active series, show up to 3 most popular series
  const displaySeries = activeSeries.length > 0
    ? activeSeries.slice(0, 5)
    : data?.slice(0, 3) ?? [];

  const handleSeriesClick = (series: string) => {
    // Navigate to series page with state to auto-open the accordion
    navigate("/series", { openSeries: series });
  };

  if (isLoading) {
    return (
      <nav aria-label="Reading Rail">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Active Series
        </h2>
        <RailSkeleton />
      </nav>
    );
  }

  if (displaySeries.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Timeline of Thought">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
        {activeSeries.length > 0 ? "Active Series" : "Popular Series"}
      </h2>

      <div className="relative">
        {/* Vertical timeline line */}
        <div
          className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-border"
          aria-hidden="true"
        />

        <ul className="space-y-4">
          {displaySeries.map((series, index) => (
            <li key={series.series}>
              <button
                onClick={() => handleSeriesClick(series.series)}
                className="flex gap-3 w-full text-left group"
              >
                {/* Timeline node */}
                <div className="flex flex-col items-center flex-shrink-0 z-10">
                  <div
                    className={`w-3 h-3 rounded-full border-2 transition-colors ${
                      series.hasRecentPosts
                        ? "bg-accent border-accent"
                        : "bg-background border-muted group-hover:border-accent"
                    }`}
                    aria-hidden="true"
                  />
                  {/* Connector line to next node */}
                  {index < displaySeries.length - 1 && (
                    <div className="w-0.5 flex-1 bg-transparent" aria-hidden="true" />
                  )}
                </div>

                {/* Series info */}
                <div className="flex-1 min-w-0 pt-0.5 -mt-0.5">
                  <span className="block text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
                    {series.series}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted">
                      {series.count} {series.count === 1 ? "part" : "parts"}
                    </span>
                    {series.hasRecentPosts && (
                      <Chip size="sm" color="accent" className="scale-75 origin-left">
                        New
                      </Chip>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Link to all series */}
      {data && data.length > displaySeries.length && (
        <button
          onClick={() => navigate("/series")}
          className="mt-4 text-xs text-muted hover:text-accent transition-colors"
        >
          View all {data.length} series &rarr;
        </button>
      )}
    </nav>
  );
}

/**
 * Mobile version - collapsible section for the bottom of pages
 */
export function ReadingRailMobile({ className = "" }: { className?: string }) {
  const { data, isLoading } = useSeries();
  const navigate = useViewTransitionNavigate();

  const activeSeries = data?.filter((s) => s.hasRecentPosts) ?? [];

  if (isLoading || activeSeries.length === 0) {
    return null;
  }

  const handleSeriesClick = (series: string) => {
    navigate("/series", { openSeries: series });
  };

  return (
    <section className={className} aria-label="Recently Updated Series">
      <h2 className="text-lg font-display font-semibold mb-3">
        Recently Updated Series
      </h2>
      <div className="flex flex-wrap gap-2">
        {activeSeries.slice(0, 4).map((series) => (
          <button
            key={series.series}
            onClick={() => handleSeriesClick(series.series)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-full text-sm transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
            {series.series}
          </button>
        ))}
      </div>
    </section>
  );
}
