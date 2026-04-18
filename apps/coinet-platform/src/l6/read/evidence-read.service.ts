/**
 * L6.7 — Evidence Read Service
 *
 * §6.7.6.7, §6.7.6.8 — Exposes:
 *   - feature_evidence_bundle
 *   - event_evidence_pack
 *
 * This service reads through the evidence pack index (§6.7.5.5). Object
 * storage access is never exposed directly to callers.
 */

import {
  L6ConsumerClass,
  L6EventEvidencePackRequest,
  L6FeatureEvidenceBundleRequest,
  L6ReadMode,
  L6ReadSurfaceId,
} from '../contracts/l6-read-surface';
import { L6EvidencePack } from '../contracts/l6-evidence-storage';
import { L6EvidenceIndexView } from '../persistence/evidence-pack-storage.validator';
import {
  L6ReadSurfaceValidationResult,
  ReadSurfaceValidator,
} from './read-surface.validator';

export interface L6EvidenceReadResponse {
  readonly ok: boolean;
  readonly surface: L6ReadSurfaceId;
  readonly mode: L6ReadMode;
  readonly pack: L6EvidencePack | null;
  readonly validation: L6ReadSurfaceValidationResult;
}

export interface L6EvidenceIndexQuery {
  findFeaturePack(req: L6FeatureEvidenceBundleRequest): string | null;
  findEventPack(req: L6EventEvidencePackRequest): string | null;
}

export class L6EvidenceReadService {
  private readonly validator = new ReadSurfaceValidator();

  constructor(
    private readonly index: L6EvidenceIndexView,
    private readonly queries: L6EvidenceIndexQuery,
  ) {}

  featureEvidenceBundle(
    req: L6FeatureEvidenceBundleRequest,
    consumer: L6ConsumerClass,
  ): L6EvidenceReadResponse {
    const validation = this.validator.validate({
      surface: L6ReadSurfaceId.FEATURE_EVIDENCE_BUNDLE,
      mode: L6ReadMode.EVIDENCE_LOOKUP,
      consumer_class: consumer,
      raw_storage_surface_hint: null,
      ad_hoc_recompute_requested: false,
    });
    if (!validation.ok) {
      return {
        ok: false, surface: L6ReadSurfaceId.FEATURE_EVIDENCE_BUNDLE,
        mode: L6ReadMode.EVIDENCE_LOOKUP, pack: null, validation,
      };
    }
    const packId = this.queries.findFeaturePack(req);
    const pack = packId ? this.index.get(packId) : null;
    return {
      ok: pack !== null,
      surface: L6ReadSurfaceId.FEATURE_EVIDENCE_BUNDLE,
      mode: L6ReadMode.EVIDENCE_LOOKUP,
      pack,
      validation,
    };
  }

  eventEvidencePack(
    req: L6EventEvidencePackRequest,
    consumer: L6ConsumerClass,
  ): L6EvidenceReadResponse {
    const validation = this.validator.validate({
      surface: L6ReadSurfaceId.EVENT_EVIDENCE_PACK,
      mode: L6ReadMode.EVIDENCE_LOOKUP,
      consumer_class: consumer,
      raw_storage_surface_hint: null,
      ad_hoc_recompute_requested: false,
    });
    if (!validation.ok) {
      return {
        ok: false, surface: L6ReadSurfaceId.EVENT_EVIDENCE_PACK,
        mode: L6ReadMode.EVIDENCE_LOOKUP, pack: null, validation,
      };
    }
    const packId = this.queries.findEventPack(req);
    const pack = packId ? this.index.get(packId) : null;
    return {
      ok: pack !== null,
      surface: L6ReadSurfaceId.EVENT_EVIDENCE_PACK,
      mode: L6ReadMode.EVIDENCE_LOOKUP,
      pack,
      validation,
    };
  }
}
