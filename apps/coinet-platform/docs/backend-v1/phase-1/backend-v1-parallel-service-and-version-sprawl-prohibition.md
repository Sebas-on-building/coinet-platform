# Backend v1 Parallel-Service and Version-Sprawl Prohibition

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.5
Effective: 2026-05-19
Authority: Backend v1 Completion Program
Inherits From:
  - Plan 1.1 — Phase 1 Charter (`phase-1-charter.md`)
  - Plan 1.2 — Backend v1 Product Boundary (`backend-v1-product-boundary.md`)
  - Plan 1.3 — Backend v1 Non-Blocker and Non-Scope Registry (`backend-v1-non-blocker-and-non-scope-registry.md`)
  - Plan 1.4 — Backend v1 Architecture Expansion Freeze Law (`backend-v1-architecture-expansion-freeze-law.md`)
Supersedes: All implicit assumptions that new `-v2`, `-final`, `-complete`, or parallel-service implementations are admissible by default

---

## 0. Document Identity and Authority

This document is the **implementation-sprawl enforcement authority** of the Coinet Backend v1 program. It is the fifth plan inside Phase 1 and the complement of Plan 1.4.

Plans 1.1–1.4 produced a scope structure:

- Plan 1.1 declared the production-convergence mission,
- Plan 1.2 defined what backend v1 actively is (V1-S01..V1-S06),
- Plan 1.3 defined what must not delay backend v1 (NB-001..NB-010),
- Plan 1.4 prohibited new architecture expansion (FRZ-001..FRZ-008).

Plan 1.5 closes the fourth side of the scope-control square: it prohibits **new parallel implementations**. Where Plan 1.4 stops new architectural surface area, Plan 1.5 stops new implementation duplication at the service level.

This document:

- does not implement any code,
- does not delete or canonicalize any existing duplicate file,
- does not decide which OmniScore, news, social, or derivatives implementation survives,
- does not refactor any module,
- does not reclassify any v1 surface from Plan 1.2,
- does not reclassify any non-blocker from Plan 1.3,
- does not reclassify any freeze entry from Plan 1.4,
- does not begin Plan 1.6 enforcement work.

It performs one job and one job only:

> **It prohibits new parallel-service and version-sprawled implementations going forward, defines the protected capability families and canonical-path classes, establishes formal replacement and bounded shadow-comparison procedures, names the violation taxonomy and prohibited naming patterns, and binds daily development to the rule "one canonical production path per capability."**

Where this document and any later subplan conflict on the question of whether a new implementation file or service family is admissible, this document prevails until amended through the Plan 1.1 §13 change-control procedure.

### 0.1 Pre-execution Dependency Check (Performed)

Before this document was finalized, the executing system confirmed:

1. `phase-1-charter.md` exists and is `ACTIVE`. ✅
2. `backend-v1-product-boundary.md` exists and is `ACTIVE`. ✅
3. `backend-v1-non-blocker-and-non-scope-registry.md` exists and is `ACTIVE`. ✅
4. `backend-v1-architecture-expansion-freeze-law.md` exists and is `ACTIVE`. ✅
5. The truth-clean active-runtime reference is recorded in Plans 1.1 and 1.2 as:
   ```text
   /api/chat
     → api/chat/service.ts
       → buildSignalSnapshot()
       → produceJudgment()
       → formatJudgmentForAI()
       → aiService.analyze()
         → services/ai-service.ts
   ```
   ✅

Plan 1.5 therefore inherits from truth-clean upstream documents.

---

## 1. Section 1.5.1 — Constitutional Purpose

### 1.5.1.1 Canonical Purpose Statement

The constitutional purpose of Plan 1.5 is:

> **The Parallel-Service and Version-Sprawl Prohibition exists to prevent Coinet backend v1 from being delayed, destabilized, or made cognitively unmaintainable by new version-suffixed implementation files, new parallel service families, new alternative intelligence paths, or replacement attempts that do not formally deprecate or explicitly replace the existing path they intend to supersede.**

This sentence is the root authority for every prohibition, every classification, and every exception ruling under Plan 1.5.

### 1.5.1.2 Why This Law Is Necessary — The Two Failure Modes

The backend can fail to converge in two ways:

**Failure Mode A — Architecture sprawl.**
Already blocked by Plan 1.4 (no new layers, no new constitutional programs, no new dormant runtimes).

**Failure Mode B — Implementation sprawl.**
Not a new architecture layer, but a new parallel service:

```text
news-intelligence-v3.ts
omniscore-v4.ts
derivatives-intelligence-next.ts
social-engine-final.ts
```

This is equally dangerous. It creates:

- ambiguity about what code is canonical,
- hidden obsolete paths that remain importable,
- refactor fear,
- testing confusion,
- duplicate bugs fixed in only one variant,
- product drift,
- larger bundle/build surface,
- onboarding impossibility,
- false sense of progress.

