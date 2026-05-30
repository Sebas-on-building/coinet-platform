# Backend v1 Exception Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — indexes Plan 1.4, 1.5, 1.6, 1.7 exception records)
**Source Plans:** 1.4 (AFE), 1.5 (VSE/FRP/BSCP), 1.6 (UDF), 1.7 (SCR)
**Last Updated:** 2026-05-19

> Tracks all approved, rejected, deferred, and pending exceptions. Every exception record under `records/exceptions/`, `records/formal-replacements/`, `records/shadow-comparisons/`, `records/scope-changes/`, or `records/urgent-defects/` must be indexed here.

---

## Exception Type Glossary

| Type | Name                                | Source Plan      | Default Outcome |
| ---- | ----------------------------------- | ---------------- | --------------- |
| AFE  | Architecture Freeze Exception       | Plan 1.4         | DEFER           |
| VSE  | Version-Sprawl Exception            | Plan 1.5 §15     | REJECT/DEFER    |
| FRP  | Formal Replacement Procedure        | Plan 1.5 §8      | Case by case    |
| BSCP | Bounded Shadow Comparison Procedure | Plan 1.5 §9      | Case by case    |
| SCR  | Scope Change Request                | Plan 1.7         | DEFER           |
| UDF  | Urgent Defect Fix Override          | Plan 1.6 §17     | TAD-A if valid  |

---

## Exception Index

| Exception ID | Type | Status | Related BTAR | Related Plan | Decision Date | Expiry / Reassessment | Record Link |
| ------------ | ---- | ------ | ------------ | ------------ | ------------- | --------------------- | ----------- |
| _none yet_   |      |        |              |              |               |                       |             |

> **Note:** Plan 1.7 does not itself approve any exceptions. This registry is initialized empty and populated by future exception decisions.

---

## Required Fields (per entry)

| Field                 | Meaning                                                       |
| --------------------- | ------------------------------------------------------------- |
| Exception ID          | Stable ID (e.g., `AFE-001`, `VSE-001`, `FRP-001`)             |
| Type                  | AFE / VSE / FRP / BSCP / SCR / UDF                            |
| Status                | `PENDING` / `APPROVED` / `REJECTED` / `DEFERRED` / `EXPIRED`  |
| Related BTAR          | BTAR ID if linked (e.g., `BTAR-003`)                          |
| Related Plan          | Plan 1.4 / 1.5 / 1.6 / 1.7                                    |
| Decision Date         | YYYY-MM-DD                                                    |
| Expiry / Reassessment | When the exception must be re-reviewed or expires             |
| Record Link           | Relative path to full record under `records/*/`               |

## Status Lifecycle

```text
PENDING → APPROVED → (EXPIRED on trigger or never)
        → REJECTED
        → DEFERRED (re-eligible at named trigger)
```

## Indexing Rule

> **No exception record exists outside this registry.**

Every exception record file in `records/*/` must have a matching row here, and a matching row in `backend-v1-record-index.registry.md`.

## Approval Authority

- **AFE** — Backend program owner; default DEFER.
- **VSE** — Backend program owner; default REJECT/DEFER.
- **FRP** — Backend program owner; must include named old path + named new path + retirement criteria.
- **BSCP** — Backend program owner; must include `NOT_USER_FACING` default + expiry + promotion/rejection criteria.
- **SCR** — Plan 1.1 §13 change-control authority.
- **UDF** — Backend program owner; abbreviated BTAR; cannot reopen scope.

## Synchronization

When any exception record is created, modified, or closed:

1. Update the record file itself (front-matter `Status:` field).
2. Update this registry (add row or change status).
3. Update `backend-v1-record-index.registry.md`.

All three updates happen in the same work session.

---

*This registry is Level 4. The source plans for each exception type are authoritative.*
