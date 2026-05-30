# Backend Task Admission Records (BTAR)

**Purpose:** Storage for every individual Backend Task Admission Record.
**Source plan:** Plan 1.6 §12 (`backend-v1-task-admissibility-framework.md`).
**Template:** `phase-1/templates/backend-task-admission-record-template.md`.
**Index:** `phase-1/registries/backend-v1-record-index.registry.md`.
**Active task projection:** `phase-1/registries/backend-v1-active-task.registry.md` (for `TAD-A` BTARs only).

## File naming

```text
BTAR-NNN-short-slug.md
```

NNN is zero-padded, sequential, and never reused. A blocked or withdrawn BTAR keeps its ID; a reshaped resubmission gets a new ID and back-references the original in field 4 (`request_origin`).

## Required fields

22 fields, defined in Plan 1.6 §12.2 and reproduced in the template. Incomplete BTARs are rejected without review.

## Indexing rule (Plan 1.7 §10.3)

> No record exists outside the index.

Every new BTAR must be added to `backend-v1-record-index.registry.md` in the same work session. If the BTAR is `TAD-A`, also add to `backend-v1-active-task.registry.md`.

## Lifecycle

`DRAFT` → `SUBMITTED` → `APPROVED` → `IN_PROGRESS` → `COMPLETED`
or → `DEFERRED` / `BLOCKED` / `ESCALATED` / `WITHDRAWN`

The `State:` field at the top of each BTAR file is authoritative.

## When BTAR is required vs. optional

- **Required:** every functional backend change.
- **Optional:** truly trivial non-functional changes — typos, import ordering, formatting-only (Plan 1.6 §14.2).

---

*This folder is Level 5 (individual records). The BTAR template and Plan 1.6 are authoritative.*
