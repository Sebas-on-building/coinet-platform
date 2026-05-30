# Backend v1 Existing Backend Surface Inventory

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.8
Effective: 2026-05-19
Authority: Backend v1 Completion Program
Inherits From: Plans 1.1–1.7
Companion Registries:
  - `phase-1/registries/backend-v1-existing-backend-surface-classification.registry.md`
  - `phase-1/registries/backend-v1-legacy-duplicative-surface.registry.md`
  - `phase-1/registries/backend-v1-unknown-surface-triage.registry.md`

---

## 1. Identity and Authority

This document is the **inventory authority** of the Coinet Backend v1 program. It is the eighth scope-control plan inside Phase 1 and the first plan that touches the real repository.

Plans 1.1–1.7 produced the governance and source-of-truth system. Plan 1.8 produces the **map of the actual backend** against that system.

This document:

- does not refactor any code,
- does not delete any code,
- does not select canonical winners among duplicate families,
- does not start Phase 2 or Phase 3 implementation,
- does not begin API integration or CIP.1 work,
- does not admit any specific tasks.

It performs one job:

> **It classifies the existing backend codebase into V1_CORE, V1_SUPPORTING, DEFERRED, DORMANT_ARCHITECTURE, LEGACY_OR_DUPLICATIVE, and UNKNOWN_REQUIRES_TRIAGE, with evidence for each classification, and isolates duplicates and unknowns into dedicated registries — so Phase 1–3 implementation begins with a truthful map of what already exists.**

### 1.1 Pre-execution Dependency Check (Performed)

Confirmed ACTIVE upstream artifacts:

1. `backend-v1-scope.md` ✅
2. `phase-1/backend-v1-source-of-truth-system.md` ✅
3. `phase-1/backend-v1-product-boundary.md` ✅
4. `phase-1/backend-v1-non-blocker-and-non-scope-registry.md` ✅
5. `phase-1/backend-v1-task-admissibility-framework.md` ✅
6. (Plans 1.4, 1.5, 1.6 also present and ACTIVE)

---

## 2. Constitutional Purpose

### 2.1 Canonical Purpose Statement

> **The Existing Backend Surface Inventory and Classification plan exists to map the real Coinet backend codebase against the frozen v1 scope system, classify every relevant backend surface into operational categories, identify what is load-bearing, what supports v1, what is deferred, what is dormant architecture, what is legacy or duplicative, and what requires triage, without deleting or refactoring code during the inventory phase.**

### 2.2 Why This Matters

The backend has many systems: active chat and judgment runtime, certified dormant architecture, scoring systems, news/social/derivatives services, auth/session/persistence models, alert systems, old variants, future-facing modules, broad Prisma schema, large entry files and services. Without classification, the team risks touching the wrong code. Plan 1.8 prevents that by making the backend inspectable.

---

## 3. Inheritance From Plans 1.1–1.7

### 3.1 Inheritance Statement

> **This inventory inherits from the Phase 1 Charter, the Product Boundary, the Non-Scope Registry, the Architecture Freeze Law, the Version-Sprawl Prohibition, the Task Admissibility Framework, and the Source-of-Truth System. It does not reopen scope. It classifies the existing backend against that scope.**

---

## 4. First Principle

### 4.1 Canonical First Principle

> **Do not refactor, delete, replace, or expand any backend surface until it has first been classified.**

### 4.2 Operational Translation

Plan 1.8 **may**: inspect files, trace imports, identify active paths, classify surfaces, document uncertainty, flag duplicate families, mark unknowns for triage.

Plan 1.8 **may not**: delete code, rename services, refactor modules, create replacement implementations, choose canonical winners prematurely, start cleanup.

**Inventory first. Action later.**

---

## 5. Classification Taxonomy

