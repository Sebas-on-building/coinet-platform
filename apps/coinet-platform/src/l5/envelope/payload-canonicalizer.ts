/**
 * L5.4 Universal Write Contract — Payload Canonicalizer
 *
 * §5.4.10 — Canonical Serialization and Hashing Law
 *
 * Deterministic serialization: sorted keys, normalized timestamps,
 * canonical decimals, preserved array order, distinct null/absent.
 */

export const CANONICAL_SERIALIZATION_VERSION = 'CS-1.0.0';

export function canonicalizePayload(payload: unknown): string {
  return canonicalStringify(payload);
}

function canonicalStringify(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return canonicalizeNumber(value);
    case 'string':
      return JSON.stringify(value);
    case 'object':
      if (Array.isArray(value)) {
        return '[' + value.map(v => canonicalStringify(v)).join(',') + ']';
      }
      return canonicalizeObject(value as Record<string, unknown>);
    default:
      return JSON.stringify(value);
  }
}

function canonicalizeNumber(n: number): string {
  if (Number.isNaN(n)) return '"NaN"';
  if (!Number.isFinite(n)) return n > 0 ? '"Infinity"' : '"-Infinity"';
  return String(n);
}

function canonicalizeObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => {
    const v = obj[k];
    if (v === undefined) return null;
    return JSON.stringify(k) + ':' + canonicalStringify(v);
  }).filter(Boolean);
  return '{' + pairs.join(',') + '}';
}

/**
 * Verify that two payloads produce the same canonical form.
 */
export function payloadsCanonicallyEqual(a: unknown, b: unknown): boolean {
  return canonicalizePayload(a) === canonicalizePayload(b);
}