Plan 1.5 closes Failure Mode B.

### 1.5.1.3 What Plan 1.5 Changes Operationally

**Before Plan 1.5.**
A developer responding to a difficult backend area could create `existing-service-v2.ts` and postpone the uncomfortable decision of what to do with the original file. The original would remain importable. Drift would compound.

**After Plan 1.5.**
The developer must choose one of:

```text
1. Improve the existing canonical service in place.
2. Extract/refactor the existing service while preserving one canonical path.
3. Formally replace the existing service with an explicit retirement path (FRP).
4. Formally create a temporary shadow candidate under strict expiration and migration rules (BSCP).
5. Defer the work.
```

What is no longer allowed:

```text
"Let's just add another implementation and decide later."
```

The asymmetry shifts: the default is rejection; the burden of proof is on creation.

---

## 2. Section 1.5.2 — Inheritance From Plans 1.1–1.4

### 2.1 Inheritance Statement

> **This prohibition inherits from the Phase 1 Charter, the Backend v1 Product Boundary, the Non-Blocker and Non-Scope Registry, and the Architecture Expansion Freeze Law. It does not reopen scope. It enforces backend convergence at the implementation level.**

Specifically inherited:

**From Plan 1.1:**

- the production-convergence mission,
- the Phase 1 → Phase 2 → Phase 3 → STOP AND REASSESS boundary,
- the three Phase 1 goals (technical honesty, live-path trustworthiness, synthetic judgment correctness),
- the Plan 1.1 §13 change-control procedure.

**From Plan 1.2:**

- the six-surface positive scope (V1-S01..V1-S06),
- the reasoning spine (Asset Judgment + AI Chat).

**From Plan 1.3:**

- the negative-scope taxonomy and ten registered non-blockers.

**From Plan 1.4:**

- the eight-class freeze violation taxonomy (AFV-A..H),
- the eight frozen work entries (FRZ-001..FRZ-008),
- the five legal work classes (A..E).

Plan 1.5 sits below Plan 1.4 in scope but operates orthogonally to it: Plan 1.4 governs architectural shape, Plan 1.5 governs implementation shape.

### 2.2 Relationship Table

| Plan         | Governance function                           |
| ------------ | --------------------------------------------- |
| Plan 1.1     | Why the backend enters production convergence |
| Plan 1.2     | What belongs to backend v1                    |
| Plan 1.3     | What must not delay backend v1                |
| Plan 1.4     | No new architectural territory                |
| **Plan 1.5** | No new duplicated implementation territory    |

---

## 3. Section 1.5.3 — First Principle of Plan 1.5

### 3.1 Canonical First Principle

The governing doctrine of Plan 1.5 is:

> **A backend capability may have only one intended canonical production path at a time; any proposed alternative must either formally replace the existing path, remain a strictly bounded temporary shadow with an expiration condition, or be rejected.**

This is the central rule. Every prohibition, taxonomy, procedure, and decision under Plan 1.5 traces back to it.

### 3.2 Operational Interpretation

For any capability — scoring, derivatives intelligence, social intelligence, news intelligence, sentiment, anomaly monitoring, provider fetching, judgment orchestration, AI response formatting — the system must always be able to answer:

```text
Which path is canonical right now?
```

If the answer is unclear, the backend is already drifting. Plan 1.5 makes that drift formally inadmissible going forward.

### 3.3 What the First Principle Forbids

- "temporary" new implementations that never retire,
- replacement files without retirement plans,
- new `-v2` files merely because refactoring the original is inconvenient,
- keeping three active variants "until we decide,"
- hiding strategic decisions inside filenames,
- parallel services that duplicate product semantics without governance.

### 3.4 What the First Principle Allows

- in-place improvements,
- scoped refactors,
- proper module extraction,
- explicit formal replacement (FRP),
- time-boxed shadow comparison where necessary (BSCP),
- deleted/deprecated legacy variants after replacement.

---

## 4. Section 1.5.4 — Ground-Truth Sprawl Problem Statement

### 4.1 Canonical Problem Statement

> **Coinet's backend has accumulated multiple implementation families in domains where a production system should converge on one canonical path. The problem is not that iteration occurred; iteration is normal. The problem is that prior attempts were preserved as concurrently importable backend surfaces without a consistently enforced replacement, retirement, or shadow-expiration discipline. This creates ambiguity, multiplies testing burden, weakens refactor confidence, and increases the probability that the wrong backend path survives into production by accident.**

### 4.2 Explicitly Observed Duplication Families

The following families are observable in the current `apps/coinet-platform/src/services/` directory as of 2026-05-19. They are cited here as evidence, not as deletion targets.

**Scoring**

