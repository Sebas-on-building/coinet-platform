/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CONNECTOR & ROUTING LAYER — Layer 2                                       ║
 * ║                                                                               ║
 * ║   The translation and control boundary between external source reality        ║
 * ║   and Coinet's internal intelligence system.                                  ║
 * ║                                                                               ║
 * ║   Five non-negotiable guarantees:                                             ║
 * ║     1. Provider isolation                                                     ║
 * ║     2. Envelope standardization                                               ║
 * ║     3. Freshness awareness                                                    ║
 * ║     4. Routing discipline                                                     ║
 * ║     5. Controlled degradation                                                 ║
 * ║                                                                               ║
 * ║   Nothing enters Coinet intelligence directly from a provider.                ║
 * ║   Everything passes through a connector contract.                             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  ConnectorEnvelope,
  ConnectorResult,
  ConnectorConfig,
  ConnectorAcquireParams,
  ConnectorLifecycleTrace,
  EntityType,
  TrustClass,
  FallbackStatus,
  ConnectorCategory,
  FreshnessBucket,
  Freshness,
} from './types';

// ── Trace ────────────────────────────────────────────────────────────────────
export { generateTraceId, traceIdTimestamp } from './trace';

// ── Freshness ────────────────────────────────────────────────────────────────
export {
  computeFreshness,
  computeFreshnessNoSourceTime,
  getProviderFreshnessThreshold,
} from './freshness';

// ── Base Connector ───────────────────────────────────────────────────────────
export { BaseConnector, type RawAcquisition } from './base-connector';

// ── Envelope Factory ─────────────────────────────────────────────────────────
export {
  createEnvelope,
  createEnvelopesFromEvidence,
  getModuleDoctrine,
  getAllModuleDoctrines,
  type EnvelopeFactoryInput,
} from './envelope-factory';

// ── Envelope Validator ───────────────────────────────────────────────────────
export {
  validateEnvelope,
  assessProductionReadiness,
  type EnvelopeValidationResult,
  type EnvelopeViolation,
  type ProductionReadinessResult,
} from './envelope-validator';

// ── Connector Registry & Routing ─────────────────────────────────────────────
export {
  registerConnector,
  getConnector,
  getConnectorChain,
  getConnectorByProvider,
  getRegisteredModules,
  getRegistryDiagnostics,
  executeWithFallback,
  executeModules,
  type RegistryEntry,
  type RoutingDecision,
  type ExecutionSummary,
} from './connector-registry';

// ── Concrete Connectors ──────────────────────────────────────────────────────
export {
  initializeConnectors,
  DexScreenerConnector,
  CoinGlassConnector,
  GoPlusSecurityConnector,
  GoPlusHoldersConnector,
  LunarCrushConnector,
  CryptoPanicConnector,
  AlchemyConnector,
  CoinGeckoConnector,
} from './connectors';
