# Resolve Merge Conflict in package.json

## Quick Fix Commands (Run in Codespace)

```bash
# 1. Check the conflict
cat package.json | head -20

# 2. Resolve by accepting our version (the one with example:quicknode)
git checkout --theirs package.json

# 3. Verify it's correct
cat package.json | grep -A 10 '"scripts"'

# 4. Mark as resolved and commit
git add package.json
git commit -m "fix: Resolve package.json merge conflict"

# 5. Verify npm works now
npm run
```

## Alternative: Manual Fix

If the above doesn't work, manually edit package.json and remove all conflict markers (<<<<<<< HEAD, =======, >>>>>>>), keeping the version with `example:quicknode` script.

