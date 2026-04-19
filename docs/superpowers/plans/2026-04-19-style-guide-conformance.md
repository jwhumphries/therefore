# Style Guide Conformance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Therefore blog into full conformance with the personal style guides, then verify everything works end-to-end.

**Architecture:** Layer-by-layer approach — Go backend config/code first, then frontend config/code, then CI/tooling migration, then final verification. Each phase produces independently verifiable changes.

**Tech Stack:** Go 1.26, golangci-lint v2, React 19, TypeScript 5.9, ESLint flat config, Prettier, Vite 7, Dagger, just

**Spec:** `docs/superpowers/specs/2026-04-19-style-guide-conformance-review-design.md`

---

## Phase 1: Go Backend

### Task 1: Update golangci-lint config

**Files:**
- Modify: `.golangci.yml`

- [ ] **Step 1: Replace .golangci.yml with canonical config + project additions**

Replace the full contents of `.golangci.yml` with:

```yaml
# golangci-lint v2 configuration
# Based on the Uber Go Style Guide's recommended linters.
#
# Default "standard" linters (enabled automatically):
#   errcheck, govet, ineffassign, staticcheck, unused
#
# Additional linters enabled below complement the defaults
# per the style guide's recommendations.

version: "2"

run:
  timeout: 5m
  modules-download-mode: readonly

linters:
  default: standard
  enable:
    - revive
    - bodyclose
    - noctx
    - errorlint
  exclusions:
    paths:
      - .dagger
      - vendor
      - tmp
    rules:
      - path: _test\.go
        linters:
          - errcheck
          - noctx

formatters:
  enable:
    - goimports

issues:
  max-issues-per-linter: 0
  max-same-issues: 0
```

This switches from `default: none` with manually listed linters to `default: standard` plus `revive` (from canonical config) and `bodyclose`, `noctx`, `errorlint` (project-specific additions that catch real bugs). Drops `misspell` and `unconvert` (low value, not in style guide). Adds `goimports` formatter and `modules-download-mode: readonly`.

- [ ] **Step 2: Run lint to check for new issues**

Run: `dagger -m .dagger call lint --source .`
Expected: PASS (or a list of new issues to fix in Task 2)

- [ ] **Step 3: Commit**

```bash
git add .golangci.yml
git commit -m "chore: align golangci-lint config with style guide

Switch to default: standard, add revive + goimports formatter,
keep bodyclose/noctx/errorlint for bug detection."
```

---

### Task 2: Fix any new lint issues

**Files:**
- Modify: Any Go files flagged by the updated linter config

- [ ] **Step 1: Review lint output from Task 1**

If Task 1 Step 2 produced errors, fix each one. Common issues from `revive` and `goimports`:
- Import grouping (goimports will auto-fix via `dagger -m .dagger call fmt --source . export --path .`)
- `revive` may flag exported functions/types without comments

- [ ] **Step 2: Run goimports formatter**

Run: `dagger -m .dagger call fmt --source . export --path .`

This applies `goimports` formatting to all Go files (import grouping, standard formatting).

- [ ] **Step 3: Run lint again to verify clean**

Run: `dagger -m .dagger call lint --source .`
Expected: PASS with no errors

- [ ] **Step 4: Run tests to verify no regressions**

