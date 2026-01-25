package content

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/spf13/afero"
)

// mockRenderer implements Renderer for testing.
type mockRenderer struct{}

func (m *mockRenderer) Render(raw string) (string, error) {
	return "<p>" + raw + "</p>", nil
}

func TestParseFrontmatter(t *testing.T) {
	tests := []struct {
		name        string
		content     string
		wantTitle   string
		wantSlug    string
		wantTags    []string
		wantContent string
		wantErr     bool
	}{
		{
			name: "valid frontmatter",
			content: `---
title: Test Post
slug: test-post
tags:
  - philosophy
  - ethics
---
This is the content.`,
			wantTitle:   "Test Post",
			wantSlug:    "test-post",
			wantTags:    []string{"philosophy", "ethics"},
			wantContent: "This is the content.",
		},
		{
			name:        "no frontmatter",
			content:     "Just some markdown content.",
			wantTitle:   "",
			wantContent: "Just some markdown content.",
		},
		{
			name: "unclosed frontmatter",
			content: `---
title: Broken
no closing delimiter`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			meta, content, err := parseFrontmatter([]byte(tt.content))
			if (err != nil) != tt.wantErr {
				t.Errorf("parseFrontmatter() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				return
			}

			if meta.Title != tt.wantTitle {
				t.Errorf("Title = %q, want %q", meta.Title, tt.wantTitle)
			}
			if meta.Slug != tt.wantSlug {
				t.Errorf("Slug = %q, want %q", meta.Slug, tt.wantSlug)
			}
			if len(meta.Tags) != len(tt.wantTags) {
				t.Errorf("Tags = %v, want %v", meta.Tags, tt.wantTags)
			}
			if content != tt.wantContent {
				t.Errorf("Content = %q, want %q", content, tt.wantContent)
			}
		})
	}
}

func TestEmbeddedStore_GetPost(t *testing.T) {
	fs := afero.NewMemMapFs()
	past := time.Now().Add(-24 * time.Hour).Format(time.RFC3339)

	_ = afero.WriteFile(fs, "test-post.md", []byte(`---
title: Test Post
slug: test-post
publishDate: `+past+`
---
Content here.`), 0644)

	store, err := NewEmbeddedStore(fs, &mockRenderer{})
	if err != nil {
		t.Fatalf("NewEmbeddedStore() error = %v", err)
	}

	ctx := context.Background()

	// Test successful get
	post, err := store.GetPost(ctx, "test-post")
	if err != nil {
		t.Errorf("GetPost() error = %v", err)
	}
	if post.Meta.Title != "Test Post" {
		t.Errorf("Title = %q, want %q", post.Meta.Title, "Test Post")
	}
	if post.HTMLContent != "<p>Content here.</p>" {
		t.Errorf("HTMLContent = %q, want %q", post.HTMLContent, "<p>Content here.</p>")
	}

	// Test not found
	_, err = store.GetPost(ctx, "nonexistent")
	if !errors.Is(err, ErrPostNotFound) {
		t.Errorf("GetPost(nonexistent) error = %v, want ErrPostNotFound", err)
	}
}

func TestEmbeddedStore_DraftFiltering(t *testing.T) {
	fs := afero.NewMemMapFs()
	past := time.Now().Add(-24 * time.Hour).Format(time.RFC3339)

	// Published post
	_ = afero.WriteFile(fs, "published.md", []byte(`---
title: Published
slug: published
publishDate: `+past+`
draft: false
---
Published content.`), 0644)

	// Draft post
	_ = afero.WriteFile(fs, "draft.md", []byte(`---
title: Draft
slug: draft
publishDate: `+past+`
draft: true
---
Draft content.`), 0644)

	store, err := NewEmbeddedStore(fs, &mockRenderer{})
	if err != nil {
		t.Fatalf("NewEmbeddedStore() error = %v", err)
	}

	ctx := context.Background()

	// Published should be found
	_, err = store.GetPost(ctx, "published")
	if err != nil {
		t.Errorf("GetPost(published) error = %v", err)
	}

	// Draft should not be found
	_, err = store.GetPost(ctx, "draft")
	if !errors.Is(err, ErrPostNotFound) {
		t.Errorf("GetPost(draft) error = %v, want ErrPostNotFound", err)
	}
}

