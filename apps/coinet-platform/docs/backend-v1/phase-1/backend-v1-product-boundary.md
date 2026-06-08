# Backend v1 Product Boundary

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.2
Effective: 2026-05-19
Authority: Backend v1 Completion Program
Inherits From: Plan 1.1 — Phase 1 Charter (`phase-1-charter.md`)
Supersedes: All implicit, undocumented, or chat-only assumptions about which backend surfaces belong to Coinet v1

---

## 0. Document Identity and Authority

This document is the **positive-scope authority** of the Coinet Backend v1 program. It is the first plan inside Phase 1 that converts the Phase 1 Charter's general production-convergence doctrine into a concrete, finite, enforceable backend product boundary.

This document:

- does not implement any endpoint,
- does not refactor any service,
- does not fix the build,
- does not finalize any API schema,
- does not declare frontend integration contracts,
- does not start provider/API integration,
- does not enumerate the deferred non-blockers in detail (Plan 1.3 does that).

It performs one job and one job only:

> **It defines the exact backend surfaces that Coinet v1 is allowed to finish and ship, classifies each by priority, and establishes the dependency structure that all subsequent backend work must obey.**

Where this document and any later subplan conflict on the question of what is or is not a v1 backend surface, this document prevails until amended through the change-control procedure in Plan 1.1 §13.

---

## 1. Section 1.2.1 — Constitutional Purpose of the Backend v1 Product Boundary

### 1.2.1.1 Purpose Statement

The constitutional purpose of Plan 1.2 is the following sentence, which is the **root authority of the positive backend scope**:

> **The Coinet v1 backend exists to deliver a production-ready judgment intelligence system through a finite set of user-relevant backend surfaces: AI Chat, Asset Judgment, Market/Terminal Intelligence, Radar/Ranking Intelligence, essential Auth/Session/Conversation Persistence, and only those Alerts that can be supported truthfully without weakening the core backend launch path.**

This sentence governs every inclusion and exclusion decision made under Plan 1.2. If a later document loses sight of this sentence, the later document is wrong, not this one.

### 1.2.1.2 Why This Purpose Matters — Four Failure Modes Prevented

Without a positive product boundary, backend work remains vulnerable to four failure modes that this plan formally closes.

**Failure Mode A — Everything feels relevant.**
Because Coinet is ambitious, almost any backend idea can be framed as "important." Without a written boundary, importance becomes negotiable in the moment, and "no" becomes hard to say.

**Failure Mode B — Dormant systems continue to absorb time.**
Architectural systems that are real (L11, L12, full L13 runtime, full L14 runtime) but not required for v1 can keep pulling focus simply because they exist and are improvable. The boundary removes their gravitational pull during Phase 1.

**Failure Mode C — Shipping criteria remain undefined.**
If no one knows exactly what the backend must provide, "production-ready" becomes subjective and unfalsifiable. The boundary makes "production-ready" mean "these surfaces, at this level."

**Failure Mode D — Frontend and backend later connect to different assumptions.**
The backend needs a stable product surface definition before future frontend integration so that the integration contract is not invented under deadline pressure.

Plan 1.2 prevents all four.

---

## 2. Section 1.2.2 — Relationship to Plan 1.1 and the Current Backend Mission

### 1.2.2.1 Inheritance From Plan 1.1

Plan 1.2 explicitly inherits the following from the Phase 1 Charter and treats them as binding preconditions:

- backend expansion is frozen,
- the current pre-API execution boundary is Phase 1 → Phase 2 → Phase 3 → STOP AND REASSESS,
- no broad new backend side quest is active,
- every backend task must increase the probability of production-ready Coinet v1,
- the three allowed Phase 1 goals (technical honesty, live-path trustworthiness, synthetic judgment correctness) remain the operative filter for any work performed against the surfaces defined here.

Nothing in this document repeals or weakens those inherited rules. Where this document grants a surface its place in v1, it does so subject to those rules, not in spite of them.

