package compress

import (
	"bytes"
	"sync"

	"github.com/andybalholm/brotli"
)

// Level constants for compression quality
const (
	BestSpeed          = brotli.BestSpeed
	BestCompression    = brotli.BestCompression
	DefaultCompression = 6
)

// CompressedAsset holds both original and compressed versions of an asset.
type CompressedAsset struct {
	Original   []byte
	Compressed []byte
	MimeType   string
}

// Compressor handles Brotli compression with caching.
type Compressor struct {
	level int
	cache map[string]*CompressedAsset
	mu    sync.RWMutex
}

// NewCompressor creates a new Brotli compressor with the given quality level.
func NewCompressor(level int) *Compressor {
	if level < BestSpeed || level > BestCompression {
		level = DefaultCompression
	}
	return &Compressor{
		level: level,
		cache: make(map[string]*CompressedAsset),
	}
}

// Compress compresses data using Brotli.
func (c *Compressor) Compress(data []byte) ([]byte, error) {
	var buf bytes.Buffer
	writer := brotli.NewWriterLevel(&buf, c.level)

	if _, err := writer.Write(data); err != nil {
		return nil, err
	}

	if err := writer.Close(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// CompressAndCache compresses data and caches the result.
func (c *Compressor) CompressAndCache(key string, data []byte, mimeType string) (*CompressedAsset, error) {
	compressed, err := c.Compress(data)
	if err != nil {
		return nil, err
	}

	asset := &CompressedAsset{
		Original:   data,
		Compressed: compressed,
		MimeType:   mimeType,
	}

	c.mu.Lock()
	c.cache[key] = asset
	c.mu.Unlock()

	return asset, nil
}

// Get retrieves a cached compressed asset.
func (c *Compressor) Get(key string) (*CompressedAsset, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	asset, ok := c.cache[key]
	return asset, ok
}

// ShouldCompress returns true if the content type should be compressed.
func ShouldCompress(contentType string) bool {
	compressible := []string{
		"text/html",
		"text/css",
		"text/javascript",
		"application/javascript",
		"application/json",
		"image/svg+xml",
		"text/plain",
		"text/xml",
		"application/xml",
	}

	for _, ct := range compressible {
		if contentType == ct {
			return true
		}
	}
	return false
}

// AcceptsBrotli checks if the client accepts Brotli encoding.
func AcceptsBrotli(acceptEncoding string) bool {
	return bytes.Contains([]byte(acceptEncoding), []byte("br"))
}
