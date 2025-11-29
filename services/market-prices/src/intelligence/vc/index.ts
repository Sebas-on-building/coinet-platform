/**
 * VC Intelligence Module
 * 
 * Exports all VC-related tracking components
 */

// Dynamic VC Database
import { DynamicVCDatabase, getDynamicVCDatabase, resetDynamicVCDatabase } from './dynamic-vc-database';
export {
  DynamicVCDatabase,
  getDynamicVCDatabase,
  resetDynamicVCDatabase,
  type VCInfo,
  type VCWallet,
  type VCBehavior,
  type VCPortfolio,
  type VCQueryOptions,
  type VCDatabaseStats,
} from './dynamic-vc-database';

export default {
  DynamicVCDatabase,
};

