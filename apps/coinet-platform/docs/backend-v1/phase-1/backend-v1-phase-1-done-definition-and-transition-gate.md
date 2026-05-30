# Backend v1 — Phase 1 Done Definition and Transition Gate

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.12
Effective: 2026-05-19
Authority: Backend v1 Completion Program
Inherits From: Plans 1.1–1.11
Supersedes: Informal "we feel done" Phase transitions

---

## 1. Identity and Authority

This document is the **closing gate of Phase 1** and the **opening gate of Phase 2** of the Coinet Backend v1 program. It is the twelfth and final scope-control plan inside Phase 1.

Plans 1.1–1.11 produced the governance system and certified its readiness (P1RR-001 PASS). Plan 1.12 now defines the exact conditions under which **Phase 1 itself is complete** and **Phase 2 may begin** — separately from whether the governance system is ready (Plan 1.11 already answered that).

This document:

- does not redefine scope,
- does not admit any BTAR,
- does not implement code,
- does not amend Plans 1.1–1.11,
- does not falsely declare Phase 1 complete.

It performs one job:

> **It defines the two-layer Phase 1 done gate (Gate A — Governance Completion; Gate B — Stabilization Completion), the ten Phase 2 unlock conditions, the eight unlock decision outcomes, the active-task justification rule, the no-side-quest condition, the transition record structure (P1TG-NNN), and the failure-and-remediation rules — and creates the first transition record P1TG-001 with honest current status (Gate A PASS, Gate B PENDING, Phase 2 NOT_UNLOCKED).**

### 1.1 Three Deliverables of Plan 1.12

1. **This document** — the gate definition.
2. **`backend-v1-phase-transition-gate.registry.md`** — the registry that tracks every phase transition decision across the program's lifetime.
3. **`P1TG-001-phase-1-transition-gate.md`** — the first concrete transition record (honest status: Gate A PASS, Gate B PENDING, transition NOT_UNLOCKED).

### 1.2 Pre-execution Dependency Check (Performed)

Confirmed ACTIVE upstream artifacts and P1RR-001 PASS:

- All Plans 1.1–1.11 ✅ ACTIVE.
- All 12 registries from Plan 1.7 + 1.8 + 1.10 + 1.11 ✅ present.
- All 7 templates ✅ present.
- All 7 record folders ✅ present.
- `P1RR-001` ✅ ACCEPTED, decision = PASS.

---

## 2. Constitutional Purpose

### 2.1 Canonical Purpose Statement

> **The Phase 1 Done Definition and Transition Gate exists to define the exact conditions under which Coinet backend Phase 1 is considered complete, prevent premature transition into Phase 2, and ensure that the backend enters live judgment/chat/AI trust hardening only after scope, stabilization, build truth, CI truth, and minimal smoke coverage are in place.**

### 2.2 Why This Plan Is Necessary

Without Plan 1.12, two opposite failures are possible:

**Failure A — Phase 1 never ends.**
The team keeps adding governance documents, registries, and rules instead of beginning stabilization. The freeze becomes the program.

**Failure B — Phase 1 ends too early.**
The team says "governance passed" (P1RR-001 PASS) and jumps to Phase 2 before the build, CI, and minimal live-path smoke test are truthful. Phase 2 then operates on a lying foundation.

Plan 1.12 prevents both by separating governance completion (Gate A — already passed via P1RR-001) from stabilization completion (Gate B — requires concrete BTAR-completed work).

### 2.3 Core Mission

> **Plan 1.12 converts Phase 1 from "scope is governed" into "the backend is stable enough to start live-path trust hardening."**

### 2.4 Two-Part Phase 1 Structure

```text
Phase 1 = A. Governance readiness (Plans 1.1–1.11; P1RR-001 = PASS) ✅
        + B. Backend stabilization execution (Phase 1 BTARs — PENDING)
```

Phase 1 is complete only when **both** A and B are complete. Plan 1.12 measures the combination.

---

## 3. Inheritance From Plans 1.1–1.11

### 3.1 Inheritance Statement

> **This plan inherits from the Phase 1 Charter, Product Boundary, Non-Scope Registry, Architecture Freeze Law, Version-Sprawl Prohibition, Task Admissibility Framework, Source-of-Truth System, Existing Backend Surface Inventory, Daily Scope Enforcement, Exception and Scope-Change Procedure, and Phase 1 Verification framework. It does not redefine any of those. It uses them to answer: Can Phase 1 close? Can Phase 2 begin?**

### 3.2 Relationship Table

