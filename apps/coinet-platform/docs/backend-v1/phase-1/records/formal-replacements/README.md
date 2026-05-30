# Formal Replacement Procedure (FRP) Records

**Purpose:** Storage for every Formal Replacement Procedure record.
**Source plan:** Plan 1.5 §8 (`backend-v1-parallel-service-and-version-sprawl-prohibition.md`).
**Template:** `phase-1/templates/formal-replacement-procedure-template.md`.
**Indexes:**
  - `phase-1/registries/backend-v1-exception.registry.md`
  - `phase-1/registries/backend-v1-record-index.registry.md`

## File naming

```text
FRP-NNN-short-slug.md
```

NNN is zero-padded, sequential, and never reused.

## When to use FRP

Use FRP when the decision to replace an existing canonical path has **already been made**. For honest uncertainty about whether to replace, use BSCP (`shadow-comparisons/`) instead.

## Required fields

14 fields per Plan 1.5 §8.2. Incomplete FRPs are rejected without review.

## Replacement law (Plan 1.5 §8.3)

A formal replacement is valid only if:

- the new path has an explicit purpose,
- the old path is explicitly named,
- both are not intended to remain indefinitely active,
- the replacement directly improves backend production readiness,
- the replacement has a completion and retirement rule.

## Indexing rule

Every FRP must be added to **both** the exception registry and the master record index in the same work session as the record creation.

## Lifecycle

```text
DRAFT → SUBMITTED → APPROVED → IN_PROGRESS → MIGRATION_COMPLETE → OLD_PATH_RETIRED → COMPLETED
                              → REJECTED / DEFERRED / WITHDRAWN
```

The `State:` field at the top of each FRP file is authoritative.

---

*This folder is Level 5 (individual records). Plan 1.5 §8 is authoritative.*
