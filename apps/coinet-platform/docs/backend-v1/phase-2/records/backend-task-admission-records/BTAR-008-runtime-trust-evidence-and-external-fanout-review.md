# BTAR-008 — Runtime Trust Evidence + External Fan-Out Review

Type: BTAR (Backend Task Admission Record)
Status: COMPLETED — RUNTIME_TRUST_EVIDENCE_ACTIVE_AND_FANOUT_REVIEWED
Phase: Phase 2 — Live Judgment / Chat / AI Trust
Created: 2026-05-25
Last Updated: 2026-05-25
Completed: 2026-05-25
Owner: Backend program owner
Mission Trace: Plan 2.1 §1.2 ("testable" + "explicit"); supports operational debug + future provider-purchase decisions

Depends On / Inherits From:
- Plans 1.1–1.10 ACTIVE
- Plan 1.11 / 1.12 COMPLETED
- Plan 2.0 long-form + roadmap ACTIVE
- Plan 2.1 / 2.2 / 2.3 ACTIVE
- BTAR-003..007 all COMPLETED (Phase 2 required-BTAR set closed)

Inheritance audit: Plans 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 2.0 (both), 2.1, 2.2, 2.3 — all ACTIVE/COMPLETED at admission.

---

## 1. One-Sentence Mission

> **BTAR-008 adds minimal inspectable runtime trust evidence for chat responses and documents the external service fan-out of the live chat path so Coinet can prove what trust state was used, whether degradation/safety gating happened, and which provider calls must remain required, optional, degraded, cached, or deferred before future API spending.**

### 1.1 Structure

```text
BTAR-008A — Minimal Runtime Trust Evidence (code + tests + optional service log)
BTAR-008B — External Fan-Out Reliability Review (documentation artifact only)
```

Both delivered under a single BTAR-008 record. Optional per Plan 2.0 §11.7; addresses F-4 (fan-out) and adds operational observability for BTAR-003..007 safeguards.

### 1.2 Honesty Pin

This is not L14 telemetry, not a calibration loop, not an analytics platform, not a database persistence layer, and not provider integration. The runtime evidence builder is **pure / deterministic / metadata-only**. The fan-out review is **documentation only** — no provider behavior changes.

---

## 2. Plan 2.1 Mission Trace

| Field | Value |
| --- | --- |
| Mission clause(s) advanced | "testable" + "user-facing response behavior … explicit" (Plan 2.1 §1.2) |
| First principle obligation strengthened | Operational visibility of §2.4 enforcement at runtime (was the gate fired? was disclosure required? was fallback used?) |
| Truth class boundary strengthened | All three classes — evidence records which class each chat turn resolved into |
| Trust failure(s) targeted | TF-002 (hidden degradation visibility), TF-003 (confidence inflation auditability), TF-004 (unsafe expression visibility), TF-005 (fabricated evidence review support), TF-007 (operational proof), TF-008 (hidden trust-boundary behavior visibility) |
| Availability law interaction | CONSUMES BTAR-003 availability state; CONSUMES BTAR-004 package version; CONSUMES BTAR-005 gate decision; CONSUMES BTAR-006 trust-context + finalizer results |
| Non-replacement compliance | Confirmed: zero files under `src/l5..src/l14/` touched; no L14 telemetry imports |

---

## 3. Plan 2.2 Surface Boundary Mapping

```text
## Surface Boundary Mapping
```

| Surface | Permission | Use in BTAR-008 |
| --- | --- | --- |
| `src/api/chat/chat-runtime-trust-evidence.types.ts` (P2-S12 new) | P2-OPEN | Evidence type contract |
| `src/api/chat/chat-runtime-trust-evidence.ts` (P2-S12 new) | P2-OPEN | Pure evidence builder + sanitizer + assertNoSensitive |
| `src/api/chat/__tests__/chat-runtime-trust-evidence.test.ts` (P2-S08 new) | P2-OPEN | Unit tests (15–20 target) |
| `src/api/chat/service.ts` (P2-S01) | P2-TOUCH_WITH_BOUNDS | Optional: log sanitized evidence after `finalizeChatAIResponse` |
| `src/api/chat/chat-trust-context.ts` (P2-S12 existing) | P2-OPEN | Input source; no redesign |
| `src/api/chat/chat-ai-response-finalizer.ts` (P2-S12 existing) | P2-OPEN | Input source; no redesign |
| `docs/backend-v1/phase-2/chat-external-fanout-review.md` (Docs new) | n/a | Fan-out review artifact (BTAR-008B) |

