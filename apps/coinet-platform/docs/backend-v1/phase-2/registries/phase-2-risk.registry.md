# Phase 2 Risk Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Plan 2.0 risk model)
**Source Plan:** `phase-2/phase-2-general-plan-live-judgment-chat-ai-trust.md` (Plan 2.0)
**Phase:** Phase 2 — Live-Path Trust Hardening
**Last Updated:** 2026-05-23

> Tracks risks unique to Phase 2's V1_CORE modification scope. Phase 1 was scope-safe by design (no V1_CORE touches). Phase 2 explicitly modifies V1_CORE — that is the mission — so risk management becomes more important.

---

## 1. Why Phase 2 Risk Differs From Phase 1

Phase 1 BTARs (BTAR-001, BTAR-CI-001, BTAR-TC-001, BTAR-002) completed with **zero V1_CORE source modifications**. Risk was structural: governance might be wrong. The risk model was about scope discipline, not behavior change.

Phase 2 BTARs (BTAR-003..008) will modify V1_CORE behavior. Risk shifts: each BTAR can break the live `/api/chat → produceJudgment → ai-service` path that real users depend on. The risk model must now cover behavior regression, performance regression, and user-facing failure modes.

---

## 2. Risk Index

| Risk ID | Description | Severity | Likelihood | Mitigation | Mitigating BTAR |
| ------- | ----------- | -------- | ---------- | ---------- | --------------- |
| R-001 | Phase 2 BTAR breaks the live chat path (regression) — user-visible failure introduced by V1_CORE modification | CRITICAL | MEDIUM | BTAR-002 smoke test must continue to pass after every Phase 2 BTAR; behavior-preservation discipline (Plan 2.0 §8.4); BTAR-007 failure-path tests |
| R-002 | Silent-fallback regression — a Phase 2 BTAR (or later regression) reintroduces silent failure after BTAR-003 eliminates it | CRITICAL | MEDIUM | Plan 1.10 §14.2 DI-02 is the anti-rollback law; BTAR-007 Test Class E (silent fallback regression test) is the runtime detection |
| R-003 | Output safety gate weakening — after BTAR-005 lands, a future BTAR or refactor weakens or removes the gate | CRITICAL | LOW | Plan 1.10 §14.2 DI-01 is the non-exemptible commitment; gate cannot be weakened or removed by any subsequent BTAR — only enhanced |
| R-004 | AI prompt package contract drift — `CoinetJudgmentPromptPackage` evolves silently without preserving `judgment_status`, `forbidden_claims`, or `required_disclosures` discipline | HIGH | MEDIUM | BTAR-007 Test Class D (prompt package integrity) detects drift; package shape is a Plan 1.4 architecture-stable contract |
| R-005 | Old ASCII formatter (`formatJudgmentForAI()`) not retired after BTAR-004 FRP — system carries two prompt paths indefinitely | HIGH | MEDIUM | BTAR-004 FRP must name the retirement trigger explicitly (Plan 1.5 §8.3 replacement law); FRP record must be tracked in `backend-v1-exception.registry.md` |
| R-006 | Chat service extraction (BTAR-006) accidentally changes product behavior under the guise of bounded refactor | HIGH | MEDIUM | Plan 2.0 §8.4 behavior-preservation discipline; before/after smoke tests required in BTAR-006 completion proof |
| R-007 | Phase 2 scope expansion — a BTAR balloons into a chat-service rewrite or activates deferred areas | HIGH | LOW | Plan 1.9 daily enforcement; Plan 1.10 §13.3 Anti-Loophole Pattern B (Trojan-Horse Cleanup); per-BTAR scope cap enforced by reviewer |
| R-008 | DI-04 regression at script or CI level — someone restores `\|\| true` or `\|\| echo "...continuing..."` masking | CRITICAL | LOW | Plan 1.10 §14.2 DI-04 non-exemptible commitment; CI workflow review on every PR |
| R-009 | Real provider integration sneaks into Phase 2 (NB-008 violation) — a BTAR adds real API call that wasn't part of admission | HIGH | LOW | Plan 1.3 NB-008 deferred until APIs purchased; Plan 1.9 §11.2 deferred-scope protection; BTAR-002's 27-mock pattern is the precedent for keeping providers mocked |
| R-010 | Phase 2 BTAR introduces a new `-v2` / `-final` / `-complete` file (sprawl regression) | HIGH | LOW | Plan 1.5 §11.1 prohibited naming patterns; PR reviewer catches via Plan 1.9 §8.2 PR rejection rules |
| R-011 | External-API fan-out (Finding F-4) gets fixed via aggressive caching that introduces stale-data bug | MEDIUM | MEDIUM | BTAR-008 (if admitted) must define cache TTLs and staleness disclosure; staleness is itself a degradation reason for §5 DEGRADED state |
| R-012 | A Phase 2 BTAR triggers a new wave of cascading TypeScript errors (similar to BTAR-001 surfacing 24 errors) | MEDIUM | MEDIUM | `pnpm check:backend` must continue to exit 0 after every Phase 2 BTAR; new errors are tracked through Plan 1.6 follow-up BTAR process |
| R-013 | Phase 2 takes too long and Phase 3 (synthetic truth suite) keeps slipping | MEDIUM | MEDIUM | Plan 2.0 §11.7 allows BTAR-008 deferral; only BTAR-003..007 are required for P2TG-001 → P3-READY |
| R-014 | Internal trust evidence (§10) becomes a foundation for premature L14 calibration activation | MEDIUM | LOW | Plan 1.3 NB-007 deferred; trust evidence is internal-first per §10.3 — no L14 compounding loops in Phase 2 |
| R-015 | Phase 2 BTARs accumulate small exceptions that collectively dissolve the freeze | HIGH | LOW | Plan 1.10 §13.2 Anti-Loophole Pattern A (Salami-Slicing) detection; Phase 2 exception budget (Plan 1.10 §12.2: 3 AFE+VSE+SCR + 6 FRP + 3 BSCP) caps cumulative pressure |

