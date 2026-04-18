/**
 * L6.4 — EvidencePackBuilder
 *
 * §6.4.8.1 — Deterministic evidence bundles. The pack contains every material
 * input needed to reproduce a primitive output during replay. It is hashed
 * canonically so a later replay can confirm the pack has not drifted.
 */

import { createHash } from 'crypto';
import { canonicalJson } from '../validation/replay-hash';

export enum L6EvidencePackKind {
  FEATURE_EVIDENCE = 'FEATURE_EVIDENCE',
  EVENT_EVIDENCE = 'EVENT_EVIDENCE',
}

export interface L6EvidencePackMaterial {
  readonly primitive_id: string;
  readonly primitive_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly window_refs: readonly string[];
  readonly baseline_refs: readonly string[];
  readonly input_snapshot_ref: string;
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly trigger_ref?: string | null;
  readonly support_refs?: readonly string[];
  readonly compute_metadata: Readonly<Record<string, unknown>>;
  readonly contract_refs: Readonly<Record<string, string>>;
}

export interface L6EvidencePack {
  readonly evidence_pack_id: string;
  readonly kind: L6EvidencePackKind;
  readonly material_digest: string;
  readonly canonical_payload: string;
  readonly created_at: string;
}

export class EvidencePackBuilder {
  build(
    kind: L6EvidencePackKind,
    material: L6EvidencePackMaterial,
    now: string = new Date().toISOString(),
  ): L6EvidencePack {
    const payload = canonicalJson(material);
    const digest = createHash('sha256').update(payload).digest('hex');
    return {
      evidence_pack_id: `ep_${kind.toLowerCase()}_${digest.slice(0, 24)}`,
      kind,
      material_digest: digest,
      canonical_payload: payload,
      created_at: now,
    };
  }

  /**
   * Determinism check: same material produces the same pack id and digest.
   */
  static sameIdentity(a: L6EvidencePack, b: L6EvidencePack): boolean {
    return a.evidence_pack_id === b.evidence_pack_id
      && a.material_digest === b.material_digest;
  }
}
