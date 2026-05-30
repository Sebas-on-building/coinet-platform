# Phase 2 Out-of-Scope Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — companion to Plan 2.3)
**Source Plan:** `phase-2/phase-2-out-of-scope-boundaries.md` (Plan 2.3)
**Phase:** Phase 2 — Live Judgment / Chat / AI Trust
**Created:** 2026-05-23
**Last Updated:** 2026-05-23

> The repo-resident enforcement view of Plan 2.3 §§4..22. Every Phase 2 BTAR's §25 admission check is verified against the rows below. Crossings without a Plan 1.10 exception record are blocked at the daily enforcement gate (Plan 1.9).

---

## 1. Index

| OOS ID  | Name                                                   | Status         | Allowed Instead                                            | Exception Path           | Reassessment Trigger                                                       |
| ------- | ------------------------------------------------------ | -------------- | ---------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------- |
| OOS-001 | Full CIP.1                                             | DEFERRED       | Bounded concept reuse (Plan 1.4 Class D)                   | SCR → future Plan 3.x    | After Phase 2 + Phase 3 completion                                         |
| OOS-002 | Full L13/L14 production migration                      | DEFERRED       | Bounded safety-pattern reuse from L13.9 / L14 vocabulary   | SCR → future Plan 3.x    | After Phase 2 + Phase 3 + four reconciliation decisions (L9/L11/L12/L13)   |
| OOS-003 | Strategy Lab backend                                   | DEFERRED       | None (unless direct dependency proven in a chat-trust BTAR) | SCR                      | After Phase 3 or after v1 live path is production trustworthy              |
| OOS-004 | Chart Canvas backend                                   | DEFERRED       | Minimal type references only with BTAR approval            | SCR                      | After Phase 3 or after v1 live path is production trustworthy              |
| OOS-005 | Plugin systems                                         | DEFERRED       | None                                                       | SCR                      | Post-v1 or after core trust path is stable                                 |
| OOS-006 | Agent builders                                         | DEFERRED       | Deterministic safety checks around existing aiService.analyze() | SCR                  | Post-Phase 3                                                               |
| OOS-007 | Deep real API integration before purchase              | DEFERRED       | Mocked/synthetic provider states                           | SCR (strict proof)       | After Phase 2 done definition is met                                       |
| OOS-008 | Full calibration proposal ecosystem                    | DEFERRED       | Minimal internal runtime evidence (4 fields, see Plan 2.3 §12.3) | SCR                | After Phase 2 + Phase 3 + live signal corpus exists                        |
| OOS-009 | Advanced alert platform                                | DEFERRED       | AI safety gate may forbid invented alert claims            | SCR                      | Post-Phase 2                                                               |
| OOS-010 | Broad duplicate cleanup                                | DEFERRED       | Minimal in-place touch with required caution language      | FRP or SCR               | Post-Phase 2 (dedicated canonicalization phase)                            |
| OOS-011 | Full chat service rewrite                              | BLOCKED        | Bounded extractions only (BTAR-003..006)                   | FRP                      | None within Phase 2                                                        |
| OOS-012 | New `ai-service-v2.ts`                                 | BLOCKED        | Safety gate + typed wrapper + result validation            | FRP                      | None within Phase 2                                                        |
| OOS-013 | New `judgment-engine-final.ts`                         | BLOCKED        | JudgmentAvailabilityState wrapper + failure classifier     | FRP                      | None within Phase 2                                                        |
| OOS-014 | New parallel chat runtime                              | BLOCKED        | Small helpers in existing service; test files; failure-path tests | FRP               | None within Phase 2                                                        |
| OOS-015 | New L*.X sublayers / constitutional expansion          | BLOCKED        | Bounded borrowing of existing concepts                     | AFE                      | Multi-phase / post-program                                                 |
| OOS-016 | Real provider-dependent test suite                     | BLOCKED        | Mocked failure / timeout / degraded; synthetic SignalSnapshot | UDF (single-shot only) | Post-Phase 2                                                               |
| OOS-017 | Full frontend/backend product integration              | DEFERRED       | Preserve response shape; backward-compatible metadata only | SCR                      | Post-Phase 2                                                               |
| OOS-018 | Performance optimization unrelated to live-path trust  | DEFERRED       | Trust-relevant perf only (timeout class, degradation recognition, fan-out short-circuit) | SCR | Post-Phase 2                                                               |

