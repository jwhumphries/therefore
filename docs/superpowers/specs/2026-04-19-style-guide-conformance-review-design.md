# Style Guide Conformance Review

**Date:** 2026-04-19
**Status:** Draft
**Goal:** Bring the Therefore blog project into full conformance with the personal style guides at `/Users/john/code/git/style-guides/`, then verify everything works end-to-end before content launch.

## Context

Therefore is a theology/philosophy blog with a Go API backend (Echo, Cobra, templ) serving a React 19 SPA frontend (TypeScript, Vite, TanStack Query, HeroUI). The project was built before the style guides were written, so several conventions and config files are out of alignment. The project is otherwise architecturally sound and functional.

The owner is returning after a hiatus to start writing content (~5 posts for launch). This review ensures the codebase is clean, consistent, and maintainable before that push.

## Approach

Layer-by-layer: backend config/code, then frontend config/code, then CI/tooling, then a final verification pass. Each phase is independently verifiable.

## Decisions

- **Task runner:** Migrate from `Taskfile.yml` (go-task) to `justfile` per CI style guide. The justfile is a thin wrapper over Dagger — pipeline logic in `.dagger/main.go` stays intact.
- **Default exports:** Named exports are the rule. Default exports are allowed for page-level route components (React Router convention). Non-page components convert to named exports.
- **Dev environment:** Keep the current `docker-compose` + `develop.sh` setup. Dagger-based dev environment is a future initiative, not part of this review.
- **tsconfig:** Adopt strict settings from the base config (`target: ES2022`, `allowUnreachableCode: false`, `noImplicitReturns: true`) but keep Vite-specific bundler settings (`module: ESNext`, `moduleResolution: bundler`, `noEmit: true`, `jsx: react-jsx`) since those are required for the build tool.

---

## Phase 1: Go Backend

### 1.1 golangci-lint Config

Replace `.golangci.yml` with the canonical style guide version:

**Current state:**
- `default: none` with 10 manually listed linters
- Missing `goimports` formatter
- Missing `modules-download-mode: readonly`

**Target state:**
- `default: standard` (covers `errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused`)
- Add `revive` as an additional linter
- Add `goimports` formatter
- Add `modules-download-mode: readonly`
- Keep path exclusions (`.dagger`, `vendor`, `tmp`) and test exclusions (`errcheck`, `noctx` on test files)

