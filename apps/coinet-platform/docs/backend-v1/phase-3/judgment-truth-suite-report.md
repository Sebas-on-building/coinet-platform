# Judgment Truth Suite Report

Type: Phase 3 Truth-Suite Report (deterministic, rendered by P3-BTAR-005)
Policy Version: `judgment-truth-suite-execution.v1`
Execution Mode: `HARNESS_CERTIFICATION`
Report Claim Level: `HARNESS_ONLY`
Active Judgment Engine Connected: `false`
semantic_assertions_run: `true` (type-pinned literal)
no_real_provider_calls: `true` (type-pinned literal)

---

## 1. Purpose

This report is the deterministic Phase 3 truth-suite output produced by running the synthetic episode corpus through the judgment truth runner and the semantic assertion engine, then aggregating the results.

## 2. Execution Mode

`HARNESS_CERTIFICATION` — the suite is executed with a deterministic oracle-projection executor. This proves the truth-suite machinery is wired end-to-end against the corpus. It does NOT prove that Coinet's active production judgment engine has been semantically scored.

## 3. Corpus Summary

Total episodes: **18**

## 4. Result Summary

| Outcome | Count |
| --- | ---: |
| PASS | 18 |
| WARNING | 0 |
| FAIL | 0 |
| CRITICAL_FAIL | 0 |

Average score: **100** | Minimum score: **100** | Maximum score: **100**

## 5. Episode-by-Episode Results

| Episode ID | Title | Family Tags | Overall | Score |
| --- | --- | --- | --- | ---: |
| `SYN-001-clean-accumulation` | Clean spot-led early accumulation | family:FAM-001 | PASS | 100 |
| `SYN-002-early-accumulation-weak-sentiment` | Early accumulation with weak sentiment | family:FAM-002 | PASS | 100 |
| `SYN-003-leverage-driven-fake-strength` | Leverage-driven fake strength | family:FAM-003 | PASS | 100 |
| `SYN-004-spot-led-healthy-expansion` | Spot-led healthy expansion | family:FAM-004 | PASS | 100 |
| `SYN-005-late-euphoric-momentum` | Late euphoric momentum | family:FAM-005 | PASS | 100 |
| `SYN-006-unlock-risk-distribution` | Distribution into a near unlock event | family:FAM-006 | PASS | 100 |
| `SYN-007-fundamentals-improve-late-timing` | Fundamentals improving but timing late | family:FAM-007 | PASS | 100 |
| `SYN-008-whale-accumulation-flat-price` | Whale accumulation with flat price | family:FAM-008 | PASS | 100 |
| `SYN-009-price-pump-weak-onchain` | Price pump with weak on-chain quality | family:FAM-009 | PASS | 100 |
| `SYN-010-sentiment-only-pump` | Sentiment-only pump, no spot or fundamentals | family:FAM-010 | PASS | 100 |
| `SYN-011-derivatives-squeeze-risk` | Derivatives squeeze risk | family:FAM-011 | PASS | 100 |
| `SYN-012-liquidity-thin-breakout` | Breakout on thin liquidity | family:FAM-012 | PASS | 100 |
| `SYN-013-risk-off-asset-strength` | Risk-off market regime despite asset-specific strength | family:FAM-013 | PASS | 100 |
| `SYN-014-mixed-signals-low-confidence` | Mixed signals with no dominant thesis | family:FAM-014 | PASS | 100 |
| `SYN-015-degraded-partial-blindness` | Degraded data, mixed signal read | family:FAM-015 | PASS | 100 |
| `SYN-016-security-risk-override` | Security risk overrides constructive surface signals | family:FAM-016 | PASS | 100 |
| `SYN-017-exchange-inflow-distribution` | Rising exchange inflows ahead of distribution | family:FAM-017 | PASS | 100 |
| `SYN-018-narrative-catalyst-weak-fundamentals` | Narrative catalyst with weak fundamentals | family:FAM-018 | PASS | 100 |

