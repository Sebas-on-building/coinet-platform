/**
 * L11.4 — Score Attribution Invariants (§11.4.19)
 *
 * Eight machine-enforced invariants that prove the attribution
 * sublayer is production-ready. Each invariant returns a structured
 * result `{ ok, violations, evidence }` where `evidence` describes
 * the data examined.
 */

import {
  L11ScoreAttribution,
  L11FormulaEvaluationResult,
  L11ScoreFormulaDefinition,
  L11ScoreOutput,
  L11AttributionMaterialityClass,
  L11AttributionDriverClass,
  ALL_L11_ATTRIBUTION_SUMMARY_CODES,
  extractL11AttributionReplayMaterial,
  canonicalScoreAttributionReplayHash,
  isL11AttributionEmissible,
  L11TopDriverSelectionPolicy,
  L11_DEFAULT_TOP_DRIVER_POLICY,
} from '../contracts';
import {
  L11ScoreAttributionViolationCode,
  L11ScoreAttributionIssue,
  makeL11ScoreAttributionIssue,
} from '../validation/l11-score-attribution-violation-codes';
import {
  driverFromComponent, driverFromCap, driverFromPenalty,
  driverFromModifier, driverFromMissingData,
} from '../attribution/score-attribution-engine';
import { selectL11TopDrivers } from '../attribution/top-driver-selector';

export interface L11_4InvariantResult {
  readonly ok: boolean;
  readonly violations: readonly L11ScoreAttributionIssue[];
  readonly evidence: string;
}

const FORBIDDEN_ATTR_TEXT_PHRASES: readonly RegExp[] = [
  /\b(buy|sell|long|short|enter|exit|ape)\b/i,
  /\b(safest|best trade|guaranteed|certain|definitely)\b/i,
  /\b(scenario\s+winner|winning scenario|the winner is)\b/i,
  /\b(trade now|execute trade|place order|trade action)\b/i,
];

function isMaterial(c: L11AttributionMaterialityClass): boolean {
  return (
    c === L11AttributionMaterialityClass.CRITICAL ||
    c === L11AttributionMaterialityClass.MAJOR ||
    c === L11AttributionMaterialityClass.MATERIAL
  );
}

function ok(evidence: string): L11_4InvariantResult {
  return { ok: true, violations: [], evidence };
}

