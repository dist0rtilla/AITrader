#!/bin/bash
# scripts/validate_ports.sh
# Validates that all required ports are available for development

set -e

echo "🔍 Checking port availability for AITrader development..."
echo

# Define required ports with descriptions
declare -A PORTS=(
    [5173]="Local Vite dev server"
    [8080]="Docker frontend development"
    [80]="Full stack / Production frontend"
    [8000]="Backend API"
    [8001]="ONNX Runner"
    [8002]="Sentiment Engine"
    [8005]="Strategy Engine"
    [8006]="Execution Engine"
    [8007]="TensorRT Runner"
    [5432]="PostgreSQL"
    [6379]="Redis"
    [9000]="Mock MCP"
    [5000]="FinBERT Server"
)

HAS_CONFLICTS=false

for port in "${!PORTS[@]}"; do
    description="${PORTS[$port]}"

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Port $port ($description) is in use:"
        lsof -Pi :$port -sTCP:LISTEN
        echo
        HAS_CONFLICTS=true
    else
        echo "✅ Port $port ($description) is available"
    fi
done

echo
if [ "$HAS_CONFLICTS" = true ]; then
    echo "⚠️  Port conflicts detected!"
    echo
    echo "To resolve conflicts:"
    echo "1. Stop conflicting containers:"
    echo "   docker compose -f docker-compose.frontend-only.yml down"
    echo "   docker compose -f docker-compose.production.yml down"
    echo
    echo "2. Kill processes using ports:"
    echo "   sudo lsof -ti:PORT | xargs kill -9"
    echo
    echo "3. Check PORT_MAPPING.md for port assignments"
    exit 1
else
    echo "🎉 All ports are available!"
    echo
    echo "Ready to start development:"
    echo "  ./scripts/quick-start.sh     # Port 5173 (fastest)"
    echo "  ./scripts/dev-frontend.sh    # Port 8080 (Docker)"
    echo "  ./scripts/dev-fullstack.sh   # Port 80 (full stack)"
fi