```text
V1_CORE                     Directly powers a Plan 1.2 V1-S0x surface
V1_SUPPORTING               Required for v1 to operate; supports without producing intelligence
DEFERRED                    Maps to Plan 1.3 NB-NNN entry
DORMANT_ARCHITECTURE        Certified L5–L14; not called by active product runtime
LEGACY_OR_DUPLICATIVE       Duplicate / version-named / overlapping implementation
UNKNOWN_REQUIRES_TRIAGE     Insufficient evidence; routed to triage registry
```

Full per-class decision rules: Plan 1.8 §7.

---

## 6. Inventory Method (Discovery Passes)

Six discovery passes were performed on 2026-05-19:

- **Pass A — Route/entrypoint scan.** Inspected `src/index.ts` (6080 lines, 90+ routes) and `src/api/{auth,chat,feedback,portfolios,retention}/`.
- **Pass B — Active chat/judgment path trace.** Followed `/api/chat → chat/service.ts → buildSignalSnapshot → produceJudgment → formatJudgmentForAI → aiService.analyze → ai-service.ts`.
- **Pass C — Import graph around active runtime.** Traced imports from `chat/service.ts` (40+ services), `services/judgment/index.ts`, and `services/ai-service.ts`.
- **Pass D — Duplicate naming scan.** Listed all `*-v2`, `*-v3`, `*-final`, `*-complete`, `*-comprehensive`, `*-v22`, `*-v23` files under `services/`.
- **Pass E — Certified architecture scan.** Inspected `src/l5/` through `src/l14/`; grepped for non-test imports of these layers from `services/` and `api/`.
- **Pass F — Database/persistence scan.** Inspected `prisma/schema.prisma` (60+ models) and `src/db/client.ts`.
- **Pass G — Scripts/tests scan.** Confirmed cert/test scripts (`scripts/test-l13_master.ts`, `test-l14_master.ts`, `test-ajp1-active-judgment-pipeline.ts`, `test-cip05-certified-runtime.ts`, etc.) are not production runtime surfaces.

Detailed evidence is recorded per surface in the classification registry.

---

## 7. High-Level Backend Map