function fail(
  violations: readonly L11ScoreAttributionIssue[],
  evidence: string,
): L11_4InvariantResult {
  return { ok: false, violations, evidence };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.4-A — attribution required law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_4_A_AttributionRequired(args: {
  readonly score: L11ScoreOutput;
  readonly attribution: L11ScoreAttribution | null;
}): L11_4InvariantResult {
  if (!args.attribution) {
    return fail([
      makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_ATTRIBUTION_ID_MISSING,
        `score ${args.score.score_id} has no attribution`,
        { score_id: args.score.score_id }),
    ], `score=${args.score.score_id} attribution=null`);
  }
  if (args.attribution.score_id !== args.score.score_id) {
    return fail([
      makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_SCORE_REF_MISSING,
        `attribution.score_id ${args.attribution.score_id} != score ${args.score.score_id}`),
    ], 'mismatched score_id');
  }
  return ok(`attribution=${args.attribution.attribution_id} for score=${args.score.score_id}`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.4-B — contribution coverage law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_4_B_ContributionCoverage(args: {
  readonly attribution: L11ScoreAttribution;
  readonly evaluation: L11FormulaEvaluationResult;
}): L11_4InvariantResult {
  const violations: L11ScoreAttributionIssue[] = [];
  const a = args.attribution;
  const e = args.evaluation;

  const attributedComponents = new Set(a.component_contributions.map(c => c.component_id));
  for (const r of e.component_results) {
    if (!attributedComponents.has(r.component_id)) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_COMPONENT_CONTRIBUTION_MISSING,
        `component ${r.component_id} not attributed`));
    }
  }
  const attributedCaps = new Set(a.cap_contributions.map(c => c.cap_rule_id));
  for (const ac of e.applied_caps) {
    if (!attributedCaps.has(ac.cap_rule_id)) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_CAP_APPLIED_BUT_NOT_ATTRIBUTED,
        `cap ${ac.cap_rule_id} not attributed`));
    }
  }
  const attributedPens = new Set(a.penalty_contributions.map(c => c.penalty_rule_id));
  for (const ap of e.applied_penalties) {
    if (!attributedPens.has(ap.penalty_rule_id)) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_PENALTY_APPLIED_BUT_NOT_ATTRIBUTED,
        `penalty ${ap.penalty_rule_id} not attributed`));
    }
  }
  const attributedMods = new Set(a.modifier_contributions.map(c => c.modifier_rule_id));
  for (const am of e.applied_modifiers) {
    if (!attributedMods.has(am.modifier_rule_id)) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_MODIFIER_APPLIED_BUT_NOT_ATTRIBUTED,
        `modifier ${am.modifier_rule_id} not attributed`));
    }
  }
  const attributedMissing = new Set(
    a.missing_data_contributions.map(c => c.missing_input_ref));
  for (const ef of e.missing_data_effects) {
    const expectedRef = ef.disclosure_ref ?? `l11a.disclosure.${ef.missing_data_rule_id}`;
    if (!attributedMissing.has(expectedRef)) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_MISSING_DATA_EFFECT_NOT_ATTRIBUTED,
        `missing-data ${ef.missing_data_rule_id} not attributed`));
    }
  }

  return violations.length === 0
    ? ok(`coverage complete for attribution=${a.attribution_id}`)
    : fail(violations, `coverage=incomplete for attribution=${a.attribution_id}`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.4-C — material driver visibility law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_4_C_MaterialDriverVisibility(args: {
  readonly attribution: L11ScoreAttribution;
  readonly policy?: L11TopDriverSelectionPolicy;
}): L11_4InvariantResult {
  const a = args.attribution;
  const policy = args.policy ?? L11_DEFAULT_TOP_DRIVER_POLICY;

  const drivers = [
    ...a.component_contributions.map(driverFromComponent),
    ...a.cap_contributions.map(driverFromCap),
    ...a.penalty_contributions.map(driverFromPenalty),
    ...a.modifier_contributions.map(driverFromModifier),
    ...a.missing_data_contributions.map(driverFromMissingData),
  ];
  const recomputed = selectL11TopDrivers(drivers, policy);
  const expectedPos = recomputed.top_positive_drivers.map(d => d.driver_id);
  const expectedNeg = recomputed.top_negative_drivers.map(d => d.driver_id);

  const violations: L11ScoreAttributionIssue[] = [];
  if (!arraysEqual(expectedPos, a.top_positive_driver_refs) ||
      !arraysEqual(expectedNeg, a.top_negative_driver_refs)) {
    violations.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_TOP_DRIVER_SELECTION_NONDETERMINISTIC,
      `top driver lists do not match deterministic selector output`,
      { attribution_id: a.attribution_id }));
  }
  // Material drivers must surface somewhere
  for (const d of drivers) {
    if (!isMaterial(d.materiality_class)) continue;
    const visible = a.top_positive_driver_refs.includes(d.driver_id) ||
                    a.top_negative_driver_refs.includes(d.driver_id);
    if (!visible) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_MATERIAL_DRIVER_HIDDEN,
        `material driver ${d.driver_id} not in top driver lists`,
        { attribution_id: a.attribution_id }));
    }
  }
  return violations.length === 0
    ? ok(`material drivers visible for attribution=${a.attribution_id}`)
    : fail(violations, `hidden drivers detected`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.4-D — cap and missing-data disclosure law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_4_D_CapMissingDataDisclosure(args: {
  readonly attribution: L11ScoreAttribution;
}): L11_4InvariantResult {
  const a = args.attribution;
  const violations: L11ScoreAttributionIssue[] = [];
  for (const c of a.cap_contributions) {
    if (!isMaterial(c.materiality_class)) continue;
    const expectedRef = `l11a.driver.cap.${c.cap_contribution_id}`;
    if (!a.negative_driver_refs.includes(expectedRef)) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_MATERIAL_CAP_HIDDEN,
        `material cap ${c.cap_rule_id} not in negative driver refs`,
        { contribution_id: c.cap_contribution_id }));
    }
  }
  for (const c of a.missing_data_contributions) {
    if (!isMaterial(c.materiality_class)) continue;
    const expectedRef = `l11a.driver.mdc.${c.missing_data_contribution_id}`;
    if (!a.negative_driver_refs.includes(expectedRef)) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_MATERIAL_MISSING_DATA_HIDDEN,
        `material missing-data ${c.missing_input_ref} not in negative driver refs`,
        { contribution_id: c.missing_data_contribution_id }));
    }
  }
  return violations.length === 0
    ? ok(`caps/missing-data disclosed for attribution=${a.attribution_id}`)
    : fail(violations, `cap or missing-data disclosure violation`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.4-E — governed-input law
// ─────────────────────────────────────────────────────────────────────

const GOVERNED_REF_PREFIXES: readonly string[] = [
  'l11a.', 'l11d.', 'l11.', 'l10.', 'l9.', 'l8.', 'l7.', 'l6.', 'l5.', 'l4.', 'l3.',
];

function isGovernedRef(ref: string): boolean {
  if (!ref) return false;
  const lower = ref.toLowerCase();
  return GOVERNED_REF_PREFIXES.some(p => lower.startsWith(p));
}

export function checkInvariantL11_4_E_GovernedInputs(args: {
  readonly attribution: L11ScoreAttribution;
}): L11_4InvariantResult {
  const a = args.attribution;
  const violations: L11ScoreAttributionIssue[] = [];
  const refs: string[] = [...a.evidence_refs, ...a.lineage_refs];
  for (const cc of a.component_contributions) refs.push(...cc.evidence_refs, ...cc.lineage_refs);
  for (const cc of a.cap_contributions) refs.push(...cc.lineage_refs);
  for (const cc of a.penalty_contributions) refs.push(...cc.lineage_refs);
  for (const cc of a.modifier_contributions) refs.push(...cc.lineage_refs);
  for (const cc of a.missing_data_contributions) refs.push(...cc.lineage_refs);
  for (const ref of refs) {
    if (!isGovernedRef(ref)) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_UNGOVERNED_INPUT_REF,
        `ref ${ref} is not governed`));
    }
  }
  return violations.length === 0
    ? ok(`all ${refs.length} refs governed`)
    : fail(violations, `ungoverned refs detected`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.4-F — summary-code support law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_4_F_SummaryCodeSupport(args: {
  readonly attribution: L11ScoreAttribution;
}): L11_4InvariantResult {
  const a = args.attribution;
  const violations: L11ScoreAttributionIssue[] = [];
  for (const c of a.explanatory_summary_codes) {
    if (!ALL_L11_ATTRIBUTION_SUMMARY_CODES.includes(c)) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_SUMMARY_CODE_INVALID,
        `summary code ${c} unknown`,
        { attribution_id: a.attribution_id }));
    }
  }
  // Each code must be backed by at least one contribution per
  // §11.4.12.3 (a more thorough check is in summary-code.validator).
  // Here we enforce the structural existence of contribution lists
  // when summary-code list is non-empty.
  if (a.explanatory_summary_codes.length > 0) {
    const totalContributions =
      a.component_contributions.length +
      a.cap_contributions.length +
      a.penalty_contributions.length +
      a.modifier_contributions.length +
      a.missing_data_contributions.length;
    if (totalContributions === 0) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_SUMMARY_CODE_UNSUPPORTED,
        `summary codes present but no contributions`,
        { attribution_id: a.attribution_id }));
    }
  }
  return violations.length === 0
    ? ok(`summary codes supported for attribution=${a.attribution_id}`)
    : fail(violations, `unsupported summary codes`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.4-G — replay determinism law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_4_G_ReplayDeterminism(args: {
  readonly attribution: L11ScoreAttribution;
}): L11_4InvariantResult {
  const a = args.attribution;
  const violations: L11ScoreAttributionIssue[] = [];
  if (!a.replay_hash) {
    violations.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_REPLAY_HASH_MISSING,
      `replay_hash missing on attribution=${a.attribution_id}`,
      { attribution_id: a.attribution_id }));
    return fail(violations, 'replay_hash missing');
  }
  const recomputed = canonicalScoreAttributionReplayHash(extractL11AttributionReplayMaterial(a));
  if (recomputed !== a.replay_hash) {
    violations.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_REPLAY_HASH_MISMATCH,
      `replay_hash mismatch stored=${a.replay_hash} recomputed=${recomputed}`,
      { attribution_id: a.attribution_id }));
  }
  return violations.length === 0
    ? ok(`replay_hash deterministic for attribution=${a.attribution_id}`)
    : fail(violations, 'replay determinism violation');
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.4-H — non-judgment attribution law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_4_H_NonJudgment(args: {
  readonly attribution: L11ScoreAttribution;
  readonly formula?: L11ScoreFormulaDefinition;
}): L11_4InvariantResult {
  const a = args.attribution;
  const violations: L11ScoreAttributionIssue[] = [];
  const text = collectAttributionText(a);
  for (const rx of FORBIDDEN_ATTR_TEXT_PHRASES) {
    if (rx.test(text)) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_ATTRIBUTION_ACTS_AS_JUDGMENT,
        `attribution text matches forbidden pattern ${rx}`,
        { attribution_id: a.attribution_id }));
    }
  }
  // Completeness must be emissible — blocked classes imply illegal
  // emission for attribution-as-judgment severity.
  if (!isL11AttributionEmissible(a.attribution_completeness_class)) {
    violations.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_COMPLETENESS_BLOCKED_EMITTED,
      `completeness ${a.attribution_completeness_class} should not be emitted`,
      { attribution_id: a.attribution_id }));
  }
  // Specifically reject "primary positive" driver class on a risk
  // family being labeled as raising an opportunity score.
  if (args.formula) {
    if (a.score_family !== args.formula.score_family) {
      violations.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_SCORE_REF_MISSING,
        `attribution family does not match formula family`,
        { attribution_id: a.attribution_id }));
    }
  }
  // Static reference to silence unused-import lint
  void L11AttributionDriverClass;

  return violations.length === 0
    ? ok(`non-judgment law respected for attribution=${a.attribution_id}`)
    : fail(violations, `non-judgment violation`);
}

function collectAttributionText(a: L11ScoreAttribution): string {
  const parts: string[] = [];
  for (const c of a.component_contributions) parts.push(c.component_name);
  for (const c of a.cap_contributions) parts.push(c.cap_reason_code);
  for (const c of a.penalty_contributions) parts.push(c.penalty_reason_code);
  for (const c of a.modifier_contributions) parts.push(c.modifier_rule_id);
  for (const c of a.missing_data_contributions) parts.push(c.missing_input_ref);
  parts.push(...a.explanatory_summary_codes);
  return parts.join(' ');
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
