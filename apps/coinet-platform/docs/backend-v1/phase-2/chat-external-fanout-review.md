# Chat External Fan-Out Reliability Review (BTAR-008B)

Status: ACTIVE
Phase: Phase 2 — Live Judgment / Chat / AI Trust
Created: 2026-05-25
Last Updated: 2026-05-25
Owner: Backend program owner
Companion BTAR: BTAR-008 (§5.1 / §10.4)

> **This review maps external chat-path service calls; it does not buy APIs, add providers, rewrite routing, or implement caching.**

---

## 0. Document Identity

This is a documentation-only artifact. It records what external-context or provider-like services the live chat path (`POST /api/chat/message → ChatService.sendMessage`) currently touches, classifies each by required/optional status and current/recommended failure behavior, and produces a future-API-cost risk view.

The review is **evidence-based** — every row was extracted from `apps/coinet-platform/src/api/chat/service.ts` imports + call-site inspection. Where evidence is insufficient or the import is wrapped without a clear behavioral signal, the row uses the value `UNKNOWN_REQUIRES_TRIAGE`.

---

## 1. Purpose

Before Coinet spends money on real APIs, the team needs to know:

- Which calls are **required** for a meaningful v1 chat response?
- Which calls are **optional context enrichment** that should degrade safely?
- Which calls **block** the response today and which **silently continue**?
- Which calls should be **cached** so per-message latency / cost is bounded?
- Which calls should be **deferred from v1** entirely?

This review answers those questions at a documentation level. Behavior-changing fixes are out of BTAR-008 scope and will be admitted as separate BTARs (or absorbed into the post-Phase-2 provider phase).

---

## 2. Non-Goals

- **No provider integration.** No new API clients, no real-key wiring, no paid-API onboarding.
- **No caching implementation.** Caching recommendations are advisory only.
- **No fan-out refactor.** No replacement of the chat service or any context-fetch service.
- **No new telemetry platform.** Runtime evidence lives in BTAR-008A; this artifact is review-only.
- **No frontend changes.** No UI badges or status indicators.
- **No L13/L14 imports.** No new architecture activation.

If a row's "recommended_failure_behavior" suggests `DEGRADE_AND_DISCLOSE` or `CACHE_OR_STALE_OK`, that is a **review recommendation**, not a code change. Implementing it requires a separate Plan 1.6 admission.

---

## 3. Method Used For Review

1. Read `apps/coinet-platform/src/api/chat/service.ts` import list (lines 12–115).
2. Bucket imports into: trust-seam internals (Phase 2 helpers); platform internals (logger, prisma, types); chat-internal helpers (chart-detector, source-manager); external-context services (everything that calls or wraps a provider).
3. For each external-context service, classify by current behavior visible from call-site inspection + BTAR-002/003/004/005/006/007 test evidence. Where evidence is insufficient, record `UNKNOWN_REQUIRES_TRIAGE`.
4. Cross-reference F-3 (silent-continue / fallback — RESOLVED at the judgment site only; other silent-continue sites in `service.ts` may still exist) and F-6 (live-CoinGecko path through `project-investigation-service` — RESOLVED via test mock; production-side caching not addressed).
5. Recommend a target failure behavior per row, using the BTAR-008 §22 vocabulary.

The recommendations are **conservative**: when in doubt, prefer `DEGRADE_AND_DISCLOSE` over `BLOCK_CORE_RESPONSE`, prefer `CACHE_OR_STALE_OK` over `DEFER_FROM_V1`.

---

## 4. Active Chat Path Summary

```text
POST /api/chat/message
  → api/chat/controller.ts
    → api/chat/service.ts (ChatService.sendMessage, ~2200 LOC)
      → buildSignalSnapshot()                         (services/judgment/signal-snapshot.ts)
      → produceJudgment()                              (services/judgment/index.ts)
      → buildChatTrustContext(...)                    (BTAR-006 — Phase 2 seam)
      → aiService.analyze(prompt, ...)                 (services/ai-service.ts)
      → finalizeChatAIResponse(...)                   (BTAR-006 — Phase 2 seam)
      → buildChatRuntimeTrustEvidence(...)            (BTAR-008 — Phase 2 seam)
      → ChatMessageResponse                            (returned to user)
```

