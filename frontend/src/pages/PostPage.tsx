import { useParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Spinner } from "@heroui/react";
import { usePost } from "../hooks/api";
import { hydrateComponents } from "../components/hydration";
import { initTagLinks } from "../components/hydration/taglink";
import { TransitionLink } from "../components/TransitionLink";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";
import { TableOfContents } from "../components/TableOfContents";
import { ScrollProgressBars } from "../components/ScrollProgressBars";

export function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = usePost(slug ?? "");
  const navigate = useViewTransitionNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  // Listen for custom navigate events from hydrated components
  useEffect(() => {
    const handleNavigate = (e: CustomEvent<{ to: string; transition: string }>) => {
      navigate(e.detail.to);
    };

    window.addEventListener("navigate", handleNavigate as EventListener);
    return () => window.removeEventListener("navigate", handleNavigate as EventListener);
  }, [navigate]);

  // Hydrate shortcode components and tag links after render
  useEffect(() => {
    if (post) {
      const container = document.querySelector(".post-content");
      if (container) {
        hydrateComponents(container as HTMLElement);
        initTagLinks(container as HTMLElement);
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
        <h1 className="text-2xl font-display font-bold mb-4">
          {isNotFound ? "Post Not Found" : "Error"}
        </h1>
        <p className="text-default-500 mb-6">
          {isNotFound
            ? "The post you're looking for doesn't exist."
            : "Failed to load the post. Please try again."}
        </p>
        <TransitionLink
          to="/posts"
          className="text-primary hover:underline"
        >
          &larr; Back to Home
        </TransitionLink>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="max-w-[90rem] mx-auto xl:grid xl:grid-cols-[1fr_minmax(0,48rem)_1fr] xl:gap-8">
      {/* Scroll progress bars - sticky in left column, aligned to far left */}
      <aside className="hidden xl:flex justify-start">
        <div className="sticky top-[calc(var(--header-height,4rem)+1rem)] h-[calc(100vh-var(--header-height,4rem)-2rem)] w-16">
          <ScrollProgressBars contentRef={contentRef} />
        </div>
      </aside>

      {/* Main content - centered column */}
      <div className="max-w-3xl mx-auto xl:mx-0">
        <nav className="mb-8">
          <TransitionLink
            to="/posts"
            className="text-default-500 hover:text-primary transition-colors"
          >
            &larr; Back to Posts
          </TransitionLink>
        </nav>

        <div
          ref={contentRef}
          className="post-content"
          dangerouslySetInnerHTML={{ __html: post.htmlContent }}
        />
      </div>

      {/* Table of contents - sticky in right column */}
      <aside className="hidden xl:block">
        <div className="sticky top-[calc(var(--header-height,4rem)+1rem)] max-h-[calc(100vh-var(--header-height,4rem)-2rem)] overflow-y-auto">
          <TableOfContents containerRef={contentRef} />
        </div>
      </aside>
    </div>
  );
}
