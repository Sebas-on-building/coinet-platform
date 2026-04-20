/**
 * L10.4 — Hypothesis DAG Builder
 *
 * §10.4.4 — Compose nodes + edges into a validated `L10HypothesisDag`.
 * The builder is the single choke point that enforces:
 *   - node-class ↔ stage alignment  (DAG_NODE_STAGE_MISMATCH)
 *   - candidate-scope for candidate-scoped classes
 *     (DAG_CANDIDATE_NODE_MISSING_CANDIDATE_ID,
 *      DAG_SUBJECT_NODE_CARRIES_CANDIDATE_ID)
 *   - edge-class legality  (DAG_ILLEGAL_EDGE_TRANSITION)
 *   - no cycles              (DAG_CYCLE_DETECTED)
 *   - deterministic topological order (INV-10.4-A)
 *   - forbidden stage jumps  (DAG_INPUT_TO_RANKING_JUMP,
 *     DAG_SUBJECT_TO_SPREAD_JUMP,
 *     DAG_SUPPORT_TO_MATERIALIZATION_JUMP)
 *   - shift ⇒ spread ⇒ ranking chain present
 *     (DAG_SHIFT_WITHOUT_SPREAD, DAG_SPREAD_WITHOUT_RANKING)
 *   - terminal node presence (DAG_MISSING_TERMINAL_NODE)
 *   - duplicate node ids     (DAG_DUPLICATE_NODE_ID)
 *
 * The builder never mutates lower-layer surfaces; it only composes
 * runtime metadata.
 */

import {
  L10DagNode,
  L10DagNodeClass,
  L10DagStage,
  L10_NODE_CLASS_STAGE,
  L10_STAGE_INDEX,
  ALL_L10_DAG_NODE_CLASSES,
  L10_CANDIDATE_SCOPED_CLASSES,
  isL10CandidateScopedClass,
  compareL10NodesDeterministic,
  buildL10DagNodeId,
} from './hypothesis-dag-node';
import {
  L10DagEdge,
  L10DagEdgeClass,
  ALL_L10_DAG_EDGE_CLASSES,
  isLegalL10Edge,
  buildL10DagEdgeId,
} from './hypothesis-dag-edge';
import { detectL10Cycles } from './hypothesis-cycle-detector';
import { l10Toposort } from './hypothesis-toposort';
import {
  L10RuntimeViolationCode,
  L10RuntimeViolation,
} from '../validation/l10-runtime-violation-codes';

/**
 * §10.4.4.1 — Complete DAG snapshot. `topological_order` is the
 * canonical deterministic run order; engines must iterate in this
 * order only.
 */
export interface L10HypothesisDag {
  readonly nodes: readonly L10DagNode[];
  readonly edges: readonly L10DagEdge[];
  readonly node_index: ReadonlyMap<string, L10DagNode>;
  readonly topological_order: readonly string[];
}

export interface L10DagBuildResult {
  readonly ok: boolean;
  readonly dag: L10HypothesisDag | null;
  readonly violations: readonly L10RuntimeViolation[];
}

interface MutableBuilder {
  readonly nodes: L10DagNode[];
  readonly edges: L10DagEdge[];
  readonly nodeIndex: Map<string, L10DagNode>;
  readonly violations: L10RuntimeViolation[];
  readonly hypothesis_run_id: string;
  seq: number;
}

export function createL10DagBuilder(
  hypothesis_run_id: string,
): L10DagBuilder {
  const state: MutableBuilder = {
    nodes: [],
    edges: [],
    nodeIndex: new Map(),
    violations: [],
    hypothesis_run_id,
    seq: 0,
  };
  return new L10DagBuilder(state);
}

/**
 * §10.4.4 — Fluent builder. Engines call `emit(...)` / `addEdge(...)`
 * rather than building nodes and edges by hand; this guarantees every
 * created node is validated by the same rules.
 */
export class L10DagBuilder {
  constructor(private readonly state: MutableBuilder) {}

