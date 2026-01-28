package handlers

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"strings"
	"time"

	"therefore/internal/content"

	"github.com/labstack/echo/v5"
)

// RobotsTxtHandler returns a handler that serves robots.txt.
func RobotsTxtHandler(baseURL string) echo.HandlerFunc {
	body := fmt.Sprintf("User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: %s/sitemap.xml\n", strings.TrimRight(baseURL, "/"))

	return func(c *echo.Context) error {
		return c.String(http.StatusOK, body)
	}
}

// SitemapHandler returns a handler that generates sitemap.xml from the content store.
func SitemapHandler(store content.ContentStore, baseURL string) echo.HandlerFunc {
	base := strings.TrimRight(baseURL, "/")

	return func(c *echo.Context) error {
		ctx := c.Request().Context()

		urlset := urlSet{
			XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9",
		}

		// Static pages
		staticPages := []string{"/", "/posts", "/tags", "/series", "/about"}
		for _, path := range staticPages {
			urlset.URLs = append(urlset.URLs, sitemapURL{
				Loc: base + path,
			})
		}

		// Posts
		posts, _, err := store.ListPosts(ctx, content.ListOptions{})
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to list posts")
		}
		for _, post := range posts {
			urlset.URLs = append(urlset.URLs, sitemapURL{
				Loc:     base + "/posts/" + post.Meta.Slug,
				LastMod: post.Meta.PublishDate.Format(time.DateOnly),
			})
		}

		// Tags
		tags, err := store.GetTags(ctx)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to list tags")
		}
		for _, tag := range tags {
			urlset.URLs = append(urlset.URLs, sitemapURL{
				Loc: base + "/tags/" + tag.Tag,
			})
		}

		// Series
		seriesList, err := store.GetSeries(ctx)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to list series")
		}
		for _, s := range seriesList {
			urlset.URLs = append(urlset.URLs, sitemapURL{
				Loc: base + "/series?open=" + s.Series,
			})
		}

		output, err := xml.MarshalIndent(urlset, "", "  ")
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate sitemap")
		}

		c.Response().Header().Set("Content-Type", "application/xml; charset=utf-8")
		return c.String(http.StatusOK, xml.Header+string(output))
	}
}

type urlSet struct {
	XMLName xml.Name     `xml:"urlset"`
	XMLNS   string       `xml:"xmlns,attr"`
	URLs    []sitemapURL `xml:"url"`
}

type sitemapURL struct {
	Loc     string `xml:"loc"`
	LastMod string `xml:"lastmod,omitempty"`
}