| Plan          | Role                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Plan 1.1      | Declares production-convergence mission                                                             |
| Plan 1.2      | Defines positive v1 backend scope                                                                   |
| Plan 1.3      | Defines negative scope                                                                              |
| Plan 1.4      | Freezes architecture expansion                                                                      |
| Plan 1.5      | Freezes implementation sprawl                                                                       |
| Plan 1.6      | Defines task admissibility                                                                          |
| Plan 1.7      | Defines source-of-truth system                                                                      |
| Plan 1.8      | Classifies existing backend                                                                         |
| Plan 1.9      | Enforces scope daily                                                                                |
| Plan 1.10     | Governs exceptions                                                                                  |
| Plan 1.11     | Certifies governance readiness (P1RR)                                                               |
| **Plan 1.12** | **Defines Phase 1 done + Phase 2 unlock; produces transition record P1TG-NNN**                       |

---

## 4. First Principle

### 4.1 Canonical First Principle

> **Phase 2 may not begin because the team wants to work on the live AI path; Phase 2 may begin only when Phase 1 has made the backend finite, governed, build-truthful, CI-visible, and minimally smoke-tested.**

### 4.2 Why This Matters

Phase 2 will touch dangerous live product surfaces:

```text
/api/chat
api/chat/service.ts        (2124 lines, V1_CORE, CRITICAL)
produceJudgment()           (services/judgment/index.ts, V1_CORE, CRITICAL)
formatJudgmentForAI()       (services/judgment/debug-view.ts, V1_CORE)
aiService.analyze()         (services/ai-service.ts, 1532 lines, V1_CORE, CRITICAL)
services/ai-service.ts
```

These surfaces must not be hardened while the backend still has a lying build script, no CI truth, or no smoke proof. Working on critical files atop a foundation that cannot tell us when something is broken is how production regressions land.

### 4.3 What the First Principle Forbids

- Starting Phase 2 BTARs (BTAR-003, BTAR-004, BTAR-005, BTAR-006) before Phase 1 stabilization BTARs are complete.
- Treating P1RR-001 PASS as Phase 2 authorization.
- Skipping any of B1 (build truth) / B2 (CI truth) / B3 (smoke test) on the grounds that "governance is enough."

### 4.4 What the First Principle Allows

- Admitting BTAR-001 (build truth) and BTAR-002 (smoke test) and a CI-truth BTAR through Plan 1.6 immediately, *because Phase 1 stabilization is itself the work that closes Gate B*.
- Filing Phase 2/3 BTARs as `TAD-B` (queued for later phase) — admitted but not active.
- Continuing daily scope enforcement during Phase 1 stabilization.

---

## 5. Two-Layer Phase 1 Done Gate

### 5.1 The Two Gates

Phase 1 done is defined as the **intersection** of two gates:

```text
PHASE_1_COMPLETE = Gate A AND Gate B
                 = GOVERNANCE_CERTIFIED AND STABILIZATION_CERTIFIED
```

Neither gate alone is sufficient.

### 5.2 Gate A — Governance Completion

**Definition.** All Plan 1.x governance artifacts exist, are synchronized, and have passed verification (P1RR-001 PASS).

**Status as of this document.** ✅ **PASS** — certified by P1RR-001 on 2026-05-19.

### 5.3 Gate B — Stabilization Completion

**Definition.** The backend has truthful build, truthful CI, and minimal chat-path smoke coverage, with no scope drift introduced during stabilization work.

**Status as of this document.** ⏳ **PENDING** — Phase 1 stabilization BTARs (BTAR-001, BTAR-002, and a CI-truth BTAR) have not yet been admitted or completed.

### 5.4 The Honesty Principle

> **Plan 1.12 does not fake Phase 1 completion. If Gate B is pending, the transition record says PENDING. Plan 1.12's job is to define the conditions, not to declare them satisfied prematurely.**

This is why the first transition record P1TG-001 (created alongside this plan) is honestly recorded as `Gate A PASS / Gate B PENDING / Phase 2 NOT_UNLOCKED`. The transition record will be re-evaluated as Phase 1 stabilization BTARs complete.

---

## 6. Gate A — Governance Completion Criteria

Gate A is composed of eleven GOV checks. All eleven must pass simultaneously for Gate A = `GOVERNANCE_CERTIFIED`.

