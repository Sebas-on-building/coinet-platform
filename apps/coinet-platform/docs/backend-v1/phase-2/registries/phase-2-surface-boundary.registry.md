# Phase 2 Surface Boundary Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — companion to Plan 2.2)
**Source Plan:** `phase-2/phase-2-in-scope-surfaces-and-runtime-boundary.md` (Plan 2.2)
**Phase:** Phase 2 — Live Judgment / Chat / AI Trust
**Created:** 2026-05-23
**Last Updated:** 2026-05-23

> The repo-resident enforcement view of Plan 2.2 §§5..7 and §10. Every Phase 2 BTAR's §11 Surface Boundary Mapping section is verified against the rows below. PRs whose diffs touch files not mapped here are blocked at the daily enforcement gate (Plan 1.9 §11.4 reviewer duties).

---

## 1. Schema

```text
surface_id              — stable ID (P2-S0N / P2-R0N / P2-F0N)
surface_name            — short human-readable name
path                    — repo-relative path or path family
permission_class        — P2-OPEN | P2-TOUCH_WITH_BOUNDS | P2-READ_ONLY | P2-FORBIDDEN
why_in_scope            — one-sentence justification mapped to Plan 2.1 §1.2 mission clause
allowed_touch           — bullet list of allowed modifications
forbidden_touch         — bullet list of forbidden modifications
required_btar_mapping   — what a BTAR must declare when touching this surface
risk_level              — CRITICAL | HIGH | MEDIUM | LOW | N/A
```

---

## 2. Primary In-Scope Surfaces (P2-S01..P2-S07)

| Surface ID | Name | Path | Permission | V1 class | Risk | Why In Scope (Plan 2.1 §1.2 clause) | Expected admitting BTAR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P2-S01 | Chat service | `apps/coinet-platform/src/api/chat/service.ts` | P2-TOUCH_WITH_BOUNDS | V1_CORE (SURF-001) | CRITICAL | "live judgment/chat/AI path" + "explicit failure" + "impossible to silently fake" | BTAR-003, 004, 005, 006 |
| P2-S02 | Chat controller/routes/types | `apps/coinet-platform/src/api/chat/controller.ts` · `routes.ts` · `types.ts` | P2-TOUCH_WITH_BOUNDS | V1_CORE (SURF-002, 003, 008) | HIGH | "user-facing response behavior … explicit" | BTAR-003, 004 |
| P2-S03 | Judgment service path | `apps/coinet-platform/src/services/judgment/` | P2-TOUCH_WITH_BOUNDS | V1_CORE (SURF-009..019) | CRITICAL | "structured judgment availability explicit" | BTAR-003 |
| P2-S04 | AI service boundary | `apps/coinet-platform/src/services/ai-service.ts` | P2-TOUCH_WITH_BOUNDS | V1_CORE (SURF-020) | CRITICAL | "AI expression … explicit" + "impossible to silently fake" | BTAR-005 |
| P2-S05 | Intent classifier / handlers | `apps/coinet-platform/src/services/intent-classifier.ts` · `intent-handlers.ts` | P2-TOUCH_WITH_BOUNDS | V1_CORE | HIGH | "failure … explicit" (F-1 type drift) | BTAR-003 |
| P2-S06 | Symbol detection | `apps/coinet-platform/src/services/symbol-detector.ts` | P2-TOUCH_WITH_BOUNDS | V1_CORE | MEDIUM | "degradation … explicit" (no-symbol / ambiguous-symbol path) | TBD |
| P2-S07 | Market data and context fetch | `apps/coinet-platform/src/services/market-data.ts` + related context fetchers used directly by chat service | P2-TOUCH_WITH_BOUNDS | V1_CORE | HIGH | "degradation … explicit" (F-4 fan-out classification) | BTAR-006, 008 |

### 2.1 Allowed / Forbidden / Required-Caution Detail

Full per-surface allowed_touch / forbidden_touch / required_btar_mapping content is in Plan 2.2 §§6.1..6.7. Required caution language for P2-S01 / P2-S03 / P2-S04 is in Plan 2.2 §12.3.

---

## 3. Supporting In-Scope Surfaces (P2-S08..P2-S12)

