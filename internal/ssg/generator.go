// Package ssg provides static site generation for SEO.
package ssg

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"therefore/internal/content"
	"therefore/internal/views"
)

// Generator produces static HTML files for SEO.
type Generator struct {
	store   content.ContentStore
	baseURL string
	outDir  string

	// Parsed from Vite's index.html
	cssLinks []string
	jsEntry  string
}

// New creates a new SSG generator.
func New(store content.ContentStore, baseURL, outDir string) *Generator {
	return &Generator{
		store:   store,
		baseURL: strings.TrimRight(baseURL, "/"),
		outDir:  outDir,
	}
}

// Generate produces all static HTML files.
func (g *Generator) Generate(ctx context.Context) error {
	// Parse Vite's index.html to extract asset references
	if err := g.parseViteAssets(); err != nil {
		return fmt.Errorf("parsing vite assets: %w", err)
	}

	slog.Info("Starting SSG generation", "outDir", g.outDir, "baseURL", g.baseURL)

	// Generate splash page
	if err := g.generateSplashPage(ctx); err != nil {
		return fmt.Errorf("generating splash page: %w", err)
	}

	// Generate posts list page
	if err := g.generateHomePage(ctx); err != nil {
		return fmt.Errorf("generating home page: %w", err)
	}

	// Generate individual post pages
	if err := g.generatePostPages(ctx); err != nil {
		return fmt.Errorf("generating post pages: %w", err)
	}

	// Generate tags pages
	if err := g.generateTagsPages(ctx); err != nil {
		return fmt.Errorf("generating tags pages: %w", err)
	}

	// Generate series page
	if err := g.generateSeriesPage(ctx); err != nil {
		return fmt.Errorf("generating series page: %w", err)
	}

	// Generate about page
	if err := g.generateAboutPage(ctx); err != nil {
		return fmt.Errorf("generating about page: %w", err)
	}

	slog.Info("SSG generation complete")
	return nil
}

// parseViteAssets reads the Vite-built index.html to extract CSS and JS references.
func (g *Generator) parseViteAssets() error {
	indexPath := filepath.Join(g.outDir, "index.html")
	data, err := os.ReadFile(indexPath)
	if err != nil {
		return fmt.Errorf("reading index.html: %w", err)
	}

	html := string(data)

	// Extract CSS links: <link rel="stylesheet" ... href="/assets/...">
	cssRegex := regexp.MustCompile(`<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']`)
	cssMatches := cssRegex.FindAllStringSubmatch(html, -1)
	for _, match := range cssMatches {
		if len(match) > 1 {
			g.cssLinks = append(g.cssLinks, match[1])
		}
	}

	// Also try the reverse order: href before rel
	cssRegex2 := regexp.MustCompile(`<link[^>]+href=["']([^"']+\.css)["'][^>]*>`)
	cssMatches2 := cssRegex2.FindAllStringSubmatch(html, -1)
	for _, match := range cssMatches2 {
		if len(match) > 1 && !contains(g.cssLinks, match[1]) {
			g.cssLinks = append(g.cssLinks, match[1])
		}
	}

	// Extract JS entry: <script type="module" src="/assets/...">
	jsRegex := regexp.MustCompile(`<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']`)
	jsMatches := jsRegex.FindAllStringSubmatch(html, -1)
	if len(jsMatches) > 0 && len(jsMatches[0]) > 1 {
		g.jsEntry = jsMatches[0][1]
	}

	// Also try reverse order
	if g.jsEntry == "" {
		jsRegex2 := regexp.MustCompile(`<script[^>]+src=["']([^"']+\.js)["'][^>]+type=["']module["']`)
		jsMatches2 := jsRegex2.FindAllStringSubmatch(html, -1)
		if len(jsMatches2) > 0 && len(jsMatches2[0]) > 1 {
			g.jsEntry = jsMatches2[0][1]
		}
	}

	slog.Debug("Parsed Vite assets", "css", g.cssLinks, "js", g.jsEntry)
	return nil
}

