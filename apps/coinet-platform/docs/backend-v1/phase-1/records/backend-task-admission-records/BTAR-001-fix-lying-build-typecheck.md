# BTAR-001 — Fix Lying Build / Typecheck Behavior

State: COMPLETED — TRUTHFUL_FAILURE_REVEALED
Program: Coinet Backend v1
Phase: Phase 1 — Stabilization
Task Type: Backend Task Admission Record (Plan 1.6)
Admission Outcome: TAD-A — ADMIT_ACTIVE_NOW
Created: 2026-05-19
Last Updated: 2026-05-19
Owner: Backend program owner
Related Plans: 1.1, 1.2, 1.6, 1.9, 1.11, 1.12
Related Gate: P1TG Gate B / Build Truth (B1)
First Implementation BTAR Under Phase 1 Governance: YES

---

## 0. Record Identity

| Field | Value |
| --- | --- |
| `task_id` | BTAR-001 |
| `task_title` | Fix Lying Build / Typecheck Behavior |
| `request_origin` | Plan 1.12 §7.1 (B1 Build Truth); Plan 1.11 §16.3 PTM mapping |
| `date_created` | 2026-05-19 |
| `proposed_by` | Backend program owner |

---

## 1. Task Summary

Remove false-success behavior from the backend build/typecheck process so that TypeScript / build errors produce a non-zero exit code instead of being swallowed and converted into a successful build message.

The current `build` script in `apps/coinet-platform/package.json` is:

```text
"build": "(tsc --skipLibCheck || true) && echo 'Build completed'"
```

This script will exit zero (success) even when `tsc` produces type errors, because `|| true` rescues the non-zero exit code and the subsequent `&& echo 'Build completed'` always runs. The same lie propagates to:

- `"dev": "pnpm build && pnpm start"`
- `"dev:quick": "pnpm build && node dist/index.js"`

After BTAR-001:

```text
Broken backend → command fails (non-zero exit).
Clean backend → command passes (zero exit).
```

No fake green.

---

## 2. Production-Readiness Problem

### 2.1 The Problem

A TypeScript or build error can exist in the backend, but the `build` command still exits successfully and prints "Build completed". This creates a dangerous illusion:

- **Build says green.** Developers and CI assume the backend is healthy.
- **Backend may be broken.** Type errors that should block emission of `dist/` are silently bypassed.
- **Deployment can continue.** CI/CD relying on `pnpm build` exit code will deploy broken code.
- **Future stabilization is untrustworthy.** Smoke tests (BTAR-002), CI truth (BTAR-CI), output safety gate (BTAR-005), and the synthetic truth suite (BTAR-006) all assume that "build green = code typechecks". This assumption is currently false.

### 2.2 Concrete Evidence

File: `apps/coinet-platform/package.json` line 12.
Pattern: `"build": "(tsc --skipLibCheck || true) && echo 'Build completed'"`.
Behavior: `tsc` non-zero exit → swallowed by `|| true` → followed by `&& echo 'Build completed'` → final exit code = 0.

### 2.3 Production-Readiness Risk Reduced

This task removes the highest-leverage falsehood in the backend. Every later Phase 1–3 BTAR depends on truthful build behavior:

- BTAR-CI (CI truth) means little if the build still lies — CI green would still be false.
- BTAR-002 (chat-path smoke test) cannot reliably run on a build that may be silently broken.
- BTAR-003..006 (Phase 2/3 hardening) operate on the live `/api/chat → produceJudgment → ai-service` path; modifying those critical surfaces atop a lying foundation is how regressions land in production.

### 2.4 What Happens If Deferred

If BTAR-001 is deferred:

- Phase 1 Gate B (Plan 1.12 §7.1) cannot pass.
- P1TG-001's `P2-BLOCKED_BUILD_TRUTH` blocker remains.
- Phase 2 cannot unlock.
- All Phase 2/3 hardening work would proceed on a lying foundation, multiplying production risk.

There is no acceptable form of deferral. Plan 1.12 §11.2 names this task explicitly as the remediation for `P2-BLOCKED_BUILD_TRUTH`.

---

## 3. Scope Mapping

### 3.1 Target Backend Surface

```text
target_backend_surface: SCOPE_CONTROL / ALL_V1_SURFACES
```

Indirectly supports all six v1 surfaces (V1-S01..V1-S06) because build truth protects the entire backend. No single surface "owns" the build script; all of them depend on it being honest.

### 3.2 Plan 1.8 Classification of Touched Surfaces

| Touched Surface | Plan 1.8 Classification | Risk if Modified |
| --- | --- | --- |
| `apps/coinet-platform/package.json` | Build infrastructure (V1_SUPPORTING) | MEDIUM (single-file, well-bounded change) |

No V1_CORE service file is touched. No L5–L14 file is touched. No duplicate-engine family is touched. No deferred area is touched. The change is confined to `scripts` in one `package.json`.

### 3.3 Cross-Plan Compliance

