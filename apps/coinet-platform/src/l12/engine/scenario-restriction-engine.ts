/**
 * L12.4 — Engine 11: ScenarioRestrictionEngine (§12.4.23).
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import {
  L12_MANDATORY_BLOCKED_USES,
  L12ScenarioAllowedUse,
  L12ScenarioBlockedUse,
  L12ScenarioDisclosureRequirement,
} from '../contracts/scenario-restriction-profile';
import {
  L12DownstreamScenarioConsumer,
  L12RestrictionContract,
  L12ScenarioRestrictionReasonCode,
} from '../contracts/scenario-restriction.contract';

import type { L12PathConfidenceContract } from '../contracts/path-confidence.contract';
import type { L12ScenarioRankingResult } from './scenario-ranking-engine';

export interface DeriveL12RestrictionsArgs {
  readonly ranking: L12ScenarioRankingResult;
  readonly path_confidence: L12PathConfidenceContract;
  readonly contradictionUnresolved: boolean;
  readonly missingVisibilityMaterial: boolean;
  readonly driftMaterialOrCritical: boolean;
  readonly hasActiveInvalidation: boolean;
  readonly closeScenarioCompetition: boolean;
  readonly insufficientInputCompetition: boolean;
  readonly l7RestrictionInherited: boolean;
  readonly l11RestrictionInherited: boolean;
  readonly policy_version: string;
}

export interface DeriveL12RestrictionsResult {
  readonly ok: boolean;
  readonly contract?: L12RestrictionContract;
  readonly issues: readonly string[];
}

export function deriveL12Restrictions(
  args: DeriveL12RestrictionsArgs,
): DeriveL12RestrictionsResult {
  const issues: string[] = [];
  const reasons: L12ScenarioRestrictionReasonCode[] = [
    L12ScenarioRestrictionReasonCode.CONSTITUTIONAL_BASELINE,
  ];
  if (args.contradictionUnresolved) reasons.push(L12ScenarioRestrictionReasonCode.CONTRADICTION_UNRESOLVED);
  if (args.missingVisibilityMaterial) reasons.push(L12ScenarioRestrictionReasonCode.MISSING_VISIBILITY_MATERIAL);
  if (args.driftMaterialOrCritical) reasons.push(L12ScenarioRestrictionReasonCode.DRIFT_MATERIAL);
  if (args.l7RestrictionInherited) reasons.push(L12ScenarioRestrictionReasonCode.L7_RESTRICTION_INHERITED);
  if (args.l11RestrictionInherited) reasons.push(L12ScenarioRestrictionReasonCode.L11_RESTRICTION_INHERITED);
  if (args.hasActiveInvalidation) reasons.push(L12ScenarioRestrictionReasonCode.ACTIVE_INVALIDATION);
  if (args.closeScenarioCompetition) reasons.push(L12ScenarioRestrictionReasonCode.CLOSE_SCENARIO_COMPETITION);
  if (args.insufficientInputCompetition) reasons.push(L12ScenarioRestrictionReasonCode.INSUFFICIENT_INPUT_COMPETITION);

  const allowed: L12ScenarioAllowedUse[] = [
    L12ScenarioAllowedUse.SCENARIO_WEIGHTING,
    L12ScenarioAllowedUse.JUDGMENT_SUPPORT_WITH_DISCLOSURE,
    L12ScenarioAllowedUse.MONITORING_TRIGGER_GENERATION,
    L12ScenarioAllowedUse.EVIDENCE_ONLY_DISCLOSURE,
  ];
  if (
    !args.contradictionUnresolved &&
    !args.missingVisibilityMaterial &&
    !args.driftMaterialOrCritical &&
    !args.hasActiveInvalidation
  ) {
    allowed.push(L12ScenarioAllowedUse.DELIVERY_EXPLANATION);
  }

  const blocked: L12ScenarioBlockedUse[] = [...L12_MANDATORY_BLOCKED_USES];

  const disclosures: L12ScenarioDisclosureRequirement[] = [
    L12ScenarioDisclosureRequirement.CONDITIONALITY_DISCLOSURE,
    L12ScenarioDisclosureRequirement.INVALIDATION_DISCLOSURE,
    L12ScenarioDisclosureRequirement.ALTERNATIVES_DISCLOSURE,
    L12ScenarioDisclosureRequirement.RESTRICTION_DISCLOSURE,
  ];
  if (args.contradictionUnresolved) disclosures.push(L12ScenarioDisclosureRequirement.CONTRADICTION_DISCLOSURE);
  if (args.missingVisibilityMaterial) disclosures.push(L12ScenarioDisclosureRequirement.MISSING_VISIBILITY_DISCLOSURE);
  if (args.driftMaterialOrCritical) disclosures.push(L12ScenarioDisclosureRequirement.DRIFT_DISCLOSURE);

  for (const must of L12_MANDATORY_BLOCKED_USES) {
    if (!blocked.includes(must)) issues.push(`mandatory blocked use missing: ${must}`);
  }

  const downstream = [
    {
      consumer: L12DownstreamScenarioConsumer.L13_JUDGMENT_LAYER,
      allowed_uses: [L12ScenarioAllowedUse.JUDGMENT_SUPPORT_WITH_DISCLOSURE],
      required_disclosures: disclosures,
      blocked_uses: blocked,
      policy_version: args.policy_version,
    },
    {
      consumer: L12DownstreamScenarioConsumer.L14_DELIVERY_LAYER,
      allowed_uses: allowed.includes(L12ScenarioAllowedUse.DELIVERY_EXPLANATION)
        ? [L12ScenarioAllowedUse.DELIVERY_EXPLANATION]
        : [L12ScenarioAllowedUse.EVIDENCE_ONLY_DISCLOSURE],
      required_disclosures: disclosures,
      blocked_uses: blocked,
      policy_version: args.policy_version,
    },
    {
      consumer: L12DownstreamScenarioConsumer.L15_MONITORING_LAYER,
      allowed_uses: [L12ScenarioAllowedUse.MONITORING_TRIGGER_GENERATION],
      required_disclosures: disclosures,
      blocked_uses: blocked,
      policy_version: args.policy_version,
    },
  ];

  if (issues.length > 0) return { ok: false, issues };

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.restriction.contract',
    policy_version: args.policy_version,
    material: {
      scenario_set_id: args.ranking.scenario_set_id,
      reasons: [...reasons].sort(),
      allowed: [...allowed].sort(),
      blocked: [...blocked].sort(),
      disclosures: [...disclosures].sort(),
    },
  });
  const contract: L12RestrictionContract = {
    restriction_contract_id: `l12.restriction.contract.${replay_hash}`,
    restriction_profile_id: `l12.restriction_profile.${replay_hash}`,
    scenario_set_id: args.ranking.scenario_set_id,
    allowed_uses: [...allowed].sort(),
    blocked_uses: [...blocked].sort(),
    required_disclosures: [...new Set(disclosures)].sort(),
    restriction_reason_codes: [...new Set(reasons)].sort(),
    downstream_consumption_limits: downstream,
    lineage_refs: [...args.ranking.lineage_refs].sort(),
    replay_hash,
    policy_version: args.policy_version,
  };
  return { ok: true, contract, issues: [] };
}
