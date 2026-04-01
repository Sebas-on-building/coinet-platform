/**
 * L1.2 CI Authority Governance — Section 10
 *
 *  10.1 Rules: versioning, locked definitions, new source classification
 *  10.2 Change control: triggers for version updates
 *  10.3 Review requirements: which owners must review authority changes
 */

import { CI_AUTHORITY_VERSION } from './types';
import type { CryptoTruthDomain, AuthorityLevel, TrustClass, SourceType } from './types';

export type ChangeCategory =
  | 'new_provider'
  | 'protocol_architecture_change'
  | 'new_research_standard'
  | 'authority_logic_failure'
  | 'domain_definition_change'
  | 'enum_expansion'
  | 'freshness_threshold_change';

export type ReviewOwner =
  | 'architecture_layer_owner'
  | 'scoring_layer_owner'
  | 'ai_layer_owner'
  | 'calibration_owner';

export interface GovernanceRule {
  id: string;
  description: string;
  enforced: boolean;
}

export const GOVERNANCE_RULES: GovernanceRule[] = [
  { id: 'G1', description: 'Authority mappings must be versioned', enforced: true },
  { id: 'G2', description: 'Domain definitions are locked; changes require version bump', enforced: true },
  { id: 'G3', description: 'New source types require explicit classification before use', enforced: true },
  { id: 'G4', description: 'Authority changes must be auditable via change log', enforced: true },
  { id: 'G5', description: 'No free-text production fields in canonical authority state', enforced: true },
  { id: 'G6', description: 'All enums centrally controlled in types.ts', enforced: true },
  { id: 'G7', description: 'All thresholds configurable and auditable in doctrine.ts', enforced: true },
];

export interface ChangeControlTrigger {
  category: ChangeCategory;
  description: string;
  requires_version_bump: boolean;
  required_reviewers: ReviewOwner[];
}

export const CHANGE_CONTROL_TRIGGERS: ChangeControlTrigger[] = [
  {
    category: 'new_provider',
    description: 'New data provider added to authority source registry',
    requires_version_bump: true,
    required_reviewers: ['architecture_layer_owner', 'scoring_layer_owner'],
  },
  {
    category: 'protocol_architecture_change',
    description: 'Protocol changes signature scheme, key model, or trust assumptions',
    requires_version_bump: true,
    required_reviewers: ['architecture_layer_owner', 'scoring_layer_owner', 'ai_layer_owner'],
  },
  {
    category: 'new_research_standard',
    description: 'New peer-reviewed standard changes vulnerability classification',
    requires_version_bump: true,
    required_reviewers: ['architecture_layer_owner', 'calibration_owner'],
  },
  {
    category: 'authority_logic_failure',
    description: 'Evaluation detected authority logic failure (Section 9.4)',
    requires_version_bump: true,
    required_reviewers: ['architecture_layer_owner', 'scoring_layer_owner', 'calibration_owner'],
  },
  {
    category: 'domain_definition_change',
    description: 'Truth domain boundaries modified or new domain added',
    requires_version_bump: true,
    required_reviewers: ['architecture_layer_owner', 'scoring_layer_owner', 'ai_layer_owner', 'calibration_owner'],
  },
  {
    category: 'enum_expansion',
    description: 'New value added to AuthorityLevel, TrustClass, SourceType, or ConflictType',
    requires_version_bump: true,
    required_reviewers: ['architecture_layer_owner'],
  },
  {
    category: 'freshness_threshold_change',
    description: 'Domain freshness thresholds modified',
    requires_version_bump: true,
    required_reviewers: ['architecture_layer_owner', 'calibration_owner'],
  },
];

export interface AuthorityChangeRecord {
  timestamp: string;
  version_before: string;
  version_after: string;
  category: ChangeCategory;
  field_or_domain: string;
  description: string;
  reviewed_by: ReviewOwner[];
  rollback_path: string;
}

const changeLog: AuthorityChangeRecord[] = [];

export function recordAuthorityChange(record: Omit<AuthorityChangeRecord, 'timestamp'>): void {
  changeLog.push({ ...record, timestamp: new Date().toISOString() });
}

export function getChangeLog(): AuthorityChangeRecord[] {
  return [...changeLog];
}

export function getRequiredReviewers(category: ChangeCategory): ReviewOwner[] {
  return CHANGE_CONTROL_TRIGGERS.find(t => t.category === category)?.required_reviewers ?? [];
}

export function getGovernanceSummary(): {
  version: string;
  rules_count: number;
  all_enforced: boolean;
  change_log_size: number;
  triggers_count: number;
} {
  return {
    version: CI_AUTHORITY_VERSION,
    rules_count: GOVERNANCE_RULES.length,
    all_enforced: GOVERNANCE_RULES.every(r => r.enforced),
    change_log_size: changeLog.length,
    triggers_count: CHANGE_CONTROL_TRIGGERS.length,
  };
}
