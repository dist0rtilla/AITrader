#!/bin/bash
# Pre-commit changelog check script
# Add this to your Git hooks or run manually before commits

echo "🔍 Checking changelog status..."

# Check if CHANGELOG.md has been modified in staged files
CHANGELOG_STAGED=$(git diff --cached --name-only | grep "docs/CHANGELOG.md" || true)

if [ -z "$CHANGELOG_STAGED" ]; then
    echo ""
    echo "⚠️  WARNING: CHANGELOG.md not updated!"
    echo ""
    echo "📝 Please update the changelog before committing:"
    echo "   vim docs/CHANGELOG.md"
    echo ""
    echo "📋 Add entry format:"
    echo "   ## [$(date '+%Y-%m-%d')] - Brief description of changes"
    echo ""
    echo "✅ Then stage the changelog:"
    echo "   git add docs/CHANGELOG.md"
    echo ""
    read -p "Continue without changelog update? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Commit cancelled. Please update changelog first."
        exit 1
    fi
else
    echo "✅ Changelog has been updated!"
fi

echo "🚀 Proceeding with commit..."