  emit(args: {
    node_class: L10DagNodeClass;
    hypothesis_subject_id: string;
    scope_type: string;
    scope_id: string;
    hypothesis_candidate_id?: string | null;
    deterministic_inputs: readonly string[];
    engine_id: string;
    engine_version: string;
  }): L10DagNode | null {
    if (!ALL_L10_DAG_NODE_CLASSES.includes(args.node_class)) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode.DAG_ILLEGAL_NODE_CLASS,
        source: 'L10DagBuilder.emit',
        hypothesis_run_id: this.state.hypothesis_run_id,
        hypothesis_subject_id: args.hypothesis_subject_id,
        hypothesis_candidate_id: args.hypothesis_candidate_id ?? null,
        detail: `illegal node_class: ${args.node_class as string}`,
      }));
      return null;
    }

    const stage = L10_NODE_CLASS_STAGE[args.node_class];
    if (!stage) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode.DAG_NODE_STAGE_MISMATCH,
        source: 'L10DagBuilder.emit',
        hypothesis_run_id: this.state.hypothesis_run_id,
        hypothesis_subject_id: args.hypothesis_subject_id,
        hypothesis_candidate_id: args.hypothesis_candidate_id ?? null,
        detail: `node class ${args.node_class} has no registered stage`,
      }));
      return null;
    }

    const candidateScoped = isL10CandidateScopedClass(args.node_class);
    if (candidateScoped && args.node_class !== L10DagNodeClass.CANDIDATE_NODE) {
      if (!args.hypothesis_candidate_id) {
        this.state.violations.push(violation({
          code: L10RuntimeViolationCode
            .DAG_CANDIDATE_NODE_MISSING_CANDIDATE_ID,
          source: 'L10DagBuilder.emit',
          hypothesis_run_id: this.state.hypothesis_run_id,
          hypothesis_subject_id: args.hypothesis_subject_id,
          hypothesis_candidate_id: null,
          detail:
            `${args.node_class} requires hypothesis_candidate_id`,
        }));
        return null;
      }
    }
    if (args.node_class === L10DagNodeClass.CANDIDATE_NODE &&
        !args.hypothesis_candidate_id) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode
          .DAG_CANDIDATE_NODE_MISSING_CANDIDATE_ID,
        source: 'L10DagBuilder.emit',
        hypothesis_run_id: this.state.hypothesis_run_id,
        hypothesis_subject_id: args.hypothesis_subject_id,
        hypothesis_candidate_id: null,
        detail: 'CANDIDATE_NODE requires hypothesis_candidate_id',
      }));
      return null;
    }
    if (!candidateScoped && args.hypothesis_candidate_id) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode
          .DAG_SUBJECT_NODE_CARRIES_CANDIDATE_ID,
        source: 'L10DagBuilder.emit',
        hypothesis_run_id: this.state.hypothesis_run_id,
        hypothesis_subject_id: args.hypothesis_subject_id,
        hypothesis_candidate_id: args.hypothesis_candidate_id,
        detail:
          `${args.node_class} is subject-scoped but carries a candidate_id`,
      }));
      return null;
    }

    const node_id = buildL10DagNodeId({
      node_class: args.node_class,
      hypothesis_run_id: this.state.hypothesis_run_id,
      hypothesis_subject_id: args.hypothesis_subject_id,
      scope_type: args.scope_type,
      scope_id: args.scope_id,
      hypothesis_candidate_id: args.hypothesis_candidate_id ?? null,
    });

    if (this.state.nodeIndex.has(node_id)) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode.DAG_DUPLICATE_NODE_ID,
        source: 'L10DagBuilder.emit',
        nodeId: node_id,
        hypothesis_run_id: this.state.hypothesis_run_id,
        hypothesis_subject_id: args.hypothesis_subject_id,
        hypothesis_candidate_id: args.hypothesis_candidate_id ?? null,
        detail: `duplicate node_id: ${node_id}`,
      }));
      return null;
    }

    const node: L10DagNode = {
      node_id,
      node_class: args.node_class,
      stage,
      hypothesis_subject_id: args.hypothesis_subject_id,
      hypothesis_candidate_id: args.hypothesis_candidate_id ?? null,
      scope_type: args.scope_type,
      scope_id: args.scope_id,
      deterministic_inputs: [...args.deterministic_inputs],
      engine_id: args.engine_id,
      engine_version: args.engine_version,
      created_at_ordinal: this.state.seq++,
    };
    this.state.nodes.push(node);
    this.state.nodeIndex.set(node_id, node);
    return node;
  }

  addEdge(args: {
    edge_class: L10DagEdgeClass;
    from_node_id: string;
    to_node_id: string;
  }): L10DagEdge | null {
    if (!ALL_L10_DAG_EDGE_CLASSES.includes(args.edge_class)) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode.DAG_ILLEGAL_EDGE_CLASS,
        source: 'L10DagBuilder.addEdge',
        hypothesis_run_id: this.state.hypothesis_run_id,
        detail: `illegal edge_class: ${args.edge_class as string}`,
      }));
      return null;
    }
    const from = this.state.nodeIndex.get(args.from_node_id);
    const to = this.state.nodeIndex.get(args.to_node_id);
    if (!from || !to) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode.DAG_UNRESOLVED_DEPENDENCY,
        source: 'L10DagBuilder.addEdge',
        hypothesis_run_id: this.state.hypothesis_run_id,
        detail:
          `edge references missing node(s): ` +
          `${args.from_node_id} -> ${args.to_node_id}`,
      }));
      return null;
    }
    if (!isLegalL10Edge(args.edge_class, from.node_class, to.node_class)) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode.DAG_ILLEGAL_EDGE_TRANSITION,
        source: 'L10DagBuilder.addEdge',
        hypothesis_run_id: this.state.hypothesis_run_id,
        hypothesis_subject_id: from.hypothesis_subject_id,
        detail:
          `illegal transition under ${args.edge_class}: ` +
          `${from.node_class} -> ${to.node_class}`,
      }));
      return null;
    }
    if (L10_STAGE_INDEX[to.stage] <= L10_STAGE_INDEX[from.stage]) {
      const code = classifyBackEdge(from.node_class, to.node_class);
      this.state.violations.push(violation({
        code,
        source: 'L10DagBuilder.addEdge',
        hypothesis_run_id: this.state.hypothesis_run_id,
        hypothesis_subject_id: from.hypothesis_subject_id,
        detail:
          `back-edge ${from.node_class}(${from.stage}) -> ` +
          `${to.node_class}(${to.stage}) is not permitted`,
      }));
      return null;
    }
    const edge: L10DagEdge = {
      edge_id: buildL10DagEdgeId(
        args.edge_class,
        args.from_node_id,
        args.to_node_id,
      ),
      edge_class: args.edge_class,
      from_node_id: args.from_node_id,
      to_node_id: args.to_node_id,
    };
    this.state.edges.push(edge);
    return edge;
  }

  build(): L10DagBuildResult {
    if (this.state.violations.length > 0) {
      return {
        ok: false,
        dag: null,
        violations: [...this.state.violations],
      };
    }
    const stagesPresent = new Set<L10DagStage>();
    for (const n of this.state.nodes) stagesPresent.add(n.stage);

    if (!stagesPresent.has(L10DagStage.S13_MATERIALIZATION)) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode.DAG_MISSING_TERMINAL_NODE,
        source: 'L10DagBuilder.build',
        hypothesis_run_id: this.state.hypothesis_run_id,
        detail: 'no MATERIALIZATION_NODE present',
      }));
    }
    if (stagesPresent.has(L10DagStage.S11_SHIFT_CONDITION) &&
        !stagesPresent.has(L10DagStage.S10_SPREAD)) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode.DAG_SHIFT_WITHOUT_SPREAD,
        source: 'L10DagBuilder.build',
        hypothesis_run_id: this.state.hypothesis_run_id,
        detail: 'SHIFT_CONDITION present without SPREAD',
      }));
    }
    if (stagesPresent.has(L10DagStage.S10_SPREAD) &&
        !stagesPresent.has(L10DagStage.S09_RANKING)) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode.DAG_SPREAD_WITHOUT_RANKING,
        source: 'L10DagBuilder.build',
        hypothesis_run_id: this.state.hypothesis_run_id,
        detail: 'SPREAD present without RANKING',
      }));
    }

    const cycle = detectL10Cycles(
      this.state.nodes.map(n => n.node_id),
      this.state.edges,
    );
    if (!cycle.acyclic) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode.DAG_CYCLE_DETECTED,
        source: 'L10DagBuilder.build',
        hypothesis_run_id: this.state.hypothesis_run_id,
        detail: `cycles detected: ${cycle.cycles.length}`,
        context: { cycles: cycle.cycles.map(c => [...c]) },
      }));
    }

    const ordered = [...this.state.nodes].sort(compareL10NodesDeterministic);
    const toposort = l10Toposort(ordered, this.state.edges);
    if (!toposort.ok) {
      this.state.violations.push(violation({
        code: L10RuntimeViolationCode.DAG_NON_DETERMINISTIC_ORDER,
        source: 'L10DagBuilder.build',
        hypothesis_run_id: this.state.hypothesis_run_id,
        detail: toposort.reason ?? 'toposort failed',
      }));
    }

    if (this.state.violations.length > 0) {
      return {
        ok: false,
        dag: null,
        violations: [...this.state.violations],
      };
    }

    const dag: L10HypothesisDag = {
      nodes: ordered,
      edges: [...this.state.edges].sort((a, b) =>
        a.edge_id < b.edge_id ? -1 : a.edge_id > b.edge_id ? 1 : 0,
      ),
      node_index: new Map(this.state.nodeIndex),
      topological_order: toposort.order,
    };
    return { ok: true, dag, violations: [] };
  }
}

