/**
 * P3-BTAR-005 — Full Truth Suite Execution and Report
 *
 * End-to-end Phase 3 truth-suite executor:
 *   1. Run the synthetic corpus through P3-BTAR-002's judgment truth runner
 *   2. Score every runner result through P3-BTAR-004's semantic assertion
 *      engine
 *   3. Aggregate outcomes (counts + scores + per-check rollup + per-episode
 *      ID groups)
 *   4. Render a deterministic Markdown report
 *
 * Default execution mode is HARNESS_CERTIFICATION. In that mode the suite
 * uses a deterministic oracle-projection executor and the report claim
 * level is HARNESS_ONLY — proving the truth-suite machinery is wired
 * end-to-end, NOT that Coinet's active production judgment engine has
 * been scored. The honesty flag `active_judgment_engine_connected` is
 * emitted directly in the aggregate envelope and the report header.
 *
 * No AI. No real APIs. No provider imports. Pure aggregation + Markdown
 * concatenation.
 *
 * Authority:
 *   - Plan 3.0 §1, §3, §6, §9, §10, §11, §12, §14
 *   - P3-BTAR-005 §8..§14 (execution + report contracts)
 *
 * Owner: Phase 3 (P3-BTAR-005).
 */

import type { SyntheticEpisodeInput } from './synthetic-episode.types';
import type {
  JudgmentTruthRunnerResult,
  SyntheticActualJudgment,
  SyntheticJudgmentExecutor,
} from './judgment-truth-runner.types';
import { runJudgmentTruthCorpus } from './judgment-truth-runner';
import type {
  JudgmentSemanticAssertionResult,
  SemanticAssertionCheckId,
  SemanticAssertionOutcome,
} from './semantic-assertions.types';
import { runSemanticAssertions } from './semantic-assertions';
import type {
  JudgmentTruthSuiteCheckSummary,
  JudgmentTruthSuiteEpisodeResult,
  JudgmentTruthSuiteExecutionMode,
  JudgmentTruthSuiteExecutionPolicyVersion,
  JudgmentTruthSuiteOutcomeCounts,
  JudgmentTruthSuiteReportClaimLevel,
  JudgmentTruthSuiteRunResult,
  RunJudgmentTruthSuiteInput,
} from './judgment-truth-suite-execution.types';

const POLICY_VERSION: JudgmentTruthSuiteExecutionPolicyVersion =
  'judgment-truth-suite-execution.v1';

const ALL_CHECK_IDS: readonly SemanticAssertionCheckId[] = [
  'RUNNER_RESULT_READINESS',
  'STATE_ALIGNMENT',
  'CAUSE_FAMILY_ALIGNMENT',
  'THESIS_DIRECTION_ALIGNMENT',
  'REQUIRED_CONTRADICTION_COVERAGE',
  'TIMING_PHASE_ALIGNMENT',
  'SCENARIO_TYPE_ALIGNMENT',
  'CONFIDENCE_BAND_CALIBRATION',
  'FORBIDDEN_CLAIM_ABSENCE',
  'REQUIRED_REASONING_NOTE_COVERAGE',
  'DEGRADED_EVIDENCE_RESPECT',
] as const;

// -----------------------------------------------------------------------------
// extractFamilyTags — pull `family:*` tags from a corpus episode so the suite
// can index per-family pass/fail later.
// -----------------------------------------------------------------------------

export function extractFamilyTags(episode: SyntheticEpisodeInput): string[] {
  if (!episode || !Array.isArray(episode.tags)) return [];
  return episode.tags.filter((t) => typeof t === 'string' && t.startsWith('family:'));
}

// -----------------------------------------------------------------------------
// createHarnessCertificationExecutor — deterministic oracle-projection
// executor used in HARNESS_CERTIFICATION mode. Builds an actual judgment
// from the expected oracle so the runner + semantic engine + aggregator +
// renderer can be certified end-to-end. This is the harness; it is NOT the
// active product engine.
// -----------------------------------------------------------------------------

