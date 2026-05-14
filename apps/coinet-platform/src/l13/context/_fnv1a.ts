/**
 * L13.2 — Deterministic FNV-1a 32-bit helper.
 *
 * Shared by all L13.2 builders/engines so that replay hashes,
 * digest IDs, and audit IDs use the same hash everywhere. Mirrors
 * the helper used in `l13-constitutional-audit`.
 */

export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function deterministicHash(parts: readonly string[]): string {
  return fnv1a(parts.join('|'));
}