### 1.2.2.2 Plan 1.2's Role in the Roadmap

The Phase 1 backend roadmap is:

```text
Plan 1.1 — Declare the production-convergence mission       [COMPLETE]
Plan 1.2 — Define the positive backend v1 product boundary  [THIS DOCUMENT]
Plan 1.3 — Define what is explicitly not a v1 blocker       [NEXT]
Plan 1.4+ — Enforce freeze laws and execution discipline    [SUBSEQUENT]
```

Plan 1.2 is therefore the **first finite product definition**. After Plan 1.2 is accepted, "what is in v1" is no longer a matter of interpretation.

### 1.2.2.3 What Plan 1.2 Does Not Do

Plan 1.2 does not yet:

- define the full deferred / non-blocker registry in detail (Plan 1.3),
- refactor any code,
- fix the build or CI,
- implement any backend endpoint,
- finalize API request/response schemas,
- decide final frontend integration contracts,
- begin provider/API integration,
- decide which of the duplicated implementations (e.g., `services/omniscore_v3/` vs L11) is canonical (deferred to Reconciliation Matrix work, not Phase 1).

Plan 1.2 defines the **backend v1 capability boundary** that later plans and implementation phases must obey. Implementation choices inside the boundary are made later.

---

## 3. Section 1.2.3 — First Principle of Plan 1.2

### 1.2.3.1 Canonical First Principle

The governing inclusion doctrine is:

> **A backend capability belongs to Coinet v1 only if it directly supports the delivery of trustworthy market judgment, user understanding of that judgment, or the essential continuity needed to persist and revisit that judgment.**

This principle is the test for every surface admitted in Section 4 and the test for every later proposal to expand the v1 surface set.

### 1.2.3.2 What Qualifies a Backend Surface as v1-Worthy

A backend surface is admissible into v1 if and only if it satisfies at least one of the following four criteria:

**Criterion A — It directly produces judgment.**
Examples: Asset Judgment (V1-S02), Market/Terminal Intelligence (V1-S03), Radar/Ranking Intelligence (V1-S04).

**Criterion B — It allows the user to query or understand judgment.**
Example: AI Chat (V1-S01).

**Criterion C — It preserves the user/session/context required for the product to function.**
Example: Essential Auth/Session/Conversation Persistence (V1-S05).

**Criterion D — It delivers judgment proactively without introducing unsupported promises.**
Example: Truthful Alerts, conditional only (V1-S06).

A surface that satisfies none of these criteria is not v1-worthy under this charter, regardless of any other argument made for it.

### 1.2.3.3 What Does Not Qualify by Default

A backend system is **not** automatically v1-worthy because it is:

- architecturally impressive,
- already partially coded,
- strategically interesting,
- helpful for a future moat,
- desired for a later product vision,
- close to being usable,
- the favorite of any single contributor,
- aligned with industry buzzwords or competitor surfaces.

The bar is the first principle, not appeal.

---

## 4. Section 1.2.4 — Canonical Backend v1 Surface Registry

### 1.2.4.1 Surface Class Registry

The Coinet v1 backend consists of exactly the following six surface classes. No other backend surface is admitted into v1 by this document.

```text
V1-S01 — AI_CHAT
V1-S02 — ASSET_JUDGMENT
V1-S03 — MARKET_TERMINAL_INTELLIGENCE
V1-S04 — RADAR_RANKING_INTELLIGENCE
V1-S05 — ESSENTIAL_AUTH_SESSION_CONVERSATION_PERSISTENCE
V1-S06 — TRUTHFUL_ALERTS_CONDITIONAL
```

### 1.2.4.2 Priority Class for Each Surface

