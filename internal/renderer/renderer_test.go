package renderer

import (
	"strings"
	"testing"
)

func TestGoldmarkRenderer_BasicMarkdown(t *testing.T) {
	r := NewGoldmarkRenderer()

	tests := []struct {
		name     string
		input    string
		contains []string
	}{
		{
			name:     "heading",
			input:    "# Hello World",
			contains: []string{"<h1", "Hello World", "</h1>"},
		},
		{
			name:     "paragraph",
			input:    "This is a paragraph.",
			contains: []string{"<p>", "This is a paragraph.", "</p>"},
		},
		{
			name:     "bold",
			input:    "This is **bold** text.",
			contains: []string{"<strong>", "bold", "</strong>"},
		},
		{
			name:     "italic",
			input:    "This is *italic* text.",
			contains: []string{"<em>", "italic", "</em>"},
		},
		{
			name:     "link",
			input:    "Visit [Example](https://example.com).",
			contains: []string{`<a href="https://example.com">`, "Example", "</a>"},
		},
		{
			name:     "unordered list",
			input:    "- Item 1\n- Item 2",
			contains: []string{"<ul>", "<li>", "Item 1", "Item 2", "</li>", "</ul>"},
		},
		{
			name:     "ordered list",
			input:    "1. First\n2. Second",
			contains: []string{"<ol>", "<li>", "First", "Second", "</li>", "</ol>"},
		},
		{
			name:     "code block",
			input:    "```go\nfmt.Println(\"hello\")\n```",
			contains: []string{"<pre", "<code", "Println"},
		},
		{
			name:     "inline code",
			input:    "Use `fmt.Println` to print.",
			contains: []string{"<code>", "fmt.Println", "</code>"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := r.Convert([]byte(tt.input))
			if err != nil {
				t.Fatalf("Convert() error = %v", err)
			}

			html := string(result)
			for _, want := range tt.contains {
				if !strings.Contains(html, want) {
					t.Errorf("Convert() result missing %q\nGot: %s", want, html)
				}
			}
		})
	}
}

func TestGoldmarkRenderer_GFMFeatures(t *testing.T) {
	r := NewGoldmarkRenderer()

	tests := []struct {
		name     string
		input    string
		contains []string
	}{
		{
			name: "table",
			input: `| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |`,
			contains: []string{"<table>", "<th>", "Header 1", "<td>", "Cell 1"},
		},
		{
			name:     "strikethrough",
			input:    "This is ~~deleted~~ text.",
			contains: []string{"<del>", "deleted", "</del>"},
		},
		{
			name:     "task list",
			input:    "- [x] Done\n- [ ] Todo",
			contains: []string{`type="checkbox"`, "checked", "Done", "Todo"},
		},
		{
			name:     "autolink",
			input:    "Visit https://example.com for more.",
			contains: []string{`<a href="https://example.com">`, "https://example.com", "</a>"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := r.Convert([]byte(tt.input))
			if err != nil {
				t.Fatalf("Convert() error = %v", err)
			}

			html := string(result)
			for _, want := range tt.contains {
				if !strings.Contains(html, want) {
					t.Errorf("Convert() result missing %q\nGot: %s", want, html)
				}
			}
		})
	}
}

func TestGoldmarkRenderer_Footnotes(t *testing.T) {
	r := NewGoldmarkRenderer()

	input := `Here is a footnote reference[^1].

[^1]: This is the footnote content.`

	result, err := r.Convert([]byte(input))
	if err != nil {
		t.Fatalf("Convert() error = %v", err)
	}

	html := string(result)
	if !strings.Contains(html, "footnote") {
		t.Errorf("Convert() result missing footnote markup\nGot: %s", html)
	}
}

func TestShortcodeParser_SelfClosing(t *testing.T) {
	p := NewShortcodeParser()

	input := `Before {{figure src="/img/test.jpg" alt="Test"}} after.`
	content, shortcodes := p.Parse(input)

	if len(shortcodes) != 1 {
		t.Fatalf("Parse() returned %d shortcodes, want 1", len(shortcodes))
	}

	sc := shortcodes[0]
	if sc.Name != "figure" {
		t.Errorf("Name = %q, want %q", sc.Name, "figure")
	}
	if sc.Attrs["src"] != "/img/test.jpg" {
		t.Errorf("Attrs[src] = %q, want %q", sc.Attrs["src"], "/img/test.jpg")
	}
	if sc.Attrs["alt"] != "Test" {
		t.Errorf("Attrs[alt] = %q, want %q", sc.Attrs["alt"], "Test")
	}
	if sc.Content != "" {
		t.Errorf("Content = %q, want empty", sc.Content)
	}

	// Check placeholder was inserted
	if !strings.Contains(content, "<!--shortcode:") {
		t.Errorf("Content missing placeholder\nGot: %s", content)
	}
	if !strings.Contains(content, "Before") || !strings.Contains(content, "after.") {
		t.Errorf("Content missing surrounding text\nGot: %s", content)
	}
}

