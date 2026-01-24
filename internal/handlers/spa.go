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
func (h *SPAHandler) Handler() echo.HandlerFunc {
	fileServer := http.FileServer(http.FS(h.distFS))

	return func(c *echo.Context) error {
		reqPath := c.Request().URL.Path

		// Clean and normalize path
		reqPath = path.Clean(reqPath)
		if reqPath == "/" {
			reqPath = "/index.html"
		}

		// Remove leading slash for fs.Open
		fsPath := strings.TrimPrefix(reqPath, "/")

		// Try to open the file
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

// ServeAssets returns a handler that serves static assets from /assets/*
func (h *SPAHandler) ServeAssets() echo.HandlerFunc {
	fileServer := http.FileServer(http.FS(h.distFS))

	return func(c *echo.Context) error {
		// Strip the /assets prefix - the file server will look in the assets directory
		c.Request().URL.Path = strings.TrimPrefix(c.Request().URL.Path, "/assets")
		fileServer.ServeHTTP(c.Response(), c.Request())
		return nil
	}
}
