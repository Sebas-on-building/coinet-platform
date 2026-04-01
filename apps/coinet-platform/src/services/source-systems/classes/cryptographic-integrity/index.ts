/**
 * L1.1 Cryptographic Integrity — barrel exports.
 *
 * Cryptographic integrity is a structural property of how ownership,
 * verification, authorization, and security assumptions are implemented,
 * exposed, and maintained over time.
 */

export * from './types';
export * from './doctrine';
export * from './protocol-parser';
export * from './exposure-analyzer';
export * from './security-classifier';
export * from './pqc-tracker';
export * from './dormant-supply';
export * from './degradation';
export * from './orchestrator';
export * from './diagnostics';
export * from './authority';
export {
  runQuantumRiskPipeline,
  runBtcQuantumRisk,
  type PipelineResult,
  type CheckpointReport,
} from './quantum-risk/pipeline';
export {
  evaluateQRSBand,
  buildCalibrationReport,
  type BandEvaluation,
  type CalibrationReport,
  type StateEvaluation,
} from './quantum-risk/evaluation';
export {
  recordOutcome as recordQuantumOutcome,
  getOutcomesForSnapshot as getQuantumOutcomes,
} from './quantum-risk/outcome-tracker';
export {
  getSnapshot as getQuantumSnapshot,
  getLatestSnapshot as getLatestQuantumSnapshot,
  getAllSnapshots as getAllQuantumSnapshots,
} from './quantum-risk/snapshot';
export type {
  QuantumRiskSnapshot,
  SnapshotRawInputs,
  QuantumRiskScore,
  QuantumJudgment,
  ScriptDistribution,
  DormantCohorts,
  PQEvidence,
  OutcomeData as QuantumOutcomeData,
  QuantumRiskPipelineInput,
} from './quantum-risk/types';
export { LOGIC_VERSION as QUANTUM_LOGIC_VERSION } from './quantum-risk/types';
