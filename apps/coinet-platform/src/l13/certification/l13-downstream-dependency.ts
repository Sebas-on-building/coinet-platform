/**
 * L13.12 — Downstream (L14) Dependency Builder
 *
 * §13.12.14 — Returns the canonical L14 consumption contract.
 */

import {
  L13DownstreamConsumableSurface,
  L13DownstreamConsumerClass,
  L13DownstreamProhibitedAction,
  type L13DownstreamDependencyContract,
} from '../contracts/l13-downstream-dependency';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.handoff.v1';

const ALLOWED: readonly L13DownstreamConsumableSurface[] = [
  L13DownstreamConsumableSurface.FINAL_AI_OUTPUTS,
  L13DownstreamConsumableSurface.DURABLE_PRODUCT_MODE_PAYLOADS,
  L13DownstreamConsumableSurface.USER_FEEDBACK,
  L13DownstreamConsumableSurface.QUALITY_METRICS,
  L13DownstreamConsumableSurface.AUDIT_EVENTS,
  L13DownstreamConsumableSurface.ROLLOUT_STATUS,
  L13DownstreamConsumableSurface.FAILURE_RECORDS,
];

const PROHIBITED: readonly L13DownstreamProhibitedAction[] = [
  L13DownstreamProhibitedAction.REBUILD_L13_OUTPUT_FROM_RAW,
  L13DownstreamProhibitedAction.BYPASS_SAFETY_DECISION,
  L13DownstreamProhibitedAction.MUTATE_HISTORICAL_ARTIFACT,
  L13DownstreamProhibitedAction.REINTERPRET_BLOCKED_CLAIM,
  L13DownstreamProhibitedAction.TREAT_FEEDBACK_AS_TRUTH,
];

export function buildL13L14HandoffContract(approved = true):
  L13DownstreamDependencyContract {
  const replayHash = fnv1a(
    [
      'l13.l14.handoff',
      L13DownstreamConsumerClass.L14_DELIVERY,
      ALLOWED.join(','),
      PROHIBITED.join(','),
      String(approved),
      POLICY_V,
    ].join('|'),
  );
  return {
    downstream_dependency_contract_id: `l13.handoff.${replayHash}`,
    consumer_class: L13DownstreamConsumerClass.L14_DELIVERY,
    allowed_surfaces: ALLOWED,
    prohibited_actions: PROHIBITED,
    approved,
    policy_version: POLICY_V,
    lineage_refs: ['l13.handoff.lineage'],
    replay_hash: replayHash,
  };
}
