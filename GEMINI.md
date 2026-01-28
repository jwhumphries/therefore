# GEMINI.md

This file provides guidance to GEMINI when working with code in this repository.

## Build & Development Commands

All commands run through Dagger containers for consistency. Use `task` for common workflows:

```bash
task dev            # Start dev environment (Go:8080 + Vite:3000)
task dev-stop       # Stop dev environment
task check          # Run all checks (lint, typecheck, test, test-frontend)
task build          # Build production container
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
task fmt-frontend   # Format frontend code
task templ-fmt      # Format .templ files
task build-frontend # Build frontend assets only
task dev-logs       # View dev container logs
task dev-shell      # Shell into dev container
task clean          # Remove build artifacts
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
┌─────────────────────────────────────────────┐
│           React SPA (frontend/)             │
│  React 19 + React Router 7 + TanStack Query│
│  HeroUI (beta) + Tailwind CSS v4 + Vite 7  │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│            Go API (internal/)               │
│  Echo v5 + Cobra CLI + Viper config         │
│  GET /api/posts, /api/posts/:slug, etc.     │
│  SPA fallback: /* → index.html              │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│         Content Pipeline                    │
│  Markdown → Shortcodes → Goldmark → Templ   │
│  All posts embedded & rendered at startup   │
└─────────────────────────────────────────────┘
```

### Key Directories

- `cmd/therefore/` - CLI entry point (Cobra/Viper), server setup, route registration
- `internal/content/` - ContentStore interface, EmbeddedStore implementation, Post types
- `internal/renderer/` - Goldmark markdown + shortcode parsing pipeline
- `internal/views/` - Templ templates (article.templ, shortcodes.templ, shortcode_renderers.go)
- `internal/handlers/` - API handlers (api.go), SPA fallback (spa.go), SEO endpoints (seo.go)
- `internal/compress/` - Gzip compression middleware
- `frontend/src/pages/` - React route components (Splash, Home, Post, Tags, Tag, Series, About)
- `frontend/src/components/` - Shared UI components
- `frontend/src/components/background/` - Animated canvas background for splash page
- `frontend/src/components/hydration/` - Post-render component initialization (vanilla TS)
- `frontend/src/hooks/` - Custom React hooks (api, meta, JSON-LD, scrollspy, view transitions)
- `content/posts/` - Markdown files (embedded at build via go:embed)
- `.dagger/` - CI pipeline definitions

### API Endpoints

```
GET /api/posts              # List posts (query: tag, series, limit, offset, sortBy, sortOrder)
GET /api/posts/:slug        # Single post with full HTML content
GET /api/tags               # Tag list with counts
GET /api/series             # Series list with counts, topTags, hasRecentPosts
GET /posts/:slug/:filename  # Post bundle assets (images, etc.)
GET /healthz                # Health check
GET /robots.txt             # Dynamic robots.txt (uses THEREFORE_BASE_URL)
GET /sitemap.xml            # Dynamic sitemap (posts, tags, series, static pages)
```

### Content Flow

1. Markdown files in `content/posts/` are embedded at build time
2. At startup, EmbeddedStore parses YAML frontmatter and renders HTML
3. Shortcodes (`{{figure}}`, `{{quote}}`, etc.) are extracted, converted to templ components
4. API returns pre-rendered HTML wrapped in Article template
5. React renders via `dangerouslySetInnerHTML`, then hydrates interactive components

### Hydration System

Components in `frontend/src/components/hydration/` are vanilla TypeScript that attach event listeners to server-rendered HTML elements marked with `data-component` attributes.

**Registry** (`hydration/index.ts`):
- `lightbox` - Image modal with focus trap and keyboard nav
- `timeline` - Interactive timeline rendering
- `sidenote` - Popover notes with ARIA support
- `citation` - Footnote popovers with sequential numbering + citations accordion
- `avatar` - Author avatar component
- `scripture-compare` - Bible version cycling with keyboard/ARIA support

**Important**: The orchestrator tracks `data-hydrated` attributes and clears them during cleanup to prevent stale state when TanStack Query triggers re-renders. See the `hydratedElements` array in `index.ts`.

### Shortcode System

Syntax: `{{name attr="val"}}content{{/name}}` or self-closing `{{name attr="val"}}`