**Touched surfaces declared.** Diff scope: 3 new code files + 1 new docs file + bounded `service.ts` evidence-logging edit.

**Forbidden surfaces confirmed absent.** P2-F01..F03 not touched. `src/l13/` and `src/l14/` not touched. `services/ai-service.ts` not touched. `services/judgment/*` not touched. No schema, no CI, no frontend.

**Required caution language** (Plan 2.2 §12.3 + spec §7):

```text
This is minimal runtime trust evidence, not L14 telemetry, not analytics, and not a calibration system.
This review maps external chat-path service calls; it does not buy APIs, add providers, rewrite routing, or implement caching.
```

**Plan 2.3 OOS check (Q1..Q5):**

| Q | Answer |
| --- | --- |
| Q1. Touches any OOS item? | **No.** All work in P2-S01 / P2-S08 / P2-S12 / Docs. |
| Q2. If yes, which OOS-NNN? | n/a |
| Q3. Allowed / forbidden / exception-required? | ALLOWED |
| Q4. Required caution language? | **Yes** (§3 above) |
| Q5. Creates new architecture / service variant / provider dependency? | **No.** Two new helper files + tests + a docs review. |

---

## 4. Plan 2.3 OOS Confirmation

Zero OOS-001..018 crossings. No full L14 telemetry (OOS-008). No full chat-service rewrite (OOS-011). No `*-v2.ts` / `*-final.ts` / parallel runtime. No CIP.1, no L13/L14 migration, no Strategy Lab, no Chart Canvas, no plugin systems, no agent builder, no real-API integration (OOS-007), no calibration ecosystem (OOS-008), no advanced alert platform (OOS-009), no broad cleanup (OOS-010), no new L*.X (OOS-015), no real-provider tests (OOS-016), no frontend integration (OOS-017), no unrelated performance work (OOS-018). No analytics warehouse, no observability platform, no fan-out refactor (review only).

---

## 5. Files Plan

### 5.1 New Files

```text
apps/coinet-platform/src/api/chat/chat-runtime-trust-evidence.types.ts                  ~50 LOC
apps/coinet-platform/src/api/chat/chat-runtime-trust-evidence.ts                       ~150 LOC
apps/coinet-platform/src/api/chat/__tests__/chat-runtime-trust-evidence.test.ts         15–20 tests, 0 module mocks
apps/coinet-platform/docs/backend-v1/phase-2/chat-external-fanout-review.md             review document
```

### 5.2 Modified Files

```text
apps/coinet-platform/src/api/chat/service.ts
  - Add import for buildChatRuntimeTrustEvidence
  - After finalizeChatAIResponse, build sanitized evidence and log via logger.info
  - Target diff: ≤15 LOC net
```

### 5.3 NOT Touched

```text
src/api/chat/chat-trust-context.ts
src/api/chat/chat-ai-response-finalizer.ts
src/api/chat/judgment-prompt-package.ts
src/api/chat/ai-output-safety-gate.ts
src/api/chat/judgment-availability.ts
src/services/ai-service.ts
src/services/judgment/*
src/api/chat/types.ts (preferred not to touch)
```

### 5.4 Forbidden

```text
src/l13/**, src/l14/**, src/index.ts, prisma/schema.prisma, apps/client-web/**, .github/workflows/**, root package.json, tsconfig.json
l14-telemetry-adapter.ts, chat-analytics-runtime.ts, provider-router-v2.ts, fanout-manager-final.ts, chat-service-v2.ts, ai-service-v2.ts, judgment-engine-final.ts
```

---

## 6. Evidence Type Contract Summary

`chat-runtime-trust-evidence.types.ts`:

```ts
ChatRuntimeTrustEvidence = {
  policy_version: 'chat-runtime-trust-evidence.v1',
  judgment_status,                  // from BTAR-003
  judgment_source,                  // structured | partial | unavailable
  judgment_duration_ms?, judgment_failure_reason?,
  degraded_components[], failed_components[],
  ai_provider_used?,
  safety_gate_result,               // from BTAR-005
  safety_gate_violations[],         // from BTAR-005
  safety_gate_changed_output,       // from BTAR-006 finalizer
  fallback_used, degradation_disclosed, unavailable_disclosed,
  policy_versions: { availability, prompt_package, output_safety_gate, runtime_evidence },
  sensitive_fields_stored: false,   // type-pinned to literal `false`
}
```

Helper functions: `buildChatRuntimeTrustEvidence`, `sanitizeChatRuntimeTrustEvidence`, `assertNoSensitiveRuntimeEvidence`, plus testable detectors `inferJudgmentSource` / `detectDegradationDisclosure` / `detectUnavailableDisclosure`.

---

## 7. Sensitive-Data Prohibition (Spec §15)

Evidence must NEVER include: raw prompt, rendered AI context, raw user message, API keys, authorization headers, cookies, wallet data, raw provider payloads, PII. `sensitive_fields_stored` is type-pinned to literal `false` and asserted at test time.

---

## 8. Test Plan (15–20 tests, 0 module mocks)

Required cases:

1. AVAILABLE trust context → structured judgment evidence
2. DEGRADED → partial evidence
3. UNAVAILABLE → unavailable evidence
4. Safety gate decision captured
5. Safety gate violations captured
6. `safety_gate_changed_output` captured
7. Degraded components preserved
8. Failed components preserved
9. Degradation disclosure detection (positive + negative)
10. Unavailable disclosure detection (positive + negative)
11. Policy versions present (all 4 + runtime_evidence v1)
12. No raw prompt / rendered context stored
13. No provider keys / private fields stored
14. `sensitive_fields_stored: false` always
15. Sanitizer preserves allowed fields only
16. `assertNoSensitiveRuntimeEvidence` rejects tampered evidence with raw_prompt-like field
17. Deterministic build (same input → same evidence)
18. `inferJudgmentSource` mapping table
19. `detectDegradationDisclosure` + `detectUnavailableDisclosure` regex sanity

---

## 9. Fan-Out Review (BTAR-008B)

`docs/backend-v1/phase-2/chat-external-fanout-review.md` — 13-section review per spec §20:

- 0. Identity / 1. Purpose / 2. Non-goals / 3. Method
- 4. Active chat path summary
- 5. External fan-out inventory table (per spec §21 schema: fanout_id / service_or_module / called_from / purpose / provider_or_external_dependency / required_for_v1_chat / current_failure_behavior / recommended_failure_behavior / should_block_response / should_degrade_response / should_be_cached_later / test_mock_requirement / future_api_cost_risk / notes)
- 6. Required vs optional classification (per spec §22 vocabulary)
- 7. Failure behavior classification (per spec §22 vocabulary)
- 8. Degradation recommendation
- 9. Future caching recommendation
- 10. Test/mock requirement
- 11. Provider purchase implications
- 12. Open risks
- 13. Done definition

Inventory is **evidence-based** (extracted from actual `service.ts` imports + call sites). Use `UNKNOWN_REQUIRES_TRIAGE` where evidence is insufficient. No provider code modified.

---

## 10. Validation Commands

```bash
pnpm check:backend
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/chat-runtime-trust-evidence.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/
```

Expected: all green, no regression in BTAR-002/003/004/005/006/007 baselines.

---

## 11. Rollback Path

Single PR revert. Removes 3 new code files + 1 docs file. Reverts the small `service.ts` evidence-log line. No production state mutated; no schema/CI/external state changes.

---

## 12. Done Definition (Spec §33 condensed)

