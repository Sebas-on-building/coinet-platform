/**
 * L8.8 — Evidence Read Service
 *
 * §8.8.7.1 / §8.8.7.5 — Evidence reads resolve archive payloads for
 * a given subject ref via the `EVIDENCE_VIEW` read mode. Only
 * forensic / replay / repair consumers are allowed, and only with
 * a pre-registered pointer row in `l8.evidence_registry`.
 */

import {
  L8ReadMode, L8ReadRequest,
} from '../contracts/l8-read-surface';
import {
  L8EvidencePointer,
} from '../contracts/l8-evidence-storage';
import { L8ReadSurfaceValidator } from './l8-read-surface.validator';
import {
  L8PersistenceViolation,
  L8PersistenceViolationCode,
  buildL8PersistenceViolation,
} from '../persistence/l8-persistence-violation-codes';

export class L8EvidenceReadService {
  private pointers = new Map<string, L8EvidencePointer[]>();

  constructor(
    private readonly validator: L8ReadSurfaceValidator = new L8ReadSurfaceValidator(),
  ) {}

  register(pointer: L8EvidencePointer): void {
    const arr = this.pointers.get(pointer.subject_ref) ?? [];
    arr.push(pointer);
    this.pointers.set(pointer.subject_ref, arr);
  }

  read(req: L8ReadRequest): {
    readonly ok: boolean;
    readonly violations: readonly L8PersistenceViolation[];
    readonly pointers: readonly L8EvidencePointer[];
  } {
    const res = this.validator.validate(req);
    if (!res.ok) return { ok: false, violations: res.violations, pointers: [] };
    if (req.mode !== L8ReadMode.EVIDENCE_VIEW) {
      return { ok: false, violations: res.violations, pointers: [] };
    }

    const subject = req.regime_subject_id;
    if (!subject) {
      return {
        ok: false,
        violations: [buildL8PersistenceViolation(
          L8PersistenceViolationCode.READ_SUBJECT_REQUIRED_BUT_MISSING,
          `evidence read requires regime_subject_id`,
          { surface: req.surface_id },
        )],
        pointers: [],
      };
    }

    const arr = this.pointers.get(subject) ?? [];
    if (arr.length === 0) {
      return {
        ok: false,
        violations: [buildL8PersistenceViolation(
          L8PersistenceViolationCode.EVIDENCE_READ_WITHOUT_POINTER,
          `no evidence pointer registered for subject ${subject}`,
          { regime_subject_id: subject, surface: req.surface_id },
        )],
        pointers: [],
      };
    }

    return { ok: true, violations: res.violations, pointers: arr };
  }
}