```text
omniscore-v2.5.ts
omniscore_v3/
project-omniscore.ts
project-omniscore-v2.ts
```

**Derivatives**

```text
derivatives-intelligence-v2.ts
derivatives-intelligence-final.ts
derivatives-intelligence-complete.ts
comprehensive-derivatives-intelligence.ts
```

**News**

```text
news-intelligence.ts
news-intelligence-v2.ts
news-service.ts
```

**Social / Sentiment**

```text
social-intelligence.ts
social-intelligence-v2.ts
composite-social-score.ts
csi-v4-factors.ts
csi-v5-calibrated.ts
coinet-sentiment-index.ts
```

**Monitoring**

```text
anomaly-latency-monitor.ts
anomaly-latency-monitor-v2.ts
```

**Fetchers**

```text
omniscore-data-fetcher.ts
omniscore-data-fetcher-v22.ts
omniscore-data-fetcher-v23.ts
```

These are not exhaustive. They are the named examples that drove the engineering audit. They demonstrate the pattern; they are not the only instances.

### 4.3 Important Nuance — What Plan 1.5 Is Not

> **Plan 1.5 is forward-looking prohibition and convergence governance. It does not, by itself, delete or canonicalize every existing duplicate family. That cleanup is a later execution task and must be guided by active-import truth, production relevance, and Phase 1–3 priorities.**

Plan 1.5 stops the bleeding. It does not, in this document, perform the surgery. Surgery is the work of later scoped cleanup, performed against active-import maps and Phase 1–3 relevance.

---

## 5. Section 1.5.5 — Canonical Version-Sprawl Prohibition Law

### 5.1 Canonical Law Statement

> **No new backend service implementation may be introduced under a version-suffixed, finality-suffixed, completeness-suffixed, or otherwise parallelizing name pattern unless it is part of a formally approved replacement (FRP) or shadow-comparison process (BSCP) that identifies the existing canonical path, defines the retirement or promotion criteria, and records the expiration condition of the alternative.**

### 5.2 Immediate Explicit Prohibitions

New backend implementation files or folders may not be named with patterns such as:

```text
-v2
-v3
-v4
-vNext
-next
-new
-final
-complete
-comprehensive
-rebuilt
-ultra
-master
```

when used to denote **another implementation of an existing backend capability**.

### 5.3 Directly Prohibited Examples

```text
news-intelligence-v3.ts                    ❌
derivatives-intelligence-ultimate.ts       ❌
omniscore-v4.ts                            ❌
social-intelligence-final.ts               ❌
confidence-engine-complete.ts              ❌
judgment-orchestrator-next.ts              ❌
ai-service-final.ts                        ❌
chat-service-v2.ts                         ❌
```

### 5.4 Law Applies to Capability Duplication, Not Semantic Data Versioning

The prohibition applies to:

- implementation variants,
- competing service files,
- duplicate runtime paths.

It does **not** prohibit legitimate semantic versioning for:

- historical fact family names,
- persisted schema version suffixes,
- wire API versions,
- migration identifiers,
- certification artifact versions,
- deliberately versioned protocol/document formats.

**Allowed examples (semantic data versioning):**

```text
ts_ai_output_fact_v1                       ✅  (historical fact family)
api/v1/chat                                ✅  (wire API version)
migration_2026_05_19                       ✅  (migration identifier)
L14FeedbackRecordV1                        ✅  (stable persisted schema version)
```

**Prohibited examples (implementation sprawl in disguise):**

```text
chat-service-v2.ts                         ❌
ai-service-final.ts                        ❌
judgment-engine-complete.ts                ❌
```

The rule in one sentence:

> **A version token is legal only when it represents a stable external or historical contract, not when it disguises a competing internal implementation.**

---

## 6. Section 1.5.6 — Parallel-Service Prohibition Law

### 6.1 Canonical Law Statement

> **No new parallel backend service family may be created for scoring, social intelligence, sentiment, news, derivatives, fetchers, anomaly monitoring, or any other v1-relevant intelligence capability unless the new path explicitly replaces, formally deprecates, or enters a bounded approved shadow-comparison process against the existing path.**

### 6.2 Protected Capability Registry

Ten capability families are formally protected by Plan 1.5. Each represents a domain where Coinet has either already accumulated duplication or is at high risk of doing so.

```text
PSC-001 — SCORING
PSC-002 — DERIVATIVES_INTELLIGENCE
PSC-003 — NEWS_INTELLIGENCE
PSC-004 — SOCIAL_INTELLIGENCE
PSC-005 — SENTIMENT_INTELLIGENCE
PSC-006 — PROVIDER_DATA_FETCHING
PSC-007 — ANOMALY_MONITORING
PSC-008 — JUDGMENT_ORCHESTRATION
PSC-009 — AI_RESPONSE_GENERATION_OR_FORMATTING
PSC-010 — ALERT_INTELLIGENCE_OR_ROUTING
```

