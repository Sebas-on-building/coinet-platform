# Plan 2.1 — Phase 2 Mission and First Principle

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 2 — Live-Path Trust Hardening
Plan: 2.1 (Phase 2 mission and first principle)
Effective: 2026-05-23
Authority: Backend v1 Completion Program; inherits Phase 1 governance (Plans 1.1–1.12) and Phase 2 master constitution (Plan 2.0)
Authorized by: Plan 2.0 (Phase 2 General Plan, ACTIVE, 2026-05-23)
Supersedes: Nothing — this is the first Plan 2.x mission-class document

---

## 0. Identity and Authority

### 0.1 Constitutional Purpose Sentence

> Plan 2.1 exists to define the **mission and first principle of Phase 2**: making Coinet's live judgment/chat/AI path trustworthy so user-facing AI responses can no longer silently detach from structured judgment, hide degraded evidence, fake confidence, or continue as if nothing broke.

### 0.2 Document Class

Plan 2.1 is a **Phase 2 mission-class governance document**. It is:

- **not** a BTAR — it admits no implementation work,
- **not** a code change — it edits no source file under `apps/coinet-platform/src/**`,
- **not** a Phase 1 amendment — Plans 1.1–1.12 remain ACTIVE verbatim,
- **not** a Phase 3 unlock — Phase 3 remains gated behind P2TG-001,
- **not** an opening of Plan 1.3 NB-001..NB-010 deferred areas,
- **not** an authorization for any deviation from Plan 1.4 architecture freeze (FRZ-001..008),
- **not** an authorization for any deviation from Plan 1.5 sprawl prohibition (PSC-001..010, VSV-A..J).

It performs exactly one job:

> It declares the **mission**, the **first principle**, the **three truth classes** (KNOWS / PARTIALLY KNOWS / CANNOT SAFELY CLAIM), the **AVAILABLE / DEGRADED / UNAVAILABLE availability law**, the **non-replacement law** for L13/L14, the **trust failure taxonomy** (TF-001..TF-008), and the **BTAR inheritance rules** that every Phase 2 BTAR must obey.

### 0.3 Authority Level

Level 2 (Phase Plan — subordinate to Plan 2.0 Phase 2 master constitution, which is Level 1 within Phase 2).

The Plan-class hierarchy applied across this program:

```text
Level 0 — Phase 1 Charter (Plan 1.1)
Level 1 — Phase master execution constitutions (Plan 1.12 for Phase 1 done; Plan 2.0 for Phase 2)
Level 2 — Phase-internal foundational plans (Plan 2.1, future Plan 2.2..2.N)
Level 3 — Procedural plans (Plan 1.6 admissibility, Plan 1.10 exceptions, etc.)
Level 4 — Registries and individual records (BTAR, AFE, FRP, P1RR, P1TG, P2TG)
```

Plan 2.1 sits at Level 2 directly under Plan 2.0 §1, providing the canonical statement of the Phase 2 mission and the first principle that every Phase 2 BTAR (BTAR-003..008+) must trace back to.

### 0.4 Dependency Check

Plan 2.1 inherits from and depends on the following upstream artifacts. None may be silently bypassed.

| Upstream artifact | Status at 2026-05-23 | Inheritance class |
| --- | --- | --- |
| Plan 1.1 — Phase 1 Charter | ACTIVE | Mission discipline carried forward verbatim |
| Plan 1.2 — V1-S01..V1-S06 positive scope | ACTIVE | Phase 2 work stays inside V1 scope set |
| Plan 1.3 — NB-001..NB-010 deferred | ACTIVE | Phase 2 may not reopen any NB-* |
| Plan 1.4 — Architecture freeze | ACTIVE | No new L*.X sublayers; no new dormant programs |
| Plan 1.5 — Sprawl prohibition | ACTIVE | No `-v2`/`-final`/`-rewritten` names; FRP required for any replacement |
| Plan 1.6 — Task admissibility | ACTIVE | Every Phase 2 BTAR (BTAR-003..) must pass the eight-question gate |
| Plan 1.7 — Source-of-truth system | ACTIVE | Phase 2 records follow the same naming and indexing rules |
| Plan 1.8 — Existing backend inventory | ACTIVE | V1_CORE / V1_SUPPORTING / V1_DEFERRED classification authoritative |
| Plan 1.9 — Daily scope enforcement | ACTIVE | Every Phase 2 PR carries the daily-enforcement banner |
| Plan 1.10 — Exception governance | ACTIVE | Every Phase 2 exception goes through AFE/VSE/SCR/UDF |
| Plan 1.11 — P1RR verification | COMPLETED (P1RR-001 ACCEPTED) | Phase 1 readiness conclusively verified |
| Plan 1.12 — Phase 1 done definition + transition gate | COMPLETED (P1TG-002 ACCEPTED, P2-READY) | Phase 2 lawfully unlocked |
| Plan 2.0 — Phase 2 General Plan | ACTIVE | Plan 2.1 §1 elaborates Plan 2.0 §1 |
| BTAR-002 §21.8 — Phase 1 chat smoke test findings | COMPLETED | F-1..F-4 are the evidence base for Phase 2 mission |