| Surface ID | Surface                                             | Status                     |
| ---------- | --------------------------------------------------- | -------------------------- |
| `V1-S01`   | AI Chat                                             | **CORE REQUIRED**          |
| `V1-S02`   | Asset Judgment                                      | **CORE REQUIRED**          |
| `V1-S03`   | Market / Terminal Intelligence                      | **CORE REQUIRED**          |
| `V1-S04`   | Radar / Ranking Intelligence                        | **CORE REQUIRED**          |
| `V1-S05`   | Essential Auth / Session / Conversation Persistence | **SUPPORTING REQUIRED**    |
| `V1-S06`   | Truthful Alerts                                     | **CONDITIONAL ADMISSIBLE** |

### 1.2.4.3 Interpretation of Status Classes

**CORE REQUIRED.**
The Coinet v1 backend is not complete without this surface. Absence or non-trustworthy implementation of a CORE REQUIRED surface is a launch blocker.

**SUPPORTING REQUIRED.**
This surface is not the product thesis itself, but it is required for the product to function seriously. Absence is a launch blocker; weak implementation is a launch risk.

**CONDITIONAL ADMISSIBLE.**
This surface may be included in v1 **only if** it can be supported truthfully without delaying or destabilizing the core required surfaces. If the conditions in §10.3 cannot be met, the surface is deferred — its absence is **not** a launch blocker.

---

## 5. Section 1.2.5 — Surface Specification: V1-S01 AI Chat

### 1.2.5.1 Surface Definition

`V1-S01 — AI_CHAT` is the conversational backend surface through which a user asks questions about Coinet's market intelligence and receives a useful, grounded, judgment-aware answer.

### 1.2.5.2 Why It Belongs to v1

AI Chat is central because Coinet is not merely a dashboard. It is a **judgment intelligence system**. The chat surface is where users ask:

- What is happening?
- Why is it happening?
- What contradicts the current thesis?
- What could happen next?
- What should I watch?
- How do two assets compare?

These are the questions Coinet exists to answer. The backend surface that answers them belongs to v1 by definition.

### 1.2.5.3 Minimum Backend v1 Responsibilities

The backend must support:

1. user message intake,
2. chat session continuity where the product path requires it,
3. access to structured market judgment context,
4. AI response generation,
5. judgment-aware answer formulation,
6. clear degraded / unavailable behavior if structured judgment fails (no silent fallbacks),
7. user-visible response safety gate,
8. basic conversation persistence.

### 1.2.5.4 Required Production Truths

AI Chat in backend v1 must **not** be a generic LLM crypto chatbot. It must be:

```text
Coinet judgment-aware
Evidence/context-informed
Contradiction-sensitive
Uncertainty-aware
Non-recommendational
```

If the chat surface cannot demonstrate these five properties under synthetic test conditions, it is not v1-ready, regardless of how fluent its prose is.

### 1.2.5.5 Current Backend Relevance

This surface already exists in the live path:

```text
POST /api/chat
→ apps/coinet-platform/src/api/chat/service.ts
→ buildSignalSnapshot()
→ services/judgment/produceJudgment()
→ formatJudgmentForAI()
→ aiService.analyze()
→ apps/coinet-platform/src/services/ai-service.ts
```

This surface is therefore not speculative. It is load-bearing today. The point of later Phase 1 and Phase 2 work is **not** to invent AI Chat, but to make the current implementation production-trustworthy.

### 1.2.5.6 Explicit Boundary

AI Chat in v1 does **not** require:

- agent orchestration frameworks,
- autonomous research agents,
- long-running multi-step research workspaces,
- plugin-controlled chat actions,
- tool-use chains beyond what the current judgment context provides,
- multi-user collaborative chat,
- voice or other non-text modalities.

Those are advanced future chat modes and belong to later planning, not the positive v1 surface.

---

## 6. Section 1.2.6 — Surface Specification: V1-S02 Asset Judgment

### 1.2.6.1 Surface Definition

`V1-S02 — ASSET_JUDGMENT` is the backend capability that produces a Coinet judgment for a specific asset or entity.

It is the backend expression of the product's core promise:

