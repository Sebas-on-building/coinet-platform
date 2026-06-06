# Phase 2 Findings Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Phase 1 BTAR completion records)
**Source Plan:** `phase-2/phase-2-general-plan-live-judgment-chat-ai-trust.md` (Plan 2.0)
**Phase:** Phase 2 — Live-Path Trust Hardening
**Last Updated:** 2026-05-25 (BTAR-008 F-4 update to MAPPED_FOR_FUTURE_PROVIDER_HARDENING)

> Tracks every Phase 2 finding (deferred problem discovered during Phase 1 BTAR work or discovered during Phase 2 itself). Each finding maps to one or more Phase 2 BTARs that will resolve it.

---

## 1. Origin

Findings are discovered during BTAR implementation under Plan 1.10 §13.3 Pattern B (Trojan-Horse Cleanup) discipline — when a BTAR surfaces a problem outside its admitted scope, the discoverer **does not fix it**; the discoverer **records it as a finding** and continues with the admitted task.

The four initial Phase 2 findings (F-1..F-4) come from BTAR-002 §21.8. Future findings will be appended as discovered.

---

## 2. Findings Index

| Finding ID | Source         | Description                                                                                          | Status   | Phase 2 target  |
| ---------- | -------------- | ---------------------------------------------------------------------------------------------------- | -------- | --------------- |
| F-1        | BTAR-002 §21.8 | Chat service reads `intentClassification.processingTimeMs` at `service.ts:166`, but the field is not declared on `IntentClassification` interface in `services/intent-classifier`. Service consumes an undocumented field. | **OPEN** | BTAR-003 (type-truth + silent-fallback fix combined) |
| F-2        | BTAR-002 §21.8 | `ChatService.sendMessage` required 27 module mocks for service-level testing, well above Plan 1.6 §17.1 10-mock threshold. Service is over-coupled for safe Phase 2 hardening. Recommended fix: thin "live context fetch" seam that reduces mock surface from 27 to ~3. | **PARTIALLY_RESOLVED_TRUST_SEAMS** (BTAR-006, 2026-05-25) | BTAR-006 extracted `buildChatTrustContext` + `finalizeChatAIResponse`; their unit tests use **0 module mocks** and do not import `chat/service.ts`. Trust-critical behavior is now testable in isolation. Full-service tests still require the 27-mock cascade for context-fetch / intent / symbol-detection / response-assembly orchestration; reducing those is Plan 2.3 OOS-011 territory (full chat-service rewrite). |
| F-3        | BTAR-002 §21.8 | Silent-continue/fallback pattern in chat service: logs `❌ CRITICAL: Failed to fetch live context for AI` then continues past the failure, eventually throwing several lines later when accessing a property of the failed context object. Failure is not surfaced at the moment of occurrence. | **RESOLVED — ADDRESSED_BY_BTAR-003** (at the judgment-engine site, `service.ts:1033–1190`; other silent-continue sites elsewhere in `service.ts` remain for future BTARs) | BTAR-003 (silent fallback removal — primary Phase 2 target) |
| F-4        | BTAR-002 §21.8 | Every chat message triggers per-message external API fan-out (CoinGecko, alternative.me, RSS aggregators, social services, etc.) with no caching, no short-circuit, no fan-out control. Reliability and performance concern. | **MAPPED_FOR_FUTURE_PROVIDER_HARDENING** (BTAR-008B, 2026-05-25) | BTAR-008B `chat-external-fanout-review.md` enumerates 36 external-context services (FAN-001..FAN-036) across 11 categories with per-service classifications: `required_for_v1_chat` (REQUIRED / OPTIONAL_CONTEXT_ENRICHMENT / UNKNOWN_REQUIRES_TRIAGE), `current_failure_behavior`, `recommended_failure_behavior`, `should_be_cached_later`, `future_api_cost_risk`. FAN-020 = investigation-service caching candidate (production-side mitigation of F-6 root path). FAN-036 = `aiService` (OpenAI/Grok) HIGH cost risk. The 36-row inventory is the canonical input for any future provider-routing / caching / fan-out-control BTAR. Review-only artifact; **no provider behavior changes were made by BTAR-008**, and reliability/performance fixes remain future-BTAR work. |
| F-5        | BTAR-003 §18.10 | Integration-level failure-path oracle (`chat-judgment-failure-path.test.ts`) cannot deterministically drive the chat service through to `produceJudgment` because the 27-mock surface (F-2) requires precise shape matching at every layer (enterprise-market-data, sentiment, news, etc.). The deterministic helper unit tests (25/25 passing in `judgment-availability.test.ts`) are the definitive proof of the availability contract; the integration test enforces a conditional oracle (full assertions when `produceJudgment` is reached; smoke-level "no silent undefined" assertion otherwise). Full integration-level failure-path coverage requires F-2 resolution. **Re-confirmed by BTAR-004 §18.10**: same condition observed in `chat-prompt-package-integration.test.ts`; package-derived integration oracle is also conditional-skip under F-5. The 23/23 unit tests in `judgment-prompt-package.test.ts` remain the definitive package contract proof. | **RESOLVED_SEAM_REGRESSION_ORACLE** (BTAR-007, 2026-05-25; was PARTIALLY_RESOLVED_TRUST_ORACLE at BTAR-006) | BTAR-007 added 24 failure-path regression tests on top of BTAR-006's 24 seam tests. Combined with the 73 BTAR-003/004/005 helper unit tests, the trust-oracle is now backed by **121 deterministic seam-level tests** that mechanically detect regression of TF-001..TF-008 without the F-2 cascade. The seam regression-oracle is RESOLVED. The full-service end-to-end oracle still depends on F-2 (the 27-mock cascade), but that is a separate concern from the trust-oracle and remains BTAR-008 / later territory. |
| F-6        | BTAR-004 §18.5 / §18.10 | Undetected live-CoinGecko call path through `services/project-investigation-service`. The chat service's OmniScore catastrophic-error fallback invokes `investigateProject` (service.ts:923 / :976 / :1022), which made real CoinGecko HTTP calls in the BTAR-004 integration test before the mock was added. This is a Plan 2.2 §14.3 violation by absence — the 27-mock surface (F-2) had no mock for this service. **Resolved within BTAR-004**: `project-investigation-service` mock added to BTAR-004 integration test + defensively to BTAR-003 failure-path test. Post-fix re-validation confirmed zero real provider calls across all 5 chat test files. Tightening of test-boundary discipline. | **RESOLVED — ADDRESSED_BY_BTAR-004** | BTAR-004 (mocks landed); future BTAR-006 should consider production-side caching/short-circuit so the investigation fallback does not silently fan out per-message |
| F-7        | Verdict-depth Phase 1 (post-P3TG-001 product work, 2026-06-06) | `projectJudgmentFields()` in `judgment-prompt-package.ts` read **non-existent** paths for two of the seven judgment fields: `cause.primary.summary` / `cause.summary` / `cause.primary` and `scenario.primary.summary` / `scenario.summary`. The real `JudgmentOutput` (services/judgment/types.ts) exposes `cause.{dominant_cluster, positive_drivers[], negative_drivers[]}` (each driver `{family, strength, summary}`) and `scenario.{base_case, bullish_confirmation, bearish_failure, next_trigger}` — there is no `cause.primary`/`cause.summary` nor `scenario.primary`/`scenario.summary`. Consequence: **CAUSE and SCENARIO have projected to `undefined` since BTAR-004** — never reaching the rendered AI prompt (renderer lines 259/264 had nothing to emit) nor, later, the `ChatVerdict` card. The unit test (`judgment-prompt-package.test.ts`) never asserted cause/scenario; the integration + verdict fixtures (`chat-prompt-package-integration.test.ts`, `chat-verdict.test.ts`) used the **same fabricated shapes**, enshrining the bug (same class as the getGlobalMarketData silent-pass caught in commit 57fe2bb). | **RESOLVED** (Verdict-depth Phase 1, 2026-06-06) | Corrected projector to read the real paths: cause = dominant-cluster-aligned driver summary → highest-strength driver summary → `dominant_cluster` label; scenario = `base_case` → `next_trigger`. Corrected both fixtures to the real `JudgmentOutput` shape and **added 4 regression tests** (dominant-cluster win, strength fallback, label fallback, scenario base_case→next_trigger, plus a guard asserting the legacy `primary.summary` shape now yields nothing). Invariants, renderer, DTO, and card **untouched** (flat-string shape preserved; structural widening is Verdict-depth Phase 2). Validation: 35/35 targeted (projector + verdict + integration) · `test:ci` 384/384 across 21 files · `check:backend` typecheck exit 0. |
| F-8        | Verdict-depth Phase 1 (2026-06-06) | `chat-prompt-package-integration.test.ts` test **"when produceJudgment succeeds, the chat path passes a package-derived AI context"** actually runs the **UNAVAILABLE** path: the `../../../services/whale-data` mock lacks a `getWhaleActivityForToken` export, so the judgment block throws (`No "getWhaleActivityForToken" export is defined on the mock`) → availability `UNAVAILABLE` → yet the test passes. Same "silently passing on the failure path" class as the getGlobalMarketData mock gap (resolved via 57fe2bb). Means the integration test does not actually exercise the AVAILABLE package projection (incl. the F-7 cause/scenario fix); the genuine cause/scenario coverage comes from the projector unit + verdict unit tests. | **RESOLVED** (Verdict-depth Phase 2a, 2026-06-06) | Added `getWhaleActivityForToken` (realistic accumulating activity) + `deriveWhaleNetFlowUSD` to the whale-data mock. The integration test now runs the real **AVAILABLE** path end-to-end (runtime log: `judgment_status:AVAILABLE`, `judgment_source:structured`, `safety_gate_result:ALLOW`) and the `judgmentExercised && aiCalls>0` branch asserts the package-derived AVAILABLE context. Also corrected the `beforeEach` re-arm fixture (6-space copy Phase-1's 4-space `replace_all` missed) to the real `JudgmentOutput` shape. |
| F-9        | Verdict-depth Phase 2a (2026-06-06) | Structured-depth widening of the governed verdict projection. `CoinetJudgmentPromptPackageJudgment` carried only **7 flat headline strings**, so the card + AI prompt lost the engine's real depth: contradictions surfaced as a bare count (not class/severity/resolvable items), confidence had no 4-axis breakdown, timing had no score/position/maturity, scenario had no branches, and the whitepaper's **24h-signal** + **failure-condition** never reached the client at all. Also `describeConfidenceBand` (numeric→band) was dead code — the engine emits `confidence.overall` as a controlled band string. | **RESOLVED** (Verdict-depth Phase 2a, 2026-06-06) | Additive widening (Option A — single governed package source feeds both renderer and `toChatVerdict`): added grouped `*_detail` objects (state/cause/thesis/timing/scenario/confidence) + `contradiction_items[]`/`load`/`structural_warning` + derived `signal_24h`/`failure_condition`, all pure projections of existing `JudgmentOutput` (Step-0-verified populated; `signal_24h`/`failure_condition` prefer `scenario.horizons['24h']`, fall back to `bullish_confirmation`/`bearish_failure`). `hasAnyJudgmentField` extended to cover every new field so the UNAVAILABLE invariant (invariant 2) stays airtight (regression test added). Renderer emits the depth into the AI prompt; `ChatVerdict.fields` now references the package judgment type (backend in lockstep). Removed dead `describeConfidenceBand` + its numeric path; corrected numeric-confidence fixtures across 4 test files to the real string-band shape. Invariants 1/3/4/5 untouched. Validation: `test:ci` **389/389 across 21 files** · `check:backend` typecheck exit 0. Frontend (`api.ts` mirror + `JudgmentVerdictCard` rendering) is Verdict-depth **Phase 2b**. |

---

## 3. Status Definitions

- **OPEN** — finding documented; resolution BTAR not yet admitted or in progress.
- **IN PROGRESS** — resolution BTAR admitted and being implemented.
- **RESOLVED** — resolution BTAR COMPLETED; finding closed with evidence link.
- **DEFERRED** — finding moved to a post-Phase-2 backlog (e.g., F-4 if BTAR-008 is deferred per §11.7).
- **REOPENED** — previously RESOLVED finding discovered to be unfixed; back to OPEN with audit note.

---

## 4. Findings Discovery Discipline (Plan 1.10 §13.3 Pattern B)

When a Phase 2 BTAR (or any future BTAR) discovers a new problem outside its admitted scope:

```text
1. STOP — do not fix the discovered problem inside the current BTAR.
2. Record the discovery as a new finding (F-N) in this registry.
3. Cite the discovering BTAR section in the "Source" column.
4. Identify a likely target BTAR (existing or future).
5. Continue with the current admitted task.
6. The new finding is admitted via its own BTAR or rolled into a target BTAR.
```

This discipline prevents scope expansion (Trojan-Horse Cleanup) and keeps each BTAR honestly bounded.

---

## 5. Finding-to-BTAR Mapping (Anticipated)

```text
F-1   →  BTAR-003   (mocked away in test only; production fix STILL_OPEN → future intent-classifier or BTAR-006)
F-2   →  BTAR-006   (PARTIALLY_RESOLVED_TRUST_SEAMS 2026-05-25; full-service coupling residual)
F-3   →  BTAR-003   (RESOLVED at judgment-engine site, 2026-05-24)
F-4   →  BTAR-008B  (MAPPED_FOR_FUTURE_PROVIDER_HARDENING 2026-05-25; 36-row inventory in chat-external-fanout-review.md; no provider behavior change yet)
F-5   →  BTAR-007   (RESOLVED_SEAM_REGRESSION_ORACLE 2026-05-25; 121 deterministic seam-level tests; full-service oracle separate concern)
F-6   →  BTAR-004   (RESOLVED 2026-05-25; investigation-service live-call path mocked)
```

Note: F-1 and F-3 both resolve through BTAR-003 because they are the same root cause (chat service consuming undocumented fields and continuing past failures). BTAR-003's scope per Plan 2.0 §11.1 explicitly covers both.

---

## 6. Synchronization

When a finding's status changes (e.g., OPEN → IN PROGRESS → RESOLVED), update:

- This registry (status column + add resolution evidence row if RESOLVED)
- The resolving BTAR's record (completion proof citing the finding)
- `phase-2/registries/phase-2-btar.registry.md` (the BTAR's status reflects the finding work)
- `phase-1/registries/backend-v1-decision-log.registry.md` (when finding is RESOLVED, log it)

---

## 7. Append-Only Discipline

This registry is append-only at the row level. Past findings are never deleted. If a finding is reopened, a new audit row records the reopening; the original row remains visible.

---

## 8. New Finding Template

When a new finding is discovered:

```text
| F-N  | <BTAR-NNN §section> | <One-sentence description of the problem, plus concrete evidence reference (file:line if applicable)> | OPEN | <likely target BTAR> |
```

Append below the F-1..F-4 baseline rows. Update §5 anticipated mapping if the target BTAR is among BTAR-003..008.

---

*This registry is Level 4. Plan 2.0 §1.3 cites these four findings as the motivating evidence for the Phase 2 mission. Each finding will be tracked through to RESOLVED status (or DEFERRED with reassessment trigger) before P2TG-001 can return P3-READY.*