| Plan | Check | Status |
| --- | --- | --- |
| 1.2 (positive scope) | Maps to SCOPE_CONTROL / ALL_V1_SURFACES | ✅ |
| 1.3 (negative scope) | No NB-NNN area touched | ✅ |
| 1.4 (architecture freeze) | No new L*.X / dormant runtime / constitutional expansion | ✅ |
| 1.5 (sprawl prohibition) | No new `-v2` / `-final` / `-complete` files; no new parallel service | ✅ |
| 1.7 (source-of-truth) | Will be indexed in active-task + record-index registries | ✅ |
| 1.8 (inventory) | Touched surface (package.json) is V1_SUPPORTING / build infra | ✅ |
| 1.9 (daily enforcement) | PR Scope Compliance block will be filled at implementation time | ✅ planned |
| 1.10 (exceptions) | No exception required; standard BTAR | ✅ |
| 1.12 (Gate B) | Required for B1 PASS | ✅ |

---

## 4. Phase Mapping

```text
target_phase: PHASE_1_STABILIZATION
```

- Not Phase 2 (live-path trust hardening). Phase 2 is `TAD-C` until Gate B passes.
- Not Phase 3 (synthetic truth). Phase 3 is `TAD-C` until Phase 2 completes.
- Not Post-Phase-3.

This is the first stabilization task that begins Plan 1.12 Gate B (the B1 "Build Truth" sub-check).

---

## 5. Current Evidence To Verify

The following was inspected on 2026-05-19 to ground this BTAR in repo reality (not speculation):

### 5.1 Files Inspected

```text
apps/coinet-platform/package.json                  ✅ READ
apps/coinet-platform/tsconfig.json                 ✅ READ
package.json (root)                                 ✅ exists
pnpm-workspace.yaml                                 ✅ exists
tsconfig.json (root)                                ✅ exists
turbo.json                                          ❌ not present at root
.github/workflows/                                  ✅ exists (ci.yml, cd.yml, pull-request.yml, etc.)
```

### 5.2 Current Backend Scripts (Verbatim from `apps/coinet-platform/package.json`)

```json
{
  "prebuild": "prisma generate --schema=./prisma/schema.prisma",
  "build":    "(tsc --skipLibCheck || true) && echo 'Build completed'",
  "dev":      "pnpm build && pnpm start",
  "dev:ts":   "ts-node --transpile-only --files src/index.ts",
  "dev:quick": "pnpm build && node dist/index.js",
  "dev:watch": "ts-node-dev --respawn --transpile-only --files --ignore-watch node_modules src/index.ts",
  "start":    "node dist/index.js",
  "test":     "vitest run",
  "test:watch": "vitest",
  "test:layer1": "tsc --project tsconfig.json && node dist/scripts/test-layer1-master.js --no-compile",
  "test:layer1:quick": "node dist/scripts/test-layer1-master.js --no-compile"
}
```

### 5.3 False-Success Mechanism Identified

- **Mechanism A — `|| true` swallowing:** `tsc --skipLibCheck || true` rescues `tsc`'s non-zero exit code.
- **Mechanism B — unconditional echo:** `&& echo 'Build completed'` runs only after the `(... || true)` group, which always exits 0. So the success message and the zero exit code are guaranteed regardless of `tsc` output.
- **Mechanism C — no separate `typecheck` script:** There is no `typecheck` command at all. Developers and CI have no honest alternative.

### 5.4 Truthful Pattern Already Present in Repo

The `test:layer1` script already demonstrates the truthful pattern:

```text
"test:layer1": "tsc --project tsconfig.json && node dist/scripts/test-layer1-master.js --no-compile"
```

Here `tsc` is followed by `&&`, so a non-zero `tsc` exit prevents `node` from running. This proves the project knows how to call `tsc` honestly when it wants to; the `build` script's dishonesty is a deliberate masking pattern, not a tooling limitation.

### 5.5 `tsconfig.json` Configuration Note

The backend `tsconfig.json` already has `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`, and `skipLibCheck: true`. This is the **intended** strictness level for the current backend. Per §8.3, BTAR-001 does **not** change any of these. The task makes the existing intended check honest; it does not escalate strictness.

### 5.6 CI Workflows Exist but Out of Scope

`.github/workflows/` contains `ci.yml`, `cd.yml`, `pull-request.yml`, and others. Their interaction with the backend build is the concern of a separate **BTAR-CI** (Plan 1.12 §7.2 / B2 sub-check). BTAR-001 does not modify CI workflows.

---

## 6. Eight-Question Admissibility Gate (Plan 1.6 §7.1)

### Q1 — Product boundary fit

**Which Plan 1.2 v1 surface does this serve?**
→ `SCOPE_CONTROL / ALL_V1_SURFACES`. Build truth is not a user feature, but every v1 surface depends on it.

### Q2 — Phase alignment

