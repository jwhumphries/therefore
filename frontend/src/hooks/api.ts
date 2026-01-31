import { useQuery } from "@tanstack/react-query";

// API response types
export interface Author {
  name: string;
  avatar?: string;
  bio?: string;
}

export interface PostListItem {
  slug: string;
  title: string;
  summary?: string;
  publishDate: string;
  tags?: string[];
  series?: string;
  readingTime: number;
  searchContent?: string;
}

export interface PostDetail extends PostListItem {
  htmlContent: string;
  author?: Author;
}

export interface PostsResponse {
  posts: PostListItem[];
  total: number;
}

export interface TagResponse {
  tag: string;
  count: number;
}

export interface SeriesResponse {
  series: string;
  count: number;
  topTags?: string[];
  hasRecentPosts: boolean;
}

// Pagination and sorting options
export interface PostsQueryOptions {
  tag?: string;
  limit?: number;
  offset?: number;
  sortBy?: "date" | "title" | "readingTime";
  sortOrder?: "asc" | "desc";
}

// API fetch functions
async function fetchPosts(options: PostsQueryOptions = {}): Promise<PostsResponse> {
  const params = new URLSearchParams();

  if (options.tag) params.set("tag", options.tag);
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.offset) params.set("offset", options.offset.toString());
  if (options.sortBy) params.set("sortBy", options.sortBy);
  if (options.sortOrder) params.set("sortOrder", options.sortOrder);

  const queryString = params.toString();
  const url = queryString ? `/api/posts?${queryString}` : "/api/posts";

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch posts");
  }
  return res.json();
}

async function fetchPost(slug: string): Promise<PostDetail> {
  const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Post not found");
    }
    throw new Error("Failed to fetch post");
  }
  return res.json();
}

async function fetchTags(): Promise<TagResponse[]> {
  const res = await fetch("/api/tags");
  if (!res.ok) {
    throw new Error("Failed to fetch tags");
  }
  return res.json();
}

async function fetchSeries(): Promise<SeriesResponse[]> {
  const res = await fetch("/api/series");
  if (!res.ok) {
    throw new Error("Failed to fetch series");
  }
  return res.json();
}

async function fetchSeriesPosts(series: string): Promise<PostsResponse> {
  const res = await fetch(`/api/posts?series=${encodeURIComponent(series)}`);
  if (!res.ok) {
    throw new Error("Failed to fetch series posts");
  }
  return res.json();
}

// React Query hooks
export function usePosts(tag?: string) {
  return useQuery({
    queryKey: ["posts", tag ?? "all"],
    queryFn: () => fetchPosts({ tag }),
  });
}

export function usePaginatedPosts(options: PostsQueryOptions = {}) {
  const { tag, limit = 10, offset = 0, sortBy, sortOrder } = options;

  return useQuery({
    queryKey: ["posts", "paginated", tag ?? "all", limit, offset, sortBy, sortOrder],
    queryFn: () => fetchPosts({ tag, limit, offset, sortBy, sortOrder }),
    placeholderData: (previousData) => previousData, // Keep previous data while loading new page
  });
}

export function usePost(slug: string) {
  return useQuery({
    queryKey: ["post", slug],
    queryFn: () => fetchPost(slug),
    enabled: !!slug,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });
}

export function useSeries() {
  return useQuery({
    queryKey: ["series"],
    queryFn: fetchSeries,
  });
}

export function useSeriesPosts(series: string) {
  return useQuery({
    queryKey: ["posts", "series", series],
    queryFn: () => fetchSeriesPosts(series),
    enabled: !!series,
  });
}
