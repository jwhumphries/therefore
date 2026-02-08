package renderer

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

// Shortcode represents a parsed shortcode from markdown content.
type Shortcode struct {
	ID      string            // Unique placeholder ID
	Name    string            // Shortcode name (e.g., "figure", "quote")
	Attrs   map[string]string // Attributes from the shortcode tag
	Content string            // Inner content (for block shortcodes)
}

// ShortcodeParser extracts and replaces shortcodes with placeholders.
type ShortcodeParser struct {
	// Opening tag: {{name attr="val"}}
	openPattern *regexp.Regexp
	// Closing tag: {{/name}}
	closePattern *regexp.Regexp
	// Attribute: key="value" or key='value'
	attrPattern *regexp.Regexp
}

// NewShortcodeParser creates a new shortcode parser.
func NewShortcodeParser() *ShortcodeParser {
	return &ShortcodeParser{
		openPattern:  regexp.MustCompile(`\{\{([\w-]+)([^}]*)\}\}`),
		closePattern: regexp.MustCompile(`\{\{/([\w-]+)\}\}`),
		attrPattern:  regexp.MustCompile(`(\w+)=["']([^"']*)["']`),
	}
}

// Parse extracts shortcodes from content and replaces them with placeholders.
// Returns the modified content and a slice of parsed shortcodes.
func (p *ShortcodeParser) Parse(content string) (string, []Shortcode) {
	var shortcodes []Shortcode

	// First, find and process block shortcodes
	content = p.parseBlockShortcodes(content, &shortcodes)

	// Then, process remaining self-closing shortcodes
	content = p.openPattern.ReplaceAllStringFunc(content, func(match string) string {
		submatches := p.openPattern.FindStringSubmatch(match)
		if len(submatches) != 3 {
			return match
		}

		sc := Shortcode{
			ID:    uuid.NewString(),
			Name:  submatches[1],
			Attrs: p.parseAttrs(submatches[2]),
		}
		shortcodes = append(shortcodes, sc)
		return fmt.Sprintf("<!--shortcode:%s-->", sc.ID)
	})

	return content, shortcodes
}

// parseBlockShortcodes finds and extracts block shortcodes (with closing tags).
func (p *ShortcodeParser) parseBlockShortcodes(content string, shortcodes *[]Shortcode) string {
	var sb strings.Builder
	// Pre-allocate buffer to avoid repeated allocations.
	// The new content will likely be similar in size or smaller (placeholders are usually smaller than blocks).
	sb.Grow(len(content))

	offset := 0
	lastIndex := 0

	for {
		// Find next opening tag from current offset
		openMatch := p.openPattern.FindStringSubmatchIndex(content[offset:])
		if openMatch == nil {
			break
		}

		// Adjust indices to account for offset
		for i := range openMatch {
			openMatch[i] += offset
		}

		name := content[openMatch[2]:openMatch[3]]
		attrs := content[openMatch[4]:openMatch[5]]
		openEnd := openMatch[1]

		// Look for corresponding closing tag
		closeTag := fmt.Sprintf("{{/%s}}", name)
		closeStart := strings.Index(content[openEnd:], closeTag)
		if closeStart == -1 {
			// No closing tag - this is a self-closing shortcode, skip it
			offset = openEnd
			continue
		}
		closeStart += openEnd // make absolute
		closeEnd := closeStart + len(closeTag)

		// Extract the block shortcode
		innerContent := strings.TrimSpace(content[openEnd:closeStart])

		sc := Shortcode{
			ID:      uuid.NewString(),
			Name:    name,
			Attrs:   p.parseAttrs(attrs),
			Content: innerContent,
		}
		*shortcodes = append(*shortcodes, sc)

		// Append content before the block
		sb.WriteString(content[lastIndex:openMatch[0]])

		// Append the placeholder
		placeholder := fmt.Sprintf("<!--shortcode:%s-->", sc.ID)
		sb.WriteString(placeholder)

		// Update indices
		lastIndex = closeEnd
		offset = closeEnd
	}

	// Append any remaining content
	if lastIndex < len(content) {
		sb.WriteString(content[lastIndex:])
	}

	return sb.String()
}

func (p *ShortcodeParser) parseAttrs(attrStr string) map[string]string {
	attrs := make(map[string]string)
	matches := p.attrPattern.FindAllStringSubmatch(attrStr, -1)
	for _, m := range matches {
		if len(m) == 3 {
			attrs[m[1]] = m[2]
		}
	}
	return attrs
}

// ReplacePlaceholder replaces a shortcode placeholder with rendered HTML.
func ReplacePlaceholder(content, id, html string) string {
	placeholder := fmt.Sprintf("<!--shortcode:%s-->", id)
	return strings.Replace(content, placeholder, html, 1)
}
