// Dagger CI/CD pipeline for Therefore blog
package main

import (
	"context"
	"fmt"
	"strings"

	"dagger/therefore/internal/dagger"
)

type Therefore struct{}

const embedPlaceholder = "<!-- placeholder -->"

// Version extracts the version from git tags
func (m *Therefore) Version(ctx context.Context, git *dagger.Directory) (string, error) {
	return dag.Container().
		From("alpine/git:latest").
		WithMountedDirectory("/git", git).
		WithWorkdir("/git").
		WithExec([]string{"git", "describe", "--tags", "--always", "--dirty"}).
		Stdout(ctx)
}

// TemplGenerate runs templ generate on the source
func (m *Therefore) TemplGenerate(source *dagger.Directory) *dagger.Directory {
	return dag.Container().
		From("ghcr.io/a-h/templ:latest").
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithExec([]string{"templ", "generate"}).
		Directory("/app")
}

// TemplFmt formats templ files
func (m *Therefore) TemplFmt(ctx context.Context, source *dagger.Directory) (string, error) {
	return dag.Container().
		From("ghcr.io/a-h/templ:latest").
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithExec([]string{"templ", "fmt", "."}).
		Stdout(ctx)
}

// Lint runs golangci-lint on the source
func (m *Therefore) Lint(ctx context.Context, source *dagger.Directory) (string, error) {
	templSource := m.TemplGenerate(source)
	return dag.Container().
		From("golangci/golangci-lint:v2.8.0-alpine").
		WithEnvVariable("GOCACHE", "/go-build-cache").
		WithEnvVariable("GOMODCACHE", "/go-mod-cache").
		WithEnvVariable("GOLANGCI_LINT_CACHE", "/golangci-lint-cache").
		WithMountedCache("/go-build-cache", dag.CacheVolume("go-build-cache")).
		WithMountedCache("/go-mod-cache", dag.CacheVolume("go-mod-cache")).
		WithMountedCache("/golangci-lint-cache", dag.CacheVolume("golangci-lint-cache")).
		WithDirectory("/app", m.withEmbedPlaceholder(templSource)).
		WithWorkdir("/app").
		WithExec([]string{"golangci-lint", "run", "--timeout", "5m"}).
		Stdout(ctx)
}

// Test runs Go tests
func (m *Therefore) Test(ctx context.Context, source *dagger.Directory) (string, error) {
	templSource := m.TemplGenerate(source)
	return dag.Container().
		From("golang:1.25-alpine").
		WithEnvVariable("GOCACHE", "/go-build-cache").
		WithEnvVariable("GOMODCACHE", "/go-mod-cache").
		WithMountedCache("/go-build-cache", dag.CacheVolume("go-build-cache")).
		WithMountedCache("/go-mod-cache", dag.CacheVolume("go-mod-cache")).
		WithDirectory("/app", m.withEmbedPlaceholder(templSource)).
		WithWorkdir("/app").
		WithExec([]string{"go", "test", "-v", "./..."}).
		Stdout(ctx)
}

// Fmt runs go fmt on the source
func (m *Therefore) Fmt(ctx context.Context, source *dagger.Directory) (string, error) {
	return dag.Container().
		From("golang:1.25-alpine").
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithExec([]string{"go", "fmt", "./..."}).
		Stdout(ctx)
}

// Typecheck runs TypeScript type checking
func (m *Therefore) Typecheck(ctx context.Context, source *dagger.Directory) (string, error) {
	return dag.Container().
		From("ghcr.io/jwhumphries/frontend:latest").
		WithDirectory("/app", source).
		WithWorkdir("/app/frontend").
		WithExec([]string{"bun", "install"}).
		WithExec([]string{"bun", "run", "typecheck"}).
		Stdout(ctx)
}

// LintFrontend runs ESLint on the frontend
func (m *Therefore) LintFrontend(ctx context.Context, source *dagger.Directory) (string, error) {
	return dag.Container().
		From("ghcr.io/jwhumphries/frontend:latest").
		WithDirectory("/app", source).
		WithWorkdir("/app/frontend").
		WithExec([]string{"bun", "install"}).
		WithExec([]string{"bun", "run", "lint"}).
		Stdout(ctx)
}

// FmtFrontend runs ESLint with --fix on the frontend
func (m *Therefore) FmtFrontend(ctx context.Context, source *dagger.Directory) (string, error) {
	return dag.Container().
		From("ghcr.io/jwhumphries/frontend:latest").
		WithDirectory("/app", source).
		WithWorkdir("/app/frontend").
		WithExec([]string{"bun", "install"}).
		WithExec([]string{"bun", "run", "lint", "--fix"}).
		Stdout(ctx)
}

