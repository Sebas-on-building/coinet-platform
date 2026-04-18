/**
 * L6.3 — Replay Hash
 *
 * §6.3.4.6 / §6.3.6.7 — `replay_hash` must be deterministic over the
 * materially important fields of a primitive output. This module canonicalizes
 * input into stable JSON (recursively sorted) and hashes via SHA-256.
 */

import { createHash } from 'crypto';

export interface ReplayHashMaterial {
  readonly primitive_id: string;
  readonly primitive_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly temporal_anchor: string;
  readonly material_inputs: Record<string, unknown>;
}

export function canonicalizeValue(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(canonicalizeValue);
  const entries = Object.entries(v as Record<string, unknown>).sort(
    ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
  );
  const out: Record<string, unknown> = {};
  for (const [k, val] of entries) out[k] = canonicalizeValue(val);
  return out;
}

export function canonicalJson(v: unknown): string {
  return JSON.stringify(canonicalizeValue(v));
}

export function computeReplayHash(material: ReplayHashMaterial): string {
  const json = canonicalJson(material);
  return createHash('sha256').update(json).digest('hex');
}

export function isValidReplayHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}

export function assertReplayHashStable(
  material: ReplayHashMaterial,
  expectedHash: string,
): boolean {
  return computeReplayHash(material) === expectedHash;
}
