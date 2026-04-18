/**
 * L5.5 — Write Coordination and Consistency Model
 *
 * Public API surface.
 */

// Errors
export { L5CoordinationErrorCode, L5CoordinationError } from './coordination-errors';

// State enums
export {
  L5ExecutionMode, L5ManifestState, L5ProjectionStatus,
  L5FailureClass,
  ALL_MANIFEST_STATES, TERMINAL_MANIFEST_STATES, ALL_PROJECTION_STATUSES, ALL_FAILURE_CLASSES,
  isTerminalManifestState, isLegalManifestTransition, getLegalManifestTransitions,
} from './coordination-state';
export type { L5CoordinationOutcome } from './coordination-state';

// Consistency model
export { CONSISTENCY_MODEL } from './consistency-model';
export type { L5CoordinationResult, L5ProjectionJob, L5CoordinationManifest } from './consistency-model';

// Execution preflight
export { runExecutionPreflight, assertPreflightPassed } from './execution-preflight';
export type { PreflightResult, PreflightViolation } from './execution-preflight';

// Store router
export { routeEnvelope, isArchiveFirstRequired } from './store-router';
export type { StoreRoutingDecision } from './store-router';

// Archive-first policy
export { evaluateArchiveFirstPolicy } from './archive-first-policy';
export type { ArchiveFirstDecision } from './archive-first-policy';

// Dedupe gate
export { checkDedupeGate, recordDedupeReceipt, dedupeVerdictToFailureClass, resetDedupeStore, getDedupeReceipt } from './dedupe-gate';
export type { DedupeReceipt, DedupeGateResult } from './dedupe-gate';

// Archive writer
export { writeArchive, verifyArchiveChecksum, deriveArchivePath, resetArchiveStore, getArchivedObject, getAllArchivedObjects } from './archive-writer';
export type { ArchiveProof, ArchiveWriteResult } from './archive-writer';

// Write manifest service
export {
  createManifest, transitionManifest, markArchiveCompleted, markPrimaryAuthorityCommitted,
  addProjectionJob, updateProjectionJobStatus,
  getRequiredProjectionCompletion, getOptionalProjectionCompletion,
  getManifest, getAllManifests, getStaleNonFinalManifests, resetManifestStore,
} from './write-manifest.service';
export type { CreateManifestInput } from './write-manifest.service';

// Authority write service
export { executeAuthorityCommit, deriveAuthorityNaturalKey, resetAuthorityStore, getAuthorityRecord, getAllAuthorityRecords } from './authority-write.service';
export type { AuthorityWriteResult } from './authority-write.service';

// Outbox dispatcher
export {
  emitOutboxJob, emitProjectionPlan, getPendingOutboxJobs, markDispatched,
  resetOutbox, getAllOutboxEntries, getOutboxEntry,
} from './outbox-dispatcher';
export type { OutboxEntry, EmitOutboxInput } from './outbox-dispatcher';

// Projection executor
export {
  executeProjectionJob, executeAllPendingProjections,
  registerProjectionWorker, getProjectionWorker, resetProjectionWorkerRegistry,
  isProjectionAlreadyExecuted, recordProjectionExecution, resetProjectionReceipts,
} from './projection-executor';
export type { ProjectionResult, ProjectionWorker } from './projection-executor';

// Projection workers
export { clickHouseProjectionWorker, resetClickHouseStore, getClickHouseRecord, getAllClickHouseRecords } from './projection-workers/clickhouse-projection.worker';
export { redisProjectionWorker, resetRedisStore, getRedisRecord, getAllRedisRecords } from './projection-workers/redis-projection.worker';
export { materializationWorker, resetMaterializationStore, getMaterializedRecord, getAllMaterializedRecords } from './projection-workers/materialization.worker';

// Manifest finalizer
export { checkFinalizationEligibility, finalizeManifest, explainFinalizationOutcome } from './manifest-finalizer';
export type { FinalizationCheckResult } from './manifest-finalizer';

// Projection repair
export { scanAndRepair, repairManifest } from './projection-repair.worker';
export type { RepairResult } from './projection-repair.worker';

// Late data policy
export { LateDataClass, assessLateData, isLateDataSilentOverwrite } from './late-data-policy';
export type { LateDataAssessment, LateDataAllowedPath } from './late-data-policy';

// State read resolver
export { resolveRead, isProjectionContradictingAuthority } from './state-read-resolver';
export type { ReadResolution, ReadSource, ReadPolicy } from './state-read-resolver';

// Replay loader
export { loadReplayEnvelope, buildLineageChain, getReplayContext, resetReplayStore } from './replay-loader';
export type { ReplayContext } from './replay-loader';

// Coordination observer
export {
  resetObserver, getCounters, getTimers, computeGauges,
  recordEnvelopeReceived, recordPreflightReject, recordIdempotentDuplicate,
  recordDuplicateConflict, recordManifestCreated, recordAuthorityCommit,
  recordFinalized, recordQuarantine, recordRepairAttempt, recordRepairSuccess,
  recordArchiveLatency, recordAuthorityTxLatency, recordDispatcherDelay,
  recordProjectionLatency, recordFinalizeLatency,
} from './coordination-observer';
export type { CoordinationCounters, CoordinationTimers, CoordinationGauges } from './coordination-observer';

// Write coordinator
export { coordinateWrite } from './write-coordinator';

// Coordination invariants
export {
  ALL_COORDINATION_INVARIANT_IDS, assertCoordinationInvariant,
  assertAllCoordinationInvariants, enforceAllCoordinationInvariants,
} from './coordination-invariants';
export type { L5CoordinationInvariantId, CoordinationInvariantResult, CoordinationInvariantContext } from './coordination-invariants';