function classifyBackEdge(
  from: L10DagNodeClass,
  to: L10DagNodeClass,
): L10RuntimeViolationCode {
  if (from === L10DagNodeClass.CONFIDENCE_NODE &&
      to === L10DagNodeClass.CANDIDATE_NODE) {
    return L10RuntimeViolationCode.DAG_CONFIDENCE_TO_CANDIDATE_BACKEDGE;
  }
  if (from === L10DagNodeClass.RANKING_NODE &&
      to === L10DagNodeClass.SUBJECT_NODE) {
    return L10RuntimeViolationCode.DAG_RANKING_TO_SUBJECT_BACKEDGE;
  }
  return L10RuntimeViolationCode.DAG_ILLEGAL_EDGE_TRANSITION;
}

function violation(args: {
  code: L10RuntimeViolationCode;
  source: string;
  detail: string;
  nodeId?: string;
  hypothesis_run_id?: string | null;
  hypothesis_subject_id?: string | null;
  hypothesis_candidate_id?: string | null;
  context?: Record<string, unknown>;
}): L10RuntimeViolation {
  return {
    code: args.code,
    source: args.source,
    nodeId: args.nodeId ?? null,
    hypothesis_run_id: args.hypothesis_run_id ?? null,
    hypothesis_subject_id: args.hypothesis_subject_id ?? null,
    hypothesis_candidate_id: args.hypothesis_candidate_id ?? null,
    detail: args.detail,
    context: args.context ?? {},
  };
}