func (g *Generator) generateSplashPage(ctx context.Context) error {
	pageData := views.SSGPageData{
		Title:       "Therefore",
		Description: "A blog exploring ideas at the intersection of philosophy and theology.",
		URL:         g.baseURL,
		OGType:      "website",
		PageContent: views.SSGSplashPage(),
		CSSLinks:    g.cssLinks,
		JSEntry:     g.jsEntry,
		BaseURL:     g.baseURL,
	}

	// Splash page replaces the default index.html
	return g.writePage("index.html", pageData)
}

func (g *Generator) generateHomePage(ctx context.Context) error {
	posts, _, err := g.store.ListPosts(ctx, content.ListOptions{Limit: 10})
	if err != nil {
		return fmt.Errorf("listing posts: %w", err)
	}

	pageData := views.SSGPageData{
		Title:       "Latest Posts — Therefore",
		Description: "Browse the latest posts on Therefore.",
		URL:         g.baseURL + "/posts",
		OGType:      "website",
		PageContent: views.SSGLayout(views.SSGHomePage(posts)),
		SSGData: map[string]any{
			"posts": postsToJSON(posts),
			"total": len(posts),
		},
		CSSLinks: g.cssLinks,
		JSEntry:  g.jsEntry,
		BaseURL:  g.baseURL,
	}

	return g.writePage("posts/index.html", pageData)
}

func (g *Generator) generatePostPages(ctx context.Context) error {
	posts, _, err := g.store.ListPosts(ctx, content.ListOptions{})
	if err != nil {
		return fmt.Errorf("listing posts: %w", err)
	}

	for _, post := range posts {
		if err := g.generatePostPage(ctx, post); err != nil {
			return fmt.Errorf("generating post %s: %w", post.Meta.Slug, err)
		}
	}

	slog.Info("Generated post pages", "count", len(posts))
	return nil
}

func (g *Generator) generatePostPage(ctx context.Context, post *content.Post) error {
	// Render article HTML
	articleHTML := views.RenderToString(views.Article(post, post.HTMLContent))

	pageData := views.SSGPageData{
		Title:       post.Meta.Title + " — Therefore",
		Description: post.Meta.Summary,
		URL:         g.baseURL + "/posts/" + post.Meta.Slug,
		OGType:      "article",
		PublishedAt: post.Meta.PublishDate.Format("2006-01-02T15:04:05Z07:00"),
		PageContent: views.SSGLayout(views.SSGPostPage(post, articleHTML)),
		SSGData: map[string]any{
			"post": postToJSON(post),
		},
		CSSLinks: g.cssLinks,
		JSEntry:  g.jsEntry,
		BaseURL:  g.baseURL,
	}

	return g.writePage(fmt.Sprintf("posts/%s.html", post.Meta.Slug), pageData)
}

func (g *Generator) generateTagsPages(ctx context.Context) error {
	tags, err := g.store.GetTags(ctx)
	if err != nil {
		return fmt.Errorf("listing tags: %w", err)
	}

	// Tags list page
	pageData := views.SSGPageData{
		Title:       "Tags — Therefore",
		Description: "Browse all tags on Therefore.",
		URL:         g.baseURL + "/tags",
		OGType:      "website",
		PageContent: views.SSGLayout(views.SSGTagsPage(tags)),
		CSSLinks:    g.cssLinks,
		JSEntry:     g.jsEntry,
		BaseURL:     g.baseURL,
	}

	if err := g.writePage("tags/index.html", pageData); err != nil {
		return err
	}

	// Individual tag pages
	for _, tag := range tags {
		if err := g.generateTagPage(ctx, tag.Tag); err != nil {
			return fmt.Errorf("generating tag page %s: %w", tag.Tag, err)
		}
	}

	slog.Info("Generated tag pages", "count", len(tags)+1)
	return nil
}