Run: `dagger -m .dagger call test --source .`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: resolve lint issues from updated golangci-lint config"
```

---

### Task 3: Add interface compliance checks

**Files:**
- Modify: `internal/content/embedded.go`

- [ ] **Step 1: Add compile-time interface assertion**

Add the following line after the `EmbeddedStore` struct definition (after the closing brace of the struct, before any methods). The struct is defined around line 45 of `internal/content/embedded.go`:

```go
// Compile-time interface compliance check.
var _ ContentStore = (*EmbeddedStore)(nil)
```

This ensures `EmbeddedStore` satisfies `ContentStore` at compile time per the Uber Go Style Guide.

- [ ] **Step 2: Verify it compiles**

Run: `dagger -m .dagger call test --source .`
Expected: PASS (if the interface is satisfied, this compiles fine)

- [ ] **Step 3: Commit**

```bash
git add internal/content/embedded.go
git commit -m "chore: add compile-time interface compliance check for EmbeddedStore"
```

---

### Task 4: Go code audit — review and fix patterns

**Files:**
- Review: All Go files in `cmd/therefore/`, `internal/`
- Potentially modify: `internal/views/render.go`, `cmd/therefore/server.go`

- [ ] **Step 1: Assess init() functions**

The project has two `init()` functions:
- `cmd/therefore/root.go:28` — Cobra flag registration
- `cmd/therefore/ssg.go:36` — Cobra subcommand registration

**Decision: Keep both.** These are the standard Cobra pattern. The Uber guide says "avoid init()" but Cobra's architecture requires them for flag and command registration. This is an acceptable, well-documented exception.

- [ ] **Step 2: Assess mutable package-level variables**

Review the mutable globals:
- `version.Tag` — set via ldflags at build time, never mutated at runtime. **Acceptable.**
- `cmd/therefore/root.go:cfgFile`, `rootCmd` — Cobra internals. **Acceptable.**
- `internal/views/render.go:DevMode` — set once in `server.go:28` at startup. **Acceptable** as it's set-once-at-startup, not mutated during request handling. Not worth refactoring into dependency injection for a single bool used in templates.
- Regex `var` blocks in `content/embedded.go`, `handlers/api.go`, `ssg/generator.go` — effectively immutable (compiled once, never reassigned). **Acceptable.**
- `internal/views/shortcode_renderers.go:inlineRenderer` — effectively immutable singleton. **Acceptable.**

**No changes needed.** All mutable globals follow acceptable patterns (Cobra internals, set-once-at-startup, or effectively immutable).

- [ ] **Step 3: Spot-check error handling patterns**

Verify key patterns are correct:
- `ErrPostNotFound` uses `errors.New()` with `Err` prefix — correct per style guide
- Error wrapping uses `fmt.Errorf("context: %w", err)` throughout — correct
- `server.go` returns errors from `runServer`, only `main.go` calls `os.Exit` — correct (exit only in main)

**No changes needed.**

- [ ] **Step 4: Spot-check struct initialization**

Verify structs use field names (not positional):
- `cmd/therefore/server.go` — uses `map[string]string{"status": "ok"}` — correct
- `internal/content/post.go` — struct definitions use field tags — correct
- `cmd/therefore/root.go:14` — `rootCmd = &cobra.Command{Use: ..., Short: ..., RunE: ...}` — correct

**No changes needed.**

- [ ] **Step 5: Document audit results**

No code changes from the audit. The Go backend follows the Uber style guide well. Record this as a note in the commit:

```bash
git commit --allow-empty -m "chore: Go code audit complete — no issues found

Reviewed: init() usage (Cobra pattern, acceptable), mutable globals
(set-once or effectively immutable), error handling (correct wrapping
and sentinel patterns), struct initialization (field names used)."
```

---

## Phase 2: Frontend

### Task 5: Add Prettier config and install dependencies

**Files:**
- Create: `frontend/.prettierrc.json`
- Modify: `frontend/package.json` (via bun add)

- [ ] **Step 1: Create Prettier config**

Create `frontend/.prettierrc.json`:

```json
{
  "bracketSpacing": false,
  "singleQuote": true,
  "trailingComma": "all",
  "arrowParens": "avoid"
}
```

- [ ] **Step 2: Install Prettier and ESLint Prettier integration**

Run: `cd frontend && bun add -D prettier eslint-config-prettier eslint-plugin-prettier`

- [ ] **Step 3: Verify dependencies installed**

Run: `cd frontend && bun run prettier --version`
Expected: Prints Prettier version (e.g., `3.x.x`)

- [ ] **Step 4: Commit**

```bash
git add frontend/.prettierrc.json frontend/package.json frontend/bun.lock
git commit -m "chore: add Prettier config and ESLint Prettier integration

