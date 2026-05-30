# Backend v1 Existing Backend Surface Classification Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — produced by Plan 1.8)
**Source Plan:** `phase-1/backend-v1-existing-backend-surface-inventory.md` (Plan 1.8)
**Last Updated:** 2026-05-19
**Discovery basis:** Code inspection of `apps/coinet-platform/src/` on 2026-05-19, evidence types as recorded per row.

> **First principle (Plan 1.8 §3.1):** *Do not refactor, delete, replace, or expand any backend surface until it has first been classified.* This registry is the classification; **no action is taken in Plan 1.8**.

---

## Classification Class Legend

| Class                       | Meaning                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| `V1_CORE`                   | Directly powers a Plan 1.2 V1-S0x surface; live runtime                  |
| `V1_SUPPORTING`             | Required for v1 to operate; supports core without producing intelligence |
| `DEFERRED`                  | Maps to Plan 1.3 NB-NNN entry; not required for Phases 1–3               |
| `DORMANT_ARCHITECTURE`      | Certified L5–L14 surface; not currently called by active product path    |
| `LEGACY_OR_DUPLICATIVE`     | Duplicate / version-named / overlapping implementation                   |
| `UNKNOWN_REQUIRES_TRIAGE`   | Insufficient evidence; routed to triage registry                         |

## Confidence Legend

- `HIGH` — Direct import evidence or clear naming/runtime trace.
- `MEDIUM` — Strong indirect evidence (folder pattern, semantic context).
- `LOW` — Inference from partial evidence; cross-check before action.

## Evidence Type Legend

`DIRECT_RUNTIME_PATH`, `IMPORT_TRACE`, `ROUTE_SCAN`, `NAMING_PATTERN`, `PLAN_MAPPING`, `CERTIFIED_ARCHITECTURE_LOCATION`, `PRISMA_MODEL_FAMILY`, `UNKNOWN`

---

## A. V1_CORE — Live Production Path

These surfaces are directly in the active `/api/chat → produceJudgment → ai-service` runtime path. **CRITICAL risk if modified.**

