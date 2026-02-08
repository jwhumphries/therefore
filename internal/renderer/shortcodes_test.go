package renderer

import (
	"strings"
	"testing"
)

func TestShortcodeParser_TwoBlocks(t *testing.T) {
	p := NewShortcodeParser()
	input := `{{A}}Content A{{/A}} Middle {{B}}Content B{{/B}}`
	content, shortcodes := p.Parse(input)

	if len(shortcodes) != 2 {
		t.Fatalf("Expected 2 shortcodes, got %d", len(shortcodes))
	}

	if strings.Count(content, "<!--shortcode:") != 2 {
		t.Errorf("Expected 2 placeholders, got: %s", content)
	}

	if !strings.Contains(content, " Middle ") {
		t.Errorf("Expected ' Middle ' to be preserved, got: %s", content)
	}
}