> "Tell me what is happening with this asset, why, what weakens the thesis, what could happen next, and how much confidence the system deserves."

### 1.2.6.2 Why It Belongs to v1

This is arguably the single most important backend surface. The app's Asset page, chat answers, future reports, future alerts, and future watchlist logic all depend on reliable asset-level judgment. If Asset Judgment is not trustworthy, no other surface can be trustworthy on top of it.

### 1.2.6.3 Minimum Backend v1 Responsibilities

The backend must support a structured judgment outcome that covers at least:

1. entity or asset reference,
2. current state,
3. primary cause,
4. thesis,
5. contradictions,
6. timing / maturity / phase posture where available,
7. scenario or next-path framing,
8. confidence posture,
9. data completeness or degraded state where relevant.

### 1.2.6.4 Required Production Truths

Asset Judgment must:

- preserve contradictions through to the user (never collapse them into clean certainty),
- never present uncertain assets as clean certainty,
- distinguish constructive from fragile,
- react differently to different market signal combinations (not produce a uniform template),
- remain semantically correct under synthetic truth cases (the AJP.1 corpus and its successors).

### 1.2.6.5 Current Backend Relevance

This is already present in the active judgment engine at:

```text
apps/coinet-platform/src/services/judgment/produceJudgment()
```

AJP.1 (`ajp1.fp.f61b2c30`) demonstrates that the active path produces structured judgments end-to-end under synthetic inputs. The point of later Phase 1 and Phase 2 work is **not** to invent Asset Judgment, but to make the current implementation launch-grade.

### 1.2.6.6 Explicit Boundary

Asset Judgment in v1 does **not** require:

- a full CIP.1 unified L5→L14 architecture,
- every dormant L11/L12/L13 constitutional runtime to be product-active,
- every duplicate scoring implementation reconciled,
- arbitrary future asset classes beyond the backend's v1 scope,
- automated multi-asset comparison reports,
- backtested historical judgment replay surfaces.

Asset Judgment must be **correct and stable**, not philosophically maximal.

---

## 7. Section 1.2.7 — Surface Specification: V1-S03 Market / Terminal Intelligence

### 1.2.7.1 Surface Definition

`V1-S03 — MARKET_TERMINAL_INTELLIGENCE` is the backend capability that produces a higher-level view of the current market environment. It supports the app's Terminal-like overview and answers:

- What is the broad market posture?
- What regime or structural condition dominates?
- What themes or risks matter most?
- What has shifted?
- What deserves attention first?

### 1.2.7.2 Why It Belongs to v1

Coinet should not feel like a collection of isolated token cards. It must help users understand the **market context in which judgments sit**. Without this surface, the product loses its synthesizing identity.

### 1.2.7.3 Minimum Backend v1 Responsibilities

The backend must provide some form of:

1. market-wide or system-wide posture,
2. dominant intelligence thesis,
3. major current risk or contradiction,
4. high-level shifts or noteworthy movements,
5. confidence / readiness posture where the product surface exposes it.

### 1.2.7.4 Required Production Truths

Terminal Intelligence must **not** be:

- a generic market-news summary,
- a decorative homepage feed,
- a list of unrelated metrics,
- a re-skinned price ticker,
- a competitor-style "trending tokens" surface dressed in Coinet vocabulary.

It must synthesize Coinet's interpretation of the market environment in a way that is recognizably Coinet, not recognizably generic.

### 1.2.7.5 Current Backend Relevance

The active system already constructs market-wide context and chat context blocks that attempt to synthesize broader conditions. Plan 1.2 only declares that **a formal backend surface for market-level intelligence belongs to v1**. The exact endpoint shape, generation logic, and reconciliation with any future dedicated market-intelligence module is handled in later plans.

### 1.2.7.6 Explicit Boundary

Market / Terminal Intelligence in v1 does **not** require:

- a full institutional macro engine,
- global multi-asset scenario modeling,
- full automated research report generation,
- macro factor decomposition,
- cross-asset correlation surfaces beyond what the active path already produces,
- alternative data integrations (on-chain MEV analytics, derivatives flow desks, etc.) beyond what currently exists.

The v1 boundary is narrower: **a reliable backend market-intelligence surface that gives the Coinet app a truthful macro judgment spine.**

---

## 8. Section 1.2.8 — Surface Specification: V1-S04 Radar / Ranking Intelligence

### 1.2.8.1 Surface Definition

`V1-S04 — RADAR_RANKING_INTELLIGENCE` is the backend capability that identifies, orders, or filters assets/projects according to Coinet-specific judgment logic. It supports product questions like:

- Which assets are becoming more interesting?
- Which ones have strong coherence?
- Which ones are fragile?
- Which rank highly on opportunity but carry serious contradiction pressure?
- Which deserve deeper inspection?

### 1.2.8.2 Why It Belongs to v1

Radar is the discovery layer of Coinet. Without it, Coinet risks becoming purely reactive:

```text
User asks about asset → Coinet answers
```

Radar allows the inverse:

```text
Coinet tells the user what deserves attention.
```

This is strategically important: it converts Coinet from a question-answering surface into a system that actively narrows the user's attention.

### 1.2.8.3 Minimum Backend v1 Responsibilities

The backend must support:

1. a ranked or filtered list of entities/assets,
2. a transparent rationale or scoring basis,
3. distinguishable ranking dimensions (not a single opaque score),
4. judgment-aware ranking semantics rather than raw popularity,
5. basic risk / coherence / contradiction differentiation.

### 1.2.8.4 Required Production Truths

Radar must **not** simply become:

- "top movers,"
- "trending coins,"
- "market cap list with marketing language,"
- "volume leaderboard,"
- "social-momentum chart with a Coinet logo on it."

It must reflect Coinet's differentiation: **ranked judgment, not raw noise.**

### 1.2.8.5 Current Backend Relevance

The engineer's analysis showed multiple score/ranking-related surfaces exist (notably `services/omniscore_v3/` alongside the certified L11 program). Plan 1.2 does **not** decide which exact ranking implementation survives — that is a Reconciliation Matrix question, not a Phase 1 question — but it declares:

> **Radar / Ranking Intelligence is a v1 backend surface that must exist.**

### 1.2.8.6 Explicit Boundary

Radar / Ranking Intelligence in v1 does **not** require:

- a strategy marketplace,
- customizable user-built screeners,
- advanced lab-style factor weighting,
- backtesting integrations,
- saved-screen sharing,
- multi-strategy ensembles,
- user-uploaded factor definitions.

Those are outside the positive v1 product boundary.

---

## 9. Section 1.2.9 — Surface Specification: V1-S05 Essential Auth, Session, and Conversation Persistence

### 1.2.9.1 Surface Definition

`V1-S05 — ESSENTIAL_AUTH_SESSION_CONVERSATION_PERSISTENCE` is the supporting backend foundation that ensures the product behaves like a real application rather than a stateless demo.

### 1.2.9.2 Why It Belongs to v1

Even if Coinet's differentiation is judgment intelligence, a production app still needs:

- trusted user sessions,
- conversation continuity,
- the ability to preserve history where the product experience requires it,
- a stable backend relationship between authenticated users and their requests.

Without this surface, every other surface degrades in trust.

### 1.2.9.3 Minimum Backend v1 Responsibilities

The backend must support, where already structurally relevant:

1. authenticated user flow,
2. session validity,
3. conversation creation and retrieval,
4. message persistence or equivalent continuity,
5. safe association between user/session and requests,
6. basic retrieval of prior chat context if the product path uses it.

### 1.2.9.4 Required Production Truths

This surface is not the product thesis, but weak implementation undermines trust. The backend must not:

- randomly lose conversations,
- confuse users/sessions,
- blur authenticated and unauthenticated state,
- persist sensitive data unpredictably,
- silently drop messages,
- leak conversation context across users.