```text
GOV-001  Phase 1 Charter exists (Plan 1.1)
GOV-002  Backend v1 in-scope surfaces documented (Plan 1.2)
GOV-003  Backend v1 non-scope/deferred surfaces documented (Plan 1.3)
GOV-004  Architecture expansion freeze documented (Plan 1.4)
GOV-005  Version/parallel-service sprawl prohibition documented (Plan 1.5)
GOV-006  Task admissibility framework documented (Plan 1.6)
GOV-007  Source-of-truth system created (Plan 1.7)
GOV-008  Backend inventory completed (Plan 1.8)
GOV-009  Daily enforcement procedure documented (Plan 1.9)
GOV-010  Exception and scope-change procedure documented (Plan 1.10)
GOV-011  Phase 1 readiness review passed (Plan 1.11; P1RR-001)
```

**Gate A possible statuses:**

```text
GOVERNANCE_CERTIFIED              All 11 GOV checks pass
GOVERNANCE_REMEDIATION_REQUIRED   One or more GOV checks fail
```

**Current value:** `GOVERNANCE_CERTIFIED` (per P1RR-001 PASS, 2026-05-19).

If Gate A degrades (e.g., a registry falls out of sync with a source plan), it is reset to `GOVERNANCE_REMEDIATION_REQUIRED` and a fresh P1RR is conducted (Plan 1.11 §20.3). Phase 2 transition is blocked until Gate A is restored.

---

## 7. Gate B — Stabilization Completion Criteria

Gate B is composed of five sub-checks. All five must pass simultaneously for Gate B = `STABILIZATION_CERTIFIED`.

### 7.1 B1 — Build Truth

**Required outcome:** TypeScript / build errors must fail the build command. No `tsc ... || true && echo "Build completed"`-style lying-build pattern remains as production truth.

**Required evidence:**

- BTAR-001 exists in `phase-1/records/backend-task-admission-records/`.
- BTAR-001 admitted with `admission_outcome: TAD-A` (or qualifying UDF under Plan 1.6 §17.2.1 — "breaks build truth").
- Implementation complete (PR merged, build script honest).
- Build command run on current main; failure behavior verified (non-zero exit on typecheck error).
- Completion proof recorded in BTAR's `next_action` / `state_log`.

**B1 statuses:**

```text
B1_PASS      Build is honest; verified.
B1_PENDING   BTAR-001 not yet completed.
B1_FAIL      BTAR-001 admitted but build still lies.
```

### 7.2 B2 — CI Truth

**Required outcome:** A minimal CI / check command exists that fails when core backend validation fails. A developer cannot merge or deploy while the backend build/typecheck is silently broken.

**Required evidence:**

- A BTAR for CI truth exists (this may be a separate BTAR — provisionally numbered BTAR-CI; engineers may choose to fold this into BTAR-001 only if the BTAR explicitly states so).
- CI or check script documented.
- Run proof recorded.
- Failure mode documented (what causes red CI).

**B2 statuses:**

```text
B2_PASS      CI fails honestly on backend breakage.
B2_PENDING   CI-truth BTAR not yet completed.
B2_FAIL      CI exists but is also lying or always-green.
```

### 7.3 B3 — Minimal Chat-Path Smoke Test

**Required outcome:** The active user-facing path has a minimal smoke test verifying request acceptance, valid response shape, and non-silent failure mode.

At minimum the test must cover:

```text
/api/chat route or service invocation
request accepted
response shape valid (CoinetJsonResponse or equivalent)
failure mode not silently hidden
```

**Required evidence:**

- BTAR-002 exists.
- BTAR-002 admitted with `TAD-A`.
- Smoke test file exists under `src/api/chat/__tests__/` (or equivalent agreed location).
- Smoke test run proof recorded.

**B3 statuses:**

```text
B3_PASS      Smoke test exists, passes, and would catch silent failure.
B3_PENDING   BTAR-002 not yet completed.
B3_FAIL      BTAR-002 completed but smoke test does not actually exercise active path.
```

### 7.4 B4 — Registry Synchronization

**Required outcome:** Every completed Phase 1 stabilization BTAR has propagated to the required registries in the same work session as completion (Plan 1.9 §12 sync rules).

**Required evidence per completed BTAR:**

- `backend-v1-active-task.registry.md` — status updated to `Done` with completion proof.
- `backend-v1-record-index.registry.md` — `Last Updated` reflects completion date.
- `backend-v1-decision-log.registry.md` — entry appended if the BTAR represents a major decision.
- BTAR record `State:` field set to `COMPLETED`.
- Completion proof field populated.

**B4 statuses:**