export function createHarnessCertificationExecutor(): SyntheticJudgmentExecutor {
  return {
    metadata: {
      executor_id: 'harness-certification-oracle-projection-executor',
      executor_version: 'v1',
      uses_real_providers: false,
      uses_ai_model: false,
      deterministic: true,
    },
    execute: (episode: SyntheticEpisodeInput): SyntheticActualJudgment => ({
      state: episode.expected_oracle.expected_state,
      cause_family: episode.expected_oracle.expected_cause_family,
      thesis_direction: episode.expected_oracle.expected_thesis_direction,
      thesis: `Harness-certified thesis for ${episode.episode_id}: ${episode.expected_oracle.expected_thesis_direction}`,
      contradictions: [...episode.expected_oracle.required_contradictions],
      timing_phase: episode.expected_oracle.expected_timing_phase,
      scenario_type: episode.expected_oracle.expected_scenario_type,
      confidence_band: episode.expected_oracle.expected_confidence_band,
      reasoning_notes: [...episode.expected_oracle.required_reasoning_notes],
    }),
  };
}

// -----------------------------------------------------------------------------
// Aggregation helpers
// -----------------------------------------------------------------------------

export function calculateOutcomeCounts(
  semanticResults: ReadonlyArray<JudgmentSemanticAssertionResult>,
): JudgmentTruthSuiteOutcomeCounts {
  const counts: JudgmentTruthSuiteOutcomeCounts = {
    PASS: 0,
    WARNING: 0,
    FAIL: 0,
    CRITICAL_FAIL: 0,
  };
  for (const r of semanticResults) {
    counts[r.overall_outcome] += 1;
  }
  return counts;
}

export function calculateCheckSummary(
  semanticResults: ReadonlyArray<JudgmentSemanticAssertionResult>,
): JudgmentTruthSuiteCheckSummary[] {
  const init: Record<SemanticAssertionCheckId, JudgmentTruthSuiteCheckSummary> =
    Object.fromEntries(
      ALL_CHECK_IDS.map((id) => [
        id,
        {
          check_id: id,
          pass_count: 0,
          warning_count: 0,
          fail_count: 0,
          critical_fail_count: 0,
        },
      ]),
    ) as Record<SemanticAssertionCheckId, JudgmentTruthSuiteCheckSummary>;

  for (const r of semanticResults) {
    for (const check of r.check_results) {
      const slot = init[check.check_id];
      if (!slot) continue;
      switch (check.outcome) {
        case 'PASS':
          slot.pass_count += 1;
          break;
        case 'WARNING':
          slot.warning_count += 1;
          break;
        case 'FAIL':
          slot.fail_count += 1;
          break;
        case 'CRITICAL_FAIL':
          slot.critical_fail_count += 1;
          break;
        default: {
          // Exhaustive switch — outcome enum already type-narrowed.
          const _exhaustive: never = check.outcome;
          void _exhaustive;
        }
      }
    }
  }

  return ALL_CHECK_IDS.map((id) => init[id]);
}

function groupEpisodeIdsByOutcome(
  episodeResults: ReadonlyArray<JudgmentTruthSuiteEpisodeResult>,
): {
  passed_episode_ids: string[];
  warning_episode_ids: string[];
  failed_episode_ids: string[];
  critical_episode_ids: string[];
} {
  const passed: string[] = [];
  const warning: string[] = [];
  const failed: string[] = [];
  const critical: string[] = [];
  for (const ep of episodeResults) {
    switch (ep.semantic_result.overall_outcome) {
      case 'PASS':
        passed.push(ep.episode_id);
        break;
      case 'WARNING':
        warning.push(ep.episode_id);
        break;
      case 'FAIL':
        failed.push(ep.episode_id);
        break;
      case 'CRITICAL_FAIL':
        critical.push(ep.episode_id);
        break;
      default: {
        const _exhaustive: never = ep.semantic_result.overall_outcome;
        void _exhaustive;
      }
    }
  }
  return {
    passed_episode_ids: passed,
    warning_episode_ids: warning,
    failed_episode_ids: failed,
    critical_episode_ids: critical,
  };
}

function scoreStats(
  semanticResults: ReadonlyArray<JudgmentSemanticAssertionResult>,
): { average_score: number; minimum_score: number; maximum_score: number } {
  if (semanticResults.length === 0) {
    return { average_score: 0, minimum_score: 0, maximum_score: 0 };
  }
  let total = 0;
  let min = semanticResults[0].score;
  let max = semanticResults[0].score;
  for (const r of semanticResults) {
    total += r.score;
    if (r.score < min) min = r.score;
    if (r.score > max) max = r.score;
  }
  return {
    // Round to integer; the score is integer-deltas anyway, but corpus
    // size may produce a fractional average — round-half-up.
    average_score: Math.round(total / semanticResults.length),
    minimum_score: min,
    maximum_score: max,
  };
}

