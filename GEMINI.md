# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

All commands run through Dagger containers for consistency. Use `task` for common workflows:

```bash
task dev          # Start dev environment (Go:8080 + Vite:3000)
task dev-stop     # Stop dev environment
task check        # Run all checks (lint, test, typecheck)
task build        # Build production container
```

Individual checks:
```bash
task lint         # Go linting (golangci-lint)
task lint-frontend # ESLint
task typecheck    # TypeScript type-check
task test         # Go tests
task templ        # Generate templ code (required after .templ changes)
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
│  React Router + TanStack Query + HeroUI     │
│  Fetches JSON, renders HTML, hydrates       │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│            Go API (internal/)               │
│  GET /api/posts, /api/posts/:slug, /api/tags│
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

- `cmd/therefore/` - CLI entry point (Cobra/Viper), server setup
- `internal/content/` - ContentStore interface, EmbeddedStore implementation, Post types
- `internal/renderer/` - Goldmark markdown + shortcode parsing pipeline
- `internal/views/` - Templ templates (article.templ, shortcodes.templ)
- `internal/handlers/` - API handlers (api.go) + SPA fallback (spa.go)
- `frontend/src/pages/` - React route components
- `frontend/src/components/background/` - Animated canvas background for splash page
- `frontend/src/components/hydration/` - Post-render component initialization
- `content/posts/` - Markdown files (embedded at build via go:embed)
- `.dagger/` - CI pipeline definitions

### Animated Background System

The splash page (`frontend/src/pages/SplashPage.tsx`) features a canvas-based animated background with ancient script characters (Greek, Hebrew, Aramaic).

**Files in `frontend/src/components/background/`:**
- `AncientScriptBackground.tsx` - Main canvas component, render loop, character batching
- `useAnimationLoop.ts` - RAF hook with delta time, visibility pause, reduced motion support
- `characterSets.ts` - Greek, Hebrew, Aramaic character arrays
- `focusRiver.ts` - Simplex noise implementation, drifting river center, blur zone calculation
- `types.ts` - TypeScript interfaces (Character, Row, AnimationConfig)

**Animation Layers:**
1. **Character Grid** - Rows of ancient script characters filling the viewport
2. **Scrolling Ticker** - Alternating horizontal scroll directions per row
3. **Character Morphing** - Random bold/fade/swap transitions via state machine
4. **Focus River** - Sharp center strip that drifts and curves across the screen; edges are blurred
5. **Vignette** - Radial gradient darkening corners

**Key Algorithms:**
- Infinite scroll via character position recycling (not offset accumulation)
- Blur zone batching (3 zones) for performance - only 3 filter changes per frame
- Simplex noise for organic river drift and edge breathing
- Dimension change debouncing to prevent re-initialization stuttering

**Accessibility:** Respects `prefers-reduced-motion` (static display when enabled), canvas has `aria-hidden="true"`.

### Content Flow

1. Markdown files in `content/posts/` are embedded at build time
2. At startup, EmbeddedStore parses YAML frontmatter and renders HTML
3. Shortcodes (`{{figure}}`, `{{quote}}`, etc.) are extracted, converted to templ components
4. API returns pre-rendered HTML wrapped in Article template
5. React renders via `dangerouslySetInnerHTML`, then hydrates interactive components

### Shortcode System

Syntax: `{{name attr="val"}}content{{/name}}` or self-closing `{{name attr="val"}}`

Available shortcodes (defined in `internal/views/shortcodes.templ`):
- `figure` - Image with caption and lightbox
- `quote` - Blockquote with author/source
- `sidenote` - Margin note (desktop) / toggle (mobile)
- `timeline` - Chronological events display

Hydration (in `frontend/src/components/hydration/`) attaches event listeners to elements with `data-component` attributes.

### Post Frontmatter

```yaml
title: "Post Title"
slug: "url-slug"
publishDate: 2024-01-15T00:00:00Z
draft: false
tags: [philosophy, theology]
summary: "Brief description"
author:
  name: "Author Name"
  avatar: "/avatar.jpg"
  bio: "Brief bio"
```

Posts are published if `draft: false` AND `publishDate <= now`.

## Code Patterns

**Templ templates**: After modifying `.templ` files, run `task templ` to regenerate Go code.

**API responses**: Handlers in `internal/handlers/api.go` return JSON. Single post responses include full rendered HTML via `views.RenderToString(views.Article(...))`.

**Frontend state**: Uses TanStack Query with 5-minute stale time. Hooks in `frontend/src/hooks/api.ts`.

**ContentStore interface**: Allows swapping EmbeddedStore for database-backed implementation later.

## Environment Variables

- `THEREFORE_PORT` (default: `:8080`)
- `THEREFORE_LOG_LEVEL` (default: `info`)
- `THEREFORE_DEV` (default: `false`) - Enables Vite dev server asset URLs
