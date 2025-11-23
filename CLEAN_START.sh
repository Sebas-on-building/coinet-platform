#!/bin/bash
# 🔥 Clean start script for Codespace

echo "🧹 Killing all processes on ports 3000 and 8080..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "✅ Port 3000 free"
lsof -ti:8080 | xargs kill -9 2>/dev/null || echo "✅ Port 8080 free"
lsof -ti:8081 | xargs kill -9 2>/dev/null || echo "✅ Port 8081 free"
lsof -ti:8082 | xargs kill -9 2>/dev/null || echo "✅ Port 8082 free"
lsof -ti:8083 | xargs kill -9 2>/dev/null || echo "✅ Port 8083 free"
lsof -ti:8084 | xargs kill -9 2>/dev/null || echo "✅ Port 8084 free"

echo "✅ All ports cleaned!"
echo ""
echo "Now run:"
echo "  cd apps/coinet-platform && pnpm start    (Terminal 1)"
echo "  cd apps/client-web && npx vite --host     (Terminal 2)"