```text
B4_PASS      All completed BTARs are reflected in registries.
B4_PENDING   No BTARs completed yet.
B4_FAIL      Code state and registry state are out of sync.
```

### 7.5 B5 — No Scope Drift During Stabilization

**Required outcome:** No Phase 1 stabilization task introduced any of:

- new `L*.X` architecture (Plan 1.4 violation),
- new `-v2` / `-final` / `-complete` service (Plan 1.5 violation),
- new deferred backend feature (Plan 1.3 NB-001..NB-010 promotion without SCR),
- new deep API integration (NB-008),
- new unindexed record (Plan 1.7 §10.3),
- new active task without BTAR.

**Required evidence:**

- Diff inspection of merged PRs against Plan 1.9 PR Scope Compliance blocks.
- `backend-v1-blocked.registry.md` is unchanged by stabilization work (or any changes are formally backed by AFE/VSE/FRP/BSCP per Plan 1.10).
- `backend-v1-exception.registry.md` shows zero new entries that violate per-phase budget (Plan 1.10 §12).

**B5 statuses:**

```text
B5_PASS      No drift detected.
B5_PENDING   Insufficient stabilization activity yet to assess.
B5_FAIL      Scope drift detected; remediation required per Plan 1.10.
```

### 7.6 Gate B Composite

```text
Gate B = B1 AND B2 AND B3 AND B4 AND B5
```

**Gate B possible statuses:**

```text
STABILIZATION_CERTIFIED              All five sub-checks pass.
STABILIZATION_PENDING                One or more sub-checks PENDING; no FAIL.
STABILIZATION_REMEDIATION_REQUIRED   One or more sub-checks FAIL.
```

**Current value (as of 2026-05-19):** `STABILIZATION_PENDING` — no stabilization BTARs have been admitted or completed yet. This is expected and honest. Plan 1.12 closes nothing prematurely.

---

## 8. Phase 2 Unlock Conditions

### 8.1 The Ten Unlock Checks

Phase 2 ("Make the live judgment/chat/AI path trustworthy") can begin only when all ten unlock checks pass.

```text
P2-UNLOCK-001  Gate A = GOVERNANCE_CERTIFIED
P2-UNLOCK-002  Gate B = STABILIZATION_CERTIFIED
P2-UNLOCK-003  No active task violates Plans 1.3–1.5
P2-UNLOCK-004  All active Phase 1 tasks completed or explicitly carried over via documented decision
P2-UNLOCK-005  Build/typecheck truth verified (B1 PASS)
P2-UNLOCK-006  CI/check truth verified (B2 PASS)
P2-UNLOCK-007  Minimal chat-path smoke test verified (B3 PASS)
P2-UNLOCK-008  Registries synchronized (B4 PASS)
P2-UNLOCK-009  Exception budget not abused (Plan 1.10 §12 — Phase 1 budget consumption within limits)
P2-UNLOCK-010  Transition record P1TG-NNN created with decision = P2-READY or P2-READY_WITH_MINOR_NON_BLOCKING_REMEDIATION
```

### 8.2 Unlock Decision Outcomes

```text
P2-READY                                       All ten checks PASS.
P2-READY_WITH_MINOR_NON_BLOCKING_REMEDIATION   Documentation typos / cosmetic
                                                drift; do not affect scope,
                                                build, CI, or smoke truth.
                                                Cleanup filed as ADR follow-up.
P2-BLOCKED_BUILD_TRUTH                         B1 fails — build still lies.
P2-BLOCKED_CI_TRUTH                            B2 fails — CI absent or always-green.
P2-BLOCKED_SMOKE_TEST                          B3 fails — no real smoke proof.
P2-BLOCKED_SCOPE_DRIFT                         B5 fails — new sprawl or
                                                deferred-area work appeared.
P2-BLOCKED_UNCLOSED_TASKS                      Active task registry contains
                                                Phase 1 BTARs not yet COMPLETED
                                                (the default starting state).
P2-BLOCKED_UNSYNCED_RECORDS                    B4 fails — code state and
                                                registry state diverge.
```

Only the first two outcomes (`P2-READY` and `P2-READY_WITH_MINOR_NON_BLOCKING_REMEDIATION`) authorize Phase 2 transition.

### 8.3 Current Expected Outcome

Given that no Phase 1 stabilization BTARs have been admitted yet, the expected outcome of the first transition evaluation is:

```text
P2-BLOCKED_UNCLOSED_TASKS
```