---

## 3. Severity Definitions

- **CRITICAL** — user-facing failure OR Plan 1.10 §14.2 DI-01..DI-12 violation OR foundational governance breakage.
- **HIGH** — significant regression risk, scope violation, or quality regression that requires immediate response.
- **MEDIUM** — quality concern, performance concern, or future technical debt.
- **LOW** — minor risk; tracked for visibility but not immediately mitigating.

## 4. Likelihood Definitions

- **HIGH** — risk is actively probable during Phase 2 unless explicitly prevented.
- **MEDIUM** — risk is plausible without active prevention; mitigations reduce to LOW.
- **LOW** — risk is unlikely under normal Phase 2 execution; tracked for awareness.

---

## 5. Risk Lifecycle

```text
IDENTIFIED → MITIGATED → MONITORED → RETIRED (if mitigation proves durable)
                   ↓
              REALIZED (if risk actually fires; file as incident / UDF)
```

Risks remain in this registry across Phase 2. They are retired only after P2TG-001 if the corresponding mitigation has held across all Phase 2 BTARs without incident.

---

## 6. Required Per-BTAR Risk Acknowledgment

Every Phase 2 BTAR (BTAR-003..008) must include in its BTAR record a "Risk Considerations" section that explicitly cites which R-NNN risks apply and how this BTAR mitigates them. This is required for admission per Plan 1.9 §6 task start protocol.

Example (for BTAR-003):

```text
Risk Considerations (per Phase 2 Risk Registry):
  R-001 (regression):       Mitigated by re-running BTAR-002 smoke test + new failure-path tests
  R-002 (silent-fallback regression): Primary deliverable — eliminates the existing silent fallback
  R-012 (cascading typecheck errors): pnpm check:backend re-run after every fix
  R-015 (salami-slicing):    Single bounded BTAR; no exception used
```

---

## 7. Realized Risk Procedure

If a risk actually fires during Phase 2 (e.g., R-001 — a Phase 2 BTAR breaks the chat path):

1. **Stop** the in-flight BTAR.
2. File a **UDF** (Plan 1.6 §17) for the immediate fix if it qualifies under §17.2.
3. Record the realized risk in `phase-1/registries/backend-v1-decision-log.registry.md`.
4. Update this registry: the affected risk row gets a "REALIZED" status and links to the UDF / incident BTAR.
5. Do not weaken the underlying mitigation (per Plan 1.10 §15.2 prohibited rollback).

---

## 8. Synchronization

When a risk's status changes:

- Update this registry (status column + add audit row for realized risks).
- Update the relevant BTAR record if the risk acknowledgment changes.
- Update `backend-v1-decision-log.registry.md` for realized risks or major mitigations.
- Append a new R-NNN row if a new risk is identified during Phase 2.

---

## 9. Append-Only at Row Level

This registry is append-only at the row level. Past risk identifications are never deleted. A retired risk row is annotated `RETIRED (at P2TG-001)` but remains visible for audit.

---

*This registry is Level 4. Plan 2.0 is authoritative for Phase 2 mission and the underlying risk model. Plan 1.10 governs mitigation procedures and rollback prohibitions.*
