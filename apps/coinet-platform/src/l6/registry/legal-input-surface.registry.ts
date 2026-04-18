/**
 * L6.6 §6.6.2.10 — LegalInputSurfaceRegistry
 *
 * Maintains the set of all legal input surfaces Layer 6 may consume.
 * Provides lookup by surface_id and class-level queries.
 */

import {
  L6LegalInputSurfaceSpec,
  L6LegalInputSurfaceClass,
  REQUIRED_LEGAL_INPUT_SURFACE_FIELDS,
} from '../contracts/legal-input-surface';

export class LegalInputSurfaceRegistry {
  private readonly surfaces = new Map<string, L6LegalInputSurfaceSpec>();

  register(spec: L6LegalInputSurfaceSpec): { ok: boolean; reason: string } {
    for (const f of REQUIRED_LEGAL_INPUT_SURFACE_FIELDS) {
      const v = spec[f];
      if (v === undefined || v === null || (typeof v === 'string' && v === '')) {
        return { ok: false, reason: `missing required field ${String(f)}` };
      }
    }
    if (this.surfaces.has(spec.surface_id)) {
      return { ok: false, reason: `duplicate surface_id ${spec.surface_id}` };
    }
    this.surfaces.set(spec.surface_id, spec);
    return { ok: true, reason: '' };
  }

  get(surface_id: string): L6LegalInputSurfaceSpec | null {
    return this.surfaces.get(surface_id) ?? null;
  }

  isRegistered(surface_id: string): boolean {
    return this.surfaces.has(surface_id);
  }

  byClass(cls: L6LegalInputSurfaceClass): readonly L6LegalInputSurfaceSpec[] {
    return [...this.surfaces.values()].filter(s => s.surface_class === cls);
  }

  all(): readonly L6LegalInputSurfaceSpec[] {
    return [...this.surfaces.values()];
  }

  count(): number {
    return this.surfaces.size;
  }
}