Canonical settings: single quotes, no bracket spacing, trailing
commas, no arrow parens for single params."
```

---

### Task 6: Update ESLint config

**Files:**
- Modify: `frontend/eslint.config.js`

- [ ] **Step 1: Replace ESLint config with canonical config + React plugins**

Replace `frontend/eslint.config.js` with:

```js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  // --- Ignores ---
  {
    ignores: ['**/node_modules/', '**/dist/', '**/build/'],
  },

  // --- Base: all JS/TS files ---
  eslint.configs.recommended,
  prettierConfig,
  {
    plugins: {
      prettier: pluginPrettier,
    },
    rules: {
      'prettier/prettier': 'error',
      'block-scoped-var': 'error',
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'eol-last': 'error',
      'prefer-arrow-callback': 'error',
      'no-trailing-spaces': 'error',
      quotes: ['warn', 'single', {avoidEscape: true}],
      'no-restricted-properties': [
        'error',
        {object: 'describe', property: 'only'},
        {object: 'it', property: 'only'},
      ],
    },
  },

  // --- TypeScript files ---
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React rules
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {allowConstantExport: true},
      ],

      // TypeScript rules from style guide
      '@typescript-eslint/array-type': ['error', {default: 'array-simple'}],
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',

      // Relaxed rules
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-warning-comments': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
);
```

Key changes from current config:
- Adds Prettier integration (enforced via `prettier/prettier: error`)
- Adds core rules: `eqeqeq`, `no-var`, `prefer-const`, `block-scoped-var`, `prefer-arrow-callback`, `no-trailing-spaces`, `eol-last`
- Adds TS rules: `array-type` (array-simple), `ban-ts-comment` (warn), `no-floating-promises`
- Adds test protection: `no-restricted-properties` on `describe.only` / `it.only`
- Keeps React plugins (`react-hooks`, `react-refresh`)
- Bumps `ecmaVersion` from 2020 to 2022

- [ ] **Step 2: Commit**

```bash
git add frontend/eslint.config.js
git commit -m "chore: align ESLint config with style guide

Add Prettier integration, stricter core rules (eqeqeq, prefer-const,
no-var), TypeScript rules (array-type, no-floating-promises), and
test protection (no describe.only/it.only)."
```

---

### Task 7: Update TypeScript config

**Files:**
- Modify: `frontend/tsconfig.json`

- [ ] **Step 1: Update tsconfig.json**

Apply these changes to `frontend/tsconfig.json`:

1. Change `"target": "ES2020"` to `"target": "ES2022"`
2. Change `"lib": ["ES2020", "DOM", "DOM.Iterable"]` to `"lib": ["ES2022", "DOM", "DOM.Iterable"]`
3. Add `"allowUnreachableCode": false` in the Linting section
4. Add `"noImplicitReturns": true` in the Linting section

The result should be:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "allowUnreachableCode": false,
    "noImplicitReturns": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Run type-check to verify no new errors**

Run: `dagger -m .dagger call typecheck --source .`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/tsconfig.json
git commit -m "chore: align tsconfig with style guide

Bump target/lib to ES2022, add allowUnreachableCode: false
and noImplicitReturns: true."
```

---

### Task 8: Run Prettier formatting pass

**Files:**
- Modify: All `.ts`, `.tsx`, `.json`, `.css` files in `frontend/src/`

- [ ] **Step 1: Run Prettier on all frontend files**

Run: `cd frontend && bun run prettier --write 'src/**/*.{ts,tsx,css}' '.prettierrc.json' 'eslint.config.js' 'vite.config.ts' 'vitest.config.ts'`

This applies: single quotes, no bracket spacing, trailing commas, arrow paren removal.

- [ ] **Step 2: Review the diff**

Run: `git diff --stat frontend/`
Expected: Many files changed (formatting only — no logic changes)

Spot-check a few files to verify changes are formatting-only:
Run: `git diff frontend/src/main.tsx`

- [ ] **Step 3: Commit formatting separately**

```bash
git add frontend/
git commit -m "style: apply Prettier formatting to frontend

Single quotes, no bracket spacing, trailing commas,
no arrow parens for single params. Formatting only, no logic changes."
```

---

### Task 9: Fix ESLint errors from stricter config

**Files:**
- Modify: Any frontend files flagged by the new ESLint rules

- [ ] **Step 1: Run ESLint to see all errors**

Run: `dagger -m .dagger call lint-frontend --source .`
Expected: Likely some errors from new rules (`eqeqeq`, `no-floating-promises`, `array-type`, etc.)

- [ ] **Step 2: Auto-fix what ESLint can handle**

