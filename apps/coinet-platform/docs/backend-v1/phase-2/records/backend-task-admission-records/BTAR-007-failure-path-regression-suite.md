# BTAR-007 — Failure-Path Regression Suite

Type: BTAR (Backend Task Admission Record)
Status: COMPLETED — FAILURE_PATH_REGRESSION_SUITE_ACTIVE
Phase: Phase 2 — Live Judgment / Chat / AI Trust
Created: 2026-05-25
Last Updated: 2026-05-25
Owner: Backend program owner
Mission Trace: Plan 2.1 §1.2 ("testable"); Plan 2.1 §2.6 (TF as test oracle); §7.5 (TF-NNN test discipline)

Depends On / Inherits From:
- Plans 1.1–1.10 ACTIVE
- Plan 1.11 / 1.12 COMPLETED
- Plan 2.0 long-form + roadmap ACTIVE
- Plan 2.1 / 2.2 / 2.3 ACTIVE
- **BTAR-003 COMPLETED** (JudgmentAvailabilityState)
- **BTAR-004 COMPLETED + FRP-001 COMPLETED** (CoinetJudgmentPromptPackage)
- **BTAR-005 COMPLETED** (AI Output Safety / Expression Gate)
- **BTAR-006 COMPLETED** (Bounded Chat Service Extraction — extracted seams are the primary test target)

Inheritance audit: Plans 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 2.0 (both), 2.1, 2.2, 2.3 — all ACTIVE/COMPLETED at admission.

---

## 1. One-Sentence Mission

> **BTAR-007 creates a focused failure-path regression suite proving that judgment failure, empty judgment, degraded context, unsafe AI output, prompt package violations, and provider-call leakage cannot silently bypass the Phase 2 trust safeguards.**

### 1.1 Honesty Pin

BTAR-007 is a **regression suite**, not a new runtime. It uses the BTAR-006 extracted seams as the primary test target so the regressions are mechanically detectable without the 27-mock cascade. The full-service integration tests preserve their existing baselines (Plan 2.3 OOS-011 boundary).

---

## 2. Problem Statement

Phase 2 has six trust safeguards (BTAR-003 availability, BTAR-004 package, BTAR-005 gate, BTAR-006 seams). Each is unit-tested at its own layer. What is missing is a **cross-cutting regression suite** that takes the discrete tests and frames them as **failure-path oracles** — so a future PR that accidentally reintroduces silent fallback, fake governed judgment, missing disclosure, unsafe recommendation, or unprotected provider boundary will be caught at the test layer, not at production.

---

## 3. Plan 2.1 Mission Trace

| Field | Value |
| --- | --- |
| Mission clause(s) advanced | "testable" (Plan 2.1 §1.2) |
| First principle obligation strengthened | Regression-detection for §2.4 bullets 1–5 (faked confident thesis, missing degradation disclosure, recommendation language, fabricated evidence, silent fallback to generic AI) |
| Truth class boundary strengthened | All three classes (§3.1/§3.2/§3.3) — the suite asserts each class's invariants directly |
| Trust failure(s) targeted | TF-001 / TF-002 / TF-003 / TF-004 / TF-005 / TF-006 / TF-007 / TF-008 (regression-detection) |
| Availability law interaction | CONSUMES BTAR-003 availability; CONSUMES BTAR-004 package; CONSUMES BTAR-005 gate; CONSUMES BTAR-006 seams |
| Non-replacement compliance | Confirmed: zero files under `src/l5..src/l14/` touched; zero production-source modifications (preferred) |

---

## 4. Plan 2.2 Surface Boundary Mapping

```text
## Surface Boundary Mapping
```

| Surface | Permission | Use in BTAR-007 |
| --- | --- | --- |
| `src/api/chat/__tests__/chat-failure-regression.test.ts` (P2-S08 new) | P2-OPEN | Main regression suite (Test Classes A–F) |
| `src/api/chat/__tests__/fixtures/chat-failure-fixtures.ts` (P2-S08 new) | P2-OPEN | Deterministic fixtures (availability states, judgments, packages, AI outputs) |
| `src/api/chat/chat-trust-context.ts` (P2-S12 existing) | P2-OPEN | Test target; no redesign |
| `src/api/chat/chat-ai-response-finalizer.ts` (P2-S12 existing) | P2-OPEN | Test target; no redesign |
| `src/api/chat/judgment-availability.ts` (P2-S10 existing) | P2-OPEN | Test target / fixture source |
| `src/api/chat/judgment-prompt-package.ts` (P2-S09 existing) | P2-OPEN | Test target |
| `src/api/chat/ai-output-safety-gate.ts` (P2-S11 existing) | P2-OPEN | Test target |
| `src/api/chat/service.ts` (P2-S01) | P2-TOUCH_WITH_BOUNDS | **Not touched.** Only touched if a regression reveals a real defect that cannot be fixed at the seam layer. |

