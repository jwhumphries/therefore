# Blog: Project Specification

A reactive blog built with a Go backend and React frontend, featuring server-side Markdown rendering with custom shortcodes, templ-based HTML generation, and a content store abstraction designed for future flexibility.

---

## Project Overview

### Goals

- Build a philosophy/theology-focused blog with a minimal aesthetic but rich interactivity
- Use Go for the backend with templ for type-safe HTML templating
- Use React for the frontend with smooth transitions and reactive elements
- Render Markdown content server-side using Goldmark with custom shortcode support
- Design the content storage layer as an interface to allow future migration from embedded files to a database

### Tech Stack

- **Backend**: Go, templ, Goldmark (Markdown parsing)
- **Frontend**: React (from existing Go + React template project)
- **Content**: Markdown files with YAML frontmatter
- **Deployment**: Container image on Fly.io
- **Initial storage**: Embedded filesystem using Go's `embed` package

---

## Architecture

### High-Level Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Markdown Files │────▶│   Go Backend     │────▶│  React Frontend │
│  (embedded)     │     │  - Goldmark      │     │  - Fetch HTML   │
│                 │     │  - Shortcodes    │     │  - Hydrate      │
│                 │     │  - Templ         │     │    components   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Directory Structure

```
project/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── content/
│   │   ├── store.go          # ContentStore interface
│   │   ├── embedded.go       # Embedded filesystem implementation
│   │   └── post.go           # Post and PostMeta types
│   ├── renderer/
│   │   ├── renderer.go       # Markdown rendering orchestration
│   │   ├── goldmark.go       # Goldmark setup and extensions
│   │   └── shortcodes.go     # Shortcode parsing and handling
│   ├── templates/
│   │   ├── post.templ        # Post body template
│   │   ├── shortcodes.templ  # Shortcode component templates
│   │   └── components.templ  # Reusable templ components
│   └── handlers/
│       └── posts.go          # HTTP handlers for post API
├── content/
│   └── posts/                # Markdown files (embedded at build)
│       ├── on-the-nature-of-time.md
│       └── ...
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── PostBody.jsx
│   │   │   └── hydration/
│   │   │       ├── Timeline.jsx
│   │   │       ├── Lightbox.jsx
│   │   │       └── index.js
│   │   └── ...
│   └── ...
├── Dockerfile
└── fly.toml
```

---

## Content Model

### Post Frontmatter Schema

```yaml
---
title: "On the Nature of Time"
slug: "on-the-nature-of-time"
publishDate: 2026-02-15T00:00:00Z
draft: false
tags:
  - metaphysics
  - time
  - philosophy-of-physics
series: study-of-time
summary: "An exploration of how we perceive and conceptualize temporal experience."
---
```

### PostMeta Struct

```go
type PostMeta struct {
    Title       string    `yaml:"title"`
    Slug        string    `yaml:"slug"`
    PublishDate time.Time `yaml:"publishDate"`
    Draft       bool      `yaml:"draft"`
    Tags        []string  `yaml:"tags"`
    Series      string    `yaml:"series"`
    Summary     string    `yaml:"summary"`
}

type Post struct {
    Meta        PostMeta
    RawContent  string  // Original Markdown (without frontmatter)
    HTMLContent string  // Rendered HTML
}
```

### Publishing Logic

A post is considered published when:
- `draft` is `false`
- `publishDate` is in the past or equal to current time

This enables "scheduled" publishing by setting a future `publishDate` and rebuilding the container on a cron schedule (e.g., daily via CI).

---

## Content Store Interface

Design the storage layer as an interface to allow swapping implementations later.

### Interface Definition

