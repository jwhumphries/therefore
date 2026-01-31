package views

import (
	"testing"
)

func TestFormatCitationNumber(t *testing.T) {
	tests := []struct {
		input int
		want  string
	}{
		{1, "[1]"},
		{10, "[10]"},
		{0, "[0]"},
	}
	for _, tt := range tests {
		got := formatCitationNumber(tt.input)
		if got != tt.want {
			t.Errorf("formatCitationNumber(%d) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestBibleGatewayURL(t *testing.T) {
	tests := []struct {
		name    string
		ref     string
		version string
		want    string
	}{
		{
			name:    "ref with version",
			ref:     "John 3:16",
			version: "ESV",
			want:    "https://www.biblegateway.com/passage/?search=John+3%3A16&version=ESV",
		},
		{
			name:    "ref without version",
			ref:     "Genesis 1:1",
			version: "",
			want:    "https://www.biblegateway.com/passage/?search=Genesis+1%3A1",
		},
		{
			name:    "empty ref",
			ref:     "",
			version: "NIV",
			want:    "https://www.biblegateway.com/passage/?search=&version=NIV",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := bibleGatewayURL(tt.ref, tt.version)
			if got != tt.want {
				t.Errorf("bibleGatewayURL(%q, %q) = %q, want %q", tt.ref, tt.version, got, tt.want)
			}
		})
	}
}

func TestFormatVerseNumbers(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "verse at start",
			input: "1 In the beginning",
			want:  `<sup class="verse-num">1</sup>In the beginning`,
		},
		{
			name:  "escaped number",
			input: `\7 days of creation`,
			want:  "7 days of creation",
		},
		{
			name:  "multiple verses",
			input: "1 First verse 2 Second verse",
			want:  `<sup class="verse-num">1</sup>First verse <sup class="verse-num">2</sup>Second verse`,
		},
		{
			name:  "no numbers",
			input: "No verse numbers here",
			want:  "No verse numbers here",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatVerseNumbers(tt.input)
			if got != tt.want {
				t.Errorf("formatVerseNumbers(%q) =\n  %q\nwant:\n  %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestApplyScriptureDropCap(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "basic first letter",
			input: "In the beginning",
			want:  `<span class="scripture-drop-cap">I</span>n the beginning`,
		},
		{
			name:  "leading sup tag",
			input: `<sup class="verse-num">1</sup>In the beginning`,
			want:  `<sup class="verse-num">1</sup><span class="scripture-drop-cap">I</span>n the beginning`,
		},
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := applyScriptureDropCap(tt.input)
			if got != tt.want {
				t.Errorf("applyScriptureDropCap(%q) =\n  %q\nwant:\n  %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestParseTimelineEvents(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  []TimelineEvent
	}{
		{
			name:  "full event",
			input: "400 BC|Socrates|Philosopher of Athens",
			want: []TimelineEvent{
				{Date: "400 BC", Title: "Socrates", Description: "Philosopher of Athens"},
			},
		},
		{
			name:  "two fields only",
			input: "400 BC|Socrates",
			want: []TimelineEvent{
				{Date: "400 BC", Title: "Socrates"},
			},
		},
		{
			name: "blank lines skipped",
			input: `400 BC|Socrates

300 BC|Aristotle`,
			want: []TimelineEvent{
				{Date: "400 BC", Title: "Socrates"},
				{Date: "300 BC", Title: "Aristotle"},
			},
		},
		{
			name:  "single field skipped",
			input: "just-one-field",
			want:  nil,
		},
		{
			name:  "empty input",
			input: "",
			want:  nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseTimelineEvents(tt.input)
			if len(got) != len(tt.want) {
				t.Fatalf("ParseTimelineEvents() returned %d events, want %d", len(got), len(tt.want))
			}
			for i, event := range got {
				if event != tt.want[i] {
					t.Errorf("event[%d] = %+v, want %+v", i, event, tt.want[i])
				}
			}
		})
	}
}
