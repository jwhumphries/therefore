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