**Touched surfaces declared.** Diff scope: 2 new files only (1 test file + 1 fixture file).

**Forbidden surfaces confirmed absent.** P2-F01..F03 not touched. `src/l13/` and `src/l14/` not touched. `services/ai-service.ts` not touched. `services/judgment/*` not touched. No frontend, no schema, no CI.

**Required caution language** (Plan 2.2 §12.3 + spec §7):

```text
This is a failure-path regression suite, not a chat service rewrite and not a new runtime.
```

**Plan 2.3 OOS check (Q1..Q5):**

| Q | Answer |
| --- | --- |
| Q1. Touches any OOS item? | **No.** All work in P2-S08. |
| Q2. If yes, which OOS-NNN? | n/a |
| Q3. Allowed / forbidden / exception-required? | ALLOWED (Plan 2.2 §7.1) |
| Q4. Required caution language? | **Yes** (§4 above) |
| Q5. Creates new architecture / service variant / provider dependency? | **No.** Test files only; no provider imports. |

---

## 5. Plan 2.3 OOS Confirmation

Zero OOS-001..018 crossings. No full chat-service rewrite, no new runtime, no `*-v2.ts` / `*-final.ts`, no parallel runtime, no CIP.1, no L13/L14 migration, no Strategy Lab, no Chart Canvas, no plugin systems, no agent builder, no real-API integration, no calibration ecosystem, no alert platform, no broad cleanup, no new L*.X, no real-provider tests, no frontend integration, no unrelated performance work, no full observability platform, no full external fan-out redesign, no compliance policy engine.

---

## 6. Files Plan

### 6.1 New Files

```text
apps/coinet-platform/src/api/chat/__tests__/fixtures/chat-failure-fixtures.ts   ~80 LOC, deterministic exports only
apps/coinet-platform/src/api/chat/__tests__/chat-failure-regression.test.ts     21–25 tests, 0 module mocks, no chat/service.ts import
```

### 6.2 Modified Files (Preferred = None)

```text
None expected. Production source unchanged.
```

### 6.3 Conditionally Modified (Only if Regression Reveals Real Defect)

```text
src/api/chat/chat-trust-context.ts
src/api/chat/chat-ai-response-finalizer.ts
src/api/chat/judgment-prompt-package.ts
src/api/chat/ai-output-safety-gate.ts
src/api/chat/judgment-availability.ts
```

If a fix is needed, it must be minimal and recorded in the completion section.

### 6.4 Forbidden

```text
src/l13/**, src/l14/**, src/index.ts, prisma/schema.prisma, apps/client-web/**, .github/workflows/**, root package.json, tsconfig.json
chat-service-v2.ts, ai-service-v2.ts, judgment-engine-final.ts, failure-runtime.ts, compliance-engine.ts, provider-test-runtime.ts, l13-regression-adapter.ts, l14-regression-adapter.ts
```

---

## 7. Test Class Coverage (Spec §§13–18)

```text
A — Judgment engine failure (UNAVAILABLE via JUDGMENT_ENGINE_THROW)        ≥3 tests
B — Empty judgment (UNAVAILABLE via JUDGMENT_RESULT_EMPTY)                 ≥3 tests
C — Degraded context (DEGRADED requires disclosure, blocks overconfidence) ≥4 tests
D — Unsafe AI output (buy/sell, guaranteed outcomes, governed-when-unavailable, invented evidence, confidence inflation) ≥5 tests
E — Prompt package integrity (AVAILABLE / DEGRADED / UNAVAILABLE structural invariants + assertion enforcement) ≥5 tests
F — No real provider calls (file-level structural proof: imports limited to seams + fixtures) ≥1 test
```

Target total: 21–25 tests.

---

