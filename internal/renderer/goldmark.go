package renderer

import (
	"bytes"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"

	highlighting "github.com/yuin/goldmark-highlighting/v2"
)

// GoldmarkRenderer wraps the goldmark markdown converter.
type GoldmarkRenderer struct {
	md goldmark.Markdown
}

// NewGoldmarkRenderer creates a new Goldmark-based markdown renderer.
func NewGoldmarkRenderer() *GoldmarkRenderer {
	md := goldmark.New(
		goldmark.WithExtensions(
			extension.GFM,
			extension.Typographer,
			extension.Footnote,
			highlighting.NewHighlighting(
				highlighting.WithStyle("dracula"),
			),
		),
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
		),
		goldmark.WithRendererOptions(
			html.WithUnsafe(), // Allow raw HTML in markdown
		),
	)

	return &GoldmarkRenderer{md: md}
}

// Convert converts markdown to HTML without shortcode processing.
func (g *GoldmarkRenderer) Convert(source []byte) ([]byte, error) {
	var buf bytes.Buffer
	if err := g.md.Convert(source, &buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