| Surface ID | Path / Pattern                                          | Classification | Conf | Evidence                         | Load-bearing  | V1 Surface   | Phase    | Risk     | Next Action               |
| ---------- | ------------------------------------------------------- | -------------- | ---- | -------------------------------- | ------------- | ------------ | -------- | -------- | ------------------------- |
| SURF-001   | `src/api/chat/service.ts`                               | V1_CORE        | HIGH | DIRECT_RUNTIME_PATH; IMPORT_TRACE | LOAD_BEARING  | V1-S01       | Phase 2  | CRITICAL | PROTECT + TEST            |
| SURF-002   | `src/api/chat/routes.ts`                                | V1_CORE        | HIGH | ROUTE_SCAN                       | LOAD_BEARING  | V1-S01       | Phase 2  | CRITICAL | PROTECT                   |
| SURF-003   | `src/api/chat/controller.ts`                            | V1_CORE        | HIGH | ROUTE_SCAN; IMPORT_TRACE         | LOAD_BEARING  | V1-S01       | Phase 2  | CRITICAL | PROTECT                   |
| SURF-004   | `src/api/chat/streaming.ts`                             | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S01       | Phase 2  | CRITICAL | PROTECT                   |
| SURF-005   | `src/api/chat/source-manager.ts`                        | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S01       | Phase 2  | HIGH     | PROTECT                   |
| SURF-006   | `src/api/chat/chart-detector.ts`                        | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S01       | Phase 2  | HIGH     | PROTECT                   |
| SURF-007   | `src/api/chat/mock-ai-response.ts`                      | V1_CORE        | HIGH | IMPORT_TRACE (degraded path)     | LOAD_BEARING  | V1-S01       | Phase 2  | MEDIUM   | TEST                      |
| SURF-008   | `src/api/chat/types.ts`                                 | V1_CORE        | HIGH | IMPORT_TRACE                     | SUPPORTING    | V1-S01       | Phase 2  | HIGH     | PROTECT                   |
| SURF-009   | `src/services/judgment/index.ts` (produceJudgment)      | V1_CORE        | HIGH | DIRECT_RUNTIME_PATH              | LOAD_BEARING  | V1-S02       | Phase 2,3 | CRITICAL | PROTECT + TEST            |
| SURF-010   | `src/services/judgment/state-engine.ts`                 | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S02       | Phase 3  | CRITICAL | PROTECT                   |
| SURF-011   | `src/services/judgment/contradiction-engine.ts`         | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S02       | Phase 3  | CRITICAL | PROTECT                   |
| SURF-012   | `src/services/judgment/confidence-engine.ts`            | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S02       | Phase 3  | CRITICAL | PROTECT                   |
| SURF-013   | `src/services/judgment/timing-engine.ts`                | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S02       | Phase 3  | CRITICAL | PROTECT (in-service, bypasses L9) |
| SURF-014   | `src/services/judgment/regime-engine.ts`                | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S02       | Phase 3  | CRITICAL | PROTECT (wraps L8)        |
| SURF-015   | `src/services/judgment/signal-snapshot.ts`              | V1_CORE        | HIGH | DIRECT_RUNTIME_PATH              | LOAD_BEARING  | V1-S02       | Phase 2,3 | CRITICAL | PROTECT                   |
| SURF-016   | `src/services/judgment/evaluator.ts`                    | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S02       | Phase 3  | HIGH     | PROTECT                   |
| SURF-017   | `src/services/judgment/taxonomies.ts`                   | V1_CORE        | HIGH | IMPORT_TRACE                     | SUPPORTING    | V1-S02       | Phase 3  | HIGH     | PROTECT                   |
| SURF-018   | `src/services/judgment/types.ts`                        | V1_CORE        | HIGH | IMPORT_TRACE                     | SUPPORTING    | V1-S02       | Phase 3  | HIGH     | PROTECT                   |
| SURF-019   | `src/services/judgment/debug-view.ts`                   | V1_CORE        | HIGH | IMPORT_TRACE (formatJudgmentForAI) | LOAD_BEARING | V1-S02, V1-S01 | Phase 2 | CRITICAL | PROTECT                   |
| SURF-020   | `src/services/ai-service.ts`                            | V1_CORE        | HIGH | DIRECT_RUNTIME_PATH              | LOAD_BEARING  | V1-S01       | Phase 2  | CRITICAL | PROTECT + Phase 2 output safety gate |
| SURF-021   | `src/services/ai-hallucination-guard.ts`                | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S01       | Phase 2  | CRITICAL | PROTECT (Phase 2 enhance) |
| SURF-022   | `src/services/hypotheses/orchestrator.ts`               | V1_CORE        | HIGH | IMPORT_TRACE (produceHypothesisOutput) | LOAD_BEARING | V1-S02 | Phase 3 | CRITICAL | PROTECT (wraps L10)       |
| SURF-023   | `src/services/hypotheses/` (full folder)                | V1_CORE        | HIGH | IMPORT_TRACE (registry, ranker, explainer, modifiers, support, invalidation, evidence-mapper, types, logging, versioning) | LOAD_BEARING | V1-S02 | Phase 3 | HIGH | PROTECT |
| SURF-024   | `src/services/canonical/` (resolver, registry, types)   | V1_CORE        | HIGH | IMPORT_TRACE (resolveCanonical)  | LOAD_BEARING  | V1-S01, V1-S02 | Phase 2 | HIGH   | PROTECT                   |
| SURF-025   | `src/services/canonicalization/` (~28 files)            | V1_CORE        | HIGH | IMPORT_TRACE (entity-confidence-model, confidence-gate imported by judgment) | LOAD_BEARING | V1-S02 | Phase 3 | HIGH | PROTECT |
| SURF-026   | `src/services/knowledge-graph/` (14 files)              | V1_CORE        | HIGH | IMPORT_TRACE (graph)             | LOAD_BEARING  | V1-S01       | Phase 2  | HIGH     | PROTECT                   |
| SURF-027   | `src/services/reasoning-context/` (5 files)             | V1_CORE        | HIGH | IMPORT_TRACE (buildReasoningContext, validateGrounding, serializeReasoningContext) | LOAD_BEARING | V1-S01 | Phase 2 | HIGH | PROTECT |
| SURF-028   | `src/services/chat-audit/`                              | V1_CORE        | HIGH | IMPORT_TRACE (logChatAudit)      | LOAD_BEARING  | V1-S01       | Phase 2  | MEDIUM   | PROTECT                   |
| SURF-029   | `src/services/intent-classifier.ts`                     | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S01       | Phase 2  | HIGH     | PROTECT                   |
| SURF-030   | `src/services/intent-handlers.ts`                       | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S01       | Phase 2  | HIGH     | PROTECT                   |
| SURF-031   | `src/services/symbol-detector.ts`                       | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S01       | Phase 2  | HIGH     | PROTECT                   |
| SURF-032   | `src/services/calibration-spine/snapshot-writer.ts`     | V1_CORE        | HIGH | IMPORT_TRACE (captureJudgmentSnapshot, wired into produceJudgment) | LOAD_BEARING | V1-S02 | Phase 3 | HIGH | PROTECT (partial L14 implementation) |
| SURF-033   | `src/services/market-data.ts`                           | V1_CORE        | HIGH | IMPORT_TRACE (fetchPricesForMessage, formatMarketDataForAI) | LOAD_BEARING | V1-S01, V1-S03 | Phase 2 | HIGH | PROTECT |
| SURF-034   | `src/services/memory-service.ts`                        | V1_CORE        | HIGH | IMPORT_TRACE                     | LOAD_BEARING  | V1-S01       | Phase 2  | HIGH     | PROTECT                   |
| SURF-035   | `src/services/source-systems/`                          | V1_CORE        | MEDIUM | IMPORT_TRACE (runBtcQuantumRisk); ROUTE_SCAN | LOAD_BEARING | V1-S03 | Phase 2 | HIGH | TRACE_DEEPER (large surface; verify all subfiles active) |