// -----------------------------------------------------------------------------
// runJudgmentTruthSuite — main entry point.
//
// Flow (P3-BTAR-005 §10):
//   1. Validate corpus non-empty
//   2. Resolve executor (harness OR caller-supplied for ACTIVE_SYNTHETIC_ADAPTER)
//   3. runJudgmentTruthCorpus(...) to produce runner results
//   4. runSemanticAssertions(...) for each runner result
//   5. Aggregate outcomes / scores / per-check / per-episode groupings
//   6. Build aggregate envelope with pinned literals + honesty flag
// -----------------------------------------------------------------------------

export async function runJudgmentTruthSuite(
  input: RunJudgmentTruthSuiteInput,
): Promise<JudgmentTruthSuiteRunResult> {
  if (!input || !Array.isArray(input.episodes) || input.episodes.length === 0) {
    throw new Error(
      'runJudgmentTruthSuite: input.episodes is required and must be non-empty (P3-BTAR-005 §10)',
    );
  }

  const mode: JudgmentTruthSuiteExecutionMode = input.execution_mode;
  const warnings: string[] = [];

  let executor: SyntheticJudgmentExecutor;
  let active_judgment_engine_connected: boolean;
  let report_claim_level: JudgmentTruthSuiteReportClaimLevel;

  if (mode === 'HARNESS_CERTIFICATION') {
    if (input.active_executor) {
      warnings.push(
        'execution_mode=HARNESS_CERTIFICATION ignores supplied active_executor; harness uses deterministic oracle-projection executor',
      );
    }
    executor = createHarnessCertificationExecutor();
    active_judgment_engine_connected = false;
    report_claim_level = 'HARNESS_ONLY';
    warnings.push(
      'HARNESS_ONLY claim level: this run certifies truth-suite machinery only; Coinet active judgment engine is NOT connected and has NOT been semantically scored',
    );
  } else if (mode === 'ACTIVE_SYNTHETIC_ADAPTER') {
    if (!input.active_executor) {
      throw new Error(
        'runJudgmentTruthSuite: execution_mode=ACTIVE_SYNTHETIC_ADAPTER requires input.active_executor (P3-BTAR-005 §4 — this BTAR does not ship one)',
      );
    }
    executor = input.active_executor;
    active_judgment_engine_connected = true;
    report_claim_level = 'ACTIVE_SYNTHETIC_JUDGMENT_EVALUATED';
  } else {
    // Exhaustive guard.
    const _exhaustive: never = mode;
    void _exhaustive;
    throw new Error(`runJudgmentTruthSuite: unknown execution_mode=${String(mode)}`);
  }

  const episodes: SyntheticEpisodeInput[] = [...input.episodes];

  const runnerResults: JudgmentTruthRunnerResult[] = await runJudgmentTruthCorpus(
    episodes,
    executor,
  );

  const episodeResults: JudgmentTruthSuiteEpisodeResult[] = runnerResults.map(
    (runner_result, idx) => {
      const episode = episodes[idx];
      const semantic_result = runSemanticAssertions({ runner_result });
      return {
        episode_id: runner_result.episode_id,
        title: runner_result.title,
        family_tags: extractFamilyTags(episode),
        runner_result,
        semantic_result,
      };
    },
  );

  const semanticResults = episodeResults.map((e) => e.semantic_result);

  const outcome_counts = calculateOutcomeCounts(semanticResults);
  const { average_score, minimum_score, maximum_score } = scoreStats(semanticResults);
  const check_summary = calculateCheckSummary(semanticResults);
  const grouped = groupEpisodeIdsByOutcome(episodeResults);

  const findings_recommended: string[] = [];
  if (!active_judgment_engine_connected) {
    findings_recommended.push(
      'P3-F-CANDIDATE: report certifies harness only; active product judgment adapter required before claiming product judgment quality',
    );
  }
  if (outcome_counts.CRITICAL_FAIL > 0) {
    findings_recommended.push(
      `P3-F-CANDIDATE: ${outcome_counts.CRITICAL_FAIL} CRITICAL_FAIL episode(s) — admit P3-BTAR-006 (Serious Judgment Flaw Remediation) to investigate`,
    );
  }
  if (outcome_counts.FAIL > 0) {
    findings_recommended.push(
      `P3-F-CANDIDATE: ${outcome_counts.FAIL} FAIL episode(s) — review whether judgment-logic remediation is required`,
    );
  }

  return {
    policy_version: POLICY_VERSION,
    execution_mode: mode,
    report_claim_level,
    active_judgment_engine_connected,
    corpus_size: episodes.length,
    episode_results: episodeResults,
    outcome_counts,
    average_score,
    minimum_score,
    maximum_score,
    check_summary,
    ...grouped,
    semantic_assertions_run: true,
    no_real_provider_calls: true,
    warnings,
    findings_recommended,
  };
}

