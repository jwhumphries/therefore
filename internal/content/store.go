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
	ListPosts(ctx context.Context, opts ListOptions) ([]*Post, error)

	// GetTags returns all tags with their post counts.
	GetTags(ctx context.Context) ([]TagCount, error)

	// GetPostAsset retrieves an asset from a post's bundle directory.
	GetPostAsset(ctx context.Context, slug, filename string) ([]byte, error)
}
