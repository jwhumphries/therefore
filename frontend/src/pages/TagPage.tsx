import { useParams } from "react-router-dom";
import { Card, Chip, Skeleton } from "@heroui/react";
import { usePosts } from "../hooks/api";
import { TransitionLink } from "../components/TransitionLink";
import { TagLink } from "../components/TagLink";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";

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
    </Card>
  );
}

export function TagPage() {
  const { tag } = useParams<{ tag: string }>();
  const { data, isLoading, error } = usePosts(tag);
  const navigate = useViewTransitionNavigate();

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
      <p className="text-default-500 mb-8">
        {data?.total ?? 0} {data?.total === 1 ? "post" : "posts"}
      </p>

      {!data?.posts.length ? (
        <p className="text-default-500">No posts found with this tag.</p>
      ) : (
        <div className="space-y-6">
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
      )}
    </div>
  );
}