func TestEmbeddedStore_FutureDateFiltering(t *testing.T) {
	fs := afero.NewMemMapFs()
	past := time.Now().Add(-24 * time.Hour).Format(time.RFC3339)
	future := time.Now().Add(24 * time.Hour).Format(time.RFC3339)

	// Past post
	_ = afero.WriteFile(fs, "past.md", []byte(`---
title: Past Post
slug: past-post
publishDate: `+past+`
---
Past content.`), 0644)

	// Future post
	_ = afero.WriteFile(fs, "future.md", []byte(`---
title: Future Post
slug: future-post
publishDate: `+future+`
---
Future content.`), 0644)

	store, err := NewEmbeddedStore(fs, &mockRenderer{})
	if err != nil {
		t.Fatalf("NewEmbeddedStore() error = %v", err)
	}

	ctx := context.Background()

	// Past should be found
	_, err = store.GetPost(ctx, "past-post")
	if err != nil {
		t.Errorf("GetPost(past-post) error = %v", err)
	}

	// Future should not be found
	_, err = store.GetPost(ctx, "future-post")
	if !errors.Is(err, ErrPostNotFound) {
		t.Errorf("GetPost(future-post) error = %v, want ErrPostNotFound", err)
	}
}

func TestEmbeddedStore_ListPosts(t *testing.T) {
	fs := afero.NewMemMapFs()
	now := time.Now()

	// Create posts with different dates
	for i, name := range []string{"third", "first", "second"} {
		date := now.Add(time.Duration(-i*24) * time.Hour).Format(time.RFC3339)
		_ = afero.WriteFile(fs, name+".md", []byte(`---
title: `+name+`
slug: `+name+`
publishDate: `+date+`
tags:
  - test
---
Content.`), 0644)
	}

	store, err := NewEmbeddedStore(fs, &mockRenderer{})
	if err != nil {
		t.Fatalf("NewEmbeddedStore() error = %v", err)
	}

	ctx := context.Background()

	// Test sorting (newest first)
	posts, total, err := store.ListPosts(ctx, ListOptions{})
	if err != nil {
		t.Fatalf("ListPosts() error = %v", err)
	}
	if len(posts) != 3 {
		t.Fatalf("len(posts) = %d, want 3", len(posts))
	}
	if total != 3 {
		t.Errorf("total = %d, want 3", total)
	}
	if posts[0].Meta.Slug != "third" {
		t.Errorf("posts[0].Slug = %q, want %q", posts[0].Meta.Slug, "third")
	}

	// Test limit
	posts, total, err = store.ListPosts(ctx, ListOptions{Limit: 2})
	if err != nil {
		t.Fatalf("ListPosts(limit=2) error = %v", err)
	}
	if len(posts) != 2 {
		t.Errorf("len(posts) = %d, want 2", len(posts))
	}
	if total != 3 {
		t.Errorf("total = %d, want 3 (total before pagination)", total)
	}

	// Test offset
	posts, total, err = store.ListPosts(ctx, ListOptions{Offset: 1})
	if err != nil {
		t.Fatalf("ListPosts(offset=1) error = %v", err)
	}
	if len(posts) != 2 {
		t.Errorf("len(posts) = %d, want 2", len(posts))
	}
	if total != 3 {
		t.Errorf("total = %d, want 3 (total before pagination)", total)
	}
}

func TestEmbeddedStore_TagFiltering(t *testing.T) {
	fs := afero.NewMemMapFs()
	past := time.Now().Add(-24 * time.Hour).Format(time.RFC3339)

	_ = afero.WriteFile(fs, "philosophy.md", []byte(`---
title: Philosophy Post
slug: philosophy
publishDate: `+past+`
tags:
  - philosophy
---
Content.`), 0644)

	_ = afero.WriteFile(fs, "theology.md", []byte(`---
title: Theology Post
slug: theology
publishDate: `+past+`
tags:
  - theology
---
Content.`), 0644)

	_ = afero.WriteFile(fs, "both.md", []byte(`---
title: Both Post
slug: both
publishDate: `+past+`
tags:
  - philosophy
  - theology
---
Content.`), 0644)

	store, err := NewEmbeddedStore(fs, &mockRenderer{})
	if err != nil {
		t.Fatalf("NewEmbeddedStore() error = %v", err)
	}

	ctx := context.Background()

	// Filter by philosophy tag
	posts, total, err := store.ListPosts(ctx, ListOptions{Tag: "philosophy"})
	if err != nil {
		t.Fatalf("ListPosts(tag=philosophy) error = %v", err)
	}
	if len(posts) != 2 {
		t.Errorf("len(posts) = %d, want 2", len(posts))
	}
	if total != 2 {
		t.Errorf("total = %d, want 2", total)
	}

	// Filter by theology tag
	posts, total, err = store.ListPosts(ctx, ListOptions{Tag: "theology"})
	if err != nil {
		t.Fatalf("ListPosts(tag=theology) error = %v", err)
	}
	if len(posts) != 2 {
		t.Errorf("len(posts) = %d, want 2", len(posts))
	}
	if total != 2 {
		t.Errorf("total = %d, want 2", total)
	}

	// Filter by nonexistent tag
	posts, total, err = store.ListPosts(ctx, ListOptions{Tag: "nonexistent"})
	if err != nil {
		t.Fatalf("ListPosts(tag=nonexistent) error = %v", err)
	}
	if len(posts) != 0 {
		t.Errorf("len(posts) = %d, want 0", len(posts))
	}
	if total != 0 {
		t.Errorf("total = %d, want 0", total)
	}
}

