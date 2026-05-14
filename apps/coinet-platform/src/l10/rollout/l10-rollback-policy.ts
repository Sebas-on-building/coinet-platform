/**
 * L10.9 — Rollback Policy
 *
 * §10.9.13 INV-10.9-E / §10.9.11.4 — Rollback must never erase
 * historical hypothesis facts or break lineage continuity. The
 * rollback policy governs what rollback classes are legal and which
 * are prohibited.
 *
 * Legal rollbacks:
 *   - ROLL_BACK_PHASE            : transition a ratified L10 back to
 *                                  an earlier rollout phase (e.g.,
 *                                  FULL → SHADOW) while preserving
 *                                  all historical facts and
 *                                  evidence.
 *   - FENCE_DOWNSTREAM           : temporarily fence downstream
 *                                  visibility without rewinding the
 *                                  rollout phase itself.
 *   - DISABLE_TEMPLATE           : disable one template / family
 *                                  while retaining its history.
 *
 * Prohibited rollback attempts:
 *   - DESTRUCTIVE_DELETE_HISTORY : deleting historical hypothesis
 *                                  facts (raises
 *                                  ROLLBACK_ERASES_HISTORY).
 *   - UNLINK_LINEAGE             : breaking lineage continuity
 *                                  (raises ROLLBACK_BREAKS_LINEAGE).
 *   - DOWNGRADE_FROZEN_STATE     : silently downgrading a frozen or
 *                                  hard-protected surface (also
 *                                  raises ROLLBACK_ERASES_HISTORY).
 */

import {
  L10RatificationViolationCode,
} from '../contracts/l10-completion-standard';

export enum L10RollbackClass {
  ROLL_BACK_PHASE = 'ROLL_BACK_PHASE',
  FENCE_DOWNSTREAM = 'FENCE_DOWNSTREAM',
  DISABLE_TEMPLATE = 'DISABLE_TEMPLATE',
  DESTRUCTIVE_DELETE_HISTORY = 'DESTRUCTIVE_DELETE_HISTORY',
  UNLINK_LINEAGE = 'UNLINK_LINEAGE',
  DOWNGRADE_FROZEN_STATE = 'DOWNGRADE_FROZEN_STATE',
}

export const L10_LEGAL_ROLLBACK_CLASSES: readonly L10RollbackClass[] =
  Object.freeze([
    L10RollbackClass.ROLL_BACK_PHASE,
    L10RollbackClass.FENCE_DOWNSTREAM,
    L10RollbackClass.DISABLE_TEMPLATE,
  ]);

export const L10_PROHIBITED_ROLLBACK_CLASSES:
  readonly L10RollbackClass[] =
  Object.freeze([
    L10RollbackClass.DESTRUCTIVE_DELETE_HISTORY,
    L10RollbackClass.UNLINK_LINEAGE,
    L10RollbackClass.DOWNGRADE_FROZEN_STATE,
  ]);

export interface L10RollbackRequest {
  readonly request_id: string;
  readonly rollback_class: L10RollbackClass;
  readonly preserves_historical_facts: boolean;
  readonly preserves_lineage_continuity: boolean;
  readonly downgrades_frozen_state: boolean;
  readonly rationale: string;
}

export interface L10RollbackDecision {
  readonly request_id: string;
  readonly allowed: boolean;
  readonly rollback_class: L10RollbackClass;
  readonly violations: readonly L10RatificationViolationCode[];
  readonly rationale: string;
}

export class Layer10RollbackPolicy {
  decide(req: L10RollbackRequest): L10RollbackDecision {
    const violations: L10RatificationViolationCode[] = [];
    const notes: string[] = [req.rationale];

    if (L10_PROHIBITED_ROLLBACK_CLASSES.includes(req.rollback_class)) {
      if (req.rollback_class === L10RollbackClass.UNLINK_LINEAGE) {
        violations.push(
          L10RatificationViolationCode.ROLLBACK_BREAKS_LINEAGE);
        notes.push('unlink-lineage is prohibited');
      } else {
        violations.push(
          L10RatificationViolationCode.ROLLBACK_ERASES_HISTORY);
        notes.push(`prohibited rollback class: ${req.rollback_class}`);
      }
      return {
        request_id: req.request_id,
        allowed: false,
        rollback_class: req.rollback_class,
        violations,
        rationale: notes.join('; '),
      };
    }

    if (!req.preserves_historical_facts) {
      violations.push(
        L10RatificationViolationCode.ROLLBACK_ERASES_HISTORY);
      notes.push('rollback does not preserve historical hypothesis facts');
    }
    if (!req.preserves_lineage_continuity) {
      violations.push(
        L10RatificationViolationCode.ROLLBACK_BREAKS_LINEAGE);
      notes.push('rollback breaks lineage continuity');
    }
    if (req.downgrades_frozen_state) {
      violations.push(
        L10RatificationViolationCode.ROLLBACK_ERASES_HISTORY);
      notes.push('rollback silently downgrades frozen surface');
    }

    if (violations.length > 0) {
      return {
        request_id: req.request_id,
        allowed: false,
        rollback_class: req.rollback_class,
        violations,
        rationale: notes.join('; '),
      };
    }

    return {
      request_id: req.request_id,
      allowed: true,
      rollback_class: req.rollback_class,
      violations: [],
      rationale:
        `${req.rollback_class} allowed (history + lineage preserved)`,
    };
  }
}
