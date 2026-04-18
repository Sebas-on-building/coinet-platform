/**
 * L5.3 Multi-store Architecture — Configuration Schema
 *
 * §5.3.11 — Production Configuration Contract
 *
 * Validates that all required env groups are present before boot.
 */

import { L5StoreKind } from './store-profile';
import { L5DeploymentMode } from './deployment-mode';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG KEY GROUPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfigKeyGroup {
  readonly store: L5StoreKind | 'GLOBAL';
  readonly keys: readonly string[];
  readonly requiredInModes: readonly L5DeploymentMode[];
}

const POSTGRES_CONFIG: ConfigKeyGroup = {
  store: L5StoreKind.POSTGRES,
  keys: ['DATABASE_URL', 'DATABASE_POOL_MIN', 'DATABASE_POOL_MAX', 'DATABASE_STATEMENT_TIMEOUT_MS'],
  requiredInModes: [L5DeploymentMode.REFERENCE_PRODUCTION, L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND, L5DeploymentMode.LOCAL_DEV],
};

const CLICKHOUSE_CONFIG: ConfigKeyGroup = {
  store: L5StoreKind.CLICKHOUSE,
  keys: ['CLICKHOUSE_URL', 'CLICKHOUSE_DATABASE', 'CLICKHOUSE_USER', 'CLICKHOUSE_PASSWORD', 'CLICKHOUSE_BATCH_SIZE', 'CLICKHOUSE_FLUSH_INTERVAL_MS'],
  requiredInModes: [L5DeploymentMode.REFERENCE_PRODUCTION],
};

const REDIS_CONFIG: ConfigKeyGroup = {
  store: L5StoreKind.REDIS,
  keys: ['REDIS_URL', 'REDIS_KEY_PREFIX', 'REDIS_DEFAULT_TTL_SEC'],
  requiredInModes: [L5DeploymentMode.REFERENCE_PRODUCTION, L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND, L5DeploymentMode.LOCAL_DEV],
};

const OBJECT_STORAGE_CONFIG: ConfigKeyGroup = {
  store: L5StoreKind.OBJECT_STORAGE,
  keys: ['OBJECT_STORE_ENDPOINT', 'OBJECT_STORE_REGION', 'OBJECT_STORE_BUCKET', 'OBJECT_STORE_ACCESS_KEY', 'OBJECT_STORE_SECRET_KEY', 'OBJECT_STORE_FORCE_PATH_STYLE'],
  requiredInModes: [L5DeploymentMode.REFERENCE_PRODUCTION, L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND],
};

const GLOBAL_CONFIG: ConfigKeyGroup = {
  store: 'GLOBAL',
  keys: ['L5_DEPLOYMENT_MODE', 'L5_ARCHIVE_REQUIRED_DEFAULT', 'L5_REPLAY_MODE', 'L5_ENV_NAMESPACE'],
  requiredInModes: [L5DeploymentMode.REFERENCE_PRODUCTION, L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND, L5DeploymentMode.LOCAL_DEV],
};

export const ALL_CONFIG_GROUPS: readonly ConfigKeyGroup[] = [
  POSTGRES_CONFIG, CLICKHOUSE_CONFIG, REDIS_CONFIG, OBJECT_STORAGE_CONFIG, GLOBAL_CONFIG,
];

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfigValidationResult {
  readonly valid: boolean;
  readonly missingKeys: readonly string[];
  readonly checkedGroups: number;
}

export function validateConfigForMode(
  mode: L5DeploymentMode,
  envLookup: (key: string) => string | undefined,
): ConfigValidationResult {
  const missingKeys: string[] = [];
  let checkedGroups = 0;

  for (const group of ALL_CONFIG_GROUPS) {
    if (!group.requiredInModes.includes(mode)) continue;
    checkedGroups++;
    for (const key of group.keys) {
      if (!envLookup(key)) {
        missingKeys.push(key);
      }
    }
  }

  return { valid: missingKeys.length === 0, missingKeys, checkedGroups };
}

export function getRequiredConfigKeys(mode: L5DeploymentMode): readonly string[] {
  return ALL_CONFIG_GROUPS
    .filter(g => g.requiredInModes.includes(mode))
    .flatMap(g => [...g.keys]);
}

export function getConfigGroupForStore(store: L5StoreKind): ConfigKeyGroup | undefined {
  return ALL_CONFIG_GROUPS.find(g => g.store === store);
}
