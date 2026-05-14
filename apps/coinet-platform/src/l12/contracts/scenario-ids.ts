/**
 * L12.2 — Deterministic identity and replay helpers (§12.2.18).
 *
 * IDs are deterministic. Replay hashes are computed via stable serialization
 * of canonical material fields with set-like fields sorted and ranked
 * collections preserving order.
 */

import { L12ScenarioFamily } from './scenario-family';
import { L12ScenarioType } from './scenario-type';

const FNV_OFFSET_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

function fnv1a64(input: string): bigint {
  let hash = FNV_OFFSET_64;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    hash ^= BigInt(c & 0xff);
    hash = (hash * FNV_PRIME_64) & MASK_64;
    if (c > 0xff) {
      hash ^= BigInt((c >> 8) & 0xff);
      hash = (hash * FNV_PRIME_64) & MASK_64;
    }
  }
  return hash;
}

function hex64(n: bigint): string {
  const s = n.toString(16);
  return s.padStart(16, '0');
}

function fnv96(input: string): string {
  const a = fnv1a64(input);
  const b = fnv1a64(`l12.shift::${input}`);
  return `${hex64(a)}${hex64(b).slice(0, 8)}`;
}

const ID_NS = 'l12.id';
const HASH_NS = 'l12.replay';

function joinKey(parts: ReadonlyArray<string | number>): string {
  return parts.map(p => String(p)).join('|');
}

/* ────────────────────────────────────────────────────────────── */
/* Canonical serializer                                           */
/* ────────────────────────────────────────────────────────────── */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Stable JSON: object keys sorted; arrays preserved in input order
 * (callers must sort set-like arrays before passing).
 */
export function canonicalizeL12ScenarioObject(obj: unknown): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj === 'number') return Number.isFinite(obj) ? JSON.stringify(obj) : 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalizeL12ScenarioObject).join(',')}]`;
  }
  if (isPlainObject(obj)) {
    const keys = Object.keys(obj).sort();
    return `{${keys
      .map(k => `${JSON.stringify(k)}:${canonicalizeL12ScenarioObject(obj[k])}`)
      .join(',')}}`;
  }
  return 'null';
}

/* ────────────────────────────────────────────────────────────── */
/* ID builders                                                     */
/* ────────────────────────────────────────────────────────────── */

export function buildL12ScenarioSubjectId(args: {
  scope_type: string;
  scope_id: string;
  as_of: string;
  policy_version: string;
}): string {
  const key = joinKey([ID_NS, 'subject', args.scope_type, args.scope_id, args.as_of, args.policy_version]);
  return `l12.subject.${fnv96(key)}`;
}

export function buildL12ScenarioSetId(args: {
  scenario_subject_id: string;
  as_of: string;
  policy_version: string;
}): string {
  const key = joinKey([ID_NS, 'set', args.scenario_subject_id, args.as_of, args.policy_version]);
  return `l12.set.${fnv96(key)}`;
}

export function buildL12ScenarioId(args: {
  scenario_set_id: string;
  scenario_family: L12ScenarioFamily;
  scenario_type: L12ScenarioType;
  as_of: string;
  policy_version: string;
}): string {
  const key = joinKey([
    ID_NS,
    'scenario',
    args.scenario_set_id,
    args.scenario_family,
    args.scenario_type,
    args.as_of,
    args.policy_version,
  ]);
  return `l12.scenario.${fnv96(key)}`;
}

export function buildL12ConditionId(args: {
  scenario_id: string;
  source_layer: string;
  required_surface_ref: string;
  operator: string;
}): string {
  const key = joinKey([
    ID_NS,
    'condition',
    args.scenario_id,
    args.source_layer,
    args.required_surface_ref,
    args.operator,
  ]);
  return `l12.condition.${fnv96(key)}`;
}

export function buildL12TriggerId(args: {
  scenario_id: string;
  trigger_type: string;
  trigger_name: string;
}): string {
  const key = joinKey([ID_NS, 'trigger', args.scenario_id, args.trigger_type, args.trigger_name]);
  return `l12.trigger.${fnv96(key)}`;
}

export function buildL12InvalidationId(args: {
  scenario_id: string;
  invalidation_type: string;
  invalidation_name: string;
}): string {
  const key = joinKey([
    ID_NS,
    'invalidation',
    args.scenario_id,
    args.invalidation_type,
    args.invalidation_name,
  ]);
  return `l12.invalidation.${fnv96(key)}`;
}

export function buildL12PathConfidenceProfileId(args: {
  scenario_set_id: string;
  policy_version: string;
}): string {
  const key = joinKey([ID_NS, 'pcp', args.scenario_set_id, args.policy_version]);
  return `l12.pcp.${fnv96(key)}`;
}

/* ────────────────────────────────────────────────────────────── */
/* Replay hash                                                     */
/* ────────────────────────────────────────────────────────────── */

export function buildL12ScenarioReplayHash(args: {
  /** Free-form material fields. Set-like fields must be pre-sorted. */
  material: Record<string, unknown>;
  /** Domain (e.g., 'scenario', 'set', 'subject'). */
  domain: string;
  /** Policy version. */
  policy_version: string;
}): string {
  const wrapped = {
    domain: args.domain,
    policy_version: args.policy_version,
    material: args.material,
  };
  const canon = canonicalizeL12ScenarioObject(wrapped);
  return `${HASH_NS}.${fnv96(`${HASH_NS}::${canon}`)}`;
}
