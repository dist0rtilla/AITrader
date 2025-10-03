#!/bin/bash

# Docker Development Script with Hot Reload
# This uses Docker but with volume mounts for instant file changes

set -e

echo "🐳 Starting Docker Development with Hot Reload..."
echo "This will run the frontend in Docker with volume mounts for fast development"
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Run this script from the trading-ai root directory"
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.frontend-only.yml down 2>/dev/null || true

# Build and start the development container
echo "🔨 Building development container (one-time build)..."
docker compose -f docker-compose.frontend-only.yml build

echo ""
echo "🚀 Starting development container with hot reload..."
echo "📝 File changes will be reflected instantly"
echo "🌐 Frontend will be available at: http://localhost:8080"
echo "⚡ Much faster than production builds!"
echo ""
echo "Press Ctrl+C to stop the development server"
echo ""

# Start the container
docker compose -f docker-compose.frontend-only.yml up