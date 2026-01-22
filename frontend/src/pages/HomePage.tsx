import { Link } from "react-router-dom";
import { Card, Skeleton, ScrollShadow } from "@heroui/react";
import { usePosts } from "../hooks/api";

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
            <Link key={post.slug} to={`/posts/${post.slug}`} className="block">
              <Card className="p-6 hover:bg-surface-hover transition-colors cursor-pointer">
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
                  <Card.Footer className="p-0 pt-3 flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/tags/${tag}`}
                        className="text-xs px-2 py-1 bg-surface rounded-full hover:bg-surface-hover transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tag}
                      </Link>
                    ))}
                  </Card.Footer>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </ScrollShadow>
    </div>
  );
}