with secondary blockers `P2-BLOCKED_BUILD_TRUTH`, `P2-BLOCKED_CI_TRUTH`, and `P2-BLOCKED_SMOKE_TEST` all triggered by the same root cause (no BTARs completed).

This is recorded honestly in P1TG-001.

---

## 9. Active Task Justification Rule

### 9.1 The Rule

> **Every active backend task must be justifiable against the production v1 target. No active task exists without a BTAR/UDF, TAD outcome, V1-S0x mapping, phase mapping, Plan 1.8 surface classification, completion state, and registry entry.**

### 9.2 Required Fields Per Active Task

```text
BTAR or UDF record         (present at records/...)
TAD outcome                 (TAD-A; or qualifying TAD-B carried into Phase 2)
v1 surface mapping          (V1-S01..S06 or SCOPE_CONTROL)
phase mapping               (Phase 1 / Phase 2 / Phase 3)
Plan 1.8 touched-surface classification (V1_CORE / V1_SUPPORTING / ...)
completion state            (Not started / In progress / Done / Blocked)
registry entry              (row in backend-v1-active-task.registry.md)
```

Any active task missing any of the above fields **blocks Phase 2 transition** under `P2-BLOCKED_UNCLOSED_TASKS` until the gap is closed (by either completing the task and updating registries, or by formally withdrawing the task).

### 9.3 No Undefined Side Quest Condition

Phase 1 cannot close while the active task registry contains any task related to:

```text
Strategy Lab backend                 (NB-001)
Chart Canvas backend                 (NB-002)
Plugin systems                       (NB-003)
Agent builders                       (NB-004)
Full CIP.1                           (NB-006)
Dormant L14 operationalization       (NB-007)
Deep API work before purchase        (NB-008)
Advanced alert platform              (NB-009)
New architecture layers              (Plan 1.4)
New duplicate service paths          (Plan 1.5)
Broad cleanup not tied to Phase 1    (NB-010)
```

If any of the above appears in the active task registry, transition is blocked under `P2-BLOCKED_SCOPE_DRIFT` unless an approved Plan 1.10 SCR / exception record explicitly authorizes the work.

---

## 10. Required Governance Artifacts

### 10.1 Mandatory Primary Artifact

```text
docs/backend-v1/phase-1/backend-v1-phase-1-done-definition-and-transition-gate.md
```

(this document)

### 10.2 Mandatory Auxiliary Registry

```text
docs/backend-v1/phase-1/registries/backend-v1-phase-transition-gate.registry.md
```

(tracks every P1TG-NNN transition decision)

### 10.3 Mandatory First Transition Record (Honest)

```text
docs/backend-v1/phase-1/records/decisions/P1TG-001-phase-1-transition-gate.md
```

**Initial expected status:**

```text
Gate A:  PASS                        (per P1RR-001)
Gate B:  PENDING                     (no stabilization BTARs completed)
Phase 2: NOT_UNLOCKED
Reason:  Phase 1 stabilization BTARs (BTAR-001 build-truth,
         BTAR-002 chat-smoke-test, CI-truth BTAR) have not been
         admitted or completed yet.
Decision: P2-BLOCKED_UNCLOSED_TASKS (primary)
          + P2-BLOCKED_BUILD_TRUTH, P2-BLOCKED_CI_TRUTH,
          P2-BLOCKED_SMOKE_TEST (secondary, same root cause)
```

This is honest. Plan 1.12 will not fake Phase 1 completion.

### 10.4 Future P1TG Records

Subsequent transition records (`P1TG-002`, `P1TG-003`, etc.) are filed each time the gate is re-evaluated — typically:

- after BTAR-001 completes (re-evaluate B1, possibly transition to a less-blocked decision),
- after BTAR-002 completes (re-evaluate B3),
- after the CI-truth BTAR completes (re-evaluate B2),
- on any major SCR-driven plan amendment.

Each re-evaluation produces a fresh P1TG-NNN record. Past records are append-only — never overwritten.

---

## 11. Failure and Remediation Rules

### 11.1 If Governance Fails (Gate A = REMEDIATION_REQUIRED)

- Identify the failing GOV-NNN check.
- Remediate the corresponding Plan 1.x artifact (restore missing file, sync drifted registry, etc.).
- Conduct a fresh P1RR (Plan 1.11). Only when P1RR returns PASS can Gate A be reset to `GOVERNANCE_CERTIFIED`.
- **No implementation expansion** during remediation. Stabilization BTARs continue normally if Gate A drifted while Gate B work was in progress, but Phase 2 transition stays blocked until Gate A is restored.

