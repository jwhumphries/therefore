package handlers

import (
	"errors"
	"net/http"

	"therefore/internal/content"
	"therefore/internal/views"

	"github.com/a-h/templ"
	"github.com/labstack/echo/v5"
)

// PostHandler handles post-related HTTP requests.
type PostHandler struct {
	store content.ContentStore
}

// NewPostHandler creates a new PostHandler.
func NewPostHandler(store content.ContentStore) *PostHandler {
	return &PostHandler{store: store}
}

// HomePage renders the home page with recent posts.
func (h *PostHandler) HomePage(c *echo.Context) error {
	posts, err := h.store.ListPosts(c.Request().Context(), content.ListOptions{Limit: 10})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list posts")
	}
	return render(c, http.StatusOK, views.PostList(posts))
}

// PostPage renders a single post.
func (h *PostHandler) PostPage(c *echo.Context) error {
	slug := c.Param("slug")
	post, err := h.store.GetPost(c.Request().Context(), slug)
	if err != nil {
		if errors.Is(err, content.ErrPostNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "post not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to get post")
	}
	return render(c, http.StatusOK, views.PostPage(post))
}

// TagsPage renders the tags listing page.
func (h *PostHandler) TagsPage(c *echo.Context) error {
	tags, err := h.store.GetTags(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to get tags")
	}
	return render(c, http.StatusOK, views.TagsPage(tags))
}

// TagPage renders posts for a specific tag.
func (h *PostHandler) TagPage(c *echo.Context) error {
	tag := c.Param("tag")
	posts, err := h.store.ListPosts(c.Request().Context(), content.ListOptions{Tag: tag})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list posts")
	}
	return render(c, http.StatusOK, views.TagPage(tag, posts))
}

// render is a helper to render templ components.
func render(c *echo.Context, status int, component templ.Component) error {
	c.Response().Header().Set(echo.HeaderContentType, echo.MIMETextHTMLCharsetUTF8)
	c.Response().WriteHeader(status)
	return component.Render(c.Request().Context(), c.Response())
}
