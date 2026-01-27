# Shortcodes

Shortcodes embed rich components inside markdown posts. They are extracted before markdown rendering, so their inner content is not processed by Goldmark unless the shortcode renderer explicitly applies inline markdown.

## Syntax

**Block shortcode** (has inner content):
```
{{name attr="value"}}content here{{/name}}
```

**Self-closing shortcode** (no inner content):
```
{{name attr="value"}}
```

Attribute values must be quoted with single or double quotes. Shortcode names may contain letters, numbers, underscores, and hyphens.

---

## figure

An image with optional caption. Clicking opens a lightbox.

| Attribute | Required | Description |
|-----------|----------|-------------|
| `src`     | yes      | Image URL or path |
| `alt`     | yes      | Alt text for accessibility |
| `caption` | no       | Caption displayed below the image |

Self-closing.

```markdown
{{figure src="/images/plato.jpg" alt="Bust of Plato" caption="Plato, c. 428-348 BC"}}
```

---

## quote

A styled blockquote with optional author and source attribution.

| Attribute | Required | Description |
|-----------|----------|-------------|
| `author`  | no       | Person being quoted |
| `source`  | no       | Work or context of the quote |

Content supports inline markdown (bold, italic, links).

```markdown
{{quote author="Aristotle" source="Nicomachean Ethics"}}
We are what we repeatedly do. Excellence, then, is not an act, but a habit.
{{/quote}}
```

---

## sidenote

An inline margin note. Renders as a numbered superscript that opens a popover on click.

| Attribute | Required | Description |
|-----------|----------|-------------|
| `id`      | yes      | Unique identifier for the sidenote |

Content supports inline markdown.

```markdown
This is a key claim.{{sidenote id="key-claim"}}The evidence for this comes from
several independent sources, including *recent studies* in the field.{{/sidenote}}
```

---

## cite

An inline citation reference. Renders as a numbered superscript with a popover showing the source. All citations in a post are collected into a collapsible accordion at the bottom.

| Attribute | Required | Description |
|-----------|----------|-------------|
| `text`    | no*      | Display text for the citation |
| `url`     | no*      | Link to the source |
| `alias`   | no*      | Reference to a citation defined in frontmatter |

*Either provide `text`/`url` directly, or use `alias` to reference a frontmatter citation.

**Inline usage:**

```markdown
This was a groundbreaking discovery.{{cite text="Smith (2020)" url="https://example.com/smith"}}
```

**With frontmatter aliases:**

```yaml
---
citations:
  smith2020:
    text: "Smith, On Examples (2020)"
    url: "https://example.com/smith"
  jones2019:
    text: "Jones, A Study (2019)"
    url: "https://example.com/jones"
---
```

```markdown
This was first observed by Smith{{cite alias="smith2020"}} and later confirmed by Jones.{{cite alias="jones2019"}}
```

---

## term

A compact definition box for technical or philosophical terms.

| Attribute | Required | Description |
|-----------|----------|-------------|
| `word`    | yes      | The term being defined |
| `origin`  | no       | Etymology or language of origin |

Content supports inline markdown.

```markdown
{{term word="Eudaimonia" origin="Greek: εὐδαιμονία"}}
Human flourishing or well-being; the highest human good in Aristotelian ethics.
{{/term}}
```

---

## scripture

A Bible passage with bookended vertical borders, verse number formatting, and a drop cap on the first letter. Includes a link to Bible Gateway.

| Attribute | Required | Description |
|-----------|----------|-------------|
| `ref`     | yes      | Scripture reference (e.g., "John 1:1-3") |
| `version` | no       | Bible translation (e.g., "ESV", "NIV") |
| `format`  | no       | Set to `"poetry"` for centered text with preserved line breaks |

Verse numbers are bare numbers followed by a space. The first verse number and subsequent letter get special formatting (superscript and drop cap). To output a literal number, escape it with a backslash: `\7`.

```markdown
{{scripture ref="Romans 8:28" version="ESV"}}
28 And we know that for those who love God all things work together
for good, for those who are called according to his purpose.
{{/scripture}}
```

**Poetry format:**

```markdown
{{scripture ref="Psalm 23:1-3" version="ESV" format="poetry"}}
1 The Lord is my shepherd; I shall not want.
2 He makes me lie down in green pastures.
He leads me beside still waters.
3 He restores my soul.
{{/scripture}}
```

---

## scripture-compare

A two-column scripture comparison. The left column shows a pinned reference translation; the right column shows one or more alternate translations with a cycle button to switch between them.

| Attribute | Required | Description |
|-----------|----------|-------------|
| `ref`     | yes      | Scripture reference (e.g., "John 1:1") |
| `pinned`  | yes      | Version abbreviation for the pinned (left) column |
| `alts`    | yes      | Comma-separated version abbreviations for alternates |
| `format`  | no       | Set to `"poetry"` for centered text with preserved line breaks |

Content sections are separated by `---` on its own line. The first section is the pinned version. Subsequent sections are the alternates, matching the order of the `alts` attribute. Each section supports verse numbers and drop caps, just like `scripture`.

```markdown
{{scripture-compare ref="John 1:1-3" pinned="ESV" alts="NIV,KJV,NASB"}}
1 In the beginning was the Word, and the Word was with God,
and the Word was God. 2 He was in the beginning with God.
3 All things were made through him, and without him was not
any thing made that was made.
---
1 In the beginning was the Word, and the Word was with God,
and the Word was God. 2 He was with God in the beginning.
3 Through him all things were made; without him nothing was
made that has been made.
---
1 In the beginning was the Word, and the Word was with God,
and the Word was God. 2 The same was in the beginning with God.
3 All things were made by him; and without him was not any thing
made that was made.
---
1 In the beginning was the Word, and the Word was with God,
and the Word was God. 2 He was in the beginning with God.
3 All things came into being through Him, and apart from Him
not even one thing came into being that has come into being.
{{/scripture-compare}}
```

**With only one alternate** (no cycle button shown):

```markdown
{{scripture-compare ref="Psalm 23:1" pinned="ESV" alts="KJV" format="poetry"}}
1 The Lord is my shepherd; I shall not want.
---
1 The Lord is my shepherd; I shall not want.
{{/scripture-compare}}
```

---

## parallel

A side-by-side comparison of two viewpoints or texts, displayed in a bordered card.

| Attribute | Required | Description |
|-----------|----------|-------------|
| `left`    | yes      | Label for the left column |
| `right`   | yes      | Label for the right column |

Content is split on `---`. The first half goes in the left column, the second in the right. Both support inline markdown.

```markdown
{{parallel left="Rationalism" right="Empiricism"}}
Knowledge comes primarily from reason and innate ideas.
The mind has access to truths independent of experience.
---
Knowledge comes primarily from sensory experience.
The mind begins as a blank slate (*tabula rasa*).
{{/parallel}}
```

---

## timeline

A horizontal timeline with alternating events above and below the line.

| Attribute | Required | Description |
|-----------|----------|-------------|
| `start`   | no       | Label for the start of the timeline |
| `end`     | no       | Label for the end of the timeline |

Each line of content is one event in the format `date|title|description`. The description is optional.

```markdown
{{timeline start="Ancient" end="Modern"}}
428 BC|Plato Born|Founder of the Academy in Athens
384 BC|Aristotle Born|Student of Plato, tutor to Alexander
354 AD|Augustine Born|Bishop of Hippo, author of Confessions
1225|Aquinas Born|Dominican friar, wrote the Summa Theologiae
{{/timeline}}
```
