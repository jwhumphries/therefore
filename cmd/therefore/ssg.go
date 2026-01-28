package main

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"os"

	embeddedcontent "therefore/content"
	"therefore/internal/content"
	"therefore/internal/renderer"
	"therefore/internal/ssg"
	"therefore/internal/views"

	"github.com/spf13/afero"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var ssgCmd = &cobra.Command{
	Use:   "ssg",
	Short: "Generate static HTML pages for SEO",
	Long: `Generate static HTML pages at build time for SEO.

This command reads the content store and Vite's built assets, then generates
pre-rendered HTML pages for all routes. These pages include full content for
search engine crawlers while maintaining the React SPA experience for users
with JavaScript enabled.

The generated pages are written to the same directory as Vite's output
(internal/static/dist by default), so they get embedded into the binary.`,
	RunE: runSSG,
}

func init() {
	rootCmd.AddCommand(ssgCmd)

	ssgCmd.Flags().String("output", "internal/static/dist", "output directory for generated files")
	_ = viper.BindPFlag("ssg_output", ssgCmd.Flags().Lookup("output"))
}

func runSSG(cmd *cobra.Command, args []string) error {
	baseURL := viper.GetString("base_url")
	outDir := viper.GetString("ssg_output")

	// Configure logging
	logLevel := viper.GetString("log_level")
	var level slog.Level
	switch logLevel {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: level})))

	// Verify output directory exists (should have Vite's output)
	if _, err := os.Stat(outDir); os.IsNotExist(err) {
		return fmt.Errorf("output directory %s does not exist; run Vite build first", outDir)
	}

	// Initialize content store
	store, err := initSSGContentStore()
	if err != nil {
		return fmt.Errorf("initializing content store: %w", err)
	}

	// Run SSG
	gen := ssg.New(store, baseURL, outDir)
	ctx := context.Background()

	if err := gen.Generate(ctx); err != nil {
		return fmt.Errorf("generating static pages: %w", err)
	}

	return nil
}

func initSSGContentStore() (content.ContentStore, error) {
	// Create afero filesystem from embedded posts
	postsSubFS, err := fs.Sub(embeddedcontent.PostsFS, "posts")
	if err != nil {
		return nil, fmt.Errorf("loading embedded posts: %w", err)
	}

	afs := afero.FromIOFS{FS: postsSubFS}

	// Create renderer with shortcode support
	r := renderer.New(views.ShortcodeRenderers())

	return content.NewEmbeddedStore(afs, r)
}
