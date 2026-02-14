package ssg

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseViteAssets(t *testing.T) {
	// Create a temporary directory
	tempDir, err := os.MkdirTemp("", "ssg-test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create a dummy index.html
	htmlContent := `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test App</title>
  <script type="module" crossorigin src="/assets/index-D8lXkOQ0.js"></script>
  <link rel="stylesheet" crossorigin href="/assets/index-C8lXkOQ0.css">
</head>
<body>
</body>
</html>`

	if err := os.WriteFile(filepath.Join(tempDir, "index.html"), []byte(htmlContent), 0644); err != nil {
		t.Fatalf("failed to write index.html: %v", err)
	}

	// Create generator
	g := New(nil, "http://example.com", tempDir)

	// Parse assets
	if err := g.parseViteAssets(); err != nil {
		t.Fatalf("parseViteAssets failed: %v", err)
	}

	// Verify CSS
	if len(g.cssLinks) != 1 {
		t.Errorf("expected 1 CSS link, got %d", len(g.cssLinks))
	} else if g.cssLinks[0] != "/assets/index-C8lXkOQ0.css" {
		t.Errorf("expected CSS link /assets/index-C8lXkOQ0.css, got %s", g.cssLinks[0])
	}

	// Verify JS
	if g.jsEntry != "/assets/index-D8lXkOQ0.js" {
		t.Errorf("expected JS entry /assets/index-D8lXkOQ0.js, got %s", g.jsEntry)
	}
}

func BenchmarkParseViteAssets(b *testing.B) {
	// Create a temporary directory
	tempDir, err := os.MkdirTemp("", "ssg-bench")
	if err != nil {
		b.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create a dummy index.html
	htmlContent := `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test App</title>
  <script type="module" crossorigin src="/assets/index-D8lXkOQ0.js"></script>
  <link rel="stylesheet" crossorigin href="/assets/index-C8lXkOQ0.css">
</head>
<body>
</body>
</html>`

	if err := os.WriteFile(filepath.Join(tempDir, "index.html"), []byte(htmlContent), 0644); err != nil {
		b.Fatalf("failed to write index.html: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		g := New(nil, "http://example.com", tempDir)
		if err := g.parseViteAssets(); err != nil {
			b.Fatalf("parseViteAssets failed: %v", err)
		}
	}
}
