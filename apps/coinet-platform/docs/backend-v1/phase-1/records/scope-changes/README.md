# Scope Change Request (SCR) Records

**Purpose:** Storage for every Scope Change Request record.
**Source plan:** Plan 1.7 §13.5 (`backend-v1-source-of-truth-system.md`) and Plan 1.1 §13 change-control procedure.
**Template:** `phase-1/templates/scope-change-request-template.md`.
**Indexes:**
  - `phase-1/registries/backend-v1-exception.registry.md`
  - `phase-1/registries/backend-v1-record-index.registry.md`
  - `phase-1/registries/backend-v1-decision-log.registry.md` (if approved and significant)

## File naming

```text
SCR-NNN-short-slug.md
```

NNN is zero-padded, sequential, and never reused.

## When to use SCR

Use SCR to formally amend any of Plans 1.1–1.7 or to promote an item between the in-scope / deferred / blocked registries. Examples:

- Promote NB-008 (deep API integration) after APIs are purchased.
- Promote NB-006 (CIP.1) after Phase 3 completes.
- Add a new V1-S07 surface if the six existing surfaces cannot absorb a needed capability.
- Demote V1-S06 (alerts) from `CONDITIONAL_ADMISSIBLE` to `DEFERRED`.
- Amend Plan 1.4 freeze wording.

## Default outcome

**DEFER.** SCR approval requires Plan 1.1 §13 change-control authority and concrete repo-visible motivating evidence.

## Required fields

14 fields per the template. Incomplete SCRs are rejected without review.

## Amendment order (Plan 1.7 §5.4 / §11.3)

If approved, amendments proceed in this exact order:

1. **Amend the source plan first** (Plan 1.1–1.7 document).
2. **Then sync the registries** (in-scope, deferred, blocked, etc.).
3. **Then index the SCR** in exception registry and record index.
4. **Then log the major decision** in `backend-v1-decision-log.registry.md`.

All four updates happen in the same work session.

The registry is never silently amended to match the registry — the plan amends first, the registry follows.

## Indexing rule

Every SCR must be added to **both** the exception registry and the master record index in the same work session.

## Lifecycle

```text
DRAFT → SUBMITTED → APPROVED → AMENDMENTS_APPLIED → CLOSED
                             → REJECTED / DEFERRED / WITHDRAWN
```

The `State:` field at the top of each SCR file is authoritative.

---

*This folder is Level 5 (individual records). Plans 1.7 and 1.1 are authoritative.*
