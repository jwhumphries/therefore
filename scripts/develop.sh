#!/bin/sh
set -e

echo "Installing frontend dependencies..."
cd /app/frontend
bun install

echo "Generating templ files..."
cd /app
templ generate

echo "Starting development servers..."
# Start Vite dev server in background
cd /app/frontend
bun run dev &

# Start Go server with air hot-reload
cd /app
air
