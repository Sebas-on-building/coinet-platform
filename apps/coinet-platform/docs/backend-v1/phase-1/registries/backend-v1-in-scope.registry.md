# Backend v1 In-Scope Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Plan 1.2)
**Source Plan:** `phase-1/backend-v1-product-boundary.md` (Plan 1.2)
**Last Updated:** 2026-05-19

> Compact operational view of the positive backend v1 scope (V1-S01..V1-S06). If this registry and Plan 1.2 disagree, **Plan 1.2 wins** and this registry is corrected (Plan 1.7 §5.3, §13.3).

---

## Registry Entries

| ID     | Surface                                   | Status                 | Source                  | Current Execution Relevance       |
| ------ | ----------------------------------------- | ---------------------- | ----------------------- | --------------------------------- |
| V1-S01 | AI Chat                                   | Core Required          | Plan 1.2 §5             | Active product path (`/api/chat`) |
| V1-S02 | Asset Judgment                            | Core Required          | Plan 1.2 §6             | Active product path (`produceJudgment()`) |
| V1-S03 | Market / Terminal Intelligence            | Core Required          | Plan 1.2 §7             | v1 product surface                |
| V1-S04 | Radar / Ranking Intelligence              | Core Required          | Plan 1.2 §8             | v1 product surface                |
| V1-S05 | Auth / Session / Conversation Persistence | Supporting Required    | Plan 1.2 §9             | Product continuity                |
| V1-S06 | Truthful Alerts                           | Conditional Admissible | Plan 1.2 §10            | Conditional only                  |

---

## Status Class Definitions

- **Core Required** — Backend v1 is not complete without this surface.
- **Supporting Required** — Not the product thesis itself, but required for the product to function seriously.
- **Conditional Admissible** — Included in v1 only if supportable truthfully without destabilizing core surfaces.

## Reasoning Spine

**Asset Judgment (V1-S02) + AI Chat (V1-S01)** form the central v1 reasoning spine. Market Intelligence (V1-S03) and Radar (V1-S04) extend that spine. Auth/Persistence (V1-S05) supports continuity. Alerts (V1-S06) remain conditional.

## Promotion / Modification Rule

**No new in-scope surface may be added directly to this registry.** A new in-scope surface requires:

1. A BTAR documenting the proposed addition.
2. An SCR (Scope Change Request) amending Plan 1.2.
3. Approval per Plan 1.1 §13 change-control procedure.
4. Update to Plan 1.2 (or formal addendum) **first**.
5. Then this registry is updated to match.

Demotion of a surface from `Core Required` to `Supporting Required` or `Conditional Admissible`, or removal from v1 entirely, follows the same SCR-first path.

## Synchronization

When any V1-S0x status or definition changes in Plan 1.2, this registry must be updated in the same work session and indexed in `backend-v1-record-index.registry.md`.

---

*This registry is Level 4 (operational quick-reference). Plan 1.2 is authoritative.*
