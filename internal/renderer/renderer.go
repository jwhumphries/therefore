package renderer

// RenderContext provides additional context for shortcode rendering.
type RenderContext struct {
	// Citations maps alias names to citation data (text, url).
	Citations map[string]struct {
		Text string
		URL  string
	}
}

// ShortcodeRenderer is a function that renders a shortcode to HTML.
// The context parameter provides access to post-level data like citations.
type ShortcodeRenderer func(sc Shortcode, ctx *RenderContext) string

// Renderer combines markdown conversion with shortcode processing.
type Renderer struct {
	goldmark  *GoldmarkRenderer
	parser    *ShortcodeParser
	renderers map[string]ShortcodeRenderer
}

// New creates a new Renderer with the given shortcode renderers.
func New(shortcodeRenderers map[string]ShortcodeRenderer) *Renderer {
	return &Renderer{
		goldmark:  NewGoldmarkRenderer(),
		parser:    NewShortcodeParser(),
		renderers: shortcodeRenderers,
	}
}

// Render processes markdown content through the full pipeline:
// 1. Parse shortcodes and replace with placeholders
// 2. Convert markdown to HTML via Goldmark
// 3. Replace placeholders with rendered shortcode HTML
// The ctx parameter provides post-level context like citations (can be nil).
func (r *Renderer) Render(raw string, ctx *RenderContext) (string, error) {
	// Step 1: Extract shortcodes
	content, shortcodes := r.parser.Parse(raw)

	// Step 2: Convert markdown to HTML
	html, err := r.goldmark.Convert([]byte(content))
	if err != nil {
		return "", err
	}

	result := string(html)

	// Step 3: Replace placeholders with rendered shortcodes
	for _, sc := range shortcodes {
		renderer, ok := r.renderers[sc.Name]
		if !ok {
			// Unknown shortcode, leave placeholder as-is (or could render as error)
			continue
		}
		rendered := renderer(sc, ctx)
		result = ReplacePlaceholder(result, sc.ID, rendered)
	}

	return result, nil
}
