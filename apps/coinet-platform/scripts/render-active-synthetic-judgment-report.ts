/**
 * One-shot script: render the Phase 3 active-synthetic truth-suite report
 * by invoking `runJudgmentTruthSuite` in `ACTIVE_SYNTHETIC_ADAPTER` mode
 * with the active synthetic judgment adapter, then writing the rendered
 * Markdown to `docs/backend-v1/phase-3/active-synthetic-judgment-suite-report.md`.
 *
 * No real APIs. No provider keys. No AI calls. The active engine is
 * `produceJudgment()` (synchronous + pure).
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  renderJudgmentTruthSuiteReportMarkdown,
  runJudgmentTruthSuite,
} from '../src/services/judgment-truth-suite/judgment-truth-suite-execution';
import { SYNTHETIC_EPISODE_CORPUS } from '../src/services/judgment-truth-suite/synthetic-episode-corpus';
import { createActiveSyntheticJudgmentExecutor } from '../src/services/judgment-truth-suite/active-synthetic-judgment-adapter';

async function main(): Promise<void> {
  const executor = createActiveSyntheticJudgmentExecutor();
  const result = await runJudgmentTruthSuite({
    episodes: SYNTHETIC_EPISODE_CORPUS,
    execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
    active_executor: executor,
  });

  const md = renderJudgmentTruthSuiteReportMarkdown(result);

  const out = resolve(
    __dirname,
    '..',
    'docs/backend-v1/phase-3/active-synthetic-judgment-suite-report.md',
  );
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
        critical_episode_ids: result.critical_episode_ids,
        failed_episode_ids: result.failed_episode_ids,
        warning_episode_ids: result.warning_episode_ids,
        passed_episode_ids: result.passed_episode_ids,
        findings_recommended: result.findings_recommended,
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
