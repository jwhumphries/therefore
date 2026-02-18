package content

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"therefore/internal/renderer"

	"github.com/spf13/afero"
	"gopkg.in/yaml.v3"
)

var (
	// Match markdown images: ![alt](path) where path doesn't start with / or http
	imgRegex = regexp.MustCompile(`!\[([^\]]*)\]\(([^/)][^)]*)\)`)

	// Match code blocks
	codeBlockRegex = regexp.MustCompile("(?s)```.*?```")

	// Match inline code
	inlineCodeRegex = regexp.MustCompile("`[^`]+`")

	// Match shortcodes
	shortcodeRegex = regexp.MustCompile(`\{\{[^}]+\}\}`)
)

// SiteConfig contains site-wide configuration loaded from config.yaml.
type SiteConfig struct {
	Author Author `yaml:"author"`
}

// EmbeddedStore implements ContentStore using an afero filesystem.
// All posts are loaded and rendered at initialization time.
type EmbeddedStore struct {
	fs       afero.Fs
	config   SiteConfig
	posts    map[string]*Post // keyed by slug
	sorted   []*Post          // sorted by date, newest first
	tags     []TagCount
	tagIndex map[string][]*Post
	series   []SeriesCount

	mu sync.RWMutex
}

// NewEmbeddedStore creates a new store from the given filesystem.
// The fs should contain markdown files in the root directory.
// All posts are parsed and rendered immediately.
func NewEmbeddedStore(fs afero.Fs, renderer Renderer) (*EmbeddedStore, error) {
	store := &EmbeddedStore{
		fs:       fs,
		posts:    make(map[string]*Post),
		tagIndex: make(map[string][]*Post),
	}

	// Load site config if present
	if err := store.loadConfig(fs); err != nil {
		return nil, fmt.Errorf("loading config: %w", err)
	}

	if err := store.loadPosts(fs, renderer); err != nil {
		return nil, fmt.Errorf("loading posts: %w", err)
	}

	store.buildIndexes()
	return store, nil
}

func (s *EmbeddedStore) loadConfig(fs afero.Fs) error {
	f, err := fs.Open("config.yaml")
	if err != nil {
		if os.IsNotExist(err) {
			// Config is optional
			return nil
		}
		return fmt.Errorf("opening config: %w", err)
	}
	defer func() { _ = f.Close() }()

	content, err := io.ReadAll(f)
	if err != nil {
		return fmt.Errorf("reading config: %w", err)
	}

	if err := yaml.Unmarshal(content, &s.config); err != nil {
		return fmt.Errorf("parsing config: %w", err)
	}

	return nil
}

func (s *EmbeddedStore) loadPosts(fs afero.Fs, renderer Renderer) error {
	// Track directories we've processed as bundles to avoid double-processing
	processedBundles := make(map[string]bool)

	return afero.Walk(fs, ".", func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip non-markdown files
		if info.IsDir() || !strings.HasSuffix(path, ".md") {
			return nil
		}

		// Determine if this is a page bundle (dir/index.md) or standalone post
		var bundleDir string
		dir := filepath.Dir(path)
		filename := filepath.Base(path)

		if filename == "index.md" && dir != "." {
			// This is a page bundle
			bundleDir = dir
			if processedBundles[dir] {
				return nil // Already processed
			}
			processedBundles[dir] = true
		} else if dir != "." {
			// This is a .md file inside a directory but not index.md
			// Check if there's an index.md in the same dir (skip non-index files in bundles)
			if exists, _ := afero.Exists(fs, filepath.Join(dir, "index.md")); exists {
				return nil // Skip, the bundle's index.md will be processed
			}
		}

		post, err := s.parsePost(fs, path, renderer, bundleDir)
		if err != nil {
			return fmt.Errorf("parsing %s: %w", path, err)
		}

		// Skip drafts and future posts
		if post.Meta.Draft || post.Meta.PublishDate.After(time.Now()) {
			return nil
		}

		// Check for slug collision
		if existing, ok := s.posts[post.Meta.Slug]; ok {
			return fmt.Errorf("duplicate slug %q: found in both %q and %q",
				post.Meta.Slug, existing.Meta.Title, post.Meta.Title)
		}

		s.posts[post.Meta.Slug] = post
		return nil
	})
}

