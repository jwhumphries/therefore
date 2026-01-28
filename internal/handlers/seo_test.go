package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"therefore/internal/content"

	"github.com/labstack/echo/v5"
)

func TestRobotsTxtHandler(t *testing.T) {
	handler := RobotsTxtHandler("https://example.com")

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/robots.txt", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler(c)
	if err != nil {
		t.Fatalf("RobotsTxtHandler() error = %v", err)
	}

	body := rec.Body.String()

	if !strings.Contains(body, "User-agent: *") {
		t.Error("missing User-agent directive")
	}
	if !strings.Contains(body, "Disallow: /api/") {
		t.Error("missing Disallow /api/ directive")
	}
	if !strings.Contains(body, "Sitemap: https://example.com/sitemap.xml") {
		t.Errorf("missing or incorrect Sitemap directive, got:\n%s", body)
	}
}

func TestRobotsTxtHandler_TrailingSlash(t *testing.T) {
	handler := RobotsTxtHandler("https://example.com/")

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/robots.txt", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler(c)
	if err != nil {
		t.Fatalf("RobotsTxtHandler() error = %v", err)
	}

	body := rec.Body.String()
	if strings.Contains(body, "example.com//sitemap") {
		t.Error("double slash in sitemap URL")
	}
}

func TestSitemapHandler(t *testing.T) {
	store := newMockStore()
	store.posts["test-post"] = &content.Post{
		Meta: content.PostMeta{
			Title:       "Test Post",
			Slug:        "test-post",
			PublishDate: time.Date(2024, 6, 15, 0, 0, 0, 0, time.UTC),
			Tags:        []string{"philosophy"},
		},
	}
	store.tags = []content.TagCount{
		{Tag: "philosophy", Count: 1},
	}
	store.series = []content.SeriesCount{
		{Series: "Ethics", Count: 2},
	}

	handler := SitemapHandler(store, "https://example.com")

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/sitemap.xml", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler(c)
	if err != nil {
		t.Fatalf("SitemapHandler() error = %v", err)
	}

	body := rec.Body.String()

	// Check XML header
	if !strings.HasPrefix(body, "<?xml") {
		t.Error("missing XML declaration")
	}

	// Check static pages
	for _, path := range []string{"/", "/posts", "/tags", "/series", "/about"} {
		if !strings.Contains(body, "https://example.com"+path) {
			t.Errorf("missing static page URL: %s", path)
		}
	}

	// Check post URL and lastmod
	if !strings.Contains(body, "https://example.com/posts/test-post") {
		t.Error("missing post URL")
	}
	if !strings.Contains(body, "2024-06-15") {
		t.Error("missing post lastmod date")
	}

	// Check tag URL
	if !strings.Contains(body, "https://example.com/tags/philosophy") {
		t.Error("missing tag URL")
	}

	// Check series URL
	if !strings.Contains(body, "https://example.com/series?open=Ethics") {
		t.Error("missing series URL")
	}

	// Check content type
	ct := rec.Header().Get("Content-Type")
	if !strings.Contains(ct, "application/xml") {
		t.Errorf("Content-Type = %q, want application/xml", ct)
	}
}

func TestSitemapHandler_Empty(t *testing.T) {
	store := newMockStore()
	handler := SitemapHandler(store, "https://example.com")

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/sitemap.xml", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler(c)
	if err != nil {
		t.Fatalf("SitemapHandler() error = %v", err)
	}

	body := rec.Body.String()

	// Should still have static pages
	if !strings.Contains(body, "https://example.com/posts") {
		t.Error("missing static pages in empty sitemap")
	}
}
