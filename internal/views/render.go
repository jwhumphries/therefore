package views

import (
	"bytes"
	"context"

	"github.com/a-h/templ"
)

// DevMode indicates whether the application is running in development mode.
// When true, templates may use different asset URLs (e.g., Vite dev server).
var DevMode bool

// RenderToString renders a templ component to a string.
func RenderToString(component templ.Component) string {
	var buf bytes.Buffer
	_ = component.Render(context.Background(), &buf)
	return buf.String()
}
