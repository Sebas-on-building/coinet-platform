/**
 * L5.7 Assurance — PII Minimization Law
 *
 * §5.7.9.6 — Minimise PII in analytical, ephemeral, and tag surfaces.
 */

import { PROHIBITED_CLICKHOUSE_FIELDS, PROHIBITED_REDIS_FIELDS, PROHIBITED_TAG_FIELDS } from './pii-policy-constants';

export type PIIFieldClass = 'DIRECT_IDENTIFIER' | 'QUASI_IDENTIFIER' | 'SENSITIVE_ATTRIBUTE' | 'NON_PII';

export interface PIIFieldClassification {
  readonly field_name: string;
  readonly pii_class: PIIFieldClass;
  readonly store: string;
  readonly allowed: boolean;
  readonly reason: string;
}

export function classifyField(fieldName: string): PIIFieldClass {
  const lower = fieldName.toLowerCase();
  if (['email', 'phone', 'ssn', 'national_id', 'passport_number', 'credit_card'].includes(lower)) return 'DIRECT_IDENTIFIER';
  if (['full_name', 'date_of_birth', 'address', 'ip_address'].includes(lower)) return 'QUASI_IDENTIFIER';
  if (['income', 'health_status', 'religion', 'ethnicity'].includes(lower)) return 'SENSITIVE_ATTRIBUTE';
  return 'NON_PII';
}

export function validateClickHouseFields(fields: readonly string[]): readonly PIIFieldClassification[] {
  return fields.map(f => ({
    field_name: f,
    pii_class: classifyField(f),
    store: 'CLICKHOUSE',
    allowed: !PROHIBITED_CLICKHOUSE_FIELDS.includes(f.toLowerCase()),
    reason: PROHIBITED_CLICKHOUSE_FIELDS.includes(f.toLowerCase())
      ? `PII field "${f}" prohibited in ClickHouse`
      : 'Allowed',
  }));
}

export function validateRedisFields(fields: readonly string[]): readonly PIIFieldClassification[] {
  return fields.map(f => ({
    field_name: f,
    pii_class: classifyField(f),
    store: 'REDIS',
    allowed: !PROHIBITED_REDIS_FIELDS.includes(f.toLowerCase()),
    reason: PROHIBITED_REDIS_FIELDS.includes(f.toLowerCase())
      ? `PII field "${f}" prohibited in Redis unless ephemeral and strictly required`
      : 'Allowed',
  }));
}

export function validateObjectTags(tagKeys: readonly string[]): readonly PIIFieldClassification[] {
  return tagKeys.map(k => ({
    field_name: k,
    pii_class: classifyField(k),
    store: 'OBJECT_STORAGE_TAG',
    allowed: !PROHIBITED_TAG_FIELDS.includes(k.toLowerCase()),
    reason: PROHIBITED_TAG_FIELDS.includes(k.toLowerCase())
      ? `PII tag key "${k}" prohibited in object storage tags`
      : 'Allowed',
  }));
}

export function hasAnyPIIViolation(classifications: readonly PIIFieldClassification[]): boolean {
  return classifications.some(c => !c.allowed);
}
