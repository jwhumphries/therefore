import { Card, Skeleton, ScrollShadow } from "@heroui/react";
import { usePosts } from "../hooks/api";
import { TagLink } from "../components/TagLink";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";

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
  const { data, isLoading, error } = usePosts();
  const navigate = useViewTransitionNavigate();

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
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-display font-bold mb-8">Latest Posts</h1>
      <ScrollShadow className="max-h-[calc(100vh-16rem)]" hideScrollBar>
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
                <Card.Header className="p-0 pb-2">
                  <Card.Title className="text-2xl font-display font-semibold">
                    {post.title}
                  </Card.Title>
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
    </div>
  );
}