## 8. Test-Discipline Constraints (Spec §§18, 20)

- **0 module mocks** in `chat-failure-regression.test.ts` (no `vi.mock` calls).
- **No `chat/service.ts` import.**
- **No provider imports** (no `ai-service`, no `market-data`, no `project-investigation-service`, no `services/judgment`).
- Imports restricted to:
  - `vitest` (test framework)
  - `judgment-availability` (BTAR-003)
  - `chat-trust-context` (BTAR-006)
  - `chat-ai-response-finalizer` (BTAR-006)
  - `judgment-prompt-package` (BTAR-004)
  - `ai-output-safety-gate` (optional; for direct gate-decision assertions)
  - `./fixtures/chat-failure-fixtures` (local)

---

## 9. Validation Commands

```bash
pnpm check:backend
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/chat-failure-regression.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/
```

Expected: all green; 0 new findings; no regression in BTAR-002/003/004/005/006 baselines.

---

## 10. Rollback Path

Single PR revert. The two new files under `src/api/chat/__tests__/` are removed. No production code or schema/CI changes.

---

## 11. Findings Expected Update

```text
F-1   STILL_OPEN (unchanged)
F-2   PARTIALLY_RESOLVED_TRUST_SEAMS (unchanged; BTAR-007 does not touch full-service coupling)
F-3   RESOLVED (unchanged)
F-4   STILL_OPEN (unchanged; BTAR-008 territory)
F-5   May upgrade to PARTIALLY_RESOLVED_TRUST_ORACLE → with stronger evidence (seam regression oracle now exists)
F-6   RESOLVED (unchanged)
```

Honest claim only. Do not overclaim F-2 closure.

---

## 12. Done Definition (Spec §29 condensed)

```text
chat-failure-regression.test.ts + chat-failure-fixtures.ts exist.
Test classes A, B, C, D, E, F all covered.
Suite uses 0 module mocks.
Suite does not import chat/service.ts.
Suite makes no real provider calls by construction.
All new tests pass.
All BTAR-002/003/004/005/006 seam + integration + smoke tests pass.
pnpm check:backend exits 0.
No response shape break.
No new runtime / no chat rewrite / no L*.X diff.
No frontend changes.
Findings F-2 / F-5 updated honestly.
```

---

## 13. Completion Section

### 13.1 Completion Claim

```text
BTAR-007 COMPLETED — FAILURE_PATH_REGRESSION_SUITE_ACTIVE
```

### 13.2 Files Changed

**New (2 files):**

```text
apps/coinet-platform/src/api/chat/__tests__/fixtures/chat-failure-fixtures.ts   ~120 LOC, deterministic exports only
apps/coinet-platform/src/api/chat/__tests__/chat-failure-regression.test.ts      24 tests, 0 module mocks
```

**Modified:** None. Production source unchanged (preferred outcome).

### 13.3 Test Results

```text
pnpm check:backend                                                              → exits 0 (typecheck clean)
src/api/chat/__tests__/chat-failure-regression.test.ts                          → 24/24 pass (184ms), 0 module mocks
Combined chat suite (all 10 files):                                             → 126/126 pass (733ms total)
```

Breakdown:

```text
chat-failure-regression.test.ts (BTAR-007, new)              → 24/24
chat-trust-context.test.ts (BTAR-006)                        → 14/14
chat-ai-response-finalizer.test.ts (BTAR-006)                → 10/10
ai-output-safety-gate.test.ts (BTAR-005)                     → 25/25
chat-ai-output-safety.integration.test.ts (BTAR-005)         →  1/1
judgment-prompt-package.test.ts (BTAR-004)                   → 23/23
chat-prompt-package-integration.test.ts (BTAR-004)           →  1/1
judgment-availability.test.ts (BTAR-003)                     → 25/25
chat-judgment-failure-path.test.ts (BTAR-003)                →  1/1
chat-path.smoke.test.ts (BTAR-002)                           →  2/2
Total                                                        → 126/126
```

### 13.4 Test Class Coverage

