/**
 * L5.6 — Object Storage Tag Policy
 *
 * §5.6.13.2 — Object metadata tags
 * §5.6.13.3 — Object storage law
 */

// ═══════════════════════════════════════════════════════════════════════════════
// REQUIRED TAGS
// ═══════════════════════════════════════════════════════════════════════════════

export const REQUIRED_OBJECT_TAGS = [
  'trace_id',
  'envelope_id',
  'source_provider',
  'producer_service',
  'schema_version',
  'retention_class',
  'content_type',
  'compression',
  'checksum_sha256',
] as const;

export const OPTIONAL_OBJECT_TAGS = [
  'manifest_id',
  'archive_id',
] as const;

export type RequiredObjectTag = typeof REQUIRED_OBJECT_TAGS[number];
export type OptionalObjectTag = typeof OPTIONAL_OBJECT_TAGS[number];

// ═══════════════════════════════════════════════════════════════════════════════
// TAG SET
// ═══════════════════════════════════════════════════════════════════════════════

export interface ObjectTagSet {
  readonly trace_id: string;
  readonly envelope_id: string;
  readonly source_provider: string;
  readonly producer_service: string;
  readonly schema_version: string;
  readonly retention_class: string;
  readonly content_type: string;
  readonly compression: string;
  readonly checksum_sha256: string;
  readonly manifest_id?: string;
  readonly archive_id?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETENTION CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export enum RetentionClass {
  IMMUTABLE_FOREVER = 'IMMUTABLE_FOREVER',
  COMPLIANCE_7Y = 'COMPLIANCE_7Y',
  OPERATIONAL_90D = 'OPERATIONAL_90D',
  TRANSIENT_7D = 'TRANSIENT_7D',
}

export const ALL_RETENTION_CLASSES: readonly RetentionClass[] = Object.values(RetentionClass);

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export function validateObjectTags(tags: Record<string, string | undefined>): { valid: boolean; missingTags: string[] } {
  const missing: string[] = [];
  for (const tag of REQUIRED_OBJECT_TAGS) {
    if (!tags[tag] || tags[tag] === '') {
      missing.push(tag);
    }
  }
  return { valid: missing.length === 0, missingTags: missing };
}

export function buildObjectTagSet(input: {
  trace_id: string;
  envelope_id: string;
  source_provider: string;
  producer_service: string;
  schema_version: string;
  retention_class: RetentionClass;
  content_type: string;
  compression: string;
  checksum_sha256: string;
  manifest_id?: string;
  archive_id?: string;
}): ObjectTagSet {
  return { ...input, retention_class: input.retention_class };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECT STORAGE LAW — §5.6.13.3
// ═══════════════════════════════════════════════════════════════════════════════

export const OBJECT_STORAGE_LAW = {
  immutableByDefault: true,
  versioningOn: true,
  checksumRequired: true,
  compressionRequired: true,
  tagsRequired: true,
  deterministicPathRequired: true,
  anonymousBlobsForbidden: true,
  mutableInPlaceOverwriteForbidden: true,
  objectLockRecommendedFor: ['replay', 'forensics'] as readonly string[],
  defaultCompression: 'zstd' as const,
} as const;