**Which current backend phase does this advance?**
→ `PHASE_1_STABILIZATION` (Plan 1.12 Gate B / B1).

### Q3 — Non-scope conflict (Plan 1.3)

**Does this touch any NB-001..NB-010 area?**
→ No. No Strategy Lab, Chart Canvas, plugins, agents, full CIP.1, full L14 op, deep API work, or advanced alerts. No deferred area is touched.

### Q4 — Architecture freeze conflict (Plan 1.4)

**Does this create new architecture / sublayer / dormant runtime / framework?**
→ No. The change is confined to `scripts` in `apps/coinet-platform/package.json`. No new files, no new folders, no architectural surface.

### Q5 — Version-sprawl conflict (Plan 1.5)

**Does this create new versioned / parallel implementation?**
→ No. No `-v2`, `-final`, `-complete`, `-comprehensive`, or equivalent name. No new build-system-v2 script. The fix replaces the lying script in place.

### Q6 — Direct production-readiness value

**What specific risk does this reduce?**
→ Prevents backend TypeScript / build failures from being hidden behind a successful exit code and a fake "Build completed" message. Restores the ability for every downstream BTAR (CI truth, smoke test, output safety gate, truth suite) to rely on the build's verdict.

### Q7 — Timing necessity

**Must this happen before Phase 3 completes?**
→ **Yes.** Phase 2 must not begin while the build can lie (Plan 1.12 §4.2). This is the prerequisite for the entire Phase 2 / Phase 3 program.

### Q8 — Opportunity cost

**What active Phase 1–3 work does this delay?**
→ None. No higher-priority work is delayed because this *is* the first Phase 1 stabilization task. Plan 1.12 §7.1 names it as the first B1 remediation.

### Gate Result

```text
Admission outcome: TAD-A — ADMIT_ACTIVE_NOW
```

All eight answers favor immediate admission. No disqualifying signal. No exception procedure required.

---

## 7. Allowed Implementation Scope

The implementation MAY:

```text
1. Remove "|| true" from the backend build script.
2. Remove or rewrite the unconditional "&& echo 'Build completed'"
   message so it no longer fires regardless of typecheck outcome.
3. Add a dedicated, truthful "typecheck" script if missing (e.g.
   "typecheck": "tsc --noEmit" or "tsc --noEmit -p tsconfig.json").
4. Add a dedicated "check:backend" command if useful for CI/local
   parity (separate concern from BTAR-CI; this BTAR adds the
   command, BTAR-CI wires it into workflows).
5. Verify the build/typecheck command exits non-zero on TypeScript
   error.
6. Capture before/after evidence (script diff + run output) for
   the completion proof section (§12).
7. Update active-task.registry.md and record-index.registry.md
   on completion.
```

### 7.1 Script Concept (Final Names TBD by Implementer Per §10)

Conceptually allowed targets:

```json
{
  "typecheck":      "tsc --noEmit",
  "build":          "tsc",
  "check:backend":  "pnpm typecheck"
}
```

Exact names follow existing repo conventions; the implementer chooses among the conceptually-allowed shapes without inventing new architectural patterns.

---

## 8. Explicitly Forbidden Scope

The implementation MUST NOT:

```text
✗ Refactor any backend service file.
✗ Touch api/chat/service.ts, services/judgment/, services/ai-service.ts,
  services/hypotheses/, services/canonicalization/, or any other
  V1_CORE surface from Plan 1.8.
✗ Add an AI output safety gate (BTAR-005's job).
✗ Modify any .github/workflows/*.yml file (BTAR-CI's job).
✗ Reorganize the frontend build (frontend is out of scope per Plan 1.3).
✗ Expand TypeScript strictness (do not flip strict, noImplicitAny,
  strictNullChecks, or remove skipLibCheck). Per §8.3 of the BTAR-001
  execution plan, strictness escalation is a separate concern.
✗ Modify tsconfig.json beyond what is strictly required to make the
  intended check honest (and ideally nothing in tsconfig at all).
✗ Touch the duplicate-family services (omniscore, derivatives, social,
  news, sentiment, fetchers, anomaly monitor). Plan 1.5 requires FRP.
✗ Activate any L5–L14 system.
✗ Begin any deep API/provider integration (NB-008).
✗ Migrate package managers (still pnpm; no npm/yarn/bun switch).
✗ Perform monorepo-wide cleanup.
✗ Delete legacy service variants (Plan 1.8 §15.2 forbids during inventory phase).
✗ Create build-system-v2 scripts or any parallel build framework
  (Plan 1.5 VSV-C: no new parallel service without canonical owner).
✗ Fold BTAR-CI or BTAR-002 into this task.
```

### 8.1 The Discipline

BTAR-001 stops the build from lying. It does not make the entire repo perfect. That discipline is what keeps the task admissible as `TAD-A` and small enough to ship.

---

## 9. Target Files and Inspection Targets

### 9.1 Primary Edit Target

```text
apps/coinet-platform/package.json    (scripts.build, possibly add scripts.typecheck)
```

