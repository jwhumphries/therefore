// Package version provides the build-time version tag.
package version //nolint:revive // package name is intentional

// Tag is the version tag injected at build time via ldflags.
// Example: go build -ldflags "-X therefore/version.Tag=v1.0.0"
var Tag = "dev"
