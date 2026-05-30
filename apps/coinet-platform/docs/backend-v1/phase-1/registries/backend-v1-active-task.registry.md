# Backend v1 Active Task Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Plan 1.6 TAD-A admissions)
**Source Plan:** `phase-1/backend-v1-task-admissibility-framework.md` (Plan 1.6)
**Last Updated:** 2026-05-19

> Lists tasks admitted into active backend execution (TAD-A). This registry must never become a vague wish list. Every entry must have a BTAR (or, in rare cases, a UDF record).

---

## Active Tasks

| Task ID  | Title                                       | TAD   | Target Phase | Target Surface                  | Owner                  | Status      | Source BTAR                                                                       | Completion Proof |
| -------- | ------------------------------------------- | ----- | ------------ | ------------------------------- | ---------------------- | ----------- | --------------------------------------------------------------------------------- | ---------------- |
| BTAR-001    | Fix lying build/typecheck behavior          | TAD-A | Phase 1      | SCOPE_CONTROL / ALL_V1_SURFACES | Backend program owner  | Done (TRUTHFUL_FAILURE_REVEALED) | `records/backend-task-admission-records/BTAR-001-fix-lying-build-typecheck.md`     | Lying-build pattern removed (`apps/coinet-platform/package.json`); `pnpm build` and `pnpm typecheck` now exit non-zero on TypeScript error; 24 previously-hidden errors revealed (16 in src/scripts, 6 in src/l14, 2 in src/integration); ZERO errors in V1_CORE production paths; B1 (Build Truth) PASS per Plan 1.12 §7.1. See BTAR §18 completion proof. |
| BTAR-CI-001 | Add CI / check truth gate                   | TAD-A | Phase 1      | SCOPE_CONTROL / ALL_V1_SURFACES | Backend program owner  | Done (CI_TRUTHFUL_FAILURE_REVEALED) | `records/backend-task-admission-records/BTAR-CI-001-add-ci-check-truth-gate.md`     | Option C blocking gate implemented: `pnpm check:backend` added to root package.json; `\|\| echo "...continuing..."` masking removed from backend typecheck/build steps in ci.yml + pull-request.yml; `pnpm check:backend` exits 1 on the 24 known errors (matches BTAR-001 catalog); B2 (CI Truth) PASS per Plan 1.12 §7.2; migration/test step masking documented as out-of-scope follow-up. See BTAR §20 completion proof. |
| BTAR-TC-001 | Resolve revealed non-V1 typecheck blockers  | TAD-A | Phase 1      | SCOPE_CONTROL / ALL_V1_SURFACES (indirect) | Backend program owner  | Done (TYPECHECK_GREEN_RESTORED) | `records/backend-task-admission-records/BTAR-TC-001-resolve-revealed-typecheck-blockers.md` | All 24 cataloged TypeScript errors resolved across 7 files; `pnpm check:backend` exits 0; `pnpm --dir apps/coinet-platform build` exits 0; ~35 lines net change (under 50-line cap); zero V1_CORE touches; zero L14 contract producer-side modifications; consumer-side fixes only per §7.1 discipline. Pattern breakdown: A=14, B=5, C=4, D=1, E=1. NB-007 carve-out invoked and discharged. See BTAR §18 completion proof. |
| BTAR-002    | Minimal chat-path smoke test                | TAD-A | Phase 1      | V1-S01 AI_CHAT (primary), V1-S02 ASSET_JUDGMENT (secondary) | Backend program owner  | Done (CHAT_SMOKE_GREEN)           | `records/backend-task-admission-records/BTAR-002-minimal-chat-path-smoke-test.md` | Single-file diff (`src/api/chat/__tests__/chat-path.smoke.test.ts`); 2/2 tests pass in 628ms; no real provider calls (27 mocks at test-file scope cover prisma, ai-service, and external-calling intelligence modules); zero V1_CORE source modification. Result B path exercised (sendMessage surfaces Error visibly rather than silently swallow). B3 (Smoke Test) PASS per Plan 1.12 §7.3. 4 Phase 2 findings filed for future BTARs: F-1 IntentClassification type drift, F-2 testability seam (27-mock surface), F-3 silent-fallback evidence (BTAR-003 target), F-4 per-message external-API fan-out. See BTAR §21 completion proof. |

> **Note:** Plan 1.7 introduced this registry. All four Phase 1 stabilization BTARs are now COMPLETED: BTAR-001 (build truth, 2026-05-19), BTAR-CI-001 (CI truth, 2026-05-19→2026-05-22), BTAR-TC-001 (typecheck green, 2026-05-22), BTAR-002 (chat smoke green, 2026-05-22→2026-05-23). Gate B's four sub-checks (B1 + B2 + B2.5 + B3) are all PASS. **Next governance event: file P1TG-002 to re-evaluate Gate B for P2-READY outcome.**

---

## Required Fields (per entry)

| Field            | Meaning                                                    |
| ---------------- | ---------------------------------------------------------- |
| Task ID          | BTAR ID (e.g., `BTAR-001`) or UDF ID (e.g., `UDF-001`)     |
| Title            | Short, declarative title                                   |
| TAD              | Must be `TAD-A`                                            |
| Target Phase     | Phase 1 / 2 / 3                                            |
| Target Surface   | V1-S01..S06 or `SCOPE_CONTROL` for governance tasks        |
| Owner            | Person or system responsible                               |
| Status           | `Not started` / `In progress` / `Blocked` / `Done`         |
| Source BTAR      | Relative path to BTAR file under `records/backend-task-admission-records/` |
| Completion Proof | Test name, PR link, artifact path, or checklist reference  |

## Admission Rule

> **No task may appear in this registry without a BTAR or an explicitly documented UDF.**

Adding an entry requires:

1. An accepted BTAR (`TAD-A` outcome, field 18) **or** an accepted UDF record (Plan 1.6 §17).
2. Synchronized update to `backend-v1-record-index.registry.md`.

## Status Lifecycle

```text
Not started → In progress → Done
                   ↓
                Blocked  (if blocked: file a follow-up BTAR or UDF; do not silently stall)
```

A `Blocked` task must point to the specific blocker (another BTAR, an exception in progress, or an external dependency). Tasks that stay `Blocked` for more than one review cycle should be moved to `BACKLOG-E` (Escalated) per Plan 1.6 §15.

## Removal Rule

A task is removed from this registry only when:

- Status is `Done` and completion proof is recorded — moved to historical record, BTAR state set to `COMPLETED`.
- Or status changes to `Withdrawn` — BTAR state set to `WITHDRAWN`.

A task does **not** leave this registry by being reclassified down to `TAD-C` or `TAD-D` without an explicit BTAR amendment.

## Synchronization

Every change to this registry must be paired with:

1. An update to the corresponding BTAR file (its `State:` field).
2. An update to `backend-v1-record-index.registry.md`.

---

*This registry is Level 4. Plan 1.6 is authoritative for admission decisions.*
