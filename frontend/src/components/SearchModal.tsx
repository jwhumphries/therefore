import { useState, useMemo, useCallback } from "react";
import { Modal, Input, Skeleton } from "@heroui/react";
import Fuse, { type IFuseOptions } from "fuse.js";
import { usePosts, type PostListItem } from "../hooks/api";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";

const FUSE_OPTIONS: IFuseOptions<PostListItem> = {
  keys: [
    { name: "title", weight: 0.4 },
    { name: "summary", weight: 0.3 },
    { name: "tags", weight: 0.2 },
    { name: "series", weight: 0.1 },
  ],
  threshold: 0.3,           // Stricter matching (0 = exact, 1 = match anything)
  distance: 50,             // How close matches must be to expected location
  ignoreLocation: false,    // Prefer matches at the beginning of strings
  includeMatches: true,
  includeScore: true,       // Include score for potential sorting
  minMatchCharLength: 2,
  shouldSort: true,
  findAllMatches: false,    // Stop at first good match (favors exact matches)
};

interface SearchModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
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
    return fuse.search(query, { limit: 8 });
  }, [fuse, query]);

  const handleSelect = useCallback((slug: string) => {
    onOpenChange(false);
    navigate(`/posts/${slug}`);
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
                {results.map(({ item, matches }) => {
                  const titleMatch = matches?.find(m => m.key === "title");
                  const summaryMatch = matches?.find(m => m.key === "summary");

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
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                        <time dateTime={item.publishDate}>
                          {new Date(item.publishDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                        {item.tags && item.tags.length > 0 && (
                          <>
                            <span>&middot;</span>
                            <span>{item.tags.slice(0, 3).join(", ")}</span>
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

