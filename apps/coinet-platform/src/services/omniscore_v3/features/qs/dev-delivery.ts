/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     👨‍💻 QS FEATURE: Dev Delivery                                               ║
 * ║                                                                               ║
 * ║   Measures: Release cadence, active maintainers, issue throughput            ║
 * ║   Focus on SHIPPING, not commit count (which is gameable)                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureDefinition, FeatureFunction, FeatureResult, FeatureContext } from '../types';
import {
  getDataValue,
  checkRequiredInputs,
  calculateFreshnessHours,
  calculateConfidence,
  normalizeLog,
  normalizeSigmoid,
  createUnavailableResult,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export const DEV_DELIVERY_DEFINITION: FeatureDefinition = {
  id: 'qs_dev_delivery',
  name: 'Development Delivery',
  category: 'qs',
  description: 'Measures shipping velocity and team responsiveness through releases, maintainers, and issue throughput',
  segment: 'TECH',
  defaultWeight: 0.20,
  requiredInputs: [], // Partial computation allowed
  optionalInputs: [
    'releases_90d',
    'days_since_release',
    'commits_30d',
    'active_contributors_30d',
    'contributor_concentration',
    'issue_closure_rate',
    'issues_closed_30d',
    'issues_opened_30d',
    'github_stars',
  ],
  updateFrequencyHours: 168, // Weekly
  higherIsBetter: true,
  normalization: {
    method: 'custom',
    min: 0,
    max: 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeDevDelivery: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = DEV_DELIVERY_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  if (present.length < 2) {
    return createUnavailableResult(def, missing, 'Insufficient development data');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RELEASE CADENCE (0-35 points) - Primary metric
  // ─────────────────────────────────────────────────────────────────────────────
  let releaseScore = 0;
  const releases90d = getDataValue(ctx, 'releases_90d');
  const daysSinceRelease = getDataValue(ctx, 'days_since_release');
  
  if (releases90d !== null) {
    // Releases in last 90 days
    if (releases90d >= 5) releaseScore = 25;
    else if (releases90d >= 3) releaseScore = 20;
    else if (releases90d >= 2) releaseScore = 15;
    else if (releases90d >= 1) releaseScore = 10;
    else releaseScore = 0;
    
    intermediates['releases_count_score'] = releaseScore;
  }
  
  if (daysSinceRelease !== null) {
    // Recency bonus/penalty
    if (daysSinceRelease <= 30) {
      releaseScore += 10;
    } else if (daysSinceRelease <= 60) {
      releaseScore += 5;
    } else if (daysSinceRelease > 180) {
      releaseScore -= 5;
      warnings.push('No release in 6+ months');
    } else if (daysSinceRelease > 365) {
      releaseScore -= 10;
      warnings.push('No release in 12+ months');
    }
    
    intermediates['release_recency_adj'] = daysSinceRelease <= 30 ? 10 : (daysSinceRelease <= 60 ? 5 : 0);
  }
  
  releaseScore = Math.max(0, Math.min(35, releaseScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TEAM HEALTH (0-30 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let teamScore = 0;
  const activeContributors = getDataValue(ctx, 'active_contributors_30d');
  const contributorConcentration = getDataValue(ctx, 'contributor_concentration');
  
  if (activeContributors !== null) {
    // Active contributors (diminishing returns)
    if (activeContributors >= 20) teamScore = 20;
    else if (activeContributors >= 10) teamScore = 17;
    else if (activeContributors >= 5) teamScore = 14;
    else if (activeContributors >= 3) teamScore = 10;
    else if (activeContributors >= 1) teamScore = 5;
    else teamScore = 0;
    
    intermediates['active_contributors_score'] = teamScore;
  }
  
  if (contributorConcentration !== null) {
    // Bus factor - penalize if top 3 do >80% of work
    if (contributorConcentration > 0.9) {
      teamScore -= 10;
      warnings.push('Extreme contributor concentration (>90%)');
    } else if (contributorConcentration > 0.8) {
      teamScore -= 5;
      warnings.push('High contributor concentration (>80%)');
    } else if (contributorConcentration < 0.5) {
      teamScore += 5; // Bonus for distributed team
    }
    
    intermediates['concentration_adj'] = contributorConcentration < 0.5 ? 5 : (contributorConcentration > 0.8 ? -5 : 0);
  }
  
  teamScore = Math.max(0, Math.min(30, teamScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ISSUE THROUGHPUT (0-20 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let issueScore = 0;
  const closureRate = getDataValue(ctx, 'issue_closure_rate');
  const issuesClosed = getDataValue(ctx, 'issues_closed_30d');
  
  if (closureRate !== null) {
    // Closure rate (issues closed / issues opened)
    if (closureRate >= 1.0) issueScore = 15; // Closing backlog
    else if (closureRate >= 0.8) issueScore = 12;
    else if (closureRate >= 0.5) issueScore = 8;
    else if (closureRate >= 0.3) issueScore = 4;
    else issueScore = 0;
    
    intermediates['closure_rate_score'] = issueScore;
  }
  
  if (issuesClosed !== null && issuesClosed > 0) {
    // Bonus for absolute throughput
    if (issuesClosed >= 50) issueScore += 5;
    else if (issuesClosed >= 20) issueScore += 3;
    else if (issuesClosed >= 10) issueScore += 2;
    
    intermediates['issues_closed_bonus'] = issuesClosed >= 50 ? 5 : (issuesClosed >= 20 ? 3 : (issuesClosed >= 10 ? 2 : 0));
  }
  
  issueScore = Math.max(0, Math.min(20, issueScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // COMMUNITY TRACTION (0-15 points) - Secondary signal
  // ─────────────────────────────────────────────────────────────────────────────
  let communityScore = 0;
  const stars = getDataValue(ctx, 'github_stars');
  
  if (stars !== null) {
    // Stars as social proof (log scale)
    if (stars >= 10000) communityScore = 15;
    else if (stars >= 5000) communityScore = 12;
    else if (stars >= 1000) communityScore = 9;
    else if (stars >= 500) communityScore = 6;
    else if (stars >= 100) communityScore = 3;
    
    intermediates['stars_score'] = communityScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawScore = releaseScore + teamScore + issueScore + communityScore;
  const normalizedScore = Math.max(0, Math.min(100, rawScore));
  
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    raw: rawScore,
    normalized: normalizedScore,
    weight: def.defaultWeight,
    contribution: normalizedScore * def.defaultWeight,
    available: true,
    quality: {
      coverage: present.length / allInputs.length,
      freshnessHours: calculateFreshnessHours(ctx, present),
      confidence: calculateConfidence(ctx, present),
    },
    inputs: present,
    missing,
    warnings,
    debug: {
      formula: 'release_score + team_score + issue_score + community_score',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const devDeliveryFeature = {
  definition: DEV_DELIVERY_DEFINITION,
  compute: computeDevDelivery,
};