---

## 2. Status Vocabulary

```text
DEFERRED        — Out of scope for Phase 2; reassessment trigger named.
BLOCKED         — Out of scope for Phase 2 AND an active anti-pattern (sprawl / duplicate-runtime / parallel-engine class).
EXCEPTION_OPEN  — A Plan 1.10 exception is currently active for a bounded crossing of this OOS item.
RESOLVED        — Phase 2 finished without crossing; archived for posterity at P2TG-001.
```

At adoption (2026-05-23) no exceptions are open. All 18 items are in DEFERRED or BLOCKED state.

---

## 3. Per-OOS Detail Reference

For full description / why-out-of-scope / what-is-allowed-instead / reassessment trigger / exception-path detail, see Plan 2.3 sections:

```text
OOS-001 → §5
OOS-002 → §6
OOS-003 → §7
OOS-004 → §8
OOS-005 → §9
OOS-006 → §10
OOS-007 → §11
OOS-008 → §12
OOS-009 → §13
OOS-010 → §14
OOS-011 → §15
OOS-012 → §16
OOS-013 → §17
OOS-014 → §18
OOS-015 → §19
OOS-016 → §20
OOS-017 → §21
OOS-018 → §22
```

This registry shows status and one-line allowance; the plan shows full reasoning. They must not diverge.

---

## 4. BTAR Admission Check (Plan 2.3 §25 Q1..Q5)

Every Phase 2 BTAR admission record must answer:

```text
Q1. Does this BTAR touch any OOS item?
Q2. If yes, which OOS-NNN?
Q3. Is the touch ALLOWED, FORBIDDEN, or EXCEPTION_REQUIRED?
Q4. Does the BTAR include any required caution language (e.g., Plan 2.3 §14.5)?
Q5. Does the BTAR create new architecture, a new service variant, or a new provider dependency?
```

Outcome mapping:

```text
All ALLOWED                                       → admission may proceed
Any FORBIDDEN                                     → TAD-D (BLOCK)
Any EXCEPTION_REQUIRED and exception NOT filed    → TAD-D (BLOCK)
Q4 answer absent when required                    → TAD-D (BLOCK)
Q5 = YES (absent explicit allowance)              → TAD-D (BLOCK)
Uncertain                                         → TAD-E (ESCALATE)
```

---

## 5. Exception Filing Map

```text
OOS-001, 002, 003, 004, 005, 006, 007, 008, 009, 017, 018  → SCR (Plan 1.10)
OOS-010                                                      → FRP (Plan 1.5 §8) OR SCR
OOS-011, 012, 013, 014                                       → FRP (Plan 1.5 §8)
OOS-015                                                      → AFE (Plan 1.4 / Plan 1.10)
OOS-016                                                      → UDF (Plan 1.6 §17), single-shot only
```

Default decision on any crossing: **DENY / DEFER**.

---

## 6. Exception Log (Phase 2)

| Exception ID | OOS Crossed | Status | Filed | Sunset | Source Record |
| ------------ | ----------- | ------ | ----- | ------ | ------------- |
| —            | —           | —      | —     | —      | (none at adoption) |

At adoption (2026-05-23) no Phase 2 exceptions are filed.

---

## 7. Append-Only Discipline

- The 18 OOS rows are non-removable for the duration of Phase 2.
- Status fields are mutable (DEFERRED ↔ EXCEPTION_OPEN ↔ RESOLVED).
- `name` and `Allowed Instead` summaries are non-mutable except by an amendment recorded in the Phase 2 decision log.
- New OOS-NNN items may be appended (OOS-019, OOS-020, …) if a new boundary class is discovered during Phase 2; appended items inherit the registry's lifecycle rules.

---

## 8. Synchronization Rule

This registry must stay in lockstep with Plan 2.3 §§4..22. If a row's `Status` or `Allowed Instead` cell appears to disagree with the plan text, the plan text wins and the registry must be amended in the same work session.

---

*This registry is Level 4. Plan 2.3 is the Level 2 governance document that populates it.*