Available shortcodes (defined in `internal/views/shortcodes.templ`):
- `figure` - Image with caption, lightbox, and lazy loading
- `quote` - Blockquote with author/source
- `sidenote` - Margin note with popover
- `citation` / `cite` - Inline citation references with popover and accordion
- `timeline` - Chronological events display (pipe-delimited format)
- `term` - Definition box for terms
- `scripture` - Bible passage with verse numbers, drop cap, Bible Gateway link
- `scripture-compare` / `parallel` - Side-by-side translation comparison

### Post Frontmatter

```yaml
title: "Post Title"
slug: "url-slug"
publishDate: 2024-01-15T00:00:00Z
draft: false
tags: [philosophy, theology]
series: "Series Name"
summary: "Brief description"
author:
  name: "Author Name"
  avatar: "/avatar.jpg"
  bio: "Brief bio"
```

Posts are published if `draft: false` AND `publishDate <= now`.

### Animated Background System

The splash page (`frontend/src/pages/SplashPage.tsx`) features a canvas-based animated background with ancient script characters (Greek, Hebrew, Aramaic).

**Files in `frontend/src/components/background/`:**
- `AncientScriptBackground.tsx` - Main canvas component, render loop, character batching
- `useAnimationLoop.ts` - RAF hook with delta time, visibility pause, reduced motion support
- `characterSets.ts` - Greek, Hebrew, Aramaic character arrays
- `focusRiver.ts` - Simplex noise implementation, drifting river center, blur zone calculation
- `types.ts` - TypeScript interfaces (Character, Row, AnimationConfig)

**Key Algorithms:**
- Infinite scroll via character position recycling (not offset accumulation)
- Blur zone batching (3 zones) for performance - only 3 filter changes per frame
- Simplex noise for organic river drift and edge breathing

**Accessibility:** Respects `prefers-reduced-motion` (static display when enabled), canvas has `aria-hidden="true"`.

## Code Patterns

**Templ templates**: After modifying `.templ` files, run `task templ` to regenerate Go code.

**API responses**: Handlers in `internal/handlers/api.go` return JSON. Single post responses include full rendered HTML via `views.RenderToString(views.Article(...))`.

**Frontend state**: Uses TanStack Query with 5-minute stale time. Hooks in `frontend/src/hooks/api.ts`.

**Frontend hooks**:
- `usePageMeta` - Sets document title, description, OG/Twitter meta tags
- `useJsonLd` - Injects/removes JSON-LD structured data script tags
- `useViewTransitionNavigate` - View Transitions API wrapper (fade for posts, slide for nav pages)
- `useScrollspy` - TOC heading tracking with dynamic horizon calculation

**Error handling**: `ErrorBoundary` class component wraps routes in `main.tsx`. Backend errors use `fmt.Errorf` with `%w` wrapping.

**ContentStore interface**: Allows swapping EmbeddedStore for database-backed implementation later.

**View transitions**: Client-side navigation uses the View Transitions API (`document.startViewTransition`). Transition type is set via `document.documentElement.dataset.transition`.

## Testing

**Go tests**: `task test` runs `go test -v ./...` via Dagger. Test files alongside source.

**Frontend tests**: `task test-frontend` runs Vitest via Dagger.
- Config: `frontend/vitest.config.ts` (jsdom environment, `@/` path alias)
- Tests: `frontend/src/components/hydration/*.test.ts`
- Covers: hydration orchestrator, sidenote, citation, lightbox, scripture-compare
- Run locally: `cd frontend && bun run test` (or `bun run test:watch`)

## SEO

- `robots.txt` and `sitemap.xml` are dynamically generated via handlers in `internal/handlers/seo.go`
- Sitemap includes all published posts (with lastmod), tags, series, and static pages
- `usePageMeta` hook sets OG and Twitter Card meta tags per page
- `useJsonLd` hook adds BlogPosting schema on post pages
- Images use `loading="lazy"` in the figure shortcode

## Environment Variables

- `THEREFORE_PORT` (default: `:8080`)
- `THEREFORE_LOG_LEVEL` (default: `info`)
- `THEREFORE_DEV` (default: `false`) - Enables Vite dev server asset URLs
- `THEREFORE_BASE_URL` (default: `http://localhost:8080`) - Base URL for sitemap/robots.txt

CLI flags: `--config`, `--port`, `--log-level`, `--dev`, `--base-url`

## Deployment

Deployed to Fly.io (see `fly.toml`). Production image built via Dagger → Alpine container with nonroot user. CI pipeline runs lint, test, typecheck, and frontend tests before build.
