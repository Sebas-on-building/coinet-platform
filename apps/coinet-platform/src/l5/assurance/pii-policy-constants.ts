/**
 * L5.7 Assurance — PII Policy Constants
 *
 * Exported separately for use by invariants without circular deps.
 */

export const PROHIBITED_CLICKHOUSE_FIELDS: readonly string[] = [
  'email', 'phone', 'ssn', 'full_name', 'address', 'ip_address',
  'date_of_birth', 'national_id', 'passport_number', 'credit_card',
];

export const PROHIBITED_REDIS_FIELDS: readonly string[] = [
  'email', 'phone', 'ssn', 'full_name', 'address', 'national_id',
  'passport_number', 'credit_card',
];

export const PROHIBITED_TAG_FIELDS: readonly string[] = [
  'email', 'phone', 'ssn', 'full_name', 'address', 'ip_address',
  'national_id', 'passport_number', 'credit_card', 'date_of_birth',
];
