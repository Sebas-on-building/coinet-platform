/**
 * L10.8 — Downstream Consumption Validator
 *
 * §10.8.9 / INV-10.8-F — Enforces the no-rebuild law: later layers
 * (L11/L12/L13) may only consume hypothesis truth through governed
 * L10 read surfaces. Rebuilding explanatory competition live from
 * L6/L7/L8/L9 is illegal for upward engines; the only exceptions are
 * REPLAY_ADAPTER and REPAIR_ADAPTER, which must still route through
 * a governed replay/repair interface (§10.8.9.5).
 */

import {
  L10ConsumerClass,
  L10ReadMode,
  L10ReadRequest,
  L10_ADAPTER_ONLY_CONSUMERS,
  L10_UPWARD_ENGINE_CONSUMERS,
  l10ConsumerMayRebuildFromLowerLayers,
} from '../contracts/l10-read-surface';
import {
  L10PersistenceViolation,
  L10PersistenceViolationCode,
  L10PersistenceViolationTier,
  l10PersistenceViolationTier,
} from '../persistence/l10-persistence-violation-codes';

/**
 * §10.8.9 — Descriptor for a downstream consumption attempt. Captures
 * what the consumer is about to do so the validator can reject
 * rebuild attempts and adapter misuse.
 */
export interface L10DownstreamConsumptionAttempt {
  readonly consumer_class: L10ConsumerClass;
  readonly consumer_instance_id: string;
  /** §10.8.9.4 — true iff consumer attempts to rebuild from L6/L7/L8/L9. */
  readonly rebuilds_from_lower_layers: boolean;
  /** §10.8.9.1 — read requests issued in the current consumption attempt. */
  readonly read_requests: readonly L10ReadRequest[];
  /** §10.8.9.5 — adapter is inside governed replay/repair flow. */
  readonly inside_governed_replay_flow: boolean;
  /** §10.8.9.1 — consumer already consulted restriction surface. */
  readonly consulted_restriction_profile: boolean;
}

export interface L10DownstreamConsumptionResult {
  readonly ok: boolean;
  readonly violations: readonly L10PersistenceViolation[];
}

export function validateL10DownstreamConsumption(
  attempt: L10DownstreamConsumptionAttempt,
): L10DownstreamConsumptionResult {
  const violations: L10PersistenceViolation[] = [];

  const isUpwardEngine = L10_UPWARD_ENGINE_CONSUMERS.includes(
    attempt.consumer_class,
  );
  const isAdapter = L10_ADAPTER_ONLY_CONSUMERS.includes(
    attempt.consumer_class,
  );

  // §10.8.9.4 — upward engines must never rebuild.
  if (isUpwardEngine && attempt.rebuilds_from_lower_layers) {
    violations.push(v(
      L10PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS,
      `Consumer ${attempt.consumer_class}/${attempt.consumer_instance_id} ` +
        `rebuilt hypothesis truth from L6/L7/L8/L9 (INV-10.8-F).`,
    ));
  }

  // §10.8.9.5 — adapters may rebuild, but only inside a governed flow.
  if (
    isAdapter &&
    attempt.rebuilds_from_lower_layers &&
    !attempt.inside_governed_replay_flow
  ) {
    violations.push(v(
      L10PersistenceViolationCode.DOWNSTREAM_ADAPTER_OUTSIDE_GOVERNED_FLOW,
      `Adapter ${attempt.consumer_class}/${attempt.consumer_instance_id} ` +
        `rebuilt outside governed replay/repair flow.`,
    ));
  }

  // §10.8.9.4 — anyone claiming the ability to rebuild who isn't an
  // adapter is illegal.
  if (
    !l10ConsumerMayRebuildFromLowerLayers(attempt.consumer_class) &&
    attempt.rebuilds_from_lower_layers
  ) {
    violations.push(v(
      L10PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS,
      `Consumer ${attempt.consumer_class} is not a rebuild-capable ` +
        `adapter but declared rebuild.`,
    ));
  }

  // §10.8.9.1 — the consumer must have issued at least one read request
  // (otherwise it is bypassing surfaces entirely).
  if (attempt.read_requests.length === 0) {
    violations.push(v(
      L10PersistenceViolationCode.DOWNSTREAM_CONSUMER_BYPASSED_SURFACE,
      `Consumer ${attempt.consumer_class}/${attempt.consumer_instance_id} ` +
        `issued no read requests (bypassed L10 read surfaces).`,
    ));
  }

  // §10.8.9.1 — every read request must match the declared consumer.
  for (const req of attempt.read_requests) {
    if (req.consumer_class !== attempt.consumer_class) {
      violations.push(v(
        L10PersistenceViolationCode.DOWNSTREAM_CONSUMER_BYPASSED_SURFACE,
        `Read request to ${req.read_surface_id} consumer_class=` +
          `${req.consumer_class} does not match attempt ` +
          `consumer_class=${attempt.consumer_class}.`,
      ));
    }
  }

  // §10.8.9.1 — upward engines that touch current hypothesis surfaces
  // without consulting the restriction profile are illegal.
  const touchesCurrent = attempt.read_requests.some((r) =>
    r.read_mode === L10ReadMode.LIVE_CURRENT,
  );
  if (
    isUpwardEngine &&
    touchesCurrent &&
    !attempt.consulted_restriction_profile
  ) {
    violations.push(v(
      L10PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION,
      `Consumer ${attempt.consumer_class} read current hypothesis without ` +
        `consulting restriction profile.`,
    ));
  }

  return { ok: violations.length === 0, violations };
}

function v(
  code: L10PersistenceViolationCode,
  detail: string,
): L10PersistenceViolation {
  return {
    code,
    tier: l10PersistenceViolationTier(code) as L10PersistenceViolationTier,
    detail,
  };
}