| Class | Tests | Cases |
| --- | ---: | --- |
| A — Judgment engine failure (JUDGMENT_ENGINE_THROW) | 4 | A1 trust_status UNAVAILABLE / A2 no judgment fields / A3 rendered context forbids governed claims / A4 finalizer rewrites governed thesis claim |
| B — Empty judgment (JUDGMENT_RESULT_EMPTY) | 3 | B1 canUseStructuredJudgment=false / B2 disclosure required / B3 trust context UNAVAILABLE + required disclosures present |
| C — Degraded context (PARTIAL_CONTEXT_FAILURE) | 5 | C1 disclosure_required / C2 degradation.disclosure_required / C3 required_disclosures non-empty / C4 confidence inflation flagged / C5 cautious safe output ALLOWED |
| D — Unsafe AI output | 5 | D1 direct buy/sell / D2 guaranteed outcome BLOCKED / D3 unsupported certainty / D4 invented evidence / D5 governed claim when UNAVAILABLE |
| E — Prompt package integrity | 6 | E1 AVAILABLE structural / E2 thesis+confidence projection / E3 DEGRADED disclosure shape / E4 UNAVAILABLE forbids governed claims / E5 invariant 2 enforced (tampering rejected) / E6 invariant 3 enforced (tampering rejected) |
| F — No real provider calls (structural proof) | 1 | F1 imports limited to vitest + Phase 2 seams + local fixtures; sanity touchpoints prove seam wiring |

**Total: 24 tests (within 21–25 target).**

### 13.5 Mock-Count Evidence

```text
chat-failure-regression.test.ts              → 0 vi.mock calls
fixtures/chat-failure-fixtures.ts             → 0 vi.mock calls
```

Both files import only:
- `vitest`
- `../judgment-availability` (BTAR-003 seam)
- `../chat-trust-context` (BTAR-006 seam)
- `../chat-ai-response-finalizer` (BTAR-006 seam)
- `../judgment-prompt-package` (BTAR-004 seam)
- `../ai-output-safety-gate` (BTAR-005 seam)
- `./fixtures/chat-failure-fixtures` (local)

Neither file imports `chat/service.ts`, `services/ai-service`, `services/market-data`, `services/project-investigation-service`, or `services/judgment`.

### 13.6 Provider-Call Note

```text
No real provider calls occurred.
```

Structurally guaranteed: the regression suite has zero provider imports and zero `vi.mock(...)` calls. There is nothing to mock because there is nothing that would otherwise call a provider.

### 13.7 Response-Shape Note

No production code changed. Response shape unaffected. Plan 2.2 §16 preferred rule satisfied trivially.

### 13.8 Plan 2.1 First-Principle Proof

> "The user-facing AI response must never pretend structured judgment exists when the structured judgment path failed, degraded, timed out, or became unavailable."

Evidence:
- Class A + Class D5 jointly prove: when `produceJudgment` throws (via `JUDGMENT_ENGINE_THROW`), governed-thesis language in AI output is mechanically rewritten into the canonical unavailable disclosure. Regression of TF-001 / TF-003 / TF-006 at the UNAVAILABLE branch is now detected.
- Class B proves: empty judgment is treated as UNAVAILABLE with required disclosure. Regression of TF-004 is detected.
- Class C proves: degraded context requires disclosure and blocks confidence inflation. Regression of TF-002 / TF-003 is detected.
- Class E5 + E6 prove: prompt package invariants are runtime-enforced; future code that tampers with UNAVAILABLE judgment or drops DEGRADED disclosure_required is caught.
- Class F proves: the suite is structurally insulated from F-2 cascade — it imports zero providers and zero full-service paths.

### 13.9 Plan 2.2 Surface Mapping Proof

Touched only: P2-S08 (two new test files under `__tests__/`). P2-S01 NOT touched. P2-S04 NOT touched. `services/judgment/*` NOT touched. P2-R01/P2-R02 NOT touched. P2-F01..F03 NOT touched. Required Plan 2.2 §12.3 caution language present in `chat-failure-regression.test.ts` docblock ("This is a failure-path regression suite, not a chat service rewrite and not a new runtime."). Plan-2.2-INV-01 satisfied.

### 13.10 Plan 2.3 OOS Proof

Zero OOS-001..018 crossings. No new runtime / no chat-service rewrite / no `*-v2.ts` / no `*-final.ts` / no parallel runtime. No CIP.1, no L13/L14 migration, no Strategy Lab, no Chart Canvas, no plugin systems, no agent builder, no real-API integration, no calibration ecosystem, no alert platform, no broad cleanup, no new L*.X, no real-provider tests, no frontend integration, no unrelated performance work, no full observability platform, no full external fan-out redesign, no compliance policy engine. Plan-2.1-INV-02 satisfied (zero `src/l*/` diff).

