# Bounded Shadow Comparison Procedure (BSCP) Records

**Purpose:** Storage for every Bounded Shadow Comparison record.
**Source plan:** Plan 1.5 §9 (`backend-v1-parallel-service-and-version-sprawl-prohibition.md`).
**Template:** `phase-1/templates/bounded-shadow-comparison-template.md`.
**Indexes:**
  - `phase-1/registries/backend-v1-exception.registry.md`
  - `phase-1/registries/backend-v1-record-index.registry.md`

## File naming

```text
BSCP-NNN-short-slug.md
```

NNN is zero-padded, sequential, and never reused.

## When to use BSCP

Use BSCP when a temporary alternative implementation is needed to **reach a replacement decision**. The default outcome of a shadow that fails its criteria is **rejection and removal** — shadows that linger past expiry are violations.

## Hard pin (Plan 1.5 §9.2 / §9.3)

```text
user_facing_emission_status: NOT_USER_FACING
```

This is a compile-time-style hard pin. Any other value rejects the BSCP automatically. The shadow is never user-facing while the comparison is running.

## Required fields

14 fields per Plan 1.5 §9.2. Incomplete BSCPs are rejected without review.

## Shadow law (Plan 1.5 §9.3)

A shadow path is valid only if:

- it is not user-facing by default (`NOT_USER_FACING`),
- it does not silently become canonical (promotion is explicit),
- it has an expiry condition,
- it has promotion/rejection criteria,
- it exists to reach a decision, not to preserve ambiguity.

## Indexing rule

Every BSCP must be added to **both** the exception registry and the master record index in the same work session as the record creation.

## Lifecycle

```text
DRAFT → SUBMITTED → APPROVED → RUNNING → PROMOTED  → CANONICAL (becomes new canonical via follow-up FRP)
                                       → REJECTED  → REMOVED
                                       → EXPIRED   → REMOVED (default outcome if no explicit decision)
```

The `State:` field at the top of each BSCP file is authoritative.

## Distinction from FRP

| Question                       | FRP                                  | BSCP                                       |
| ------------------------------ | ------------------------------------ | ------------------------------------------ |
| Decision already made?         | Yes — to replace                     | No — comparison needed first               |
| User-facing during procedure?  | Old until cutover                    | Old only; shadow `NOT_USER_FACING`         |
| Default outcome if no decision | New path takes over per plan         | Shadow is rejected and removed             |

---

*This folder is Level 5 (individual records). Plan 1.5 §9 is authoritative.*
