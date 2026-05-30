# Backend v1 Legacy / Duplicative Surface Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — produced by Plan 1.8)
**Source Plan:** `phase-1/backend-v1-existing-backend-surface-inventory.md` (Plan 1.8)
**Companion to:** `backend-v1-existing-backend-surface-classification.registry.md`
**Last Updated:** 2026-05-19

> **Critical context.** This registry isolates duplicate / version-named / overlapping service families. Plan 1.5 prohibits *new* version sprawl; Plan 1.8 inventories *existing* sprawl without acting on it. Action (canonicalization, retirement) requires a separate Plan-1.5-governed FRP or BSCP per family.

> **Discovery.** Code inspection of `apps/coinet-platform/src/services/` and `src/api/chat/service.ts` on 2026-05-19. The `chat/service.ts` import list is the primary evidence of which duplicates are **concurrently active in production**.

---

## Critical Finding (Plan 1.8 §1.8.4.2 — LEGACY_OR_DUPLICATIVE)

> **Several duplicate families are not "legacy" in the abandoned sense — they are actively imported concurrently by `api/chat/service.ts`.** This is worse than dead code: it is live parallel implementation, producing potentially divergent outputs into the same user-facing answer. Plan 1.5 §6 (parallel-service prohibition) was specifically motivated by this pattern.

This registry records the families, the active import status, and the canonicalization need — without selecting winners (per Plan 1.8 §15).

---

## A. OmniScore Family (PSC-001)

| File                                                      | Active import (chat) | Notes                                              |
| --------------------------------------------------------- | -------------------- | -------------------------------------------------- |
| `src/services/omniscore_v3/` (folder, 12+ subfolders)     | indirect (own pipeline) | OmniScore v3 has full pipeline structure (engine, features, gates, calibration, scoring, persistence, audit). Likely current canonical candidate. |
| `src/services/omniscore-v2.5.ts`                          | unknown              | Older variant. TRACE_DEEPER for import sites.      |
| `src/services/project-omniscore.ts`                       | unknown              | Project-scoped variant.                            |
| `src/services/project-omniscore-v2.ts`                    | unknown              | Project-scoped v2 variant.                         |
| `src/services/omniscore-cache.ts`                         | likely supporting    | Shared helper?                                     |
| `src/services/omniscore-constants.ts`                     | likely supporting    | Shared constants?                                  |
| `src/services/omniscore-debug-view.ts`                    | unknown              |                                                    |
| `src/services/omniscore-legitimacy.ts`                    | unknown              |                                                    |
| `src/services/omniscore-modes.ts`                         | unknown              |                                                    |
| `src/services/omniscore-reliability.ts`                   | unknown              |                                                    |
| `src/services/omniscore-stability.ts`                     | unknown              |                                                    |
| `src/services/omniscore-visualizer.ts`                    | unknown              |                                                    |

**Canonicalization candidate (unconfirmed):** `omniscore_v3/` directory.
**Action:** MARK_FOR_CANONICALIZATION. Trace each `*.ts` for import sites before any FRP. Plan 1.8 does not select a winner.

**VSV triggers:** VSV-A (v2.5, v2), VSV-C (parallel scoring under PSC-001), VSV-J (legacy variants kept active beside newer pipeline).

---

## B. Derivatives Intelligence Family (PSC-002)

| File                                                              | Active import (chat) | Evidence |
| ----------------------------------------------------------------- | -------------------- | -------- |
| `src/services/derivatives-intelligence-v2.ts`                     | **YES**              | `chat/service.ts` line 33: `calculateDerivativesIntelligenceV2`, `formatDerivativesIntelligenceV2ForAI` |
| `src/services/derivatives-intelligence-final.ts`                  | **YES**              | `chat/service.ts` line 35: `calculateDerivativesIntelligenceFinal`, `formatDerivativesIntelligenceFinalForAI` |
| `src/services/derivatives-intelligence-complete.ts`               | unknown              | Not directly imported by chat in inspected window; trace other call sites |
| `src/services/comprehensive-derivatives-intelligence.ts`          | **YES**              | `chat/service.ts` line 34: `calculateComprehensiveDerivativesIntelligence`, `formatComprehensiveDerivativesForAI` |
| `src/services/derivatives-data-resilience.ts`                     | supporting (likely)  |          |
| `src/services/derivatives-data-sources.ts`                        | supporting (likely)  |          |

