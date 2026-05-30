/**
 * L13.12 — Canonical Final Definition Instance
 *
 * §13.12.2 — Frozen layer-final-definition that the ratification
 * artifact references.
 */

import {
  ALL_L13_CERTIFICATION_BANDS,
  ALL_L13_SUBLAYER_IDS,
  L13FinalCapabilityClass,
  L13FinalForbiddenSemanticClass,
  type L13FinalDefinition,
} from '../contracts/l13-final-definition';
import { L13_COMPLETION_STANDARD } from './l13-completion-standard';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.final.v1';

const MISSION =
  'Coinet Layer 13 is the AI Judgment & Explanation Layer. It consumes ' +
  'frozen L3–L12 surfaces, builds a structured AI input package, ' +
  'generates grounded explanations, separates observation from inference, ' +
  'discloses uncertainty, references contradictions, respects confidence ' +
  'and restrictions, and produces governed user-facing outputs. It does ' +
  'not create truth, compute scores, generate scenarios, or recommend ' +
  'trades.';

const FIRST_PRINCIPLE =
  'Layer 13 is the governed voice of Coinet. It explains; it does not ' +
  'invent. It is finished only when its outputs are grounded, ' +
  'uncertainty-aware, contradiction-aware, replayable, repair-safe, ' +
  'adversarially robust, certified, frozen, and authorized for L14 ' +
  'consumption.';

const CAPABILITIES: readonly L13FinalCapabilityClass[] = [
  L13FinalCapabilityClass.PRODUCE_GROUNDED_EXPLANATIONS,
  L13FinalCapabilityClass.DISCLOSE_UNCERTAINTY,
  L13FinalCapabilityClass.DISCLOSE_CONTRADICTIONS,
  L13FinalCapabilityClass.REFERENCE_TRIGGERS_AND_INVALIDATIONS,
  L13FinalCapabilityClass.PRESERVE_SCENARIO_CONDITIONALITY,
  L13FinalCapabilityClass.ANSWER_USER_QUESTIONS,
  L13FinalCapabilityClass.WRITE_ALERTS,
  L13FinalCapabilityClass.STRUCTURED_REPORTS,
  L13FinalCapabilityClass.ASSET_AND_THESIS_COMPARISONS,
  L13FinalCapabilityClass.SCORE_EXPLANATIONS,
  L13FinalCapabilityClass.REPLAYABLE_OUTPUTS,
  L13FinalCapabilityClass.REPAIR_SAFE_CORRECTIONS,
  L13FinalCapabilityClass.MULTILINGUAL_GOVERNED_OUTPUT,
];

const FORBIDDEN: readonly L13FinalForbiddenSemanticClass[] = [
  L13FinalForbiddenSemanticClass.INVENT_TRUTH,
  L13FinalForbiddenSemanticClass.REBUILD_LOWER_LAYERS,
  L13FinalForbiddenSemanticClass.EMIT_RECOMMENDATIONS,
  L13FinalForbiddenSemanticClass.EMIT_GUARANTEES,
  L13FinalForbiddenSemanticClass.EMIT_MARKET_MANIPULATION,
  L13FinalForbiddenSemanticClass.HIDE_CONTRADICTION,
  L13FinalForbiddenSemanticClass.HIDE_UNCERTAINTY,
  L13FinalForbiddenSemanticClass.OUTRUN_CONFIDENCE,
  L13FinalForbiddenSemanticClass.BYPASS_RESTRICTIONS,
  L13FinalForbiddenSemanticClass.IMPERSONATE_ENGINE,
];

const HASH = fnv1a(
  [
    'l13.final.definition',
    MISSION,
    FIRST_PRINCIPLE,
    ALL_L13_SUBLAYER_IDS.join(','),
    CAPABILITIES.join(','),
    FORBIDDEN.join(','),
    ALL_L13_CERTIFICATION_BANDS.join(','),
    L13_COMPLETION_STANDARD.completion_standard_id,
    POLICY_V,
  ].join('|'),
);

export const L13_FINAL_DEFINITION: L13FinalDefinition = {
  layer_id: 'L13',
  layer_name: 'AI Judgment & Explanation Layer',
  canonical_mission: MISSION,
  canonical_first_principle: FIRST_PRINCIPLE,
  total_sublayers: 12,
  required_sublayer_ids: ALL_L13_SUBLAYER_IDS,
  layer_capabilities: CAPABILITIES,
  layer_forbidden_semantics: FORBIDDEN,
  required_certification_bands: ALL_L13_CERTIFICATION_BANDS,
  completion_standard_ref: L13_COMPLETION_STANDARD.completion_standard_id,
  freeze_policy_ref: 'l13.freeze.policy.v1',
  policy_version: POLICY_V,
  replay_hash: HASH,
};
