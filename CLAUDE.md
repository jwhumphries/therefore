# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

All commands run through Dagger containers for consistency. Use `task` for common workflows:

```bash
task dev            # Start dev environment (Go:8080 + Vite:3000) via docker-compose
task dev-stop       # Stop dev environment
task check          # Run all checks (lint, lint-frontend, typecheck, test, test-frontend)
task build          # Build production container, load into Docker
```

Individual checks:
```bash
task lint           # Go linting (golangci-lint)
task lint-frontend  # ESLint
task typecheck      # TypeScript type-check
task test           # Go tests
task test-frontend  # Vitest frontend tests
task templ          # Generate templ code (required after .templ changes)
```

Other commands:
```bash
task fmt            # Format Go code
task fmt-frontend   # Format frontend code (ESLint --fix)
task templ-fmt      # Format .templ files
task build-frontend # Build frontend assets only
task ssg            # Generate SSG pages (depends on build-frontend)
task dev-logs       # View dev container logs
task dev-shell      # Shell into dev container
task clean          # Remove build artifacts (tmp, bin, node_modules, dist)
task clean-docker   # Remove Docker volumes and images
```

Direct Dagger commands:
```bash
dagger call check --source .
dagger call build --source . --git .git
dagger call release --source . --git .git  # Creates Alpine container
```

## Architecture Overview

**Therefore** is a philosophy/theology blog with a Go API backend serving a React SPA frontend.

```
┌─────────────────────────────────────────────────┐
│             React SPA (frontend/)               │
│  React 19 + React Router 7 + TanStack Query 5   │
│  HeroUI (beta) + Tailwind CSS v4 + Vite 7       │
│  GSAP + Motion + Fuse.js                         │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              Go API (internal/)                 │
│  Echo v5 + Cobra CLI + Viper config             │
│  GET /api/posts, /api/posts/:slug, etc.         │
│  SSG pre-rendered pages + SPA fallback          │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│           Content Pipeline                      │
│  Markdown → Shortcodes → Goldmark → Templ       │
│  All posts embedded & rendered at startup       │
└─────────────────────────────────────────────────┘
```

### Key Directories

