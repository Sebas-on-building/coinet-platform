# Quick Start - Cleanup Process

## 🚀 Fastest Way to Run Cleanup

```bash
# Run all phases at once
./scripts/cleanup/run-all-phases.sh
```

## 📋 Step-by-Step Execution

If you prefer to run phases individually:

```bash
# 1. Fix critical security issue (REQUIRED)
./scripts/cleanup/phase1-security-fix.sh

# 2. Remove duplicate files
./scripts/cleanup/phase2-remove-duplicates.sh

# 3. Reorganize demo files
./scripts/cleanup/phase3-reorganize-demos.sh

# 4. Move test files
./scripts/cleanup/phase4-move-tests.sh

# 5. Archive documentation
./scripts/cleanup/phase5-archive-docs.sh

# 6. Update .gitignore
./scripts/cleanup/phase6-update-gitignore.sh
```

## ⚠️ Important Notes

1. **Security Fix**: Phase 1 will detect hardcoded demo API keys. You'll need to manually review and fix the `AuthenticationMiddleware.ts` file.

2. **Backups**: All files are automatically backed up to `backups/cleanup-YYYYMMDD/` before modification.

3. **Verification**: After each phase, check:
   - `git status` to see changes
   - No broken imports
   - Application still works

## 🔄 Rollback

If something goes wrong:

```bash
# Restore from backup
cp backups/cleanup-YYYYMMDD/path/to/file ./path/to/file
```

## ✅ After Cleanup

1. Review changes: `git status`
2. Test application
3. Commit changes: `git add . && git commit -m 'chore: cleanup demo files and duplicates'`