### A.1 — Mixed Monoliths

| Surface ID | Path                          | Classification | Conf | Risk     | Next Action                                               |
| ---------- | ----------------------------- | -------------- | ---- | -------- | --------------------------------------------------------- |
| SURF-100   | `src/index.ts` (6080 lines)   | V1_CORE / V1_SUPPORTING MIXED | HIGH | CRITICAL | TRACE_DEEPER; **do not touch as a whole in Phase 1**. 90+ routes including health, status, source-systems (15+), quantum-risk (10+), chat-audit, plus duplicate `produceJudgment` invocations at lines 982 and 5769. Phase 2 may extract specific handlers. |

---

## B. V1_SUPPORTING — Required Infrastructure (not intelligence)

| Surface ID | Path / Pattern                              | Classification | Conf | Evidence       | V1 Surface | Phase   | Risk   | Next Action |
| ---------- | ------------------------------------------- | -------------- | ---- | -------------- | ---------- | ------- | ------ | ----------- |
| SURF-200   | `src/db/client.ts`                          | V1_SUPPORTING  | HIGH | IMPORT_TRACE   | V1-S05     | Phase 1 | HIGH   | PROTECT     |
| SURF-201   | `src/middleware/requireAuth.ts`             | V1_SUPPORTING  | HIGH | ROUTE_SCAN     | V1-S05     | Phase 1 | HIGH   | PROTECT     |
| SURF-202   | `src/middleware/securityHeaders.ts`         | V1_SUPPORTING  | HIGH | ROUTE_SCAN     | NONE       | Phase 1 | MEDIUM | PROTECT     |
| SURF-203   | `src/middleware/rateLimit.ts`               | V1_SUPPORTING  | HIGH | ROUTE_SCAN     | NONE       | Phase 1 | MEDIUM | PROTECT     |
| SURF-204   | `src/api/auth/routes.ts`                    | V1_SUPPORTING  | HIGH | ROUTE_SCAN     | V1-S05     | Phase 1 | HIGH   | PROTECT     |
| SURF-205   | `src/utils/logger`                          | V1_SUPPORTING  | HIGH | IMPORT_TRACE   | NONE       | Phase 1 | LOW    | PROTECT     |
| SURF-206   | Prisma `User`, `Session`, `RefreshToken`, `OAuthAccount`, `TrustedDevice`, `BackupCode`, `ApiKey`, `PasswordResetToken` | V1_SUPPORTING | HIGH | PRISMA_MODEL_FAMILY | V1-S05 | Phase 1 | HIGH | PROTECT |
| SURF-207   | Prisma `Conversation`, `Message`            | V1_SUPPORTING  | HIGH | PRISMA_MODEL_FAMILY; IMPORT_TRACE | V1-S05, V1-S01 | Phase 1, 2 | HIGH | PROTECT |
| SURF-208   | `src/api/chat/__tests__` (where present)    | V1_SUPPORTING  | MEDIUM | NAMING_PATTERN | V1-S01   | Phase 1, 2 | MEDIUM | TEST (expand) |

