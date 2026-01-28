import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button, Card, Chip, Skeleton, Select, ListBox, Label } from "@heroui/react";
import type { Key } from "react-aria-components";
import { usePaginatedPosts, type PostsQueryOptions } from "../hooks/api";
import { TransitionLink } from "../components/TransitionLink";
import { TagLink } from "../components/TagLink";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";
import { usePageMeta } from "../hooks/usePageMeta";

const POSTS_PER_PAGE = 6;

// Animation durations in ms
const ANIMATION_TIMING = {
  pageExit: 250,
  pageEnter: 300,
  sortExit: 200,
  sortEnter: 250,
};

type SortOption = "date-desc" | "date-asc" | "title-asc" | "title-desc";
type AnimationState = "idle" | "exiting" | "entering";
type AnimationType = "page-forward" | "page-backward" | "sort";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
];

function parseSortOption(option: SortOption): { sortBy: "date" | "title"; sortOrder: "asc" | "desc" } {
  const [sortBy, sortOrder] = option.split("-") as ["date" | "title", "asc" | "desc"];
  return { sortBy, sortOrder };
}

function isNewPost(publishDate: string): boolean {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(publishDate).getTime() > sevenDaysAgo;
}

function getAnimationClass(state: AnimationState, type: AnimationType): string {
  if (state === "exiting") {
    switch (type) {
      case "page-forward": return "posts-exit-left";
      case "page-backward": return "posts-exit-right";
      case "sort": return "posts-exit-down";
    }
  }
  if (state === "entering") {
    switch (type) {
      case "page-forward": return "posts-enter-right";
      case "page-backward": return "posts-enter-left";
      case "sort": return "posts-enter-up";
    }
  }
  return "";
}

function getAnimationDurations(type: AnimationType): { exit: number; enter: number } {
  if (type === "sort") {
    return { exit: ANIMATION_TIMING.sortExit, enter: ANIMATION_TIMING.sortEnter };
  }
  return { exit: ANIMATION_TIMING.pageExit, enter: ANIMATION_TIMING.pageEnter };
}

function PostCardSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-7 w-3/4 mb-3" />
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-4" />
    </Card>
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

export function TagPage() {
  const { tag } = useParams<{ tag: string }>();
  usePageMeta(tag ? { title: `Posts tagged "${tag}"`, description: `All posts tagged "${tag}" on Therefore.` } : {});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [animationType, setAnimationType] = useState<AnimationType>("page-forward");

  const { sortBy, sortOrder } = parseSortOption(sortOption);

  const queryOptions: PostsQueryOptions = {
    tag,
    limit: POSTS_PER_PAGE,
    offset: (currentPage - 1) * POSTS_PER_PAGE,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, error } = usePaginatedPosts(queryOptions);
  const navigate = useViewTransitionNavigate();

  const totalPages = data ? Math.ceil(data.total / POSTS_PER_PAGE) : 0;

  // Generic animation sequence: exit -> state change -> enter -> idle
  const startTransition = useCallback((
    type: AnimationType,
    onStateChange: () => void
  ) => {
    const { exit, enter } = getAnimationDurations(type);
    setAnimationType(type);
    setAnimationState("exiting");

    // After exit animation, apply state change and start enter
    setTimeout(() => {
      onStateChange();
      setAnimationState("entering");

      // After enter animation, return to idle
      setTimeout(() => {
        setAnimationState("idle");
      }, enter);
    }, exit);
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

  const handleSortChange = useCallback((value: Key | null) => {
    if (value && typeof value === "string" && animationState === "idle") {
      const newSort = value as SortOption;
      if (newSort !== sortOption) {
        // Animate with sort shuffle effect, optionally reset to page 1
        startTransition("sort", () => {
          setSortOption(newSort);
          if (currentPage !== 1) {
            setCurrentPage(1);
          }
        });
      }
    }
  }, [sortOption, currentPage, animationState, startTransition]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <nav className="mb-8">
          <TransitionLink
            to="/tags"
            className="text-default-500 hover:text-primary transition-colors"
          >
            &larr; All Tags
          </TransitionLink>
        </nav>
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-6 w-24 mb-8" />
        <div className="space-y-6">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Failed to load posts. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <nav className="mb-8">
        <TransitionLink
          to="/tags"
          className="text-default-500 hover:text-primary transition-colors"
        >
          &larr; All Tags
        </TransitionLink>
      </nav>
      <h1 className="text-4xl font-display font-bold mb-2">
        Posts tagged &ldquo;{tag}&rdquo;
      </h1>
      <div className="flex items-center justify-between mb-8">
        <p className="text-default-500">
          {data?.total ?? 0} {data?.total === 1 ? "post" : "posts"}
        </p>

        <Select
          className="w-44"
          value={sortOption}
          onChange={handleSortChange}
          aria-label="Sort posts"
        >
          <Label className="sr-only">Sort by</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {SORT_OPTIONS.map((option) => (
                <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                  {option.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {!data?.posts.length ? (
        <p className="text-default-500">No posts found with this tag.</p>
      ) : (
        <>
          {/* Posts container with page transition animations */}
          <div
            className={`posts-container space-y-6 ${getAnimationClass(animationState, animationType)}`}
          >
            {data.posts.map((post) => (
              <article
                key={post.slug}
                onClick={() => navigate(`/posts/${post.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/posts/${post.slug}`);
                  }
                }}
                tabIndex={0}
                role="link"
                className="cursor-pointer"
              >
                <Card className="p-6 hover:bg-surface-hover transition-colors">
                  <Card.Header className="p-0 pb-2 flex-row items-start justify-between gap-3">
                    <Card.Title className="text-2xl font-display font-semibold min-w-0">
                      {post.title}
                    </Card.Title>
                    {isNewPost(post.publishDate) && (
                      <Chip size="sm" color="accent" className="flex-shrink-0">New</Chip>
                    )}
                  </Card.Header>
                  <Card.Content className="p-0">
                    <div className="flex items-center gap-3 text-sm text-muted mb-3">
                      <time dateTime={post.publishDate}>
                        {new Date(post.publishDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                      <span>&middot;</span>
                      <span>{post.readingTime} min read</span>
                    </div>
                    {post.summary && (
                      <p className="text-foreground/80 leading-relaxed">
                        {post.summary}
                      </p>
                    )}
                  </Card.Content>
                  {post.tags && post.tags.length > 0 && (
                    <Card.Footer className="p-0 pt-3 flex-wrap gap-3">
                      {post.tags.map((t) => (
                        <TagLink
                          key={t}
                          tag={t}
                          className="text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ))}
                    </Card.Footer>
                  )}
                </Card>
              </article>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
