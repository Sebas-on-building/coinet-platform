/**
 * Hypothesis Orchestrator — single entry point for the hypothesis engine.
 */

import type { SignalSnapshot } from '../judgment/types';
import type { HypothesisId, HypothesisOutput, HypothesisSupportProfile, CoverageState } from './types';
import { buildCoverageState } from './evidence-mapper';
import { rankAllHypotheses } from './ranker';
import { getConfigVersions, type HypothesisConfigVersions } from './versioning';

export interface ProduceHypothesisInput {
  signals: SignalSnapshot;
  regimePrimary?: string;
  sequenceState?: string;
  regimeConfigVersion?: string;
  coverageOverride?: CoverageState;
}

export interface ProduceHypothesisResult {
  hypothesisOutput: HypothesisOutput;
  coverage: CoverageState;
  configVersions: HypothesisConfigVersions;
  internalProfiles: {
    definitionsUsed: HypothesisId[];
    supportProfiles: Partial<Record<HypothesisId, HypothesisSupportProfile>>;
    auditNotes: string[];
  };
}

export function produceHypothesisOutput(input: ProduceHypothesisInput): ProduceHypothesisResult {
  const coverage = input.coverageOverride ?? buildCoverageState(input.signals);

  const output = rankAllHypotheses({
    signals: input.signals,
    coverage,
    regimePrimary: input.regimePrimary,
    sequenceState: input.sequenceState,
  });

  const supportProfiles: Partial<Record<HypothesisId, HypothesisSupportProfile>> = {};
  supportProfiles[output.primary.id] = output.primary.profile;
  if (output.secondary) {
    supportProfiles[output.secondary.id] = output.secondary.profile;
  }
  for (const alt of output.alternatives.slice(0, 3)) {
    supportProfiles[alt.id] = alt.profile;
  }

  const auditNotes: string[] = [];
  if (output.ambiguityLevel === 'high') {
    auditNotes.push('AUDIT: High ambiguity — top two hypotheses within 8pts. Ranking may be unstable.');
  }
  if (coverage.missingDomains.length >= 3) {
    auditNotes.push(`AUDIT: ${coverage.missingDomains.length} truth domains missing — hypothesis confidence structurally capped.`);
  }
  if (output.primary.triggeredInvalidationRules.length > 0) {
    auditNotes.push(`AUDIT: Primary hypothesis has ${output.primary.triggeredInvalidationRules.length} active invalidation pressure(s).`);
  }
  if (coverage.overallFreshness < 0.4) {
    auditNotes.push('AUDIT: Data freshness below threshold — hypothesis rankings may lag reality.');
  }

  const definitionsUsed = [output.primary.id];
  if (output.secondary) definitionsUsed.push(output.secondary.id);
  for (const alt of output.alternatives) definitionsUsed.push(alt.id);

  return {
    hypothesisOutput: output,
    coverage,
    configVersions: getConfigVersions(input.regimeConfigVersion),
    internalProfiles: {
      definitionsUsed: definitionsUsed as HypothesisId[],
      supportProfiles,
      auditNotes,
    },
  };
}