```go
// internal/content/store.go

type ContentStore interface {
    // GetPost retrieves a single post by slug
    // Returns nil if not found or not published
    GetPost(ctx context.Context, slug string) (*Post, error)
    
    // ListPosts returns all published posts, sorted by publish date (newest first)
    // Supports optional filtering by tag
    ListPosts(ctx context.Context, opts ListOptions) ([]*Post, error)
    
    // GetTags returns all tags with their post counts
    GetTags(ctx context.Context) ([]TagCount, error)
}

type ListOptions struct {
    Tag   string // Filter by tag (empty = no filter)
    Limit int    // Max posts to return (0 = no limit)
}

type TagCount struct {
    Tag   string
    Count int
}
```

### Embedded Implementation

```go
// internal/content/embedded.go

//go:embed posts/*.md
var postsFS embed.FS

type EmbeddedStore struct {
    posts    map[string]*Post  // keyed by slug
    allPosts []*Post           // sorted by date
    tags     []TagCount
}

func NewEmbeddedStore(renderer *Renderer) (*EmbeddedStore, error) {
    // 1. Walk postsFS and read all .md files
    // 2. Parse frontmatter from each file
    // 3. Filter out drafts and future-dated posts
    // 4. Render Markdown to HTML using the renderer
    // 5. Build indexes (by slug, by date, tags)
    // Return fully initialized store
}
```

The embedded store parses and renders all content at startup, holding everything in memory. This is efficient for a small-to-medium blog and makes request handling trivial.

---

## Markdown Rendering

### Goldmark Setup

```go
// internal/renderer/goldmark.go

func NewGoldmark() goldmark.Markdown {
    return goldmark.New(
        goldmark.WithExtensions(
            extension.GFM,           // Tables, strikethrough, autolinks
            extension.Typographer,   // Smart quotes, dashes
            extension.Footnote,      // Footnotes for philosophical citations
        ),
        goldmark.WithParserOptions(
            parser.WithAutoHeadingID(), // Generate IDs for headings
        ),
        goldmark.WithRendererOptions(
            html.WithUnsafe(), // Allow raw HTML in Markdown if needed
        ),
    )
}
```

### Shortcode Syntax

Use a simple, recognizable syntax that won't conflict with Markdown:

```
{{shortcode_name attr1="value1" attr2="value2"}}
Content here (optional, for block shortcodes)
{{/shortcode_name}}
```

Self-closing shortcodes (no content):

```
{{figure src="/images/plato.jpg" caption="Plato in the Academy" alt="Ancient painting of Plato"}}
```

Block shortcodes (with content):

```
{{timeline start="500 BCE" end="400 BCE"}}
- 470 BCE: Socrates born in Athens
- 428 BCE: Plato born in Athens
- 399 BCE: Trial and death of Socrates
{{/timeline}}
```

### Shortcode Parser

```go
// internal/renderer/shortcodes.go

type Shortcode struct {
    Name       string
    Attributes map[string]string
    Content    string  // Empty for self-closing
}

// ParseShortcodes finds and extracts shortcodes from Markdown content
// Returns the modified content with placeholders and a map of shortcodes
func ParseShortcodes(content string) (string, map[string]Shortcode) {
    // 1. Use regex to find shortcode patterns
    // 2. Replace each with a placeholder: <!--shortcode:uuid-->
    // 3. Store shortcode data in map keyed by uuid
    // Return modified content and shortcode map
}

// RenderShortcode renders a shortcode to HTML using templ
func RenderShortcode(sc Shortcode) (string, error) {
    // Switch on sc.Name and call appropriate templ component
    // Return rendered HTML string
}
```

### Rendering Pipeline

```go
// internal/renderer/renderer.go

type Renderer struct {
    md goldmark.Markdown
}

func (r *Renderer) Render(rawMarkdown string) (string, error) {
    // 1. Parse and extract shortcodes
    content, shortcodes := ParseShortcodes(rawMarkdown)
    
    // 2. Render Markdown to HTML
    var buf bytes.Buffer
    if err := r.md.Convert([]byte(content), &buf); err != nil {
        return "", err
    }
    html := buf.String()
    
    // 3. Replace shortcode placeholders with rendered templ output
    for id, sc := range shortcodes {
        rendered, err := RenderShortcode(sc)
        if err != nil {
            return "", err
        }
        html = strings.Replace(html, "<!--shortcode:"+id+"-->", rendered, 1)
    }
    
    return html, nil
}
```

