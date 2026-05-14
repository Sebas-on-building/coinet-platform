/**
 * L10.9 — Extension Classifier
 *
 * §10.9.6 / §10.9.13 INV-10.9-D — Classify a proposed change into an
 * `L10ExtensionClass` and determine whether re-certification is
 * required. Changes that introduce judgment/scenario/scoring/
 * recommendation semantics, allow primary hypothesis to masquerade
 * as final judgment, enable single-story collapse, let Redis become
 * authority, enable live raw L6/L7/L8/L9 reconstruction, introduce
 * causal certainty without later-layer authorization, or bypass L5
 * persistence classify as PROHIBITED.
 */

import {
  L10ExtensionClass,
  L10ExtensionClassification,
  L10ExtensionProposal,
  L10_EXTENSION_POLICY_V1,
} from '../contracts/l10-extension-policy';

export class Layer10ExtensionClassifier {
  classify(p: L10ExtensionProposal): L10ExtensionClassification {
    const rationale: string[] = [];

    // §10.9.6.6 / §10.9.13 INV-10.9-D — absolute prohibitions
    const absoluteProhibited: [boolean, string][] = [
      [p.introduces_judgment_semantics,
        'introduces final-judgment semantics into L10'],
      [p.introduces_scenario_semantics,
        'introduces scenario semantics into L10'],
      [p.introduces_scoring_finality,
        'introduces scoring-finality semantics into L10'],
      [p.introduces_recommendation_semantics,
        'introduces recommendation semantics into L10'],
      [p.enables_primary_as_final_judgment,
        'enables primary hypothesis to masquerade as final judgment'],
      [p.enables_single_story_collapse,
        'enables single-story collapse'],
      [p.enables_live_lower_layer_rebuild,
        'enables live raw L6/L7/L8/L9 hypothesis reconstruction by ' +
          'later layers'],
      [p.enables_redis_as_authority,
        'enables Redis as hypothesis authority'],
      [p.bypasses_l5_persistence,
        'bypasses L5 persistence'],
      [p.introduces_causal_certainty_without_authorization,
        'introduces causal certainty without later-layer authorization'],
    ];
    const prohibitedReasons = absoluteProhibited
      .filter(([f]) => f)
      .map(([, msg]) => msg);
    if (prohibitedReasons.length > 0) {
      rationale.push(...prohibitedReasons);
      return {
        proposal_id: p.proposal_id,
        classification: L10ExtensionClass.PROHIBITED,
        requires_recertification: true,
        rationale,
      };
    }

    const breakingFlags: [boolean, string][] = [
      [p.alters_hypothesis_family_ontology,
        'alters hypothesis family ontology'],
      [p.alters_subject_contract,
        'alters hypothesis subject contract'],
      [p.alters_output_contract,
        'alters hypothesis output contract'],
      [p.alters_ranking_law,
        'alters hypothesis ranking law'],
      [p.alters_spread_semantics,
        'alters spread class semantics'],
      [p.alters_cap_chain_law,
        'alters cap-chain dominance law'],
      [p.alters_readiness_class_meaning,
        'alters hypothesis readiness class meaning'],
      [p.alters_restriction_right_meaning,
        'alters restriction-right meaning'],
      [p.alters_confidence_law,
        'alters hypothesis confidence law'],
      [p.alters_support_semantics,
        'alters support semantics'],
      [p.alters_contradiction_semantics,
        'alters contradiction semantics'],
      [p.alters_confirmation_semantics,
        'alters confirmation semantics'],
      [p.alters_invalidation_semantics,
        'alters invalidation semantics'],
      [p.alters_shift_condition_semantics,
        'alters shift-condition semantics'],
      [p.alters_stable_handoff_surface,
        'alters stable handoff surface'],
      [p.widens_downstream_rights,
        'widens downstream rights'],
    ];
    const breakers = breakingFlags.filter(([f]) => f).map(([, m]) => m);

    // Touching hard-protected surface + carrying breakers + not
    // preserving meaning/replay is PROHIBITED per §10.9.6.6.
    if (
      p.touches_hard_protected_surface &&
      (!p.preserves_historical_meaning || !p.preserves_replay_hashes) &&
      breakers.length > 0
    ) {
      rationale.push(
        'touches hard-protected surface without preserving ' +
        'meaning/replay: ' + breakers.join(', '));
      return {
        proposal_id: p.proposal_id,
        classification: L10ExtensionClass.PROHIBITED,
        requires_recertification: true,
        rationale,
      };
    }

    if (breakers.length > 0) {
      rationale.push(`breaking flags: ${breakers.join(', ')}`);
      return {
        proposal_id: p.proposal_id,
        classification: L10ExtensionClass.BREAKING_SEMANTIC,
        requires_recertification: true,
        rationale,
      };
    }

    // Migration-required triggers that preserve meaning but need
    // governed migration.
    if (p.alters_template_semantics) {
      rationale.push('alters template semantics');
      return {
        proposal_id: p.proposal_id,
        classification: L10ExtensionClass.MIGRATION_REQUIRED,
        requires_recertification: true,
        rationale,
      };
    }
    if (p.alters_read_surface) {
      rationale.push('alters read surface');
      return {
        proposal_id: p.proposal_id,
        classification: L10ExtensionClass.MIGRATION_REQUIRED,
        requires_recertification: true,
        rationale,
      };
    }

    if (p.touches_frozen_surface) {
      if (!p.preserves_historical_meaning ||
          !p.preserves_replay_hashes) {
        rationale.push(
          'touches frozen surface without preserving meaning/replay',
        );
        return {
          proposal_id: p.proposal_id,
          classification: L10ExtensionClass.MIGRATION_REQUIRED,
          requires_recertification: true,
          rationale,
        };
      }
      rationale.push(
        'touches frozen surface but preserves meaning + replay');
      return {
        proposal_id: p.proposal_id,
        classification: L10ExtensionClass.BACKWARD_COMPATIBLE,
        requires_recertification: false,
        rationale,
      };
    }

    if (p.is_additive_only && !p.widens_downstream_rights) {
      rationale.push(
        'purely additive and does not widen downstream rights');
      return {
        proposal_id: p.proposal_id,
        classification: L10ExtensionClass.ADDITIVE_SAFE,
        requires_recertification: false,
        rationale,
      };
    }

    rationale.push(
      'non-additive, non-frozen: treat as backward-compatible');
    return {
      proposal_id: p.proposal_id,
      classification: L10ExtensionClass.BACKWARD_COMPATIBLE,
      requires_recertification: false,
      rationale,
    };
  }

  requiresRecertification(c: L10ExtensionClass): boolean {
    return L10_EXTENSION_POLICY_V1.recertification_required_for.includes(c);
  }
}
