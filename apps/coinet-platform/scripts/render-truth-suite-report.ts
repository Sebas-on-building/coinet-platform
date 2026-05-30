/**
 * One-shot script: render the Phase 3 truth-suite report by invoking
 * `runJudgmentTruthSuite` (HARNESS_CERTIFICATION mode) and
 * `renderJudgmentTruthSuiteReportMarkdown`, then write the result to
 * `docs/backend-v1/phase-3/judgment-truth-suite-report.md`.
 *
 * This script is the canonical generator for the rendered report. It uses
 * no real APIs, no provider keys, no AI calls.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  renderJudgmentTruthSuiteReportMarkdown,
  runJudgmentTruthSuite,
} from '../src/services/judgment-truth-suite/judgment-truth-suite-execution';
import { SYNTHETIC_EPISODE_CORPUS } from '../src/services/judgment-truth-suite/synthetic-episode-corpus';

async function main(): Promise<void> {
  const result = await runJudgmentTruthSuite({
    episodes: SYNTHETIC_EPISODE_CORPUS,
    execution_mode: 'HARNESS_CERTIFICATION',
  });

  const md = renderJudgmentTruthSuiteReportMarkdown(result);

  const out = resolve(__dirname, '..', 'docs/backend-v1/phase-3/judgment-truth-suite-report.md');
  writeFileSync(out, md, 'utf8');

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        out,
        corpus_size: result.corpus_size,
        outcome_counts: result.outcome_counts,
        average_score: result.average_score,
        minimum_score: result.minimum_score,
        maximum_score: result.maximum_score,
        report_claim_level: result.report_claim_level,
        active_judgment_engine_connected: result.active_judgment_engine_connected,
        semantic_assertions_run: result.semantic_assertions_run,
        no_real_provider_calls: result.no_real_provider_calls,
        bytes: md.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
