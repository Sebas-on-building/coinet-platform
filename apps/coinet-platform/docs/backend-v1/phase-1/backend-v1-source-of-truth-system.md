# Backend v1 Source-of-Truth System

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.7
Effective: 2026-05-19
Authority: Backend v1 Completion Program
Inherits From: Plans 1.1–1.6
Supersedes: Informal scope tracking, chat-only memory, scattered governance notes

---

## 1. Identity and Authority

This document is the **source-of-truth authority** of the Coinet Backend v1 program. It is the seventh and capstone scope-control plan inside Phase 1.

Plans 1.1–1.6 produced the complete governance stack:

```text
Plan 1.1 = Why                              [ACTIVE]
Plan 1.2 = What is in                       [ACTIVE]
Plan 1.3 = What is out                      [ACTIVE]
Plan 1.4 = No new architecture              [ACTIVE]
Plan 1.5 = No new implementation sprawl     [ACTIVE]
Plan 1.6 = Task-by-task admission law       [ACTIVE]
```

Plan 1.7 closes the loop by establishing **where the governance lives, how it stays inspectable, and how it is prevented from drifting** as implementation begins.

This document:

- does not implement code,
- does not admit specific tasks,
- does not redefine prior plans,
- does not classify existing backend modules (that is Plan 1.8),
- does not start Phase 2 or Phase 3 work.

It performs one job:

> **It defines the repo-resident source-of-truth system — directory structure, mandatory documents, mandatory registries, mandatory templates, record-storage law, synchronization law, status taxonomy, and conflict-resolution hierarchy — that makes the backend v1 program inspectable, enforceable, and impossible to misremember.**

### 1.1 Pre-execution Dependency Check (Performed)

Confirmed `ACTIVE` upstream artifacts:

1. `phase-1-charter.md` ✅
2. `backend-v1-product-boundary.md` ✅
3. `backend-v1-non-blocker-and-non-scope-registry.md` ✅
4. `backend-v1-architecture-expansion-freeze-law.md` ✅
5. `backend-v1-parallel-service-and-version-sprawl-prohibition.md` ✅
6. `backend-v1-task-admissibility-framework.md` ✅
7. `templates/backend-task-admission-record-template.md` ✅

---

## 2. Constitutional Purpose

### 2.1 Canonical Purpose Statement

> **The Required Scope Artifacts and Source-of-Truth Documents plan exists to ensure that the Coinet backend v1 production-convergence program is governed by explicit repo-resident documents, registries, templates, and records, so that every active, deferred, blocked, exceptional, or admitted backend task can be inspected without relying on chat memory, personal memory, or informal context.**

### 2.2 Why This Matters

If scope truth lives only in conversation, the system will drift. A new engineer, backend assistant, or future version of any operator must be able to open the repo and answer:

```text
What are we building?
What are we not building?
What is frozen?
What is blocked?
What is deferred?
What tasks are admitted?
What tasks require exception?
What documents are authoritative?
Where do new task admission records go?
```

Plan 1.7 makes those answers discoverable from the repo alone.

---

## 3. Inheritance From Plans 1.1–1.6

### 3.1 Inheritance Statement

> **This plan inherits from the Phase 1 Charter, the Backend v1 Product Boundary, the Non-Blocker Registry, the Architecture Freeze Law, the Version-Sprawl Prohibition, and the Backend Task Admissibility Framework. It does not redefine their content. It defines the repo-resident source-of-truth system that keeps them inspectable and synchronized.**

### 3.2 Relationship Table

| Plan         | Role                                         |
| ------------ | -------------------------------------------- |
| Plan 1.1     | Declares production-convergence mission      |
| Plan 1.2     | Defines positive v1 backend scope            |
| Plan 1.3     | Defines negative v1 backend scope            |
| Plan 1.4     | Freezes architecture expansion               |
| Plan 1.5     | Freezes implementation sprawl                |
| Plan 1.6     | Admits or rejects backend tasks              |
| **Plan 1.7** | Defines where the authoritative records live |

---

## 4. First Principle

### 4.1 Canonical First Principle