### B.1 — Likely V1_SUPPORTING (Triage Recommended)

| Surface ID | Path                                  | Class           | Conf | Notes |
| ---------- | ------------------------------------- | --------------- | ---- | ----- |
| SURF-220   | `src/api/feedback/routes.ts`          | V1_SUPPORTING?  | MEDIUM | Likely V1-S02 supporting (judgment outcomes). Verify usage in Phase 2. |
| SURF-221   | `src/api/portfolios/routes.ts`        | V1_SUPPORTING?  | MEDIUM | Portfolio is borderline (V1-S05 if used; deferred if not). Triage. |
| SURF-222   | `src/api/retention/`                  | V1_SUPPORTING?  | LOW    | Retention semantics unclear. Triage. |

---

## C. DORMANT_ARCHITECTURE — Certified L5–L14 (zero production imports)

**Evidence:** `grep` for non-test/non-script imports of `l5/` through `l14/` from `services/` or `api/` returned zero results. The certified architecture is **not invoked by any production runtime path**. Confirmed against active path traces (Plan 1.8 §1.8.6.2).

| Surface ID | Path Family       | Classification          | Conf | Evidence                          | Risk | Next Action       |
| ---------- | ----------------- | ----------------------- | ---- | --------------------------------- | ---- | ----------------- |
| SURF-300   | `src/l5/` (8 subfolders) | DORMANT_ARCHITECTURE | HIGH | CERTIFIED_ARCHITECTURE_LOCATION; no production import | LOW | PRESERVE_DORMANT  |
| SURF-301   | `src/l6/`         | DORMANT_ARCHITECTURE    | HIGH | CERTIFIED_ARCHITECTURE_LOCATION   | LOW  | PRESERVE_DORMANT  |
| SURF-302   | `src/l7/`         | DORMANT_ARCHITECTURE    | HIGH | CERTIFIED_ARCHITECTURE_LOCATION   | LOW  | PRESERVE_DORMANT  |
| SURF-303   | `src/l8/` (13 subfolders) | DORMANT_ARCHITECTURE | HIGH | CERTIFIED_ARCHITECTURE_LOCATION; product wraps via `regime-engine.ts` (SURF-014), not L8 directly | LOW | PRESERVE_DORMANT |
| SURF-304   | `src/l9/`         | DORMANT_ARCHITECTURE    | HIGH | CERTIFIED_ARCHITECTURE_LOCATION; product uses in-service `timing-engine.ts` (SURF-013), bypassing L9 | LOW | PRESERVE_DORMANT |
| SURF-305   | `src/l10/` (16 subfolders) | DORMANT_ARCHITECTURE | HIGH | CERTIFIED_ARCHITECTURE_LOCATION; product wraps via `hypotheses/orchestrator.ts` (SURF-022), not L10 directly | LOW | PRESERVE_DORMANT |
| SURF-306   | `src/l11/` (16 subfolders) | DORMANT_ARCHITECTURE | HIGH | CERTIFIED_ARCHITECTURE_LOCATION; product uses `omniscore_v3` (legacy/duplicative) instead | LOW | PRESERVE_DORMANT |
| SURF-307   | `src/l12/`        | DORMANT_ARCHITECTURE    | HIGH | CERTIFIED_ARCHITECTURE_LOCATION   | LOW  | PRESERVE_DORMANT  |
| SURF-308   | `src/l13/` (20 subfolders) | DORMANT_ARCHITECTURE | HIGH | CERTIFIED_ARCHITECTURE_LOCATION; product uses `services/ai-service.ts` (SURF-020) directly with real OpenAI/Anthropic — bypasses L13 entirely | LOW | PRESERVE_DORMANT (selective borrowing allowed under Plan 1.4 Legal Work Class D) |
| SURF-309   | `src/l14/` (16 subfolders) | DORMANT_ARCHITECTURE | HIGH | CERTIFIED_ARCHITECTURE_LOCATION; product uses `services/calibration-spine/` (SURF-032) as partial L14 implementation; full L14 runtime never invoked | LOW | PRESERVE_DORMANT |
| SURF-310   | `src/integration/bridge-certification/` | DORMANT_ARCHITECTURE | HIGH | Bridge cert scaffolding | LOW | PRESERVE_DORMANT |
| SURF-311   | `src/integration/ajp1/` | TEST_HARNESS / DORMANT | HIGH | AJP.1 test orchestrator/fixtures | LOW | PRESERVE_DORMANT (not production runtime) |

