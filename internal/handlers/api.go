package handlers

import (
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"therefore/internal/content"
	"therefore/internal/views"

	"github.com/labstack/echo/v5"
)

// APIHandler handles JSON API requests.
type APIHandler struct {
	store content.ContentStore
}

// NewAPIHandler creates a new APIHandler.
func NewAPIHandler(store content.ContentStore) *APIHandler {
	return &APIHandler{store: store}
}

// AuthorResponse is the JSON representation of an author.
type AuthorResponse struct {
	Name   string `json:"name,omitempty"`
	Avatar string `json:"avatar,omitempty"`
	Bio    string `json:"bio,omitempty"`
}

// PostResponse is the JSON representation of a post.
type PostResponse struct {
	Slug          string          `json:"slug"`
	Title         string          `json:"title"`
	Summary       string          `json:"summary,omitempty"`
	PublishDate   string          `json:"publishDate"`
	Tags          []string        `json:"tags,omitempty"`
	Series        string          `json:"series,omitempty"`
	ReadingTime   int             `json:"readingTime"` // minutes
	SearchContent string          `json:"searchContent,omitempty"`
	HTMLContent   string          `json:"htmlContent,omitempty"`
	Author        *AuthorResponse `json:"author,omitempty"`
}

// ListPostsResponse is the JSON response for listing posts.
type ListPostsResponse struct {
	Posts []PostResponse `json:"posts"`
	Total int            `json:"total"`
}

// TagResponse is the JSON representation of a tag.
type TagResponse struct {
	Tag   string `json:"tag"`
	Count int    `json:"count"`
}

// SeriesResponse is the JSON representation of a series.
type SeriesResponse struct {
	Series         string   `json:"series"`
	Count          int      `json:"count"`
	TopTags        []string `json:"topTags,omitempty"`
	HasRecentPosts bool     `json:"hasRecentPosts"`
}

// ListPosts returns a JSON list of posts.
func (h *APIHandler) ListPosts(c *echo.Context) error {
	opts := content.ListOptions{}

	if tag := c.QueryParam("tag"); tag != "" {
		opts.Tag = tag
	}
	if series := c.QueryParam("series"); series != "" {
		opts.Series = series
	}
	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			opts.Limit = limit
		}
	}
	if offsetStr := c.QueryParam("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			opts.Offset = offset
		}
	}
	if sortBy := c.QueryParam("sortBy"); sortBy != "" {
		switch sortBy {
		case "date":
			opts.SortBy = content.SortByDate
		case "title":
			opts.SortBy = content.SortByTitle
		case "readingTime":
			opts.SortBy = content.SortByReadingTime
		}
	}
	if sortOrder := c.QueryParam("sortOrder"); sortOrder != "" {
		switch sortOrder {
		case "asc":
			opts.SortOrder = content.SortAsc
		case "desc":
			opts.SortOrder = content.SortDesc
		}
	}

	posts, total, err := h.store.ListPosts(c.Request().Context(), opts)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list posts")
	}

	resp := ListPostsResponse{
		Posts: make([]PostResponse, 0, len(posts)),
		Total: total,
	}

	for _, post := range posts {
		resp.Posts = append(resp.Posts, postToResponse(post, false, true))
	}

	return c.JSON(http.StatusOK, resp)
}

// GetPost returns a single post as JSON.
func (h *APIHandler) GetPost(c *echo.Context) error {
	slug := c.Param("slug")
	post, err := h.store.GetPost(c.Request().Context(), slug)
	if err != nil {
		if errors.Is(err, content.ErrPostNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "post not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to get post")
	}

	return c.JSON(http.StatusOK, postToResponse(post, true, false))
}

// ListTags returns a JSON list of tags with counts.
func (h *APIHandler) ListTags(c *echo.Context) error {
	tags, err := h.store.GetTags(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to get tags")
	}

	resp := make([]TagResponse, 0, len(tags))
	for _, tag := range tags {
		resp = append(resp, TagResponse{
			Tag:   tag.Tag,
			Count: tag.Count,
		})
	}

	return c.JSON(http.StatusOK, resp)
}