---

## Templ Components

### Post Body Template

```go
// internal/templates/post.templ

templ PostBody(post *content.Post) {
    <article class="post" data-slug={post.Meta.Slug}>
        <header class="post-header">
            <h1>{post.Meta.Title}</h1>
            <time datetime={post.Meta.PublishDate.Format(time.RFC3339)}>
                {post.Meta.PublishDate.Format("January 2, 2006")}
            </time>
            <div class="tags">
                for _, tag := range post.Meta.Tags {
                    <span class="tag">{tag}</span>
                }
            </div>
        </header>
        <div class="post-content">
            @templ.Raw(post.HTMLContent)
        </div>
    </article>
}
```

### Shortcode Templates

```go
// internal/templates/shortcodes.templ

// Figure with optional lightbox support
templ Figure(src, caption, alt string) {
    <figure class="post-figure" data-component="lightbox">
        <img src={src} alt={alt} loading="lazy"/>
        if caption != "" {
            <figcaption>{caption}</figcaption>
        }
    </figure>
}

// Timeline component
templ Timeline(start, end string, events []TimelineEvent) {
    <div class="timeline" data-component="timeline" data-start={start} data-end={end}>
        <div class="timeline-line"></div>
        for _, event := range events {
            <div class="timeline-event" data-year={event.Year}>
                <span class="timeline-year">{event.Year}</span>
                <div class="timeline-content">
                    @templ.Raw(event.Description)
                </div>
            </div>
        }
    </div>
}

// Blockquote with attribution (for philosophical quotes)
templ Quote(author, source string) {
    <blockquote class="attributed-quote" data-component="quote">
        <div class="quote-content">
            { children... }
        </div>
        <footer class="quote-attribution">
            <cite>
                if author != "" {
                    <span class="author">{author}</span>
                }
                if source != "" {
                    <span class="source">{source}</span>
                }
            </cite>
        </footer>
    </blockquote>
}

// Sidenote/marginal note for philosophical asides
templ Sidenote(id string) {
    <span class="sidenote-wrapper">
        <label class="sidenote-toggle" for={"sidenote-" + id}>⊕</label>
        <input type="checkbox" id={"sidenote-" + id} class="sidenote-checkbox"/>
        <span class="sidenote" data-component="sidenote" data-id={id}>
            { children... }
        </span>
    </span>
}
```

### TimelineEvent Type

```go
// Used by the Timeline shortcode
type TimelineEvent struct {
    Year        string
    Description string  // Already rendered HTML from Markdown list items
}
```

---

## HTTP API

### Endpoints

```
GET /api/posts              # List all published posts (metadata only)
GET /api/posts/:slug        # Get single post with full HTML content
GET /api/tags               # List all tags with counts
GET /api/series             # List all series
GET /api/series/:id         # List all posts in series
```

### Handlers

```go
// internal/handlers/posts.go

type PostHandler struct {
    store content.ContentStore
}

func (h *PostHandler) ListPosts(w http.ResponseWriter, r *http.Request) {
    tag := r.URL.Query().Get("tag")
    
    posts, err := h.store.ListPosts(r.Context(), content.ListOptions{Tag: tag})
    if err != nil {
        http.Error(w, "Internal error", 500)
        return
    }
    
    // Return metadata only (no HTMLContent) for list view
    type PostSummary struct {
        Title       string    `json:"title"`
        Slug        string    `json:"slug"`
        PublishDate time.Time `json:"publishDate"`
        Tags        []string  `json:"tags"`
        Summary     string    `json:"summary"`
    }
    
    summaries := make([]PostSummary, len(posts))
    for i, p := range posts {
        summaries[i] = PostSummary{
            Title:       p.Meta.Title,
            Slug:        p.Meta.Slug,
            PublishDate: p.Meta.PublishDate,
            Tags:        p.Meta.Tags,
            Summary:     p.Meta.Summary,
        }
    }
    
    json.NewEncoder(w).Encode(summaries)
}

func (h *PostHandler) GetPost(w http.ResponseWriter, r *http.Request) {
    slug := chi.URLParam(r, "slug")  // or however routing is handled
    
    post, err := h.store.GetPost(r.Context(), slug)
    if err != nil {
        http.Error(w, "Internal error", 500)
        return
    }
    if post == nil {
        http.Error(w, "Not found", 404)
        return
    }
    
    // Return full post including rendered HTML
    json.NewEncoder(w).Encode(post)
}
```