func (s *EmbeddedStore) parsePost(fs afero.Fs, path string, r Renderer, bundleDir string) (*Post, error) {
	f, err := fs.Open(path)
	if err != nil {
		return nil, fmt.Errorf("opening file: %w", err)
	}
	defer func() { _ = f.Close() }()

	content, err := io.ReadAll(f)
	if err != nil {
		return nil, fmt.Errorf("reading file: %w", err)
	}

	meta, raw, err := parseFrontmatter(content)
	if err != nil {
		return nil, fmt.Errorf("parsing frontmatter: %w", err)
	}

	// Default slug to filename/dirname without extension
	if meta.Slug == "" {
		if bundleDir != "" {
			// For bundles, use the directory name
			meta.Slug = filepath.Base(bundleDir)
		} else {
			meta.Slug = strings.TrimSuffix(filepath.Base(path), ".md")
		}
	}

	// Transform relative image paths for page bundles
	if bundleDir != "" {
		raw = transformBundleImagePaths(raw, meta.Slug)
	}

	// Build render context with citations from frontmatter
	var renderCtx *renderer.RenderContext
	if len(meta.Citations) > 0 {
		citations := make(map[string]struct {
			Text string
			URL  string
		}, len(meta.Citations))
		for alias, c := range meta.Citations {
			citations[alias] = struct {
				Text string
				URL  string
			}{Text: c.Text, URL: c.URL}
		}
		renderCtx = &renderer.RenderContext{
			Citations: citations,
		}
	}

	html, err := r.Render(raw, renderCtx)
	if err != nil {
		return nil, fmt.Errorf("rendering markdown: %w", err)
	}

	// Calculate word count from raw markdown
	meta.WordCount = countWords(raw)

	// Apply default author if not specified
	if meta.Author.Name == "" {
		meta.Author = s.config.Author
	}

	return &Post{
		Meta:        meta,
		RawContent:  raw,
		HTMLContent: html,
		BundleDir:   bundleDir,
	}, nil
}

// transformBundleImagePaths converts relative image paths to absolute paths for page bundles.
// e.g., ![alt](image.jpg) -> ![alt](/posts/my-slug/image.jpg)
func transformBundleImagePaths(content, slug string) string {
	return imgRegex.ReplaceAllStringFunc(content, func(match string) string {
		parts := imgRegex.FindStringSubmatch(match)
		if len(parts) != 3 {
			return match
		}
		alt, path := parts[1], parts[2]
		// Skip if already absolute or external URL
		if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
			return match
		}
		// Strip leading ./ if present
		path = strings.TrimPrefix(path, "./")
		return fmt.Sprintf("![%s](/posts/%s/%s)", alt, slug, path)
	})
}

// countWords counts words in markdown text, excluding code blocks and shortcodes.
func countWords(text string) int {
	// Remove code blocks
	text = codeBlockRegex.ReplaceAllString(text, "")

	// Remove inline code
	text = inlineCodeRegex.ReplaceAllString(text, "")

	// Remove shortcodes
	text = shortcodeRegex.ReplaceAllString(text, "")

	// Split on whitespace and count non-empty words
	words := strings.Fields(text)
	return len(words)
}

func parseFrontmatter(content []byte) (PostMeta, string, error) {
	var meta PostMeta

	reader := bufio.NewReader(bytes.NewReader(content))

	// Check for frontmatter delimiter
	firstLine, err := reader.ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return meta, "", err
	}

	if strings.TrimSpace(firstLine) != "---" {
		// No frontmatter, entire content is markdown
		return meta, string(content), nil
	}

	// Read until closing delimiter
	var frontmatter strings.Builder
	for {
		line, err := reader.ReadString('\n')
		if errors.Is(err, io.EOF) {
			return meta, "", fmt.Errorf("unclosed frontmatter")
		}
		if err != nil {
			return meta, "", err
		}

		if strings.TrimSpace(line) == "---" {
			break
		}
		frontmatter.WriteString(line)
	}

	if err := yaml.Unmarshal([]byte(frontmatter.String()), &meta); err != nil {
		return meta, "", fmt.Errorf("parsing YAML: %w", err)
	}

	// Rest is markdown content
	remaining, err := io.ReadAll(reader)
	if err != nil {
		return meta, "", err
	}

	return meta, strings.TrimSpace(string(remaining)), nil
}

