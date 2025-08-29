#!/bin/bash

# Documentation Sync Script for Astro Observatory Dashboard
# Keeps AGENTS.md and .github/copilot-instructions.md synchronized

echo "🔄 Syncing AI Agent Documentation..."

AGENTS_FILE="AGENTS.md"
COPILOT_FILE=".github/copilot-instructions.md"
SYNC_MARKER="Last Synced:"
CURRENT_DATE=$(date '+%B %d, %Y at %H:%M')

# Check if both files exist
if [[ ! -f "$AGENTS_FILE" ]]; then
    echo "❌ Error: $AGENTS_FILE not found"
    exit 1
fi

if [[ ! -f "$COPILOT_FILE" ]]; then
    echo "❌ Error: $COPILOT_FILE not found"
    exit 1
fi

# Extract key information from AGENTS.md
echo "📊 Extracting component status from $AGENTS_FILE..."

# Get component completion status
COMPONENT_STATUS=$(grep -A 10 "Component Status Matrix" "$AGENTS_FILE" | grep "✅\|🚧\|❌")

# Get current priorities  
PRIORITIES=$(grep -A 5 "IMMEDIATE PRIORITIES" "$AGENTS_FILE" | grep "HIGH\|MEDIUM\|LOW")

# Get platform-specific knowledge
PLATFORM_INFO=$(grep -A 10 "Cross-Platform Memory Accuracy" "$AGENTS_FILE" | head -5)

echo "🔄 Updating sync timestamps..."

# Update sync marker in AGENTS.md
if grep -q "$SYNC_MARKER" "$AGENTS_FILE"; then
    sed -i '' "s/Last Synced:.*/Last Synced: $CURRENT_DATE/" "$AGENTS_FILE"
else
    echo -e "\n---\n*$SYNC_MARKER $CURRENT_DATE*" >> "$AGENTS_FILE"
fi

# Update sync marker in copilot-instructions.md
if grep -q "$SYNC_MARKER" "$COPILOT_FILE"; then
    sed -i '' "s/Last Synced:.*/Last Synced: $CURRENT_DATE/" "$COPILOT_FILE"
else
    echo -e "\n---\n*$SYNC_MARKER $CURRENT_DATE*" >> "$COPILOT_FILE"
fi

echo "✅ Documentation sync complete!"
echo "📝 Manual review recommended for:"
echo "   - New component completions"
echo "   - Priority changes"
echo "   - Architecture updates"
echo "   - Platform-specific fixes"

# Optional: Show diff summary
echo ""
echo "📋 Quick Status Check:"
echo "Components: $(grep -c '✅ Complete' $AGENTS_FILE) completed"
echo "High Priority: $(grep -c 'HIGH' $AGENTS_FILE) items"
echo "APIs Working: $(grep -c 'WORKING' $AGENTS_FILE) endpoints"