**Critical observation.** Three "competing finality" implementations (`-v2`, `-final`, `-complete`/`comprehensive-`) are concurrently imported into the same chat path. Outputs from all three may be formatted into the AI prompt simultaneously — meaning the user-facing answer can be informed by three parallel derivatives engines without canonical selection.

**Action:** MARK_FOR_CANONICALIZATION (Plan 1.5 FRP required). Plan 1.8 does not select; Plan 1.8 records. Highest priority canonicalization candidate among all families because of (a) concurrent active import and (b) "final" / "complete" naming pretending finality.

**VSV triggers:** VSV-A (v2), VSV-B (-final, -complete, -comprehensive), VSV-C (parallel under PSC-002), VSV-F (unclear which is canonical output), VSV-J (legacy variants kept active).

---

## C. News Intelligence Family (PSC-003)

| File                                              | Active import (chat)   | Evidence |
| ------------------------------------------------- | ---------------------- | -------- |
| `src/services/news-intelligence.ts`               | unknown                | Not directly imported by `chat/service.ts` in inspected window |
| `src/services/news-intelligence-v2.ts`            | **YES**                | `chat/service.ts` line 30: `calculateNewsIntelligenceV2`, `formatNewsIntelligenceV2ForAI` |
| `src/services/news-service.ts`                    | **YES**                | `chat/service.ts` line 20: `getEnrichedNewsForCoins`, `formatEnrichedNewsForAI` |

**Observation.** `news-service.ts` and `news-intelligence-v2.ts` are both active. Whether `news-intelligence.ts` (the base) is still imported elsewhere requires deeper trace.

**Action:** MARK_FOR_CANONICALIZATION. Likely consolidation target: pick one of `news-service` or `news-intelligence-v2` as canonical news provider; retire the others via FRP.

**VSV triggers:** VSV-A (v2), VSV-C (parallel under PSC-003), VSV-F (unclear meaning).

---

## D. Social / Sentiment Family (PSC-004 + PSC-005)

| File                                                       | Active import (chat) | Evidence |
| ---------------------------------------------------------- | -------------------- | -------- |
| `src/services/social-intelligence.ts`                      | **YES**              | `chat/service.ts` line 23: `getSocialIntelligence`, `formatSocialIntelligenceForAI` |
| `src/services/social-intelligence-v2.ts`                   | **YES**              | `chat/service.ts` line 29: `calculateSocialIntelligenceV2`, `formatSocialIntelligenceV2ForAI` |
| `src/services/social-intelligence-orchestrator.ts`         | **YES**              | `chat/service.ts` line 26: `getComprehensiveSocialIntelligence`, `formatComprehensiveSocialIntelligenceForAI` |
| `src/services/social-service.ts`                           | **YES**              | `chat/service.ts` line 22: `getSocialSentiment`, `formatSocialForAI` |
| `src/services/composite-social-score.ts`                   | **YES**              | `chat/service.ts` line 28: `calculateCompositeSocialScore`, `formatCSSForAI` |
| `src/services/coinet-sentiment-index.ts`                   | **YES**              | `chat/service.ts` line 27: `calculateCSI`, `formatCSIForAI` |
| `src/services/csi-v4-factors.ts`                           | unknown              | CSI v4 factor variant; trace other call sites |
| `src/services/csi-v5-calibrated.ts`                        | unknown              | CSI v5 calibrated variant; trace other call sites |
| `src/services/social-psychometrics.ts`                     | unknown              |          |
| `src/services/social-network-analysis.ts`                  | unknown              |          |
| `src/services/sentiment-analysis.ts`                       | unknown              |          |
| `src/services/sentiment-service.ts`                        | **YES**              | `chat/service.ts` line 21: `getMarketSentiment`, `formatSentimentForAI` |
| `src/services/twitter-intelligence.ts`                     | unknown              |          |
| `src/services/twitter-service.ts`                          | unknown              |          |
| `src/services/influencer-tracking.ts`                      | **YES**              | `chat/service.ts` line 24 |
| `src/services/influencer-analytics.ts`                     | **YES**              | `chat/service.ts` line 25 |

