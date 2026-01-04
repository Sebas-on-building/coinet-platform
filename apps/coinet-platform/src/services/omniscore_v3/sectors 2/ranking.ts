/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 SECTOR RANKING                                                         ║
 * ║                                                                               ║
 * ║   Compute global POS AND within-sector percentile                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { getTierFromScore } from '../constants';
import type { OmniScoreSnapshot } from '../pipeline';
import type { Sector, SectorRanking } from './types';
import { ASSET_SECTORS, SECTOR_INFO } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get sector for an asset
 */
export function getAssetSector(assetId: string): Sector {
  const normalized = assetId.toLowerCase();
  return ASSET_SECTORS[normalized] ?? 'Unknown';
}

/**
 * Get sector info
 */
export function getSectorInfo(sector: Sector) {
  return SECTOR_INFO[sector];
}

/**
 * Check if sector assignment is known
 */
export function hasSectorAssignment(assetId: string): boolean {
  return assetId.toLowerCase() in ASSET_SECTORS;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERCENTILE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate percentile rank (0-100, 100 = best)
 */
function calculatePercentile(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 50;
  if (sortedValues.length === 1) return 50;
  
  // Count values below
  let countBelow = 0;
  for (const v of sortedValues) {
    if (v < value) countBelow++;
  }
  
  return (countBelow / (sortedValues.length - 1)) * 100;
}

/**
 * Calculate rank (1 = best)
 */
function calculateRank(value: number, sortedValues: number[]): number {
  // Sort descending
  const sorted = [...sortedValues].sort((a, b) => b - a);
  const index = sorted.findIndex(v => v === value);
  return index + 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR RANKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate sector ranking for a single asset
 */
export function calculateSectorRanking(
  snapshot: OmniScoreSnapshot,
  allSnapshots: OmniScoreSnapshot[]
): SectorRanking {
  const assetId = snapshot.identity.id;
  const sector = getAssetSector(assetId);
  
  // Get global scores (only scored assets)
  const globalScores = allSnapshots
    .filter(s => s.posFinal !== null)
    .map(s => s.posFinal!);
  
  // Get sector peers
  const sectorPeers = allSnapshots.filter(s => 
    getAssetSector(s.identity.id) === sector
  );
  
  const sectorScores = sectorPeers
    .filter(s => s.posFinal !== null)
    .map(s => s.posFinal!);
  
  // Calculate global metrics
  const globalPOS = snapshot.posFinal;
  const globalTier = globalPOS !== null ? getTierFromScore(globalPOS) : null;
  const globalRank = globalPOS !== null 
    ? calculateRank(globalPOS, globalScores)
    : null;
  const globalPercentile = globalPOS !== null
    ? calculatePercentile(globalPOS, globalScores)
    : null;
  
  // Calculate sector metrics
  // For sector comparison, use QS-dominant comparison (more stable)
  const sectorPOS = snapshot.qs; // Use QS for within-sector comparison
  const sectorTier = getTierFromScore(sectorPOS);
  
  const sectorQsScores = sectorPeers.map(s => s.qs);
  const sectorRank = calculateRank(sectorPOS, sectorQsScores);
  const sectorPercentile = calculatePercentile(sectorPOS, sectorQsScores);
  
  // Generate summary
  const summary = generateRankingSummary(
    snapshot.identity.symbol,
    sector,
    globalTier,
    globalPercentile,
    sectorTier,
    sectorPercentile,
    sectorPeers.length
  );
  
  return {
    assetId,
    symbol: snapshot.identity.symbol,
    sector,
    globalPOS,
    globalTier,
    globalRank,
    globalPercentile,
    sectorPOS,
    sectorTier,
    sectorRank,
    sectorPercentile,
    sectorPeerCount: sectorPeers.length,
    summary,
  };
}

/**
 * Generate human-readable summary
 */
function generateRankingSummary(
  symbol: string,
  sector: Sector,
  globalTier: string | null,
  globalPercentile: number | null,
  sectorTier: string,
  sectorPercentile: number,
  peerCount: number
): string {
  const sectorName = SECTOR_INFO[sector].name;
  
  if (globalTier === null) {
    return `${symbol}: Gated (insufficient data). Within ${sectorName}: #${sectorPercentile.toFixed(0)} percentile of ${peerCount} peers.`;
  }
  
  const globalRankDesc = globalPercentile !== null
    ? `Top ${(100 - globalPercentile).toFixed(0)}% globally`
    : '';
  
  const sectorRankDesc = `Top ${(100 - sectorPercentile).toFixed(0)}% in ${sectorName}`;
  
  // Special insight for assets that rank differently
  const globalPerc = globalPercentile ?? 50;
  const diff = sectorPercentile - globalPerc;
  
  let insight = '';
  if (diff > 20) {
    insight = ` Outperforms peers in ${sectorName}.`;
  } else if (diff < -20) {
    insight = ` Underperforms peers in ${sectorName}.`;
  }
  
  return `${symbol}: ${globalTier} overall (${globalRankDesc}), ${sectorTier} in sector (${sectorRankDesc}).${insight}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK RANKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate sector rankings for all assets
 */
export function calculateAllSectorRankings(
  snapshots: OmniScoreSnapshot[]
): SectorRanking[] {
  return snapshots.map(s => calculateSectorRanking(s, snapshots));
}

/**
 * Get rankings grouped by sector
 */
export function getRankingsBySector(
  rankings: SectorRanking[]
): Record<Sector, SectorRanking[]> {
  const grouped: Record<Sector, SectorRanking[]> = {
    L1: [],
    L2: [],
    DeFi: [],
    Payment: [],
    Exchange: [],
    Memecoin: [],
    Stablecoin: [],
    Gaming: [],
    Infrastructure: [],
    Privacy: [],
    Unknown: [],
  };
  
  for (const r of rankings) {
    grouped[r.sector].push(r);
  }
  
  // Sort each sector by sectorRank
  for (const sector of Object.keys(grouped) as Sector[]) {
    grouped[sector].sort((a, b) => a.sectorRank - b.sectorRank);
  }
  
  return grouped;
}

/**
 * Get top N in each sector
 */
export function getTopBySector(
  rankings: SectorRanking[],
  topN: number = 5
): Record<Sector, SectorRanking[]> {
  const grouped = getRankingsBySector(rankings);
  
  const result: Record<Sector, SectorRanking[]> = {} as any;
  
  for (const sector of Object.keys(grouped) as Sector[]) {
    result[sector] = grouped[sector].slice(0, topN);
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

export interface SectorComparison {
  assetId: string;
  symbol: string;
  
  /** Asset's primary sector */
  primarySector: Sector;
  
  /** Rankings in each relevant sector */
  sectorRankings: Array<{
    sector: Sector;
    percentile: number;
    rank: number;
    peerCount: number;
    tier: string;
  }>;
  
  /** Best sector for this asset */
  bestSector: Sector;
  
  /** Worst sector for this asset */
  worstSector: Sector;
}

/**
 * Compare asset across multiple sectors (for cross-sector assets)
 */
export function compareAcrossSectors(
  snapshot: OmniScoreSnapshot,
  allSnapshots: OmniScoreSnapshot[],
  sectorsToCompare: Sector[]
): SectorComparison {
  const rankings: SectorComparison['sectorRankings'] = [];
  
  for (const sector of sectorsToCompare) {
    const sectorPeers = allSnapshots.filter(s => 
      getAssetSector(s.identity.id) === sector
    );
    
    if (sectorPeers.length === 0) continue;
    
    const sectorQsScores = sectorPeers.map(s => s.qs);
    const percentile = calculatePercentile(snapshot.qs, sectorQsScores);
    const rank = calculateRank(snapshot.qs, sectorQsScores);
    
    rankings.push({
      sector,
      percentile,
      rank,
      peerCount: sectorPeers.length,
      tier: getTierFromScore(snapshot.qs),
    });
  }
  
  // Find best and worst
  const sorted = [...rankings].sort((a, b) => b.percentile - a.percentile);
  
  return {
    assetId: snapshot.identity.id,
    symbol: snapshot.identity.symbol,
    primarySector: getAssetSector(snapshot.identity.id),
    sectorRankings: rankings,
    bestSector: sorted[0]?.sector ?? 'Unknown',
    worstSector: sorted[sorted.length - 1]?.sector ?? 'Unknown',
  };
}