### 11.2 If Build Truth Fails (B1 FAIL)

```text
Outcome:        P2-BLOCKED_BUILD_TRUTH
Remediation:    Complete BTAR-001 (or a qualifying UDF):
                  - Remove `|| true` / equivalent silencing from build script.
                  - Verify `npm run build` (or equivalent) exits non-zero on typecheck error.
                  - Record proof (CI run, local run capture) in BTAR completion field.
```

### 11.3 If CI Truth Fails (B2 FAIL)

```text
Outcome:        P2-BLOCKED_CI_TRUTH
Remediation:    Complete the CI-truth BTAR:
                  - Document CI / check command (GitHub Actions workflow,
                    or local check-script + pre-commit / pre-push hook).
                  - Verify CI fails when typecheck or test fails.
                  - Record run proof.
                  - Document failure mode (what makes CI red).
```

### 11.4 If Smoke Test Fails (B3 FAIL)

```text
Outcome:        P2-BLOCKED_SMOKE_TEST
Remediation:    Complete BTAR-002:
                  - Add smoke test under src/api/chat/__tests__/.
                  - Test must exercise the real /api/chat path (mocked AI
                    where needed) and verify response shape.
                  - Record run proof.
                  - If the test reveals a real defect, log it as a follow-up
                    BTAR; do not silently mask the failure.
```

### 11.5 If Scope Drift Appears (B5 FAIL)

```text
Outcome:        P2-BLOCKED_SCOPE_DRIFT
Remediation:    For each drift instance:
                  - Identify the touching BTAR / PR.
                  - Either reshape the work (split out the out-of-scope
                    portion as a separate BTAR), or
                  - Defer the out-of-scope portion to backlog-C, or
                  - File an SCR / exception per Plan 1.10 if the work
                    genuinely belongs in v1.
```

### 11.6 If Records Are Stale (B4 FAIL)

```text
Outcome:        P2-BLOCKED_UNSYNCED_RECORDS
Remediation:    For each drift:
                  - Update active-task.registry.md (status / completion proof).
                  - Update record-index.registry.md (Last Updated).
                  - Update decision-log.registry.md if applicable.
                  - Update BTAR `State:` and `state_log` fields.
                  - Per Plan 1.9 §12.3, code-without-docs-sync = task not complete.
```

### 11.7 If Active Side Quest Detected

```text
Outcome:        P2-BLOCKED_SCOPE_DRIFT (via §9.3)
Remediation:    For each detected side-quest entry:
                  - Move task to deferred / blocked registry, or
                  - File SCR per Plan 1.10 §16 (five-trigger Promotion Gate),
                  - Withdraw the task and update BTAR State to WITHDRAWN.
```

---

## 12. Phase 1 Exit Checklist (Pre-Transition Use)

Before evaluating the next P1TG record, run this checklist:

```text
[ ] Phase 1 Charter active                                           (GOV-001)
[ ] Product Boundary active                                          (GOV-002)
[ ] Non-Scope Registry active                                        (GOV-003)
[ ] Architecture Freeze active                                       (GOV-004)
[ ] Version-Sprawl Prohibition active                                (GOV-005)
[ ] Task Admissibility Framework active                              (GOV-006)
[ ] Source-of-Truth System active                                    (GOV-007)
[ ] Backend Inventory active                                         (GOV-008)
[ ] Daily Enforcement active                                         (GOV-009)
[ ] Exception Procedure active                                       (GOV-010)
[ ] P1RR most recent decision = PASS                                  (GOV-011)
[ ] BTAR-001 completed; build truth verified                          (B1)
[ ] CI-truth BTAR completed; CI honestly fails on backend breakage    (B2)
[ ] BTAR-002 completed; minimal chat-path smoke test green            (B3)
[ ] All completed BTARs reflected in registries                       (B4)
[ ] No scope drift detected during stabilization                      (B5)
[ ] Active task registry contains no side-quest entries               (§9.3)
[ ] Deferred registry still protects NB-001..NB-010                   (sanity)
[ ] Blocked registry still protects FRZ / AFV / PSC / VSV             (sanity)
[ ] Exception budget within Phase 1 limits                            (P2-UNLOCK-009)
[ ] Record index synchronized                                         (P2-UNLOCK-008)
[ ] Decision log updated                                              (P2-UNLOCK-008)
[ ] New P1TG-NNN record created with explicit outcome                 (P2-UNLOCK-010)
```

### 12.1 Certification Rule

