/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CONNECTOR REGISTRY & ROUTING ENGINE                                       ║
 * ║                                                                               ║
 * ║   Central registry of all connectors with routing discipline.                 ║
 * ║   Manages connector lookup, execution routing, fallback dispatch,             ║
 * ║   and diagnostics aggregation.                                                ║
 * ║                                                                               ║
 * ║   Routing rules:                                                              ║
 * ║     - Realtime, scheduled, on-demand, and historical flows are treated        ║
 * ║       differently but all produce the same envelope contract.                 ║
 * ║     - When a primary connector fails, the registry can dispatch to            ║
 * ║       its fallback chain automatically.                                       ║
 * ║     - Every execution is traceable.                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  ConnectorResult,
  ConnectorAcquireParams,
  ConnectorCategory,
  RoutingMode,
} from './types';
import type { SourceClass } from '../source-systems/registry';
import { getFallbackChain } from '../source-systems/registry';
import { getRoutingModeFromCategory, sortModulesByRoutingPriority } from './routing-modes';
import { BaseConnector } from './base-connector';
import { getModuleDoctrine } from './envelope-factory';
import { buildFallbackEpistemicMetadataForFailure } from './fallback-design';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RegistryEntry {
  connector: BaseConnector<any, any>;
  priority: number;
}

export interface RoutingDecision {
  connector_id: string;
  provider: string;
  source_class: SourceClass;
  category: ConnectorCategory;
  is_fallback: boolean;
  reason: string;
}

