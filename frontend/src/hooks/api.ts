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
}

// API fetch functions
async function fetchPosts(tag?: string): Promise<PostsResponse> {
  const url = tag ? `/api/posts?tag=${encodeURIComponent(tag)}` : "/api/posts";
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
    queryFn: () => fetchPosts(tag),
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
