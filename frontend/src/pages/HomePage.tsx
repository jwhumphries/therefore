import { useRef, useEffect, useState } from "react";
import { Card, Chip, Skeleton, ScrollShadow } from "@heroui/react";
import { usePaginatedPosts } from "../hooks/api";
import { TagLink } from "../components/TagLink";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";
import { ReadingRail, ReadingRailMobile } from "../components/ReadingRail";
import { usePageMeta } from "../hooks/usePageMeta";
import { useSSGData } from "../hooks/useSSGData";

const LATEST_POSTS_LIMIT = 10;

function isNewPost(publishDate: string): boolean {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(publishDate).getTime() > sevenDaysAgo;
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
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </Card>
  );
}

export function HomePage() {
  useSSGData(); // Pre-seed query cache from SSG data
  usePageMeta({ title: "Latest Posts", description: "Browse the latest posts on Therefore." });
  const { data, isLoading, error } = usePaginatedPosts({ limit: LATEST_POSTS_LIMIT });
  const navigate = useViewTransitionNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [railMaxHeight, setRailMaxHeight] = useState<string | undefined>();

  // Measure the scroll container height to limit the rail
  useEffect(() => {
    const updateRailHeight = () => {
      if (scrollContainerRef.current) {
        const height = scrollContainerRef.current.offsetHeight;
        setRailMaxHeight(`${height}px`);
      }
    };

    updateRailHeight();
    window.addEventListener("resize", updateRailHeight);
    return () => window.removeEventListener("resize", updateRailHeight);
  }, [data]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-display font-bold mb-8">Latest Posts</h1>
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

  if (!data?.posts.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">No posts yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="max-w-[90rem] mx-auto xl:grid xl:grid-cols-[1fr_minmax(0,48rem)_1fr] xl:gap-8">
      {/* Left spacer - empty on desktop, collapses on mobile */}
      <div className="hidden xl:block" />

      {/* Main content - centered column */}
      <div className="max-w-3xl mx-auto xl:mx-0">
        <h1 className="text-4xl font-display font-bold mb-8">Latest Posts</h1>
        <ScrollShadow
          ref={scrollContainerRef}
          className="max-h-[calc(100vh-16rem)]"
          hideScrollBar
        >
          <div className="space-y-6 pr-2">
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
                      {post.tags.map((tag) => (
                        <TagLink
                          key={tag}
                          tag={tag}
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
        </ScrollShadow>

        {/* Mobile: Show active series at bottom */}
        <ReadingRailMobile className="mt-10 xl:hidden" />
      </div>

      {/* Desktop: Reading Rail in right margin */}
      <aside className="hidden xl:block">
        <div
          className="sticky top-[calc(var(--header-height,4rem)+1rem)] overflow-y-auto"
          style={railMaxHeight ? { maxHeight: railMaxHeight } : undefined}
        >
          <ReadingRail />
        </div>
      </aside>
    </div>
  );
}