Around the judgment block, `service.ts` orchestrates ~30 additional context-fetch / intelligence services to enrich the AI prompt (the "27-mock surface" / F-2 / F-4).

---

## 5. External Fan-Out Inventory

Schema (per BTAR-008 §21): `fanout_id` / `service_or_module` / `called_from` / `purpose` / `provider_or_external_dependency` / `required_for_v1_chat` / `current_failure_behavior` / `recommended_failure_behavior` / `should_block_response` / `should_degrade_response` / `should_be_cached_later` / `test_mock_requirement` / `future_api_cost_risk` / `notes`

For readability, the inventory is grouped by category. Each row references its `service_or_module` path relative to `apps/coinet-platform/src/`.

### 5.1 Market Data (price feeds)

| fanout_id | service_or_module | called_from | purpose | provider / external | required_for_v1_chat | current_failure_behavior | recommended_failure_behavior | should_block_response | should_degrade_response | should_be_cached_later | test_mock_requirement | future_api_cost_risk | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAN-001 | `services/market-data.ts` | `service.ts:14` import; called in context-fetch region | Current/standard market data for detected coins | CoinGecko (likely) | OPTIONAL | LOGS_AND_CONTINUES | DEGRADE_AND_DISCLOSE | NO | YES | YES | Required (BTAR-002 mock) | MEDIUM | Returns `MarketSnapshot` shape; one of two market sources |
| FAN-002 | `services/enterprise-market-data-pipeline.ts` | `service.ts:76` import; primary market path | Cached enterprise market prices | CoinGecko + cache (likely) | OPTIONAL | LOGS_AND_CONTINUES | CACHE_OR_STALE_OK | NO | YES | YES (already cached internally) | Required (BTAR-002 mock) | MEDIUM | Preferred over FAN-001; already has cache concept |

### 5.2 News / Sentiment

| fanout_id | service_or_module | purpose | provider / external | required_for_v1_chat | current_failure_behavior | recommended_failure_behavior | should_be_cached_later | future_api_cost_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAN-003 | `services/news-service.ts` | Enriched news context | CryptoPanic + RSS aggregators (likely) | OPTIONAL | LOGS_AND_CONTINUES | DEGRADE_AND_DISCLOSE | YES | MEDIUM |
| FAN-004 | `services/sentiment-service.ts` | Fear & Greed market sentiment | alternative.me Fear & Greed (likely) | OPTIONAL | LOGS_AND_CONTINUES | CACHE_OR_STALE_OK | YES | LOW |
| FAN-005 | `services/news-intelligence-v2.ts` | Aggregated news intelligence v2 | Internal aggregation over FAN-003 | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | LOW |

### 5.3 Social / Sentiment Intelligence (duplication family)

This family was flagged in Plan 1.5 §4 as a duplication-family-of-concern (multiple parallel implementations). Plan 2.3 OOS-010 forbids canonicalization in Phase 2.

| fanout_id | service_or_module | purpose | provider / external | required_for_v1_chat | current_failure_behavior | recommended_failure_behavior | should_be_cached_later | future_api_cost_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAN-006 | `services/social-service.ts` | Social sentiment (v0) | Twitter/X, LunarCrush (likely) | OPTIONAL | LOGS_AND_CONTINUES | DEGRADE_AND_DISCLOSE | YES | HIGH |
| FAN-007 | `services/social-intelligence.ts` | Social intelligence (v1) | Same upstream as FAN-006 | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | HIGH |
| FAN-008 | `services/social-intelligence-orchestrator.ts` | Comprehensive social orchestration | Same family | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | HIGH |
| FAN-009 | `services/social-intelligence-v2.ts` | Social intelligence v2 | Same family | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | HIGH |
| FAN-010 | `services/coinet-sentiment-index.ts` | CSI (composite sentiment index) | Internal aggregation | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | LOW |
| FAN-011 | `services/composite-social-score.ts` | Composite social score | Internal aggregation | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | LOW |
| FAN-012 | `services/influencer-tracking.ts` | Influencer snapshot | Twitter/X + curated list (likely) | OPTIONAL | UNKNOWN | DEFER_FROM_V1 | YES | HIGH |
| FAN-013 | `services/influencer-analytics.ts` | Contrarian / consensus analytics over FAN-012 | Internal over FAN-012 | OPTIONAL | UNKNOWN | DEFER_FROM_V1 | YES | LOW |