// -----------------------------------------------------------------------------
// assertJudgmentTruthSuiteRunResultValid — defensive validator.
// -----------------------------------------------------------------------------

export function assertJudgmentTruthSuiteRunResultValid(
  result: JudgmentTruthSuiteRunResult,
): void {
  if (result.policy_version !== POLICY_VERSION) {
    throw new Error(
      `assertJudgmentTruthSuiteRunResultValid: unexpected policy_version=${result.policy_version}`,
    );
  }
  if (result.semantic_assertions_run !== true) {
    throw new Error(
      'assertJudgmentTruthSuiteRunResultValid: semantic_assertions_run must be literal true',
    );
  }
  if (result.no_real_provider_calls !== true) {
    throw new Error(
      'assertJudgmentTruthSuiteRunResultValid: no_real_provider_calls must be literal true',
    );
  }
  if (result.corpus_size !== result.episode_results.length) {
    throw new Error(
      `assertJudgmentTruthSuiteRunResultValid: corpus_size=${result.corpus_size} does not equal episode_results.length=${result.episode_results.length}`,
    );
  }
  if (
    result.execution_mode === 'HARNESS_CERTIFICATION' &&
    result.active_judgment_engine_connected !== false
  ) {
    throw new Error(
      'assertJudgmentTruthSuiteRunResultValid: HARNESS_CERTIFICATION must report active_judgment_engine_connected=false',
    );
  }
  if (
    result.execution_mode === 'HARNESS_CERTIFICATION' &&
    result.report_claim_level !== 'HARNESS_ONLY'
  ) {
    throw new Error(
      'assertJudgmentTruthSuiteRunResultValid: HARNESS_CERTIFICATION must report report_claim_level=HARNESS_ONLY',
    );
  }
}

// -----------------------------------------------------------------------------
// renderJudgmentTruthSuiteReportMarkdown — deterministic Markdown renderer.
//
// Structure mirrors P3-BTAR-005 §12 (Required sections 0..15).
// -----------------------------------------------------------------------------

function renderOutcomeIcon(o: SemanticAssertionOutcome): string {
  switch (o) {
    case 'PASS':
      return 'PASS';
    case 'WARNING':
      return 'WARN';
    case 'FAIL':
      return 'FAIL';
    case 'CRITICAL_FAIL':
      return 'CRIT';
    default: {
      const _exhaustive: never = o;
      void _exhaustive;
      return 'UNK';
    }
  }
}

