# Authoritative Decision Records (ADR)

**Purpose:** Storage for major decisions that do not fit BTAR / AFE / VSE / FRP / BSCP / SCR / UDF categories but still need permanent record.
**Source:** Plan 1.7 §10 (record storage law) and Plan 1.7 §13 (conflict resolution).
**Indexes:**
  - `phase-1/registries/backend-v1-record-index.registry.md`
  - `phase-1/registries/backend-v1-decision-log.registry.md`

## File naming

```text
ADR-NNN-short-slug.md
```

NNN is zero-padded, sequential, and never reused.

## When to use ADR (and when not to)

**Use ADR when:**

- The decision is significant enough to warrant permanent rationale capture.
- It does not fit any of the other seven record types (BTAR, AFE, VSE, FRP, BSCP, SCR, UDF).
- A future engineer will need to understand *why* a backend-v1 program decision was made.

**Do NOT use ADR when:**

- The decision is a task admission → use BTAR.
- The decision is an architecture exception → use AFE.
- The decision is a version-sprawl exception → use VSE.
- The decision is a replacement → use FRP.
- The decision is a shadow comparison → use BSCP.
- The decision is a scope change → use SCR.
- The decision is an urgent defect → use UDF.

ADR is a deliberate residual category. Most decisions belong elsewhere.

## Required structure (lightweight)

```text
# ADR-NNN — <Title>

State: ACCEPTED

## Context
<What was the situation?>

## Decision
<What was decided?>

## Rationale
<Why this decision over alternatives?>

## Consequences
<What changes as a result?>

## Affected plans / registries
<Which Plan 1.x docs or registries are affected, if any?>

## Date
<YYYY-MM-DD>

## Decision authority
<Who approved.>
```

## Indexing rule

Every ADR must be added to:

1. `backend-v1-record-index.registry.md`
2. `backend-v1-decision-log.registry.md` (if the decision is program-level)

in the same work session.

## Lifecycle

```text
DRAFT → ACCEPTED → (SUPERSEDED if reversed; never deleted)
```

ADRs are append-only at the index level. A reversal is a new ADR that references the prior one.

---

*This folder is Level 5 (individual records). Plan 1.7 is authoritative.*
