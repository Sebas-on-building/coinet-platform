/**
 * L6.9 — Extension Classifier
 *
 * §6.9.5.6–§6.9.5.7 — Classify a proposed change into an
 * `L6ExtensionClass` and determine whether re-certification is required.
 */

import {
  L6ExtensionClass,
  L6ExtensionClassification,
  L6ExtensionProposal,
  L6_EXTENSION_POLICY_V1,
} from '../contracts/l6-extension-policy';

export class Layer6ExtensionClassifier {
  classify(p: L6ExtensionProposal): L6ExtensionClassification {
    const rationale: string[] = [];

    const breakingFields = [
      { flag: p.alters_primitive_meaning, label: 'alters primitive meaning' },
      { flag: p.alters_event_lifecycle, label: 'alters event lifecycle semantics' },
      { flag: p.alters_current_state_authority, label: 'alters current-state authority' },
      { flag: p.alters_replay_identity, label: 'alters replay identity' },
      { flag: p.alters_contract_required_fields, label: 'alters required contract fields' },
      { flag: p.alters_late_data_law, label: 'alters late-data law' },
    ];
    const breakers = breakingFields.filter(f => f.flag).map(f => f.label);

    // PROHIBITED: touches hard-protected surface without preserving meaning or replay
    if (p.touches_hard_protected_surface &&
        (!p.preserves_historical_meaning || !p.preserves_replay_hashes) &&
        breakers.length > 0) {
      rationale.push('touches hard-protected surface without preserving meaning/replay');
      return {
        proposal_id: p.proposal_id,
        classification: L6ExtensionClass.PROHIBITED,
        requires_recertification: true,
        rationale,
      };
    }

    if (breakers.length > 0) {
      rationale.push(`breaking flags: ${breakers.join(', ')}`);
      return {
        proposal_id: p.proposal_id,
        classification: L6ExtensionClass.BREAKING_SEMANTIC,
        requires_recertification: true,
        rationale,
      };
    }

    if (p.touches_frozen_surface) {
      if (!p.preserves_historical_meaning || !p.preserves_replay_hashes) {
        rationale.push('touches frozen surface without preserving meaning/replay');
        return {
          proposal_id: p.proposal_id,
          classification: L6ExtensionClass.MIGRATION_REQUIRED,
          requires_recertification: true,
          rationale,
        };
      }
      rationale.push('touches frozen surface but preserves meaning + replay');
      return {
        proposal_id: p.proposal_id,
        classification: L6ExtensionClass.BACKWARD_COMPATIBLE_STRUCTURAL,
        requires_recertification: false,
        rationale,
      };
    }

    if (p.is_additive_only) {
      rationale.push('purely additive');
      return {
        proposal_id: p.proposal_id,
        classification: L6ExtensionClass.ADDITIVE_SAFE,
        requires_recertification: false,
        rationale,
      };
    }

    rationale.push('non-additive, non-frozen: treat as backward-compatible structural');
    return {
      proposal_id: p.proposal_id,
      classification: L6ExtensionClass.BACKWARD_COMPATIBLE_STRUCTURAL,
      requires_recertification: false,
      rationale,
    };
  }

  requiresRecertification(c: L6ExtensionClass): boolean {
    return L6_EXTENSION_POLICY_V1.recertification_required_for.includes(c);
  }
}
