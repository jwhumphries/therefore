import { useEffect } from "react";

const SITE_NAME = "Therefore";

interface PageMeta {
  title?: string;
  description?: string;
  type?: "website" | "article";
  publishedTime?: string;
  author?: string;
  url?: string;
}

function setMetaTag(
  attr: "name" | "property",
  key: string,
  content: string,
): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attr, key);
    document.head.appendChild(meta);
  }
  meta.content = content;
  return meta;
}

function clearMetaTag(attr: "name" | "property", key: string) {
  const meta = document.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (meta) meta.content = "";
}

export function usePageMeta(meta: PageMeta | string = {}) {
  // Support legacy (title, description) call signature
  const opts: PageMeta =
    typeof meta === "string" ? { title: meta } : meta;

  useEffect(() => {
    document.title = opts.title
      ? `${opts.title} — ${SITE_NAME}`
      : SITE_NAME;
    return () => {
      document.title = SITE_NAME;
    };
  }, [opts.title]);

  useEffect(() => {
    const fullTitle = opts.title
      ? `${opts.title} — ${SITE_NAME}`
      : SITE_NAME;
    const desc = opts.description || "";
    const ogType = opts.type || "website";

    // Standard meta
    if (desc) setMetaTag("name", "description", desc);

    // Open Graph
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:site_name", SITE_NAME);
    setMetaTag("property", "og:type", ogType);
    if (desc) setMetaTag("property", "og:description", desc);
    if (opts.url) setMetaTag("property", "og:url", opts.url);
    if (opts.publishedTime) {
      setMetaTag("property", "article:published_time", opts.publishedTime);
    }

    // Twitter Card
    setMetaTag("name", "twitter:card", "summary");
    setMetaTag("name", "twitter:title", fullTitle);
    if (desc) setMetaTag("name", "twitter:description", desc);

    return () => {
      clearMetaTag("name", "description");
      clearMetaTag("property", "og:title");
      clearMetaTag("property", "og:site_name");
      clearMetaTag("property", "og:type");
      clearMetaTag("property", "og:description");
      clearMetaTag("property", "og:url");
      clearMetaTag("property", "article:published_time");
      clearMetaTag("name", "twitter:card");
      clearMetaTag("name", "twitter:title");
      clearMetaTag("name", "twitter:description");
    };
  }, [opts.title, opts.description, opts.type, opts.url, opts.publishedTime]);
}