### 1.2.9.5 Current Backend Relevance

The codebase already contains a wide Prisma/auth/conversation surface in `apps/coinet-platform/prisma/schema.prisma` and the `api/auth/` and `api/chat/` modules. Plan 1.2 declares only the essential production role, **not a full schema cleanup**. Schema-level work is admissible during Phase 1 only insofar as it removes silent failure or ambiguity in the essential surfaces above.

### 1.2.9.6 Explicit Boundary

V1-S05 does **not** automatically pull in:

- referrals,
- AB testing infrastructure,
- plugins,
- complex social features (follows, sharing, profiles),
- every account-related Prisma model in the schema,
- billing or subscription state machines,
- multi-tenant org structures.

Only **essential v1 continuity and access control** belong here.

---

## 10. Section 1.2.10 — Surface Specification: V1-S06 Truthful Alerts (Conditional Only)

### 1.2.10.1 Surface Definition

`V1-S06 — TRUTHFUL_ALERTS_CONDITIONAL` is the backend ability to notify a user proactively when Coinet's intelligence changes in a way the system can support honestly.

### 1.2.10.2 Why Alerts Are Not Core-Required

Alerts are strategically attractive, but they should not delay the backend core unless the required truth standard is already attainable. Backend v1 must not overcommit to alerts that are:

- noisy,
- unsupported,
- hard to maintain,
- not yet connected to reliable judgments,
- delivered through channels not yet stably implemented,
- difficult to explain after the fact.

### 1.2.10.3 Conditional Inclusion Rule

Truthful Alerts may remain in backend v1 only if **all** of the following six conditions hold simultaneously:

1. the triggering intelligence exists reliably,
2. the alert is explainable,
3. the alert is not deceptive or recommendation-like,
4. the backend can persist or trace what was sent,
5. delivery logic does not destabilize the core live runtime,
6. the alert feature does not delay the completion of the required core surfaces.

If any of these conditions are not met, Alerts are **deferred** — their absence is not a launch blocker.

### 1.2.10.4 Minimum Backend v1 Responsibilities If Alerts Remain Included

If V1-S06 remains in v1, the backend must support:

1. alert creation from actual intelligence state (not heuristics divorced from judgment),
2. clear trigger reason,
3. non-recommendational wording,
4. delivery state where applicable,
5. user-level scope or subscription if already present,
6. basic persistence or auditability.

### 1.2.10.5 Explicit Boundary

Truthful Alerts are **not** allowed to silently expand into:

- an advanced Telegram ecosystem beyond what is already real and supportable,
- a push alert platform with multiple OS targets,
- sophisticated delivery experiments,
- full L14 calibration loops applied to alert outcomes,
- multi-channel orchestration (email, SMS, in-app, push, Telegram in parallel) unless already real and supportable,
- engagement-driven prioritization (engagement-as-truth is constitutionally prohibited by L14 and remains prohibited here).

Those are future or conditional, not required by the positive v1 boundary.

---

## 11. Section 1.2.11 — Cross-Surface Dependency Law

Plan 1.2 must make clear that these surfaces are not independent islands. They form a structured dependency lattice.

### 1.2.11.1 Dependency Relationships

| Surface                        | Depends on                                                           |
| ------------------------------ | -------------------------------------------------------------------- |
| AI Chat                        | Asset Judgment, Market Intelligence, conversation/session continuity |
| Asset Judgment                 | Active judgment engine, signal availability, eventual real data      |
| Market / Terminal Intelligence | Market-wide judgment / context logic                                 |
| Radar / Ranking                | Score / ranking logic and judgment interpretation                    |
| Auth / Session / Persistence   | All user-facing experiences                                          |
| Truthful Alerts                | Judgment quality and delivery support                                |

### 1.2.11.2 Why This Matters

A backend surface should not be considered "implemented" in isolation if it depends on another surface that remains undefined or unreliable. Concretely:

- Alerts cannot be truthfully production-ready if Asset Judgment remains semantically unstable.
- Radar cannot claim quality if scoring semantics are arbitrary.
- Chat cannot feel like Coinet if it is disconnected from judgment outputs.
- Market Intelligence cannot be coherent if Asset Judgment is internally inconsistent across assets.

Dependency-aware sequencing therefore matters as much as surface inclusion.

### 1.2.11.3 Dependency Prioritization — The Backend v1 Reasoning Spine

Plan 1.2 formally establishes this priority:

```text
Asset Judgment + AI Chat form the central v1 reasoning spine.
Market Intelligence + Radar extend that spine into product surfaces.
Auth/Persistence supports continuity.
Alerts remain conditional on truthfulness and non-disruption.
```

This priority does not enumerate implementation order — that is Plan 1.4+ work. It enumerates **dependency priority**: when two surfaces compete for engineering attention, the one closer to the central reasoning spine wins by default.

---

## 12. Section 1.2.12 — Backend v1 Reasoning Spine Summary

The backend v1 reasoning spine is the irreducible core of the product. It consists of:

- **V1-S02 Asset Judgment** — the engine that produces structured judgment for a given asset.
- **V1-S01 AI Chat** — the surface through which the user accesses, interrogates, and understands that judgment.

These two surfaces are tightly coupled. Chat without Asset Judgment is a generic LLM. Asset Judgment without Chat is a hidden engine the user cannot reach. Together they form the minimum coherent expression of Coinet as a product.

V1-S03 Market Intelligence and V1-S04 Radar extend this spine outward into context (what is happening) and discovery (what to look at). V1-S05 supports continuity. V1-S06 is conditional.

> If the spine is not trustworthy, the rest of the surfaces are decoration.

This sentence is binding. Engineering priority during Phase 1 and Phase 2 follows it.

---

## 13. Section 1.2.13 — Required Governance Artifacts

### 13.1 Mandatory Primary Artifact

The mandatory primary artifact of Plan 1.2 is **this document**, located at:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-product-boundary.md
```

### 13.2 Required Sections (Satisfied by This Document)

1. Document identity (Section 0 and front matter),
2. Purpose of the backend v1 product boundary (Section 1),
3. Inheritance from Plan 1.1 (Section 2.1),
4. First principle (Section 3),
5. Surface class registry (Section 4),
6. Status class definitions (Section 4.3),
7. Full specification for all six surfaces (Sections 5–10),
8. Cross-surface dependency law (Section 11),
9. Backend v1 reasoning spine summary (Section 12),
10. Explicit note that Plan 1.3 will define non-blockers and deferred scope (Section 2.2 and Section 15),
11. Done definition (Section 15.1),
12. Acceptance block (Section 17).

### 13.3 Optional Supporting Registry

A concise table-only reference may optionally be created at:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-surface-registry.md
```

If created, it must not contradict this document. Where they ever diverge, this document prevails.

---

## 14. Section 1.2.14 — Verification and Certification Criteria

Plan 1.2 is complete only when all of the following are simultaneously true.

### 14.1 Scope Definition Criteria

The document explicitly defines:

- 4 core required surfaces (V1-S01, V1-S02, V1-S03, V1-S04),
- 1 supporting required surface (V1-S05),
- 1 conditional admissible surface (V1-S06).

### 14.2 Precision Criteria

Each surface has all six required components:

- definition,
- reason it belongs to v1,
- minimum backend responsibilities,
- production truths,
- current backend relevance,
- explicit boundary.

### 14.3 Boundary Criteria

The document must make it impossible to misread Coinet v1 backend as including:

- Strategy Lab backend,
- Chart Canvas backend,
- plugin ecosystem,
- full CIP.1 unified architecture,
- full L14 compounding loops (delivery routing, experiment system, calibration spine operationalization),
- broad experimental backend systems,
- referrals / billing / multi-tenant infrastructure.