export function renderJudgmentTruthSuiteReportMarkdown(
  result: JudgmentTruthSuiteRunResult,
): string {
  const lines: string[] = [];

  // 0. Report Identity
  lines.push('# Judgment Truth Suite Report');
  lines.push('');
  lines.push('Type: Phase 3 Truth-Suite Report (deterministic, rendered by P3-BTAR-005)');
  lines.push(`Policy Version: \`${result.policy_version}\``);
  lines.push(`Execution Mode: \`${result.execution_mode}\``);
  lines.push(`Report Claim Level: \`${result.report_claim_level}\``);
  lines.push(`Active Judgment Engine Connected: \`${String(result.active_judgment_engine_connected)}\``);
  lines.push(`semantic_assertions_run: \`true\` (type-pinned literal)`);
  lines.push(`no_real_provider_calls: \`true\` (type-pinned literal)`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 1. Purpose
  lines.push('## 1. Purpose');
  lines.push('');
  lines.push(
    'This report is the deterministic Phase 3 truth-suite output produced by running the synthetic episode corpus through the judgment truth runner and the semantic assertion engine, then aggregating the results.',
  );
  lines.push('');

  // 2. Execution Mode
  lines.push('## 2. Execution Mode');
  lines.push('');
  if (result.execution_mode === 'HARNESS_CERTIFICATION') {
    lines.push(
      '`HARNESS_CERTIFICATION` — the suite is executed with a deterministic oracle-projection executor. This proves the truth-suite machinery is wired end-to-end against the corpus. It does NOT prove that Coinet\'s active production judgment engine has been semantically scored.',
    );
  } else {
    lines.push(
      '`ACTIVE_SYNTHETIC_ADAPTER` — the suite is executed with a caller-supplied active synthetic adapter. The report claim level is `ACTIVE_SYNTHETIC_JUDGMENT_EVALUATED`.',
    );
  }
  lines.push('');

  // 3. Corpus Summary
  lines.push('## 3. Corpus Summary');
  lines.push('');
  lines.push(`Total episodes: **${result.corpus_size}**`);
  lines.push('');

  // 4. Result Summary
  lines.push('## 4. Result Summary');
  lines.push('');
  lines.push('| Outcome | Count |');
  lines.push('| --- | ---: |');
  lines.push(`| PASS | ${result.outcome_counts.PASS} |`);
  lines.push(`| WARNING | ${result.outcome_counts.WARNING} |`);
  lines.push(`| FAIL | ${result.outcome_counts.FAIL} |`);
  lines.push(`| CRITICAL_FAIL | ${result.outcome_counts.CRITICAL_FAIL} |`);
  lines.push('');
  lines.push(
    `Average score: **${result.average_score}** | Minimum score: **${result.minimum_score}** | Maximum score: **${result.maximum_score}**`,
  );
  lines.push('');

  // 5. Episode-by-Episode Results
  lines.push('## 5. Episode-by-Episode Results');
  lines.push('');
  lines.push('| Episode ID | Title | Family Tags | Overall | Score |');
  lines.push('| --- | --- | --- | --- | ---: |');
  for (const ep of result.episode_results) {
    const tags = ep.family_tags.join(' ') || '—';
    lines.push(
      `| \`${ep.episode_id}\` | ${ep.title} | ${tags} | ${renderOutcomeIcon(ep.semantic_result.overall_outcome)} | ${ep.semantic_result.score} |`,
    );
  }
  lines.push('');

  // 6. Check-Level Summary
  lines.push('## 6. Check-Level Summary');
  lines.push('');
  lines.push('| check_id | PASS | WARNING | FAIL | CRITICAL_FAIL |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const c of result.check_summary) {
    lines.push(
      `| \`${c.check_id}\` | ${c.pass_count} | ${c.warning_count} | ${c.fail_count} | ${c.critical_fail_count} |`,
    );
  }
  lines.push('');

  // 7. Confidence Calibration Summary (derived directly from CONFIDENCE_BAND_CALIBRATION)
  const conf = result.check_summary.find((c) => c.check_id === 'CONFIDENCE_BAND_CALIBRATION');
  lines.push('## 7. Confidence Calibration Summary');
  lines.push('');
  if (conf) {
    lines.push(
      `CONFIDENCE_BAND_CALIBRATION: PASS=${conf.pass_count} / WARNING=${conf.warning_count} / FAIL=${conf.fail_count} / CRITICAL_FAIL=${conf.critical_fail_count}`,
    );
  } else {
    lines.push('CONFIDENCE_BAND_CALIBRATION: not reported.');
  }
  lines.push('');

  // 8. Contradiction Coverage Summary
  const contradiction = result.check_summary.find(
    (c) => c.check_id === 'REQUIRED_CONTRADICTION_COVERAGE',
  );
  lines.push('## 8. Contradiction Coverage Summary');
  lines.push('');
  if (contradiction) {
    lines.push(
      `REQUIRED_CONTRADICTION_COVERAGE: PASS=${contradiction.pass_count} / WARNING=${contradiction.warning_count} / FAIL=${contradiction.fail_count} / CRITICAL_FAIL=${contradiction.critical_fail_count}`,
    );
  } else {
    lines.push('REQUIRED_CONTRADICTION_COVERAGE: not reported.');
  }
  lines.push('');

  // 9. Timing / Scenario Summary
  const timing = result.check_summary.find((c) => c.check_id === 'TIMING_PHASE_ALIGNMENT');
  const scenario = result.check_summary.find((c) => c.check_id === 'SCENARIO_TYPE_ALIGNMENT');
  lines.push('## 9. Timing / Scenario Summary');
  lines.push('');
  if (timing) {
    lines.push(
      `TIMING_PHASE_ALIGNMENT: PASS=${timing.pass_count} / WARNING=${timing.warning_count} / FAIL=${timing.fail_count} / CRITICAL_FAIL=${timing.critical_fail_count}`,
    );
  }
  if (scenario) {
    lines.push(
      `SCENARIO_TYPE_ALIGNMENT: PASS=${scenario.pass_count} / WARNING=${scenario.warning_count} / FAIL=${scenario.fail_count} / CRITICAL_FAIL=${scenario.critical_fail_count}`,
    );
  }
  lines.push('');

  // 10. Critical Failures
  lines.push('## 10. Critical Failures');
  lines.push('');
  if (result.critical_episode_ids.length === 0) {
    lines.push('No CRITICAL_FAIL episodes.');
  } else {
    for (const id of result.critical_episode_ids) {
      const ep = result.episode_results.find((e) => e.episode_id === id);
      lines.push(`- \`${id}\` — ${ep?.title ?? ''}`);
      if (ep) {
        for (const f of ep.semantic_result.critical_failures) {
          lines.push(`    - ${f}`);
        }
      }
    }
  }
  lines.push('');

  // 11. Warnings
  lines.push('## 11. Warnings');
  lines.push('');
  if (result.warning_episode_ids.length === 0) {
    lines.push('No WARNING episodes.');
  } else {
    for (const id of result.warning_episode_ids) {
      const ep = result.episode_results.find((e) => e.episode_id === id);
      lines.push(`- \`${id}\` — ${ep?.title ?? ''}`);
      if (ep) {
        for (const w of ep.semantic_result.warnings) {
          lines.push(`    - ${w}`);
        }
      }
    }
  }
  lines.push('');
  if (result.warnings.length > 0) {
    lines.push('### 11.1 Suite-Level Warnings');
    lines.push('');
    for (const w of result.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push('');
  }

  // 12. Findings Recommended
  lines.push('## 12. Findings Recommended');
  lines.push('');
  if (result.findings_recommended.length === 0) {
    lines.push('No findings recommended.');
  } else {
    for (const f of result.findings_recommended) {
      lines.push(`- ${f}`);
    }
  }
  lines.push('');

  // 13. No-Real-API Proof
  lines.push('## 13. No-Real-API Proof');
  lines.push('');
  lines.push('- `no_real_provider_calls: true` is type-pinned on every per-episode runner result.');
  lines.push('- `no_real_provider_calls: true` is type-pinned on every per-episode semantic result.');
  lines.push('- `no_real_provider_calls: true` is type-pinned on the aggregate suite result.');
  lines.push(
    '- `assertNoRealProviderExecutor` (P3-BTAR-002) rejects any executor that does not declare `uses_real_providers=false` AND `uses_ai_model=false` at runtime.',
  );
  lines.push(
    '- Execution module imports zero provider services, zero LLM clients, zero chat-service, zero ai-service, zero `services/judgment/*`.',
  );
  lines.push('');

  // 14. Honesty Disclaimer
  lines.push('## 14. Honesty Disclaimer');
  lines.push('');
  lines.push(
    'This report certifies the Phase 3 truth-suite execution machinery. It does NOT claim that Coinet\'s active production judgment engine has passed the corpus unless `active_judgment_engine_connected: true`.',
  );
  lines.push('');
  lines.push(
    'In `HARNESS_CERTIFICATION` mode, actual judgments are produced by a deterministic oracle-projection executor (the harness) to verify the runner + semantic assertion engine + aggregation logic + reporting pipeline. The active product judgment engine is NOT invoked.',
  );
  lines.push('');

  // 15. Next Governance Action
  lines.push('## 15. Next Governance Action');
  lines.push('');
  if (result.outcome_counts.CRITICAL_FAIL > 0 || result.outcome_counts.FAIL > 0) {
    lines.push(
      'Truth-suite surfaced FAIL / CRITICAL_FAIL outcome(s). If running in `ACTIVE_SYNTHETIC_ADAPTER` mode, admit **P3-BTAR-006 — Serious Judgment Flaw Remediation** via Plan 1.6. In `HARNESS_CERTIFICATION` mode, investigate harness-projection invariants before admitting P3-BTAR-006.',
    );
  } else if (result.execution_mode === 'HARNESS_CERTIFICATION') {
    lines.push(
      'All checks PASS under HARNESS_CERTIFICATION. Phase 3 done-definition for execution machinery is satisfied. The remaining decision is whether to (a) admit a separately-scoped BTAR to build a safe active synthetic adapter before P3TG-001, or (b) proceed to **P3TG-001 — Phase 3 Transition Gate** with the explicit honesty residual that active product judgment was certified by harness only.',
    );
  } else {
    lines.push(
      'All checks PASS under ACTIVE_SYNTHETIC_ADAPTER. Proceed to **P3TG-001 — Phase 3 Transition Gate**.',
    );
  }
  lines.push('');

  return lines.join('\n');
}