```text
Runtime evidence types + builder + tests exist.
AVAILABLE / DEGRADED / UNAVAILABLE evidence is test-proven.
Safety gate decision + violations captured in evidence.
No sensitive raw data stored (sensitive_fields_stored: false).
Fan-out review document exists with inventory table + classifications.
F-4 updated honestly (likely MAPPED_FOR_FUTURE_PROVIDER_HARDENING).
All Phase 2 tests pass; pnpm check:backend exits 0.
No L*.X imports; no provider behavior changes; no real API integration; no frontend changes.
```

---

## 13. Completion Section

### 13.1 Canonical Completion Claim

```text
BTAR-008 COMPLETED — RUNTIME_TRUST_EVIDENCE_ACTIVE_AND_FANOUT_REVIEWED
```

### 13.2 Files Changed (Final)

New code files:

```text
apps/coinet-platform/src/api/chat/chat-runtime-trust-evidence.types.ts                  ~75 LOC
apps/coinet-platform/src/api/chat/chat-runtime-trust-evidence.ts                       ~200 LOC
apps/coinet-platform/src/api/chat/__tests__/chat-runtime-trust-evidence.test.ts         28 tests, 0 module mocks
```

New documentation file:

```text
apps/coinet-platform/docs/backend-v1/phase-2/chat-external-fanout-review.md             14-section review, 36 fan-out rows
```

Modified files (bounded):

```text
apps/coinet-platform/src/api/chat/service.ts
  - Added import: buildChatTrustContext, ChatTrustContext (chat-trust-context)
  - Added import: buildChatRuntimeTrustEvidence (chat-runtime-trust-evidence)
  - Hoisted: chatTrustContext alongside existing chatJudgmentPackage hoist
  - 3 assignments inside the judgment branches (AVAILABLE / falsy / throw) capturing trustContext
  - After finalizeChatAIResponse logger.warn block: built sanitized runtimeTrustEvidence and emitted logger.info
  - Net diff: ≤20 LOC; no behavior change to provider call, prompt, finalization, or response shape
```

Untouched (confirmed):

```text
src/l5/** … src/l14/**       (zero diff — Plan-2.1-INV-02 satisfied)
src/services/ai-service.ts
src/services/judgment/*
src/api/chat/judgment-availability.ts
src/api/chat/judgment-prompt-package.ts
src/api/chat/ai-output-safety-gate.ts
src/api/chat/chat-trust-context.ts
src/api/chat/chat-ai-response-finalizer.ts
src/api/chat/types.ts
prisma/schema.prisma
apps/client-web/**
.github/workflows/**
```

### 13.3 Evidence Field Summary

`ChatRuntimeTrustEvidence` shape (BTAR-008A, type-pinned):

```text
policy_version             = 'chat-runtime-trust-evidence.v1' (literal)
judgment_status            ← BTAR-003 JudgmentAvailabilityState
judgment_source            ← derived: AVAILABLE→structured, DEGRADED→partial, UNAVAILABLE→unavailable
judgment_duration_ms?      optional, no provider data
judgment_failure_reason?   optional, structured reason code only
degraded_components[]      ← BTAR-006 trust-context (defensive copy)
failed_components[]        ← BTAR-006 trust-context (defensive copy)
ai_provider_used?          optional string label only (no key, no payload)
safety_gate_result         ← BTAR-005 AIOutputGateDecision
safety_gate_violations[]   ← BTAR-005 AIOutputSafetyViolation[] (defensive copy)
safety_gate_changed_output ← BTAR-006 finalizer result
fallback_used              boolean
degradation_disclosed      derived from finalOutput vs DEGRADATION_DISCLOSURE_PATTERNS
unavailable_disclosed      derived from finalOutput vs UNAVAILABLE_DISCLOSURE_PATTERNS
policy_versions            { availability, prompt_package, output_safety_gate, runtime_evidence }
sensitive_fields_stored    literal `false` (compile-time guarantee)
```

Forbidden-key invariant (asserted at build + sanitize): `raw_prompt`, `rendered_context`, `raw_user_message`, `user_message`, `ai_api_key`, `api_key`, `authorization`, `cookies`, `wallet_address`, `wallet_private_key`, `provider_payload`, `raw_provider_response` — all rejected by `assertNoSensitiveRuntimeEvidence`.

### 13.4 Test Results