### 5.4 Derivatives (duplication family)

Also a Plan 1.5 §4 duplication family.

| fanout_id | service_or_module | purpose | provider / external | required_for_v1_chat | current_failure_behavior | recommended_failure_behavior | should_be_cached_later | future_api_cost_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAN-014 | `services/liquidation-service.ts` | Perps liquidation snapshot | CoinGlass (likely) | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | MEDIUM |
| FAN-015 | `services/derivatives-intelligence-v2.ts` | Derivatives intelligence v2 | CoinGlass (likely) | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | MEDIUM |
| FAN-016 | `services/comprehensive-derivatives-intelligence.ts` | Comprehensive derivatives | CoinGlass + other | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | MEDIUM |
| FAN-017 | `services/derivatives-intelligence-final.ts` | "Final" derivatives variant | Same family | OPTIONAL | UNKNOWN | DEFER_FROM_V1 | YES | LOW |

### 5.5 On-Chain / Whale

| fanout_id | service_or_module | purpose | provider / external | required_for_v1_chat | current_failure_behavior | recommended_failure_behavior | should_be_cached_later | future_api_cost_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAN-018 | `services/whale-data.ts` | Whale context for AI | Alchemy / QuickNode / on-chain (likely) | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | HIGH |

### 5.6 OmniScore + Investigation

| fanout_id | service_or_module | purpose | provider / external | required_for_v1_chat | current_failure_behavior | recommended_failure_behavior | should_be_cached_later | future_api_cost_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAN-019 | `services/omniscore` (barrel) | OmniScore v2.3 + quadrant visualization | Internal scoring over multiple upstream | CONDITIONAL (used in OmniScore branch) | LOGS_AND_CONTINUES (catastrophic-error fallback exists at service.ts:993) | DEGRADE_AND_DISCLOSE | Internal | LOW |
| FAN-020 | `services/project-investigation-service.ts` | Investigation fallback (project enrichment) | **CoinGecko (confirmed live HTTP — F-6 evidence)** | OPTIONAL | LOGS_AND_CONTINUES (used as last-resort fallback) | CACHE_OR_STALE_OK (production-side caching recommended; F-6 only resolved at test-mock level) | YES | MEDIUM | F-6 production-side caching is the most concrete recommendation for post-Phase-2 work |

### 5.7 Behavioral / Neuroeconomic / Trust

| fanout_id | service_or_module | purpose | provider / external | required_for_v1_chat | current_failure_behavior | recommended_failure_behavior | should_be_cached_later | future_api_cost_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAN-021 | `services/behavioral-finance-intelligence.ts` | Behavioral finance scoring | Internal | OPTIONAL | LOGS_AND_CONTINUES | DEGRADE_AND_DISCLOSE | NO | LOW |
| FAN-022 | `services/neuroeconomic-intelligence.ts` | Neuroeconomic scoring | Internal | OPTIONAL | LOGS_AND_CONTINUES | DEGRADE_AND_DISCLOSE | NO | LOW |
| FAN-023 | `services/project-research-intelligence.ts` | Project trust score | Internal + possibly external | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | LOW |

### 5.8 Source Systems / Reasoning Context

