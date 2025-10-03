#!/bin/bash

# Optimized Production Build Script
# Uses Docker BuildKit with cache mounts for faster builds

set -e

echo "⚡ Starting Optimized Production Build..."
echo "Using Docker BuildKit with cache mounts for faster builds"
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Run this script from the trading-ai root directory"
    exit 1
fi

# Enable Docker BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Stop existing container
echo "🛑 Stopping existing container..."
docker stop trading-ai-frontend-standalone 2>/dev/null || true
docker rm trading-ai-frontend-standalone 2>/dev/null || true

# Build with optimizations
echo "🔨 Building optimized container..."
echo "✅ Using layer caching"
echo "✅ Using npm cache mounts"
echo "✅ Using Vite cache mounts"
echo "✅ Excluding unnecessary files"
echo ""

time docker build \
    --progress=plain \
    -f frontend/Dockerfile.standalone \
    -t trading-ai-frontend-standalone \
    .

echo ""
echo "🚀 Starting optimized container..."
docker run -d \
    --name trading-ai-frontend-standalone \
    -p 8080:80 \
    trading-ai-frontend-standalone

echo ""
echo "✅ Build complete!"
echo "🌐 Frontend available at: http://localhost:8080"
echo "📊 Check build time above - should be much faster on subsequent builds!"