This is the **only** file expected to require modification. If the implementer discovers that another file must be touched, that discovery is itself a scope event — file a follow-up BTAR rather than expand this one.

### 9.2 Read-Only Inspection Targets

```text
apps/coinet-platform/tsconfig.json                  (verify intended check; do NOT edit)
package.json (root)                                 (verify no root-level build wraps the lie)
pnpm-workspace.yaml                                 (verify workspace structure)
.github/workflows/ci.yml                            (verify CI calls build; BTAR-CI's concern)
.github/workflows/pull-request.yml                  (verify PR check; BTAR-CI's concern)
```

### 9.3 Do-Not-Touch By Default

```text
src/api/chat/service.ts                  (V1_CORE; SURF-001; CRITICAL)
src/services/judgment/                   (V1_CORE; CRITICAL)
src/services/ai-service.ts               (V1_CORE; CRITICAL)
src/services/ai-hallucination-guard.ts   (V1_CORE)
src/services/hypotheses/                 (V1_CORE)
src/services/omniscore_v3/               (V1_CORE pipeline)
src/services/canonicalization/           (V1_CORE / V1_SUPPORTING mix)
src/l5/ through src/l14/                 (DORMANT_ARCHITECTURE)
prisma/schema.prisma                     (V1_SUPPORTING; auth/session models)
apps/client-web/                         (frontend; out of scope per Plan 1.3)
```

If the implementation discovers that the build script genuinely needs a path correction referencing any of these (extremely unlikely for a script-level fix), that touch is path-reference correction only — no logic in those files changes.

---

## 10. Implementation Strategy

This BTAR is **APPROVED** for active work. Implementation proceeds in this exact sequence:

### Step 1 — Inspect package scripts (already done at admission)

Current state recorded in §5.2. Confirmed:

- The lying-build pattern lives in `apps/coinet-platform/package.json` line 12.
- No `typecheck` script exists separately.
- `dev` and `dev:quick` inherit the lie via `pnpm build && ...`.

### Step 2 — Identify the false-success mechanism (already done at admission)

Confirmed:

- `(tsc --skipLibCheck || true)` swallows the non-zero exit code.
- `&& echo 'Build completed'` runs unconditionally after the swallow.
- Combined effect: `pnpm build` always exits 0, regardless of TypeScript errors.

### Step 3 — Replace the lying script with a truthful build script

The truthful concept is one of:

```json
// Option A — Build that emits dist/ and fails on type error (preserves current intent)
"build": "tsc"

// Option B — Separate typecheck + build (clearer semantics; recommended)
"typecheck": "tsc --noEmit",
"build":     "tsc"

// Option C — Build chains typecheck (single command, two-step semantics)
"typecheck": "tsc --noEmit",
"build":     "pnpm typecheck && tsc"
```

The implementer chooses one shape after running it locally to confirm the exit-code behavior. Whatever shape is chosen, the key invariants are:

1. No `|| true` anywhere in the build / typecheck path.
2. No unconditional success echo masking a prior failure.
3. The command exits non-zero when TypeScript reports an error.
4. The command exits zero when TypeScript is clean.

### Step 4 — Add a dedicated typecheck script (recommended)

If Option B or C is chosen, the new `typecheck` script is added. This is allowed under §7 (allowed implementation scope) because it is the natural truthful form, not a new architectural surface.

### Step 5 — Run the chosen command and record the outcome

Two possible outcomes are acceptable:

- **Outcome A — Command passes.** The backend currently typechecks clean. Record proof (run output + zero exit) and proceed to completion.
- **Outcome B — Command fails truthfully.** The backend has hidden TypeScript errors. Record the failure honestly. This is **not a failure of BTAR-001**; it is exactly the truth BTAR-001 was designed to surface. Each revealed error is logged as a follow-up BTAR or UDF (see §14.3); BTAR-001 itself completes when failure behavior is truthful, regardless of whether the current code happens to typecheck.

### Step 6 — Do NOT inject fake type errors

The implementer must not deliberately introduce a TypeScript error to "prove" the script now fails. Failure-behavior validation comes from either (a) the natural state of the codebase, or (b) a local-only ephemeral test that is not committed.

### Step 7 — Update registries (per §13)

On completion, update the active-task registry, record-index registry, and BTAR-001 `State:` field as specified in §13.

---

## 11. Validation Strategy

### 11.1 Primary Validation Commands

The exact commands will be determined by the chosen script shape. Likely forms:

```text
# From inside apps/coinet-platform/:
pnpm build
pnpm typecheck        (if added under Option B or C)

# From repo root:
pnpm --filter coinet-platform build
pnpm --filter coinet-platform typecheck
```

### 11.2 Failure-Behavior Proof

The completion section (§12) must record one of:

- **Truthful pass:** command exits zero AND the codebase actually typechecks. Proof = run output + `echo $?` showing 0.
- **Truthful fail:** command exits non-zero AND TypeScript errors are visibly reported. Proof = run output showing errors + `echo $?` showing non-zero.

Either outcome satisfies BTAR-001. What is **not** acceptable is a script that exits zero while TypeScript reports errors — the original lying pattern restored under any disguise.

### 11.3 Non-Goal Validation

The completion section must also confirm:

```text
[ ] No new backend service file created.
[ ] No architecture file created.
[ ] No deferred-area file touched.
[ ] No L*.X file added.
[ ] No versioned / parallel service path added.
[ ] No CI workflow modified (separate concern: BTAR-CI).
[ ] No tsconfig strictness expansion.
[ ] Single-file diff to apps/coinet-platform/package.json (plus
    this BTAR record).
```

---

## 12. Completion Proof Requirements

When this BTAR transitions to `COMPLETED`, the completion section must record:

```text
Before:
  "build": "(tsc --skipLibCheck || true) && echo 'Build completed'"
  (no separate typecheck script)

After:
  [exact final scripts.build value]
  [exact final scripts.typecheck value, if added]

Files changed:
  apps/coinet-platform/package.json     (scripts section only)

Validation:
  Command:    [exact command run]
  Working dir: [exact directory]
  Exit code:  [0 or non-zero]
  Outcome:    [truthful pass / truthful fail]
  Output:     [stdout/stderr capture or summary]

Truth restored:
  No "|| true" remains in scripts.build or scripts.typecheck.
  No unconditional success echo remains in build path.
  pnpm build now exits non-zero on TypeScript error.

Follow-up:
  [if truthful fail: list of revealed errors and intended
   follow-up BTAR/UDF strategy]

Scope compliance:
  [eight-check non-goal validation from §11.3]
```

This proof block is appended to **this BTAR file** (§17 state log entry) and summarized in `backend-v1-active-task.registry.md` `Completion Proof` column.

---

## 13. Registry Synchronization Requirements

Per Plan 1.9 §12 (sync targets table), the following updates happen in the same work session as state transitions.

### 13.1 On Admission (this submission)

```text
[x] BTAR-001 record file created at:
    phase-1/records/backend-task-admission-records/BTAR-001-fix-lying-build-typecheck.md
[x] backend-v1-active-task.registry.md  — add row with State=APPROVED, Status=Not Started
[x] backend-v1-record-index.registry.md — add row
```

### 13.2 On Implementation Start (`State: IN_PROGRESS`)

```text
[ ] BTAR-001 State: APPROVED → IN_PROGRESS  (with state_log entry)
[ ] backend-v1-active-task.registry.md  — Status: Not Started → In progress
[ ] backend-v1-record-index.registry.md — Last Updated: today
```

### 13.3 On Completion (`State: COMPLETED`)

```text
[ ] BTAR-001 State: IN_PROGRESS → COMPLETED  (with state_log entry)
[ ] §12 completion proof block appended to this file
[ ] backend-v1-active-task.registry.md  — Status: Done + Completion Proof column populated
[ ] backend-v1-record-index.registry.md — Last Updated: today
[ ] backend-v1-decision-log.registry.md — append entry noting B1 (Build Truth) achieved
[ ] NO change to P1TG-001. A future P1TG-002 evaluation will reassess B1 after BTAR-001 + BTAR-CI + BTAR-002 all complete.
```

### 13.4 What This Task Does NOT Update

```text
✗ P1TG-001 status. (Gate B remains PENDING until B1+B2+B3 all PASS;
   that's a separate P1TG-002 evaluation.)
✗ Plan 1.x source documents. (No SCR; no plan amendment.)
✗ The in-scope / deferred / blocked registries. (No scope change.)
✗ The exception or exception-budget registries. (No exception used.)
```

---

## 14. Risk Model

### 14.1 Main Risk: Hidden TypeScript Errors Surface

Once the build script tells the truth, previously-hidden TypeScript errors may become visible. This is **not a failure of BTAR-001** — it is exactly the truth BTAR-001 was designed to uncover.

### 14.2 Wrong Response to Revealed Errors

The wrong response is to "fix everything at once" and let BTAR-001 expand into an open-ended TypeScript cleanup. This would violate Plan 1.6 §11.2 (edge case decomposition — minimal now-version + deferred later-version).

### 14.3 Correct Response to Revealed Errors

For each revealed error:

```text
1. Record the error in BTAR-001's completion proof (§12).
2. Classify by impact on Phase 1–3:
   - Blocks Phase 1 stabilization?  → file UDF or fresh BTAR.
   - Blocks Phase 2 work?            → file BTAR (TAD-B until Phase 2).
   - Cosmetic / pre-existing latent? → file follow-up BTAR (TAD-C).
3. BTAR-001 completes when truth is restored, even if the codebase
   then reports errors. Restoring truth is the deliverable.
```

### 14.4 Secondary Risk: Developer Workflow Disruption