| Surface ID | Name | Path | Permission | Risk | Purpose | Expected admitting BTAR |
| --- | --- | --- | --- | --- | --- | --- |
| P2-S08 | Chat tests | `apps/coinet-platform/src/api/chat/__tests__/` | P2-OPEN | LOW | Failure-path + silent-fallback + availability + prompt-package + AI-output-safety tests | BTAR-007 |
| P2-S09 | Typed prompt package | `apps/coinet-platform/src/api/chat/judgment-prompt-package.ts` · `judgment-prompt-package.types.ts` | P2-OPEN (if admitted) | MEDIUM | CoinetJudgmentPromptPackage; replaces ASCII stuffing via FRP | BTAR-004 |
| P2-S10 | Judgment availability | `apps/coinet-platform/src/api/chat/judgment-availability.ts` · `judgment-availability.types.ts` | P2-OPEN (if admitted) | MEDIUM | AVAILABLE / DEGRADED / UNAVAILABLE state types and resolver | BTAR-003 |
| P2-S11 | AI output safety gate | `apps/coinet-platform/src/api/chat/ai-output-safety-gate.ts` · `ai-output-safety-gate.types.ts` | P2-OPEN (if admitted) | MEDIUM | ALLOW / ALLOW_WITH_WARNINGS / REWRITE_REQUIRED / BLOCK_OR_CLARIFY decisions | BTAR-005 |
| P2-S12 | Failure classifier + context boundary | `apps/coinet-platform/src/api/chat/chat-failure-classifier.ts` · `context-fetch-boundary.ts` | P2-OPEN (if admitted) | MEDIUM | Classify failures; reduce 27-mock coupling (F-2) | BTAR-006 |

### 3.1 Naming Discipline

All new files under P2-S09..S12 must follow Plan 1.5 naming rules:

- No `-v2` / `-final` / `-rewritten` / `-comprehensive` suffixes.
- Names must be descriptive of the trust capability, not the iteration count.
- A new file in a P2-OPEN class still goes through Plan 1.5 §11 prohibited-naming check.

---

## 4. Read-Only Surfaces (P2-R01..P2-R02)

| Surface ID | Name | Path | Permission | Notes |
| --- | --- | --- | --- | --- |
| P2-R01 | L13 dormant architecture | `apps/coinet-platform/src/l13/` | P2-READ_ONLY | Reading allowed (no BTAR required); importing into live path requires BTAR approval per Plan 2.2 §13; modification requires AFE under Plan 1.10 |
| P2-R02 | L14 dormant architecture | `apps/coinet-platform/src/l14/` | P2-READ_ONLY | Same rules as P2-R01 |

### 4.1 Adjacent Read-Only Surfaces (Not Numbered But In Class)

```text
apps/coinet-platform/src/l5/ ... src/l12/    — read allowed; modification requires AFE (Plan 1.4 freeze)
apps/coinet-platform/src/scripts/test-l1*    — read allowed; certification scripts not part of live path
```

These are not assigned numbered IDs because they are not the primary borrowing targets; they remain governed by the Plan 1.4 architecture freeze unconditionally.

---

## 5. Forbidden Surfaces (P2-F01..P2-F03)

| Surface ID | Name | Path (forbidden creation) | Permission | Status | Crossing Pathway |
| --- | --- | --- | --- | --- | --- |
| P2-F01 | Parallel chat runtime | `chat-service-v2.ts` / `chat-runtime.ts` / `chat-service-rewritten.ts` (anywhere under `src/api/chat/`) | P2-FORBIDDEN | BLOCKED | FRP (Plan 1.5 §8); default DENY (Plan 2.3 OOS-014) |
| P2-F02 | Parallel AI service | `ai-service-v2.ts` / `ai-service-final.ts` / `ai-service-safe.ts` (parallel) | P2-FORBIDDEN | BLOCKED | FRP; default DENY (Plan 2.3 OOS-012) |
| P2-F03 | Parallel judgment engine | `judgment-engine-v2.ts` / `judgment-engine-final.ts` | P2-FORBIDDEN | BLOCKED | FRP; default DENY (Plan 2.3 OOS-013) |

### 5.1 Adjacent Forbidden Classes (Documented But Not Numbered)

```text
new L*.X sublayers              — P2-FORBIDDEN class; AFE pathway (Plan 2.3 OOS-015)
Strategy Lab backend            — P2-FORBIDDEN class; SCR pathway (Plan 2.3 OOS-003)
Chart Canvas backend            — P2-FORBIDDEN class; SCR pathway (Plan 2.3 OOS-004)
plugin systems                  — P2-FORBIDDEN class; SCR pathway (Plan 2.3 OOS-005)
agent builders                  — P2-FORBIDDEN class; SCR pathway (Plan 2.3 OOS-006)
```

These follow the same default-DENY discipline as P2-F01..F03 but are addressed surface-class-wide in Plan 2.3 rather than as individual P2-F entries.

---

## 6. Permission Class Summary

```text
P2-OPEN              — 5 surfaces  (P2-S08..P2-S12)
P2-TOUCH_WITH_BOUNDS — 7 surfaces  (P2-S01..P2-S07)
P2-READ_ONLY         — 2 surfaces  (P2-R01..P2-R02; plus adjacent l5..l12 by class)
P2-FORBIDDEN         — 3 surfaces  (P2-F01..P2-F03; plus adjacent classes by Plan 2.3)
```