// ListSeries returns a JSON list of series with counts.
func (h *APIHandler) ListSeries(c *echo.Context) error {
	series, err := h.store.GetSeries(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to get series")
	}

	resp := make([]SeriesResponse, 0, len(series))
	for _, s := range series {
		resp = append(resp, SeriesResponse{
			Series:         s.Series,
			Count:          s.Count,
			TopTags:        s.TopTags,
			HasRecentPosts: s.HasRecentPosts,
		})
	}

	return c.JSON(http.StatusOK, resp)
}

// GetPostAsset serves a static asset from a post's bundle directory.
func (h *APIHandler) GetPostAsset(c *echo.Context) error {
	slug := c.Param("slug")
	filename := c.Param("filename")

	data, err := h.store.GetPostAsset(c.Request().Context(), slug, filename)
	if err != nil {
		if errors.Is(err, content.ErrPostNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "post not found")
		}
		return echo.NewHTTPError(http.StatusNotFound, "asset not found")
	}

	// Determine content type from extension
	contentType := "application/octet-stream"
	switch {
	case hasExtension(filename, ".jpg", ".jpeg"):
		contentType = "image/jpeg"
	case hasExtension(filename, ".png"):
		contentType = "image/png"
	case hasExtension(filename, ".gif"):
		contentType = "image/gif"
	case hasExtension(filename, ".webp"):
		contentType = "image/webp"
	case hasExtension(filename, ".svg"):
		contentType = "image/svg+xml"
	case hasExtension(filename, ".pdf"):
		contentType = "application/pdf"
	}

	c.Response().Header().Set("Content-Type", contentType)
	c.Response().Header().Set("Cache-Control", "public, max-age=31536000") // 1 year
	return c.Blob(http.StatusOK, contentType, data)
}

func hasExtension(filename string, exts ...string) bool {
	for _, ext := range exts {
		if len(filename) > len(ext) && filename[len(filename)-len(ext):] == ext {
			return true
		}
	}
	return false
}

var (
	tagRegex = regexp.MustCompile(`<[^>]*>`)
	wsRegex  = regexp.MustCompile(`\s+`)
)

// extractSearchContent extracts plain text from HTML content for search indexing.
// It strips HTML tags, collapses whitespace, and truncates to maxLen characters.
func extractSearchContent(htmlContent string, maxLen int) string {
	// Remove HTML tags
	text := tagRegex.ReplaceAllString(htmlContent, " ")

	// Decode common HTML entities
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	text = strings.ReplaceAll(text, "&quot;", "\"")
	text = strings.ReplaceAll(text, "&#39;", "'")
	text = strings.ReplaceAll(text, "&nbsp;", " ")

	// Collapse whitespace
	text = wsRegex.ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)

	// Truncate to maxLen, trying to break at word boundary
	if len(text) > maxLen {
		text = text[:maxLen]
		// Find last space to break at word boundary
		if lastSpace := strings.LastIndex(text, " "); lastSpace > maxLen-50 {
			text = text[:lastSpace]
		}
		text += "..."
	}

	return text
}

func postToResponse(post *content.Post, includeContent bool, includeSearchContent bool) PostResponse {
	resp := PostResponse{
		Slug:        post.Meta.Slug,
		Title:       post.Meta.Title,
		Summary:     post.Meta.Summary,
		PublishDate: post.Meta.PublishDate.Format("2006-01-02"),
		Tags:        post.Meta.Tags,
		Series:      post.Meta.Series,
		ReadingTime: post.Meta.ReadingTime(),
	}

	// Include author if present
	if post.Meta.Author.Name != "" {
		resp.Author = &AuthorResponse{
			Name:   post.Meta.Author.Name,
			Avatar: post.Meta.Author.Avatar,
			Bio:    post.Meta.Author.Bio,
		}
	}

	if includeSearchContent {
		// Extract plain text from HTML for search indexing (800 chars max)
		resp.SearchContent = extractSearchContent(post.HTMLContent, 800)
	}

	if includeContent {
		// Wrap the rendered markdown with the Article template
		resp.HTMLContent = views.RenderToString(views.Article(post, post.HTMLContent))
	}
	return resp
}