## 6. Check-Level Summary

| check_id | PASS | WARNING | FAIL | CRITICAL_FAIL |
| --- | ---: | ---: | ---: | ---: |
| `RUNNER_RESULT_READINESS` | 18 | 0 | 0 | 0 |
| `STATE_ALIGNMENT` | 18 | 0 | 0 | 0 |
| `CAUSE_FAMILY_ALIGNMENT` | 18 | 0 | 0 | 0 |
| `THESIS_DIRECTION_ALIGNMENT` | 18 | 0 | 0 | 0 |
| `REQUIRED_CONTRADICTION_COVERAGE` | 18 | 0 | 0 | 0 |
| `TIMING_PHASE_ALIGNMENT` | 18 | 0 | 0 | 0 |
| `SCENARIO_TYPE_ALIGNMENT` | 18 | 0 | 0 | 0 |
| `CONFIDENCE_BAND_CALIBRATION` | 18 | 0 | 0 | 0 |
| `FORBIDDEN_CLAIM_ABSENCE` | 18 | 0 | 0 | 0 |
| `REQUIRED_REASONING_NOTE_COVERAGE` | 18 | 0 | 0 | 0 |
| `DEGRADED_EVIDENCE_RESPECT` | 18 | 0 | 0 | 0 |

## 7. Confidence Calibration Summary

CONFIDENCE_BAND_CALIBRATION: PASS=18 / WARNING=0 / FAIL=0 / CRITICAL_FAIL=0

## 8. Contradiction Coverage Summary

REQUIRED_CONTRADICTION_COVERAGE: PASS=18 / WARNING=0 / FAIL=0 / CRITICAL_FAIL=0

## 9. Timing / Scenario Summary

TIMING_PHASE_ALIGNMENT: PASS=18 / WARNING=0 / FAIL=0 / CRITICAL_FAIL=0
SCENARIO_TYPE_ALIGNMENT: PASS=18 / WARNING=0 / FAIL=0 / CRITICAL_FAIL=0

## 10. Critical Failures

No CRITICAL_FAIL episodes.

## 11. Warnings

No WARNING episodes.

### 11.1 Suite-Level Warnings

- HARNESS_ONLY claim level: this run certifies truth-suite machinery only; Coinet active judgment engine is NOT connected and has NOT been semantically scored

## 12. Findings Recommended

- P3-F-CANDIDATE: report certifies harness only; active product judgment adapter required before claiming product judgment quality

## 13. No-Real-API Proof

- `no_real_provider_calls: true` is type-pinned on every per-episode runner result.
- `no_real_provider_calls: true` is type-pinned on every per-episode semantic result.
- `no_real_provider_calls: true` is type-pinned on the aggregate suite result.
- `assertNoRealProviderExecutor` (P3-BTAR-002) rejects any executor that does not declare `uses_real_providers=false` AND `uses_ai_model=false` at runtime.
- Execution module imports zero provider services, zero LLM clients, zero chat-service, zero ai-service, zero `services/judgment/*`.

## 14. Honesty Disclaimer

This report certifies the Phase 3 truth-suite execution machinery. It does NOT claim that Coinet's active production judgment engine has passed the corpus unless `active_judgment_engine_connected: true`.

In `HARNESS_CERTIFICATION` mode, actual judgments are produced by a deterministic oracle-projection executor (the harness) to verify the runner + semantic assertion engine + aggregation logic + reporting pipeline. The active product judgment engine is NOT invoked.

## 15. Next Governance Action

All checks PASS under HARNESS_CERTIFICATION. Phase 3 done-definition for execution machinery is satisfied. The remaining decision is whether to (a) admit a separately-scoped BTAR to build a safe active synthetic adapter before P3TG-001, or (b) proceed to **P3TG-001 — Phase 3 Transition Gate** with the explicit honesty residual that active product judgment was certified by harness only.