All critical checks must pass for `P2-READY`. Non-critical documentation typos may produce `P2-READY_WITH_MINOR_NON_BLOCKING_REMEDIATION` **only** if they do not affect scope, enforcement, build truth, CI truth, or smoke truth.

---

## 13. Done Definition

### 13.1 Phase 1 Done Definition

Phase 1 is complete only when:

> **Coinet backend has a finite v1 target, documented in-scope surfaces, documented out-of-scope surfaces, architecture-expansion freeze, version/parallel-service sprawl prohibition, task-by-task admission law, repo-resident source-of-truth system, existing backend inventory, daily enforcement rules, exception governance, a passed Phase 1 readiness review, truthful build/typecheck behavior, CI/check visibility, minimal chat-path smoke coverage, synchronized registries, and no active backend task that cannot be justified against production-ready Coinet v1.**

### 13.2 Plan 1.12 Done Definition

Plan 1.12 itself is complete (regardless of when Phase 1 closes) when:

> **The two-layer gate is defined, the ten Phase 2 unlock conditions are explicit, the eight unlock decision outcomes are named, the active-task justification rule is locked, the no-side-quest condition is explicit, the transition record structure exists, the failure-and-remediation rules are documented, and the first transition record P1TG-001 has been honestly filed (Gate A PASS, Gate B PENDING, Phase 2 NOT_UNLOCKED).**

### 13.3 Current State

- **Plan 1.12:** ✅ Complete after this document + P1TG registry + P1TG-001 record are filed.
- **Phase 1 itself:** ⏳ Not yet complete. Gate A PASS, Gate B PENDING. Phase 1 will close only after BTAR-001, BTAR-002, and a CI-truth BTAR are completed and a subsequent P1TG-NNN returns `P2-READY` (or `P2-READY_WITH_MINOR_NON_BLOCKING_REMEDIATION`).

---

## 14. Phase 2 Transition Instruction

### 14.1 What Phase 2 Means

Once the gate passes:

> **Phase 2 — Make the live judgment/chat/AI path trustworthy.**

### 14.2 Expected Phase 2 First BTARs

Phase 2 begins with BTARs focused on:

```text
BTAR-003  Remove silent judgment fallback in /api/chat
BTAR-004  Introduce AVAILABLE / DEGRADED / UNAVAILABLE judgment states
BTAR-005  Replace ASCII judgment prompt stuffing with CoinetJudgmentPromptPackage
          (requires FRP for the existing ASCII formatter retirement)
BTAR-006  Add user-facing AI output safety gate
          (bounded reuse of L13.9 safety patterns under Plan 1.4 Legal Class D;
           DI-01 must be respected)
BTAR-007  Begin bounded chat/service.ts extraction
          (CSP-B internal refactor; no -v2 file)
BTAR-008  Add tests for chat/judgment/AI failure paths
```

The BTAR IDs above are reserved by Plan 1.12 as the **expected** Phase 2 first batch. Each must still go through the Plan 1.6 admissibility gate before active work begins.

### 14.3 Do NOT Start Phase 2 If

```text
Build truth is still false                    (B1 FAIL)
CI truth is missing                            (B2 FAIL)
Chat smoke test is missing                     (B3 FAIL)
Active task registry has side quests           (§9.3 violated)
Scope documents are unsynchronized             (B4 FAIL)
Exceptions are informal                        (Plan 1.10 violated)
P1RR is degraded (Gate A not CERTIFIED)        (GOV-001..011 FAIL)
```

If any of the above is true, Phase 2 BTARs (BTAR-003..008) remain `TAD-B` (queued), not active.

### 14.4 Phase 2 Daily Operation

Once unlocked, Phase 2 operates under the same daily rules as Phase 1:

- Plan 1.9 daily scope enforcement remains active.
- Plan 1.10 exception governance remains active.
- Plan 1.11 P1RR is re-run at Phase 2 → Phase 3 transition.
- Quarterly Anti-Staleness Sweep continues (Plan 1.10 §19).

---

## 15. Required Closing Statement

> **Phase 1 is not done because the governance documents exist. Phase 1 is done when those documents govern a stabilized backend foundation that can safely enter live-path trust hardening.**

---

## 16. Verification and Certification Criteria for Plan 1.12 Itself

Plan 1.12 is complete when the artifact makes all of the following enforceable:

### 16.1 Two-Layer Gate Is Explicit

Gate A (governance, 11 GOV checks) and Gate B (stabilization, 5 sub-checks B1–B5) are both defined. ✅ (§6, §7)