Each PSC entry is a single canonical-path domain. New implementations in any PSC domain are presumed parallel-service violations until proven otherwise via FRP, BSCP, or VSE.

### 6.3 Meaning of "Parallel"

A new module is parallel if it:

- solves the same capability as an existing backend component,
- can plausibly be imported instead of the existing one,
- duplicates domain ownership,
- creates a competing output for the same product truth,
- leaves the active system with two possible backend meanings.

Any of these conditions is sufficient to classify the module as parallel. The new module need not match all five.

### 6.4 Worked Examples

**Example A — "Create `omniscore-v4.ts` because v3 is messy."**

→ **Rejected.** Improve v3 in place under CSP-A, or propose a formal replacement via FRP. Messiness alone is not a basis for a new parallel implementation.

**Example B — "Extract `judgment-confidence.ts` from `confidence-engine.ts` for readability."**

→ **Allowed** if it is internal extraction within the same canonical runtime (CSP-B), not a competing engine. The extracted module must not be parallel-importable as a separate "confidence implementation."

**Example C — "Build `news-intelligence-shadow.ts` for a two-week comparison, with explicit goal to replace `news-intelligence.ts` if test X passes."**

→ **Potentially allowed only under BSCP** with all §9.2 fields documented, including expiry, promotion criteria, rejection criteria, and `NOT_USER_FACING` default.

---

## 7. Section 1.5.7 — Canonical Service Path Law

### 7.1 Required Rule

Before any work begins on a backend capability, the executing system must answer:

1. What capability is being touched?
2. What is its current canonical active path?
3. Is the work:
   - in-place improvement,
   - refactor/extraction,
   - formal replacement,
   - shadow comparison,
   - or deferred?

If these cannot be answered, the work cannot begin.

### 7.2 CSP Classification Taxonomy

```text
CSP-A — IN_PLACE_IMPROVEMENT
CSP-B — INTERNAL_REFACTOR_OR_EXTRACTION
CSP-C — FORMAL_REPLACEMENT
CSP-D — BOUNDED_SHADOW_COMPARISON
CSP-E — REJECT_OR_DEFER
```

### 7.3 Definitions

**`CSP-A — IN_PLACE_IMPROVEMENT`.**
Modify the existing canonical path directly. Default mode of improvement.

**`CSP-B — INTERNAL_REFACTOR_OR_EXTRACTION`.**
Split or reorganize the canonical path without creating a competing implementation. Extracted modules must be internal collaborators, not parallel-importable replacements.

**`CSP-C — FORMAL_REPLACEMENT`.**
Create a new path only if the old path is formally scheduled for deprecation/removal. Governed by FRP (§8).

**`CSP-D — BOUNDED_SHADOW_COMPARISON`.**
Temporarily run an alternative in non-user-facing comparison mode with explicit expiry and promotion/rejection criteria. Governed by BSCP (§9).

**`CSP-E — REJECT_OR_DEFER`.**
The work does not qualify now. The proposal is closed.

### 7.4 The Asymmetry

CSP-A and CSP-B are the default modes. CSP-C and CSP-D require governance. CSP-E is the default when no governance applies. The asymmetry is intentional: improvement is easy, replacement is governed, deferral is automatic.

---

## 8. Section 1.5.8 — Formal Replacement Procedure (FRP)

### 8.1 Process Name

```text
FRP — FORMAL REPLACEMENT PROCEDURE
```

Sometimes a new implementation is genuinely needed. FRP allows this while making it difficult to do sloppily.

### 8.2 Required FRP Fields

Any formal replacement proposal must include all fourteen fields:

1. `replacement_id` (e.g., `FRP-001`),
2. capability being replaced (cite PSC-00x),
3. existing canonical path,
4. proposed replacement path,
5. why in-place improvement is insufficient,
6. production risk if not replaced,
7. which Plan 1.2 v1 surface is affected (cite V1-S0x),
8. which Phase 1–3 objective is advanced,
9. migration sequence,
10. deprecation trigger for old path,
11. removal/deactivation condition for old path,
12. testing/certification needed,
13. rollback plan,
14. decision status: Approved / Rejected / Deferred.

Incomplete FRP proposals are rejected without further review.

### 8.3 Replacement Law

A formal replacement is valid only if:

- the new path has an explicit purpose,
- the old path is explicitly named,
- both are not intended to remain indefinitely active,
- the replacement directly improves backend production readiness,
- the replacement has a completion and retirement rule.

### 8.4 Replacement Example

Allowed in principle:

```text
Replace the current untyped judgment-to-AI context formatter
with a typed CoinetJudgmentPromptPackage formatter,
while deprecating the existing ASCII prompt stuffing path
and removing it once the typed formatter has passed AJP.1 corpus
end-to-end with no regression.
```