> **If a backend scope decision, task status, exception, deferral, or source-of-truth rule does not exist in the repository, it is not operationally authoritative.**

Chat can explain. Memory can remind. But the repo must govern.

### 4.2 Operational Translation

| Decision                                       | Where it must live                                      |
| ---------------------------------------------- | ------------------------------------------------------- |
| "AI Chat is in v1 scope"                       | Product boundary document + in-scope registry           |
| "Strategy Lab backend is deferred"             | Non-scope registry + deferred registry                  |
| "No L14.11"                                    | Architecture freeze law + blocked registry              |
| "No `ai-service-v2.ts`"                        | Version-sprawl prohibition + blocked registry           |
| "Fix build script is active now"               | BTAR record + active task registry                      |
| "Full API integration deferred until purchase" | Non-scope registry + deferred registry                  |
| "Exception approved"                           | Exception record + exception registry + record index    |

---

## 5. Source-of-Truth Hierarchy

### 5.1 Authority Hierarchy

```text
Level 0 — Phase 1 Charter
Level 1 — Product Boundary + Non-Scope Registry (Plans 1.2, 1.3)
Level 2 — Freeze Laws (Plans 1.4, 1.5)
Level 3 — Task Admissibility Framework (Plan 1.6)
Level 4 — Registries (operational quick-references)
Level 5 — Individual Records (BTARs, exceptions, replacements, etc.)
Level 6 — Summaries / dashboards / scope entrypoint
```

### 5.2 Meaning of Each Level

- **Level 0** — Mission and first principle.
- **Level 1** — What is in / what is out.
- **Level 2** — What cannot be added.
- **Level 3** — How tasks are accepted, deferred, blocked, or escalated.
- **Level 4** — Current operational state of scope and tasks.
- **Level 5** — Concrete decision records (BTAR-001, AFE-001, etc.).
- **Level 6** — Navigation aids; never more authoritative than source records.

### 5.3 Conflict Rule

If two artifacts conflict, **higher authority wins**.

Example: If a task registry lists "Start Strategy Lab backend" as active, but Plan 1.3 says Strategy Lab is deferred, the registry is wrong and must be corrected to match Plan 1.3.

### 5.4 Promotion Rule

A registry entry cannot promote itself above its source plan. A registry change requires either:

- a documented re-read of the source plan that confirms consistency, or
- a scope-change request (SCR) that amends the source plan first.

---

## 6. Required Directory Structure

### 6.1 Root

```text
apps/coinet-platform/docs/backend-v1/
```

### 6.2 Phase 1 Root

```text
apps/coinet-platform/docs/backend-v1/phase-1/
```

### 6.3 Required Subdirectories

```text
apps/coinet-platform/docs/backend-v1/phase-1/registries/
apps/coinet-platform/docs/backend-v1/phase-1/templates/
apps/coinet-platform/docs/backend-v1/phase-1/records/
apps/coinet-platform/docs/backend-v1/phase-1/records/backend-task-admission-records/
apps/coinet-platform/docs/backend-v1/phase-1/records/exceptions/
apps/coinet-platform/docs/backend-v1/phase-1/records/formal-replacements/
apps/coinet-platform/docs/backend-v1/phase-1/records/shadow-comparisons/
apps/coinet-platform/docs/backend-v1/phase-1/records/scope-changes/
apps/coinet-platform/docs/backend-v1/phase-1/records/decisions/
apps/coinet-platform/docs/backend-v1/phase-1/records/urgent-defects/
```

### 6.4 Why This Structure Matters

The directory structure itself communicates the governance model. Policy, registries, templates, task records, exceptions, and decisions must not be mixed in an undifferentiated folder.

---

## 7. Mandatory Source-of-Truth Documents

### 7.1 Existing Mandatory Documents (Plans 1.1–1.6)

```text
phase-1-charter.md
backend-v1-product-boundary.md
backend-v1-non-blocker-and-non-scope-registry.md
backend-v1-architecture-expansion-freeze-law.md
backend-v1-parallel-service-and-version-sprawl-prohibition.md
backend-v1-task-admissibility-framework.md
```

### 7.2 New Mandatory Plan 1.7 Documents

