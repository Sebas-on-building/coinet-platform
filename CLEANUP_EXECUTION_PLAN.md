# Cleanup Execution Plan

**Created:** 2025-01-02  
**Status:** Ready for Execution  
**Estimated Time:** 2-3 hours

---

## Execution Phases

### Phase 1: Critical Security Fixes (15 minutes) 🔴
**Priority:** IMMEDIATE

1. ✅ Fix hardcoded demo API keys in AuthenticationMiddleware.ts
2. ✅ Add environment checks to prevent demo code in production
3. ✅ Verify no other hardcoded credentials exist

**Script:** `scripts/cleanup/phase1-security-fix.sh`

---

### Phase 2: Remove Duplicate Files (30 minutes) 🟡
**Priority:** HIGH

1. ✅ Remove numbered duplicate files (deploy 3/4/5, Dockerfile 3/4/5, etc.)
2. ✅ Remove duplicate LICENSE files
3. ✅ Remove duplicate image files
4. ✅ Remove duplicate test output files (junit.xml)

**Script:** `scripts/cleanup/phase2-remove-duplicates.sh`  
**Backup:** All files backed up to `backups/cleanup-YYYYMMDD/` before deletion

---

### Phase 3: Reorganize Demo & Example Files (20 minutes) 🟡
**Priority:** HIGH

1. ✅ Create `examples/` directory structure
2. ✅ Move demo files to `examples/demos/`
3. ✅ Move example plugins to `examples/plugins/`
4. ✅ Add clear warnings to demo files

**Script:** `scripts/cleanup/phase3-reorganize-demos.sh`

---

### Phase 4: Move Test Files (15 minutes) 🟠
**Priority:** MEDIUM

1. ✅ Move Python test files from root to `tests/python/`
2. ✅ Move test config files to `tests/`
3. ✅ Update any import paths if needed

**Script:** `scripts/cleanup/phase4-move-tests.sh`

---

### Phase 5: Archive Documentation (30 minutes) 🟠
**Priority:** MEDIUM

1. ✅ Create `docs/archive/` structure
2. ✅ Archive status/completion files
3. ✅ Archive temporary fix files
4. ✅ Create consolidated status document

**Script:** `scripts/cleanup/phase5-archive-docs.sh`

---

### Phase 6: Update Configuration (10 minutes) 🔵
**Priority:** LOW

1. ✅ Update `.gitignore` to prevent future issues
2. ✅ Add cleanup log patterns
3. ✅ Add test output patterns

**Script:** `scripts/cleanup/phase6-update-gitignore.sh`

---

## Execution Order

```bash
# Run phases sequentially
./scripts/cleanup/phase1-security-fix.sh
./scripts/cleanup/phase2-remove-duplicates.sh
./scripts/cleanup/phase3-reorganize-demos.sh
./scripts/cleanup/phase4-move-tests.sh
./scripts/cleanup/phase5-archive-docs.sh
./scripts/cleanup/phase6-update-gitignore.sh

# Or run all at once
./scripts/cleanup/run-all-phases.sh
```

---

## Safety Measures

1. **Backup Before Deletion:** All files backed up to `backups/cleanup-YYYYMMDD/`
2. **Dry Run Mode:** Scripts support `--dry-run` flag to preview changes
3. **Verification:** Each phase includes verification steps
4. **Rollback:** Backup location documented for easy rollback

---

## Verification Checklist

After each phase, verify:

- [ ] No broken imports/references
- [ ] Git status shows expected changes
- [ ] No critical files accidentally deleted
- [ ] Documentation updated if needed
- [ ] Tests still pass (if applicable)

---

## Rollback Procedure

If something goes wrong:

```bash
# Restore from backup
./scripts/cleanup/rollback.sh --backup-dir backups/cleanup-YYYYMMDD/

# Or restore specific files
cp backups/cleanup-YYYYMMDD/path/to/file ./path/to/file
```
