#!/bin/bash
# One-command script to add all market-prices enhancements
# Run this in Codespace: /workspaces/coinet-platform/services/market-prices

cd /workspaces/coinet-platform/services/market-prices

# Add all new and modified files
git add src/services/unified-market-data.ts \
        src/services/market-analytics.ts \
        src/services/market-data-streamer.ts \
        src/utils/enhanced-error-handler.ts \
        src/providers/defillama-rest.ts \
        src/tests/defillama.test.ts \
        IMPLEMENTATION_COMPLETE.md

# Show status
echo "=== Files staged ==="
git status --short

echo ""
echo "✅ All files added!"
echo ""
echo "Next steps:"
echo "  1. Review: git diff --cached"
echo "  2. Commit: git commit -m 'feat: Add comprehensive market data enhancements (Phase 1-3 complete)'"
echo "  3. Push: git push origin main"

