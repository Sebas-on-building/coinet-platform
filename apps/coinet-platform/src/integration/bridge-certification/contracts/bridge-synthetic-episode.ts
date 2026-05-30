/**
 * Bridge Synthetic Episode Definition
 *
 * §6 — Neutral shared episode contract used by both AJP.1 and CIP.0.5
 * so future reconciliation can compare apples-to-apples.
 */

export enum BridgeEpisodeFamily {
  SOLX_SPOT_LED_CONTINUATION = 'SOLX_SPOT_LED_CONTINUATION',
  LEVA_FRAGILITY_INVALIDATION = 'LEVA_FRAGILITY_INVALIDATION',
  UNLK_POST_UNLOCK_DIGESTION = 'UNLK_POST_UNLOCK_DIGESTION',
  MOCKUSD_IDENTITY_CONTESTATION = 'MOCKUSD_IDENTITY_CONTESTATION',
}
export const ALL_BRIDGE_EPISODE_FAMILIES: readonly BridgeEpisodeFamily[] =
  Object.values(BridgeEpisodeFamily);

export interface BridgeSyntheticEpisodeDefinition {
  readonly episode_id: string;
  readonly episode_family: BridgeEpisodeFamily;
  readonly narrative_summary: string;
  readonly expected_risk_posture: string;
  readonly expected_contradiction_posture: string;
  readonly expected_delivery_posture: string;
  readonly ajp_input_fixture_ref: string;
  readonly cip05_input_fixture_ref: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
