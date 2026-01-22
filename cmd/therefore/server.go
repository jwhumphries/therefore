package main

import (
	"io/fs"
	"log/slog"
	"net/http"

	embeddedcontent "therefore/content"
	"therefore/internal/content"
	"therefore/internal/handlers"
	"therefore/internal/renderer"
	"therefore/internal/static"
	"therefore/internal/views"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/spf13/afero"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func runServer(cmd *cobra.Command, args []string) error {
	port := viper.GetString("port")
	devMode := viper.GetBool("dev")

	// Set dev mode for templates (uses Vite dev server URLs)
	views.DevMode = devMode
	if devMode {
		slog.Info("Development mode enabled - using Vite dev server for assets")
	}

	// Initialize content store
	store, err := initContentStore()
	if err != nil {
		return err
	}

	e := echo.New()

	// Middleware
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
	e.Use(middleware.RequestLogger())
	e.Use(middleware.Gzip())
	e.Use(middleware.Secure())

	// Initialize API handler
	apiHandler := handlers.NewAPIHandler(store)

	// Health check
	e.GET("/healthz", healthHandler)

	// API routes
	api := e.Group("/api")
	api.GET("/posts", apiHandler.ListPosts)
	api.GET("/posts/:slug", apiHandler.GetPost)
	api.GET("/tags", apiHandler.ListTags)

	// Serve embedded frontend SPA
	distFS, err := fs.Sub(static.DistFS, "dist")
	if err != nil {
		return err
	}

	spaHandler, err := handlers.NewSPAHandler(distFS)
	if err != nil {
		return err
	}

	// Static assets route
	e.GET("/assets/*", spaHandler.ServeAssets())

	// SPA fallback - all other routes serve index.html for client-side routing
	e.GET("/*", spaHandler.Handler())

	slog.Info("Starting server", "port", port)
	return e.Start(port)
}

func initContentStore() (content.ContentStore, error) {
	// Create afero filesystem from embedded posts
	postsSubFS, err := fs.Sub(embeddedcontent.PostsFS, "posts")
	if err != nil {
		return nil, err
	}

	afs := afero.FromIOFS{FS: postsSubFS}

	// Create renderer with shortcode support
	r := renderer.New(views.ShortcodeRenderers())

	return content.NewEmbeddedStore(afs, r)
}

func healthHandler(c *echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"status": "ok",
	})
}
