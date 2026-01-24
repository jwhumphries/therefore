package views

import (
	"bytes"
	"context"
	"strings"

	"therefore/internal/renderer"
)

// inlineRenderer is used to process inline markdown within shortcode content
var inlineRenderer = renderer.NewGoldmarkRenderer()

// ShortcodeRenderers returns a map of shortcode renderers for use with the markdown renderer.
func ShortcodeRenderers() map[string]renderer.ShortcodeRenderer {
	return map[string]renderer.ShortcodeRenderer{
		"figure":   renderFigure,
		"quote":    renderQuote,
		"sidenote": renderSidenote,
		"timeline": renderTimeline,
	}
}

// renderInlineMarkdown converts inline markdown to HTML, stripping the wrapping <p> tags
func renderInlineMarkdown(content string) string {
	html, err := inlineRenderer.Convert([]byte(content))
	if err != nil {
		return content
	}
	// Strip wrapping <p> tags that goldmark adds
	result := strings.TrimSpace(string(html))
	result = strings.TrimPrefix(result, "<p>")
	result = strings.TrimSuffix(result, "</p>")
	return result
}

func renderFigure(sc renderer.Shortcode) string {
	var buf bytes.Buffer
	_ = Figure(sc.Attrs["src"], sc.Attrs["caption"], sc.Attrs["alt"]).Render(context.Background(), &buf)
	return buf.String()
}

func renderQuote(sc renderer.Shortcode) string {
	var buf bytes.Buffer
	content := renderInlineMarkdown(sc.Content)
	_ = Quote(sc.Attrs["author"], sc.Attrs["source"], content).Render(context.Background(), &buf)
	return buf.String()
}

func renderSidenote(sc renderer.Shortcode) string {
	var buf bytes.Buffer
	content := renderInlineMarkdown(sc.Content)
	_ = Sidenote(sc.Attrs["id"], content).Render(context.Background(), &buf)
	return buf.String()
}

func renderTimeline(sc renderer.Shortcode) string {
	var buf bytes.Buffer
	events := ParseTimelineEvents(sc.Content)
	_ = Timeline(sc.Attrs["start"], sc.Attrs["end"], events).Render(context.Background(), &buf)
	return buf.String()
}
