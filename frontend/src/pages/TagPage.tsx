import { useParams, Link } from "react-router-dom";
import { Spinner } from "@heroui/react";
import { usePosts } from "../hooks/api";

export function TagPage() {
  const { tag } = useParams<{ tag: string }>();
  const { data, isLoading, error } = usePosts(tag);

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

  return (
    <div className="max-w-3xl mx-auto">
      <nav className="mb-8">
        <Link
          to="/tags"
          className="text-default-500 hover:text-primary transition-colors"
        >
          &larr; All Tags
        </Link>
      </nav>
      <h1 className="text-4xl font-serif font-bold mb-2">
        Posts tagged &ldquo;{tag}&rdquo;
      </h1>
      <p className="text-default-500 mb-8">
        {data?.total ?? 0} {data?.total === 1 ? "post" : "posts"}
      </p>

      {!data?.posts.length ? (
        <p className="text-default-500">No posts found with this tag.</p>
      ) : (
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
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
