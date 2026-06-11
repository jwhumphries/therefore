package views

import "testing"

func BenchmarkApplyScriptureDropCap(b *testing.B) {
	input := `<sup class="verse-num">1</sup>In the beginning`
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		applyScriptureDropCap(input)
	}
}

func BenchmarkFormatVerseNumbers(b *testing.B) {
	input := "1 In the beginning God created \\7 heavens"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		formatVerseNumbers(input)
	}
}
