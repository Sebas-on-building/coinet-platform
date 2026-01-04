/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 SECTORS MODULE INDEX                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export {
  type Sector,
  type SectorInfo,
  type SectorRanking,
  SECTOR_INFO,
  ASSET_SECTORS,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Sector detection
  getAssetSector,
  getSectorInfo,
  hasSectorAssignment,
  
  // Single asset ranking
  calculateSectorRanking,
  
  // Bulk ranking
  calculateAllSectorRankings,
  getRankingsBySector,
  getTopBySector,
  
  // Cross-sector comparison
  compareAcrossSectors,
  type SectorComparison,
} from './ranking';
