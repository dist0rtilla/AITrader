#!/bin/bash
# scripts/check_links.sh
# Basic validation of key documentation links

set -e

echo "🔗 Basic documentation link validation..."
echo

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

HAS_ERRORS=false

# Check key files that should exist
KEY_FILES=(
    "README.md"
    "docs/README.md"
    "docs/PROJECT_STATUS.md"
    "docs/CHANGELOG.md"
    "docs/development/DEVELOPMENT_WORKFLOW.md"
    "docs/development/PORT_MAPPING.md"
    "docs/frontend/DESIGN_SYSTEM.md"
    "frontend/README.md"
    "backend/README.md"
)

echo "📁 Checking key documentation files..."
echo

for file in "${KEY_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✅ Found:${NC} $file"
    else
        echo -e "${RED}❌ Missing:${NC} $file"
        HAS_ERRORS=true
    fi
done

echo
if [ "$HAS_ERRORS" = true ]; then
    echo -e "${RED}❌ Documentation validation failed!${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All key documentation files present!${NC}"
    echo
    echo "Note: This is a basic check. For comprehensive link validation,"
    echo "consider using a dedicated markdown link checker tool."
fi