**Master entrypoint** (concise "read this first" file):

```text
apps/coinet-platform/docs/backend-v1/backend-v1-scope.md
```

**Source-of-truth system authority** (this document):

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-source-of-truth-system.md
```

---

## 8. Required Registries

All registries live under `phase-1/registries/`. They are compact operational references derived from their source plans — never more authoritative.

### 8.1 Mandatory Registries

```text
registries/backend-v1-in-scope.registry.md
registries/backend-v1-deferred.registry.md
registries/backend-v1-blocked.registry.md
registries/backend-v1-active-task.registry.md
registries/backend-v1-task-admissibility.policy.md
registries/backend-v1-exception.registry.md
registries/backend-v1-record-index.registry.md
```

### 8.2 Recommended Registry

```text
registries/backend-v1-decision-log.registry.md
```

### 8.3 Registry Contracts (Summary)

Each registry is detailed in its own file. The contracts are:

| Registry                                  | Derives from           | Authoritative content                              |
| ----------------------------------------- | ---------------------- | -------------------------------------------------- |
| `backend-v1-in-scope.registry.md`         | Plan 1.2               | V1-S01..V1-S06 with status                         |
| `backend-v1-deferred.registry.md`         | Plan 1.3               | NB-001..NB-010 with reassessment triggers          |
| `backend-v1-blocked.registry.md`          | Plans 1.4 + 1.5        | Architecture / sprawl / scope blocks               |
| `backend-v1-active-task.registry.md`      | Plan 1.6 (TAD-A items) | Admitted BTARs in active execution                 |
| `backend-v1-task-admissibility.policy.md` | Plan 1.6               | TAD-A..E, eight-question gate, backlog mapping     |
| `backend-v1-exception.registry.md`        | Plans 1.4 + 1.5 + 1.6  | AFE / VSE / FRP / BSCP / SCR / UDF index           |
| `backend-v1-record-index.registry.md`     | All record files       | Index of every individual record under `records/`  |
| `backend-v1-decision-log.registry.md`     | Major decisions        | High-level decisions and their rationale           |

---

## 9. Required Templates

All templates live under `phase-1/templates/`. Each one corresponds to a record type defined by Plans 1.4–1.6.

### 9.1 Existing Template

```text
templates/backend-task-admission-record-template.md
```

### 9.2 New Mandatory Templates

```text
templates/architecture-freeze-exception-template.md         (AFE — Plan 1.4)
templates/version-sprawl-exception-template.md              (VSE — Plan 1.5 §15)
templates/formal-replacement-procedure-template.md          (FRP — Plan 1.5 §8)
templates/bounded-shadow-comparison-template.md             (BSCP — Plan 1.5 §9)
templates/scope-change-request-template.md                  (SCR — Plan 1.7)
templates/urgent-defect-record-template.md                  (UDF — Plan 1.6 §17)
```

### 9.3 Template Rule

Templates must be:

- simple enough to use,
- strict enough to prevent hand-wavy exceptions,
- aligned with fields already defined in Plans 1.4–1.6.

---

## 10. Record Storage Law

### 10.1 Required Record Folders

```text
records/backend-task-admission-records/
records/exceptions/
records/formal-replacements/
records/shadow-comparisons/
records/scope-changes/
records/decisions/
records/urgent-defects/
```

### 10.2 Naming Conventions

```text
BTAR-NNN-short-slug.md     (Backend Task Admission Record — Plan 1.6 §12)
AFE-NNN-short-slug.md      (Architecture Freeze Exception — Plan 1.4)
VSE-NNN-short-slug.md      (Version-Sprawl Exception — Plan 1.5 §15)
FRP-NNN-short-slug.md      (Formal Replacement Procedure — Plan 1.5 §8)
BSCP-NNN-short-slug.md     (Bounded Shadow Comparison — Plan 1.5 §9)
SCR-NNN-short-slug.md      (Scope Change Request — Plan 1.7)
ADR-NNN-short-slug.md      (Architecture / Authoritative Decision Record)
UDF-NNN-short-slug.md      (Urgent Defect Record — Plan 1.6 §17)
```

NNN is zero-padded, sequential, and never reused.

### 10.3 Indexing Rule

> **No record shall exist outside the index.**

Every record created in any of the above folders must be added to `backend-v1-record-index.registry.md` in the same work session.

---

## 11. Synchronization Law

### 11.1 Required Synchronization Rule

Whenever any of these changes:

- in-scope surface,
- deferred area,
- blocked pattern,
- task admission status,
- exception approval/rejection,
- formal replacement,
- shadow comparison,
- scope change,

the relevant registry must be updated in the **same work session** as the underlying decision.

### 11.2 Synchronization Examples

**Example A — New active task admitted.**
Update: BTAR file → `active-task.registry.md` → `record-index.registry.md`.

**Example B — Strategy Lab promoted after future reassessment.**
Update: `deferred.registry.md` → SCR record → `in-scope.registry.md` (if approved) → `record-index.registry.md` → amendment note in Plan 1.2.

**Example C — Version-sprawl exception rejected.**
Update: VSE record → `exception.registry.md` → `record-index.registry.md`.

**Example D — Urgent defect resolved.**
Update: UDF record → `active-task.registry.md` (if admitted as `TAD-A`) → `record-index.registry.md`.

### 11.3 Drift Prevention

If a registry and its source plan are observed to be out of sync, the registry is corrected to match the source plan. The source plan is never silently corrected to match the registry — that requires an SCR.

---

## 12. Status Taxonomy

### 12.1 Required Statuses

```text
DRAFT
ACTIVE
ACCEPTED
SUPERSEDED
DEFERRED
BLOCKED
EXPIRED
COMPLETED
WITHDRAWN
```

### 12.2 Meaning

| Status     | Meaning                             |
| ---------- | ----------------------------------- |
| DRAFT      | Written but not accepted            |
| ACTIVE     | Currently operative                 |
| ACCEPTED   | Formally accepted (records)         |
| SUPERSEDED | Replaced by a newer authority       |
| DEFERRED   | Not active until trigger            |
| BLOCKED    | Prohibited in current form          |
| EXPIRED    | No longer valid due to date/trigger |
| COMPLETED  | Finished and closed                 |
| WITHDRAWN  | Removed by originator               |

### 12.3 Front Matter Law

Every governance artifact (Plans 1.1–1.7, registries, templates, records) should include a front-matter block such as:

```md
Status:
Owner:
Program:
Plan:
Created:
Last Updated:
Authority Level:
Depends On:
Supersedes:
Next Review:
```

Not every field applies to every artifact; absent fields may be omitted or marked `N/A`.

---

## 13. Conflict Resolution Law

### 13.1 Primary Conflict Rule

**Higher authority wins** (§5.3). The authority hierarchy in §5.1 is the canonical ordering.

### 13.2 Inter-Plan Conflicts

If Plans 1.4 and 1.5 conflict on whether a particular file qualifies as architecture sprawl vs. implementation sprawl, the file is treated as restricted under **both** until an exception (AFE or VSE) clarifies it. Restrictions compound; permissions do not.

### 13.3 Registry-vs-Plan Conflicts

The plan wins. The registry is corrected.

### 13.4 Record-vs-Plan Conflicts

If an existing record (e.g., a BTAR approval) appears to violate a plan, the record is suspended and re-reviewed. The plan is not silently amended.

### 13.5 Plan Amendment

Plans 1.1–1.7 are amended only through:

1. an SCR (Scope Change Request) for scope-level changes,
2. an explicit Phase 1 change-control event for charter-level changes (Plan 1.1 §13),
3. or a post-Phase-3 reassessment for deferred-area promotion.

---

## 14. Verification and Certification Criteria

Plan 1.7 is complete only when all of the following are simultaneously true.

### 14.1 Required Documents Exist

- `backend-v1-scope.md` ✅ (master entrypoint)
- `backend-v1-source-of-truth-system.md` ✅ (this document)

### 14.2 Required Registries Exist

- `backend-v1-in-scope.registry.md`
- `backend-v1-deferred.registry.md`
- `backend-v1-blocked.registry.md`
- `backend-v1-active-task.registry.md`
- `backend-v1-task-admissibility.policy.md`
- `backend-v1-exception.registry.md`
- `backend-v1-record-index.registry.md`
- `backend-v1-decision-log.registry.md` (recommended)

### 14.3 Required Templates Exist

- `backend-task-admission-record-template.md`
- `architecture-freeze-exception-template.md`
- `version-sprawl-exception-template.md`
- `formal-replacement-procedure-template.md`
- `bounded-shadow-comparison-template.md`
- `scope-change-request-template.md`
- `urgent-defect-record-template.md`

### 14.4 Directory Structure Exists

All folders listed in §6.3 exist (each with at least a `README.md` placeholder if otherwise empty).

### 14.5 Practical-Use Answers Must Be Possible

A new backend engineer must be able to answer from the repo alone:

1. What is in scope? → `backend-v1-in-scope.registry.md`
2. What is deferred? → `backend-v1-deferred.registry.md`
3. What is blocked? → `backend-v1-blocked.registry.md`
4. What tasks are active? → `backend-v1-active-task.registry.md`
5. How do I propose a task? → BTAR template + Plan 1.6
6. How do I request an exception? → AFE / VSE / FRP / BSCP / SCR templates
7. Where do accepted records live? → `records/` subfolders, indexed in record-index registry
8. Which document wins if two disagree? → §5.1 + §13
9. Is real API work active yet? → No (NB-008 in deferred registry)
10. Is full CIP.1 active yet? → No (NB-006 in deferred registry)

If any of those cannot be answered from this system, Plan 1.7 is not complete.

---

## 15. Done Definition and Transition to Plan 1.8

### 15.1 Done Definition

Plan 1.7 is complete only when:

> **Coinet backend v1 has a repo-resident source-of-truth system containing a master scope entrypoint, a source-of-truth authority document, required registries for in-scope, deferred, blocked, active, admitted, and exceptional backend work, required templates for all governance records, storage locations for every record type, synchronization rules that prevent drift, status taxonomies for documents and records, and a conflict-resolution hierarchy that makes it possible for any future engineer or execution system to inspect the backend v1 program without relying on chat memory.**

### 15.2 Transition to Plan 1.8

The next required step is:

> **Plan 1.8 — Existing Backend Surface Inventory and Classification**

Plan 1.8 answers:

> Given the source-of-truth system, how do we classify the current backend codebase into V1_CORE, V1_SUPPORTING, DEFERRED, DORMANT_ARCHITECTURE, LEGACY_OR_DUPLICATIVE, and UNKNOWN_REQUIRES_TRIAGE?

### 15.3 Closed Phase 1 Stack

```text
Plan 1.1 = Why                                    [ACTIVE]
Plan 1.2 = What is in                             [ACTIVE]
Plan 1.3 = What is out                            [ACTIVE]
Plan 1.4 = No new architecture                    [ACTIVE]
Plan 1.5 = No new implementation sprawl           [ACTIVE]
Plan 1.6 = Task-by-task admission law             [ACTIVE]
Plan 1.7 = Repo-resident source-of-truth system   [ACTIVE]   ← this document
Plan 1.8 = Existing backend surface inventory     [NEXT]
```

---

## 16. Acceptance Block

```text
Backend v1 Source-of-Truth System — Acceptance

Accepted by: ____________________________
Role:        ____________________________
Date:        ____________________________

I confirm that:
  [ ] I have read this document in full.
  [ ] I accept the source-of-truth hierarchy in §5.1.
  [ ] I accept the conflict-resolution law in §13.
  [ ] I accept the synchronization law in §11.
  [ ] I accept the status taxonomy in §12.
  [ ] I accept that every record must be indexed in
      backend-v1-record-index.registry.md (§10.3).
  [ ] I accept that registries are never more authoritative than
      their source plans (§5.4, §13.3).
  [ ] I accept that plan amendments require SCR / change-control
      events (§13.5).
```

Once accepted, the `Status` field is authoritative. Until accepted, treat this document as DRAFT.

---

*End of Backend v1 Source-of-Truth System — Plan 1.7.*
