#!/bin/bash

# Quick Frontend Development Script
# This runs the frontend locally with hot reload - fastest development cycle

set -e

echo "🚀 Starting Quick Frontend Development..."
echo "This will run the frontend locally with hot reload for fastest development cycles"
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Run this script from the trading-ai root directory"
    exit 1
fi

# Navigate to frontend directory
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🔥 Starting development server..."
echo "📝 File changes will be reflected instantly (hot reload)"
echo "🌐 Frontend will be available at: http://localhost:5173"
echo "⚡ This is the FASTEST development cycle - no Docker rebuilds!"
echo ""
echo "Press Ctrl+C to stop the development server"
echo ""

# Start the development server
npm run dev