package handlers

import (
	"io"
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/labstack/echo/v5"
)

// SPAHandler serves a single-page application from an embedded filesystem.
// It serves static files when they exist and falls back to index.html for
// client-side routing.
type SPAHandler struct {
	distFS    fs.FS
	indexHTML []byte
}

// NewSPAHandler creates a new SPAHandler from the given filesystem.
// The filesystem should contain the built SPA with index.html at the root.
func NewSPAHandler(distFS fs.FS) (*SPAHandler, error) {
	// Pre-read index.html for fallback responses
	f, err := distFS.Open("index.html")
	if err != nil {
		return nil, err
	}
	defer func() { _ = f.Close() }()

	indexHTML, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}

	return &SPAHandler{
		distFS:    distFS,
		indexHTML: indexHTML,
	}, nil
}

// Handler returns an Echo handler that serves the SPA.
// It checks for pre-rendered SSG files first, then static assets,
// and falls back to index.html for client-side routing.
func (h *SPAHandler) Handler() echo.HandlerFunc {
	fileServer := http.FileServer(http.FS(h.distFS))

	return func(c *echo.Context) error {
		reqPath := c.Request().URL.Path

		// Clean and normalize path
		reqPath = path.Clean(reqPath)

		// Try pre-rendered SSG file first (for SEO)
		// We serve these directly via Blob to avoid FileServer redirect issues
		if ssgPath := h.ssgFilePath(reqPath); ssgPath != "" {
			if content, err := h.readFile(ssgPath); err == nil {
				return c.Blob(http.StatusOK, "text/html; charset=utf-8", content)
			}
		}

		// Handle root path
		if reqPath == "/" {
			reqPath = "/index.html"
		}

		// Remove leading slash for fs.Open
		fsPath := strings.TrimPrefix(reqPath, "/")

		// Try to open the file (static assets like JS, CSS, images)
		f, err := h.distFS.Open(fsPath)
		if err == nil {
			_ = f.Close()
			// File exists, serve it
			fileServer.ServeHTTP(c.Response(), c.Request())
			return nil
		}

		// File doesn't exist, serve index.html for client-side routing
		c.Response().Header().Set("Content-Type", "text/html; charset=utf-8")
		return c.Blob(http.StatusOK, "text/html; charset=utf-8", h.indexHTML)
	}
}

// readFile reads a file from the embedded filesystem
func (h *SPAHandler) readFile(path string) ([]byte, error) {
	f, err := h.distFS.Open(path)
	if err != nil {
		return nil, err
	}
	defer func() { _ = f.Close() }()
	return io.ReadAll(f)
}

// ssgFilePath maps a request path to the corresponding SSG file path.
// Returns empty string if the route is not pre-rendered.
func (h *SPAHandler) ssgFilePath(reqPath string) string {
	// Remove leading/trailing slashes for consistent matching
	reqPath = strings.Trim(reqPath, "/")

	switch {
	case reqPath == "":
		// Root path: /
		return "index.html"

	case reqPath == "posts":
		// Posts listing: /posts
		return "posts/index.html"

	case strings.HasPrefix(reqPath, "posts/"):
		// Individual post: /posts/:slug
		slug := strings.TrimPrefix(reqPath, "posts/")
		if slug != "" && !strings.Contains(slug, "/") {
			return "posts/" + slug + ".html"
		}

	case reqPath == "tags":
		// Tags listing: /tags
		return "tags/index.html"

	case strings.HasPrefix(reqPath, "tags/"):
		// Tag page: /tags/:tag
		tag := strings.TrimPrefix(reqPath, "tags/")
		if tag != "" && !strings.Contains(tag, "/") {
			return "tags/" + tag + ".html"
		}

	case reqPath == "series":
		// Series listing: /series
		return "series/index.html"

	case reqPath == "about":
		// About page: /about
		return "about/index.html"
	}

	return ""
}

// ServeAssets returns a handler that serves static assets from /assets/*
func (h *SPAHandler) ServeAssets() echo.HandlerFunc {
	fileServer := http.FileServer(http.FS(h.distFS))

	return func(c *echo.Context) error {
		// Serve directly - files are in assets/ subdirectory of distFS
		fileServer.ServeHTTP(c.Response(), c.Request())
		return nil
	}
}