This is not sprawl. This is controlled replacement. Old path named, new path named, expiry condition stated, regression bar declared.

### 8.5 FRP Record Location

Approved FRP records, when they exist, are appended to:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-version-sprawl-decisions.md
```

The file is created lazily — only when the first FRP or BSCP or VSE is decided.

---

## 9. Section 1.5.9 — Bounded Shadow Comparison Procedure (BSCP)

### 9.1 Process Name

```text
BSCP — BOUNDED SHADOW COMPARISON PROCEDURE
```

In some cases, a temporary comparison path may be necessary before making a replacement decision.

### 9.2 Required BSCP Fields

Any shadow alternative must document all fourteen fields:

1. `shadow_id` (e.g., `BSCP-001`),
2. capability being compared (cite PSC-00x),
3. canonical active path,
4. shadow candidate path,
5. why shadowing is necessary,
6. why a direct replacement cannot yet be made,
7. inputs shared between canonical and shadow,
8. outputs compared,
9. metrics or criteria of evaluation,
10. maximum time/window of shadow existence,
11. promotion criteria,
12. rejection criteria,
13. deletion or archival rule after decision,
14. user-facing emission status: **must default to `NOT_USER_FACING`**.

### 9.3 Shadow Law

A shadow path is valid only if:

- it is not user-facing by default (hard pin: `NOT_USER_FACING`),
- it does not silently become canonical (promotion is explicit, not implicit),
- it has an expiry condition (a date or a metric threshold),
- it has promotion/rejection criteria,
- it exists to reach a decision, not to preserve ambiguity.

A shadow that lacks any of these is automatically rejected.

### 9.4 Shadow Example

Potentially valid later:

```text
Run a shadow L13-governed explanation path against the current AI prompt path,
capture differences across the AJP.1 corpus,
do not emit shadow outputs to users,
expire shadow after 4 weeks or 200 corpus runs (whichever first),
promote only after explicit evaluation against named metrics.
```

This is a decision process, not permanent duplication.

### 9.5 Difference Between FRP and BSCP

| Question                       | FRP                                  | BSCP                                       |
| ------------------------------ | ------------------------------------ | ------------------------------------------ |
| Decision already made?         | Yes — to replace                     | No — comparison needed first               |
| Old path                       | Scheduled for retirement             | Remains canonical during shadow            |
| New path                       | Becomes canonical on completion      | May be promoted or rejected                |
| User-facing during procedure?  | Old until cutover                    | Old only; shadow `NOT_USER_FACING`         |
| Expiry                         | Cutover + retirement                 | Time window + metric                       |
| Default outcome if no decision | New path takes over per plan         | Shadow is rejected and removed             |

FRP is for known replacements. BSCP is for honest uncertainty.

---

## 10. Section 1.5.10 — Version-Sprawl Violation Taxonomy

### 10.1 The Ten Violation Classes

```text
VSV-A — PROHIBITED_VERSION_SUFFIX_IMPLEMENTATION
VSV-B — PROHIBITED_FINAL_OR_COMPLETE_SUFFIX_IMPLEMENTATION
VSV-C — NEW_PARALLEL_SERVICE_WITHOUT_CANONICAL_OWNER
VSV-D — NEW_ALTERNATIVE_PATH_WITHOUT_DEPRECATION_OR_REPLACEMENT
VSV-E — NEW_SHADOW_PATH_WITHOUT_EXPIRATION
VSV-F — NEW_DUPLICATED_CAPABILITY_WITH_UNCLEAR_PRODUCT_MEANING
VSV-G — NAMING_PATTERN_THAT_HIDES_ARCHITECTURAL_DECISION
VSV-H — IMPLEMENTATION_SPLIT_WITH_NO_PHASE_1_TO_3_JUSTIFICATION
VSV-I — PARALLEL_FEATURE_CREATED_BECAUSE_EXISTING_SERVICE_IS_MESSY
VSV-J — LEGACY_VARIANT_KEPT_ACTIVE_AFTER_REPLACEMENT_DECISION
```

### 10.2 Why This Taxonomy Matters

The taxonomy turns "please avoid duplicating things" into enforceable review language. A proposed file can be rejected with:

```text
Rejected under VSV-A and VSV-D.
```

instead of:

```text
This feels messy.
```

Vague rejection is unenforceable; classified rejection is reviewable, appealable through VSE, and auditable.

---

## 11. Section 1.5.11 — Prohibited Naming Pattern Registry

### 11.1 Prohibited Patterns for Implementation Files

| Pattern                    | Prohibited context                                |
| -------------------------- | ------------------------------------------------- |
| `-v2`, `-v3`, `-v4`, `-vN` | Service implementation alternatives               |
| `-next`                    | Replacement ambiguity                             |
| `-new`                     | Replacement ambiguity                             |
| `-final`                   | False finality, often not final                   |
| `-complete`                | False completeness, encourages parallel retention |
| `-master`                  | Ambiguous supremacy naming                        |
| `-comprehensive`           | Marketing-like implementation naming              |
| `-ultimate`                | Non-engineering label                             |
| `-rebuilt`                 | Hidden rewrite fork                               |

A file matching any of these patterns is presumed a version-sprawl violation until proven otherwise via FRP, BSCP, or VSE.

### 11.2 Suspicious Folder Patterns

Examples that must trigger manual rejection or review:

```text
services/news-v2/
services/derivatives-next/
services/judgment-final/
services/omniscore-complete/
```

### 11.3 Allowed Naming When Versioning Is Semantically Real

Allowed only for:

- persisted schemas,
- historical facts,
- API wire protocols,
- migration versions,
- immutable certification/report versions.

> **A version token is legal only when it represents a stable external or historical contract, not when it disguises a competing internal implementation.**

This sentence is the operative test. It is the same sentence as §5.4. It is repeated here because it is the central distinction Plan 1.5 must defend.

---

## 12. Section 1.5.12 — Existing Duplication Relationship Law

### 12.1 Required Law

> **Existing duplicate or version-sprawled service families are not legitimized by this plan. They are grandfathered only as pre-existing technical debt and must be addressed by later active-import mapping, canonical-path selection, or scoped cleanup where such cleanup directly supports backend v1 readiness.**

### 12.2 What Plan 1.5 Does Not Do

It does not immediately decide:

- which OmniScore survives,
- which news service survives,
- which derivatives intelligence survives,
- which social/sentiment system survives,
- which fetcher variant survives.

That decision requires code-truth and active-import analysis, which is the work of later scoped cleanup, not of this plan.

### 12.3 What Plan 1.5 Does Do

It ensures:

```text
No fifth OmniScore.
No fourth news system.
No new derivatives-final-final-v2.
No new social-intelligence-rebuilt.
```

while the existing ones await proper convergence decisions.

### 12.4 The Asymmetry Restated

Plan 1.5 is a **forward-asymmetric** plan. Existing duplication is permitted as debt; new duplication is not permitted as practice. The asymmetry is what makes this plan operationally feasible without triggering a deletion-driven derailment of the kind Plan 1.3 §15 (NB-010) already warned against.

---

## 13. Section 1.5.13 — Allowed Work Under Plan 1.5

### 13.1 Allowed

**A. Improve the canonical implementation in place** (CSP-A).
Example: fix confidence handling inside the active judgment engine.

**B. Refactor a canonical service into smaller modules** (CSP-B).
Example: split `chat/service.ts` context builders into separate files, without creating `chat-service-v2.ts`.

**C. Replace a path formally through FRP** (CSP-C).
Example: replace ASCII judgment prompt stuffing with typed `CoinetJudgmentPromptPackage`.

**D. Use BSCP for time-boxed non-user-facing comparison** (CSP-D).
Only when necessary; never to preserve ambiguity.

**E. Archive/delete/deactivate obsolete variants** where later scoped cleanup proves they are not needed.

### 13.2 Not Allowed

- "new version" for convenience,
- "clean rewrite" with no retirement plan,
- simultaneous permanent outputs from parallel reasoning paths,
- another service family because the old one is hard to understand,
- an implementation fork that avoids making a canonical decision.

The pattern is: improvement and refactor are easy; replacement is governed; permanent parallelism is rejected.

---

## 14. Section 1.5.14 — Daily Development Enforcement

### 14.1 Pre-File-Creation Checklist

Before creating any new backend service file, answer:

1. Does this implement a new capability or modify an existing one?
2. If existing, what is the canonical owner?
3. Is the new file: extraction, helper, replacement, or shadow comparison?
4. Does the filename contain a prohibited suffix from §11.1?
5. Will the old implementation remain active after this work?
6. Is there a deprecation or merge plan?
7. Does this directly serve Plans 1–3?

If any of these cannot be answered, the file must not be created.

### 14.2 Review Blocker Conditions

A proposed change is blocked if it:

- introduces `-v2` or an equivalent suffix in implementation code,
- creates a second service for the same output without FRP or BSCP,
- duplicates intelligence semantics without replacing the old path,
- deepens an already over-duplicated family with no convergence plan.

### 14.3 Required Classification for Any New Service File

Each new backend service file introduced after Plan 1.5 must be classifiable as exactly one of:

```text
HELPER_EXTRACTION
CANONICAL_SERVICE
FORMAL_REPLACEMENT_CANDIDATE
BOUNDED_SHADOW_CANDIDATE
```

No unclassified "miscellaneous service" creation. A file that cannot be assigned one of these labels is rejected.

### 14.4 Enforcement Tone

Enforcement is not adversarial. It is consistent. New parallelism is the default-rejected state; admission requires one of the four classifications above. Daily development obeys this asymmetry because the asymmetry is what makes backend convergence real.

---

## 15. Section 1.5.15 — Exception Procedure (VSE)

### 15.1 Exception Process Name

```text
VSE — VERSION-SPRAWL EXCEPTION
```

VSE is the formal channel for rare cases where a new variant is necessary and neither FRP nor BSCP cleanly applies. Use of VSE is expected to be extremely rare.

### 15.2 Required Fields

1. `exception_id` (e.g., `VSE-001`),
2. proposed filename/module,
3. existing related service path,
4. why in-place update is insufficient,
5. why the proposed name is necessary,
6. whether this is FRP or BSCP (and if neither, why),
7. product surface affected (cite V1-S0x),
8. Phase 1–3 justification,
9. deletion/deprecation/expiration plan,
10. risk if deferred,
11. decision: Approve / Reject / Defer,
12. approval authority.

### 15.3 Default Decision

```text
REJECT OR DEFER
```

Approval requires positive justification against §15.2 and explicit human authority. Approval is never granted by convenience.

### 15.4 Exception Record Location

VSE records, when approved, are appended to:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-version-sprawl-decisions.md
```