| fanout_id | service_or_module | purpose | provider / external | required_for_v1_chat | current_failure_behavior | recommended_failure_behavior | should_be_cached_later | future_api_cost_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAN-024 | `services/source-systems.ts` (`runBtcQuantumRisk`) | BTC Quantum Risk score | Internal | OPTIONAL (BTC-only) | UNKNOWN | DEGRADE_AND_DISCLOSE | NO | LOW |
| FAN-025 | `services/reasoning-context.ts` | Build / serialize reasoning context (L1 bridge) | Internal | OPTIONAL | LOGS_AND_CONTINUES (caught at service.ts:1187) | DEGRADE_AND_DISCLOSE | NO | LOW |

### 5.9 Memory / Token / Symbol / Canonical

| fanout_id | service_or_module | purpose | provider / external | required_for_v1_chat | current_failure_behavior | recommended_failure_behavior | should_be_cached_later | future_api_cost_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAN-026 | `services/memory-service.ts` | User memory context for AI | Internal (Prisma) | OPTIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | NO | LOW |
| FAN-027 | `services/token-context.ts` | Enrich message with on-chain token context | Internal + possibly external | CONDITIONAL (when token reference detected) | UNKNOWN | DEGRADE_AND_DISCLOSE | YES | MEDIUM |
| FAN-028 | `services/symbol-detector.ts` | Detect coin symbols in user message | Internal | REQUIRED | UNKNOWN | BLOCK_CORE_RESPONSE only if symbol detection itself is critical to the user intent | Internal | LOW | If detection returns 0 coins, the judgment block is skipped (BTAR-003 default UNAVAILABLE fallback applies at gate) |
| FAN-029 | `services/canonical.ts` | Canonical entity resolution (Layer 3) | Internal | CONDITIONAL | UNKNOWN | DEGRADE_AND_DISCLOSE | Internal | LOW |
| FAN-030 | `services/knowledge-graph.ts` | Entity context (Layer 4) | Internal | OPTIONAL | LOGS_AND_CONTINUES | DEGRADE_AND_DISCLOSE | Internal | LOW |

### 5.10 Intent / Chat Audit

| fanout_id | service_or_module | purpose | provider / external | required_for_v1_chat | current_failure_behavior | recommended_failure_behavior | should_be_cached_later | future_api_cost_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAN-031 | `services/intent-classifier.ts` | Intent classification (Layer A) | Internal (heuristic) | REQUIRED | BLOCKS_RESPONSE (F-1 — TypeError on `metadata.processingTimeMs`) | DEGRADE_AND_DISCLOSE (production-side fix needed; F-1 STILL_OPEN) | NO | LOW |
| FAN-032 | `services/intent-handlers.ts` | Handler execution for classified intents | Internal | OPTIONAL | UNKNOWN | SKIP_AND_CONTINUE | NO | LOW |
| FAN-033 | `services/chat-audit.ts` | Grounding validation + audit log | Internal | OPTIONAL | LOGS_AND_CONTINUES | SKIP_AND_CONTINUE | NO | LOW |

### 5.11 Core / Required

| fanout_id | service_or_module | purpose | provider / external | required_for_v1_chat | current_failure_behavior | recommended_failure_behavior | should_be_cached_later | future_api_cost_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAN-034 | `services/judgment/index.ts` (`produceJudgment`) | Structured judgment engine | Internal (pure compute over signals) | REQUIRED (when coin detected) | THROW → handled by BTAR-003 (becomes UNAVAILABLE) | UNCHANGED (already correct) | NO | LOW |
| FAN-035 | `services/judgment/signal-snapshot.ts` | Signal snapshot builder | Internal | REQUIRED | UNKNOWN | DEGRADE_AND_DISCLOSE | NO | LOW |
| FAN-036 | `services/ai-service.ts` | LLM call | **OpenAI / Grok / xAI (paid provider)** | REQUIRED | THROW → falls back to `generateMockResponse` (silent-fallback risk; covered by BTAR-005 output gate) | UNCHANGED at boundary (BTAR-005 gate enforces safety; further safety belongs to future BTARs) | NO (per-message LLM call cannot be cached without affecting answer quality) | **HIGH** | This is the primary paid API; budget-critical |