func (g *Generator) generateTagPage(ctx context.Context, tag string) error {
	posts, total, err := g.store.ListPosts(ctx, content.ListOptions{Tag: tag, Limit: 6})
	if err != nil {
		return fmt.Errorf("listing posts for tag: %w", err)
	}

	pageData := views.SSGPageData{
		Title:       fmt.Sprintf("Posts tagged \"%s\" — Therefore", tag),
		Description: fmt.Sprintf("All posts tagged \"%s\" on Therefore.", tag),
		URL:         g.baseURL + "/tags/" + tag,
		OGType:      "website",
		PageContent: views.SSGLayout(views.SSGTagPage(tag, posts, total)),
		SSGData: map[string]any{
			"posts": postsToJSON(posts),
			"total": total,
			"tag":   tag,
		},
		CSSLinks: g.cssLinks,
		JSEntry:  g.jsEntry,
		BaseURL:  g.baseURL,
	}

	return g.writePage(fmt.Sprintf("tags/%s.html", tag), pageData)
}

func (g *Generator) generateSeriesPage(ctx context.Context) error {
	series, err := g.store.GetSeries(ctx)
	if err != nil {
		return fmt.Errorf("listing series: %w", err)
	}

	pageData := views.SSGPageData{
		Title:       "Series — Therefore",
		Description: "Browse all series on Therefore.",
		URL:         g.baseURL + "/series",
		OGType:      "website",
		PageContent: views.SSGLayout(views.SSGSeriesPage(series)),
		CSSLinks:    g.cssLinks,
		JSEntry:     g.jsEntry,
		BaseURL:     g.baseURL,
	}

	if err := g.writePage("series/index.html", pageData); err != nil {
		return err
	}

	slog.Info("Generated series page")
	return nil
}

func (g *Generator) generateAboutPage(ctx context.Context) error {
	pageData := views.SSGPageData{
		Title:       "About — Therefore",
		Description: "About Therefore — a blog exploring philosophy and theology.",
		URL:         g.baseURL + "/about",
		OGType:      "website",
		PageContent: views.SSGLayout(views.SSGAboutPage()),
		CSSLinks:    g.cssLinks,
		JSEntry:     g.jsEntry,
		BaseURL:     g.baseURL,
	}

	return g.writePage("about/index.html", pageData)
}

func (g *Generator) writePage(relPath string, data views.SSGPageData) error {
	fullPath := filepath.Join(g.outDir, relPath)

	// Ensure directory exists
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("creating directory: %w", err)
	}

	// Render page
	html := views.RenderToString(views.SSGPage(data))

	// Write file
	if err := os.WriteFile(fullPath, []byte(html), 0644); err != nil {
		return fmt.Errorf("writing file: %w", err)
	}

	slog.Debug("Generated page", "path", relPath)
	return nil
}

// Helper functions

func contains(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}

// postToJSON converts a Post to a JSON-serializable map matching the API response.
func postToJSON(p *content.Post) map[string]any {
	m := map[string]any{
		"slug":        p.Meta.Slug,
		"title":       p.Meta.Title,
		"summary":     p.Meta.Summary,
		"publishDate": p.Meta.PublishDate.Format("2006-01-02T15:04:05Z07:00"),
		"tags":        p.Meta.Tags,
		"readingTime": p.Meta.WordCount / 200,
		"htmlContent": p.HTMLContent,
	}
	if p.Meta.Series != "" {
		m["series"] = p.Meta.Series
	}
	if p.Meta.Author.Name != "" {
		m["author"] = map[string]string{
			"name":   p.Meta.Author.Name,
			"avatar": p.Meta.Author.Avatar,
			"bio":    p.Meta.Author.Bio,
		}
	}
	return m
}

func postsToJSON(posts []*content.Post) []map[string]any {
	result := make([]map[string]any, len(posts))
	for i, p := range posts {
		// List items don't include htmlContent
		result[i] = map[string]any{
			"slug":        p.Meta.Slug,
			"title":       p.Meta.Title,
			"summary":     p.Meta.Summary,
			"publishDate": p.Meta.PublishDate.Format("2006-01-02T15:04:05Z07:00"),
			"tags":        p.Meta.Tags,
			"readingTime": p.Meta.WordCount / 200,
		}
		if p.Meta.Series != "" {
			result[i]["series"] = p.Meta.Series
		}
	}
	return result
}
