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

	"github.com/spf13/afero"
	"gopkg.in/yaml.v3"
)

// EmbeddedStore implements ContentStore using an afero filesystem.
// All posts are loaded and rendered at initialization time.
type EmbeddedStore struct {
	posts    map[string]*Post // keyed by slug
	sorted   []*Post          // sorted by date, newest first
	tags     []TagCount
	tagIndex map[string][]*Post

	mu sync.RWMutex
}

// NewEmbeddedStore creates a new store from the given filesystem.
// The fs should contain markdown files in the root directory.
// All posts are parsed and rendered immediately.
func NewEmbeddedStore(fs afero.Fs, renderer Renderer) (*EmbeddedStore, error) {
	store := &EmbeddedStore{
		posts:    make(map[string]*Post),
		tagIndex: make(map[string][]*Post),
	}

	if err := store.loadPosts(fs, renderer); err != nil {
		return nil, fmt.Errorf("loading posts: %w", err)
	}

	store.buildIndexes()
	return store, nil
}

func (s *EmbeddedStore) loadPosts(fs afero.Fs, renderer Renderer) error {
	return afero.Walk(fs, ".", func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() || !strings.HasSuffix(path, ".md") {
			return nil
		}

		post, err := s.parsePost(fs, path, renderer)
		if err != nil {
			return fmt.Errorf("parsing %s: %w", path, err)
		}

		// Skip drafts and future posts
		if post.Meta.Draft || post.Meta.PublishDate.After(time.Now()) {
			return nil
		}

		s.posts[post.Meta.Slug] = post
		return nil
	})
}

func (s *EmbeddedStore) parsePost(fs afero.Fs, path string, renderer Renderer) (*Post, error) {
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

	// Default slug to filename without extension
	if meta.Slug == "" {
		meta.Slug = strings.TrimSuffix(filepath.Base(path), ".md")
	}

	html, err := renderer.Render(raw)
	if err != nil {
		return nil, fmt.Errorf("rendering markdown: %w", err)
	}

	// Calculate word count from raw markdown
	meta.WordCount = countWords(raw)

	return &Post{
		Meta:        meta,
		RawContent:  raw,
		HTMLContent: html,
	}, nil
}

// countWords counts words in markdown text, excluding code blocks and shortcodes.
func countWords(text string) int {
	// Remove code blocks
	codeBlockRegex := regexp.MustCompile("(?s)```.*?```")
	text = codeBlockRegex.ReplaceAllString(text, "")

	// Remove inline code
	inlineCodeRegex := regexp.MustCompile("`[^`]+`")
	text = inlineCodeRegex.ReplaceAllString(text, "")

	// Remove shortcodes
	shortcodeRegex := regexp.MustCompile(`\{\{[^}]+\}\}`)
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
	for _, post := range s.posts {
		for _, tag := range post.Meta.Tags {
			tagCounts[tag]++
			s.tagIndex[tag] = append(s.tagIndex[tag], post)
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
func (s *EmbeddedStore) ListPosts(_ context.Context, opts ListOptions) ([]*Post, error) {
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

	// Apply offset and limit
	if opts.Offset > 0 {
		if opts.Offset >= len(filtered) {
			return nil, nil
		}
		filtered = filtered[opts.Offset:]
	}

	if opts.Limit > 0 && opts.Limit < len(filtered) {
		filtered = filtered[:opts.Limit]
	}

	return filtered, nil
}

// GetTags returns all tags with their post counts.
func (s *EmbeddedStore) GetTags(_ context.Context) ([]TagCount, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.tags, nil
}