If any of the above were not in the listed status, Plan 2.1 would be inadmissible. They are. Plan 2.1 proceeds.

### 0.5 What Plan 2.1 Does Not Touch

- **No code under `apps/coinet-platform/src/**`** is added, edited, deleted, or renamed by Plan 2.1.
- **No file under `apps/coinet-platform/src/l5/..l14/`** is added, edited, deleted, or renamed.
- **No package.json / tsconfig / CI configuration** is changed by Plan 2.1.
- **No BTAR is admitted** by Plan 2.1. BTAR-003 still requires its own admission plan, eight-question gate review, and ACTIVE state before any implementation begins.

---

## 1. The Canonical Phase 2 Mission

### 1.1 Mission Statement (Canonical)

> **Phase 2 exists to make the live judgment/chat/AI path trustworthy by ensuring that structured judgment availability, degradation, failure, AI expression, and user-facing response behavior are explicit, testable, and impossible to silently fake.**

This sentence is the canonical mission statement of Phase 2. Every BTAR-003..008+ that is admitted under Plan 2.0 must trace back to one or more clauses of this sentence in its admission record (Plan 1.6 §12.4 "mission trace" field).

### 1.2 Decomposition of the Mission Statement

| Clause | Meaning | Owning BTAR(s) (per Plan 2.0 §11) |
| --- | --- | --- |
| "live judgment/chat/AI path" | The exact path `POST /api/chat/message → ChatService.sendMessage → buildSignalSnapshot → produceJudgment → formatJudgmentForAI → aiService.analyze → ChatMessageResponse` | All Phase 2 BTARs |
| "trustworthy" | Truth-state of every user-facing answer is observable from runtime evidence, not from prompt wording | BTAR-004, BTAR-005, BTAR-007 |
| "structured judgment availability" explicit | A computed `JudgmentAvailabilityState` (AVAILABLE / DEGRADED / UNAVAILABLE) attached to every chat turn | BTAR-003 |
| "degradation … explicit" | Degraded judgment is named in `degraded_components[]` and disclosed to the user | BTAR-003, BTAR-004 |
| "failure … explicit" | A failure of `produceJudgment()` is surfaced at the moment of occurrence, not several lines later | BTAR-003 |
| "AI expression … explicit" | AI output passes a deterministic safety gate (`applyAIOutputSafetyGate`) before being returned | BTAR-005 |
| "user-facing response behavior … explicit" | The response shape carries explicit availability + degradation flags and is regression-tested | BTAR-004, BTAR-007 |
| "testable" | Every Phase 2 capability is covered by failure-path regression tests | BTAR-007 |
| "impossible to silently fake" | Silent-fallback / silent-continue patterns are removed; failure is loud at the moment it occurs | BTAR-003, BTAR-005 |

This decomposition is the canonical reading of the mission. Plan 2.0 §11.1..§11.8 BTAR scopes were written against this decomposition; any later BTAR that does not map to at least one clause is **out of mission** and inadmissible under Plan 1.6 §16.

### 1.3 What Mission Adoption Means in Practice

Adopting this mission means **every Phase 2 BTAR** must, in its admission record:

1. Name the mission clause(s) it advances (§1.2 table).
2. Name the trust failure(s) it removes (§7 TF-001..TF-008).
3. Name the truth class boundary it strengthens (§3 KNOWS / PARTIALLY KNOWS / CANNOT SAFELY CLAIM).
4. Carry the mission trace field per Plan 1.6 §12.4.

A BTAR that cannot fill any of those four fields with concrete content is not yet a Phase 2 BTAR; it is a research note.

### 1.4 What the Mission Is Not

The Phase 2 mission is not:

- Not a mission to **rewrite** the chat service or judgment service.
- Not a mission to **add** new product features.
- Not a mission to **integrate** real provider APIs.
- Not a mission to **migrate** the active product onto certified L8–L14 surfaces.
- Not a mission to **build** the Phase 3 synthetic truth suite.
- Not a mission to **modify** any L*.X constitutional layer.
- Not a mission to **expand** the chat product surface.
- Not a mission to **add** new external data sources.

Each of those is either deferred (Plan 1.3), prohibited under Phase 2 mission scope (Plan 2.0 §3), or scheduled for a later phase (Phase 3+). Any pull request that drifts from the Phase 2 mission into one of these areas is **scope drift** and must be rejected at the daily enforcement gate (Plan 1.9).

---

## 2. The First Principle (Canonical)

### 2.1 First Principle Statement

> **The user-facing AI response must never pretend structured judgment exists when the structured judgment path failed, degraded, timed out, or became unavailable.**

This is the **first principle** of Phase 2. It is named "first" because every other Phase 2 law (availability states, prompt package shape, safety gate, failure-path tests, runtime trust evidence) is derived from it.

### 2.2 Why This Is the First Principle (Not Merely a Principle)

Coinet's product proposition is "structured crypto judgment, not generic chat." The product proposition collapses the instant a user-facing AI response is **indistinguishable from a generic chatbot answer** while the structured judgment system has actually failed. At that moment:

- the user is shown plausible text,
- the text is presented as if it were Coinet judgment,
- the underlying truth state was "judgment unavailable,"
- the user cannot tell the difference,
- the system has lied by omission.

That outcome is a **product-level failure**, not a "minor UX issue." Every subsequent design decision in Phase 2 has to make that outcome impossible. That is why the first principle is non-negotiable and absolute.

### 2.3 First-Principle Coverage

The first principle covers four operationally distinct cases:

| Case | Trigger | First-principle obligation |
| --- | --- | --- |
| **Failed** | `produceJudgment()` threw an error | Response must declare judgment UNAVAILABLE and explain failure honestly |
| **Degraded** | Some inputs to judgment are missing/stale/errored | Response must declare DEGRADED and name what is missing |
| **Timed out** | `produceJudgment()` exceeded its deadline (e.g., > N ms) | Response must declare UNAVAILABLE (timeout class) or DEGRADED if partial result safe to use |
| **Unavailable** | Upstream context fetch failed entirely before judgment could run | Response must declare UNAVAILABLE and explain that no judgment was attempted |

All four cases must collapse to one of the three availability states (§4) and obey the disclosure rules of §5.

### 2.4 What the First Principle Forbids (Operational List)

- AI answers presenting a confident thesis while `produceJudgment()` threw.
- AI answers omitting degradation disclosure when external context fetch failed.
- AI answers using recommendation-style language regardless of judgment state.
- AI answers fabricating numbers or evidence not present in the prompt package.
- AI answers surviving silent fallback from structured judgment to "generic AI knowledge."
- AI answers reading undocumented fields from upstream (F-1 class) and continuing past failures (F-3 class) without surfacing the truth state.

### 2.5 What the First Principle Allows

- AI answers based on AVAILABLE judgment that translate the structured judgment into natural language faithfully.
- AI answers based on DEGRADED judgment that explicitly disclose which components are degraded.
- AI answers based on UNAVAILABLE judgment that honestly say Coinet cannot produce a structured judgment right now.
- AI answers that present general crypto context **explicitly labeled as general context, not as Coinet structured judgment**.

### 2.6 First Principle as Test Oracle

The first principle is also the **oracle** for the Phase 2 failure-path test suite (BTAR-007). Every test under `apps/coinet-platform/src/api/chat/__tests__/failure-paths.test.ts` (per Plan 2.0 §2.2) will assert that under a specific failure injection, the response carries the correct availability state, the correct disclosure, and the correct safety-gate decision. A test that does not anchor itself in §2.1 is not a Phase 2 failure-path test.

---

## 3. The Three Truth Classes Coinet Must Carry

The first principle requires Coinet to internally distinguish three truth classes at all times during a chat turn. Without this distinction, no honest disclosure is possible.

### 3.1 Class KNOWS — Structured Judgment Was Successfully Computed

```text
Trigger:
  produceJudgment() returned a valid result
  All required components were available
  Judgment_status = AVAILABLE
```

Permitted AI behavior: the answer may faithfully describe the structured judgment (state, thesis, contradictions, timing, confidence, 24h signal, failure condition) in natural language. The answer may name the underlying components.

Forbidden AI behavior: the answer may not invent details that are not in the judgment object. The answer may not omit confidence qualifications that the judgment carries. The answer may not use prohibited recommendation language (Plan 2.0 §1.6).

### 3.2 Class PARTIALLY KNOWS — Structured Judgment Was Computed Under Degradation

```text
Trigger:
  produceJudgment() returned a valid result
  At least one component is degraded/stale/missing
  Judgment_status = DEGRADED
  degraded_components[] is non-empty
```

Permitted AI behavior: the answer may describe the parts of the judgment that ARE available, but **must** explicitly disclose which components are degraded and **must** lower confidence language proportionally.

Forbidden AI behavior: the answer may not hide the degradation. The answer may not present degraded judgment as if it were AVAILABLE. The answer may not use the degraded components as if they were authoritative.

### 3.3 Class CANNOT SAFELY CLAIM — Structured Judgment Failed or Is Unavailable

```text
Trigger (any of):
  produceJudgment() threw
  produceJudgment() timed out
  Upstream context fetch failed before judgment ran
  Judgment_status = UNAVAILABLE
```

Permitted AI behavior: the answer **must** explicitly say a Coinet structured judgment cannot be produced right now. If it offers any general context, it must label that context as general crypto context — never as Coinet judgment.

Forbidden AI behavior: the answer may not present a thesis. The answer may not present a confidence number. The answer may not present a state/timing/24h-signal claim. The answer may not perform a silent fallback to "what a chatbot would say."

### 3.4 Three-Class Honesty Invariant

```text
Plan-2.1-INV-01:
  For every chat response R, exactly one truth class T ∈ {KNOWS, PARTIALLY_KNOWS, CANNOT_SAFELY_CLAIM} is true.
  The disclosure shape of R must match T.
  Cross-class leakage is a Phase 2 trust failure (TF-001 or TF-002).
```

This invariant is **the law** that BTAR-005's `applyAIOutputSafetyGate` must enforce at runtime, and the law that BTAR-007's failure-path tests must verify.