```text
┌────────────────────────────────────────────────────────────────────────┐
│                         ACTIVE PRODUCTION PATH                         │
│                                                                        │
│   POST /api/chat                                                       │
│     → api/chat/routes.ts → api/chat/controller.ts                     │
│       → api/chat/service.ts        (2124 lines, 40+ service imports)  │
│         → buildSignalSnapshot()    (services/judgment/signal-snapshot)│
│         → produceJudgment()        (services/judgment/index.ts)       │
│             ↳ state-engine, contradiction-engine, confidence-engine,  │
│               timing-engine (in-service, bypasses L9),                │
│               regime-engine (wraps L8),                               │
│               hypotheses/orchestrator (wraps L10),                    │
│               calibration-spine/snapshot-writer (partial L14)         │
│         → formatJudgmentForAI()   (services/judgment/debug-view)      │
│         → aiService.analyze()      (services/ai-service.ts, 1532 lines)│
│             ↳ ai-hallucination-guard.ts                                │
│             ↳ OpenAI (not L13)                                         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│              DORMANT CERTIFIED ARCHITECTURE (L5–L14)                   │
│                                                                        │
│   src/l5/  src/l6/  src/l7/  src/l8/  src/l9/  src/l10/                │
│   src/l11/ src/l12/ src/l13/ src/l14/                                  │
│                                                                        │
│   Active wrappers exist for L8 (regime-engine) and L10 (hypotheses     │
│   orchestrator); all other layers are NOT invoked by production code.  │
│   Confirmed: zero non-test/non-script imports of L-layers from         │
│   services/ or api/ directories.                                       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│              LEGACY / DUPLICATIVE (concurrently active!)               │
│                                                                        │
│   3 derivatives engines:                                               │
│     derivatives-intelligence-v2, -final, comprehensive-                │
│   5+ social/sentiment engines:                                         │
│     social-intelligence, -v2, -orchestrator, social-service,           │
│     composite-social-score, coinet-sentiment-index, sentiment-service  │
│   3 OmniScore data fetchers: base, v22, v23                            │
│   Multiple OmniScore variants: v3 (pipeline), v2.5, project-omniscore, │
│     project-omniscore-v2, plus 10+ omniscore-*.ts helpers              │
│                                                                        │
│   Many of these are imported simultaneously by chat/service.ts.        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. V1 Core Surfaces (Summary)

The active production runtime spine consists of these surface families (full per-file detail in the classification registry, §A):

- **Chat layer** (`src/api/chat/`): `routes.ts`, `controller.ts`, `service.ts`, `streaming.ts`, `source-manager.ts`, `chart-detector.ts`, `mock-ai-response.ts`, `types.ts` — 8 files.
- **Judgment engine** (`src/services/judgment/`): `index.ts`, `signal-snapshot.ts`, `state-engine.ts`, `contradiction-engine.ts`, `confidence-engine.ts`, `timing-engine.ts`, `regime-engine.ts`, `evaluator.ts`, `taxonomies.ts`, `types.ts`, `debug-view.ts` — 11 files.
- **AI service** (`src/services/ai-service.ts` + `ai-hallucination-guard.ts`) — 2 files.
- **Hypotheses subsystem** (`src/services/hypotheses/`): 13 files including `orchestrator.ts`, `registry.ts`, `support-engine.ts`, `invalidation-engine.ts`, `evidence-mapper.ts`, `modifiers.ts`, `ranker.ts`, `explainer.ts`, `versioning.ts`, `logging.ts`, `types.ts`, `index.ts`, `evidence-mapper-keys.ts`.
- **Support intelligence services** (V1_CORE supporting): `services/canonical/`, `services/canonicalization/` (active subset), `services/knowledge-graph/` (14 files), `services/reasoning-context/` (5 files), `services/chat-audit/`, `services/intent-classifier.ts`, `services/intent-handlers.ts`, `services/symbol-detector.ts`, `services/memory-service.ts`, `services/market-data.ts`, `services/source-systems/`, `services/calibration-spine/snapshot-writer.ts`.

**Risk profile:** All `V1_CORE` surfaces are `CRITICAL` or `HIGH` risk-if-modified. Phase 2 work must explicitly protect these before any cleanup.

---

## 9. V1 Supporting Surfaces (Summary)

Infrastructure required for v1 to function but not producing intelligence:

- **Database client:** `src/db/client.ts`.
- **Middleware:** `src/middleware/requireAuth.ts`, `securityHeaders.ts`, `rateLimit.ts`.
- **Auth routes:** `src/api/auth/routes.ts`.
- **Utilities:** `src/utils/logger`, related util modules.
- **Prisma models — auth/session:** `User`, `Session`, `RefreshToken`, `OAuthAccount`, `TrustedDevice`, `BackupCode`, `ApiKey`, `PasswordResetToken`.
- **Prisma models — conversation:** `Conversation`, `Message`.

These map to **V1-S05 (Auth / Session / Conversation Persistence)**.

---

## 10. Deferred Surfaces (Summary)

Surfaces mapped to Plan 1.3 NB-001..NB-010 (full table in classification registry §D):

- **Prisma `Plugin*`, `Review`** → NB-003 plugin systems.
- **Prisma `Strategy`** → NB-001 Strategy Lab.
- **Prisma `Agent`** → NB-004 experimental agents.
- **`services/calibration/` (beyond `calibration-spine/snapshot-writer.ts`)** → NB-005 full calibration ecosystem.
- **Any deeper provider integration beyond minimal stubs** → NB-008 deferred until APIs purchased.
- **Prisma `Alert*`, `NotificationCampaign/Log/Event/Preference`** → NB-009 advanced alerts (V1-S06 conditional minimum may survive).
- **Prisma `MLModelPerformance`, `RealTimeSignalProcessing`, `SignalPatternRecognition`, `SignalCorrelation`, `AIInsight*`, `AIRecommendation*`, `AIDashboardView`, `AIInsightsCache`** → NB-005 / NB-009 (production-active status unverified).
- **Prisma `ABTest`, `Badge`, `Referral`, `OnboardingStep`, `OnboardingAnalytics`** → NB-010 non-essential.

---

## 11. Dormant Architecture Surfaces (Summary)

**Key finding:** The certified L5–L14 architecture is **entirely dormant from production**. A repository-wide grep for non-test/non-script imports of `l5/` through `l14/` from `services/` or `api/` directories returned **zero results**.

| Layer | Active Wrapper in Production?                                                                  |
| ----- | ---------------------------------------------------------------------------------------------- |
| L5    | None — `services/canonicalization/` partially replicates L5 ideas but does not import L5.       |
| L6    | None.                                                                                          |
| L7    | None.                                                                                          |
| L8    | **Indirect** via `services/judgment/regime-engine.ts` (wraps L8 ideas; does not import L8).    |
| L9    | None — `services/judgment/timing-engine.ts` is in-service and **bypasses L9**.                  |
| L10   | **Indirect** via `services/hypotheses/orchestrator.ts` (wraps L10 ideas; does not import L10). |
| L11   | None — `services/omniscore_v3/` is parallel scoring (legacy/duplicative).                       |
| L12   | None — in-service scenario builder bypasses L12.                                                |
| L13   | None — `services/ai-service.ts` uses OpenAI directly, bypassing certified L13.                  |
| L14   | **Partial** via `services/calibration-spine/snapshot-writer.ts` (wired into `produceJudgment`). |

**Action:** `PRESERVE_DORMANT`. Per Plan 1.4 Legal Work Class D, bounded reuse of certified architectural ideas to harden active surfaces is allowed (e.g., adapting L13.9 safety patterns into an AI output safety gate). Full operationalization of any layer remains `TAD-C` until post-Phase-3 reassessment.

---

## 12. Legacy or Duplicative Surfaces (Summary)

Detailed in the dedicated registry. Critical finding:

> **Several duplicate families are not "legacy" in the abandoned sense — they are actively imported concurrently by `api/chat/service.ts`.** Three derivatives engines, five-plus social/sentiment engines, and multiple OmniScore variants are running in parallel into the same chat prompt assembly.

**Action:** `MARK_FOR_CANONICALIZATION`. Each family requires a Plan-1.5-governed FRP before any retirement. Plan 1.8 does not pick winners.

---

## 13. Unknown Surfaces (Summary)

37 unknown entries are recorded in `backend-v1-unknown-surface-triage.registry.md`. Highlights:

- **HIGH risk-if-wrongly-classified:** UNK-007 (`services/canonicalization/` breadth), UNK-008 (`services/canonical/` breadth), UNK-016 (`token-context.ts` ambiguity), UNK-025 (`intelligence-fusion-engine.ts`), UNK-029 (`source-systems/` folder breadth), UNK-034 (compliance Prisma models).
- **MEDIUM risk:** ~20 entries spanning portfolio routes, retention, twitter/sentiment helpers, social-adjacent files.
- **LOW risk:** test helpers, utils, scripts, `src/components/`.

Triage priority: HIGH first, then MEDIUM, then LOW. Triage is not implementation; it updates classifications.

---

## 14. Risk Summary

| Risk Level | Surfaces (approximate)                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| CRITICAL   | `api/chat/service.ts` (SURF-001), `produceJudgment()` (SURF-009), `ai-service.ts` (SURF-020), `ai-hallucination-guard.ts` (SURF-021), `src/index.ts` monolith (SURF-100), the 5 judgment sub-engines, hypotheses orchestrator, `debug-view.ts` formatter. |
| HIGH       | ~20 V1_CORE supporting surfaces, all canonicalization/knowledge-graph/reasoning-context internals, market-data + memory-service, auth middleware, conversation persistence. |
| MEDIUM     | Mock AI response, audit/logging, some unknown-pending intermediate services.            |
| LOW        | Dormant L5–L14 (low because not currently called; but **structural value is high**), most deferred Prisma models, scripts, utils. |
| UNKNOWN    | All UNK-NNN entries until triaged.                                                       |

**The single highest concentrated production risk is `api/chat/service.ts`**: a 2124-line file that orchestrates 40+ service imports and is the only path through which judgment reaches users. Modifying it carelessly can break the only production surface that matters today.

---

## 15. Immediate Implications for Phase 1–3

### 15.1 For Phase 1 (Stabilization)

- **Build/typecheck honesty** — verify all `V1_CORE` surfaces typecheck cleanly.
- **CI gate** — must run truthfully across at least the `V1_CORE` set.
- **Smoke tests** — must cover `/api/chat` happy path and judgment failure path at minimum.

### 15.2 For Phase 2 (Live-path Trustworthiness)

- **Highest-priority hardening targets** (in order):
  1. `ai-service.ts` output safety gate (CRITICAL; Phase 2).
  2. Silent-fallback removal in `chat/service.ts` when `produceJudgment()` fails.
  3. Bounded extraction of judgment-context construction from `chat/service.ts` for testability.
  4. Borrow L13.9 safety ideas under Plan 1.4 Legal Work Class D for output gating.

- **Forbidden in Phase 2** (Plan 1.5 / Plan 1.6):
  - Creating any `ai-service-v2.ts`, `judgment-engine-final.ts`, or equivalent.
  - Operationalizing dormant L13 runtime.
  - Touching the duplicate intelligence families without an FRP.

### 15.3 For Phase 3 (Synthetic Truth)

- The Backend Judgment Truth Suite targets the `V1_CORE` judgment engine.
- Synthetic episodes must exercise: state classification, contradiction detection, confidence calibration, regime classification, timing classification, scenario construction.
- Concurrent active duplicates (derivatives ×3, social ×5+) are a confounding variable that may need to be controlled by feature-flagging during truth-suite runs.

### 15.4 For Canonicalization (Plan 1.5 FRP Sequencing)

Suggested order, based on concurrent active import severity (Plan 1.8 records evidence; final order is set in Phase 2 prioritization):

1. **Derivatives family** (3 concurrent active variants — highest user-output divergence risk).
2. **Social/sentiment family** (5+ concurrent active variants).
3. **News family** (2 concurrent active variants).
4. **OmniScore data fetchers** (3 variants; lower risk because Plan 1.3 NB-008 defers deep provider work).
5. **OmniScore variants** (v2.5, v3, project-omniscore variants).
6. **Anomaly latency monitor** (likely low-traffic).

Each requires its own FRP.

---

## 16. What This Inventory Does Not Do

Explicitly out of scope for Plan 1.8:

- **No code deletion.** Even files identified as `LEGACY_OR_DUPLICATIVE` remain on disk and importable until an FRP retires them.
- **No canonical winner selection.** Plan 1.8 records evidence; Phase 2 prioritizes; FRP decides.
- **No refactor execution.** Even the obvious `index.ts` monolith split is deferred to Phase 2 BTARs.
- **No provider / API implementation.** Plan 1.3 NB-008 still governs.
- **No CIP.1 work.** Plan 1.3 NB-006 still governs.
- **No new files.** Plan 1.8 creates only the four governance artifacts (this document + three registries).
- **No L-layer activation.** Dormant remains dormant; Plan 1.4 freezes new architecture work.

---

## 17. Done Definition

Plan 1.8 is complete only when:

> **Coinet backend v1 has a repo-resident inventory that classifies the existing backend codebase into V1_CORE, V1_SUPPORTING, DEFERRED, DORMANT_ARCHITECTURE, LEGACY_OR_DUPLICATIVE, and UNKNOWN_REQUIRES_TRIAGE; identifies load-bearing active runtime surfaces; separates supporting infrastructure from core intelligence; isolates dormant certified architecture; records duplicate service families without prematurely deleting them; exposes unknown surfaces honestly; and gives Phase 1 implementation work a practical map of what can be protected, tested, deferred, or later canonicalized.**

### 17.1 Artifact Completeness Check

- `backend-v1-existing-backend-surface-inventory.md` ✅ (this document)
- `backend-v1-existing-backend-surface-classification.registry.md` ✅
- `backend-v1-legacy-duplicative-surface.registry.md` ✅
- `backend-v1-unknown-surface-triage.registry.md` ✅

### 17.2 Classification Coverage Check (Plan 1.8 §18.2)

- Active chat path ✅ (SURF-001..SURF-008)
- Active judgment path ✅ (SURF-009..SURF-019)
- AI service path ✅ (SURF-020, SURF-021)
- Scoring/ranking family ✅ (SURF-500; details in legacy registry §A)
- Certified L5–L14 architecture ✅ (SURF-300..SURF-309)
- Auth/session/conversation supporting ✅ (SURF-200..SURF-207)
- Known duplicate service families ✅ (legacy registry §A–§L)
- Known deferred/future product systems ✅ (SURF-400..SURF-410)

### 17.3 Evidence Discipline Check

Every row in the classification registry carries an `Evidence` field. No row is purely vibes-based. Where evidence is insufficient, the surface is classified as `UNKNOWN_REQUIRES_TRIAGE` and recorded in the triage registry.

### 17.4 Non-Action Check (Plan 1.8 §18.5)

- No code deleted ✅
- No canonical winners selected ✅
- No refactors executed ✅
- No provider/API implementation ✅
- No CIP.1 work ✅
- Only governance artifacts created ✅

---

## 18. Transition to Plan 1.9

The next required step is:

> **Plan 1.9 — Scope Enforcement in Daily Development**

Plan 1.9 answers:

> How do engineers use the inventory, registries, and task-admission system every day so new work stays compliant with the backend v1 convergence program?

### 18.1 Closed Stack Through Plan 1.8

```text
Plan 1.1 = Why                                       [ACTIVE]
Plan 1.2 = What is in                                [ACTIVE]
Plan 1.3 = What is out                               [ACTIVE]
Plan 1.4 = No new architecture                       [ACTIVE]
Plan 1.5 = No new implementation sprawl              [ACTIVE]
Plan 1.6 = Task-by-task admission law                [ACTIVE]
Plan 1.7 = Repo-resident source-of-truth system      [ACTIVE]
Plan 1.8 = Existing backend surface inventory        [ACTIVE]   ← this document
Plan 1.9 = Scope enforcement in daily development    [NEXT]
```

---

## 19. Acceptance Block

```text
Backend v1 Existing Backend Surface Inventory — Acceptance

Accepted by: ____________________________
Role:        ____________________________
Date:        ____________________________

I confirm that:
  [ ] I have read this document in full.
  [ ] I accept the six-class taxonomy (§5) and the per-class
      decision rules referenced in the classification registry.
  [ ] I accept the high-level backend map in §7 as a truthful
      representation of the current production runtime path
      and the dormancy of L5–L14.
  [ ] I accept the legacy/duplicative registry's findings,
      including the critical observation that multiple
      duplicate families are concurrently active.
  [ ] I accept the unknown triage registry as a list of open
      questions, not classifications.
  [ ] I accept the Phase 2 highest-priority hardening targets
      in §15.2.
  [ ] I accept that no code is modified, deleted, or canonicalized
      by this plan.
  [ ] I understand that canonicalization of duplicate families
      requires Plan-1.5-governed FRPs, sequenced during Phase 2
      planning, not in this plan.
```

Once accepted, the `Status` field is authoritative. Until accepted, treat this document as DRAFT.

---

*End of Backend v1 Existing Backend Surface Inventory — Plan 1.8.*
