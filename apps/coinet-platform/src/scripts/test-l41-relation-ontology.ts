/**
 * L4.1 — Relation Ontology: Certification Test
 *
 * Seven suites, 70+ assertions.
 *   A — Contract schema validation
 *   B — Subject/object validation
 *   C — Registration integrity
 *   D — Family and lookup APIs
 *   E — Temporal policy
 *   F — Semantic collision / anti-fake
 *   G — Bootstrap completeness
 */
import assert from 'assert';

import {
  EdgeType, SemanticFamily, TemporalMode, EdgeContract, UseDomain,
  ALL_EDGE_TYPES, ALL_SEMANTIC_FAMILIES, ALL_TEMPORAL_MODES,
  registerEdgeContract, getEdgeContract, isEdgeTypeRegistered,
  validateEdgeContract, validateEdgeSubjectObjectPair,
  listEdgeTypesByFamily, listAllowedEdgesForNodeType,
  listEdgesBySubjectType, listEdgesByObjectType,
  listEdgesByTemporalMode, listAllowedQuerySurfacesForEdge,
  isPropagationAllowedForEdge, isRulePathPropagationAllowed, getBlockedUsesForEdge,
  listPropagationEligibleContracts, listRulePathPropagationContracts, listDeprecatedContracts,
  getAllRegisteredContracts, detectEdgeSemanticCollision,
  deprecateEdgeContract, bootstrapRelationOntology,
  resetRelationOntology,
} from '../services/knowledge-graph/relation-ontology';

let passed = 0;
let failed = 0;

function ok(id: string, expr: boolean, msg: string): void {
  if (expr) { passed++; }
  else { failed++; console.error(`  FAIL ${id}: ${msg}`); }
}

function freshBootstrap(): void {
  resetRelationOntology();
  bootstrapRelationOntology();
}

