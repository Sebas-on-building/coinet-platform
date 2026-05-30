# Coinet Backend v1 — Scope

**Status:** ACTIVE
**Program:** Coinet Backend v1
**Authority:** Phase 1 Charter (`phase-1/phase-1-charter.md`)
**Effective:** 2026-05-19

> **Read this first.** This file is the navigation entrypoint for the Coinet Backend v1 production-convergence program. It is a Level-6 navigation aid (per Plan 1.7 §5.1) — it summarizes, but it is never more authoritative than its source documents.

---

## 1. What Backend v1 Is

Coinet backend v1 is the **finite production target** that turns Coinet's certified 14-layer architecture and active product runtime into a launchable backend system. It is governed by a strict scope-control stack (Plans 1.1–1.7) that froze open-ended architecture expansion as of 2026-05-19.

The active product pipeline (load-bearing today):

```text
/api/chat
  → api/chat/service.ts
    → buildSignalSnapshot()
    → produceJudgment()
    → formatJudgmentForAI()
    → aiService.analyze()
      → services/ai-service.ts
```

This is what must become production-trustworthy.

---

## 2. Execution Boundary

The pre-API backend execution boundary is fixed:

```text
Phase 1 — Backend stabilization (truthful build, CI, smoke tests, scope docs)
Phase 2 — Live-path trustworthiness (judgment availability, output safety gate, testable chat)
Phase 3 — Synthetic judgment truth (Backend Judgment Truth Suite)
STOP AND REASSESS
```

No real-API integration begins until after Phase 3 and explicit API purchase. No CIP.1 work, no Strategy Lab backend, no Chart Canvas backend, no plugin systems, no experimental agent builders, no full L14 operationalization within this boundary.

---

## 3. In Scope (V1-S01..V1-S06)

| ID     | Surface                                   | Status                 |
| ------ | ----------------------------------------- | ---------------------- |
| V1-S01 | AI Chat                                   | Core Required          |
| V1-S02 | Asset Judgment                            | Core Required          |
| V1-S03 | Market / Terminal Intelligence            | Core Required          |
| V1-S04 | Radar / Ranking Intelligence              | Core Required          |
| V1-S05 | Auth / Session / Conversation Persistence | Supporting Required    |
| V1-S06 | Truthful Alerts                           | Conditional Admissible |

Authoritative source: `phase-1/backend-v1-product-boundary.md` (Plan 1.2).

Reasoning spine: **Asset Judgment + AI Chat**. Everything else extends, supports, or conditionally complements that spine.

---

## 4. Out of Scope / Deferred (NB-001..NB-010)

| ID     | Area                                                | Classification          |
| ------ | --------------------------------------------------- | ----------------------- |
| NB-001 | Strategy Lab backend                                | Future Product Program  |
| NB-002 | Chart Canvas backend                                | Future Product Program  |
| NB-003 | Plugin systems                                      | Future Product Program  |
| NB-004 | Experimental agent builders                         | Explicitly Deferred     |
| NB-005 | Full calibration proposal ecosystem                 | Valid but Not Required  |
| NB-006 | Full CIP.1 unified architecture                     | Reassess After Phase 3  |
| NB-007 | Dormant L14 systems (full operationalization)       | Conditional / Not Now   |
| NB-008 | Deep real API/provider integration before purchase  | Reassess After Purchase |
| NB-009 | Advanced alert delivery ecosystem                   | Conditional / Future    |
| NB-010 | Broad cleanup not directly required for Phases 1–3  | Reassess After Phase 3  |

Authoritative source: `phase-1/backend-v1-non-blocker-and-non-scope-registry.md` (Plan 1.3).

---

## 5. Frozen / Blocked

**Architecture expansion is frozen** (Plan 1.4):

- No new `L*.X` sublayers.
- No new constitutional architecture programs.
- No new dormant runtime programs.
- No new speculative backend frameworks or world-building.

**Implementation sprawl is prohibited** (Plan 1.5):

- No new `-v2`, `-final`, `-complete`, `-next`, `-comprehensive`, `-master`, `-ultimate`, `-rebuilt` implementation files.
- No new parallel service families across PSC-001..PSC-010 (scoring, derivatives, news, social, sentiment, fetching, anomaly monitoring, judgment orchestration, AI response, alert intelligence).
- Allowed semantic versioning: persisted schemas, historical fact families, API wire protocols, migration identifiers, certification artifacts.

Authoritative sources: `phase-1/backend-v1-architecture-expansion-freeze-law.md`, `phase-1/backend-v1-parallel-service-and-version-sprawl-prohibition.md`.

---

## 6. Task Admission

Every functional backend task is filed as a **Backend Task Admission Record (BTAR)** and classified into one of:

```text
TAD-A — ADMIT_ACTIVE_NOW
TAD-B — ADMIT_BUT_QUEUE_FOR_LATER_PHASE_WITHIN_CURRENT_PROGRAM
TAD-C — DEFER_POST_PHASE_3
TAD-D — BLOCK_AS_SCOPE_OR_FREEZE_VIOLATION
TAD-E — ESCALATE_FOR_EXCEPTION_OR_ARCHITECTURAL_DECISION
```

Tasks pass through an **eight-question admissibility gate**: product boundary fit, phase alignment, non-scope conflict, architecture freeze conflict, version-sprawl conflict, direct production-readiness value, timing necessity, opportunity cost.

Authoritative source: `phase-1/backend-v1-task-admissibility-framework.md` (Plan 1.6).
Template: `phase-1/templates/backend-task-admission-record-template.md`.

---

## 7. Where Things Live

### 7.1 Plans (Phase 1 governance stack)

```text
phase-1/phase-1-charter.md                                       (Plan 1.1)
phase-1/backend-v1-product-boundary.md                           (Plan 1.2)
phase-1/backend-v1-non-blocker-and-non-scope-registry.md         (Plan 1.3)
phase-1/backend-v1-architecture-expansion-freeze-law.md          (Plan 1.4)
phase-1/backend-v1-parallel-service-and-version-sprawl-prohibition.md  (Plan 1.5)
phase-1/backend-v1-task-admissibility-framework.md               (Plan 1.6)
phase-1/backend-v1-source-of-truth-system.md                     (Plan 1.7)
```

### 7.2 Registries (operational quick-references)

```text
phase-1/registries/backend-v1-in-scope.registry.md
phase-1/registries/backend-v1-deferred.registry.md
phase-1/registries/backend-v1-blocked.registry.md
phase-1/registries/backend-v1-active-task.registry.md
phase-1/registries/backend-v1-task-admissibility.policy.md
phase-1/registries/backend-v1-exception.registry.md
phase-1/registries/backend-v1-record-index.registry.md
phase-1/registries/backend-v1-decision-log.registry.md
```

### 7.3 Templates

```text
phase-1/templates/backend-task-admission-record-template.md
phase-1/templates/architecture-freeze-exception-template.md
phase-1/templates/version-sprawl-exception-template.md
phase-1/templates/formal-replacement-procedure-template.md
phase-1/templates/bounded-shadow-comparison-template.md
phase-1/templates/scope-change-request-template.md
phase-1/templates/urgent-defect-record-template.md
```

### 7.4 Records (individual decision documents)

```text
phase-1/records/backend-task-admission-records/   (BTAR-NNN-*.md)
phase-1/records/exceptions/                       (AFE-*, VSE-*)
phase-1/records/formal-replacements/              (FRP-NNN-*.md)
phase-1/records/shadow-comparisons/               (BSCP-NNN-*.md)
phase-1/records/scope-changes/                    (SCR-NNN-*.md)
phase-1/records/decisions/                        (ADR-NNN-*.md)
phase-1/records/urgent-defects/                   (UDF-NNN-*.md)
```

Every record must be indexed in `phase-1/registries/backend-v1-record-index.registry.md` (Plan 1.7 §10.3).

---

## 8. Quick Reference — Common Questions

| Question                                          | Answer                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| What backend surfaces are in scope?               | V1-S01..V1-S06 (§3)                                                     |
| What is deferred?                                 | NB-001..NB-010 (§4)                                                     |
| Can I create `ai-service-v2.ts`?                  | No (Plan 1.5)                                                           |
| Can I create L14.11?                              | No (Plan 1.4)                                                           |
| Can I start full CIP.1?                           | No, NB-006 (Plan 1.3)                                                   |
| Can I start Strategy Lab backend?                 | No, NB-001 (Plan 1.3)                                                   |
| Can I begin real API/provider integration?        | No until purchase + Phase 3 done, NB-008 (Plan 1.3)                     |
| Can I borrow L13.9 safety logic for AI gating?    | Yes if bounded (Plan 1.4 Legal Work Class D)                            |
| How do I propose a backend task?                  | Fill BTAR template; route through Plan 1.6 eight-question gate          |
| How do I propose a scope change?                  | Fill SCR template; route through Plan 1.7 §13.5                         |
| Where does this document fit in the hierarchy?    | Level 6 — navigation aid only; source plans win in any conflict         |
| Which document wins if two disagree?              | The higher-authority document (Plan 1.7 §5.1, §13)                      |

---

## 9. Glossary (Pointer)

For full definitions of TAD, BTAR, AFE, VSE, FRP, BSCP, SCR, UDF, ADR, V1-S01..S06, NB-001..NB-010, FRZ-001..FRZ-008, PSC-001..PSC-010, AFV-A..H, VSV-A..J, CSP-A..E, EDGE-A..F, BACKLOG-A..E, and the status taxonomy, see each source plan's glossary section.

---

*This document is a navigation aid. It is never more authoritative than the source plans it references. If you find a conflict between this file and a Plan 1.1–1.7 document, the plan wins; this file is corrected.*