---

## 4. The AVAILABLE / DEGRADED / UNAVAILABLE Availability Law

### 4.1 Availability Law Statement (Canonical)

> **Every chat turn must compute, attach to internal runtime evidence, and (where appropriate) disclose to the user, a `JudgmentAvailabilityState` of exactly one of: `AVAILABLE`, `DEGRADED`, `UNAVAILABLE`.**

### 4.2 The Three States

| State | Concrete trigger | Mandatory disclosure | Permitted answer scope |
| --- | --- | --- | --- |
| **AVAILABLE** | `produceJudgment()` returned successfully; no degraded components; within timing budget | No degradation banner required | Full structured judgment translation |
| **DEGRADED** | `produceJudgment()` returned, but `degraded_components[]` non-empty (e.g., market-data fetch errored, news pipeline timed out, social context missing, derivatives source stale beyond threshold) | Must name degraded components in user-visible disclosure; must lower confidence language | Partial translation with explicit caveats |
| **UNAVAILABLE** | `produceJudgment()` threw; or timed out beyond hard deadline; or upstream context fetch failed fatally before judgment ran | Must declare judgment unavailable in user-visible disclosure; must not present a thesis | General context only, labeled as such |

### 4.3 The Non-Negotiable Rule (Compile-Time Law)

> **No chat response may be returned to the user without an attached `JudgmentAvailabilityState`. A response without a state is a Phase 2 trust failure (TF-004) and must be rejected by the AI output safety gate (BTAR-005) before emission.**

Compile-time form (target shape, to be implemented under BTAR-004):

```ts
// CoinetJudgmentPromptPackage REQUIRES the field.
interface CoinetJudgmentPromptPackage {
  readonly judgment_status: JudgmentAvailabilityState;   // mandatory
  readonly degraded_components: readonly string[];        // possibly empty
  readonly judgment_failure_reason?: string;              // present iff UNAVAILABLE
  // ... other fields
}

// ChatTrustEvidence REQUIRES the field.
interface ChatTrustEvidence {
  readonly judgment_status: JudgmentAvailabilityState;   // mandatory
  // ... other fields per Plan 2.0 §4.3
}

// The AI output safety gate REJECTS responses missing the state.
function applyAIOutputSafetyGate(raw, evidence): GateDecision {
  if (evidence.judgment_status === undefined) {
    return { decision: 'BLOCK', reason: 'MISSING_AVAILABILITY_STATE' };
  }
  // ... further checks
}
```

The non-negotiability of this rule is structural: it is enforced by the type system, by the runtime gate, by the failure-path test suite, and by the daily enforcement gate (Plan 1.9). Four independent layers of enforcement so that no single accidental omission can produce an undisclosed response.

### 4.4 State Transitions Across a Chat Turn

State is **computed once per turn**, not mutated mid-turn:

```text
Step 1: context fetch starts.
Step 2: judgment runs (or fails to run).
Step 3: resolveJudgmentAvailability(result, errors, deadlines) → AVAILABLE | DEGRADED | UNAVAILABLE
Step 4: state is pinned into ChatTrustEvidence and CoinetJudgmentPromptPackage.
Step 5: AI is called with the pinned state in its prompt.
Step 6: AI output is gated against the pinned state.
Step 7: response is emitted with the pinned state attached.
```

The state is **never re-computed** after Step 3, and **never softened** by downstream layers. Softening it (e.g., DEGRADED → AVAILABLE because the AI wrote a confident-sounding answer) is a TF-001 (silent state promotion) trust failure.

### 4.5 Cross-Reference to Plan 2.0

Plan 2.0 §5 introduces the same three states at the master-constitution level. Plan 2.1 §4 makes them a **named law** with compile-time enforcement, a non-negotiable rule, and an invariant pinned to the first principle. Plan 2.0 and Plan 2.1 do not contradict; Plan 2.1 sharpens.

---

## 5. The Non-Replacement Law for L13 and L14

### 5.1 Statement of the Law

> **Phase 2 hardens the live judgment/chat/AI path; Phase 2 does not replace any L13 or L14 constitutional surface. The L13 (FROZEN_LIVE) and L14 (ARCHITECTURE_COMPLETE) layers remain frozen and authoritative. Phase 2 does not promote them into the live product, does not retire them, and does not modify their constitution.**

### 5.2 Why This Law Exists

The temptation in Phase 2 is to "just hook the live product up to L13/L14 right now" because L13 is constitutional truth about expression governance and L14 is constitutional truth about delivery + calibration. This temptation must be refused. The reasons:

1. **L13 and L14 are dormant in the live product** (per `cip-readiness-report.md`). The live path uses `services/explanations/` and `services/calibration-spine/`, not L13/L14 runtime.
2. **Migrating live product onto L13/L14 is NB-007 work** (Plan 1.3 deferred). NB-007 is out of Phase 2 scope.
3. **The four reconciliation decisions** (L9 / L11 / L12 / L13 — see MEMORY.md "Four pending reconciliation decisions") have not been made. Migration without those decisions would commit them silently.
4. **Phase 2 mission is trust hardening, not architectural reconciliation.** Trust hardening is achievable inside the existing live path. Architectural reconciliation is a separate, larger program.
5. **Bounded reuse remains allowed** per Plan 1.4 Legal Work Class D. Phase 2 may *consult* L13 contracts as a design reference (e.g., the shape of `L13AIInputPackage` informs the shape of `CoinetJudgmentPromptPackage`), but Phase 2 must not *invoke* L13 runtime in the live path.