---

## D. DEFERRED — Plan 1.3 NB-NNN Mapped

These backend surfaces map to a deferred entry. **Acting on them now is blocked** per Plan 1.3.

| Surface ID | Path / Pattern                                                    | NB Mapping | V1 Surface | Risk | Next Action |
| ---------- | ----------------------------------------------------------------- | ---------- | ---------- | ---- | ----------- |
| SURF-400   | Prisma `Plugin`, `PluginRegistry`, `PluginAnalytics`, `Review`     | NB-003     | NONE       | LOW  | DEFER (preserve dormant schema) |
| SURF-401   | Prisma `Strategy`                                                 | NB-001     | NONE       | LOW  | DEFER       |
| SURF-402   | Prisma `Agent`                                                    | NB-004     | NONE       | LOW  | DEFER       |
| SURF-403   | `src/services/calibration/` (full ecosystem beyond `calibration-spine/snapshot-writer.ts`) | NB-005 | NONE | LOW  | DEFER (do not operationalize) |
| SURF-404   | Any future provider adapter beyond minimal stubs                  | NB-008     | NONE       | LOW  | DEFER until APIs purchased |
| SURF-405   | Prisma `Alert*`, `NotificationCampaign`, `NotificationLog`, `NotificationEvent`, `NotificationPreference` | NB-009 | V1-S06 conditional | MEDIUM | DEFER advanced features; preserve minimal truthful path if used |
| SURF-406   | `src/services/connector-layer/`                                   | NB-008?    | NONE       | LOW  | TRIAGE — likely deferred provider scaffolding |
| SURF-407   | `src/services/retention/`, `src/api/retention/`                   | NB-009?    | UNKNOWN    | LOW  | TRIAGE       |
| SURF-408   | Prisma `MLModelPerformance`, `RealTimeSignalProcessing`, `SignalPatternRecognition`, `SignalCorrelation`, `MLModelPrediction`, `AIInsight*`, `AIRecommendation*`, `AIDashboardView`, `AIInsightsCache` | NB-005, NB-009 | NONE | LOW | DEFER (production-active state unverified) |
| SURF-409   | Prisma `ABTest`, `Badge`, `Referral`, `OnboardingStep`, `OnboardingAnalytics` | NB-010 | NONE | LOW | DEFER (non-essential for v1) |
| SURF-410   | Prisma `EncryptedUserData`, `UserEncryptionKey`, `EncryptionAuditLog`, `UserConsent`, `GDPRRequest`, `DataRetentionPolicy`, `DataResidencyRule` | NB-010 / compliance | UNKNOWN | MEDIUM | TRIAGE — likely V1_SUPPORTING if any are required by production code |

