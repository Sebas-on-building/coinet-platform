#!/bin/bash
# Phase 3: Reorganize Demo & Example Files
# Moves demo files to examples/ directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups/cleanup-$(date +%Y%m%d)"
EXAMPLES_DIR="$PROJECT_ROOT/examples"

echo "🟡 Phase 3: Reorganize Demo & Example Files"
echo "==========================================="
echo ""

# Create examples directory structure
mkdir -p "$EXAMPLES_DIR/demos"
mkdir -p "$EXAMPLES_DIR/plugins"
mkdir -p "$BACKUP_DIR"

# Function to move file with backup
move_with_backup() {
    local source="$1"
    local dest="$2"
    local backup_path="$BACKUP_DIR/$(echo "$source" | sed 's|^/||' | sed 's|/|_|g')"
    
    if [ -f "$PROJECT_ROOT/$source" ]; then
        echo "  📦 Backing up: $source"
        mkdir -p "$(dirname "$backup_path")"
        cp "$PROJECT_ROOT/$source" "$backup_path"
        
        echo "  📁 Moving: $source -> $dest"
        mkdir -p "$(dirname "$PROJECT_ROOT/$dest")"
        mv "$PROJECT_ROOT/$source" "$PROJECT_ROOT/$dest"
        return 0
    else
        return 1
    fi
}

# Demo files to move
DEMO_FILES=(
    "services/news-aggregator/demo.ts:examples/demos/news-aggregator-demo.ts"
    "services/generate-ai-insights/demo.ts:examples/demos/ai-insights-demo.ts"
    "services/defi-protocol-metrics/demo.ts:examples/demos/defi-metrics-demo.ts"
    "ai-services/ml-service/scripts/demo_divine_causal_inference.py:examples/demos/causal-inference-demo.py"
    "ai-services/ml-service/src/coinet_ai_ml/knowledge_graph/demo.py:examples/demos/knowledge-graph-demo.py"
    "ai-services/ml-service/src/coinet_ai_ml/fusion/demo.py:examples/demos/fusion-demo.py"
)

# Example files to move
EXAMPLE_FILES=(
    "services/auth/api/plugins/examplePlugin.ts:examples/plugins/example-plugin.ts"
    "services/signal-evaluation-engine/src/alerts/example.ts:examples/plugins/alerts-example.ts"
    "services/signal-evaluation-engine/src/feeds/example.ts:examples/plugins/feeds-example.ts"
    "services/signal-evaluation-engine/src/correlation/example.ts:examples/plugins/correlation-example.ts"
    "services/signal-evaluation-engine/src/confidence/example.ts:examples/plugins/confidence-example.ts"
    "services/ai-data-feeder/example.ts:examples/plugins/ai-data-feeder-example.ts"
)

echo "📋 Moving demo files..."
moved_demos=0
for entry in "${DEMO_FILES[@]}"; do
    IFS=':' read -r source dest <<< "$entry"
    if move_with_backup "$source" "$dest"; then
        ((moved_demos++))
    fi
done

echo ""
echo "📋 Moving example files..."
moved_examples=0
for entry in "${EXAMPLE_FILES[@]}"; do
    IFS=':' read -r source dest <<< "$entry"
    if move_with_backup "$source" "$dest"; then
        ((moved_examples++))
    fi
done

# Create README in examples directory
cat > "$EXAMPLES_DIR/README.md" << 'EOF'
# Examples Directory

This directory contains demo and example code for reference purposes.

## ⚠️ WARNING

**These files are for demonstration and reference only.**

- **DO NOT** use these files in production
- **DO NOT** import these files in production code
- These files may contain demo API keys and mock data
- Use these files only for learning and development

## Structure

- `demos/` - Complete demo scripts showing how to use various services
- `plugins/` - Example plugin implementations

## Usage

These examples are provided as reference implementations. Always review and adapt code before using in production.
EOF

echo ""
echo "📊 Summary:"
echo "   ✅ Moved demo files: $moved_demos"
echo "   ✅ Moved example files: $moved_examples"
echo "   💾 Backup location: $BACKUP_DIR"
echo ""
echo "✅ Phase 3 complete!"
