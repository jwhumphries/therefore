import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import { Spinner } from "@heroui/react";
import { usePost } from "../hooks/api";
import { hydrateComponents } from "../components/hydration";

export function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = usePost(slug ?? "");

  // Hydrate shortcode components after render
  useEffect(() => {
    if (post) {
      const container = document.querySelector(".post-content");
      if (container) {
        hydrateComponents(container as HTMLElement);
      }
    }
  }, [post]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    const isNotFound = error.message === "Post not found";
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-serif font-bold mb-4">
          {isNotFound ? "Post Not Found" : "Error"}
        </h1>
        <p className="text-default-500 mb-6">
          {isNotFound
            ? "The post you're looking for doesn't exist."
            : "Failed to load the post. Please try again."}
        </p>
        <Link
          to="/"
          className="text-primary hover:underline"
        >
          &larr; Back to Home
        </Link>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <nav className="mb-8">
        <Link
          to="/"
          className="text-default-500 hover:text-primary transition-colors"
        >
          &larr; Back to Posts
        </Link>
      </nav>
      <div
        className="post-content"
        dangerouslySetInnerHTML={{ __html: post.htmlContent }}
      />
    </div>
  );
}
