import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * SSG data embedded in the page by the Go SSG generator.
 * Structure matches the API response types.
 */
interface SSGData {
  // For post list pages (home, tag)
  posts?: Array<{
    slug: string;
    title: string;
    summary?: string;
    publishDate: string;
    tags?: string[];
    series?: string;
    readingTime: number;
  }>;
  total?: number;
  tag?: string;

  // For single post pages
  post?: {
    slug: string;
    title: string;
    summary?: string;
    publishDate: string;
    tags?: string[];
    series?: string;
    readingTime: number;
    htmlContent: string;
    author?: {
      name: string;
      avatar?: string;
      bio?: string;
    };
  };
}

const SSG_DATA_ID = "__SSG_DATA__";

/**
 * Pre-seeds TanStack Query cache from SSG-embedded data.
 *
 * When a page is pre-rendered by SSG, the data is embedded as JSON in a
 * script tag. This hook reads that data and pre-populates the query cache
 * so that React Query doesn't refetch on hydration.
 *
 * The script tag is removed after reading to clean up the DOM.
 */
export function useSSGData() {
  const queryClient = useQueryClient();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Only process once
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const dataEl = document.getElementById(SSG_DATA_ID);
    if (!dataEl) return;

    try {
      const data: SSGData = JSON.parse(dataEl.textContent || "{}");

      // Pre-seed post detail data
      if (data.post) {
        queryClient.setQueryData(["post", data.post.slug], data.post);
      }

      // Pre-seed posts list data
      if (data.posts && data.total !== undefined) {
        // Build the query key based on what filters were used
        const queryKey = buildPostsQueryKey(data.tag);
        queryClient.setQueryData(queryKey, {
          posts: data.posts,
          total: data.total,
        });
      }

      // Remove the script tag after processing
      dataEl.remove();
    } catch (e) {
      console.warn("Failed to parse SSG data:", e);
    }
  }, [queryClient]);
}

/**
 * Builds the query key for posts list based on filters.
 * Must match the key structure used in api.ts hooks.
 */
function buildPostsQueryKey(tag?: string): (string | number | undefined)[] {
  // Match the key structure from usePaginatedPosts in api.ts:
  // ["posts", "paginated", tag ?? "all", limit, offset, sortBy, sortOrder]
  // Home page uses limit=10, tag pages use limit=6
  // sortBy and sortOrder default to undefined (use API defaults)
  return [
    "posts",
    "paginated",
    tag ?? "all",
    tag ? 6 : 10, // limit: 6 for tag pages, 10 for home
    0, // offset: always 0 for SSG (first page only)
    undefined, // sortBy: use API default
    undefined, // sortOrder: use API default
  ];
}