---

## React Frontend Integration

### PostBody Component

```jsx
// frontend/src/components/PostBody.jsx

import { useEffect, useRef } from 'react';
import { hydrateComponents } from './hydration';

export function PostBody({ html }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Hydrate all interactive components found in the HTML
    const cleanup = hydrateComponents(containerRef.current);
    
    return cleanup;
  }, [html]);

  return (
    <article 
      ref={containerRef} 
      className="post-body prose"
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
}
```

### Component Hydration System

```jsx
// frontend/src/components/hydration/index.js

import { initTimeline } from './Timeline';
import { initLightbox } from './Lightbox';
import { initSidenote } from './Sidenote';

const componentRegistry = {
  'timeline': initTimeline,
  'lightbox': initLightbox,
  'sidenote': initSidenote,
};

export function hydrateComponents(container) {
  const cleanupFns = [];
  
  // Find all elements with data-component attribute
  const elements = container.querySelectorAll('[data-component]');
  
  elements.forEach(el => {
    const componentName = el.dataset.component;
    const initFn = componentRegistry[componentName];
    
    if (initFn) {
      const cleanup = initFn(el);
      if (cleanup) cleanupFns.push(cleanup);
    }
  });
  
  // Return cleanup function
  return () => {
    cleanupFns.forEach(fn => fn());
  };
}
```

### Example: Timeline Hydration

```jsx
// frontend/src/components/hydration/Timeline.jsx

export function initTimeline(element) {
  const events = element.querySelectorAll('.timeline-event');
  
  // Add intersection observer for scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.2 });
  
  events.forEach(event => {
    observer.observe(event);
  });
  
  // Add click interaction
  events.forEach(event => {
    event.addEventListener('click', handleEventClick);
  });
  
  function handleEventClick(e) {
    const year = e.currentTarget.dataset.year;
    // Expand details, highlight, etc.
    e.currentTarget.classList.toggle('expanded');
  }
  
  // Return cleanup
  return () => {
    observer.disconnect();
    events.forEach(event => {
      event.removeEventListener('click', handleEventClick);
    });
  };
}
```

### Example: Lightbox Hydration

```jsx
// frontend/src/components/hydration/Lightbox.jsx

export function initLightbox(figure) {
  const img = figure.querySelector('img');
  if (!img) return;
  
  function openLightbox() {
    // Create lightbox overlay
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
      <div class="lightbox-content">
        <img src="${img.src}" alt="${img.alt}"/>
        <button class="lightbox-close" aria-label="Close">×</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    // Add smooth entrance
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });
    
    // Close handlers
    const closeBtn = overlay.querySelector('.lightbox-close');
    closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeLightbox();
    });
    
    function closeLightbox() {
      overlay.classList.remove('visible');
      setTimeout(() => {
        document.body.removeChild(overlay);
        document.body.style.overflow = '';
      }, 300);
    }
  }
  
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', openLightbox);
  
  return () => {
    img.removeEventListener('click', openLightbox);
  };
}
```

---

## Page Transitions

Handle smooth transitions at the React router level, independent of post content.

