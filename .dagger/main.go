// Dagger CI/CD pipeline for Therefore blog
package main

import (
	"context"
	"fmt"
	"strings"

	"dagger/therefore/internal/dagger"
)

type Therefore struct{}

const embedPlaceholder = `<!DOCTYPE html><html><head><title>Build Required</title></head><body><h1>Run bun run build in frontend/ first</h1></body></html>`

// withEmbedPlaceholder ensures the static embed directory has a file so Go builds succeed.
// This avoids requiring a frontend build just to lint or test Go code.
func (m *Therefore) withEmbedPlaceholder(source *dagger.Directory) *dagger.Directory {
	return source.
		WithNewFile("internal/static/dist/index.html", embedPlaceholder).
		WithNewFile("content/posts/.gitkeep", "")
}

func (m *Therefore) gitVersion(ctx context.Context, git *dagger.Directory) (string, error) {
	if git == nil {
		return "dev", nil
	}
	out, err := dag.Container().
		From("alpine/git:latest").
		WithMountedDirectory("/src/.git", git).
		WithWorkdir("/src").
		WithExec([]string{"git", "describe", "--tags", "--always"}).
		Stdout(ctx)
	if err != nil {
		return "dev", nil
	}
	return strings.TrimSpace(out), nil
}

// Version extracts the version from git tags
func (m *Therefore) Version(
	ctx context.Context,
	// +optional
	// +defaultPath="/.git"
	git *dagger.Directory,
) (string, error) {
	return m.gitVersion(ctx, git)
}

// templContainer returns a container with templ installed
func (m *Therefore) templContainer() *dagger.Container {
	return dag.Container().
		From("golang:1.25-alpine").
		WithExec([]string{"go", "install", "github.com/a-h/templ/cmd/templ@latest"})
}

// TemplGenerate runs templ generate on the source
func (m *Therefore) TemplGenerate(source *dagger.Directory) *dagger.Directory {
	return m.templContainer().
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithExec([]string{"templ", "generate"}).
		Directory("/app")
}

// TemplFmt formats templ files and returns the modified directory
func (m *Therefore) TemplFmt(source *dagger.Directory) *dagger.Directory {
	return m.templContainer().
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithExec([]string{"templ", "fmt", "."}).
		Directory("/app")
}

// Lint runs golangci-lint on the source
func (m *Therefore) Lint(ctx context.Context, source *dagger.Directory) (string, error) {
	return m.lintSource(ctx, source)
}

func (m *Therefore) lintSource(ctx context.Context, source *dagger.Directory) (string, error) {
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
	return m.testSource(ctx, source)
}

func (m *Therefore) testSource(ctx context.Context, source *dagger.Directory) (string, error) {
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

// Fmt formats Go code and returns the modified directory
func (m *Therefore) Fmt(source *dagger.Directory) *dagger.Directory {
	return dag.Container().
		From("golang:1.25-alpine").
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithExec([]string{"go", "fmt", "./..."}).
		Directory("/app")
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

// TestFrontend runs Vitest frontend tests
func (m *Therefore) TestFrontend(ctx context.Context, source *dagger.Directory) (string, error) {
	return dag.Container().
		From("ghcr.io/jwhumphries/frontend:latest").
		WithDirectory("/app", source).
		WithWorkdir("/app/frontend").
		WithExec([]string{"bun", "install"}).
		WithExec([]string{"bun", "run", "test"}).
		Stdout(ctx)
}

// FmtFrontend formats frontend code and returns the modified directory
func (m *Therefore) FmtFrontend(source *dagger.Directory) *dagger.Directory {
	return dag.Container().
		From("ghcr.io/jwhumphries/frontend:latest").
		WithDirectory("/app", source).
		WithWorkdir("/app/frontend").
		WithExec([]string{"bun", "install"}).
		WithExec([]string{"bun", "run", "lint", "--fix"}).
		Directory("/app")
}

// BuildFrontend compiles the React/TypeScript frontend with Vite
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
	// +optional
	// +defaultPath="/.git"
	git *dagger.Directory,
	// +optional
	version string,
) (*dagger.Container, error) {
	// Get version from git if not provided
	if version == "" {
		v, err := m.gitVersion(ctx, git)
		if err != nil {
			return nil, fmt.Errorf("version detection failed: %w", err)
		}
		version = v
	}

	// Run lint and test
	if _, err := m.lintSource(ctx, source); err != nil {
		return nil, fmt.Errorf("lint failed: %w", err)
	}

	if _, err := m.testSource(ctx, source); err != nil {
		return nil, fmt.Errorf("test failed: %w", err)
	}

	// Generate templ files
	templSource := m.TemplGenerate(source)

	// Build frontend assets
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
	// +optional
	// +defaultPath="/.git"
	git *dagger.Directory,
	// +optional
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
func (m *Therefore) Check(ctx context.Context, source *dagger.Directory) error {
	// Run Go lint
	if _, err := m.Lint(ctx, source); err != nil {
		return fmt.Errorf("lint failed: %w", err)
	}

	// Run frontend lint
	if _, err := m.LintFrontend(ctx, source); err != nil {
		return fmt.Errorf("frontend lint failed: %w", err)
	}

	// Run TypeScript typecheck
	if _, err := m.Typecheck(ctx, source); err != nil {
		return fmt.Errorf("typecheck failed: %w", err)
	}

	// Run Go tests
	if _, err := m.Test(ctx, source); err != nil {
		return fmt.Errorf("test failed: %w", err)
	}

	// Run frontend tests
	if _, err := m.TestFrontend(ctx, source); err != nil {
		return fmt.Errorf("frontend test failed: %w", err)
	}

	return nil
}
