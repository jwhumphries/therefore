package renderer

// ShortcodeRenderer is a function that renders a shortcode to HTML.
type ShortcodeRenderer func(sc Shortcode) string

// Renderer combines markdown conversion with shortcode processing.
type Renderer struct {
	goldmark   *GoldmarkRenderer
	parser     *ShortcodeParser
	renderers  map[string]ShortcodeRenderer
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
func (r *Renderer) Render(raw string) (string, error) {
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
		rendered := renderer(sc)
		result = ReplacePlaceholder(result, sc.ID, rendered)
	}

	return result, nil
}
