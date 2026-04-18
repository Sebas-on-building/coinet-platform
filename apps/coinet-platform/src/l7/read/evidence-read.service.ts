/**
 * L7.7 — Evidence Read Service
 *
 * §7.7.6.7 — Evidence reads resolve metadata from Postgres pointers and
 * archive payload through governed pointer access. Later layers never
 * read archive objects directly.
 */

import {
  L7EvidenceClass,
  L7EvidencePointer,
  L7EvidenceSubjectKind,
  L7_EVIDENCE_CLASS_SUBJECT_KIND,
} from '../contracts/l7-evidence-storage';
import { L7ReadRequest, L7ReadSurfaceId } from '../contracts/l7-read-surface';
import { L7ReadSurfaceValidator } from './l7-read-surface.validator';
import { L7ReadOutcome } from './current-validation-read.service';

export interface L7EvidenceReadResult {
  readonly pointer: L7EvidencePointer;
  readonly archive_resolved: boolean;
  readonly payload_preview?: string;
}

export interface L7EvidenceReadSurface {
  readEvidence(req: L7ReadRequest): Promise<L7ReadOutcome<L7EvidenceReadResult | null>>;
}

const SURFACE_TO_CLASS: Partial<Record<L7ReadSurfaceId, L7EvidenceClass>> = {
  [L7ReadSurfaceId.VALIDATION_EVIDENCE_BY_SUBJECT]: L7EvidenceClass.VALIDATION_EVIDENCE_PACK,
  [L7ReadSurfaceId.CONTRADICTION_EVIDENCE_BY_BUNDLE]: L7EvidenceClass.CONTRADICTION_EVIDENCE_BUNDLE,
  [L7ReadSurfaceId.CONFIDENCE_RATIONALE_BY_ASSESSMENT]: L7EvidenceClass.CONFIDENCE_RATIONALE_BUNDLE,
  [L7ReadSurfaceId.RESTRICTION_RATIONALE_BY_PROFILE]: L7EvidenceClass.RESTRICTION_REASON_BUNDLE,
};

export class L7InMemoryEvidenceReadService implements L7EvidenceReadSurface {
  private readonly pointers = new Map<string, L7EvidencePointer>();
  private readonly payloads = new Map<string, string>();

  constructor(private readonly validator: L7ReadSurfaceValidator) {}

  putPointer(ptr: L7EvidencePointer, payload?: string): void {
    this.pointers.set(keyFor(ptr.evidence_class, ptr.subject_ref), ptr);
    if (payload !== undefined) this.payloads.set(ptr.archive_uri, payload);
  }

  async readEvidence(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<L7EvidenceReadResult | null>> {
    const expectedClass = SURFACE_TO_CLASS[req.surface_id];
    if (!expectedClass) {
      const r = this.validator.validate(req);
      return { ok: false, violations: r.violations };
    }
    const r = this.validator.validate(req);
    if (!r.ok) return { ok: false, violations: r.violations };

    if (!req.subject_id) return { ok: true, value: null };
    const ptr = this.pointers.get(keyFor(expectedClass, req.subject_id)) ?? null;
    if (!ptr) return { ok: true, value: null };

    // Sanity check: class must match the read surface.
    if (ptr.evidence_class !== expectedClass) return { ok: true, value: null };
    if (ptr.subject_kind !== L7_EVIDENCE_CLASS_SUBJECT_KIND[expectedClass]) {
      return { ok: true, value: null };
    }

    const payload = this.payloads.get(ptr.archive_uri);
    return {
      ok: true,
      value: {
        pointer: ptr,
        archive_resolved: payload !== undefined,
        payload_preview: payload?.slice(0, 256),
      },
    };
  }
}

function keyFor(cls: L7EvidenceClass, subjectRef: string): string {
  return `${cls}|${subjectRef}`;
}

export type { L7EvidenceSubjectKind };