Plan 1.3 will define these more fully in the negative-scope register. Plan 1.2 must not imply they are in scope.

### 14.4 Dependency Criteria

The document must clearly state:

- Asset Judgment and AI Chat are the central reasoning spine (Section 12),
- Market Intelligence and Radar extend the product (Section 11.3),
- Auth/Persistence supports continuity (Section 11.3),
- Alerts are conditional (Section 4.2 and Section 10).

### 14.5 Acceptance Checklist

A reviewer must be able to answer from this document alone:

1. What backend surfaces belong to Coinet v1?
2. Which are core required?
3. Which are supporting required?
4. Which are conditional?
5. Why does each belong?
6. What is each surface expected to minimally do?
7. What is **not** implied by each surface?
8. What surfaces form the backend v1 product spine?

If those questions cannot be answered clearly from the document, Plan 1.2 is not complete.

---

## 15. Section 1.2.15 — Done Definition and Transition to Plan 1.3

### 15.1 Done Definition

Plan 1.2 is complete only when:

> **Coinet backend v1 has a written, repo-resident, positive product boundary that formally defines the exact backend surfaces allowed to represent the v1 backend program, classifies each by priority, specifies the minimum production responsibility of each, and establishes the cross-surface dependency structure that all subsequent backend work must inherit.**

This document satisfies that definition once accepted via Section 17.

### 15.2 Transition to Plan 1.3

Once Plan 1.2 is accepted, the next required step is:

> **Plan 1.3 — Explicit Non-Blocker and Non-Scope Registry**

Plan 1.3 answers the complementary negative-scope question:

> What should explicitly **not** delay the backend v1 launch?

Together:

```text
Plan 1.2 = What is in
Plan 1.3 = What is not in
```

Only after both exist does the backend v1 scope become fully bounded. Until Plan 1.3 is accepted, deferred-scope decisions remain governed by Plan 1.1's outcome categories (`LOCKED` / `DEFERRED` / `NOT YET DECIDED`) and Plan 1.2's explicit boundary clauses inside each surface specification.

---

## 16. Glossary (Document-Local Definitions)

- **Surface** — a coherent backend capability addressable as a product unit; one of the six V1-S* entries in Section 4.
- **Reasoning spine** — the dependency core of v1, composed of V1-S02 Asset Judgment and V1-S01 AI Chat (Section 12).
- **Core Required** — surface whose absence or non-trustworthy implementation blocks launch.
- **Supporting Required** — surface whose absence blocks launch but whose product-thesis role is supportive, not central.
- **Conditional Admissible** — surface whose inclusion is contingent on the six conditions of §10.3; its absence does not block launch.
- **Active judgment engine** — the runtime composed of `services/judgment/produceJudgment()` and its current collaborators, as referenced by Plan 1.1.
- **Truthful** (applied to alerts) — explainable, non-recommendational, traceable, grounded in real intelligence state.

These definitions are document-local. Where another document in the repository uses these terms in a conflicting way, this document prevails for backend v1 scope purposes.

---

## 17. Acceptance Block

This boundary is accepted when the following block is filled in. Until accepted, the document is treated as DRAFT regardless of the `Status` field in the front matter.

```text
Backend v1 Product Boundary — Acceptance

Accepted by: ____________________________
Role:        ____________________________
Date:        ____________________________

I confirm that:
  [ ] I have read this document in full.
  [ ] I accept the six-surface registry in Section 4 as the exhaustive positive scope of Coinet v1 backend.
  [ ] I accept the reasoning spine declared in Section 12.
  [ ] I will not authorize backend work on surfaces outside this boundary
      unless a scope change is approved through Plan 1.1 §13.
  [ ] I understand Plan 1.3 will define the negative scope that complements this document.
```

Once accepted, the `Status` field in the front matter is the authoritative state. Until accepted, treat this document as DRAFT in all operational decisions.

---

*End of Backend v1 Product Boundary — Plan 1.2.*
