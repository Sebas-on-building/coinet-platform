/**
 * L5.7 Assurance — Replay Execution Policy
 *
 * §5.7.5.6 — Determines whether replay is read-only or derivation-emitting.
 * §5.7.4.5 — Replay law for derived writes.
 * §5.7.4.6 — Replay illegality conditions.
 */

import { L5ReplayFidelity } from './replay-fidelity';
import type { ReplayBundle } from './replay-bundle-builder';

export type ReplayExecutionMode = 'READ_ONLY_STRUCTURAL' | 'READ_ONLY_FORENSIC' | 'DERIVATION_EMITTING';

export interface ReplayExecutionDecision {
  readonly mode: ReplayExecutionMode;
  readonly mayMutateAuthority: boolean;
  readonly requiresRematerializationLaw: boolean;
  readonly reasons: readonly string[];
}

export function determineReplayExecutionMode(
  fidelity: L5ReplayFidelity,
  derivationRequested: boolean,
): ReplayExecutionDecision {
  if (!derivationRequested) {
    return {
      mode: fidelity === L5ReplayFidelity.FORENSIC ? 'READ_ONLY_FORENSIC' : 'READ_ONLY_STRUCTURAL',
      mayMutateAuthority: false,
      requiresRematerializationLaw: false,
      reasons: ['Read-only replay — no derivation requested'],
    };
  }

  return {
    mode: 'DERIVATION_EMITTING',
    mayMutateAuthority: false,
    requiresRematerializationLaw: true,
    reasons: ['Derivation-emitting replay — must preserve original meaning, requires rematerialization law for authority changes'],
  };
}

export interface ReplayIllegalityCheck {
  readonly legal: boolean;
  readonly illegality_reasons: readonly string[];
}

export function checkReplayLegality(bundle: ReplayBundle): ReplayIllegalityCheck {
  const reasons: string[] = [];

  if (bundle.trace_ids.length === 0) reasons.push('Required trace lineage absent');
  if (bundle.manifest_ids.length === 0) reasons.push('Required manifest lineage absent');
  if (bundle.envelope_ids.length === 0) reasons.push('Required envelope lineage absent');

  if (bundle.fidelity === L5ReplayFidelity.FORENSIC && bundle.archive_ids.length === 0) {
    reasons.push('Forensic replay requires raw archive evidence');
  }

  if (bundle.coverage_summary.coverage_ratio < 0.4) {
    reasons.push('Insufficient replay coverage for any fidelity level');
  }

  return { legal: reasons.length === 0, illegality_reasons: reasons };
}