// getTopTags returns the top N tags by count from a tag count map.
func getTopTags(tagCounts map[string]int, n int) []string {
	if len(tagCounts) == 0 {
		return nil
	}

	// Build slice for sorting
	type tagCount struct {
		tag   string
		count int
	}
	tags := make([]tagCount, 0, len(tagCounts))
	for tag, count := range tagCounts {
		tags = append(tags, tagCount{tag: tag, count: count})
	}

	// Sort by count descending, then by tag name
	sort.Slice(tags, func(i, j int) bool {
		if tags[i].count != tags[j].count {
			return tags[i].count > tags[j].count
		}
		return tags[i].tag < tags[j].tag
	})

	// Take top N
	result := make([]string, 0, n)
	for i := 0; i < n && i < len(tags); i++ {
		result = append(result, tags[i].tag)
	}
	return result
}

func (s *EmbeddedStore) buildIndexes() {
	// Build sorted list
	s.sorted = make([]*Post, 0, len(s.posts))
	for _, post := range s.posts {
		s.sorted = append(s.sorted, post)
	}
	sort.Slice(s.sorted, func(i, j int) bool {
		return s.sorted[i].Meta.PublishDate.After(s.sorted[j].Meta.PublishDate)
	})

	// Build tag index
	tagCounts := make(map[string]int)
	// Build series index
	seriesCounts := make(map[string]int)
	// Track tags per series for top tags calculation
	seriesTagCounts := make(map[string]map[string]int)
	// Track most recent post date per series
	seriesLatestDate := make(map[string]time.Time)

	for _, post := range s.posts {
		for _, tag := range post.Meta.Tags {
			tagCounts[tag]++
			s.tagIndex[tag] = append(s.tagIndex[tag], post)
		}
		if post.Meta.Series != "" {
			seriesCounts[post.Meta.Series]++
			// Track tags for this series
			if seriesTagCounts[post.Meta.Series] == nil {
				seriesTagCounts[post.Meta.Series] = make(map[string]int)
			}
			for _, tag := range post.Meta.Tags {
				seriesTagCounts[post.Meta.Series][tag]++
			}
			// Track most recent post in this series
			if post.Meta.PublishDate.After(seriesLatestDate[post.Meta.Series]) {
				seriesLatestDate[post.Meta.Series] = post.Meta.PublishDate
			}
		}
	}

	// Sort posts within each tag
	for tag := range s.tagIndex {
		posts := s.tagIndex[tag]
		sort.Slice(posts, func(i, j int) bool {
			return posts[i].Meta.PublishDate.After(posts[j].Meta.PublishDate)
		})
	}

	// Build sorted tag counts
	s.tags = make([]TagCount, 0, len(tagCounts))
	for tag, count := range tagCounts {
		s.tags = append(s.tags, TagCount{Tag: tag, Count: count})
	}
	sort.Slice(s.tags, func(i, j int) bool {
		if s.tags[i].Count != s.tags[j].Count {
			return s.tags[i].Count > s.tags[j].Count
		}
		return s.tags[i].Tag < s.tags[j].Tag
	})

	// Build sorted series counts with top tags
	s.series = make([]SeriesCount, 0, len(seriesCounts))
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	for series, count := range seriesCounts {
		// Get top 3 tags for this series
		topTags := getTopTags(seriesTagCounts[series], 3)
		// Check if the series has any posts from the last 7 days
		hasRecentPosts := seriesLatestDate[series].After(sevenDaysAgo)
		s.series = append(s.series, SeriesCount{
			Series:         series,
			Count:          count,
			TopTags:        topTags,
			HasRecentPosts: hasRecentPosts,
		})
	}
	// Sort series: active (posts within 30 days) first, then by count descending, then alphabetically
	sort.Slice(s.series, func(i, j int) bool {
		iActive := seriesLatestDate[s.series[i].Series].After(thirtyDaysAgo)
		jActive := seriesLatestDate[s.series[j].Series].After(thirtyDaysAgo)
		// Active series come first
		if iActive != jActive {
			return iActive
		}
		// Within same activity group, sort by count descending
		if s.series[i].Count != s.series[j].Count {
			return s.series[i].Count > s.series[j].Count
		}
		// Alphabetical as tiebreaker
		return s.series[i].Series < s.series[j].Series
	})
}

