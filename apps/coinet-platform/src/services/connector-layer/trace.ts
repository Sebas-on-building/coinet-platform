/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     TRACE ID GENERATOR                                                        ║
 * ║                                                                               ║
 * ║   Every ConnectorEnvelope carries a trace ID from ingress onward.             ║
 * ║   Required for debugging, auditability, pipeline reconstruction,              ║
 * ║   cross-layer diagnostics, and observability tooling.                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { randomBytes } from 'crypto';

let counter = 0;

/**
 * Generate a unique trace ID for a connector envelope.
 *
 * Format: `cxn-{timestamp_hex}-{counter_hex}-{random_hex}`
 *
 * Properties:
 * - Lexicographically sortable by time
 * - Collision-resistant (random + monotonic counter)
 * - Prefixed for easy grep/search in logs
 */
export function generateTraceId(): string {
  const ts = Date.now().toString(16);
  const cnt = (counter++).toString(16).padStart(4, '0');
  const rand = randomBytes(4).toString('hex');
  return `cxn-${ts}-${cnt}-${rand}`;
}

/**
 * Extract the approximate timestamp from a trace ID.
 */
export function traceIdTimestamp(traceId: string): number | null {
  const parts = traceId.split('-');
  if (parts.length < 2 || parts[0] !== 'cxn') return null;
  return parseInt(parts[1], 16) || null;
}
