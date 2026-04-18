/**
 * L8.9 — Extension Classifier
 *
 * §8.9.7 / §8.9.9.1 INV-8.9-F — Classify a proposed change into an
 * `L8ExtensionClass` and determine whether re-certification is
 * required. Changes that introduce judgment/recommendation/scoring
 * semantics, turn multipliers into final scores, let Redis act as
 * regime authority, enable live raw L6/L7 reclassification, or bypass
 * L5 persistence classify as PROHIBITED.
 */

import {
  L8ExtensionClass,
  L8ExtensionClassification,
  L8ExtensionProposal,
  L8_EXTENSION_POLICY_V1,
} from '../contracts/l8-extension-policy';

export class Layer8ExtensionClassifier {
  classify(p: L8ExtensionProposal): L8ExtensionClassification {
    const rationale: string[] = [];

    // §8.9.7.5 — absolute prohibitions
    const absoluteProhibited: [boolean, string][] = [
      [p.introduces_judgment_semantics,
        'introduces final-judgment semantics into L8'],
      [p.introduces_recommendation_semantics,
        'introduces recommendation semantics into L8'],
      [p.introduces_scoring_finality,
        'introduces scoring-finality semantics into L8'],
      [p.turns_multiplier_into_final_score,
        'turns multiplier profiles into final scores'],
      [p.enables_redis_as_authority,
        'enables Redis as regime authority'],
      [p.enables_live_raw_l6_l7_reclassification,
        'enables live raw L6/L7 re-classification'],
      [p.bypasses_l5_persistence,
        'bypasses L5 persistence'],
    ];
    const prohibitedReasons = absoluteProhibited
      .filter(([f]) => f)
      .map(([, msg]) => msg);
    if (prohibitedReasons.length > 0) {
      rationale.push(...prohibitedReasons);
      return {
        proposal_id: p.proposal_id,
        classification: L8ExtensionClass.PROHIBITED,
        requires_recertification: true,
        rationale,
      };
    }

    const breakingFlags: [boolean, string][] = [
      [p.alters_regime_class_meaning, 'alters regime class meaning'],
      [p.alters_regime_family_ontology,
        'alters regime family ontology'],
      [p.alters_coexistence_law, 'alters coexistence law'],
      [p.alters_subject_contract, 'alters regime subject contract'],
      [p.alters_output_contract, 'alters regime output contract'],
      [p.alters_confidence_law, 'alters confidence law'],
      [p.alters_transition_law, 'alters transition law'],
      [p.alters_multiplier_law, 'alters multiplier law'],
      [p.alters_cap_chain_law, 'alters cap chain law'],
      [p.alters_stable_handoff_surface, 'alters stable handoff surface'],
      [p.widens_downstream_rights, 'widens downstream rights'],
    ];
    const breakers = breakingFlags.filter(([f]) => f).map(([, m]) => m);

    // Touching hard-protected surface + carrying breakers + not
    // preserving meaning/replay is PROHIBITED.
    if (
      p.touches_hard_protected_surface &&
      (!p.preserves_historical_meaning || !p.preserves_replay_hashes) &&
      breakers.length > 0
    ) {
      rationale.push('touches hard-protected surface without preserving ' +
        'meaning/replay: ' + breakers.join(', '));
      return {
        proposal_id: p.proposal_id,
        classification: L8ExtensionClass.PROHIBITED,
        requires_recertification: true,
        rationale,
      };
    }

    if (breakers.length > 0) {
      rationale.push(`breaking flags: ${breakers.join(', ')}`);
      return {
        proposal_id: p.proposal_id,
        classification: L8ExtensionClass.BREAKING_SEMANTIC,
        requires_recertification: true,
        rationale,
      };
    }

    // Migration-required triggers that preserve meaning but need
    // governed migration.
    if (p.alters_input_admissibility) {
      rationale.push('alters input admissibility');
      return {
        proposal_id: p.proposal_id,
        classification: L8ExtensionClass.MIGRATION_REQUIRED,
        requires_recertification: true,
        rationale,
      };
    }
    if (p.alters_template_semantics) {
      rationale.push('alters template semantics');
      return {
        proposal_id: p.proposal_id,
        classification: L8ExtensionClass.MIGRATION_REQUIRED,
        requires_recertification: true,
        rationale,
      };
    }
    if (p.alters_read_surface) {
      rationale.push('alters read surface');
      return {
        proposal_id: p.proposal_id,
        classification: L8ExtensionClass.MIGRATION_REQUIRED,
        requires_recertification: true,
        rationale,
      };
    }

    if (p.touches_frozen_surface) {
      if (!p.preserves_historical_meaning || !p.preserves_replay_hashes) {
        rationale.push(
          'touches frozen surface without preserving meaning/replay',
        );
        return {
          proposal_id: p.proposal_id,
          classification: L8ExtensionClass.MIGRATION_REQUIRED,
          requires_recertification: true,
          rationale,
        };
      }
      rationale.push('touches frozen surface but preserves meaning + replay');
      return {
        proposal_id: p.proposal_id,
        classification: L8ExtensionClass.BACKWARD_COMPATIBLE,
        requires_recertification: false,
        rationale,
      };
    }

    if (p.is_additive_only && !p.widens_downstream_rights) {
      rationale.push('purely additive and does not widen downstream rights');
      return {
        proposal_id: p.proposal_id,
        classification: L8ExtensionClass.ADDITIVE_SAFE,
        requires_recertification: false,
        rationale,
      };
    }

    rationale.push('non-additive, non-frozen: treat as backward-compatible');
    return {
      proposal_id: p.proposal_id,
      classification: L8ExtensionClass.BACKWARD_COMPATIBLE,
      requires_recertification: false,
      rationale,
    };
  }

  requiresRecertification(c: L8ExtensionClass): boolean {
    return L8_EXTENSION_POLICY_V1.recertification_required_for.includes(c);
  }
}
