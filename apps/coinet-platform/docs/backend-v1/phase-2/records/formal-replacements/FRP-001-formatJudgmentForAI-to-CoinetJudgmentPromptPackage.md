# FRP-001 — formatJudgmentForAI → CoinetJudgmentPromptPackage

Type: FRP (Formal Replacement Procedure, Plan 1.5 §8)
Status: COMPLETED (BTAR-004 satisfied §6 success proof on 2026-05-25)
Phase: Phase 2 — Live Judgment / Chat / AI Trust
Created: 2026-05-25
Last Updated: 2026-05-25
Owner: Backend program owner
Companion BTAR: **BTAR-004**

Authority:
- Plan 1.5 §8 (Formal Replacement Procedure)
- Plan 2.0 §3.6 (Prompt-Package Replacement Is Allowed but Requires FRP)
- Plan 2.0 roadmap §8 (BTAR-004 Summary)
- Plan 2.2 §11 / §12 / §13 (Surface Boundary Mapping + V1_CORE caution + L13/L14 borrowing rule)
- Plan 2.3 §26.2 (Exception filing map: FRP for OOS-011/012/013/014 — N/A here; this FRP is the Plan 2.0 §3.6 ASCII-formatter retirement)

---

## 1. Old Path (Being Replaced)

```text
formatJudgmentForAI() / ASCII-style structured judgment prompt block
```

Location: `apps/coinet-platform/src/services/judgment/debug-view.ts`. Called from `apps/coinet-platform/src/api/chat/service.ts` (post-BTAR-003 AVAILABLE branch, lines 1153–1170) as the authoritative AI context bridge for structured judgment.

## 2. New Path (Replacing It)

```text
CoinetJudgmentPromptPackage
  + buildCoinetJudgmentPromptPackage(...)
  + renderCoinetJudgmentPromptPackageForAI(...)  →  deterministic package-derived AI context
```

Location: `apps/coinet-platform/src/api/chat/judgment-prompt-package.ts` (new, created by BTAR-004).

## 3. Replacement Scope

```text
Only the chat prompt/context bridge between structured judgment and aiService.analyze().
```

## 4. NOT Replaced

```text
produceJudgment()
aiService.analyze()
AI provider routing
output safety gate (deferred to BTAR-005)
L13/L14 runtime (no migration; NB-007 remains deferred)
chat service itself (no rewrite)
formatJudgmentForAI() export (remains callable; may be used internally by the package builder if useful)
```

## 5. Fallback / Transitional Behavior

The previous formatter (`formatJudgmentForAI`) **remains exported** from `services/judgment/debug-view` during the replacement. It is permitted to be used as an **internal adapter inside the package builder** if direct typed extraction of a judgment field is not yet possible — but the package object itself is the authoritative source of AI prompt truth.

Forbidden during the transition:
- Renaming `formatJudgmentForAI()` and pretending the bridge is typed.
- Keeping the raw ASCII formatter as the real source of truth.
- Deleting the formatter as part of a broad cleanup (out of scope per Plan 2.3 OOS-010).

## 6. Success Proof (Required Before COMPLETED)

```text
Chat service uses package-derived AI context on AVAILABLE / DEGRADED / UNAVAILABLE branches.
Unit tests prove AVAILABLE / DEGRADED / UNAVAILABLE package shapes.
Unit tests prove the UNAVAILABLE package cannot contain fake governed thesis/confidence/scenario.
Integration test proves chat service passes the package-derived context (containing `STRUCTURED COINET JUDGMENT PACKAGE` + policy version + judgment status + forbidden claims) to aiService.analyze.
BTAR-003 regression tests still pass.
BTAR-002 smoke test still passes.
pnpm check:backend exits 0.
No real provider calls in tests.
```

## 7. Rollback Path

Single PR revert restores:
- `service.ts` to its pre-BTAR-004 (post-BTAR-003) shape using `formatJudgmentForAI` directly as the AVAILABLE-branch bridge.
- Removes the four new files under `src/api/chat/`.
- `formatJudgmentForAI` and `judgment-availability.*` files (BTAR-003) remain in place.

No external state mutated. No schema/CI changes.

## 8. Honesty Pin (Mandatory)

> **The replacement is from ad-hoc judgment text formatting to a typed package-derived context. It does not mean the LLM receives a raw TypeScript object. The LLM receives deterministic text rendered from the typed package.**

This pin appears verbatim in BTAR-004 §1.1.

## 9. Surface Boundary Mapping (Same as BTAR-004 §4)

- `src/api/chat/service.ts` (P2-S01 / P2-TOUCH_WITH_BOUNDS) — bridge call-site replacement.
- `src/api/chat/judgment-prompt-package.types.ts` (new / P2-S09 / P2-OPEN).
- `src/api/chat/judgment-prompt-package.ts` (new / P2-S09 / P2-OPEN).
- `src/api/chat/__tests__/*` (P2-S08 / P2-OPEN) — unit + integration tests.
- `services/judgment/debug-view.ts` — **not touched**; `formatJudgmentForAI` remains exported.
- `services/ai-service.ts` — **not touched** (P2-S04 / preferred boundary).
- Zero files under `src/l5..src/l14/` (Plan-2.1-INV-02 satisfied).

## 10. Plan 2.3 OOS Check

| OOS | Crossed? |
| --- | --- |
| OOS-011 (full chat-service rewrite) | No — bounded to one bridge region |
| OOS-012 / 013 / 014 (parallel service variants) | No |
| OOS-015 (new L*.X) | No |
| OOS-007 (real API integration) | No |
| OOS-017 (frontend integration) | No |
| OOS-010 (broad cleanup) | No |

## 11. Required Caution Language (Plan 2.2 §12.3)

Carried in BTAR-004 `service.ts` diff:

```text
This is a bounded live-path trust modification, not a chat service rewrite.
This is a prompt bridge replacement, not a new judgment engine and not a new AI service.
```

## 12. Sunset / Retirement Trigger

`formatJudgmentForAI()` remains exported indefinitely after FRP-001 completion. Actual removal of the export (if ever desired) would require a separate Plan 1.10 SCR + dependency audit — explicitly out of FRP-001 scope. FRP-001 only retires it from the **authoritative chat-bridge role**, not from the codebase.

## 13. Lifecycle States

```text
APPROVED — IN_PROGRESS    ← current (admitted with BTAR-004)
COMPLETED                  ← when BTAR-004 reaches §17 done definition
ROLLED_BACK                ← if BTAR-004 rollback is invoked
```

## 14. Indexing

Indexed in:

```text
phase-2/registries/phase-2-record-index.registry.md
phase-1/registries/backend-v1-record-index.registry.md   (cross-phase)
```

Decision log entries on admission and completion in both Phase 2 and Phase 1 decision logs.

## 15. Acceptance Block

```text
FRP: 001 — formatJudgmentForAI → CoinetJudgmentPromptPackage
Status: APPROVED — IN_PROGRESS
Created: 2026-05-25
Authority: Plan 1.5 §8; Plan 2.0 §3.6; Plan 2.0 roadmap §8
Companion BTAR: BTAR-004
Honesty pin: LLM still receives text; the text is package-derived
Default exception decision: N/A (FRP-001 is the canonical replacement vehicle; not a Plan 2.3 OOS crossing)
Next operational step: BTAR-004 Step 5 (create type contract)
```