---

## 6. Required vs Optional Classification Summary

```text
REQUIRED                        : 5  (FAN-028, FAN-031, FAN-034, FAN-035, FAN-036)
OPTIONAL                        : 26
CONDITIONAL                     : 3   (FAN-019, FAN-027, FAN-029)
UNKNOWN_REQUIRES_TRIAGE          : 0  (every row classified; some rows carry UNKNOWN in adjacent failure-behavior columns)
Total external fan-out rows      : 36 (FAN-001..FAN-036)
```

The **5 REQUIRED** rows are the irreducible v1 chat dependencies. Everything else can degrade safely with disclosure.

---

## 7. Failure Behavior Classification Summary

```text
Current behaviors observed       :
  BLOCKS_RESPONSE                : 1  (FAN-031 — F-1 TypeError)
  LOGS_AND_CONTINUES             : 12
  THROW (caught downstream)      : 2  (FAN-034 → BTAR-003 handles; FAN-036 → mock fallback)
  UNKNOWN                        : 21

Recommended behaviors target     :
  BLOCK_CORE_RESPONSE            : 1  (FAN-028 partial — symbol detection critical-only)
  DEGRADE_AND_DISCLOSE           : 22
  CACHE_OR_STALE_OK              : 3  (FAN-002, FAN-004, FAN-020)
  DEFER_FROM_V1                  : 3  (FAN-012, FAN-013, FAN-017)
  SKIP_AND_CONTINUE              : 2  (FAN-032, FAN-033)
  UNCHANGED                      : 2  (FAN-034, FAN-036 — already correct under Phase 2 safeguards)
  NO_RECOMMENDATION_CHANGE       : 3  (compute-only / no external dep)
```

---

## 8. Degradation Recommendation

The dominant recommendation is **DEGRADE_AND_DISCLOSE** (22 rows). This means:

1. When the optional context service fails, the chat path should **not** silently continue. It should record the failure in the BTAR-003 availability state (DEGRADED) so the BTAR-004 package marks it, the BTAR-005 gate enforces it at output time, and the BTAR-008 evidence captures it for observability.
2. Today many rows have `LOGS_AND_CONTINUES` (silent-continue at the optional-context layer). Per F-3, this pattern was resolved at the **judgment-engine site only** (BTAR-003). Other silent-continue sites remain; their existence is documented in BTAR-006 §14.7 as residual F-3 surface.
3. Future BTARs should consider wiring those silent-continue sites to emit `DEGRADED` availability through the BTAR-003 helper rather than just logging.

This is **not** a BTAR-008 implementation. It is the recommendation that BTAR-008B exists to record.

---

## 9. Future Caching Recommendation

Highest-leverage caching opportunities (all reduce per-message paid-API cost):

```text
FAN-002 enterprise-market-data-pipeline  — already has internal cache; verify cache-hit ratio
FAN-004 sentiment-service (Fear & Greed) — value rarely changes intraday; cache 5–15 min
FAN-020 project-investigation-service    — CoinGecko-backed; cache by coinGeckoId for hours
FAN-003 news-service                     — coin-keyed; cache 5–10 min
FAN-006..009 social/sentiment family     — cache by coin + window
FAN-014..016 derivatives family          — funding/liquidation; cache 1–5 min
FAN-018 whale-data                       — high-cost on-chain; cache 1–5 min
```

`FAN-036 ai-service` cannot be cached without changing answer semantics. Per-message LLM cost is intrinsic and is a separate budget concern.

Caching implementation is **out of BTAR-008 scope** and must be admitted as its own BTAR.

---

## 10. Test/Mock Requirement

