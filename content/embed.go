// Package content embeds the post files for distribution.
package content

import "embed"

// PostsFS embeds the posts directory.
//
//go:embed posts/*
var PostsFS embed.FS
