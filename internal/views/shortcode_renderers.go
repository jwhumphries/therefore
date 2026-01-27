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
		"cite":     renderCite,
		"term":     renderTerm,
		"parallel": renderParallel,
		"timeline":  renderTimeline,
		"scripture": renderScripture,
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

func renderFigure(sc renderer.Shortcode, _ *renderer.RenderContext) string {
	var buf bytes.Buffer
	_ = Figure(sc.Attrs["src"], sc.Attrs["caption"], sc.Attrs["alt"]).Render(context.Background(), &buf)
	return buf.String()
}

func renderQuote(sc renderer.Shortcode, _ *renderer.RenderContext) string {
	var buf bytes.Buffer
	content := renderInlineMarkdown(sc.Content)
	_ = Quote(sc.Attrs["author"], sc.Attrs["source"], content).Render(context.Background(), &buf)
	return buf.String()
}

func renderSidenote(sc renderer.Shortcode, _ *renderer.RenderContext) string {
	var buf bytes.Buffer
	content := renderInlineMarkdown(sc.Content)
	_ = Sidenote(sc.Attrs["id"], content).Render(context.Background(), &buf)
	return buf.String()
}

func renderParallel(sc renderer.Shortcode, _ *renderer.RenderContext) string {
	// Split content on "---" delimiter
	parts := strings.SplitN(sc.Content, "---", 2)
	var left, right string
	if len(parts) >= 1 {
		left = renderInlineMarkdown(strings.TrimSpace(parts[0]))
	}
	if len(parts) >= 2 {
		right = renderInlineMarkdown(strings.TrimSpace(parts[1]))
	}

	var buf bytes.Buffer
	_ = Parallel(sc.Attrs["left"], sc.Attrs["right"], left, right).Render(context.Background(), &buf)
	return buf.String()
}

func renderTerm(sc renderer.Shortcode, _ *renderer.RenderContext) string {
	var buf bytes.Buffer
	content := renderInlineMarkdown(sc.Content)
	_ = Term(sc.Attrs["word"], sc.Attrs["origin"], content).Render(context.Background(), &buf)
	return buf.String()
}

func renderTimeline(sc renderer.Shortcode, _ *renderer.RenderContext) string {
	var buf bytes.Buffer
	events := ParseTimelineEvents(sc.Content)
	_ = Timeline(sc.Attrs["start"], sc.Attrs["end"], events).Render(context.Background(), &buf)
	return buf.String()
}

func renderScripture(sc renderer.Shortcode, _ *renderer.RenderContext) string {
	// Process inline markdown first, then inject verse number <sup> tags
	// so goldmark doesn't strip the raw HTML
	content := renderInlineMarkdown(strings.TrimSpace(sc.Content))
	content = formatVerseNumbers(content)
	poetry := sc.Attrs["format"] == "poetry"

	var buf bytes.Buffer
	_ = Scripture(sc.Attrs["ref"], sc.Attrs["version"], content, poetry).Render(context.Background(), &buf)
	return buf.String()
}

func renderCite(sc renderer.Shortcode, ctx *renderer.RenderContext) string {
	text := sc.Attrs["text"]
	url := sc.Attrs["url"]

	// Check if using an alias from frontmatter citations
	if alias := sc.Attrs["alias"]; alias != "" && ctx != nil && ctx.Citations != nil {
		if citation, ok := ctx.Citations[alias]; ok {
			text = citation.Text
			url = citation.URL
		}
	}

	var buf bytes.Buffer
	_ = CitationRef(text, url).Render(context.Background(), &buf)
	return buf.String()
}
