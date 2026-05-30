# Urgent Defect Records (UDF)

**Purpose:** Storage for every Urgent Defect Fix record.
**Source plan:** Plan 1.6 §17 (`backend-v1-task-admissibility-framework.md`).
**Template:** `phase-1/templates/urgent-defect-record-template.md`.
**Indexes:**
  - `phase-1/registries/backend-v1-exception.registry.md`
  - `phase-1/registries/backend-v1-record-index.registry.md`
  - `phase-1/registries/backend-v1-active-task.registry.md` (when admitted as `TAD-A`)

## File naming

```text
UDF-NNN-short-slug.md
```

NNN is zero-padded, sequential, and never reused.

## When to use UDF (Plan 1.6 §17.2)

A defect qualifies as UDF only when it:

1. Breaks the build truth.
2. Prevents core backend boot.
3. Blocks an admitted Phase 1–3 task.
4. Causes user-visible falsehood in the active judgment/chat path.
5. Or invalidates synthetic truth evaluation.

If none of these apply, file a regular BTAR instead.

## UDF constraints (Plan 1.6 §17.4)

A UDF fix must **not**:

- create new architecture sprawl (Plan 1.4 violation),
- create new version sprawl (Plan 1.5 violation),
- reopen deferred scope (Plan 1.3 violation).

If the only correct fix would violate one of those, the UDF is escalated to `TAD-E` for AFE / FRP / BSCP / VSE processing — it does **not** bypass the freeze laws.

## Required fields

12 fields per the template (abbreviated BTAR equivalent: BTAR fields 1–9, 17, 18, 21 minimum).

## Indexing rule

Every UDF must be added to **both** the exception registry and the master record index in the same work session. If admitted as `TAD-A`, also add to the active task registry.

## Lifecycle

```text
DRAFT → ADMITTED (TAD-A) → IN_PROGRESS → COMPLETED
                        → ESCALATED (TAD-E) → AFE/FRP/BSCP/VSE process
```

The `State:` field at the top of each UDF file is authoritative.

## Relationship to BTAR

A UDF is a lightweight, expedited admission path. It is **not** a way to skip the admission filter — it is a recognition that some defects qualify automatically for `TAD-A` because their qualification criteria (§17.2) are themselves the production-readiness justification.

For every other functional task, file a regular BTAR.

---

*This folder is Level 5 (individual records). Plan 1.6 §17 is authoritative.*