- `cmd/therefore/` - CLI entry point (Cobra/Viper), server setup, route registration, SSG command
- `internal/content/` - ContentStore interface, EmbeddedStore implementation, Post/PostMeta types
- `internal/renderer/` - Goldmark markdown + shortcode parsing pipeline
- `internal/views/` - Templ templates (article.templ, shortcodes.templ, ssg.templ, ssg_pages.templ)
- `internal/handlers/` - API handlers (api.go), SPA fallback with SSG support (spa.go), SEO (seo.go)
- `internal/ssg/` - Static site generator (pre-renders HTML pages for SEO)
- `internal/compress/` - Brotli compression utilities (caching, mime type detection)
- `internal/static/` - Embedded frontend dist (go:embed dist/*)
- `version/` - Version tag injection via build-time ldflags
- `frontend/src/pages/` - React route components (Splash, Home, Post, Tags, Tag, Series, About)
- `frontend/src/components/` - Shared UI components (14 components)
- `frontend/src/components/background/` - Animated canvas background for splash page
- `frontend/src/components/hydration/` - Post-render component initialization (vanilla TS)
- `frontend/src/hooks/` - Custom React hooks (api, meta, JSON-LD, scrollspy, view transitions, SSG data)
- `frontend/src/themes/` - Theme CSS (brodie.css with light/dark variants)
- `content/posts/` - Markdown files (embedded at build via go:embed)
- `.dagger/` - CI pipeline definitions
- `.github/workflows/` - GitHub Actions CI (lint, test, build) + Renovate dependency updates
- `scripts/` - Development scripts (develop.sh: templ generate, bun install, vite + air)

### API Endpoints

```
GET /api/posts              # List posts (query: tag, series, limit, offset, sortBy, sortOrder)
GET /api/posts/:slug        # Single post with full HTML content + author info
GET /api/tags               # Tag list with counts
GET /api/series             # Series list with counts, topTags (3), hasRecentPosts (7 days)
GET /posts/:slug/:filename  # Post bundle assets (images, SVGs) with 1-year cache
GET /healthz                # Health check ({"status": "ok"})
GET /robots.txt             # Dynamic robots.txt (disallows /api/)
GET /sitemap.xml            # Dynamic sitemap (posts with lastmod, tags, series, static pages)
GET /assets/*               # Static frontend assets (CSS, JS)
GET /*                      # SSG pre-rendered HTML if available, then SPA fallback to index.html
```

**SSG pre-rendered routes:** `/`, `/posts`, `/posts/:slug`, `/tags`, `/tags/:tag`, `/series`, `/about`

### Content Flow

1. Markdown files in `content/posts/` are embedded at build time
2. At startup, EmbeddedStore parses YAML frontmatter and renders HTML
3. Shortcodes (`{{figure}}`, `{{quote}}`, etc.) are extracted, converted to templ components
4. API returns pre-rendered HTML wrapped in Article template
5. React renders via `dangerouslySetInnerHTML`, then hydrates interactive components
6. SSG generator pre-renders full HTML pages (with Vite assets, meta tags, JSON-LD) for SEO crawlers

### SSG System

The `internal/ssg/` package generates pre-rendered HTML pages at build time:
- Parses Vite's index.html to extract CSS links and JS entry point
- Generates pages for all routes: splash, home (10 posts), posts, tags, tag pages (6 posts), series, about
- Each page includes OG/Twitter meta tags, canonical URLs, and SSG data (JSON for React query cache seeding)
- SPA handler serves pre-rendered HTML first (for SEO), falls back to index.html for client routing
- Frontend `useSSGData` hook reads embedded JSON to pre-seed TanStack Query cache on hydration

### Hydration System

Components in `frontend/src/components/hydration/` are vanilla TypeScript that attach event listeners to server-rendered HTML elements marked with `data-component` attributes.

**Registry** (`hydration/index.ts`):
- `lightbox` - Image modal with focus trap and keyboard nav
- `timeline` - Interactive timeline with staggered entrance animation
- `sidenote` - Popover notes with ARIA support and dynamic positioning
- `citation` - Footnote popovers with sequential numbering + citations accordion
- `avatar` - Author avatar component (renders HeroUI Avatar via React root)
- `scripture-compare` - Bible version cycling with keyboard/ARIA support
- `taglink` - Intercepts clicks on server-rendered tag links, dispatches custom navigate event for React routing

**Important**: The orchestrator tracks `data-hydrated` attributes and clears them during cleanup to prevent stale state when TanStack Query triggers re-renders. See the `hydratedElements` array in `index.ts`.

### Shortcode System

Syntax: `{{name attr="val"}}content{{/name}}` or self-closing `{{name attr="val"}}`

Available shortcodes (defined in `internal/views/shortcodes.templ`):
- `figure` - Image with caption, lightbox, and lazy loading
- `quote` - Blockquote with author/source
- `sidenote` - Margin note with popover
- `citation` / `cite` - Inline citation references with popover and accordion (supports `alias` attr for frontmatter-defined citations)
- `timeline` - Chronological events display (pipe-delimited: `date|title|description` per line)
- `term` - Definition box for terms (word, origin, content)
- `scripture` - Bible passage with verse numbers, drop cap, Bible Gateway link (format="poetry" for verse layout)
- `scripture-compare` - Two-column translation comparison (pinned + alternates, sections split by `---`)
- `parallel` - Side-by-side comparison with custom labels (content split by `---`)

### Post Frontmatter

```yaml
title: "Post Title"
slug: "url-slug"                       # Optional (defaults to filename/dirname)
publishDate: 2024-01-15T00:00:00Z
draft: false
tags: [philosophy, theology]
series: "Series Name"
summary: "Brief description"
author:
  name: "Author Name"
  avatar: "/avatar.jpg"
  bio: "Brief bio"
citations:                             # Optional, reusable citation definitions
  alias1:
    text: "Full Citation Text"
    url: "https://example.com"
```

Posts are published if `draft: false` AND `publishDate <= now`.

Page bundles: `content/posts/{slug}/index.md` with assets (SVGs, images) in the same directory. Relative image paths automatically transformed to `/posts/:slug/:filename`.

### Animated Background System

The splash page (`frontend/src/pages/SplashPage.tsx`) features a canvas-based animated background with ancient script characters (Greek, Hebrew, Aramaic).

**Files in `frontend/src/components/background/`:**
- `AncientScriptBackground.tsx` - Main canvas component, render loop, character batching, morph state machine
- `useAnimationLoop.ts` - RAF hook with delta time, visibility pause, reduced motion support
- `characterSets.ts` - Greek, Hebrew, Aramaic character arrays
- `focusRiver.ts` - Simplex noise implementation, drifting river center, blur zone calculation
- `types.ts` - TypeScript interfaces (Character, Row, AnimationConfig)

**Key Algorithms:**
- Infinite scroll via character position recycling (not offset accumulation)
- Blur zone batching (3 zones) for performance - only 3 filter changes per frame
- Simplex noise for organic river drift and edge breathing
- Character morph state machine: normal → bolding → fading (char swap) → unbolding → normal

**Accessibility:** Respects `prefers-reduced-motion` (static display when enabled), canvas has `aria-hidden="true"`.

## Code Patterns

**Templ templates**: After modifying `.templ` files, run `task templ` to regenerate Go code. Generated files are `*_templ.go`.

**API responses**: Handlers in `internal/handlers/api.go` return JSON. Single post responses include full rendered HTML via `views.RenderToString(views.Article(...))`. List responses include `searchContent` (800-char stripped excerpt for client-side search).

**Frontend state**: Uses TanStack Query with 5-minute stale time, 1 retry. Hooks in `frontend/src/hooks/api.ts`. Paginated queries use `placeholderData: keepPreviousData`.

**Frontend hooks**:
- `usePageMeta` - Sets document title, description, OG/Twitter meta tags, canonical link
- `useJsonLd` - Injects/removes JSON-LD structured data script tags
- `useViewTransitionNavigate` - View Transitions API wrapper (fade for posts, slide for nav pages)
- `useScrollspy` - TOC heading tracking with dynamic horizon calculation, smooth scroll with distance-based easing
- `useSSGData` - Pre-seeds TanStack Query cache from server-rendered JSON (`#__SSG_DATA__` script tag)

**Frontend components** (in `frontend/src/components/`):
- `Layout` - Sticky header with nav, search button, theme switcher, footer
- `SearchModal` - Fuse.js fuzzy search with series grouping, keyboard nav (arrows/Enter/Esc)
- `ThemeSwitcher` - Light/dark toggle, `useSyncExternalStore` for cross-tab sync, localStorage persistence
- `ReadingRail` - Sticky sidebar showing active series timeline (desktop), mobile variant at bottom
- `SeriesAccordion` / `SeriesTimeline` - Expandable series with top tags, staggered motion animation
- `TableOfContents` - Uses `useScrollspy`, indented h3 headings, animated underline
- `ScrollProgressBars` - 30 motion-driven progress bars responding to scroll position
- `GradientText` - Motion-based animated gradient, `SplitText` - GSAP SplitText plugin wrapper
- `SlideInButton` - Motion button with sliding background, `TransitionLink` - View transition wrapper
- `TagLink` - Reusable tag link with count variant

**Error handling**: `ErrorBoundary` class component wraps routes in `main.tsx`. Backend errors use `fmt.Errorf` with `%w` wrapping.

**ContentStore interface**: Allows swapping EmbeddedStore for database-backed implementation later.

**View transitions**: Client-side navigation uses the View Transitions API (`document.startViewTransition`). Transition type is set via `document.documentElement.dataset.transition`.

**Theme system**: Brodie theme with light/dark variants. CSS variables for colors (`--foreground`, `--background`, `--accent`, `--secondary`, etc.). Theme stored in localStorage, `data-theme` attribute on `<html>`.

## Testing

**Go tests**: `task test` runs `go test -v ./...` via Dagger. Test files alongside source (`*_test.go`).

**Frontend tests**: `task test-frontend` runs Vitest via Dagger.
- Config: `frontend/vitest.config.ts` (jsdom environment, `@/` path alias)
- Tests: `frontend/src/components/hydration/*.test.ts`
- Covers: hydration orchestrator, sidenote, citation, lightbox, scripture-compare
- Run locally: `cd frontend && bun run test` (or `bun run test:watch`)

## SEO

- `robots.txt` and `sitemap.xml` are dynamically generated via handlers in `internal/handlers/seo.go`
- Sitemap includes all published posts (with lastmod), tags, series, and static pages
- SSG pre-renders full HTML pages with meta tags, canonical URLs, and JSON-LD for search engine crawlers
- `usePageMeta` hook sets OG and Twitter Card meta tags per page
- `useJsonLd` hook adds BlogPosting schema on post pages
- Images use `loading="lazy"` in the figure shortcode

## Environment Variables

- `THEREFORE_PORT` (default: `:8080`)
- `THEREFORE_LOG_LEVEL` (default: `info`)
- `THEREFORE_DEV` (default: `false`) - Enables Vite dev server asset URLs
- `THEREFORE_BASE_URL` (default: `http://localhost:8080`) - Base URL for sitemap/robots.txt/SSG canonical URLs

CLI flags: `--config`, `--port`, `--log-level`, `--dev`, `--base-url`

## Deployment

Deployed to Fly.io (see `fly.toml`). App: `therefore-blog`, region: `iad`.
- Production URL: `https://faith.john-humphries.com`
- Image: `ghcr.io/jwhumphries/therefore:latest`
- VM: 256MB RAM, 1 shared CPU, auto-scaling (0 min machines)
- Health check: `GET /healthz` every 30s

Production image built via Dagger → Alpine 3.23 container with nonroot user, tzdata, ca-certificates.

CI pipeline (GitHub Actions): lint → test → build on all branches. Renovate bot for weekly dependency updates (Fridays).

Build pipeline: lint + test → templ generate → build frontend (Vite) → SSG → build Go binary (with version ldflags) → Alpine release container.
