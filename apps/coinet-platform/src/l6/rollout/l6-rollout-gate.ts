/**
 * L6.8 — Rollout Gate
 *
 * §6.8.3.10, §6.8.4.4, §6.8.4.6, §6.8.7.1 — Final gate combining phase
 * readiness, certification artifact, observability health, and family
 * enablement state. No rollout advances without a green artifact.
 */

import {
  L6CertificationArtifact,
} from '../certification/l6-certification-report';
import { L6CertificationLevel } from '../certification/l6-certification-level';
import { L6ObservabilityReport } from '../ops/l6-observability-report';
import {
  L6RolloutPhase,
  canAdvancePhase,
} from './l6-rollout-phase';

export interface L6RolloutGateInput {
  readonly target_phase: L6RolloutPhase;
  readonly completed_phases: ReadonlySet<L6RolloutPhase>;
  readonly attested: {
    readonly deliverables_complete: boolean;
    readonly exit_criteria_met: boolean;
    readonly certification_bands_green_for_phase: boolean;
  };
  readonly certification: L6CertificationArtifact | null;
  readonly observability: L6ObservabilityReport | null;
  readonly requires_production_green: boolean;
}

export interface L6RolloutGateDecision {
  readonly target_phase: L6RolloutPhase;
  readonly advance: boolean;
  readonly reasons: readonly string[];
}

export function evaluateRolloutGate(input: L6RolloutGateInput): L6RolloutGateDecision {
  const reasons: string[] = [];

  const phaseCheck = canAdvancePhase(input.target_phase, input.completed_phases, input.attested);
  if (!phaseCheck.ok) reasons.push(`phase:${phaseCheck.reason}`);

  if (!input.certification) {
    reasons.push('certification:missing_artifact');
  } else {
    if (input.certification.blocking_violations.length > 0) {
      reasons.push(`certification:blocking:${input.certification.blocking_violations.length}`);
    }
    if (input.requires_production_green &&
        input.certification.level !== L6CertificationLevel.PRODUCTION_GREEN) {
      reasons.push(`certification:level:${input.certification.level}`);
    }
  }

  if (!input.observability) {
    reasons.push('observability:missing_report');
  } else if (!input.observability.ok) {
    reasons.push('observability:critical_breach');
  }

  return {
    target_phase: input.target_phase,
    advance: reasons.length === 0,
    reasons,
  };
}