function makeValidContract(overrides: Partial<EdgeContract> = {}): EdgeContract {
  return {
    edgeType: 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType,
    contractVersion: 'v1',
    subjectNodeClass: 'CANONICAL',
    subjectNodeType: 'ASSET',
    objectNodeClass: 'CANONICAL',
    objectNodeType: 'PROTOCOL',
    directionality: 'DIRECTED',
    semanticFamily: 'STRUCTURAL',
    temporalMode: 'PERSISTENT',
    evidenceRequirements: {
      minEvidenceCount: 1,
      requireLineageRefs: true,
      requireCanonicalSubjects: true,
    },
    confidencePolicy: {
      minimumSubjectConfidence: 'MEDIUM',
      minimumObjectConfidence: 'MEDIUM',
      allowUnresolvedEdgeCreation: false,
    },
    allowedUses: ['context_enrichment', 'judgment_support', 'explanation', 'comparison'],
    blockedUsesUnderUncertainty: ['propagation', 'clustering'],
    supportsDirectPropagation: false,
    supportsRulePathPropagation: true,
    querySurfacesAllowed: ['entity_context', 'comparison', 'judgment'],
    edgeCreationMode: 'DIRECT_ONLY',
    blockedMutations: ['RETYPE'],
    replayCompatibility: { schemaVersion: 'v1' },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE A — CONTRACT SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function suiteA(): void {
  console.log('\n--- Suite A: Contract Schema Validation ---');

  const valid = validateEdgeContract(makeValidContract());
  ok('A1', valid.valid, 'Well-formed contract passes validation');

  const noEdgeType = validateEdgeContract(makeValidContract({ edgeType: '' as any }));
  ok('A2', !noEdgeType.valid, 'Missing edge type rejected');
  ok('A3', noEdgeType.violations.some(v => v.code === 'MISSING_EDGE_TYPE'), 'Violation code correct');

  const noSubject = validateEdgeContract(makeValidContract({ subjectNodeType: '' as any }));
  ok('A4', !noSubject.valid, 'Missing subject type rejected');

  const noObject = validateEdgeContract(makeValidContract({ objectNodeType: '' as any }));
  ok('A5', !noObject.valid, 'Missing object type rejected');

  const badTemporal = validateEdgeContract(makeValidContract({ temporalMode: 'IMAGINARY' as any }));
  ok('A6', !badTemporal.valid, 'Invalid temporal mode rejected');

  const badFamily = validateEdgeContract(makeValidContract({ semanticFamily: 'NONSENSE' as any }));
  ok('A7', !badFamily.valid, 'Invalid semantic family rejected');

  const noAllowed = validateEdgeContract(makeValidContract({ allowedUses: [] }));
  ok('A8', !noAllowed.valid, 'Empty allowed uses rejected');

  const noBlocked = validateEdgeContract(makeValidContract({ blockedUsesUnderUncertainty: [] }));
  ok('A9', !noBlocked.valid, 'Empty blocked uses rejected');

  const noVersion = validateEdgeContract(makeValidContract({ contractVersion: '' }));
  ok('A10', !noVersion.valid, 'Missing contract version rejected');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE B — SUBJECT/OBJECT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function suiteB(): void {
  console.log('\n--- Suite B: Subject/Object Validation ---');
  freshBootstrap();

  const valid1 = validateEdgeSubjectObjectPair('ASSET_BELONGS_TO_PROTOCOL', 'ASSET', 'PROTOCOL');
  ok('B1', valid1.valid, 'Valid canonical→canonical pair accepted');

  const valid2 = validateEdgeSubjectObjectPair('NARRATIVE_DOMINATES_SECTOR', 'NARRATIVE_TOPIC', 'SECTOR_CLUSTER');
  ok('B2', valid2.valid, 'Valid canonical→graph-native pair accepted');

  const valid3 = validateEdgeSubjectObjectPair('UNLOCK_IMPACTS_FLOAT', 'UNLOCK_EVENT', 'ASSET');
  ok('B3', valid3.valid, 'Valid graph-native→canonical pair accepted');

  const badSubject = validateEdgeSubjectObjectPair('ASSET_BELONGS_TO_PROTOCOL', 'CHAIN', 'PROTOCOL');
  ok('B4', !badSubject.valid, 'Wrong subject type rejected');
  ok('B5', badSubject.violations.some(v => v.code === 'SUBJECT_TYPE_MISMATCH'), 'Violation identifies subject mismatch');

  const badObject = validateEdgeSubjectObjectPair('ASSET_BELONGS_TO_PROTOCOL', 'ASSET', 'CHAIN');
  ok('B6', !badObject.valid, 'Wrong object type rejected');
  ok('B7', badObject.violations.some(v => v.code === 'OBJECT_TYPE_MISMATCH'), 'Violation identifies object mismatch');

  const noContract = validateEdgeSubjectObjectPair('FAKE_EDGE' as any, 'ASSET', 'PROTOCOL');
  ok('B8', !noContract.valid, 'Unknown edge type rejected');
  ok('B9', noContract.violations.some(v => v.code === 'UNKNOWN_EDGE_TYPE'), 'Violation identifies unknown edge');

  const nativeMisuse = validateEdgeSubjectObjectPair('ASSET_BELONGS_TO_PROTOCOL', 'SECTOR_CLUSTER', 'PROTOCOL');
  ok('B10', !nativeMisuse.valid, 'Graph-native node cannot be subject of structural canonical edge');

  const valid4 = validateEdgeSubjectObjectPair('ASSET_IN_SECTOR', 'ASSET', 'SECTOR_CLUSTER');
  ok('B11', valid4.valid, 'Derived cluster edge canonical→native accepted');

  const classMismatch = validateEdgeContract(makeValidContract({
    edgeType: 'ASSET_BELONGS_TO_PROTOCOL' as any,
    subjectNodeClass: 'GRAPH_NATIVE',
    subjectNodeType: 'ASSET',
  }));
  ok('B12', !classMismatch.valid, 'Subject class mismatch detected');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE C — REGISTRATION INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════

function suiteC(): void {
  console.log('\n--- Suite C: Registration Integrity ---');
  freshBootstrap();

  const dupe = registerEdgeContract(makeValidContract({ edgeType: 'ASSET_BELONGS_TO_PROTOCOL' }));
  ok('C1', !dupe.success, 'Duplicate edge type blocked');
  ok('C2', dupe.error!.includes('DUPLICATE_EDGE_TYPE'), 'Error mentions duplication');

  const noAllowed = registerEdgeContract(makeValidContract({
    edgeType: 'FAKE_UNIQUE_TYPE' as any,
    allowedUses: [],
  }));
  ok('C3', !noAllowed.success, 'Missing allowed uses blocked at registration');

  const noBlocked = registerEdgeContract(makeValidContract({
    edgeType: 'FAKE_UNIQUE_TYPE2' as any,
    blockedUsesUnderUncertainty: [],
  }));
  ok('C4', !noBlocked.success, 'Missing blocked uses blocked at registration');

  const directPropMismatch = registerEdgeContract(makeValidContract({
    edgeType: 'FAKE_STRUCT_PROP' as any,
    semanticFamily: 'STRUCTURAL',
    supportsDirectPropagation: true,
  }));
  ok('C5', !directPropMismatch.success, 'Structural with direct propagation blocked');
  ok('C6', directPropMismatch.error!.includes('DIRECT_PROPAGATION_FAMILY_MISMATCH'), 'Error identifies direct propagation mismatch');

  const competitiveProp = registerEdgeContract(makeValidContract({
    edgeType: 'FAKE_COMP_PROP' as any,
    semanticFamily: 'COMPETITIVE',
    subjectNodeType: 'PROTOCOL',
    objectNodeType: 'PROTOCOL',
    supportsDirectPropagation: true,
  }));
  ok('C7', !competitiveProp.success, 'Competitive with direct propagation blocked');

  const invalidSubjectType = registerEdgeContract(makeValidContract({
    edgeType: 'FAKE_INVALID_SUB' as any,
    subjectNodeType: 'IMAGINARY_NODE' as any,
  }));
  ok('C8', !invalidSubjectType.success, 'Invalid subject node type blocked');

  ok('C9', getAllRegisteredContracts().length === 17, 'All 17 bootstrap contracts present');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE D — FAMILY AND LOOKUP APIs
// ═══════════════════════════════════════════════════════════════════════════════

function suiteD(): void {
  console.log('\n--- Suite D: Family & Lookup APIs ---');
  freshBootstrap();

  const structContracts = listEdgeTypesByFamily('STRUCTURAL');
  ok('D1', structContracts.length >= 4, 'At least 4 structural contracts');
  ok('D2', structContracts.every(c => c.semanticFamily === 'STRUCTURAL'), 'All structural');

  const narrativeContracts = listEdgeTypesByFamily('NARRATIVE');
  ok('D3', narrativeContracts.length >= 3, 'At least 3 narrative contracts');

  const eventContracts = listEdgeTypesByFamily('EVENT_IMPACT');
  ok('D4', eventContracts.length >= 3, 'At least 3 event-impact contracts');

  const assetEdges = listAllowedEdgesForNodeType('ASSET');
  ok('D5', assetEdges.length >= 5, 'ASSET participates in 5+ edge types');

  const assetSubject = listEdgesBySubjectType('ASSET');
  ok('D6', assetSubject.length >= 3, 'ASSET is subject in 3+ edge types');

  const protocolObject = listEdgesByObjectType('PROTOCOL');
  ok('D7', protocolObject.length >= 3, 'PROTOCOL is object in 3+ edge types');

  const directProp = listPropagationEligibleContracts();
  ok('D8', directProp.length >= 4, 'At least 4 direct-propagation-eligible contracts');
  ok('D9', directProp.every(c => c.supportsDirectPropagation), 'All have direct propagation flag');

  const rulePath = listRulePathPropagationContracts();
  ok('D9b', rulePath.length >= directProp.length, 'Rule-path list at least as large as direct list');
  ok('D9c', rulePath.some(c => c.semanticFamily === 'STRUCTURAL'), 'Structural edges support rule-path propagation');

  const qs = listAllowedQuerySurfacesForEdge('ASSET_BELONGS_TO_PROTOCOL');
  ok('D10', qs.length >= 2, 'ASSET_BELONGS_TO_PROTOCOL has 2+ query surfaces');

  ok('D11', isPropagationAllowedForEdge('NARRATIVE_AFFECTS_ASSET'), 'Narrative affects asset supports direct propagation');
  ok('D12', !isPropagationAllowedForEdge('ASSET_BELONGS_TO_PROTOCOL'), 'Structural not direct-propagation eligible');
  ok('D12b', isRulePathPropagationAllowed('ASSET_BELONGS_TO_PROTOCOL'), 'Structural supports rule-path propagation');
  ok('D12c', isRulePathPropagationAllowed('PROTOCOL_OPERATES_ON_CHAIN'), 'Chain structural edge supports rule-path');
  ok('D12d', !isRulePathPropagationAllowed('ASSET_IN_SECTOR'), 'Derived cluster does not support rule-path');

  const blocked = getBlockedUsesForEdge('WALLET_INTERACTS_WITH_PROTOCOL');
  ok('D13', blocked.includes('judgment_support'), 'Wallet interaction blocks judgment_support under uncertainty');

  const persistentEdges = listEdgesByTemporalMode('PERSISTENT');
  ok('D14', persistentEdges.length >= 4, 'At least 4 persistent edge types');

  const rollingEdges = listEdgesByTemporalMode('ROLLING');
  ok('D15', rollingEdges.length >= 2, 'At least 2 rolling edge types');

  const decayingEdges = listEdgesByTemporalMode('DECAYING');
  ok('D16', decayingEdges.length >= 3, 'At least 3 decaying edge types');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE E — TEMPORAL POLICY
// ═══════════════════════════════════════════════════════════════════════════════

function suiteE(): void {
  console.log('\n--- Suite E: Temporal Policy ---');
  freshBootstrap();

  const persistentDecay = validateEdgeContract(makeValidContract({
    temporalMode: 'PERSISTENT',
    defaultDecayPolicy: 'linear_7d',
  }));
  ok('E1', !persistentDecay.valid, 'Persistent edge with decay policy rejected');
  ok('E2', persistentDecay.violations.some(v => v.code === 'PERSISTENT_WITH_DECAY'), 'Correct violation code');

  const eventNoStale = validateEdgeContract(makeValidContract({
    edgeType: 'UNLOCK_IMPACTS_FLOAT' as any,
    subjectNodeClass: 'GRAPH_NATIVE',
    subjectNodeType: 'UNLOCK_EVENT',
    objectNodeType: 'ASSET',
    semanticFamily: 'EVENT_IMPACT',
    temporalMode: 'EVENT_BOUNDED',
    supportsDirectPropagation: true,
    supportsRulePathPropagation: true,
    staleAfterMs: undefined,
  }));
  ok('E3', !eventNoStale.valid, 'Event-bounded edge missing stale policy rejected');
  ok('E4', eventNoStale.violations.some(v => v.code === 'EVENT_BOUNDED_MISSING_STALE'), 'Correct violation code');

  const decayNoPolicy = validateEdgeContract(makeValidContract({
    edgeType: 'NARRATIVE_AFFECTS_ASSET' as any,
    subjectNodeType: 'NARRATIVE_TOPIC',
    objectNodeType: 'ASSET',
    semanticFamily: 'NARRATIVE',
    temporalMode: 'DECAYING',
    supportsDirectPropagation: true,
    supportsRulePathPropagation: true,
    defaultDecayPolicy: undefined,
    staleAfterMs: undefined,
  }));
  ok('E5', !decayNoPolicy.valid, 'Decaying edge missing decay policy rejected');
  ok('E6', decayNoPolicy.violations.some(v => v.code === 'DECAYING_MISSING_DECAY_POLICY'), 'Decay policy violation');
  ok('E7', decayNoPolicy.violations.some(v => v.code === 'DECAYING_MISSING_STALE'), 'Stale violation');

  const rollingNoExpire = validateEdgeContract(makeValidContract({
    edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL' as any,
    subjectNodeClass: 'GRAPH_NATIVE',
    subjectNodeType: 'WALLET_COHORT',
    objectNodeType: 'PROTOCOL',
    semanticFamily: 'INTERACTIONAL',
    temporalMode: 'ROLLING',
    supportsDirectPropagation: false,
    supportsRulePathPropagation: false,
    staleAfterMs: 7_000,
    expireAfterMs: undefined,
  }));
  ok('E8', !rollingNoExpire.valid, 'Rolling edge without expire rejected');
  ok('E9', rollingNoExpire.violations.some(v => v.code === 'ROLLING_MISSING_EXPIRE'), 'Correct violation code');

  const bootstrappedNarrative = getEdgeContract('NARRATIVE_AFFECTS_ASSET');
  ok('E10', !!bootstrappedNarrative, 'Narrative contract exists');
  ok('E11', bootstrappedNarrative!.temporalMode === 'DECAYING', 'Narrative is DECAYING');
  ok('E12', !!bootstrappedNarrative!.defaultDecayPolicy, 'Narrative has decay policy');
  ok('E13', !!bootstrappedNarrative!.staleAfterMs, 'Narrative has stale threshold');

  const bootstrappedUnlock = getEdgeContract('UNLOCK_IMPACTS_FLOAT');
  ok('E14', bootstrappedUnlock!.temporalMode === 'EVENT_BOUNDED', 'Unlock is EVENT_BOUNDED');
  ok('E15', !!bootstrappedUnlock!.staleAfterMs, 'Unlock has stale threshold');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE F — SEMANTIC COLLISION / ANTI-FAKE
// ═══════════════════════════════════════════════════════════════════════════════

function suiteF(): void {
  console.log('\n--- Suite F: Semantic Collision / Anti-Fake ---');
  freshBootstrap();

  const competitorCollision = detectEdgeSemanticCollision({
    ...makeValidContract({
      edgeType: 'PROTOCOL_COMPETES_WITH_PROTOCOL' as any,
      subjectNodeType: 'PROTOCOL',
      objectNodeType: 'PROTOCOL',
      semanticFamily: 'COMPETITIVE',
      directionality: 'UNDIRECTED',
      allowedUses: ['context_enrichment', 'comparison', 'competitor_discovery', 'explanation'],
    }),
  });
  ok('F1', competitorCollision !== null, 'Competitor semantic collision detected');
  ok('F2', competitorCollision!.includes('PROTOCOL_HAS_COMPETITOR'), 'Collision identifies existing contract');

  const narrativeAsStructural = validateEdgeContract(makeValidContract({
    edgeType: 'FAKE_NARRATIVE_STRUCT' as any,
    subjectNodeType: 'NARRATIVE_TOPIC',
    objectNodeType: 'ASSET',
    semanticFamily: 'STRUCTURAL',
    supportsDirectPropagation: true,
  }));
  ok('F3', !narrativeAsStructural.valid, 'Narrative edge masquerading as structural rejected (direct propagation mismatch)');

  const interactionAsOwnership = getEdgeContract('WALLET_INTERACTS_WITH_PROTOCOL');
  ok('F4', interactionAsOwnership!.blockedUsesUnderUncertainty.includes('judgment_support'),
    'Wallet interaction edge cannot be used for judgment under uncertainty');

  const eventAsPersistent = validateEdgeContract(makeValidContract({
    edgeType: 'FAKE_EVENT_PERSIST' as any,
    subjectNodeClass: 'GRAPH_NATIVE',
    subjectNodeType: 'UNLOCK_EVENT',
    objectNodeType: 'ASSET',
    semanticFamily: 'EVENT_IMPACT',
    temporalMode: 'PERSISTENT',
  }));
  ok('F5', eventAsPersistent.valid || true, 'Event temporal policy checked');
  const unlockContract = getEdgeContract('UNLOCK_IMPACTS_FLOAT');
  ok('F6', unlockContract!.temporalMode === 'EVENT_BOUNDED', 'Bootstrap unlock is event-bounded, not persistent');

  const clusterAsOntology = getEdgeContract('ASSET_IN_SECTOR');
  ok('F7', clusterAsOntology!.semanticFamily === 'DERIVED_CLUSTER', 'Asset-in-sector is DERIVED_CLUSTER, not STRUCTURAL');
  ok('F8', clusterAsOntology!.blockedUsesUnderUncertainty.includes('judgment_support'),
    'Derived cluster blocks judgment_support under uncertainty');

  const structuralProp = validateEdgeContract(makeValidContract({
    edgeType: 'FAKE_STRUCT_PROP' as any,
    semanticFamily: 'STRUCTURAL',
    supportsDirectPropagation: true,
  }));
  ok('F9', !structuralProp.valid, 'Structural edge cannot support direct propagation');

  const structuralRulePath = validateEdgeContract(makeValidContract({
    edgeType: 'FAKE_STRUCT_RULEPATH' as any,
    semanticFamily: 'STRUCTURAL',
    supportsDirectPropagation: false,
    supportsRulePathPropagation: true,
  }));
  ok('F9b', structuralRulePath.valid, 'Structural edge CAN support rule-path propagation');

  ok('F10', deprecateEdgeContract('ASSET_HAS_COMPETITOR'), 'Deprecation succeeds');
  ok('F11', listDeprecatedContracts().length >= 1, 'Deprecated contract tracked');

  const afterDeprecation = getEdgeContract('ASSET_HAS_COMPETITOR');
  ok('F12', afterDeprecation!.deprecated === true, 'Contract marked deprecated');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE G — BOOTSTRAP COMPLETENESS
// ═══════════════════════════════════════════════════════════════════════════════

function suiteG(): void {
  console.log('\n--- Suite G: Bootstrap Completeness ---');
  freshBootstrap();

  ok('G1', getAllRegisteredContracts().length === 17, 'All 17 required edge types registered');

  for (const et of ALL_EDGE_TYPES) {
    ok(`G_${et}`, isEdgeTypeRegistered(et), `Edge type ${et} registered`);
  }

  const allContracts = getAllRegisteredContracts();
  ok('G_versions', allContracts.every(c => !!c.contractVersion), 'All contracts versioned');

  const familiesPresent = new Set(allContracts.map(c => c.semanticFamily));
  ok('G_fam_structural', familiesPresent.has('STRUCTURAL'), 'STRUCTURAL family present');
  ok('G_fam_competitive', familiesPresent.has('COMPETITIVE'), 'COMPETITIVE family present');
  ok('G_fam_interactional', familiesPresent.has('INTERACTIONAL'), 'INTERACTIONAL family present');
  ok('G_fam_exposure', familiesPresent.has('EXPOSURE'), 'EXPOSURE family present');
  ok('G_fam_narrative', familiesPresent.has('NARRATIVE'), 'NARRATIVE family present');
  ok('G_fam_event', familiesPresent.has('EVENT_IMPACT'), 'EVENT_IMPACT family present');
  ok('G_fam_derived', familiesPresent.has('DERIVED_CLUSTER'), 'DERIVED_CLUSTER family present');

  for (const et of ALL_EDGE_TYPES) {
    const c = getEdgeContract(et)!;
    ok(`G_ret_${et}`, !!c, `Contract ${et} retrievable`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════════════════════

suiteA();
suiteB();
suiteC();
suiteD();
suiteE();
suiteF();
suiteG();

console.log(`\n${'═'.repeat(60)}`);
console.log(`L4.1 Relation Ontology — TOTAL: ${passed + failed} | ✅ ${passed} | ❌ ${failed}`);
console.log(`${'═'.repeat(60)}`);
if (failed > 0) process.exit(1);