### 5.3 What Is Allowed

| Action | Allowed in Phase 2? |
| --- | --- |
| Read L13 contract shapes as design reference | **Yes** (Plan 1.4 Class D) |
| Import an L13 *type* into a Phase 2 helper without invoking L13 runtime | **Case-by-case; requires BTAR justification** |
| Invoke `validateL13AIInputPackage()` runtime in the live chat path | **No** (NB-007) |
| Wire L14 calibration-evidence emission from live chat | **No** (NB-007) |
| Modify any file under `apps/coinet-platform/src/l13/` | **No** (Plan 1.4 freeze) |
| Modify any file under `apps/coinet-platform/src/l14/` | **No** (Plan 1.4 freeze) |
| Add an L13.13 or L14.11 sublayer | **No** (Plan 1.4 FRZ-001) |
| Add a new L*.X constitution document | **No** (Plan 1.4 FRZ-001) |

### 5.4 The Hardening-Not-Replacement Invariant

```text
Plan-2.1-INV-02:
  For every Phase 2 BTAR, the diff touches zero files under:
    apps/coinet-platform/src/l5/
    apps/coinet-platform/src/l6/
    apps/coinet-platform/src/l7/
    apps/coinet-platform/src/l8/
    apps/coinet-platform/src/l9/
    apps/coinet-platform/src/l10/
    apps/coinet-platform/src/l11/
    apps/coinet-platform/src/l12/
    apps/coinet-platform/src/l13/
    apps/coinet-platform/src/l14/
  A Phase 2 PR that touches any of those paths is rejected at the daily enforcement gate (Plan 1.9 §8).
```

### 5.5 When the Non-Replacement Law Could Relax

Only after:

- the four reconciliation decisions (L9 / L11 / L12 / L13) are made via ADR records,
- a future plan (Plan 3.x or later) opens NB-007 with a concrete migration sequence,
- and a P2TG-NNN or later transition gate authorizes that opening.

Until then, the non-replacement law holds.

---

## 6. Inheritance Rules for Phase 2 BTARs

### 6.1 Every Phase 2 BTAR Inherits

Every BTAR-003..008+ inherits, **automatically and without exception**:

1. **Plan 1.4 architecture freeze** — no new L*.X sublayers, no new dormant programs.
2. **Plan 1.5 sprawl prohibition** — no `-v2`/`-final`/`-rewritten` naming.
3. **Plan 1.6 admissibility gate** — eight-question gate must pass before any code is written.
4. **Plan 1.9 daily enforcement** — banner on every PR; scope diff verified by reviewer.
5. **Plan 2.0 in-scope/out-of-scope boundaries** — Phase 2 surfaces only.
6. **Plan 2.1 first principle** — must trace to §2.1 in the admission record.
7. **Plan 2.1 §4 availability law** — must not weaken the AVAILABLE/DEGRADED/UNAVAILABLE discipline.
8. **Plan 2.1 §5 non-replacement law** — must not touch L*.X.
9. **Plan 2.1 §7 trust failure taxonomy** — must name TF-NNN(s) it removes.
10. **Plan 1.10 exception governance** — any deviation requires AFE/VSE/SCR.

### 6.2 Mandatory Mission-Trace Fields in Every Phase 2 BTAR

```text
Mission Trace (Plan 2.1 §1.3):
  - Mission clause(s) advanced:           [from §1.2 table]
  - First principle obligation strengthened: [from §2.3 table]
  - Truth class boundary strengthened:    [§3.1 / §3.2 / §3.3]
  - Trust failure(s) removed:             [TF-NNN list]
  - Availability law interaction:         [introduces / consumes / enforces]
  - Non-replacement compliance:           [confirmed: zero L*.X file touches]
```

A BTAR missing any of these fields is **inadmissible**.

### 6.3 What Phase 2 BTARs May Not Inherit

Phase 2 BTARs **do not** inherit:

- Authorization to touch any file under `src/l*/`.
- Authorization to add a new L*.X sublayer.
- Authorization to open Plan 1.3 NB-001..NB-010.
- Authorization to bypass the eight-question gate.
- Authorization to skip failure-path tests.
- Authorization to silently replace `formatJudgmentForAI` (an FRP is required, per Plan 2.0 §3.6).

### 6.4 Implicit Authorization Forbidden

> **No Phase 2 BTAR is authorized merely because Plan 2.0 or Plan 2.1 names it.** Plan 2.0 §11 names BTAR-003..008 as the *expected* sequence; each still requires its own admission record, mission trace, and ACTIVE state before any line of implementation begins.

### 6.5 Inheritance Audit Trail

Each Phase 2 BTAR must include, in its acceptance section, the line:

```text
Inheritance audit: Plans 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 2.0, 2.1 — all ACTIVE/COMPLETED at admission; no inheritance bypass.
```

This single line, if missing or weakened, blocks the BTAR from being marked ACCEPTED.

---

## 7. Trust Failure Taxonomy (TF-001..TF-008)

### 7.1 Purpose

The trust failure taxonomy gives Phase 2 a **shared vocabulary** for the specific shapes of trust failure that the first principle forbids. Each Phase 2 BTAR names which TF-NNN(s) it removes. Each Phase 2 failure-path test names which TF-NNN(s) it asserts cannot occur.

### 7.2 The Eight Classes

| ID | Name | One-line definition | Concrete current evidence | Primary owning BTAR |
| --- | --- | --- | --- | --- |
| **TF-001** | Silent state promotion | Truth class is silently elevated (CANNOT_SAFELY_CLAIM → PARTIALLY_KNOWS, or PARTIALLY_KNOWS → KNOWS) without justification | Confident AI thesis emitted while `produceJudgment()` errored | BTAR-005 |
| **TF-002** | Undisclosed degradation | Judgment ran with degraded inputs; response omits disclosure of which inputs are degraded | Market-data fetch errored; user sees confident timing claim | BTAR-003, BTAR-004 |
| **TF-003** | Silent fallback to generic AI | Structured judgment failed; system silently returns "what a chatbot would say" presented as if it were Coinet judgment | F-3 evidence: chat service logs "❌ CRITICAL" and continues | BTAR-003 |
| **TF-004** | Missing availability state | Response emitted without any `JudgmentAvailabilityState` attached | Current `ChatMessageResponse` does not carry the field | BTAR-003, BTAR-004 |
| **TF-005** | Fabricated evidence | AI answer references a number / event / claim not present in the prompt package | LLM hallucination of price or thesis detail | BTAR-005 |
| **TF-006** | Recommendation creep | AI answer uses prohibited recommendation phrasing ("you should buy/sell") regardless of judgment state | Generic chat-style phrasing leaks into Coinet responses | BTAR-005 |
| **TF-007** | Undocumented field consumption | Service reads a field on an upstream interface that the interface does not declare; runtime succeeds by coincidence | F-1 evidence: `intentClassification.processingTimeMs` consumed without declaration | BTAR-003 |
| **TF-008** | Silent post-failure continuation | Service catches/logs a failure and continues past it, throwing several lines later when the failed object is dereferenced | F-3 evidence: silent-continue → delayed throw on context property access | BTAR-003 |

### 7.3 Taxonomy Hard Rules

1. The taxonomy is **append-only at the row level**. New classes added during Phase 2 become TF-009, TF-010, etc.; never reused.
2. Each TF row's "Primary owning BTAR" is a **target**, not a contract. A BTAR may close more than one TF; a TF may be partly mitigated by more than one BTAR. The mapping must be honest, not aspirational.
3. The taxonomy is **closed by Phase 2** only when every TF-NNN whose `Primary owning BTAR` is COMPLETED has at least one failure-path test asserting it cannot recur.
4. P2TG-001 (Phase 2 transition gate) checks that every TF-001..TF-008 is RESOLVED or explicitly DEFERRED-with-reassessment-trigger.

### 7.4 TF → Finding Mapping

Each TF connects to one or more Phase 2 findings (F-1..F-4 today, append-only):

```text
TF-001  ← (no direct F; surfaced if AI emits confident text under failure)
TF-002  ← F-3, F-4 (partial — degraded context not disclosed)
TF-003  ← F-3 (primary)
TF-004  ← F-1 (chat service consumes undocumented field) + F-3
TF-005  ← (no direct F; new in Phase 2; covered by BTAR-005 tests)
TF-006  ← (no direct F; covered by BTAR-005 tests)
TF-007  ← F-1 (primary)
TF-008  ← F-3 (primary)
```

This mapping shows that the four BTAR-002 findings collectively expose **TF-001 / TF-002 / TF-003 / TF-004 / TF-007 / TF-008** — six of the eight classes — out of the gate. TF-005 and TF-006 are introduced proactively in Phase 2 because the AI output safety gate (BTAR-005) is the appropriate point to enforce them; they are not yet observed defects but they are predictable failure modes once the live path is hardened on the upstream side.

### 7.5 TF as Test Oracle

For every TF-NNN, BTAR-007's failure-path test suite must contain at least one test of the form:

```text
test('TF-NNN: [name]', () => {
  // 1. Inject the specific failure condition.
  // 2. Run the live chat path.
  // 3. Assert the response carries the correct availability state.
  // 4. Assert the response carries the correct disclosure shape.
  // 5. Assert the safety gate decision matches.
  // 6. Assert the trust evidence pins the correct truth class.
});
```

A TF without a corresponding failure-path test is unproven-closed and cannot be marked RESOLVED at P2TG-001.

---

## 8. Relationship to Plan 2.0 (Master Constitution)

### 8.1 Plan 2.0 → Plan 2.1 Mapping