**Critical observation.** **At least seven** social/sentiment implementations are concurrently active. The chat service simultaneously calls `getSocialSentiment` (sentiment), `getSocialIntelligence` (v1), `calculateSocialIntelligenceV2`, `getComprehensiveSocialIntelligence` (orchestrator), `calculateCompositeSocialScore` (CSS), and `calculateCSI` (Coinet Sentiment Index). The CSI itself has v4-factors and v5-calibrated variants of unclear status.

**Action:** MARK_FOR_CANONICALIZATION. Highest concurrent-parallel violation in the codebase. Likely requires multiple sequential FRPs:
1. Pick canonical "social signal" provider (one of `social-intelligence-*` or the orchestrator).
2. Pick canonical "sentiment index" (CSI vs CSS vs market-sentiment).
3. Retire the others.

**VSV triggers:** VSV-A (v2), VSV-C (parallel under PSC-004 + PSC-005), VSV-F (unclear product meaning of seven concurrent outputs), VSV-J (legacy variants kept active).

---

## E. Provider Data Fetching Family (PSC-006)

| File                                                   | Active import (chat) | Evidence |
| ------------------------------------------------------ | -------------------- | -------- |
| `src/services/omniscore-data-fetcher.ts`               | unknown              | Base fetcher; trace usage |
| `src/services/omniscore-data-fetcher-v22.ts`           | unknown              | v22 variant; trace usage |
| `src/services/omniscore-data-fetcher-v23.ts`           | unknown              | v23 variant; trace usage |
| `src/services/enterprise-market-data-pipeline.ts`      | **YES**              | `chat/service.ts` line 38 |
| `src/services/market-data.ts`                          | **YES**              | `chat/service.ts` line 14 |
| `src/services/real-data-sources.ts`                    | unknown              |          |
| `src/services/provider-schemas.ts`                     | supporting (likely)  |          |
| `src/services/dexscreener.ts`                          | likely active        | Provider client |
| `src/services/whale-data.ts`                           | **YES**              | `chat/service.ts` line 19 |

**Observation.** Three OmniScore data fetcher variants (`base`, `v22`, `v23`). At least two market-data layers active concurrently (`market-data` and `enterprise-market-data-pipeline`).

**Action:** MARK_FOR_CANONICALIZATION. Plan 1.3 NB-008 (deep API work before purchase) limits the depth of fetcher changes for now; convergence is bounded by Phase 1–3 priorities.

**VSV triggers:** VSV-A (v22, v23 suffixes), VSV-C (parallel under PSC-006).

---

## F. Anomaly Monitoring Family (PSC-007)

| File                                                  | Active import (chat) | Notes                              |
| ----------------------------------------------------- | -------------------- | ---------------------------------- |
| `src/services/anomaly-latency-monitor.ts`             | unknown              | Base variant; trace usage          |
| `src/services/anomaly-latency-monitor-v2.ts`          | unknown              | v2 variant; trace usage            |

**Action:** TRACE_DEEPER. If both are inactive, classify as `LEGACY_OR_DUPLICATIVE`. If one is active and one is not, the unused one is dead code (still requires Plan-1.5-governed retirement).

**VSV triggers:** VSV-A (v2 suffix), VSV-C (parallel under PSC-007).

---

## G. AI Output / Hallucination Guard (PSC-009)

| File                                              | Active in chat? | Notes |
| ------------------------------------------------- | --------------- | ----- |
| `src/services/ai-service.ts`                      | **YES**         | Canonical AI service (SURF-020). |
| `src/services/ai-hallucination-guard.ts`          | **YES**         | Imported by `ai-service.ts` (SURF-021). Supporting, not duplicative. |

**Observation.** No version-sprawl in this family currently. The canonical AI path is `ai-service.ts` + `ai-hallucination-guard.ts`. Plan 1.5 must prevent any future `ai-service-v2.ts`.

**Action:** None at canonicalization level. Phase 2 work (output safety gate) is governed by BTAR, not FRP.

---

## H. Liquidation Family (overlap with PSC-002/PSC-006)

