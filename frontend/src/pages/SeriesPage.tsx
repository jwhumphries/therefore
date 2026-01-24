import { useSeries } from "../hooks/api";
import { SeriesAccordion } from "../components/SeriesAccordion";
import { Skeleton } from "@heroui/react";

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

export function SeriesPage() {
  const { data, isLoading, error } = useSeries();

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
      <h1 className="text-4xl font-display font-bold mb-8">Series</h1>
      <div className="space-y-6">
        {data.map((s) => (
          <SeriesAccordion
            key={s.series}
            series={s.series}
            count={s.count}
            topTags={s.topTags}
          />
        ))}
      </div>
    </div>
  );
}