| Plan 2.0 section | Plan 2.1 section that sharpens it |
| --- | --- |
| §1.1 Canonical Mission | §1.1 (canonical mission restated as Phase 2 law) |
| §1.4 First Principle | §2.1 (first principle restated, with §2.2 justification and §2.4/§2.5 operational list) |
| §1.5 Three honest states | §3 (truth classes, with KNOWS / PARTIALLY KNOWS / CANNOT SAFELY CLAIM and §3.4 honesty invariant) |
| §5 Judgment availability states | §4 (availability law, with §4.3 non-negotiable rule and §4.4 state-transition discipline) |
| §3.2 Architecture freeze still active | §5 (non-replacement law for L13/L14, with §5.4 invariant) |
| §11 BTAR sequence (BTAR-003..008) | §6 (inheritance rules for every Phase 2 BTAR) |
| §1.3 F-1..F-4 findings | §7 (trust failure taxonomy TF-001..TF-008) |

### 8.2 Conflict-Resolution Rule

If a future plan, BTAR, or registry entry appears to conflict with both Plan 2.0 and Plan 2.1, **Plan 2.0 wins on master execution scope** and **Plan 2.1 wins on mission and first-principle interpretation**. Plan 2.1 does not override Plan 2.0; it sharpens it.

### 8.3 Plan 2.1 Does Not Authorize

- Any BTAR (BTAR-003..008+ each requires its own admission).
- Any code change.
- Any new file.
- Any opening of NB-001..NB-010.
- Any L*.X surface modification.

Plan 2.1 is mission-class governance only.

---

## 9. Daily Enforcement of Plan 2.1 (Hook Into Plan 1.9)

### 9.1 Plan 1.9 Banner Addition

Plan 1.9 §6 requires every PR to carry the daily-enforcement banner. Phase 2 PRs must additionally carry the Plan 2.1 mission-trace block:

```text
Plan 2.1 Mission Trace
  Mission clause(s):       [from §1.2 table]
  First principle item:    [from §2.3 table]
  Truth class boundary:    [§3.1 / §3.2 / §3.3]
  TF(s) removed:           [TF-NNN list]
  Availability law role:   [introduces / consumes / enforces]
  Non-replacement check:   confirmed (zero L*.X file touches)
```

### 9.2 Reviewer Duties

For every Phase 2 PR, the reviewer must:

1. Verify the mission-trace block is filled with concrete content (no "TBD", no "see BTAR").
2. Verify the diff contains zero files under `src/l*/`.
3. Verify the BTAR linked in the PR has an ACTIVE status.
4. Verify any user-facing change preserves the AVAILABLE/DEGRADED/UNAVAILABLE state pinning.

A PR missing any of those four conditions is **non-mergeable** and must be re-worked.

---

## 10. Acceptance Criteria for Plan 2.1

### 10.1 Plan 2.1 Is Accepted When

- This file exists at `apps/coinet-platform/docs/backend-v1/phase-2/phase-2-mission-and-first-principle.md`.
- The mission statement of §1.1 is exact and complete.
- The first principle of §2.1 is exact and complete.
- The three truth classes of §3 are defined with triggers, permitted behavior, and forbidden behavior.
- The availability law of §4 is stated with the non-negotiable rule of §4.3.
- The non-replacement law of §5 is stated with the §5.4 invariant.
- The inheritance rules of §6 are stated.
- The trust failure taxonomy TF-001..TF-008 of §7 is complete with primary owning BTAR and finding mapping.
- The acceptance block of §11 is present.
- The master record index is updated to list Plan 2.1 as ACTIVE.
- The Phase 2 decision log records Plan 2.1's adoption.

### 10.2 Plan 2.1 Is Inadmissible If

- Any Phase 1 plan is not ACTIVE/COMPLETED at the moment of adoption.
- Plan 2.0 is not ACTIVE at the moment of adoption.
- Any code under `apps/coinet-platform/src/**` is changed by the same commit.
- Any BTAR is admitted by the same commit.

---

## 11. Acceptance Block

```text
Plan: 2.1 — Phase 2 Mission and First Principle
Status: ACTIVE
Effective: 2026-05-23
Authority: Plan 2.0 (Phase 2 General Plan, ACTIVE, 2026-05-23)
Inheritance audit:
  Plan 1.1  ACTIVE
  Plan 1.2  ACTIVE
  Plan 1.3  ACTIVE
  Plan 1.4  ACTIVE
  Plan 1.5  ACTIVE
  Plan 1.6  ACTIVE
  Plan 1.7  ACTIVE
  Plan 1.8  ACTIVE
  Plan 1.9  ACTIVE
  Plan 1.10 ACTIVE
  Plan 1.11 COMPLETED (P1RR-001 ACCEPTED)
  Plan 1.12 COMPLETED (P1TG-002 ACCEPTED → P2-READY)
  Plan 2.0  ACTIVE
Dependent records: F-1, F-2, F-3, F-4 (Phase 2 findings registry); BTAR-002 §21.8 (Phase 1 chat smoke evidence)
Authorizes: nothing implementational; mission-class governance only
Does not authorize: any BTAR; any code change; any new file; any L*.X modification; any NB-001..NB-010 opening
Next admissible step: BTAR-003 admission plan (silent fallback removal + JudgmentAvailabilityState) under Plan 2.0 §11.1 — requires its own eight-question gate (Plan 1.6) before ACTIVE
```