Run: `cd frontend && bun run eslint . --fix`

This will auto-fix: trailing spaces, missing EOL, some quote issues, and Prettier formatting issues.

- [ ] **Step 3: Manually fix remaining errors**

Common manual fixes needed:
- `eqeqeq`: Change `==` to `===` and `!=` to `!==`
- `no-floating-promises`: Add `void` prefix or `await` to unhandled promises
- `array-type`: Change `Array<SimpleType>` to `SimpleType[]`
- `prefer-const`: Change `let` to `const` where variable is never reassigned

- [ ] **Step 4: Run ESLint again to verify clean**

Run: `dagger -m .dagger call lint-frontend --source .`
Expected: PASS with no errors

- [ ] **Step 5: Run type-check**

Run: `dagger -m .dagger call typecheck --source .`
Expected: PASS

- [ ] **Step 6: Run frontend tests**

Run: `dagger -m .dagger call test-frontend --source .`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "fix: resolve ESLint errors from stricter config

Fix eqeqeq, no-floating-promises, array-type, prefer-const,
and other issues surfaced by the updated ESLint rules."
```

---

## Phase 3: CI/CD

### Task 10: Create justfile

**Files:**
- Create: `justfile`

- [ ] **Step 1: Create the justfile**

Create `justfile` at the project root:

```just
# Therefore blog — just recipes wrapping Dagger calls
# Usage: just <recipe>

app_name := "therefore"

# List available recipes
default:
    @just --list

# Start development environment with hot-reload
dev:
    docker compose up --build

# Stop development environment
dev-stop:
    docker compose down

# View development logs
dev-logs:
    docker compose logs -f

# Open shell in dev container
dev-shell:
    docker compose exec dev sh

# Build production container via Dagger
build:
    #!/usr/bin/env bash
    set -euo pipefail
    dagger -m .dagger call release --source=. export --path ./{{ app_name }}-local.tar
    id=$(docker load -i ./{{ app_name }}-local.tar | sed -n 's/^Loaded image.*: //p')
    docker tag "$id" {{ app_name }}:local
    rm ./{{ app_name }}-local.tar

# Build frontend assets via Dagger
build-frontend:
    dagger -m .dagger call build-frontend --source=. export --path=./internal/static/dist

# Run Go tests via Dagger
test:
    dagger -m .dagger call test --source=.

# Run Go linter via Dagger
lint:
    dagger -m .dagger call lint --source=.

# Run frontend ESLint via Dagger
lint-frontend:
    dagger -m .dagger call lint-frontend --source=.

# Run TypeScript type-check via Dagger
typecheck:
    dagger -m .dagger call typecheck --source=.

# Run frontend Vitest tests via Dagger
test-frontend:
    dagger -m .dagger call test-frontend --source=.

# Run all checks (lint, typecheck, test) via Dagger
check:
    dagger -m .dagger call check --source=.

# Format Go code via Dagger
fmt:
    dagger -m .dagger call fmt --source=. export --path=.

# Format frontend code via Dagger
fmt-frontend:
    dagger -m .dagger call fmt-frontend --source=. export --path=.

# Generate templ files via Dagger
templ:
    dagger -m .dagger call templ-generate --source=. export --path=.

# Format templ files via Dagger
templ-fmt:
    dagger -m .dagger call templ-fmt --source=. export --path=.

# Generate pre-rendered HTML pages for SEO via Dagger
ssg: build-frontend
    dagger -m .dagger call ssg --source=. --frontend-dist=./internal/static/dist export --path=./internal/static/dist

# Remove build artifacts
clean:
    rm -rf ./tmp ./bin
    rm -rf ./frontend/node_modules
    rm -rf ./internal/static/dist

# Remove Docker volumes and images
clean-docker:
    docker compose down -v
    docker rmi {{ app_name }}:dev 2>/dev/null || true
```

Key differences from Taskfile:
- `check` calls `dagger call check` directly (runs all checks in parallel via errgroup) instead of sequentially calling individual tasks
- `build` uses a bash shebang block for the multi-line script
- `ssg` uses just's dependency syntax (`: build-frontend`)
- No YAML, just simple make-like syntax

- [ ] **Step 2: Verify just is installed**

Run: `just --version`
Expected: Prints just version. If not installed: `brew install just`

- [ ] **Step 3: Test a recipe**

Run: `just --dry-run check`
Expected: Prints `dagger -m .dagger call check --source=.`

- [ ] **Step 4: Commit**

```bash
git add justfile
git commit -m "chore: add justfile as task runner per CI style guide

