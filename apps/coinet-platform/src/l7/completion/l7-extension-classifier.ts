/**
 * L7.9 — Extension Classifier
 *
 * §7.9.6 / §7.9.9.1 INV-7.9-D — Classify a proposed change into an
 * `L7ExtensionClass` and determine whether re-certification is
 * required. Changes touching hard-protected surfaces that remove
 * contradiction preservation, allow live raw L6 revalidation, bypass
 * contradiction caps, or introduce final-judgment semantics classify
 * as PROHIBITED.
 */

import {
  L7ExtensionClass,
  L7ExtensionClassification,
  L7ExtensionProposal,
  L7_EXTENSION_POLICY_V1,
} from '../contracts/l7-extension-policy';

export class Layer7ExtensionClassifier {
  classify(p: L7ExtensionProposal): L7ExtensionClassification {
    const rationale: string[] = [];

    // §7.9.6.5 — absolute prohibitions
    const absoluteProhibited: [boolean, string][] = [
      [p.removes_contradiction_preservation,
        'removes contradiction preservation'],
      [p.enables_live_raw_l6_revalidation,
        'enables live raw-L6 revalidation'],
      [p.bypasses_contradiction_cap,
        'bypasses contradiction cap law'],
      [p.introduces_final_judgment_semantics,
        'introduces final-judgment semantics into L7'],
    ];
    const prohibitedReasons = absoluteProhibited
      .filter(([f]) => f)
      .map(([, msg]) => msg);
    if (prohibitedReasons.length > 0) {
      rationale.push(...prohibitedReasons);
      return {
        proposal_id: p.proposal_id,
        classification: L7ExtensionClass.PROHIBITED,
        requires_recertification: true,
        rationale,
      };
    }

    const breakingFlags: [boolean, string][] = [
      [p.alters_validation_class_meaning, 'alters validation class meaning'],
      [p.alters_contradiction_family_meaning,
        'alters contradiction family meaning'],
      [p.alters_contradiction_template_identity,
        'alters contradiction template identity'],
      [p.alters_confidence_factor_law, 'alters confidence factor law'],
      [p.alters_cap_chain_law, 'alters cap chain law'],
      [p.alters_restriction_right_law, 'alters restriction right law'],
      [p.alters_stable_handoff_surface, 'alters stable handoff surface'],
      [p.widens_downstream_rights, 'widens downstream rights'],
    ];
    const breakers = breakingFlags.filter(([f]) => f).map(([, m]) => m);

    // Touching hard-protected surface + carrying breakers + breaking
    // historical meaning / replay is PROHIBITED.
    if (
      p.touches_hard_protected_surface &&
      (!p.preserves_historical_meaning || !p.preserves_replay_hashes) &&
      breakers.length > 0
    ) {
      rationale.push('touches hard-protected surface without preserving ' +
        'meaning/replay: ' + breakers.join(', '));
      return {
        proposal_id: p.proposal_id,
        classification: L7ExtensionClass.PROHIBITED,
        requires_recertification: true,
        rationale,
      };
    }

    if (breakers.length > 0) {
      rationale.push(`breaking flags: ${breakers.join(', ')}`);
      return {
        proposal_id: p.proposal_id,
        classification: L7ExtensionClass.BREAKING_SEMANTIC,
        requires_recertification: true,
        rationale,
      };
    }

    // Migration-required triggers: touches frozen surface without
    // preserving meaning/replay, or alters modifier meaning / read
    // surface, both of which preserve meaning but need migration.
    if (p.alters_validation_modifier_meaning) {
      rationale.push('alters validation modifier meaning');
      return {
        proposal_id: p.proposal_id,
        classification: L7ExtensionClass.MIGRATION_REQUIRED,
        requires_recertification: true,
        rationale,
      };
    }
    if (p.alters_read_surface) {
      rationale.push('alters read surface');
      return {
        proposal_id: p.proposal_id,
        classification: L7ExtensionClass.MIGRATION_REQUIRED,
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
          classification: L7ExtensionClass.MIGRATION_REQUIRED,
          requires_recertification: true,
          rationale,
        };
      }
      rationale.push('touches frozen surface but preserves meaning + replay');
      return {
        proposal_id: p.proposal_id,
        classification: L7ExtensionClass.BACKWARD_COMPATIBLE,
        requires_recertification: false,
        rationale,
      };
    }

    if (p.is_additive_only && !p.widens_downstream_rights) {
      rationale.push('purely additive and does not widen downstream rights');
      return {
        proposal_id: p.proposal_id,
        classification: L7ExtensionClass.ADDITIVE_SAFE,
        requires_recertification: false,
        rationale,
      };
    }

    rationale.push('non-additive, non-frozen: treat as backward-compatible');
    return {
      proposal_id: p.proposal_id,
      classification: L7ExtensionClass.BACKWARD_COMPATIBLE,
      requires_recertification: false,
      rationale,
    };
  }

  requiresRecertification(c: L7ExtensionClass): boolean {
    return L7_EXTENSION_POLICY_V1.recertification_required_for.includes(c);
  }
}
