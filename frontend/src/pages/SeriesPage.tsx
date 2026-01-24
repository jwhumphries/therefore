import { useSeries } from "../hooks/api";
import { SeriesAccordion } from "../components/SeriesAccordion";
import { Skeleton } from "@heroui/react";

function SeriesSkeleton() {
    return (
        <div className="border-2 border-border mb-6 p-8 flex justify-between items-baseline">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-20" />
        </div>
    );
}

export function SeriesPage() {
  const { data, isLoading, error } = useSeries();

  if (isLoading) {
    return (
        <div className="max-w-3xl mx-auto pt-8">
            <header className="mb-12">
                <h1 className="text-5xl font-display font-bold mb-4">Studies</h1>
                <p className="text-xl text-muted">
                    Sequential collections of essays and logical progressions.
                </p>
            </header>
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
        <div className="max-w-3xl mx-auto pt-12 text-center">
            <p className="text-danger text-xl">Failed to load series. Please try again.</p>
        </div>
     );
  }

  if (!data?.length) {
    return (
        <div className="max-w-3xl mx-auto pt-12">
            <header className="mb-12">
                <h1 className="text-5xl font-display font-bold mb-4">Studies</h1>
                <p className="text-xl text-muted">
                    Sequential collections of essays and logical progressions.
                </p>
            </header>
            <div className="p-12 border-2 border-dashed border-border text-center text-muted">
                No series found yet.
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-8">
      <header className="mb-12">
        <h1 className="text-5xl font-display font-bold mb-4">Studies</h1>
        <p className="text-xl text-muted">
          Sequential collections of essays and logical progressions.
        </p>
      </header>

      <div className="space-y-6">
        {data.map((s) => (
          <SeriesAccordion key={s.series} series={s.series} count={s.count} />
        ))}
      </div>
    </div>
  );
}