Thin wrapper over Dagger calls. Replaces Taskfile.yml (removed
in next commit)."
```

---

### Task 11: Remove Taskfile.yml

**Files:**
- Delete: `Taskfile.yml`

- [ ] **Step 1: Remove Taskfile.yml**

Run: `rm Taskfile.yml`

- [ ] **Step 2: Commit**

```bash
git rm Taskfile.yml
git commit -m "chore: remove Taskfile.yml, replaced by justfile"
```

---

### Task 12: Add Dagger cache volumes for frontend functions

**Files:**
- Modify: `.dagger/main.go`

- [ ] **Step 1: Extract a helper for the frontend container setup**

Currently each frontend function (`Typecheck`, `LintFrontend`, `TestFrontend`, `BuildFrontend`, `FmtFrontend`) repeats the same container setup with `bun install`. Add a helper method and a cache volume.

Add this method to the `Therefore` struct in `.dagger/main.go`, after the `templContainer()` method (around line 57):

```go
// frontendContainer returns a container with frontend dependencies installed and cached.
func (m *Therefore) frontendContainer(source *dagger.Directory) *dagger.Container {
	return dag.Container().
		From("ghcr.io/jwhumphries/frontend:latest@sha256:2c0150dd4e95164a253f338703edeba2bc007fb8fc1862da7806ae2c6733f626").
		WithEnvVariable("BUN_INSTALL_CACHE_DIR", "/bun-cache").
		WithMountedCache("/bun-cache", dag.CacheVolume("therefore-bun-cache")).
		WithDirectory("/app", source).
		WithWorkdir("/app/frontend").
		WithExec([]string{"bun", "install"})
}
```

- [ ] **Step 2: Update Typecheck to use the helper**

Replace the `Typecheck` method body (around line 128-136):

```go
func (m *Therefore) Typecheck(ctx context.Context, source *dagger.Directory) (string, error) {
	return m.frontendContainer(source).
		WithExec([]string{"bun", "run", "typecheck"}).
		Stdout(ctx)
}
```

- [ ] **Step 3: Update LintFrontend to use the helper**

Replace the `LintFrontend` method body (around line 139-147):

```go
func (m *Therefore) LintFrontend(ctx context.Context, source *dagger.Directory) (string, error) {
	return m.frontendContainer(source).
		WithExec([]string{"bun", "run", "lint"}).
		Stdout(ctx)
}
```

- [ ] **Step 4: Update TestFrontend to use the helper**

Replace the `TestFrontend` method body (around line 150-158):

```go
func (m *Therefore) TestFrontend(ctx context.Context, source *dagger.Directory) (string, error) {
	return m.frontendContainer(source).
		WithExec([]string{"bun", "run", "test"}).
		Stdout(ctx)
}
```

- [ ] **Step 5: Update FmtFrontend to use the helper**

Replace the `FmtFrontend` method body (around line 161-169):

```go
func (m *Therefore) FmtFrontend(source *dagger.Directory) *dagger.Directory {
	return m.frontendContainer(source).
		WithExec([]string{"bun", "run", "lint", "--fix"}).
		Directory("/app")
}
```

- [ ] **Step 6: Update BuildFrontend to use the helper**

Replace the `BuildFrontend` method body (around line 172-179):

```go
func (m *Therefore) BuildFrontend(source *dagger.Directory) *dagger.Directory {
	return m.frontendContainer(source).
		WithExec([]string{"bun", "run", "build"}).
		Directory("/app/internal/static/dist")
}
```

- [ ] **Step 7: Run check to verify Dagger pipeline still works**

Run: `dagger -m .dagger call check --source .`
Expected: PASS (all checks pass with cached bun installs)

- [ ] **Step 8: Commit**

```bash
git add .dagger/main.go
git commit -m "refactor: extract frontendContainer helper with bun cache volume

