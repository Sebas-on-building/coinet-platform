/**
 * L5.4 Universal Write Contract — Payload Hash
 *
 * §5.4.10.2 — Payload Hash
 *
 * SHA-256 over canonical serialized payload.
 */

import { createHash } from 'crypto';
import { canonicalizePayload } from './payload-canonicalizer';

export function computePayloadHash(payload: unknown): string {
  const canonical = canonicalizePayload(payload);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function verifyPayloadHash(payload: unknown, expectedHash: string): boolean {
  return computePayloadHash(payload) === expectedHash;
}