export interface ExecutionSummary {
  module: string;
  results: Array<{
    connector_id: string;
    provider: string;
    ok: boolean;
    latency_ms: number;
    is_fallback: boolean;
    error?: string;
  }>;
  final_ok: boolean;
  total_latency_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/** Module name → ordered list of connectors (primary first, then fallbacks) */
const registry = new Map<string, RegistryEntry[]>();

/** Provider ID → connector instance for direct lookup */
const byProvider = new Map<string, BaseConnector<any, any>>();

/**
 * Register a connector under a module name (e.g. 'dexscreener', 'derivatives').
 * Priority 0 = primary, 1+ = fallback order.
 */
export function registerConnector(
  moduleName: string,
  connector: BaseConnector<any, any>,
  priority: number = 0,
): void {
  const entries = registry.get(moduleName) ?? [];
  entries.push({ connector, priority });
  entries.sort((a, b) => a.priority - b.priority);
  registry.set(moduleName, entries);
  byProvider.set(connector.config.provider, connector);
}

/**
 * Get the primary connector for a module.
 */
export function getConnector(moduleName: string): BaseConnector<any, any> | undefined {
  const entries = registry.get(moduleName);
  return entries?.[0]?.connector;
}

/**
 * Get all registered connectors for a module (primary + fallbacks).
 */
export function getConnectorChain(moduleName: string): BaseConnector<any, any>[] {
  const entries = registry.get(moduleName) ?? [];
  return entries.map(e => e.connector);
}

/**
 * Get a connector by provider ID.
 */
export function getConnectorByProvider(provider: string): BaseConnector<any, any> | undefined {
  return byProvider.get(provider);
}

/**
 * List all registered module names.
 */
export function getRegisteredModules(): string[] {
  return [...registry.keys()];
}

/**
 * Get a diagnostic view of the full registry.
 */
export function getRegistryDiagnostics(): Record<string, Array<{
  connector_id: string;
  provider: string;
  source_class: SourceClass;
  category: ConnectorCategory;
  routing_mode: RoutingMode;
  scheduled_cadence_tier?: string;
  priority: number;
  enabled: boolean;
}>> {
  const result: Record<string, any[]> = {};
  for (const [module, entries] of registry) {
    result[module] = entries.map(e => {
      const routingMode: RoutingMode =
        e.connector.config.routing_mode ?? getRoutingModeFromCategory(e.connector.config.category);
      return {
        connector_id: e.connector.config.id,
        provider: e.connector.config.provider,
        source_class: e.connector.config.source_class,
        category: e.connector.config.category,
        routing_mode: routingMode,
        scheduled_cadence_tier: e.connector.config.scheduled_cadence_tier,
        priority: e.priority,
        enabled: e.connector.config.enabled,
      };
    });
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute a module's connector with automatic fallback routing.
 *
 * Tries the primary connector first. On failure, walks the fallback chain
 * defined in the registry. Every attempt produces a traceable result.
 */
export async function executeWithFallback<T = unknown>(
  moduleName: string,
  params: ConnectorAcquireParams = {},
): Promise<{ result: ConnectorResult<T>; summary: ExecutionSummary }> {
  const startTime = Date.now();
  const chain = getConnectorChain(moduleName);
  const attempts: ExecutionSummary['results'] = [];

  if (chain.length === 0) {
    const fe = buildFallbackEpistemicMetadataForFailure({
      truthClass: 'market_surface',
      primaryProviderId: 'none',
      failedProvider: 'none',
      reason: `No connector registered for module: ${moduleName}`,
    });
    return {
      result: {
        ok: false,
        error: `No connector registered for module: ${moduleName}`,
        error_code: 'NO_CONNECTOR',
        latency_ms: 0,
        connector_id: 'none',
        provider: 'none',
        source_class: 'market_data' as SourceClass,
        truth_class: 'market_surface' as any,
        category: 'polling',
        routing_mode: 'scheduled' as RoutingMode,
        fallback_epistemic: fe,
      },
      summary: {
        module: moduleName,
        results: [],
        final_ok: false,
        total_latency_ms: 0,
      },
    };
  }

  const primaryProviderId = chain[0]?.config.provider;

  for (let i = 0; i < chain.length; i++) {
    const connector = chain[i];
    if (!connector.config.enabled) continue;

    const isFallback = i > 0;
    const execParams: ConnectorAcquireParams = {
      ...params,
      is_fallback: isFallback || params.is_fallback,
      primary_provider_id_for_epistemic: primaryProviderId,
    };

    const result = await connector.execute(execParams) as ConnectorResult<T>;

    attempts.push({
      connector_id: connector.config.id,
      provider: connector.config.provider,
      ok: result.ok,
      latency_ms: result.latency_ms,
      is_fallback: isFallback,
      error: result.error,
    });

    if (result.ok) {
      return {
        result,
        summary: {
          module: moduleName,
          results: attempts,
          final_ok: true,
          total_latency_ms: Date.now() - startTime,
        },
      };
    }
  }

  // All connectors failed
  const lastAttempt = attempts[attempts.length - 1];
  const routingMode: RoutingMode =
    chain[0].config.routing_mode ?? getRoutingModeFromCategory(chain[0].config.category);
  const fe = buildFallbackEpistemicMetadataForFailure({
    truthClass: chain[0].config.truth_class,
    primaryProviderId: chain[0].config.provider,
    failedProvider: lastAttempt?.provider,
    reason: attempts.map(a => `${a.provider}: ${a.error}`).join('; '),
  });
  return {
    result: {
      ok: false,
      error: `All connectors failed for module ${moduleName}: ${attempts.map(a => `${a.provider}: ${a.error}`).join('; ')}`,
      error_code: 'ALL_CONNECTORS_FAILED',
      latency_ms: Date.now() - startTime,
      connector_id: lastAttempt?.connector_id ?? 'none',
      provider: lastAttempt?.provider ?? 'none',
      source_class: chain[0].config.source_class,
      truth_class: chain[0].config.truth_class,
      category: chain[0].config.category,
      routing_mode: routingMode,
      fallback_epistemic: fe,
    },
    summary: {
      module: moduleName,
      results: attempts,
      final_ok: false,
      total_latency_ms: Date.now() - startTime,
    },
  };
}

/**
 * Execute multiple modules in parallel with fallback routing.
 *
 * @param options.sortByRoutingPriority — 4.2.4 Rule 4: higher-urgency modes' modules first (scheduled yields).
 */
export async function executeModules(
  modules: string[],
  params: ConnectorAcquireParams = {},
  options?: { sortByRoutingPriority?: boolean },
): Promise<Map<string, { result: ConnectorResult; summary: ExecutionSummary }>> {
  const results = new Map<string, { result: ConnectorResult; summary: ExecutionSummary }>();

  const ordered =
    options?.sortByRoutingPriority === true
      ? sortModulesByRoutingPriority(modules, name => {
          const d = getModuleDoctrine(name);
          return d?.routing_mode ?? 'scheduled';
        })
      : modules;

  const executions = ordered.map(async (mod) => {
    const outcome = await executeWithFallback(mod, params);
    results.set(mod, outcome);
  });

  await Promise.allSettled(executions);
  return results;
}