```text
chat-runtime-trust-evidence.test.ts            28 tests   28 passed   0 mocks
Full chat suite (11 files)                    154 tests  154 passed   0 regressions
pnpm check:backend                             exit 0
```

Test class coverage:

- AVAILABLE / DEGRADED / UNAVAILABLE evidence (3)
- Safety gate decision / violations / changed_output (3)
- Component preservation: degraded + failed (2)
- Disclosure detection: degradation + unavailable, positive + negative (4)
- Policy versions presence + literal v1 pin (2)
- Forbidden-field absence: raw prompt, rendered context, keys, payload (4)
- `sensitive_fields_stored === false` literal pin (1)
- Sanitizer: allowed fields preserved + unknown fields dropped (2)
- `assertNoSensitiveRuntimeEvidence` rejects tampered evidence (2)
- Deterministic build (1)
- `inferJudgmentSource` mapping (3)
- Detector regex sanity for both disclosure types (1)

### 13.5 Mock-Count Evidence

```text
grep "vi.mock(" src/api/chat/__tests__/chat-runtime-trust-evidence.test.ts → 0 results
```

### 13.6 Sensitive-Data Audit

- `sensitive_fields_stored` is `false` literal (type-level pin), never `true`, never `boolean`.
- `assertNoSensitiveRuntimeEvidence` runs inside `buildChatRuntimeTrustEvidence` before return — self-checking.
- Evidence object never touches raw `userMessage`, `renderedPrompt`, `aiResponse.rawProviderPayload`, or any header/token field. Only structured metadata enums + counts + lists + booleans.
- The `logger.info` site receives only sanitized evidence; no provider payload is logged.

### 13.7 Fan-Out Review Summary (BTAR-008B)

`docs/backend-v1/phase-2/chat-external-fanout-review.md` — 14 sections, evidence-based (extracted from real `service.ts` imports + call sites, 50 imports inspected, 36 external-context services classified).

Inventory: **36 rows (FAN-001 … FAN-036)** across 11 categories:

```text
1. Market data                              2 rows  (CoinGecko via project-investigation-service)
2. News / sentiment                         3 rows
3. Social intelligence (Twitter family)     8 rows  (duplication signal documented)
4. Derivatives                              4 rows  (duplication signal documented)
5. On-chain / whale                         1 row
6. OmniScore + investigation                2 rows  (FAN-020 = F-6 cache recommendation)
7. Behavioral / neuroeconomic               3 rows
8. Source-systems / reasoning-context       2 rows
9. Memory / token / symbol / canonical      5 rows
10. Intent / audit                          3 rows
11. Core required                           3 rows  (FAN-036 = aiService — OpenAI/Grok, HIGH cost risk)
```

Classification vocabularies used per spec §22:
- `required_for_v1_chat`: REQUIRED / OPTIONAL_CONTEXT_ENRICHMENT / UNKNOWN_REQUIRES_TRIAGE
- `current_failure_behavior`: BLOCKS_RESPONSE / DEGRADES_SILENTLY / DEGRADES_WITH_DISCLOSURE / IGNORED_ON_ERROR
- `recommended_failure_behavior`: must match REQUIRED→BLOCKS_RESPONSE or OPTIONAL→DEGRADES_WITH_DISCLOSURE (no silent degradation recommended)
- `should_be_cached_later`: YES / NO / DEPENDS_ON_PROVIDER_COST
- `future_api_cost_risk`: HIGH / MEDIUM / LOW / NONE_KNOWN

Reviews are **documentation only**: zero provider behavior changes, zero new providers, zero caching code, zero routing changes, zero ai-service edits.

### 13.8 Plan 2.1 / 2.2 / 2.3 Proofs