| File                                       | Active in chat? | Notes |
| ------------------------------------------ | --------------- | ----- |
| `src/services/liquidation-service.ts`      | **YES**         | `chat/service.ts` line 32: `getPerpsSnapshot`, `formatPerpsForAI` |
| `src/services/liquidation-heatmap-v2.ts`   | unknown         | v2 variant; trace usage |

**Action:** TRACE_DEEPER. Likely canonical = `liquidation-service`. Heatmap v2 may be a visualization helper, not a duplicate.

**VSV triggers:** VSV-A (v2 suffix) if duplicative.

---

## I. Influencer Family (PSC-004 cluster)

| File                                          | Active in chat? | Notes |
| --------------------------------------------- | --------------- | ----- |
| `src/services/influencer-tracking.ts`         | **YES**         | `chat/service.ts` line 24 |
| `src/services/influencer-analytics.ts`        | **YES**         | `chat/service.ts` line 25 |

**Observation.** Both active; semantically distinct (tracking vs analytics). Not duplicative at this granularity. Confirmed as supporting V1-S04 (radar) and V1-S01 (chat context).

**Action:** None. Both remain active under their respective V1_CORE classifications.

---

## J. Memory / Conversation Helpers

| File                                       | Active in chat? | Notes |
| ------------------------------------------ | --------------- | ----- |
| `src/services/memory-service.ts`           | **YES**         | `chat/service.ts` line 31: `buildUserContextForAI`, `extractMemoriesFromMessage`. V1_CORE (SURF-034). |
| `src/services/conversation-rules.ts`       | unknown         | Conversation rule helpers; trace usage. |

**Action:** TRACE_DEEPER for `conversation-rules.ts`. Likely V1_SUPPORTING or V1_CORE depending on import.

---

## K. Project Research Family (no obvious duplication, but verify)

| File                                              | Active in chat? | Notes |
| ------------------------------------------------- | --------------- | ----- |
| `src/services/project-research-intelligence.ts`   | **YES**         | `chat/service.ts` line 39 |
| `src/services/project-investigation-service.ts`   | unknown         |       |
| `src/services/project-web-researcher.ts`          | unknown         |       |

**Action:** TRACE_DEEPER. If multiple are simultaneously active, may form a duplicate cluster under no defined PSC; classify under future PSC if pattern matures.

---

## L. Auto-Research / Auxiliary

| File                                            | Active in chat? | Notes |
| ----------------------------------------------- | --------------- | ----- |
| `src/services/auto-research-integration.ts`     | unknown         | Triage |
| `src/services/intelligence-fusion-engine.ts`    | unknown         | Triage |
| `src/services/investor-psychology-engine.ts`    | unknown         | Triage |
| `src/services/behavioral-finance-intelligence.ts` | **YES**       | `chat/service.ts` line 36 |
| `src/services/neuroeconomic-intelligence.ts`    | **YES**         | `chat/service.ts` line 37 |

**Observation.** `behavioral-finance-intelligence` and `neuroeconomic-intelligence` are both active. Whether they overlap is a semantic question (different psychological frameworks). Not duplicative under standard PSC definitions.

**Action:** None at canonicalization level. The three "unknown active?" entries above go to triage.

---

## M. Plan 1.8 Does Not Pick Winners

Per Plan 1.8 §15.2:

> Do not delete duplicates. Do not choose final canonical path without import evidence. Do not rename files. Do not start Plan 1.5 FRP/BSCP yet unless separately admitted.

This registry records evidence for future Plan-1.5-governed canonicalization. Each family above will require:

1. A BTAR proposing canonicalization.
2. An FRP record naming the canonical winner, the retiring path(s), and the retirement trigger.
3. Synchronized registry updates.

The order in which families are canonicalized is itself a Phase 2 prioritization decision and is **not** decided in Plan 1.8.

---

## N. Synchronization

This registry is updated when:

- A new duplicate family is discovered.
- A family is canonicalized through approved FRP (move the family entry to "RESOLVED" state with retained history).
- A surface is reclassified.

All updates pair with `backend-v1-record-index.registry.md` and (where applicable) `backend-v1-exception.registry.md`.

---

*This registry is Level 4. The Plan 1.8 master inventory is authoritative for classification; Plan 1.5 is authoritative for canonicalization procedure.*
