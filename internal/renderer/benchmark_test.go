package renderer

import "testing"

func BenchmarkNewShortcodeParser(b *testing.B) {
	for i := 0; i < b.N; i++ {
		NewShortcodeParser()
	}
}

func BenchmarkShortcodeParser_Parse(b *testing.B) {
	p := NewShortcodeParser()
	input := `Start
{{figure src="a.jpg"}}
Middle
{{quote author="Test"}}Inner content{{/quote}}
End`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		p.Parse(input)
	}
}
