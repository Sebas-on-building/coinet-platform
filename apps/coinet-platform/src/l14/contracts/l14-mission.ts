/**
 * L14.1 — Canonical Mission and First Principle
 *
 * §14.1.1 / §14.1.2 — Frozen mission statement and first
 * principle that every L14 sublayer must honor.
 */

export const L14_CANONICAL_MISSION =
  'Take governed intelligence outputs from L10–L13, deliver them through the correct product surfaces, observe user and outcome signals, evaluate quality and usefulness, and convert those observations into governed calibration evidence without corrupting lower-layer truth.';

export const L14_FIRST_PRINCIPLE =
  'Coinet compounds through measured learning, not through engagement-driven distortion. Layer 14 may observe delivery, interaction, feedback, and outcome signals. It may convert them into governed calibration evidence and review proposals. It may not use those signals to silently rewrite truth, confidence, scores, scenarios, or AI judgment law.';

export const L14_MISSION_POLICY_VERSION = 'l14.constitution.v1';

export interface L14Mission {
  readonly mission_id: string;
  readonly canonical_mission: typeof L14_CANONICAL_MISSION;
  readonly first_principle: typeof L14_FIRST_PRINCIPLE;
  readonly policy_version: string;
  readonly replay_hash: string;
}
