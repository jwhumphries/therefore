package content

import "time"

// Author contains information about the post author.
type Author struct {
	Name   string `yaml:"name"`
	Avatar string `yaml:"avatar"` // URL or path to avatar image
	Bio    string `yaml:"bio"`
}

// Citation represents a reusable citation defined in frontmatter.
type Citation struct {
	Text string `yaml:"text"` // Display text (e.g., "Aquinas, Summa Theologica (1265)")
	URL  string `yaml:"url"`  // Link to source
}

// PostMeta contains metadata parsed from YAML frontmatter.
type PostMeta struct {
	Title       string              `yaml:"title"`
	Slug        string              `yaml:"slug"`
	Summary     string              `yaml:"summary"`
	Series      string              `yaml:"series,omitempty"`
	PublishDate time.Time           `yaml:"publishDate"`
	Draft       bool                `yaml:"draft,omitempty"`
	Tags        []string            `yaml:"tags,omitempty"`
	Author      Author              `yaml:"author,omitempty"`
	Citations   map[string]Citation `yaml:"citations,omitempty"` // Alias -> Citation mapping
	WordCount   int                 `yaml:"-"`                   // Computed from content, not parsed from YAML
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
	BundleDir   string // Directory path for page bundles (empty for standalone posts)
}

// SortField represents the field to sort posts by.
type SortField string

const (
	SortByDate        SortField = "date"
	SortByTitle       SortField = "title"
	SortByReadingTime SortField = "readingTime"
)

// SortOrder represents the sort direction.
type SortOrder string

const (
	SortAsc  SortOrder = "asc"
	SortDesc SortOrder = "desc"
)

// ListOptions configures post list queries.
type ListOptions struct {
	Tag          string
	Series       string
	IncludeDraft bool
	Limit        int
	Offset       int
	SortBy       SortField
	SortOrder    SortOrder
}

// TagCount represents a tag with its post count.
type TagCount struct {
	Tag   string
	Count int
}

// SeriesCount represents a series with its post count.
type SeriesCount struct {
	Series         string
	Count          int
	TopTags        []string // Top 3 most common tags across posts in this series
	HasRecentPosts bool     // True if any post in the series was published within the last 7 days
}
