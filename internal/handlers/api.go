package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"therefore/internal/content"

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

// PostResponse is the JSON representation of a post.
type PostResponse struct {
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Summary     string   `json:"summary,omitempty"`
	PublishDate string   `json:"publishDate"`
	Tags        []string `json:"tags,omitempty"`
	Series      string   `json:"series,omitempty"`
	HTMLContent string   `json:"htmlContent,omitempty"`
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

	posts, err := h.store.ListPosts(c.Request().Context(), opts)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list posts")
	}

	resp := ListPostsResponse{
		Posts: make([]PostResponse, 0, len(posts)),
		Total: len(posts),
	}

	for _, post := range posts {
		resp.Posts = append(resp.Posts, postToResponse(post, false))
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

	return c.JSON(http.StatusOK, postToResponse(post, true))
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

func postToResponse(post *content.Post, includeContent bool) PostResponse {
	resp := PostResponse{
		Slug:        post.Meta.Slug,
		Title:       post.Meta.Title,
		Summary:     post.Meta.Summary,
		PublishDate: post.Meta.PublishDate.Format("2006-01-02"),
		Tags:        post.Meta.Tags,
		Series:      post.Meta.Series,
	}
	if includeContent {
		resp.HTMLContent = post.HTMLContent
	}
	return resp
}
