package content

import "time"

// PostMeta contains metadata parsed from YAML frontmatter.
type PostMeta struct {
	Title       string    `yaml:"title"`
	Slug        string    `yaml:"slug"`
	Summary     string    `yaml:"summary"`
	Series      string    `yaml:"series,omitempty"`
	PublishDate time.Time `yaml:"publishDate"`
	Draft       bool      `yaml:"draft,omitempty"`
	Tags        []string  `yaml:"tags,omitempty"`
}

// Post represents a blog post with metadata and content.
type Post struct {
	Meta        PostMeta
	RawContent  string // Original markdown without frontmatter
	HTMLContent string // Rendered HTML
}

// ListOptions configures post list queries.
type ListOptions struct {
	Tag          string
	Series       string
	IncludeDraft bool
	Limit        int
	Offset       int
}

// TagCount represents a tag with its post count.
type TagCount struct {
	Tag   string
	Count int
}