DRY up repeated container setup across 5 frontend Dagger functions.
Add therefore-bun-cache volume so bun install is cached across runs."
```

---

### Task 13: Update documentation (CLAUDE.md, GEMINI.md)

**Files:**
- Modify: `CLAUDE.md`
- Modify: `GEMINI.md`

- [ ] **Step 1: Update CLAUDE.md — replace task references with just**

In `CLAUDE.md`, make these replacements throughout the file:

1. Replace `task dev` with `just dev` (and all other `task <name>` references)
2. Replace `task check` with `just check`
3. Replace `task build` with `just build`
4. Replace `task lint` with `just lint`
5. Replace `task lint-frontend` with `just lint-frontend`
6. Replace `task typecheck` with `just typecheck`
7. Replace `task test` with `just test`
8. Replace `task test-frontend` with `just test-frontend`
9. Replace `task templ` with `just templ`
10. Replace `task fmt` with `just fmt`
11. Replace `task fmt-frontend` with `just fmt-frontend`
12. Replace `task templ-fmt` with `just templ-fmt`
13. Replace `task dev-stop` with `just dev-stop`
14. Replace `task dev-logs` with `just dev-logs`
15. Replace `task dev-shell` with `just dev-shell`
16. Replace `task build-frontend` with `just build-frontend`
17. Replace `task ssg` with `just ssg`
18. Replace `task clean` with `just clean`
19. Replace `task clean-docker` with `just clean-docker`

Use find-and-replace to ensure all instances are caught. The pattern is simply `task ` -> `just ` in command contexts.

- [ ] **Step 2: Update GEMINI.md — same replacements**

Apply the same `task ` -> `just ` replacements throughout `GEMINI.md`.

- [ ] **Step 3: Verify no stale task references remain**

Run: `grep -rn 'task ' CLAUDE.md GEMINI.md | grep -v 'just\|Task\|multi-step'`

This should return no lines referencing the `task` command runner (filtering out unrelated uses of the word "task").

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md GEMINI.md
git commit -m "docs: update CLAUDE.md and GEMINI.md for task -> just migration"
```

---

## Phase 4: Verification

### Task 14: Run full pipeline check

**Files:** None (verification only)

- [ ] **Step 1: Run just check**

Run: `just check`
Expected: All linters, type-check, and tests pass. This calls `dagger call check --source .` which runs lint, lint-frontend, typecheck, test, and test-frontend in parallel via errgroup.

- [ ] **Step 2: Run just build**

Run: `just build`
Expected: Full build pipeline completes — lint, test, templ generate, frontend build, SSG, Go binary compilation, Alpine container creation, Docker image loaded and tagged as `therefore:local`.

- [ ] **Step 3: Test the built container**

Run:
```bash
docker run --rm -p 8080:8080 therefore:local &
sleep 3
curl -s http://localhost:8080/healthz
```
Expected: `{"status":"ok"}`

Then stop the container:
```bash
docker stop $(docker ps -q --filter ancestor=therefore:local)
```

- [ ] **Step 4: Run just dev**

Run: `just dev`

Verify:
1. Docker compose builds and starts
2. Go server is accessible at http://localhost:8080
3. Vite dev server is accessible at http://localhost:3000
4. Navigate to http://localhost:3000 in a browser — splash page loads
5. Click through to posts, tags, series pages

Then: `just dev-stop`

---

### Task 15: Formal code review

**Files:** None (review only)

- [ ] **Step 1: Review all changes since baseline**

Run: `git log --oneline main..HEAD`

Review each commit to verify:
- Config changes match the style guide canonical configs
- Formatting commits contain only formatting (no logic changes)
- Lint fix commits address real issues
- No regressions introduced

- [ ] **Step 2: Run the code-review agent**

Use the `superpowers:requesting-code-review` skill to get a formal review of all changes.

- [ ] **Step 3: Light templ review**

Review `.templ` files in `internal/views/` against the templ style guide:
- Component naming: uppercase for exported, lowercase for private
- View model patterns
- `data-testid` attributes for testability

Note: This is a review-only pass. Flag issues but only fix clear misalignments that would affect correctness or testability.

- [ ] **Step 4: Fix any issues from review**

Address any actionable findings from the code review and templ review.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: address code review findings"
```

(Skip if no changes needed.)
