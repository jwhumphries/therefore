import { Link } from "react-router-dom";
import { Spinner } from "@heroui/react";
import { usePosts } from "../hooks/api";

export function HomePage() {
  const { data, isLoading, error } = usePosts();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" />
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
        <p className="text-default-500">No posts yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-serif font-bold mb-8">Latest Posts</h1>
      <div className="space-y-8">
        {data.posts.map((post) => (
          <article key={post.slug} className="group">
            <Link to={`/posts/${post.slug}`} className="block">
              <h2 className="text-2xl font-serif font-semibold mb-2 group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <div className="flex items-center gap-3 text-sm text-default-500 mb-3">
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
                <p className="text-default-600 leading-relaxed">
                  {post.summary}
                </p>
              )}
            </Link>
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/tags/${tag}`}
                    className="text-xs px-2 py-1 bg-default-100 rounded-full hover:bg-default-200 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
