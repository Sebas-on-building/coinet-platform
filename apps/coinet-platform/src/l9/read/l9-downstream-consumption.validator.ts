/**
 * L9.8 — Downstream Consumption Validator
 *
 * §9.8.9 / INV-9.8-F — Enforces the no-rebuild law: later layers may
 * only consume sequence truth through governed L9 read surfaces.
 * Rebuilding sequence meaning live from L6/L7/L8 is illegal for
 * upward engines; the only exceptions are REPLAY_ADAPTER and
 * REPAIR_ADAPTER, which must still route through a governed
 * replay/repair interface.
 */

import {
  L9ConsumerClass,
  L9ReadMode,
  L9ReadRequest,
  L9_ADAPTER_ONLY_CONSUMERS,
  L9_UPWARD_ENGINE_CONSUMERS,
  l9ConsumerMayRebuildFromLowerLayers,
} from '../contracts/l9-read-surface';
import {
  L9PersistenceViolation,
  L9PersistenceViolationCode,
  L9PersistenceViolationTier,
  l9PersistenceViolationTier,
} from '../persistence/l9-persistence-violation-codes';

/**
 * §9.8.9 — Descriptor for a downstream consumption attempt. Captures
 * what the consumer is about to do so the validator can reject
 * rebuild attempts and adapter misuse.
 */
export interface L9DownstreamConsumptionAttempt {
  readonly consumer_class: L9ConsumerClass;
  readonly consumer_instance_id: string;
  /** §9.8.9.4 — true iff consumer attempts to rebuild from L6/L7/L8. */
  readonly rebuilds_from_lower_layers: boolean;
  /** §9.8.9.1 — read requests issued in the current consumption attempt. */
  readonly read_requests: readonly L9ReadRequest[];
  /** §9.8.9.5 — adapter is inside governed replay/repair flow. */
  readonly inside_governed_replay_flow: boolean;
  /** §9.8.9.1 — consumer already consulted restriction surface. */
  readonly consulted_restriction_profile: boolean;
}

export interface L9DownstreamConsumptionResult {
  readonly ok: boolean;
  readonly violations: readonly L9PersistenceViolation[];
}

export function validateL9DownstreamConsumption(
  attempt: L9DownstreamConsumptionAttempt,
): L9DownstreamConsumptionResult {
  const violations: L9PersistenceViolation[] = [];

  const isUpwardEngine = L9_UPWARD_ENGINE_CONSUMERS.includes(attempt.consumer_class);
  const isAdapter = L9_ADAPTER_ONLY_CONSUMERS.includes(attempt.consumer_class);

  // §9.8.9.4 — upward engines must never rebuild.
  if (isUpwardEngine && attempt.rebuilds_from_lower_layers) {
    violations.push(v(
      L9PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS,
      `Consumer ${attempt.consumer_class}/${attempt.consumer_instance_id} ` +
        `rebuilt sequence truth from L6/L7/L8 (INV-9.8-F).`,
    ));
  }

  // §9.8.9.5 — adapters may rebuild, but only inside a governed flow.
  if (isAdapter &&
      attempt.rebuilds_from_lower_layers &&
      !attempt.inside_governed_replay_flow) {
    violations.push(v(
      L9PersistenceViolationCode.DOWNSTREAM_ADAPTER_OUTSIDE_GOVERNED_FLOW,
      `Adapter ${attempt.consumer_class}/${attempt.consumer_instance_id} ` +
        `rebuilt outside governed replay/repair flow.`,
    ));
  }

  // §9.8.9.4 — anyone claiming the ability to rebuild who isn't an
  // adapter is illegal.
  if (!l9ConsumerMayRebuildFromLowerLayers(attempt.consumer_class) &&
      attempt.rebuilds_from_lower_layers) {
    violations.push(v(
      L9PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS,
      `Consumer ${attempt.consumer_class} is not a rebuild-capable ` +
        `adapter but declared rebuild.`,
    ));
  }

  // §9.8.9.1 — the consumer must have issued at least one read request
  // (otherwise it is bypassing surfaces entirely).
  if (attempt.read_requests.length === 0) {
    violations.push(v(
      L9PersistenceViolationCode.DOWNSTREAM_CONSUMER_BYPASSED_SURFACE,
      `Consumer ${attempt.consumer_class}/${attempt.consumer_instance_id} ` +
        `issued no read requests (bypassed L9 read surfaces).`,
    ));
  }

  // §9.8.9.1 — every read request must match the declared consumer.
  for (const req of attempt.read_requests) {
    if (req.consumer_class !== attempt.consumer_class) {
      violations.push(v(
        L9PersistenceViolationCode.DOWNSTREAM_CONSUMER_BYPASSED_SURFACE,
        `Read request to ${req.read_surface_id} consumer_class=` +
          `${req.consumer_class} does not match attempt ` +
          `consumer_class=${attempt.consumer_class}.`,
      ));
    }
  }

  // §9.8.9.1 — upward engines that touch current-sequence surfaces
  // without consulting the restriction profile are illegal.
  const touchesCurrentSequence = attempt.read_requests.some((r) =>
    r.read_mode === L9ReadMode.LIVE_CURRENT,
  );
  if (isUpwardEngine && touchesCurrentSequence &&
      !attempt.consulted_restriction_profile) {
    violations.push(v(
      L9PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION,
      `Consumer ${attempt.consumer_class} read current sequence without ` +
        `consulting restriction profile.`,
    ));
  }

  return { ok: violations.length === 0, violations };
}

function v(
  code: L9PersistenceViolationCode,
  detail: string,
): L9PersistenceViolation {
  return {
    code,
    tier: l9PersistenceViolationTier(code) as L9PersistenceViolationTier,
    detail,
  };
}