---

## 12. Glossary

| Term | Definition |
| --- | --- |
| **Live judgment/chat/AI path** | `POST /api/chat/message → ChatService.sendMessage → buildSignalSnapshot → produceJudgment → formatJudgmentForAI → aiService.analyze → ChatMessageResponse` |
| **Structured judgment** | Output of `produceJudgment()`: state / thesis / contradictions / timing / confidence / 24h signal / failure condition |
| **JudgmentAvailabilityState** | The three-valued tag attached to every chat turn: `AVAILABLE` / `DEGRADED` / `UNAVAILABLE` |
| **Truth class** | One of: `KNOWS`, `PARTIALLY_KNOWS`, `CANNOT_SAFELY_CLAIM` — the system's honest internal assessment of what it can claim |
| **Silent fallback** | Pattern in which structured judgment fails, but the system silently substitutes generic AI text presented as if it were Coinet judgment |
| **Silent-continue** | Pattern in which a service catches/logs a failure and continues past it, deferring the actual throw to a later dereference |
| **Trust failure (TF-NNN)** | One of the eight failure shapes that the first principle forbids; see §7 |
| **Mission trace** | Mandatory block on every Phase 2 BTAR/PR linking it back to §1.2, §2.3, §3, §7 |
| **Non-replacement law** | The §5 rule that Phase 2 hardens but does not replace L13/L14 surfaces |
| **First principle** | The §2.1 statement that no user-facing AI answer may pretend structured judgment exists when it does not |
| **Mission** | The §1.1 statement of why Phase 2 exists |
| **F-1..F-4** | The four findings carried forward from BTAR-002 §21.8 |
| **NB-001..NB-010** | Plan 1.3 deferred areas, all remaining deferred during Phase 2 |
| **FRP** | Plan 1.5 §8 Formal Replacement Procedure — required for `formatJudgmentForAI` retirement |
| **AFE / VSE / SCR / UDF** | Plan 1.10 exception record classes — required for any Phase 2 deviation from inherited rules |

---

## 13. Cross-Reference Index

| Topic | Location |
| --- | --- |
| Mission canonical statement | §1.1 |
| Mission decomposition table | §1.2 |
| First principle canonical statement | §2.1 |
| First principle forbidden list | §2.4 |
| First principle allowed list | §2.5 |
| Three truth classes | §3 |
| Three-class honesty invariant | §3.4 (Plan-2.1-INV-01) |
| Availability law | §4.1 |
| Non-negotiable rule | §4.3 |
| Compile-time enforcement shape | §4.3 |
| State transition discipline | §4.4 |
| Non-replacement law | §5.1 |
| Non-replacement invariant | §5.4 (Plan-2.1-INV-02) |
| Inheritance rules | §6.1 |
| Mandatory BTAR mission-trace fields | §6.2 |
| Inheritance audit trail | §6.5 |
| Trust failure taxonomy (TF-001..TF-008) | §7.2 |
| TF → finding mapping | §7.4 |
| TF as test oracle | §7.5 |
| Plan 2.0 → Plan 2.1 mapping | §8.1 |
| Daily enforcement banner | §9.1 |
| Acceptance criteria | §10 |
| Acceptance block | §11 |

---

## 14. Replaceability Note

Plan 2.1 may itself be **superseded** by a future Plan 2.1.x or Plan 3.x **only** if:

- the superseding plan explicitly cites Plan 2.1 in its `Supersedes:` line,
- the superseding plan re-states the mission and first principle without weakening either,
- the superseding plan does not introduce new authorization to touch L*.X surfaces inside Phase 2 scope,
- and the supersession is recorded in the Phase 2 decision log.

Until such a supersession, Plan 2.1 is the canonical mission-and-first-principle document of Phase 2.

---

## 15. Risk of Plan 2.1 Itself

Plan 2.1 is a documentation-only artifact. Risks:

| Risk | Mitigation |
| --- | --- |
| Plan 2.1 becomes ignored "vibes doc" | Plan 1.9 §9.1 binds every Phase 2 PR to Plan 2.1 mission-trace block |
| Plan 2.1 conflicts with Plan 2.0 | §8.2 conflict-resolution rule defines tiebreak |
| Plan 2.1 is read as authorization for BTARs | §0.5, §6.4, §8.3, §11 explicitly disclaim authorization |
| Plan 2.1 is amended silently | §14 supersession discipline + decision-log entry required |
| Plan 2.1 is treated as Phase 3 unlock | §0.2 explicitly states Phase 3 remains gated |

---

## 16. Final Constraint

> **No Phase 2 implementation work begins on the strength of Plan 2.1 alone.** Plan 2.1 sets the mission and the first principle. BTAR-003 (silent fallback removal + JudgmentAvailabilityState) is the **next admissible step**, and BTAR-003 requires its own admission plan, its own eight-question gate review (Plan 1.6), and its own ACTIVE state before a single line of source code is touched.

Plan 2.1 ends here.
