/**
 * L12.7 — Freeze Activator (§12.7.9)
 *
 * Pure transition function: given a current freeze policy + a
 * production-green ratification artifact, return the freeze policy
 * with `freeze_class` promoted to `FULL_LAYER_FROZEN`. Refuses to
 * activate freeze under any non-production-green state.
 */

import {
  L12FreezeClass,
  L12FreezePolicy,
} from '../contracts/l12-freeze-policy';
import {
  L12LayerRatificationArtifact,
} from '../contracts/l12-ratification-artifact';
import { L12CertificationLevel } from './l12-certification-level';

export interface L12FreezeActivationInput {
  readonly policy: L12FreezePolicy;
  readonly artifact: L12LayerRatificationArtifact;
}

export interface L12FreezeActivationResult {
  readonly activated: boolean;
  readonly policy: L12FreezePolicy;
  readonly reason: string;
}

/**
 * §12.7.9 — full freeze activation. Promotes the freeze class to
 * `FULL_LAYER_FROZEN` only if the artifact is production-green and
 * has zero critical breaches.
 */
export function activateL12FullLayerFreeze(
  input: L12FreezeActivationInput,
): L12FreezeActivationResult {
  if (!input || !input.policy || !input.artifact) {
    return {
      activated: false,
      policy: input?.policy ?? null as unknown as L12FreezePolicy,
      reason: 'policy or artifact missing',
    };
  }
  const a = input.artifact;
  if (a.critical_breach_count > 0) {
    return {
      activated: false,
      policy: input.policy,
      reason: `cannot freeze: ${a.critical_breach_count} critical breach(es)`,
    };
  }
  if (a.certification_level !== L12CertificationLevel.PRODUCTION_GREEN
      && a.certification_level !== L12CertificationLevel.FROZEN_LIVE) {
    return {
      activated: false,
      policy: input.policy,
      reason: `cannot freeze at level=${a.certification_level} (not PRODUCTION_GREEN)`,
    };
  }
  if (!a.l13_dependency_approved) {
    return {
      activated: false,
      policy: input.policy,
      reason: 'cannot freeze: L13 dependency not approved',
    };
  }
  if (!a.rollout_recommended) {
    return {
      activated: false,
      policy: input.policy,
      reason: 'cannot freeze: rollout not recommended',
    };
  }
  if (!a.combined_layer_fingerprint) {
    return {
      activated: false,
      policy: input.policy,
      reason: 'cannot freeze: combined layer fingerprint missing',
    };
  }
  if (input.policy.freeze_class === L12FreezeClass.FULL_LAYER_FROZEN) {
    return {
      activated: true,
      policy: input.policy,
      reason: 'already FULL_LAYER_FROZEN',
    };
  }
  return {
    activated: true,
    policy: { ...input.policy, freeze_class: L12FreezeClass.FULL_LAYER_FROZEN },
    reason: 'production-green + L13 approved + rollout recommended → FULL_LAYER_FROZEN',
  };
}

/**
 * Stage-specific promotions (lighter than full freeze) used during
 * progressive rollout. Each stage requires the prior stage and a
 * matching certification level.
 */
export function promoteL12FreezeClass(
  current: L12FreezeClass,
  candidate: L12FreezeClass,
  level: L12CertificationLevel,
): { promoted: boolean; next: L12FreezeClass; reason: string } {
  // Helper: does a level satisfy a freeze class?
  const allowed: Record<L12FreezeClass, L12CertificationLevel[]> = {
    [L12FreezeClass.NOT_FROZEN]: [L12CertificationLevel.NOT_CERTIFIED,
      L12CertificationLevel.CONTRACT_ONLY,
      L12CertificationLevel.RUNTIME_GREEN,
      L12CertificationLevel.PERSISTENCE_GREEN,
      L12CertificationLevel.PRODUCTION_GREEN,
      L12CertificationLevel.FROZEN_LIVE],
    [L12FreezeClass.CONTRACT_FROZEN]: [
      L12CertificationLevel.CONTRACT_ONLY,
      L12CertificationLevel.RUNTIME_GREEN,
      L12CertificationLevel.PERSISTENCE_GREEN,
      L12CertificationLevel.PRODUCTION_GREEN,
      L12CertificationLevel.FROZEN_LIVE],
    [L12FreezeClass.RUNTIME_FROZEN]: [
      L12CertificationLevel.RUNTIME_GREEN,
      L12CertificationLevel.PERSISTENCE_GREEN,
      L12CertificationLevel.PRODUCTION_GREEN,
      L12CertificationLevel.FROZEN_LIVE],
    [L12FreezeClass.PERSISTENCE_FROZEN]: [
      L12CertificationLevel.PERSISTENCE_GREEN,
      L12CertificationLevel.PRODUCTION_GREEN,
      L12CertificationLevel.FROZEN_LIVE],
    [L12FreezeClass.FULL_LAYER_FROZEN]: [
      L12CertificationLevel.PRODUCTION_GREEN,
      L12CertificationLevel.FROZEN_LIVE],
  };
  const okClasses = allowed[candidate];
  if (!okClasses.includes(level)) {
    return {
      promoted: false,
      next: current,
      reason: `level ${level} cannot satisfy freeze class ${candidate}`,
    };
  }
  return {
    promoted: true,
    next: candidate,
    reason: `level ${level} promotes freeze class ${current} → ${candidate}`,
  };
}
