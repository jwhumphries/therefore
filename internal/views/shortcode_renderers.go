package views

import (
	"bytes"
	"context"

	"therefore/internal/renderer"
)

// ShortcodeRenderers returns a map of shortcode renderers for use with the markdown renderer.
func ShortcodeRenderers() map[string]renderer.ShortcodeRenderer {
	return map[string]renderer.ShortcodeRenderer{
		"figure":   renderFigure,
		"quote":    renderQuote,
		"sidenote": renderSidenote,
		"timeline": renderTimeline,
	}
}

func renderFigure(sc renderer.Shortcode) string {
	var buf bytes.Buffer
	_ = Figure(sc.Attrs["src"], sc.Attrs["caption"], sc.Attrs["alt"]).Render(context.Background(), &buf)
	return buf.String()
}

func renderQuote(sc renderer.Shortcode) string {
	var buf bytes.Buffer
	_ = Quote(sc.Attrs["author"], sc.Attrs["source"], sc.Content).Render(context.Background(), &buf)
	return buf.String()
}

func renderSidenote(sc renderer.Shortcode) string {
	var buf bytes.Buffer
	_ = Sidenote(sc.Attrs["id"], sc.Content).Render(context.Background(), &buf)
	return buf.String()
}

func renderTimeline(sc renderer.Shortcode) string {
	var buf bytes.Buffer
	events := ParseTimelineEvents(sc.Content)
	_ = Timeline(sc.Attrs["start"], sc.Attrs["end"], events).Render(context.Background(), &buf)
	return buf.String()
}