Total enumerated surfaces at adoption: **17** (12 in-scope + 2 read-only + 3 forbidden).

---

## 7. BTAR Surface Mapping Requirement (Plan 2.2 §11)

Every Phase 2 BTAR admission record must include the section:

```text
## Surface Boundary Mapping
```

with the following fields:

```text
touched_surfaces                    — list of surface IDs from this registry
permission_class_per_surface        — P2-OPEN | P2-TOUCH_WITH_BOUNDS | P2-READ_ONLY | P2-FORBIDDEN
why_each_surface_is_needed          — one sentence per surface, mapped to T1..T5
smallest_possible_touch             — the minimal function/region named
forbidden_surfaces_confirmed_absent — statement: "P2-F01..P2-F03 not touched"
Plan 2.3 OOS check result           — Q1..Q5 answers from Plan 2.3 §25
```

Outcome mapping (Plan 2.2 §11.3):

```text
All fields present + diff matches the mapping                              → admission may proceed
Section missing or field missing                                           → TAD-D (BLOCK)
Diff touches a surface not declared in touched_surfaces                    → PR rejected at Plan 1.9 gate
Diff touches P2-FORBIDDEN without Plan 1.10 exception                      → TAD-D (BLOCK)
Diff imports from P2-READ_ONLY into live path without BTAR approval        → TAD-D (BLOCK)
Uncertain                                                                  → TAD-E (ESCALATE)
```

---

## 8. Required Caution Language (Plan 2.2 §12.3)

| Surface touched | Required verbatim line in the BTAR record |
| --- | --- |
| P2-S01 | `This is a bounded live-path trust modification, not a chat service rewrite.` |
| P2-S03 | `This is judgment availability/failure classification, not a new judgment engine.` |
| P2-S04 | `This is an AI output trust boundary modification, not a new AI service implementation.` |

Absence of the required line when its surface is touched is a Plan-2.2-INV-01 violation and blocks the PR.

---

## 9. Required Test Assertion (Plan 2.2 §14.3)

Every test that exercises a surface containing an external-API boundary (e.g., P2-S01, P2-S04, P2-S07) must include the assertion:

```text
No real provider calls occurred.
```

This is enforced at the test-suite and reviewer level. A test of an external-API-boundary surface without the assertion is not a Phase 2 admissible test (per Plan 2.2 §14).

---

## 10. Exception Filing Map

```text
Touch P2-FORBIDDEN (P2-F01..F03)     → FRP (Plan 1.5 §8); default DENY
Modify P2-READ_ONLY (P2-R01..R02)    → AFE (Plan 1.4 / Plan 1.10); default DENY
Import P2-READ_ONLY runtime into live path → BTAR §13 approval section; default DENY
Response-shape change                → BTAR §16.4 satisfaction; default DEFER if §16.4 incomplete
External API expansion within in-scope surface → SCR (Plan 1.10); default DENY (Plan 2.3 OOS-007)
```

Default decision on any unclear crossing: **TAD-E (ESCALATE)** — owner adjudicates with Plan 2.2 + Plan 2.3 in hand.

---

## 11. Exception Log (Phase 2 Surface Crossings)

| Exception ID | Surface Crossed | Permission Class | Status | Filed | Sunset | Source Record |
| ------------ | --------------- | ---------------- | ------ | ----- | ------ | ------------- |
| —            | —               | —                | —      | —     | —      | (none at adoption) |

At adoption (2026-05-23) no Phase 2 surface-crossing exceptions are filed.

---

## 12. Append-Only Discipline

- P2-S01..P2-S12, P2-R01..P2-R02, P2-F01..P2-F03 are non-removable for the duration of Phase 2.
- `permission_class` is mutable only via amendment recorded in the Phase 2 decision log + Plan 2.2 §10.4 append-discipline.
- `surface_name` and `path` are non-mutable; relocating a file requires a new surface ID and a decision-log entry.
- New IDs may be appended (P2-S13, P2-R03, P2-F04, …) if a new boundary class is discovered during Phase 2.

---

## 13. Synchronization Rule

This registry and Plan 2.2 §§5..7 + §10 must stay in lockstep. If a row's `permission_class` or `allowed_touch` / `forbidden_touch` cell appears to disagree with the plan text, the plan text wins and the registry must be amended in the same work session.

---

*This registry is Level 4. Plan 2.2 is the Level 2 governance document that populates it. Plans 2.0 (master constitution), 2.1 (mission/first principle), and 2.3 (negative scope) are the coordinated Phase 2 governance stack.*
