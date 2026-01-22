# Development Dockerfile
# Multi-stage build for development environment

# =============================================================================
# Stage 1: Go development base
# =============================================================================
FROM golang:1.25-alpine AS gobase

RUN apk add --no-cache git

# Install air for hot-reload
RUN go install github.com/air-verse/air@latest

# Install templ
RUN go install github.com/a-h/templ/cmd/templ@latest

WORKDIR /app

# =============================================================================
# Stage 2: Development environment
# =============================================================================
FROM gobase AS dev

# Install Node.js and Bun for frontend development
RUN apk add --no-cache nodejs npm
RUN npm install -g bun

WORKDIR /app

# Expose ports for Go server and Vite dev server
EXPOSE 8080 3000

# Default command runs the development script
CMD ["sh", "scripts/develop.sh"]