// BuildFrontend builds the frontend assets
func (m *Therefore) BuildFrontend(source *dagger.Directory) *dagger.Directory {
	return dag.Container().
		From("ghcr.io/jwhumphries/frontend:latest").
		WithDirectory("/app", source).
		WithWorkdir("/app/frontend").
		WithExec([]string{"bun", "install"}).
		WithExec([]string{"bun", "run", "build"}).
		Directory("/app/internal/static/dist")
}

// BuildBinary builds the Go binary
func (m *Therefore) BuildBinary(source *dagger.Directory, version string) *dagger.Container {
	return dag.Container().
		From("golang:1.25-alpine").
		WithEnvVariable("GOCACHE", "/go-build-cache").
		WithEnvVariable("GOMODCACHE", "/go-mod-cache").
		WithMountedCache("/go-build-cache", dag.CacheVolume("go-build-cache")).
		WithMountedCache("/go-mod-cache", dag.CacheVolume("go-mod-cache")).
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithExec([]string{
			"go", "build",
			"-ldflags", "-X therefore/version.Tag=" + strings.TrimSpace(version),
			"-o", "/therefore",
			"./cmd/therefore/",
		})
}

// Build runs the full build pipeline
func (m *Therefore) Build(
	ctx context.Context,
	source *dagger.Directory,
	git *dagger.Directory,
	// +optional
	// +default="dev"
	version string,
) (*dagger.Container, error) {
	// Get version from git if not provided
	if version == "dev" {
		var err error
		version, err = m.Version(ctx, git)
		if err != nil {
			version = "dev"
		}
	}

	// Generate templ files
	templSource := m.TemplGenerate(source)

	// Build frontend
	frontendDist := m.BuildFrontend(templSource)

	// Merge frontend dist into source
	fullSource := templSource.WithDirectory("internal/static/dist", frontendDist)

	// Build binary
	return m.BuildBinary(fullSource, version), nil
}

// Release creates a minimal release container
func (m *Therefore) Release(
	ctx context.Context,
	source *dagger.Directory,
	git *dagger.Directory,
	// +optional
	// +default="dev"
	version string,
) (*dagger.Container, error) {
	binaryContainer, err := m.Build(ctx, source, git, version)
	if err != nil {
		return nil, err
	}

	binary := binaryContainer.File("/therefore")

	return dag.Container().
		From("alpine:3.23").
		WithExec([]string{"apk", "add", "--no-cache", "tzdata", "ca-certificates"}).
		WithFile("/usr/local/bin/therefore", binary).
		WithExec([]string{"sh", "-c", "echo 'nonroot:x:10001:10001:NonRoot User:/:/sbin/nologin' >> /etc/passwd"}).
		WithEnvVariable("TZ", "America/New_York").
		WithEnvVariable("THEREFORE_PORT", ":8080").
		WithExposedPort(8080).
		WithUser("10001").
		WithEntrypoint([]string{"/usr/local/bin/therefore"}), nil
}

// Check runs all checks (lint, test, typecheck, lint-frontend)
func (m *Therefore) Check(ctx context.Context, source *dagger.Directory) (string, error) {
	var results []string

	// Run Go lint
	lintResult, err := m.Lint(ctx, source)
	if err != nil {
		return "", fmt.Errorf("lint failed: %w", err)
	}
	results = append(results, "=== Go Lint ===\n"+lintResult)

	// Run Go tests
	testResult, err := m.Test(ctx, source)
	if err != nil {
		return "", fmt.Errorf("test failed: %w", err)
	}
	results = append(results, "=== Go Test ===\n"+testResult)

	// Run TypeScript typecheck
	typecheckResult, err := m.Typecheck(ctx, source)
	if err != nil {
		return "", fmt.Errorf("typecheck failed: %w", err)
	}
	results = append(results, "=== TypeScript Typecheck ===\n"+typecheckResult)

	// Run frontend lint
	frontendLintResult, err := m.LintFrontend(ctx, source)
	if err != nil {
		return "", fmt.Errorf("frontend lint failed: %w", err)
	}
	results = append(results, "=== Frontend Lint ===\n"+frontendLintResult)

	return strings.Join(results, "\n\n"), nil
}

// withEmbedPlaceholder adds placeholder files for go:embed directives
func (m *Therefore) withEmbedPlaceholder(source *dagger.Directory) *dagger.Directory {
	return source.
		WithNewFile("internal/static/dist/index.html", embedPlaceholder).
		WithNewFile("content/posts/.gitkeep", "")
}
