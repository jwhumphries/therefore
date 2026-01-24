---
title: "Page Bundle Test"
slug: "bundle-test"
publishDate: 2024-01-21T00:00:00Z
draft: false
tags: [test]
summary: "A page bundle post with local assets."
---

This is a page bundle post to test the Hugo-style directory structure.

## Local Images

Here's an image using a relative path:

![Test diagram](diagram.svg)

And another with the `./` prefix:

![Another diagram](./diagram.svg)

## How It Works

This post lives at `content/posts/bundle-test/index.md` with assets in the same directory.

The image paths above are automatically transformed to `/posts/bundle-test/diagram.svg` when rendered.
