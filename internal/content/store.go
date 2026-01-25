package content

import (
	"context"
	"errors"
)

var (
	// ErrPostNotFound is returned when a post cannot be found.
	ErrPostNotFound = errors.New("post not found")
)

// Renderer converts raw markdown content to HTML.
type Renderer interface {
	Render(raw string) (string, error)
}

// ContentStore provides access to blog posts.
type ContentStore interface {
	// GetPost retrieves a single post by slug.
	GetPost(ctx context.Context, slug string) (*Post, error)

	// ListPosts returns posts matching the given options.
	// Posts are returned sorted by publish date, newest first.
	// Returns the posts, total count (before pagination), and any error.
	ListPosts(ctx context.Context, opts ListOptions) ([]*Post, int, error)

	// GetTags returns all tags with their post counts.
	GetTags(ctx context.Context) ([]TagCount, error)

	// GetSeries returns all series with their post counts.
	GetSeries(ctx context.Context) ([]SeriesCount, error)

	// GetPostAsset retrieves an asset from a post's bundle directory.
	GetPostAsset(ctx context.Context, slug, filename string) ([]byte, error)
}
