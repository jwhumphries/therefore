import { useState, useMemo, useCallback } from "react";
import { Modal, Input, Skeleton } from "@heroui/react";
import Fuse, { type IFuseOptions, type FuseResult } from "fuse.js";
import { usePosts, type PostListItem } from "../hooks/api";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";

const FUSE_OPTIONS: IFuseOptions<PostListItem> = {
  keys: [
    { name: "title", weight: 0.35 },
    { name: "summary", weight: 0.25 },
    { name: "searchContent", weight: 0.2 },
    { name: "tags", weight: 0.15 },
    { name: "series", weight: 0.05 },
  ],
  threshold: 0.35,
  distance: 100,
  ignoreLocation: false,
  includeMatches: true,
  includeScore: true,
  minMatchCharLength: 2,
  shouldSort: true,
  findAllMatches: false,
};

interface SearchModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface SeriesGroup {
  series: string;
  count: number;
  posts: FuseResult<PostListItem>[];
}

function SearchResultSkeleton() {
  return (
    <div className="p-3">
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

function HighlightedText({ text, indices }: { text: string; indices?: readonly [number, number][] }) {
  if (!indices || indices.length === 0) {
    return <>{text}</>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  indices.forEach(([start, end], i) => {
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    parts.push(
      <mark key={i} className="bg-accent/30 text-foreground rounded px-0.5">
        {text.slice(start, end + 1)}
      </mark>
    );
    lastIndex = end + 1;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

function SeriesCard({
  series,
  count,
  onSelect,
}: {
  series: string;
  count: number;
  onSelect: () => void;
}) {
  return (
    <li
      role="option"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="p-3 rounded-lg cursor-pointer bg-surface/50 hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors border border-border"
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
        <h3 className="font-display font-semibold text-foreground">
          Series: {series}
        </h3>
      </div>
      <p className="text-sm text-muted mt-1 ml-4">
        {count} matching {count === 1 ? "post" : "posts"} in this series
      </p>
    </li>
  );
}

export function SearchModal({ isOpen, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const { data, isLoading } = usePosts();
  const navigate = useViewTransitionNavigate();

  // Reset query when closing modal
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      // Delay reset to after close animation
      setTimeout(() => setQuery(""), 200);
    }
    onOpenChange(open);
  }, [onOpenChange]);

  const posts = data?.posts;
  const fuse = useMemo(() => {
    if (!posts) return null;
    return new Fuse(posts, FUSE_OPTIONS);
  }, [posts]);

  const results = useMemo(() => {
    if (!fuse || query.length < 2) return [];
    return fuse.search(query, { limit: 12 });
  }, [fuse, query]);

  // Group results by series and find the top series
  const { topSeries, showSeriesCard } = useMemo(() => {
    if (results.length <= 1) {
      return { topSeries: null, showSeriesCard: false };
    }

    // Group by series
    const seriesGroups = new Map<string, SeriesGroup>();
    for (const result of results) {
      const series = result.item.series;
      if (series) {
        const existing = seriesGroups.get(series);
        if (existing) {
          existing.count++;
          existing.posts.push(result);
        } else {
          seriesGroups.set(series, { series, count: 1, posts: [result] });
        }
      }
    }

    // Find series with most matches
    let top: SeriesGroup | null = null;
    for (const group of seriesGroups.values()) {
      if (!top || group.count > top.count) {
        top = group;
      }
    }

    // Only show series card if:
    // - There's a series with 2+ matches
    // - There's more than one unique series (or some posts without series)
    const uniqueSeriesCount = seriesGroups.size;
    const postsWithoutSeries = results.filter((r) => !r.item.series).length;
    const hasVariety = uniqueSeriesCount > 1 || postsWithoutSeries > 0;

    const shouldShow = top !== null && top.count >= 2 && hasVariety;

    return { topSeries: top, showSeriesCard: shouldShow };
  }, [results]);

  const handleSelect = useCallback((slug: string) => {
    onOpenChange(false);
    navigate(`/posts/${slug}`);
  }, [onOpenChange, navigate]);

  const handleSeriesSelect = useCallback((series: string) => {
    onOpenChange(false);
    navigate("/series", { openSeries: series });
  }, [onOpenChange, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, slug: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(slug);
    }
  }, [handleSelect]);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      variant="blur"
    >
      <Modal.Container placement="top" size="lg">
        <Modal.Dialog className="mt-[10vh] sm:mt-[15vh] sm:max-w-2xl">
          <Modal.Header className="pb-0">
            <div className="w-full">
              <Input
                autoFocus
                placeholder="Search posts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full text-lg"
                aria-label="Search posts"
              />
            </div>
          </Modal.Header>
          <Modal.Body className="px-2 py-3 min-h-[200px] max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2">
                <SearchResultSkeleton />
                <SearchResultSkeleton />
                <SearchResultSkeleton />
              </div>
            ) : query.length < 2 ? (
              <p className="text-center text-muted py-8">
                Type at least 2 characters to search
              </p>
            ) : results.length === 0 ? (
              <p className="text-center text-muted py-8">
                No posts found for "{query}"
              </p>
            ) : (
              <ul className="space-y-1" role="listbox">
                {/* Series card - shown at top if applicable */}
                {showSeriesCard && topSeries && (
                  <SeriesCard
                    series={topSeries.series}
                    count={topSeries.count}
                    onSelect={() => handleSeriesSelect(topSeries.series)}
                  />
                )}

                {/* Individual post results */}
                {results.map(({ item, matches }) => {
                  const titleMatch = matches?.find(m => m.key === "title");
                  const summaryMatch = matches?.find(m => m.key === "summary");
                  const contentMatch = matches?.find(m => m.key === "searchContent");

                  return (
                    <li
                      key={item.slug}
                      role="option"
                      tabIndex={0}
                      onClick={() => handleSelect(item.slug)}
                      onKeyDown={(e) => handleKeyDown(e, item.slug)}
                      className="p-3 rounded-lg cursor-pointer hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors"
                    >
                      <h3 className="font-display font-semibold text-foreground">
                        <HighlightedText
                          text={item.title}
                          indices={titleMatch?.indices}
                        />
                      </h3>
                      {item.summary && (
                        <p className="text-sm text-muted line-clamp-2 mt-1">
                          <HighlightedText
                            text={item.summary}
                            indices={summaryMatch?.indices}
                          />
                        </p>
                      )}
                      {/* Show content match snippet if no summary match */}
                      {!summaryMatch && contentMatch && item.searchContent && (
                        <p className="text-sm text-muted line-clamp-2 mt-1 italic">
                          ...{getMatchSnippet(item.searchContent, contentMatch.indices)}...
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                        <time dateTime={item.publishDate}>
                          {new Date(item.publishDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                        {item.series && (
                          <>
                            <span>&middot;</span>
                            <span className="text-accent">{item.series}</span>
                          </>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <>
                            <span>&middot;</span>
                            <span>{item.tags.slice(0, 2).join(", ")}</span>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Modal.Body>
          <Modal.Footer className="pt-0 pb-3 px-3">
            <div className="flex items-center justify-between w-full text-xs text-muted">
              <div className="flex items-center gap-3">
                <span><kbd className="px-1.5 py-0.5 bg-surface rounded text-xs">↑↓</kbd> navigate</span>
                <span><kbd className="px-1.5 py-0.5 bg-surface rounded text-xs">↵</kbd> select</span>
                <span><kbd className="px-1.5 py-0.5 bg-surface rounded text-xs">esc</kbd> close</span>
              </div>
            </div>
          </Modal.Footer>
          <Modal.CloseTrigger />
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

/**
 * Extract a snippet around the first match in the content
 */
function getMatchSnippet(
  text: string,
  indices: readonly [number, number][] | undefined,
  contextChars: number = 60
): string {
  if (!indices || indices.length === 0) {
    return text.slice(0, contextChars * 2);
  }

  const [start, end] = indices[0];
  const snippetStart = Math.max(0, start - contextChars);
  const snippetEnd = Math.min(text.length, end + contextChars);

  return text.slice(snippetStart, snippetEnd);
}
