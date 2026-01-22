package content

import "time"

// Author contains information about the post author.
type Author struct {
	Name   string `yaml:"name"`
	Avatar string `yaml:"avatar"` // URL or path to avatar image
	Bio    string `yaml:"bio"`
}

// PostMeta contains metadata parsed from YAML frontmatter.
type PostMeta struct {
	Title       string    `yaml:"title"`
	Slug        string    `yaml:"slug"`
	Summary     string    `yaml:"summary"`
	Series      string    `yaml:"series,omitempty"`
	PublishDate time.Time `yaml:"publishDate"`
	Draft       bool      `yaml:"draft,omitempty"`
	Tags        []string  `yaml:"tags,omitempty"`
	Author      Author    `yaml:"author,omitempty"`
	WordCount   int       `yaml:"-"` // Computed from content, not parsed from YAML
}

// ReadingTime returns the estimated reading time in minutes.
// Assumes ~200 words per minute reading speed.
func (m PostMeta) ReadingTime() int {
	minutes := m.WordCount / 200
	if minutes < 1 {
		return 1
	}
	return minutes
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