**Gap analysis on removed explicit linters:**
The current config explicitly enables `misspell`, `unconvert`, `bodyclose`, `noctx`, `errorlint`. These are NOT in the `standard` default set and are NOT covered by `revive`. We need to decide: keep them as additional enables (since they're valuable), or drop to match the canonical config exactly.

**Resolution:** Keep `bodyclose`, `noctx`, `errorlint` as additional enables alongside `revive` — they catch real bugs (unclosed HTTP bodies, missing context, incorrect error wrapping). Drop `misspell` and `unconvert` as they're lower-value and not in the style guide. The canonical config is a base; project-specific additions are fine.

### 1.2 Go Code Audit

Review all Go source files against the Uber Go Style Guide:

- **Error handling:** Verify `fmt.Errorf("%w")` wrapping, sentinel errors with `Err` prefix, handle-once pattern
- **Interface compliance:** Add `var _ Interface = (*Type)(nil)` compile-time checks where appropriate (e.g., `ContentStore`)
- **Naming:** Check for style guide compliance (camelCase unexported, PascalCase exported, package names)
- **init() usage:** Flag and remove any `init()` functions; use explicit initialization
- **Mutable globals:** Flag and refactor any mutable package-level variables
- **Struct initialization:** Ensure field names are always used (no positional)

### 1.3 Verification

- Run `dagger call lint --source .` and fix any new issues from the config change
- Run `dagger call test --source .` to confirm tests still pass

---

## Phase 2: Frontend

### 2.1 Prettier Config

Add `frontend/.prettierrc.json` with canonical settings:

```json
{
  "bracketSpacing": false,
  "singleQuote": true,
  "trailingComma": "all",
  "arrowParens": "avoid"
}
```

### 2.2 ESLint Config

Replace `frontend/eslint.config.js` with the canonical config, extended with React plugins:

**Additions over current config:**
- Prettier integration (`eslint-config-prettier`, `eslint-plugin-prettier`)
- Core rules: `eqeqeq`, `no-var`, `prefer-const`, `eol-last`, `prefer-arrow-callback`, `no-trailing-spaces`, `block-scoped-var`
- TypeScript rules: `array-type` (array-simple), `ban-ts-comment` (warn), `no-floating-promises`
- Test protection: `no-restricted-properties` on `describe.only` / `it.only`

**Kept from current config:**
- `react-hooks` plugin and recommended rules
- `react-refresh` plugin with `only-export-components` rule
- `globals.browser` language options
- `dist` ignore pattern

**New dev dependencies to install:**
- `eslint-config-prettier`
- `eslint-plugin-prettier`
- `prettier`

### 2.3 TypeScript Config

Update `frontend/tsconfig.json`:

- `target`: `ES2020` -> `ES2022`
- `lib`: `["ES2020", "DOM", "DOM.Iterable"]` -> `["ES2022", "DOM", "DOM.Iterable"]`
- Add: `"allowUnreachableCode": false`
- Add: `"noImplicitReturns": true`

Keep all Vite-specific settings unchanged (`module`, `moduleResolution`, `noEmit`, `jsx`, `isolatedModules`, `moduleDetection`, path aliases).

### 2.4 Code Formatting Pass

Run Prettier across the entire frontend to apply the new formatting rules. This will be a single large formatting commit touching most `.ts`/`.tsx` files (single quotes, no bracket spacing, trailing commas, arrow paren removal). Commit separately from logic changes.

### 2.5 Named Exports Migration

**SKIPPED:** Investigation revealed all frontend files already use named exports with barrel re-exports (`pages/index.ts`, `components/hydration/index.ts`, `components/background/index.ts`). No migration needed.

### 2.6 Code Review

Review frontend code against the React and TypeScript style guides:

- One component per file (small stateless exceptions allowed)
- Functional components only (check `ErrorBoundary` — class components are acceptable for error boundaries since React doesn't have a hook equivalent)
- Prop naming: `camelCase`, no `style`/`className` repurposing
- Accessibility: valid ARIA roles, `alt` on images, no `accessKey`
- JSX formatting: double quotes for attributes, single quotes for JS/TS
- TypeScript: `interface` over `type` for object shapes, `T[]` for simple / `Array<T>` for complex, no `any`

### 2.7 Verification

- Run ESLint with the new config and fix all errors
- Run TypeScript type-check and fix any new errors from stricter settings
- Run Vitest to confirm tests still pass

---

## Phase 3: CI/CD

### 3.1 Taskfile to justfile Migration

Create `justfile` replacing `Taskfile.yml` with equivalent recipes:

| Taskfile task | justfile recipe | Command |
|---------------|----------------|---------|
| `dev` | `dev` | `docker compose up --build` |
| `dev-stop` | `dev-stop` | `docker compose down` |
| `dev-logs` | `dev-logs` | `docker compose logs -f` |
| `dev-shell` | `dev-shell` | `docker compose exec dev sh` |
| `build` | `build` | `dagger call release --source . export --path ...` + `docker load/tag` |
| `build-frontend` | `build-frontend` | `dagger call build-frontend --source . export --path ./internal/static/dist` |
| `test` | `test` | `dagger call test --source .` |
| `lint` | `lint` | `dagger call lint --source .` |
| `lint-frontend` | `lint-frontend` | `dagger call lint-frontend --source .` |
| `typecheck` | `typecheck` | `dagger call typecheck --source .` |
| `test-frontend` | `test-frontend` | `dagger call test-frontend --source .` |
| `check` | `check` | `dagger call check --source .` |
| `fmt` | `fmt` | `dagger call fmt --source . export --path .` |
| `fmt-frontend` | `fmt-frontend` | `dagger call fmt-frontend --source . export --path .` |
| `templ` | `templ` | `dagger call templ-generate --source . export --path .` |
| `templ-fmt` | `templ-fmt` | `dagger call templ-fmt --source . export --path .` |
| `ssg` | `ssg` | `dagger call ssg --source . --frontend-dist ./internal/static/dist export --path ./internal/static/dist` (depends on `build-frontend`) |
| `clean` | `clean` | `rm -rf ./tmp ./bin ./frontend/node_modules ./internal/static/dist` |
| `clean-docker` | `clean-docker` | `docker compose down -v` + image removal |

Delete `Taskfile.yml` after migration.

### 3.2 Dagger Pipeline Improvements

**Add cache volumes to frontend functions:**

Currently `Typecheck`, `LintFrontend`, `TestFrontend`, `BuildFrontend`, and `FmtFrontend` all run `bun install` without caching. Add a shared `bun-cache` volume:

```go
WithEnvVariable("BUN_INSTALL_CACHE_DIR", "/bun-cache").
WithMountedCache("/bun-cache", dag.CacheVolume("therefore-bun-cache")).
```

**Add Prettier to FmtFrontend:**

Currently `FmtFrontend` only runs `eslint --fix`. With Prettier now in the project, update to also run `bun run prettier --write .` (or rely on the ESLint Prettier plugin to handle it via `eslint --fix`). Since the new ESLint config integrates Prettier as a plugin with `prettier/prettier: error`, `eslint --fix` will apply Prettier formatting automatically — no separate step needed.

### 3.3 GitHub Actions

The CI workflow is already well-aligned with the style guide (pinned SHAs, `DAGGER_NO_NAG`, Dagger action). No changes needed.

### 3.4 Renovate

Already follows the two-layer config pattern. No changes needed.

### 3.5 Documentation Updates

Update `CLAUDE.md`:
- Replace all `task <name>` references with `just <name>`
- Update the Build & Development Commands section

Update `GEMINI.md`:
- Same `task` -> `just` replacements

---

## Phase 4: Final Review & Verification

### 4.1 Full Pipeline Test

- Run `just check` — all linters, type-check, and tests must pass
- Run `just build` — full build pipeline produces a working container
- Run `just dev` — dev environment starts (Go on :8080, Vite on :3000), navigate the site

### 4.2 Formal Code Review

Run the code-review agent against all changes from Phases 1-3:
- Check for regressions from config changes
- Verify no logic changes slipped into formatting commits
- Confirm style guide conformance across all layers

### 4.3 Templ Review

Light review of `.templ` files against the templ style guide:
- Component naming (uppercase exported, lowercase private)
- View model patterns
- `data-testid` attributes for testability
- Flag issues but only fix clear misalignments

### 4.4 Cleanup

- Confirm `Taskfile.yml` is removed
- Verify `.gitignore` is up to date
- Final clean commit

---

## Out of Scope

- Dagger-based dev environment (future initiative)
- New feature development
- Content creation
- Deployment pipeline changes
- Performance optimization