`pnpm dev` and `pnpm dev:quick` depend on `pnpm build`. If the build now fails truthfully, those scripts also fail. This is correct behavior — they should fail when the code is broken — but it may surprise developers.

Mitigation: the completion proof block should explicitly note this behavior change so the team is informed.

### 14.5 Tertiary Risk: CI Behavior Change

If `.github/workflows/*.yml` calls `pnpm build`, those workflows will now fail when the backend has type errors. This is correct and desired, but it is technically a behavior change that **belongs to BTAR-CI's verification**, not BTAR-001's. BTAR-001 makes the script honest; BTAR-CI wires honest scripts into CI gates. Sequencing matters.

---

## 15. Rollback Rule

### 15.1 Allowed Rollback

If the script change unexpectedly breaks developer workflow:

```text
1. git revert the package.json scripts change.
2. File a UDF or BTAR documenting the discovery.
3. Plan a follow-up that restores truth without breaking workflow.
```

### 15.2 Prohibited Rollback

Rollback **must not** restore the lying behavior as the long-term state. Specifically:

- No permanent return to `tsc ... || true`.
- No permanent return to unconditional `&& echo 'Build completed'`.

Any temporary rollback for emergency reasons requires:

```text
1. UDF record stating the rollback.
2. Explicit expiry (Plan 1.10 §11; default ≤30 days for UDF).
3. New remediation plan (e.g., re-attempt BTAR-001 with adjustments).
4. State log entry in this BTAR.
```

Permanent retention of the lying behavior is a Decision-Impossibility violation (Plan 1.10 §14.2 DI-04: "Restoring or introducing a 'lying' build script ... that silently masks typecheck failures"). DI-04 cannot be exempted.

---

## 16. Admission Decision

```text
Admission outcome:  TAD-A — ADMIT_ACTIVE_NOW
Authority:          Backend program owner (single-approver per Plan 1.10 §8.1; UDF-like simplicity)
Decision date:      2026-05-19
EQS scoring:        Not required (BTAR, not an exception)
Exception used:     None
Budget consumed:    0 (BTAR; not exception-budget tracked)

Reason:
BTAR-001 directly advances Phase 1 stabilization (Plan 1.12 Gate B / B1),
is required by Plan 1.12 §7.1 as the first remediation for
P2-BLOCKED_BUILD_TRUTH, supports all v1 backend surfaces (V1-S01..S06)
by making build/typecheck truth enforceable, violates no Plan 1.3
non-scope entry, no Plan 1.4 architecture-freeze entry, and no Plan 1.5
sprawl prohibition, and has bounded single-file implementation scope
(apps/coinet-platform/package.json scripts only). The task is the
prerequisite for every later Phase 1/2/3 BTAR (CI truth, smoke test,
silent-fallback removal, prompt-package introduction, output safety
gate, truth suite scaffold). Plan 1.10 DI-04 (no lying build) reinforces
that the current state cannot be retained.

State on admission: APPROVED, queued under BACKLOG-A.
```

---

## 17. Acceptance Block and State Log

### 17.1 Acceptance Block

```text
BTAR-001 — Acceptance

Accepted by: ____________________________
Role:        Backend program owner
Date:        2026-05-19

I confirm:
  [ ] I have read this BTAR in full.
  [ ] I accept the §3 scope mapping (SCOPE_CONTROL / ALL_V1_SURFACES).
  [ ] I accept the §4 phase mapping (PHASE_1_STABILIZATION).
  [ ] I accept the §7 allowed implementation scope and §8 forbidden scope.
  [ ] I accept the §9 do-not-touch list.
  [ ] I accept the §11/§12 validation and completion-proof discipline.
  [ ] I accept the §13 registry synchronization plan.
  [ ] I accept the §14.3 rule that revealed TypeScript errors are
      success, not failure, of BTAR-001.
  [ ] I accept the §15.2 prohibition on permanent rollback to lying
      behavior (DI-04).
  [ ] I accept that BTAR-001 completion does NOT close Gate B; B1
      passing also requires no scope drift during the change, and
      Gate B further requires B2 (BTAR-CI) and B3 (BTAR-002) to PASS.
```

### 17.2 State Log (Append-Only)

```text
2026-05-19  DRAFT       — record created from BTAR-001 execution plan
2026-05-19  SUBMITTED   — all 17 sections complete; evidence gathered (§5)
2026-05-19  APPROVED    — admission decision TAD-A signed; admitted under BACKLOG-A
2026-05-19  IN_PROGRESS — script edit applied to apps/coinet-platform/package.json
2026-05-19  COMPLETED   — TRUTHFUL_FAILURE_REVEALED. Lying-build pattern eliminated.
                          24 previously-hidden TypeScript errors now visible (16 in
                          src/scripts/, 6 in src/l14/, 2 in src/integration/).
                          Zero errors in V1_CORE production paths.
                          Build truth (B1) achieved per Plan 1.12 §7.1.
```

---