### 13.11 Residual Findings

| Finding | Status After BTAR-007 | Notes |
| --- | --- | --- |
| F-1 (`intentClassification.processingTimeMs` mismatch) | **STILL_OPEN** | Production code unchanged. |
| F-2 (27-mock chat-service coupling) | **PARTIALLY_RESOLVED_TRUST_SEAMS** (unchanged) | Reducing full-service test mock count further is Plan 2.3 OOS-011 territory. |
| F-3 (silent-continue / fallback pattern) | **RESOLVED** at the judgment site (BTAR-003); unchanged |
| F-4 (per-message external fan-out) | **STILL_OPEN** | BTAR-008 target. |
| F-5 (integration oracle limited by F-2 cascade) | **RESOLVED_SEAM_REGRESSION_ORACLE** (upgraded by BTAR-007) | The 24 seam regression tests (BTAR-007) + 24 seam unit tests (BTAR-006) + 73 helper unit tests (BTAR-003/004/005) = 121 deterministic seam-level tests. Trust-oracle regression is now mechanically detectable without F-2 cascade. Full-service end-to-end oracle still depends on F-2; that is BTAR-008/later territory and is a separate concern from the trust-oracle. |
| F-6 (undetected live-CoinGecko path through `project-investigation-service`) | **RESOLVED** by BTAR-004; mock retained in all integration tests |

No new findings filed by BTAR-007.

### 13.12 Done Definition Check (per §12)

| Criterion | Status |
| --- | --- |
| chat-failure-regression.test.ts + chat-failure-fixtures.ts exist | ✅ |
| Test classes A, B, C, D, E, F all covered | ✅ (4 / 3 / 5 / 5 / 6 / 1 = 24 tests; all targets met or exceeded) |
| Suite uses 0 module mocks | ✅ (verified by file inspection) |
| Suite does not import chat/service.ts | ✅ (verified by file inspection) |
| Suite makes no real provider calls by construction | ✅ (zero provider imports) |
| All new tests pass | ✅ (24/24) |
| All BTAR-002/003/004/005/006 seam + integration + smoke tests pass | ✅ (102/102 pre-BTAR-007 + 24 new = 126/126) |
| pnpm check:backend exits 0 | ✅ |
| No response shape break | ✅ |
| No new runtime / no chat rewrite / no L*.X diff | ✅ |
| No frontend changes | ✅ |
| Findings F-2 / F-5 updated honestly | ✅ (§13.11: F-2 unchanged at PARTIALLY_RESOLVED_TRUST_SEAMS; F-5 upgraded to RESOLVED_SEAM_REGRESSION_ORACLE with honest scope qualifier) |

**All criteria satisfied.**

### 13.13 Next Phase 2 BTAR

Per Plan 2.0 roadmap §12:

```text
BTAR-008 — Runtime Trust Evidence + External Fan-Out Review (optional/deferable per Plan 2.0 §11.7)
```

After BTAR-007's completion the Phase 2 required-BTAR set (BTAR-003/004/005/006/007) is closed. BTAR-008 is the optional external-fan-out review targeting F-4. If deferred, the Phase 2 done definition can proceed toward **P2TG-001** (Phase 2 Transition Gate). BTAR-008 is **not** admitted by BTAR-007's completion.

---

## 14. Acceptance Block (Admission)

```text
BTAR: 007 — Failure-Path Regression Suite
Status: APPROVED — NOT_STARTED
Created: 2026-05-25
Authority: Plan 2.0 roadmap §11; Plan 2.1 / 2.2 / 2.3
Eight-question gate: TAD-A (ADMIT)
Plan 2.2 §11 Surface Boundary Mapping: COMPLETE (§4)
Plan 2.3 §25 Q1..Q5 OOS check: PASS (§4)
Plan 2.1 §6.2 mission trace: COMPLETE (§3)
Required caution language: PRESENT (§4)
Forbidden surfaces confirmed absent: P2-F01..F03 + src/l13/ + src/l14/ + parallel runtime variants
Honesty pin: regression suite only; production source unchanged (preferred)
Next operational step: Step 3 (create fixtures file)
```
