# 📝 How to Handle Open Changes (Offene Änderungen)

## Check What Changed

```bash
# See all changes
git status

# See modified files
git diff --name-only

# See untracked files
git status --porcelain | grep "^??"
```

## Common Scenarios

### 1. ✅ Safe to Commit

These files are **SAFE** to commit:
- Source code changes (`src/**/*.ts`)
- Documentation (`*.md`)
- Configuration (`*.json`, `*.yaml`, `tsconfig.json`)
- Scripts (`*.sh`)
- Docker files (`Dockerfile`, `.dockerignore`)

### 2. ❌ Do NOT Commit

These files should **NOT** be committed:
- `.env` - Contains secrets
- `node_modules/` - Dependencies
- `dist/` - Build output
- `.turbo/` - Build cache
- `*.log` - Log files

### 3. 🔍 Review Before Committing

```bash
# See what changed in a file
git diff path/to/file

# See staged changes
git diff --staged
```

## Quick Commands

### Commit All Safe Changes
```bash
# Add all safe files (excludes .env, node_modules, dist, etc.)
git add src/ *.md *.sh *.json *.yaml Dockerfile k8s/ docs/ examples/

# Review what you're committing
git status

# Commit
git commit -m "feat: Your commit message"

# Push
git push origin HEAD
```

### Discard Changes (if not needed)
```bash
# Discard changes to a specific file
git restore path/to/file

# Discard all changes (be careful!)
git restore .
```

### Stash Changes (save for later)
```bash
# Save changes temporarily
git stash

# List stashes
git stash list

# Restore stashed changes
git stash pop
```

## Current Status

If you see changes, decide:

1. **If changes are good** → Commit them
2. **If changes are temporary/test** → Discard or stash
3. **If unsure** → Review with `git diff` first

## Example Workflow

```bash
# 1. Check what changed
git status

# 2. Review changes
git diff

# 3. Add safe files
git add src/ *.md

# 4. Commit
git commit -m "fix: Update service configuration"

# 5. Push
git push origin HEAD
```

