/**
 * L9.9 — Extension Classifier
 *
 * §9.9.1.4 / §9.9.4.1 INV-9.9-D — Classify a proposed change into an
 * `L9ExtensionClass` and determine whether re-certification is
 * required. Changes that introduce judgment/recommendation/scoring
 * semantics, turn confidence profiles into final scores, let Redis
 * become sequence authority, enable live raw L6/L7/L8 reconstruction,
 * introduce causal certainty from temporal adjacency, or bypass L5
 * persistence classify as PROHIBITED.
 */

import {
  L9ExtensionClass,
  L9ExtensionClassification,
  L9ExtensionProposal,
  L9_EXTENSION_POLICY_V1,
} from '../contracts/l9-extension-policy';

export class Layer9ExtensionClassifier {
  classify(p: L9ExtensionProposal): L9ExtensionClassification {
    const rationale: string[] = [];

    // §9.9.1.4 / §9.9.4.1 INV-9.9-D — absolute prohibitions
    const absoluteProhibited: [boolean, string][] = [
      [p.introduces_judgment_semantics,
        'introduces final-judgment semantics into L9'],
      [p.introduces_recommendation_semantics,
        'introduces recommendation semantics into L9'],
      [p.introduces_scoring_finality,
        'introduces scoring-finality semantics into L9'],
      [p.introduces_causal_certainty_from_adjacency,
        'introduces causal certainty from temporal adjacency'],
      [p.turns_confidence_into_final_score,
        'turns confidence profiles into final scores'],
      [p.enables_redis_as_authority,
        'enables Redis as sequence authority'],
      [p.enables_live_raw_lower_layer_reconstruction,
        'enables live raw L6/L7/L8 sequence reconstruction'],
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
        classification: L9ExtensionClass.PROHIBITED,
        requires_recertification: true,
        rationale,
      };
    }

    const breakingFlags: [boolean, string][] = [
      [p.alters_sequence_state_meaning,
        'alters sequence state meaning'],
      [p.alters_sequence_family_ontology,
        'alters sequence family ontology'],
      [p.alters_coexistence_law,
        'alters sequence coexistence law'],
      [p.alters_subject_contract,
        'alters sequence subject contract'],
      [p.alters_output_contract,
        'alters sequence output contract'],
      [p.alters_lead_lag_semantics,
        'alters lead-lag semantics'],
      [p.alters_phase_progression_law,
        'alters phase progression law'],
      [p.alters_change_point_law,
        'alters change-point law'],
      [p.alters_decay_law,
        'alters decay law'],
      [p.alters_post_event_window_law,
        'alters post-event window law'],
      [p.alters_confidence_law,
        'alters sequence confidence law'],
      [p.alters_restriction_law,
        'alters sequence restriction law'],
      [p.alters_causal_restraint_law,
        'alters causal-restraint law'],
      [p.alters_cap_chain_law,
        'alters cap-chain law'],
      [p.alters_stable_handoff_surface,
        'alters stable handoff surface'],
      [p.widens_downstream_rights,
        'widens downstream rights'],
    ];
    const breakers = breakingFlags.filter(([f]) => f).map(([, m]) => m);

    // Touching hard-protected surface + carrying breakers + not
    // preserving meaning/replay is PROHIBITED per §9.9.1.4.
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
        classification: L9ExtensionClass.PROHIBITED,
        requires_recertification: true,
        rationale,
      };
    }

    if (breakers.length > 0) {
      rationale.push(`breaking flags: ${breakers.join(', ')}`);
      return {
        proposal_id: p.proposal_id,
        classification: L9ExtensionClass.BREAKING_SEMANTIC,
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
        classification: L9ExtensionClass.MIGRATION_REQUIRED,
        requires_recertification: true,
        rationale,
      };
    }
    if (p.alters_read_surface) {
      rationale.push('alters read surface');
      return {
        proposal_id: p.proposal_id,
        classification: L9ExtensionClass.MIGRATION_REQUIRED,
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
          classification: L9ExtensionClass.MIGRATION_REQUIRED,
          requires_recertification: true,
          rationale,
        };
      }
      rationale.push(
        'touches frozen surface but preserves meaning + replay');
      return {
        proposal_id: p.proposal_id,
        classification: L9ExtensionClass.BACKWARD_COMPATIBLE,
        requires_recertification: false,
        rationale,
      };
    }

    if (p.is_additive_only && !p.widens_downstream_rights) {
      rationale.push(
        'purely additive and does not widen downstream rights');
      return {
        proposal_id: p.proposal_id,
        classification: L9ExtensionClass.ADDITIVE_SAFE,
        requires_recertification: false,
        rationale,
      };
    }

    rationale.push(
      'non-additive, non-frozen: treat as backward-compatible');
    return {
      proposal_id: p.proposal_id,
      classification: L9ExtensionClass.BACKWARD_COMPATIBLE,
      requires_recertification: false,
      rationale,
    };
  }

  requiresRecertification(c: L9ExtensionClass): boolean {
    return L9_EXTENSION_POLICY_V1.recertification_required_for.includes(c);
  }
}