```jsx
// frontend/src/components/PageTransition.jsx

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function PageTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionState, setTransitionState] = useState('entered');

  useEffect(() => {
    if (children !== displayChildren) {
      // Start exit animation
      setTransitionState('exiting');
      
      const timeout = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionState('entering');
        
        requestAnimationFrame(() => {
          setTransitionState('entered');
        });
      }, 300); // Match CSS transition duration
      
      return () => clearTimeout(timeout);
    }
  }, [children, displayChildren]);

  return (
    <div className={`page-transition ${transitionState}`}>
      {displayChildren}
    </div>
  );
}
```

---

## Future: Database Implementation

When ready to add dynamic content management, implement a new `ContentStore`:

```go
// internal/content/database.go

type DatabaseStore struct {
    db       *sql.DB
    renderer *Renderer
}

func (s *DatabaseStore) GetPost(ctx context.Context, slug string) (*Post, error) {
    row := s.db.QueryRowContext(ctx, `
        SELECT slug, title, publish_date, draft, tags, summary, raw_content
        FROM posts
        WHERE slug = ? AND draft = false AND publish_date <= ?
    `, slug, time.Now())
    
    var post Post
    // Scan and render...
    return &post, nil
}
```

Add admin API endpoints:

```
POST   /api/admin/posts          # Create post
PUT    /api/admin/posts/:slug    # Update post
DELETE /api/admin/posts/:slug    # Delete post
POST   /api/admin/posts/:slug/publish   # Publish draft
```

The frontend and all existing handlers continue working unchanged—they only interact with the `ContentStore` interface.

---

## Summary Checklist

### Backend Implementation

- [ ] Set up project structure
- [ ] Define `Post` and `PostMeta` types
- [ ] Define `ContentStore` interface
- [ ] Implement `EmbeddedStore` with embed.FS
- [ ] Set up Goldmark with extensions
- [ ] Implement shortcode parser (regex-based)
- [ ] Create templ components for post body
- [ ] Create templ components for each shortcode (Figure, Timeline, Quote, Sidenote)
- [ ] Wire up shortcode rendering to templ
- [ ] Implement HTTP handlers for posts API
- [ ] Integrate with existing Go+React template

### Frontend Implementation

- [ ] Create `PostBody` component with dangerouslySetInnerHTML
- [ ] Create hydration system with component registry
- [ ] Implement Timeline hydration (scroll animations, expand/collapse)
- [ ] Implement Lightbox hydration (image zoom overlay)
- [ ] Implement Sidenote hydration (toggle visibility)
- [ ] Add page transition wrapper
- [ ] Style components with CSS (minimal philosophy blog aesthetic)

### Content & Deployment

- [ ] Create example posts with frontmatter
- [ ] Test shortcode rendering
- [ ] Write Dockerfile
- [ ] Configure fly.toml
- [ ] Set up GitHub Actions for scheduled deploys
- [ ] Deploy to Fly.io

---

## Example Post

```markdown
---
title: "The Allegory of the Cave: A Modern Reading"
slug: "allegory-of-the-cave-modern"
publishDate: 2026-01-20T00:00:00Z
draft: false
tags:
  - plato
  - epistemology
  - perception
summary: "Revisiting Plato's cave allegory through the lens of contemporary media and technology."
---

In Book VII of *The Republic*, Plato presents perhaps the most enduring image in Western philosophy.

{{figure src="/images/cave-allegory.jpg" caption="An artist's interpretation of the cave" alt="Prisoners chained facing a wall with shadows"}}

## The Original Image

{{quote author="Plato" source="Republic, 514a-515a"}}
Allegory text here...
{{/quote}}

{{sidenote id="translation"}}
This translation by Bloom emphasizes the educational dimension.
{{/sidenote}}

## A Timeline of Interpretation

{{timeline start="380 BCE" end="2024 CE"}}
- 380 BCE: Plato writes The Republic
- 1600s: Enlightenment thinkers revisit the cave
- 1999: The Matrix brings the allegory to popular culture
- 2020s: Social media as shadow play
{{/timeline}}
```
