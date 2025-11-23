#!/bin/bash
# Comprehensive Git Status Checker
# Identifies all files that are not saved/committed/pushed

cd /workspaces/coinet-platform/services/market-prices

echo "🔍 COMPREHENSIVE GIT STATUS CHECK"
echo "=================================="
echo ""

echo "📝 1. UNTRACKED FILES (new files not in git):"
echo "----------------------------------------------"
git status --short | grep "^??" | awk '{print "  " $2}' || echo "  None"
echo ""

echo "📝 2. MODIFIED FILES (changed but not staged):"
echo "----------------------------------------------"
git status --short | grep "^ M" | awk '{print "  " $2}' || echo "  None"
echo ""

echo "📝 3. STAGED FILES (ready to commit):"
echo "----------------------------------------------"
git status --short | grep "^M " | awk '{print "  " $2}' || echo "  None"
echo ""

echo "📝 4. STAGED NEW FILES (ready to commit):"
echo "----------------------------------------------"
git status --short | grep "^A " | awk '{print "  " $2}' || echo "  None"
echo ""

echo "📝 5. COMMITTED BUT NOT PUSHED:"
echo "----------------------------------------------"
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")
if [ -z "$REMOTE" ]; then
  echo "  No remote tracking branch set"
elif [ "$LOCAL" != "$REMOTE" ]; then
  echo "  Local commits ahead of remote:"
  git log @{u}..@ --oneline | sed 's/^/    /' || echo "    (unable to determine)"
else
  echo "  None (all commits pushed)"
fi
echo ""

echo "📊 SUMMARY:"
echo "----------------------------------------------"
UNTRACKED=$(git status --short | grep -c "^??" || echo "0")
MODIFIED=$(git status --short | grep -c "^ M" || echo "0")
STAGED=$(git status --short | grep -c "^M \|^A " || echo "0")
AHEAD=$(git rev-list --count @{u}..@ 2>/dev/null || echo "0")

echo "  Untracked files: $UNTRACKED"
echo "  Modified (unstaged): $MODIFIED"
echo "  Staged: $STAGED"
echo "  Commits ahead of remote: $AHEAD"
echo ""

if [ "$UNTRACKED" -gt 0 ] || [ "$MODIFIED" -gt 0 ] || [ "$STAGED" -gt 0 ] || [ "$AHEAD" -gt 0 ]; then
  echo "⚠️  ACTION REQUIRED: Files need attention!"
else
  echo "✅ All clean! Everything is committed and pushed."
fi