### 16.2 Phase 2 Unlock Conditions Are Specified

Ten P2-UNLOCK conditions; eight decision outcomes. ✅ (§8)

### 16.3 Active Task Justification Rule Is Specified

Required fields per active task; no-side-quest condition. ✅ (§9)

### 16.4 Transition Record Structure Is Specified

P1TG-NNN naming, storage location, append-only re-evaluation rule. ✅ (§10)

### 16.5 Failure and Remediation Rules Are Specified

Per failure type (B1, B2, B3, B4, B5, side quest) with remediation steps. ✅ (§11)

### 16.6 Honest First Transition Record Filed

P1TG-001 reflects the actual current state: Gate A PASS, Gate B PENDING, Phase 2 NOT_UNLOCKED. ✅ (file created alongside this plan)

### 16.7 Closing Statement Present

The §15 closing statement is the operative test of Plan 1.12's honesty. ✅

---

## 17. Transition After Plan 1.12

Plan 1.12 is the **final scope-control plan inside Phase 1**. After Plan 1.12:

- The next governance event is the completion of BTAR-001, BTAR-002, and the CI-truth BTAR, followed by a fresh P1TG evaluation.
- When that fresh P1TG returns `P2-READY`, Phase 2 begins.
- There is no Plan 1.13 in the governance series. Phase 2 is *implementation*, driven by admitted BTARs, governed by Plans 1.1–1.12 as a stack.
- A future Phase 2 charter document may be filed if needed, but it would be Plan 2.x (Phase 2 governance), not Plan 1.13.

### 17.1 Closed Phase 1 Stack

```text
Plan 1.1   Why                                              [ACTIVE]
Plan 1.2   What is in                                       [ACTIVE]
Plan 1.3   What is out                                      [ACTIVE]
Plan 1.4   No new architecture                              [ACTIVE]
Plan 1.5   No new implementation sprawl                     [ACTIVE]
Plan 1.6   Task-by-task admission law                       [ACTIVE]
Plan 1.7   Repo-resident source-of-truth system             [ACTIVE]
Plan 1.8   Existing backend surface inventory               [ACTIVE]
Plan 1.9   Daily scope enforcement                          [ACTIVE]
Plan 1.10  Exception and scope-change procedure             [ACTIVE]
Plan 1.11  Phase 1 verification + certification             [ACTIVE]  (P1RR-001 PASS)
Plan 1.12  Phase 1 done definition + transition gate        [ACTIVE]  ← this document (P1TG-001 PENDING)
─────────────────────────────────────────────────────────────────────
Phase 1 stabilization implementation (admitted BTARs)       [PENDING]
Phase 2 unlock                                              [BLOCKED]
```

---

## 18. Acceptance Block

```text
Backend v1 Phase 1 Done Definition and Transition Gate — Acceptance

Accepted by: ____________________________
Role:        ____________________________
Date:        ____________________________

I confirm that:
  [ ] I have read this document in full.
  [ ] I accept the two-layer gate (§5): Gate A (governance) AND Gate B
      (stabilization) — both required.
  [ ] I accept the eleven GOV-001..GOV-011 governance checks (§6).
  [ ] I accept the five Gate B sub-checks B1..B5 (§7).
  [ ] I accept the ten P2-UNLOCK conditions and eight decision
      outcomes (§8).
  [ ] I accept the active-task justification rule and no-side-quest
      condition (§9).
  [ ] I accept the transition record structure P1TG-NNN (§10).
  [ ] I accept the failure-and-remediation rules (§11).
  [ ] I accept the exit checklist (§12) and certification rule (§12.1).
  [ ] I accept the closing statement: "Phase 1 is not done because the
      governance documents exist. Phase 1 is done when those documents
      govern a stabilized backend foundation that can safely enter
      live-path trust hardening." (§15)
  [ ] I accept that P1TG-001 is filed honestly: Gate A PASS, Gate B
      PENDING, Phase 2 NOT_UNLOCKED. (§10.3)
  [ ] I understand that P1RR-001 PASS authorized BTAR admission, not
      Phase 2 transition.
  [ ] I understand that the next governance event is the completion of
      Phase 1 stabilization BTARs, followed by P1TG-002 re-evaluation.
```

Once accepted, the `Status` field is authoritative. Until accepted, treat this document as DRAFT.

---

*End of Backend v1 Phase 1 Done Definition and Transition Gate — Plan 1.12. This is the final Plan-1.x governance document; further governance evolution occurs as Plan 2.x once Phase 2 begins.*
