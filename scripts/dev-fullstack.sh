#!/bin/bash

# Full Stack Development Script
# Runs complete development stack with backend + frontend

set -e

echo "🚀 Starting Full Stack Development Environment..."
echo "This will run both backend and frontend services for complete development"
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Run this script from the trading-ai root directory"
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.dev-fullstack.yml down 2>/dev/null || true

# Build and start the full development stack
echo "🔨 Building development stack..."
docker compose -f docker-compose.dev-fullstack.yml build

echo ""
echo "🚀 Starting full development stack..."
echo "📝 This includes: PostgreSQL, Redis, Backend API, Frontend with hot reload"
echo "🌐 Frontend will be available at: http://localhost:8080"
echo "🔗 Backend API will be available at: http://localhost:8000"
echo "📖 API Documentation: http://localhost:8000/docs"
echo ""

# Start services
docker compose -f docker-compose.dev-fullstack.yml up