## 18. Completion Proof (Required by §12)

### 18.1 Files Changed

```text
apps/coinet-platform/package.json    (scripts section only — three lines affected)
```

No other files modified. No tsconfig changes. No service-file changes. No CI changes. Single-file diff.

### 18.2 Script Diff

**Before** (lying-build pattern, `apps/coinet-platform/package.json` line 12):

```json
"prebuild": "prisma generate --schema=./prisma/schema.prisma",
"build": "(tsc --skipLibCheck || true) && echo 'Build completed'",
"dev": "pnpm build && pnpm start",
```

**After** (truthful pattern):

```json
"prebuild": "prisma generate --schema=./prisma/schema.prisma",
"typecheck": "tsc --noEmit",
"build": "tsc",
"dev": "pnpm build && pnpm start",
```

Changes:

1. Replaced `"build": "(tsc --skipLibCheck || true) && echo 'Build completed'"` with `"build": "tsc"`.
2. Added `"typecheck": "tsc --noEmit"` as a separate honest check.

Note: `--skipLibCheck` is no longer passed on the CLI, but `skipLibCheck: true` is already set in `tsconfig.json` (verified by §5.5 of this BTAR), so the effective `tsc` behavior is unchanged for library checks. The change is purely the removal of the lying wrapper, not a strictness escalation (§8.3 discipline preserved).

### 18.3 Validation Commands Executed

```text
$ pnpm --dir apps/coinet-platform typecheck
$ pnpm --dir apps/coinet-platform build
```

Working directory: `/Users/sebas/Downloads/Coinet/coinet-platform`.

### 18.4 Observed Result

```text
typecheck:  TRUTHFUL_FAILURE   (exit code: non-zero / ELIFECYCLE code 2)
build:      TRUTHFUL_FAILURE   (exit code: non-zero / ELIFECYCLE code 2)
```

**Per §7 Result B and §14.3 of this BTAR, truthful failure is success for BTAR-001.** The task's purpose is to surface hidden errors, not to fix them.

### 18.5 Truth Restored (Structural Confirmation)

```text
"|| true" in scripts.build:                          REMOVED  ✅
"|| true" in scripts.typecheck:                      ABSENT   ✅
Unconditional "echo 'Build completed'":              REMOVED  ✅
"Build completed" appearances in pnpm build output:  0        ✅
TypeScript failure exit-code propagation:            CORRECT  ✅
                                                      (non-zero on error)
```

The build command no longer prints fake success after failure. The lying pattern is structurally impossible to restore via the current script.

### 18.6 Revealed-Error Breakdown (per §14 Risk Model)

The truthful build/typecheck surfaces 24 previously-hidden TypeScript errors. They were silently rotting under `|| true`:

```text
Total errors:                                        24

Breakdown by directory:
  src/scripts/                                        16  (certification / test scripts)
    ├─ test-ajp1-active-judgment-pipeline.ts           2
    ├─ test-cip05-certified-runtime.ts                 7
    ├─ test-l14_9-rollout-experiment-operations.ts     5
    ├─ test-l14_master.ts                              1
    └─ (other test-l14_*)                              1
  src/l14/                                              6  (DORMANT_ARCHITECTURE — Plan 1.8 SURF-309)
    ├─ contracts/index.ts (duplicate export)           1
    └─ invariants/l14_9-invariants.ts (enum drift)     5
  src/integration/                                      2  (DORMANT_ARCHITECTURE — bridge cert test harness)
    └─ ajp1/ajp1-orchestrator.ts                       2

Errors in V1_CORE production paths:                   0   ✅
  (api/chat/, services/judgment/, services/ai-service.ts,
   services/hypotheses/, services/canonicalization/, etc.)
```

### 18.7 Interpretation of Revealed Errors

Plan 1.8 already classified the affected paths:

- `src/scripts/test-*` — test harnesses (Plan 1.8 SURF-032 / triage UNK-032 / test infrastructure).
- `src/l14/` — `DORMANT_ARCHITECTURE` (Plan 1.8 SURF-309).
- `src/integration/ajp1/` — `DORMANT_ARCHITECTURE` (Plan 1.8 SURF-311).

The fact that the active product runtime (V1_CORE surfaces) has **zero** revealed errors is significant: the lying-build script was protecting test/certification/dormant code from surfacing drift, while the live product paths happen to typecheck cleanly. This matches the Plan 1.8 finding that V1_CORE and DORMANT_ARCHITECTURE evolved on different schedules — the L14 certification system was finalized in earlier sessions, while the test scripts and L14 invariants drifted later without anyone noticing because the build was lying.

### 18.8 Follow-up Tasks (Per §14.3 Classification)

Each revealed error must be classified for follow-up. **No errors are fixed in BTAR-001** (§14.3 discipline). Each follow-up gets its own BTAR or UDF when filed:

