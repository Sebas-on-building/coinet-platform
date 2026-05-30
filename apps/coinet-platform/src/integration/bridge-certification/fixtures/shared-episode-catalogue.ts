/**
 * Shared Episode Catalogue
 *
 * §4.1 / §6 — Four canonical bridge episodes shared by AJP.1 and CIP.0.5.
 */

import { fnv1a } from '../../../l13/context/_fnv1a';
import {
  BridgeEpisodeFamily,
  type BridgeSyntheticEpisodeDefinition,
} from '../contracts/bridge-synthetic-episode';

const POLICY_V = 'bridge.v1';

function def(input: {
  family: BridgeEpisodeFamily;
  narrative: string;
  risk: string;
  contradiction: string;
  delivery: string;
}): BridgeSyntheticEpisodeDefinition {
  const id = `bridge.episode.${fnv1a([
    input.family, input.narrative, input.risk,
    input.contradiction, input.delivery, POLICY_V,
  ].join('|'))}`;
  return {
    episode_id: id,
    episode_family: input.family,
    narrative_summary: input.narrative,
    expected_risk_posture: input.risk,
    expected_contradiction_posture: input.contradiction,
    expected_delivery_posture: input.delivery,
    ajp_input_fixture_ref: `ajp1.fixture.${input.family}`,
    cip05_input_fixture_ref: `cip05.fixture.${input.family}`,
    lineage_refs: ['bridge.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export const BRIDGE_EPISODES: readonly BridgeSyntheticEpisodeDefinition[] = [
  def({
    family: BridgeEpisodeFamily.SOLX_SPOT_LED_CONTINUATION,
    narrative: 'Spot-led constructive continuation: spot participation rises, liquidity deepens, funding cool, light contradiction',
    risk: 'low',
    contradiction: 'manageable',
    delivery: 'eligible (continuation alert or digest)',
  }),
  def({
    family: BridgeEpisodeFamily.LEVA_FRAGILITY_INVALIDATION,
    narrative: 'Leverage-driven fragility: OI rising, funding hot, spot weakening, active invalidation pressure',
    risk: 'elevated',
    contradiction: 'material',
    delivery: 'cautionary alert with capped confidence; digest downgrade if user preference',
  }),
  def({
    family: BridgeEpisodeFamily.UNLK_POST_UNLOCK_DIGESTION,
    narrative: 'Post-unlock digestion: token unlock event recent, mixed absorption, recovery confirmation uncertain',
    risk: 'event-conditioned',
    contradiction: 'present but narrow',
    delivery: 'watchlist-bound digest item if eligible',
  }),
  def({
    family: BridgeEpisodeFamily.MOCKUSD_IDENTITY_CONTESTATION,
    narrative: 'Identity contestation: providers submit conflicting MOCKUSD vs MOCKUSD.e claims; canonical truth contested',
    risk: 'blocked-or-restricted',
    contradiction: 'identity-level',
    delivery: 'blocked or heavily narrowed; no proactive payload',
  }),
];

export function getBridgeEpisodeByFamily(
  family: BridgeEpisodeFamily,
): BridgeSyntheticEpisodeDefinition {
  return BRIDGE_EPISODES.find(e => e.episode_family === family)!;
}