- **Plan 2.1 §1.2** ("testable" + "user-facing response behavior … explicit"): runtime evidence makes BTAR-003..007 enforcement inspectable per turn (was the gate fired? was degradation disclosed? was fallback used?). First principle preserved — no behavior change.
- **Plan-2.1-INV-02 (zero L*.X diff)**: confirmed via `git status` — only `src/api/chat/*` + `docs/backend-v1/phase-2/*` + Phase 2 registries touched.
- **Plan 2.2 §11 surface mapping**: P2-S12 new (evidence types + builder), P2-S08 new (tests), P2-S01 P2-TOUCH_WITH_BOUNDS (≤20 LOC service.ts), Docs new. Forbidden surfaces P2-F01..F03 untouched.
- **Plan 2.3 §25 OOS check**: 0 OOS crossings; specifically OOS-007 (no real provider integration), OOS-008 (not L14 telemetry / not calibration / not analytics), OOS-011 (no chat-service rewrite), OOS-016 (no real-API tests), OOS-018 (no unrelated perf work).
- **Plan 2.2 §12.3 caution language**: present at top of `chat-runtime-trust-evidence.ts`, `chat-runtime-trust-evidence.types.ts`, and at top of fan-out review document.

### 13.9 Finding Updates

- **F-4 (per-message fan-out)** → **MAPPED_FOR_FUTURE_PROVIDER_HARDENING**. 36-row inventory now exists with provider classifications + cost-risk + caching candidates + REQUIRED vs OPTIONAL split. F-4 remains review-only at Phase 2 boundary; future BTARs (e.g. provider routing or caching layers) will reference this inventory.
- **F-1 (intent type mismatch)**: still **STILL_OPEN** — out of scope for BTAR-008.
- **F-2 (27-mock cascade)**: still **PARTIALLY_RESOLVED_TRUST_SEAMS** — out of scope for BTAR-008.
- **F-3 (silent fallback)**: still **RESOLVED at judgment-engine site** (BTAR-003) — unchanged.
- **F-5 (integration oracle)**: still **RESOLVED_SEAM_REGRESSION_ORACLE** (BTAR-007) — unchanged.
- **F-6 (live CoinGecko)**: still **RESOLVED** — referenced in FAN-020 as caching candidate.

### 13.10 Done Definition Check (Spec §33)

```text
[x] Runtime evidence types + builder + tests exist            (3 new files)
[x] AVAILABLE / DEGRADED / UNAVAILABLE evidence test-proven   (28/28 tests)
[x] Safety gate decision + violations captured in evidence    (BTAR-005 surfaces)
[x] No sensitive raw data stored                              (literal false + assertion + 0 forbidden keys)
[x] Fan-out review document exists with inventory + classes    (36 rows, 11 categories)
[x] F-4 updated honestly                                       (MAPPED_FOR_FUTURE_PROVIDER_HARDENING)
[x] All Phase 2 tests pass; pnpm check:backend exits 0         (154/154, exit 0)
[x] No L*.X imports; no provider behavior changes              (git status proof)
[x] No real API integration                                    (OOS-007 satisfied)
[x] No frontend changes                                        (OOS-017 satisfied)
```

### 13.11 Next Task

`P2TG-001 — Phase 2 Trust Gate` (rollout claim aggregation across BTAR-003..008). All required-BTAR-set conditions for the Phase 2 trust safeguards are now in place: availability state, prompt package + FRP, output safety gate, trust context + finalizer, failure-path regression oracle, runtime trust evidence, and external fan-out review.

---

## 14. Acceptance Block (Admission)

```text
BTAR: 008 — Runtime Trust Evidence + External Fan-Out Review
Status: APPROVED — NOT_STARTED
Created: 2026-05-25
Authority: Plan 2.0 roadmap §12; Plan 2.1 / 2.2 / 2.3
Eight-question gate: TAD-A (ADMIT)
Plan 2.2 §11 Surface Boundary Mapping: COMPLETE (§3)
Plan 2.3 §25 Q1..Q5 OOS check: PASS (§3)
Plan 2.1 §6.2 mission trace: COMPLETE (§2)
Required caution language: PRESENT (§3)
Forbidden surfaces confirmed absent: P2-F01..F03 + src/l13/ + src/l14/ + telemetry/analytics/provider-routing variants
Honesty pin: minimal evidence + documentation review only (not L14 telemetry, not analytics, not provider integration)
Next operational step: Step 3 (create chat-runtime-trust-evidence.types.ts)
```