func TestEmbeddedStore_GetTags(t *testing.T) {
	fs := afero.NewMemMapFs()
	past := time.Now().Add(-24 * time.Hour).Format(time.RFC3339)

	_ = afero.WriteFile(fs, "post1.md", []byte(`---
title: Post 1
slug: post1
publishDate: `+past+`
tags:
  - common
  - rare
---
Content.`), 0644)

	_ = afero.WriteFile(fs, "post2.md", []byte(`---
title: Post 2
slug: post2
publishDate: `+past+`
tags:
  - common
---
Content.`), 0644)

	store, err := NewEmbeddedStore(fs, &mockRenderer{})
	if err != nil {
		t.Fatalf("NewEmbeddedStore() error = %v", err)
	}

	ctx := context.Background()

	tags, err := store.GetTags(ctx)
	if err != nil {
		t.Fatalf("GetTags() error = %v", err)
	}
	if len(tags) != 2 {
		t.Fatalf("len(tags) = %d, want 2", len(tags))
	}

	// Tags should be sorted by count (descending), then name
	if tags[0].Tag != "common" || tags[0].Count != 2 {
		t.Errorf("tags[0] = %+v, want {Tag: common, Count: 2}", tags[0])
	}
	if tags[1].Tag != "rare" || tags[1].Count != 1 {
		t.Errorf("tags[1] = %+v, want {Tag: rare, Count: 1}", tags[1])
	}
}

func TestEmbeddedStore_DefaultSlug(t *testing.T) {
	fs := afero.NewMemMapFs()
	past := time.Now().Add(-24 * time.Hour).Format(time.RFC3339)

	// Post without explicit slug - should use filename
	_ = afero.WriteFile(fs, "my-post-name.md", []byte(`---
title: My Post
publishDate: `+past+`
---
Content.`), 0644)

	store, err := NewEmbeddedStore(fs, &mockRenderer{})
	if err != nil {
		t.Fatalf("NewEmbeddedStore() error = %v", err)
	}

	ctx := context.Background()

	post, err := store.GetPost(ctx, "my-post-name")
	if err != nil {
		t.Errorf("GetPost(my-post-name) error = %v", err)
	}
	if post.Meta.Slug != "my-post-name" {
		t.Errorf("Slug = %q, want %q", post.Meta.Slug, "my-post-name")
	}
}

func TestEmbeddedStore_GetSeries(t *testing.T) {
	fs := afero.NewMemMapFs()
	past := time.Now().Add(-24 * time.Hour).Format(time.RFC3339)

	_ = afero.WriteFile(fs, "post1.md", []byte(`---
title: Post 1
slug: post1
publishDate: `+past+`
series: Series A
tags: [philosophy, ethics]
---
Content.`), 0644)

	_ = afero.WriteFile(fs, "post2.md", []byte(`---
title: Post 2
slug: post2
publishDate: `+past+`
series: Series A
tags: [philosophy, metaphysics]
---
Content.`), 0644)

	_ = afero.WriteFile(fs, "post3.md", []byte(`---
title: Post 3
slug: post3
publishDate: `+past+`
series: Series B
tags: [theology]
---
Content.`), 0644)

	store, err := NewEmbeddedStore(fs, &mockRenderer{})
	if err != nil {
		t.Fatalf("NewEmbeddedStore() error = %v", err)
	}

	ctx := context.Background()

	series, err := store.GetSeries(ctx)
	if err != nil {
		t.Fatalf("GetSeries() error = %v", err)
	}
	if len(series) != 2 {
		t.Fatalf("len(series) = %d, want 2", len(series))
	}

	// Series should be sorted by count (descending), then name
	if series[0].Series != "Series A" || series[0].Count != 2 {
		t.Errorf("series[0] = %+v, want {Series: Series A, Count: 2}", series[0])
	}
	if series[1].Series != "Series B" || series[1].Count != 1 {
		t.Errorf("series[1] = %+v, want {Series: Series B, Count: 1}", series[1])
	}

	// TopTags should be computed correctly
	// Series A has: philosophy (2), ethics (1), metaphysics (1)
	// Top 3 should be: philosophy, ethics, metaphysics (sorted alphabetically for ties)
	if len(series[0].TopTags) != 3 {
		t.Errorf("series[0].TopTags length = %d, want 3", len(series[0].TopTags))
	}
	if series[0].TopTags[0] != "philosophy" {
		t.Errorf("series[0].TopTags[0] = %q, want philosophy", series[0].TopTags[0])
	}

	// Series B has: theology (1)
	if len(series[1].TopTags) != 1 || series[1].TopTags[0] != "theology" {
		t.Errorf("series[1].TopTags = %v, want [theology]", series[1].TopTags)
	}
}
