/**
 * L7.8 — Rollout Gate
 *
 * §7.8.5.2 INV-7.8-A, §7.8.3.3, §7.8.9.4 — The final gate that combines
 * phase readiness, certification artifact, observability health, and
 * family enablement state. No rollout advances without a green artifact.
 */

import {
  L7CertificationArtifact,
} from '../certification/l7-certification-report';
import {
  L7CertificationLevel,
  levelIsAtLeast,
} from '../certification/l7-certification-level';
import { L7ObservabilityReport } from '../ops/l7-observability-report';
import {
  L7RolloutPhase,
  canAdvanceL7Phase,
  L7PhaseAttestation,
} from './l7-rollout-phase';

export interface L7RolloutGateInput {
  readonly target_phase: L7RolloutPhase;
  readonly completed_phases: ReadonlySet<L7RolloutPhase>;
  readonly attested: L7PhaseAttestation;
  readonly certification: L7CertificationArtifact | null;
  readonly observability: L7ObservabilityReport | null;
  readonly required_level: L7CertificationLevel;
}

export interface L7RolloutGateDecision {
  readonly target_phase: L7RolloutPhase;
  readonly advance: boolean;
  readonly reasons: readonly string[];
}

export function evaluateL7RolloutGate(
  input: L7RolloutGateInput,
): L7RolloutGateDecision {
  const reasons: string[] = [];

  const phaseCheck = canAdvanceL7Phase(
    input.target_phase,
    input.completed_phases,
    input.attested,
  );
  if (!phaseCheck.ok) reasons.push(`phase:${phaseCheck.reason}`);

  if (!input.certification) {
    reasons.push('certification:missing_artifact');
  } else {
    if (input.certification.blocking_violations.length > 0) {
      reasons.push(
        `certification:blocking:${input.certification.blocking_violations.length}`,
      );
    }
    if (!levelIsAtLeast(input.certification.level, input.required_level)) {
      reasons.push(
        `certification:level:${input.certification.level}<${input.required_level}`,
      );
    }
    if (input.certification.critical_breach_count > 0) {
      reasons.push(
        `certification:critical_breaches:${input.certification.critical_breach_count}`,
      );
    }
  }

  if (!input.observability) {
    reasons.push('observability:missing_report');
  } else if (!input.observability.ok) {
    reasons.push(
      `observability:critical_breach:${input.observability.critical_breach_count}`,
    );
  }

  return {
    target_phase: input.target_phase,
    advance: reasons.length === 0,
    reasons,
  };
}