---

## E. LEGACY_OR_DUPLICATIVE — see dedicated registry

Full details, including the critical finding that multiple "legacy" duplicates are **currently active** in `chat/service.ts`, are recorded in:

```text
phase-1/registries/backend-v1-legacy-duplicative-surface.registry.md
```

Summary entries indexed here:

| Surface ID | Family                        | Active in chat?      | NB / VSV Trigger | Next Action |
| ---------- | ----------------------------- | -------------------- | ---------------- | ----------- |
| SURF-500   | OmniScore (5+ files)          | partially (`omniscore_v3/` only directly; older variants imported elsewhere?) | VSV-C parallel | MARK_FOR_CANONICALIZATION |
| SURF-501   | Derivatives intelligence (3 active variants) | **YES, all three concurrently** | VSV-C, VSV-J | MARK_FOR_CANONICALIZATION |
| SURF-502   | News intelligence (3 variants) | partial             | VSV-C            | MARK_FOR_CANONICALIZATION |
| SURF-503   | Social/sentiment (5+ variants) | **YES, multiple concurrently** | VSV-C, VSV-J | MARK_FOR_CANONICALIZATION |
| SURF-504   | Anomaly latency monitor (2 variants) | unknown        | VSV-A            | TRACE_DEEPER |
| SURF-505   | OmniScore data fetcher (3 variants: base, v22, v23) | unknown | VSV-A | TRACE_DEEPER |
| SURF-506   | `coinet-sentiment-index`, `csi-v4-factors`, `csi-v5-calibrated` | YES | VSV-A, VSV-J | MARK_FOR_CANONICALIZATION |
| SURF-507   | `liquidation-heatmap-v2.ts` alongside `liquidation-service.ts` | partial | VSV-A | TRACE_DEEPER |

---

## F. UNKNOWN_REQUIRES_TRIAGE — see dedicated registry

Surfaces whose classification could not be reached with high or medium confidence are recorded in:

```text
phase-1/registries/backend-v1-unknown-surface-triage.registry.md
```

---

## G. Quick Counts (as of inventory pass on 2026-05-19)

| Class                       | Count (entries) | Notes                                                                  |
| --------------------------- | --------------- | ---------------------------------------------------------------------- |
| V1_CORE                     | 35              | Includes one mixed monolith (SURF-100, `index.ts`)                     |
| V1_SUPPORTING               | 11 (+3 likely)  | Auth, DB, middleware, conversation persistence, logging                |
| DORMANT_ARCHITECTURE        | 12 path families | Entire L5–L14 + integration scaffolding                                |
| DEFERRED                    | 11+             | Plugin/Strategy/Agent Prisma models, deep calibration, deferred APIs    |
| LEGACY_OR_DUPLICATIVE       | 8 families      | OmniScore, derivatives, news, social/sentiment, anomaly, fetchers, etc.|
| UNKNOWN_REQUIRES_TRIAGE     | see dedicated registry | Routed to triage registry                                              |

> Counts are entry counts in this registry; the underlying file count is much higher (a single entry like `src/l13/` covers hundreds of files).

---

## H. Synchronization Note

When this registry is updated, also update:

- `backend-v1-record-index.registry.md` (Plan 1.7 §10.3 indexing rule).
- The dedicated `legacy-duplicative` and `unknown-triage` registries if their rows change.

This registry **never** triggers code changes by itself. Action (refactor, replace, delete) requires:

1. A BTAR (Plan 1.6).
2. The appropriate procedure (FRP / BSCP / VSE for sprawl; AFE for architecture; SCR for scope).
3. Synchronized updates to all affected registries.

---

*This registry is Level 4 (operational). Plan 1.8 master inventory document is authoritative.*