| Error Location                                                     | Plan 1.8 Class          | Blocks Phase 1–3?            | Follow-up Classification       |
| ------------------------------------------------------------------ | ----------------------- | ---------------------------- | ------------------------------ |
| `src/integration/ajp1/ajp1-orchestrator.ts` (×2)                   | DORMANT_ARCHITECTURE    | No — test orchestrator only  | Follow-up BTAR (TAD-C / post-Phase-3) |
| `src/l14/contracts/index.ts` (duplicate export)                    | DORMANT_ARCHITECTURE    | No — L14 dormant from prod   | Follow-up BTAR (TAD-C)         |
| `src/l14/invariants/l14_9-invariants.ts` (×5; enum drift)          | DORMANT_ARCHITECTURE    | No — L14 dormant from prod   | Follow-up BTAR (TAD-C)         |
| `src/scripts/test-ajp1-active-judgment-pipeline.ts` (×2)           | Test infrastructure     | Potentially Phase 3 truth-suite scaffolding | Follow-up BTAR (TAD-B for Phase 3) |
| `src/scripts/test-cip05-certified-runtime.ts` (×7)                 | Test infrastructure     | No — certified-runtime cert  | Follow-up BTAR (TAD-C)         |
| `src/scripts/test-l14_9-rollout-experiment-operations.ts` (×5)     | Test infrastructure     | No — L14 cert script         | Follow-up BTAR (TAD-C)         |
| `src/scripts/test-l14_master.ts` (×1)                              | Test infrastructure     | No — L14 master cert         | Follow-up BTAR (TAD-C)         |

**Critical observation:** none of the revealed errors are in V1_CORE production paths. None block Phase 1 stabilization. The most relevant cluster is the AJP.1 test orchestrator errors (`src/integration/ajp1/`), which may need a follow-up BTAR if the AJP.1 test suite is needed during Phase 3 truth-suite scaffolding (BTAR-006).

Follow-up BTARs are **not filed by this record**. They are filed separately, each through the Plan 1.6 process. BTAR-001 closes here with the truth-restoration deliverable complete.

### 18.9 Scope Compliance (Per §11.3 Non-Goal Validation)

```text
[x] No new backend service file created.
[x] No architecture file created.
[x] No deferred-area file touched (NB-001..NB-010).
[x] No L*.X file added (Plan 1.4).
[x] No versioned / parallel service path added (Plan 1.5).
[x] No CI workflow modified (BTAR-CI's job).
[x] No tsconfig strictness expansion (skipLibCheck, strict, noImplicitAny,
    strictNullChecks all unchanged).
[x] No V1_CORE service file touched (Plan 1.8 §A protected list).
[x] Single-file diff to apps/coinet-platform/package.json (plus this BTAR record).
[x] BTAR-CI not folded into this task.
[x] BTAR-002 not folded into this task.
```

All eleven non-goal checks pass. Scope discipline held.

### 18.10 Decision-Impossibility Check (Plan 1.10 §14.2 DI-04)

```text
DI-04: "Restoring or introducing a 'lying' build script (e.g.,
       `tsc || true`) that silently masks typecheck failures."

BTAR-001 status:   ELIMINATING the existing lying pattern (the opposite of DI-04 violation).
                    The new scripts CANNOT regress to lying behavior because
                    no "|| true" or unconditional success-echo remains.
                    DI-04 compliance: PRESERVED.
```

### 18.11 What This Completion Does NOT Authorize

Per §13.4 of this BTAR:

```text
✗ Update P1TG-001.            (Unchanged; future P1TG-002 re-evaluates Gate B.)
✗ Mark Gate B as PASS.        (Requires B1 + B2 + B3; only B1 is now complete.)
✗ Unlock Phase 2.             (Plan 1.12 §8.1 — requires Gate B CERTIFIED.)
✗ Mark Phase 1 as done.       (Plan 1.12 §13.1 done definition still pending.)
✗ Admit BTAR-CI or BTAR-002.  (Each needs its own Plan 1.6 admission.)
✗ Fix the revealed errors.    (§14.3 — each is a follow-up BTAR.)
```

### 18.12 Final Status

```text
BTAR-001 State:            COMPLETED — TRUTHFUL_FAILURE_REVEALED
B1 (Build Truth):          PASS  (per Plan 1.12 §7.1)
Gate B overall:            STILL PENDING  (B2, B3 not yet complete)
Phase 2 unlock:            STILL BLOCKED  (per P1TG-001, unchanged)
Next governance action:    File BTAR-CI for B2 (CI truth gate).
                            Then file BTAR-002 for B3 (chat-path smoke test).
                            Then file P1TG-002 to re-evaluate Gate B.
```

---

*This is the first Backend Task Admission Record under the Phase 1 governance system. It is also the first BTAR to reach `COMPLETED` state. Its standard is high because every BTAR after it inherits this template's discipline.*

*Notable result: the task achieved its purpose (truth restored) and demonstrated the §14.3 principle in practice — truthful failure is success when the task is to surface hidden failure.*