func TestShortcodeParser_Block(t *testing.T) {
	p := NewShortcodeParser()

	input := `{{quote author="Plato" source="Republic"}}
The beginning is the most important part of the work.
{{/quote}}`

	content, shortcodes := p.Parse(input)

	if len(shortcodes) != 1 {
		t.Fatalf("Parse() returned %d shortcodes, want 1", len(shortcodes))
	}

	sc := shortcodes[0]
	if sc.Name != "quote" {
		t.Errorf("Name = %q, want %q", sc.Name, "quote")
	}
	if sc.Attrs["author"] != "Plato" {
		t.Errorf("Attrs[author] = %q, want %q", sc.Attrs["author"], "Plato")
	}
	if sc.Attrs["source"] != "Republic" {
		t.Errorf("Attrs[source] = %q, want %q", sc.Attrs["source"], "Republic")
	}
	if !strings.Contains(sc.Content, "beginning is the most important") {
		t.Errorf("Content = %q, missing expected text", sc.Content)
	}

	// Check placeholder was inserted
	if !strings.Contains(content, "<!--shortcode:") {
		t.Errorf("Content missing placeholder\nGot: %s", content)
	}
}

func TestShortcodeParser_Multiple(t *testing.T) {
	p := NewShortcodeParser()

	input := `Start
{{figure src="a.jpg"}}
Middle
{{quote author="Test"}}Inner content{{/quote}}
End`

	content, shortcodes := p.Parse(input)

	if len(shortcodes) != 2 {
		t.Fatalf("Parse() returned %d shortcodes, want 2", len(shortcodes))
	}

	// First should be the block shortcode (processed first)
	if shortcodes[0].Name != "quote" {
		t.Errorf("shortcodes[0].Name = %q, want %q", shortcodes[0].Name, "quote")
	}

	// Second should be the self-closing shortcode
	if shortcodes[1].Name != "figure" {
		t.Errorf("shortcodes[1].Name = %q, want %q", shortcodes[1].Name, "figure")
	}

	// Check both placeholders were inserted
	placeholderCount := strings.Count(content, "<!--shortcode:")
	if placeholderCount != 2 {
		t.Errorf("Content has %d placeholders, want 2\nGot: %s", placeholderCount, content)
	}
}

func TestRenderer_FullPipeline(t *testing.T) {
	renderers := map[string]ShortcodeRenderer{
		"figure": func(sc Shortcode, _ *RenderContext) string {
			return "<figure><img src=\"" + sc.Attrs["src"] + "\" /></figure>"
		},
		"quote": func(sc Shortcode, _ *RenderContext) string {
			return "<blockquote><p>" + sc.Content + "</p><cite>" + sc.Attrs["author"] + "</cite></blockquote>"
		},
	}

	r := New(renderers)

	input := `# Test Post

Here is some text with a figure:

{{figure src="/img/test.jpg"}}

And a quote:

{{quote author="Aristotle"}}We are what we repeatedly do.{{/quote}}

The end.`

	result, err := r.Render(input, nil)
	if err != nil {
		t.Fatalf("Render() error = %v", err)
	}

	// Check markdown was rendered
	if !strings.Contains(result, "<h1") {
		t.Error("Result missing h1")
	}
	if !strings.Contains(result, "Test Post") {
		t.Error("Result missing post title")
	}

	// Check figure shortcode was rendered
	if !strings.Contains(result, `<figure><img src="/img/test.jpg"`) {
		t.Error("Result missing rendered figure")
	}

	// Check quote shortcode was rendered
	if !strings.Contains(result, "<blockquote>") {
		t.Error("Result missing blockquote")
	}
	if !strings.Contains(result, "We are what we repeatedly do") {
		t.Error("Result missing quote content")
	}
	if !strings.Contains(result, "Aristotle") {
		t.Error("Result missing quote author")
	}

	// Check no placeholders remain
	if strings.Contains(result, "<!--shortcode:") {
		t.Error("Result still contains shortcode placeholder")
	}
}

func TestRenderer_UnknownShortcode(t *testing.T) {
	r := New(map[string]ShortcodeRenderer{})

	input := `Text with {{unknown attr="val"}} shortcode.`

	result, err := r.Render(input, nil)
	if err != nil {
		t.Fatalf("Render() error = %v", err)
	}

	// Unknown shortcode placeholder should remain
	if !strings.Contains(result, "<!--shortcode:") {
		t.Error("Unknown shortcode placeholder was removed")
	}
}