// GetPost retrieves a single post by slug.
func (s *EmbeddedStore) GetPost(_ context.Context, slug string) (*Post, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	post, ok := s.posts[slug]
	if !ok {
		return nil, ErrPostNotFound
	}
	return post, nil
}

// ListPosts returns posts matching the given options.
// Returns posts, total count (before pagination), and any error.
func (s *EmbeddedStore) ListPosts(_ context.Context, opts ListOptions) ([]*Post, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var source []*Post

	// Filter by tag if specified
	if opts.Tag != "" {
		source = s.tagIndex[opts.Tag]
	} else {
		source = s.sorted
	}

	// Filter by series if specified
	var filtered []*Post
	for _, post := range source {
		if opts.Series != "" && post.Meta.Series != opts.Series {
			continue
		}
		filtered = append(filtered, post)
	}

	// Apply sorting (default is date descending, which is already the default order)
	if opts.SortBy != "" || opts.SortOrder != "" {
		sortBy := opts.SortBy
		if sortBy == "" {
			sortBy = SortByDate
		}
		sortOrder := opts.SortOrder
		if sortOrder == "" {
			sortOrder = SortDesc
		}

		sort.SliceStable(filtered, func(i, j int) bool {
			var less bool
			switch sortBy {
			case SortByTitle:
				less = strings.ToLower(filtered[i].Meta.Title) < strings.ToLower(filtered[j].Meta.Title)
			case SortByReadingTime:
				less = filtered[i].Meta.ReadingTime() < filtered[j].Meta.ReadingTime()
			case SortByDate:
				fallthrough
			default:
				less = filtered[i].Meta.PublishDate.Before(filtered[j].Meta.PublishDate)
			}
			if sortOrder == SortDesc {
				return !less
			}
			return less
		})
	}

	// Capture total count before pagination
	total := len(filtered)

	// Apply offset and limit
	if opts.Offset > 0 {
		if opts.Offset >= len(filtered) {
			return nil, total, nil
		}
		filtered = filtered[opts.Offset:]
	}

	if opts.Limit > 0 && opts.Limit < len(filtered) {
		filtered = filtered[:opts.Limit]
	}

	return filtered, total, nil
}

// GetTags returns all tags with their post counts.
func (s *EmbeddedStore) GetTags(_ context.Context) ([]TagCount, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.tags, nil
}

// GetSeries returns all series with their post counts.
func (s *EmbeddedStore) GetSeries(_ context.Context) ([]SeriesCount, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.series, nil
}

// GetPostAsset retrieves an asset file from a post's bundle directory.
// Returns the file contents and an error if not found or not a bundle.
func (s *EmbeddedStore) GetPostAsset(_ context.Context, slug, filename string) ([]byte, error) {
	s.mu.RLock()
	post, ok := s.posts[slug]
	s.mu.RUnlock()

	if !ok {
		return nil, ErrPostNotFound
	}

	if post.BundleDir == "" {
		return nil, fmt.Errorf("post %q is not a bundle", slug)
	}

	// Prevent directory traversal
	if strings.Contains(filename, "..") || strings.HasPrefix(filename, "/") {
		return nil, fmt.Errorf("invalid filename")
	}

	assetPath := filepath.Join(post.BundleDir, filename)
	f, err := s.fs.Open(assetPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("asset not found: %s", filename)
		}
		return nil, err
	}
	defer func() { _ = f.Close() }()

	return io.ReadAll(f)
}