/**
 * §10.4.4 — Compose a DAG from pre-built node and edge lists (used by
 * tests/invariants). Production code should use `createL10DagBuilder`.
 */
export function buildL10HypothesisDag(
  hypothesis_run_id: string,
  spec: {
    readonly nodeSpecs: readonly {
      readonly node_class: L10DagNodeClass;
      readonly hypothesis_subject_id: string;
      readonly scope_type: string;
      readonly scope_id: string;
      readonly hypothesis_candidate_id?: string | null;
      readonly deterministic_inputs: readonly string[];
      readonly engine_id: string;
      readonly engine_version: string;
    }[];
    readonly edgeSpecs: readonly {
      readonly edge_class: L10DagEdgeClass;
      readonly from_index: number;
      readonly to_index: number;
    }[];
  },
): L10DagBuildResult {
  const builder = createL10DagBuilder(hypothesis_run_id);
  const emitted: (L10DagNode | null)[] = [];
  for (const ns of spec.nodeSpecs) {
    emitted.push(builder.emit(ns));
  }
  for (const es of spec.edgeSpecs) {
    const from = emitted[es.from_index];
    const to = emitted[es.to_index];
    if (!from || !to) continue;
    builder.addEdge({
      edge_class: es.edge_class,
      from_node_id: from.node_id,
      to_node_id: to.node_id,
    });
  }
  return builder.build();
}

export { L10_CANDIDATE_SCOPED_CLASSES };