The same file holds FRP, BSCP, and VSE records. It is created lazily on first decision.

---

## 16. Section 1.5.16 — Required Governance Artifact

### 16.1 Mandatory Primary Artifact

The mandatory primary artifact of Plan 1.5 is **this document**, located at:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-parallel-service-and-version-sprawl-prohibition.md
```

### 16.2 Required Sections (Satisfied by This Document)

1. Document identity and authority (Section 0),
2. Purpose (Section 1),
3. Inheritance from Plans 1.1–1.4 (Section 2),
4. First principle (Section 3),
5. Ground-truth sprawl problem statement with examples (Section 4),
6. Canonical version-sprawl prohibition law (Section 5),
7. Parallel-service prohibition law (Section 6),
8. Protected capability registry `PSC-001..PSC-010` (Section 6.2),
9. Canonical service path law (Section 7.1),
10. CSP classification taxonomy (Section 7.2),
11. Formal Replacement Procedure `FRP` (Section 8),
12. Bounded Shadow Comparison Procedure `BSCP` (Section 9),
13. Version-sprawl violation taxonomy `VSV-A..J` (Section 10),
14. Prohibited naming pattern registry (Section 11),
15. Existing duplication relationship law (Section 12),
16. Allowed work under the prohibition (Section 13),
17. Daily development enforcement (Section 14),
18. Version-Sprawl Exception `VSE` (Section 15),
19. Verification and certification criteria (Section 17),
20. Done definition (Section 18.1),
21. Transition to Plan 1.6 (Section 18.2),
22. Acceptance block (Section 20).

### 16.3 Auxiliary Artifact

`backend-v1-version-sprawl-decisions.md` is created lazily — only when the first FRP / BSCP / VSE decision is recorded.

---

## 17. Section 1.5.17 — Verification and Certification Criteria

Plan 1.5 is complete only when all of the following are simultaneously true.

### 17.1 Explicit Prohibitions Are Present

The document explicitly prohibits:

- no new `-v2` ✅
- no new `-final` ✅
- no new `-complete` ✅
- no new equivalent naming patterns ✅
- no new parallel scoring / social / news / derivatives services without FRP/BSCP ✅
- no new alternative service path unless replacement or deprecation is formal ✅

### 17.2 Scope Nuance Is Present

The document explicitly states:

- this applies to internal implementation sprawl ✅
- not to legitimate API/schema/historical contract versioning ✅

### 17.3 Formal Replacement and Shadow Options Are Present

The document does not make improvement impossible. It provides:

- FRP for real replacement (Section 8) ✅
- BSCP for bounded shadowing (Section 9) ✅

### 17.4 Existing Duplication Is Framed Correctly

The document states:

- existing duplicates are not endorsed ✅
- not all are deleted immediately ✅
- later cleanup/canonicalization is separate scoped work ✅

### 17.5 Practical-Use Answers Must Be Possible

A reviewer can answer from this document alone:

1. Can we create `news-intelligence-v3.ts`?
   → **No.** (VSV-A; FRP/BSCP not invoked.)
2. Can we split `chat/service.ts` into helper modules?
   → **Yes**, if not creating a competing path. (CSP-B.)
3. Can we create a typed judgment prompt formatter to replace the ASCII formatter?
   → **Yes**, through FRP. (CSP-C; example in §8.4.)
4. Can we keep adding OmniScore variants until one wins?
   → **No.** (VSV-A, VSV-C; canonical-path selection deferred to later cleanup.)
5. Can schema files carry `v1` if they represent a persisted/historical contract?
   → **Yes.** (§5.4, §11.3.)
6. Can a shadow alternative temporarily exist?
   → **Only through BSCP**, with expiry and `NOT_USER_FACING` default. (§9.)

If any of those answers are unclear from the document alone, Plan 1.5 is not complete.

---

## 18. Section 1.5.18 — Done Definition and Transition to Plan 1.6

### 18.1 Done Definition

Plan 1.5 is complete only when:

> **Coinet backend v1 has a repo-resident Parallel-Service and Version-Sprawl Prohibition that formally blocks new version-suffixed implementation forks, new "final" or "complete" replacement variants, new parallel service families, and new alternative backend paths that fail to replace, deprecate, or time-box the service they compete with; while still permitting controlled in-place improvement, formal replacement, scoped refactor, and bounded shadow comparison where production readiness truly requires it.**

This document satisfies that definition once accepted via Section 20.

### 18.2 Transition to Plan 1.6

Once Plan 1.5 is accepted, the next required step is:

> **Plan 1.6 — Backend Task Admissibility Framework**

Plan 1.6 answers:

> Given the positive scope, negative scope, architecture freeze, and anti-version-sprawl law, how do we decide whether any specific backend task is allowed into the active production program?

The closed five-document Phase 1 scope-control structure becomes:

```text
Plan 1.1 = Why
Plan 1.2 = What is in
Plan 1.3 = What is out
Plan 1.4 = No new architecture expansion
Plan 1.5 = No new implementation sprawl
Plan 1.6 = Task-by-task admission law
```

### 18.3 Scope-Control Square Now Closed

With Plan 1.5, the four-sided scope-control structure declared in Plan 1.4 §15.3 is operationally closed:

```text
Plan 1.1 = Why          (production-convergence mission)
Plan 1.2 = What is in   (positive scope)
Plan 1.3 = What is out  (negative scope)
Plan 1.4 = No new architecture  (architectural enforcement)
Plan 1.5 = No new parallel implementations  (implementation enforcement)
```

Plan 1.6 will sit above these as the admissibility synthesizer.

---

## 19. Glossary (Document-Local Definitions)

- **Sprawl** — the accumulation of multiple concurrently-importable backend implementations for the same capability, without canonical-path discipline.
- **Canonical path** — the single intended production implementation of a given capability at a given time.
- **Parallel service** — a new backend module that implements the same capability as an existing one and can plausibly be imported in its place; the asymmetry Plan 1.5 is designed to prevent.
- **Implementation sprawl** vs **semantic data versioning** — the former is prohibited (§5, §11.1); the latter is preserved (§5.4, §11.3). The distinguishing test is the §11.3 sentence on stable external/historical contracts.
- **Shadow** — a temporary alternative implementation run under BSCP with `NOT_USER_FACING` default, expiry, and explicit promotion/rejection criteria.
- **Grandfathered** — pre-existing duplication that Plan 1.5 does not delete; its disposition is the job of later scoped cleanup, not of this plan.

These definitions are document-local. Where another document in the repository uses these terms in a conflicting way, this document prevails for Phase 1 implementation-sprawl purposes.

---

## 20. Acceptance Block

This prohibition is accepted when the following block is filled in. Until accepted, the document is treated as DRAFT regardless of the `Status` field in the front matter.

```text
Backend v1 Parallel-Service and Version-Sprawl Prohibition — Acceptance

Accepted by: ____________________________
Role:        ____________________________
Date:        ____________________________

I confirm that:
  [ ] I have read this document in full.
  [ ] I accept the canonical version-sprawl prohibition in §5.1.
  [ ] I accept the parallel-service prohibition in §6.1.
  [ ] I accept the ten protected capabilities (PSC-001..PSC-010) in §6.2.
  [ ] I accept the five canonical-service-path classes (CSP-A..CSP-E) in §7.2.
  [ ] I accept the ten version-sprawl violation classes (VSV-A..VSV-J) in §10.1.
  [ ] I accept the prohibited naming patterns in §11.1.
  [ ] I will apply the pre-file-creation checklist in §14.1 to every
      new backend service file.
  [ ] I will route formal replacements through FRP (§8) and shadow
      comparisons through BSCP (§9).
  [ ] I will not approve VSE (§15) exceptions that fail §15.2 / §15.3.
  [ ] I understand that existing duplication is grandfathered as debt,
      not endorsed; its cleanup is a separate scoped activity.
```

Once accepted, the `Status` field in the front matter is the authoritative state. Until accepted, treat this document as DRAFT in all operational decisions.

---

*End of Backend v1 Parallel-Service and Version-Sprawl Prohibition — Plan 1.5.*