Every external-context row currently has a corresponding `vi.mock` in the BTAR-002 smoke test layout. The mock count is 27 (chat-judgment-failure-path test) / 27 (chat-path smoke test) / 27 (chat-prompt-package integration test) / 27 (chat-ai-output-safety integration test). This is the F-2 cascade. The BTAR-006 extracted seams use 0 mocks and the BTAR-007 regression suite uses 0 mocks; this confirms F-2/F-5 are partially resolved at the trust-seam level only (per BTAR-006 §14.7).

Any post-Phase-2 BTAR that introduces a new external service to the chat path must add the corresponding `vi.mock` to all 4 full-service integration test files (Plan 2.2 §14.3 requirement).

---

## 11. Provider Purchase Implications

| Priority | Provider | Justification | Recommended pre-purchase action |
| --- | --- | --- | --- |
| 1 (highest) | OpenAI / Grok / xAI (FAN-036) | Required for every chat turn; primary cost driver | Verify BTAR-005 gate intervention rate at staging; tune prompt size before launch |
| 2 | CoinGecko (FAN-001 / FAN-002 / FAN-020) | Required for market context + investigation fallback | Add caching (post-Phase-2 BTAR) before scaling; reduce FAN-001+FAN-002 to one canonical caller |
| 3 | CoinGlass (FAN-014..017) | Derivatives signal valuable but degrades safely | Defer purchase until v1 user demand confirms derivatives reliance |
| 4 | Twitter/X / LunarCrush (FAN-006..009, FAN-012) | Social signal noisy; "duplication family" not yet canonicalized | DEFER_FROM_V1 until social architecture is canonicalized (Plan 2.3 OOS-010 deferred) |
| 5 | Alchemy / QuickNode (FAN-018) | On-chain whale data is HIGH-cost-risk | Cache or sample-rate before launch |
| 6 | CryptoPanic / RSS (FAN-003) | News aggregation | Free tiers may suffice for v1 |

**These are review recommendations, not purchase decisions.** Final purchase requires owner approval and a separate Plan 1.10 SCR if Phase 2 OOS-007 boundary is crossed.

---

## 12. Open Risks

```text
R-FAN-1  21 of 36 rows have UNKNOWN current failure behavior — needs deeper triage before reliability claims
R-FAN-2  Many LOGS_AND_CONTINUES sites are residual F-3 silent-continue patterns at the optional-context layer
R-FAN-3  The social-intelligence / derivatives-intelligence duplication families (Plan 1.5 §4) have multiple parallel callers in the chat path; canonicalization is Plan 2.3 OOS-010 (DEFERRED)
R-FAN-4  Production-side caching for FAN-020 (project-investigation-service) is the most concrete F-6 follow-up
R-FAN-5  FAN-031 (intent-classifier) carries F-1 production TypeError; mocked at test layer; production fix outstanding
R-FAN-6  ai-service mock-fallback (`generateMockResponse` at service.ts:1446) is itself a silent-fallback class; BTAR-005 gate covers it at output time but the underlying pattern remains in production
```

---

## 13. Done Definition

This review is complete when:

```text
[x] Inventory table covers every external-context / provider-like import in chat/service.ts (36 rows).
[x] Each row carries required_for_v1_chat / current_failure_behavior / recommended_failure_behavior / should_be_cached_later / future_api_cost_risk.
[x] UNKNOWN_REQUIRES_TRIAGE used honestly where evidence is insufficient.
[x] Provider purchase priority section exists.
[x] Open risks captured.
[x] No provider code modified.
[x] No caching implemented.
[x] No new BTAR admitted by this artifact.
```

**Done definition: MET.**

---

## 14. F-4 Status After This Review

```text
F-4 (per-message external fan-out reliability/performance)
  → MAPPED_FOR_FUTURE_PROVIDER_HARDENING (BTAR-008, 2026-05-25)
```

The fan-out is now evidence-mapped. Behavior changes remain post-Phase-2 work. Do not interpret this review as a code-level fix.

---

*This is BTAR-008B. The companion code artifact is `src/api/chat/chat-runtime-trust-evidence.ts` (BTAR-008A). Both deliverables are recorded under BTAR-008's completion section.*
