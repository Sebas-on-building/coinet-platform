#!/bin/bash
# Commit all CryptoPanic integration files

cd /workspaces/coinet-platform/services/market-prices

# Add all CryptoPanic files
git add src/providers/cryptopanic-rest.ts
git add src/services/cryptopanic-news.service.ts
git add src/services/cryptopanic-sentiment.service.ts
git add src/types/cryptopanic.types.ts
git add src/examples/cryptopanic-integration.example.ts
git add src/tests/cryptopanic.test.ts
git add test-cryptopanic.ts

# Commit
git commit -m "feat: Add CryptoPanic API integration with sentiment analysis

- Add CryptoPanic REST API client with plan support (developer/growth/enterprise)
- Add news service with normalization and caching
- Add sentiment analyzer with panic detection
- Add comprehensive test suite
- Add examples and documentation
- Fix endpoint path mapping (developer vs development)"

echo "✅ Files committed!"
echo ""
echo "To push: git push origin main"

