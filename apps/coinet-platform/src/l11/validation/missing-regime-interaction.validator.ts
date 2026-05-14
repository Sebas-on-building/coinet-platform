/**
 * L11.5 — Missing × Regime Interaction Validator (§11.5.12 / INV-11.5-F)
 */

import {
  L11MissingRegimeInteraction,
  L11MissingRegimeInteractionClass,
  L11ScoreMissingDataProfile,
  L11ScoreRegimeModifier,
  ALL_L11_MISSING_REGIME_INTERACTION_CLASSES,
} from '../contracts';
import {
  L11MissingRegimeIssue,
  L11MissingRegimeViolationCode,
  makeL11MissingRegimeIssue,
} from './l11-missing-regime-violation-codes';

export interface ValidateMissingRegimeInteractionArgs {
  readonly interaction: L11MissingRegimeInteraction;
  readonly profile?: L11ScoreMissingDataProfile;
  readonly modifiers?: readonly L11ScoreRegimeModifier[];
}

export function validateL11MissingRegimeInteraction(
  args: ValidateMissingRegimeInteractionArgs,
): { ok: boolean; issues: readonly L11MissingRegimeIssue[] } {
  const issues: L11MissingRegimeIssue[] = [];
  const i = args.interaction;

  if (!i.interaction_class ||
      !ALL_L11_MISSING_REGIME_INTERACTION_CLASSES.includes(i.interaction_class)) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_INTERACTION_CLASS_MISSING,
      `interaction_class missing or unknown: ${i.interaction_class}`,
      { interaction_id: i.interaction_id }));
  }

  if (i.interaction_class !== L11MissingRegimeInteractionClass.NO_INTERACTION) {
    if (i.reason_codes.length === 0) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_INTERACTION_LACKS_REASON_CODES,
        'non-NO_INTERACTION must declare reason_codes',
        { interaction_id: i.interaction_id }));
    }
    if (!i.disclosure_required) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_INTERACTION_LACKS_DISCLOSURE,
        'non-NO_INTERACTION must require disclosure',
        { interaction_id: i.interaction_id }));
    }
  }

  // Cross-reference profile + modifiers when supplied
  if (args.profile && i.missing_profile_ref !== args.profile.missing_profile_id) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_INTERACTION_CLASS_MISSING,
      `interaction missing_profile_ref ${i.missing_profile_ref} != profile ${args.profile.missing_profile_id}`,
      { interaction_id: i.interaction_id }));
  }
  if (args.modifiers) {
    const ids = new Set(args.modifiers.map(m => m.modifier_id));
    for (const ref of i.regime_modifier_refs) {
      if (!ids.has(ref)) {
        issues.push(makeL11MissingRegimeIssue(
          L11MissingRegimeViolationCode.L11M_INTERACTION_CLASS_MISSING,
          `interaction references unknown modifier ${ref}`,
          { interaction_id: i.interaction_id }));
      }
    }
  }

  return { ok: issues.every(x => x.severity !== 'CRITICAL' && x.severity !== 'ERROR'), issues };
}

/**
 * Coverage check — when a profile carries material missing-data and
 * at least one regime modifier is active, an interaction object
 * must exist (NO_INTERACTION sentinel allowed only when no overlap).
 */
export function validateL11MissingRegimeInteractionCoverage(args: {
  readonly profile: L11ScoreMissingDataProfile;
  readonly modifiers: readonly L11ScoreRegimeModifier[];
  readonly interactions: readonly L11MissingRegimeInteraction[];
}): { ok: boolean; issues: readonly L11MissingRegimeIssue[] } {
  const issues: L11MissingRegimeIssue[] = [];
  const hasMaterial = args.profile.applied_behaviors.length > 0 ||
    args.profile.applied_caps.length > 0 ||
    args.profile.applied_penalties.length > 0;
  if (hasMaterial && args.modifiers.length > 0 && args.interactions.length === 0) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_REGIME_INTERACTION_OMITTED,
      'material missing-data + active modifiers but no interaction object',
      { missing_profile_id: args.profile.missing_profile_id }));
  }
  return { ok: issues.length === 0, issues };
}
