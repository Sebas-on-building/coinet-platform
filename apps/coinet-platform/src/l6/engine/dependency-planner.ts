/**
 * L6.4 — DependencyPlanner
 *
 * §6.4.4 — Given a set of newly arrived facts (triggers), produces a
 * deterministic execution plan:
 *   - classifies each dependency relationship
 *   - resolves impacted scopes
 *   - topologically orders primitive nodes
 *   - classifies the run as mandatory / optional / no-op
 *   - classifies late-data recomputation semantics
 *   - maintains per-scope watermarks so reruns are bounded
 *
 * This is where "nothing runs without legal upstream resolution" is
 * enforced before any compute engine is called.
 */

import {
  L6DagNode,
  L6DagNodeClass,
  L6NodeExecutionState,
  L6ScopeRef,
  canonicalNodeId,
} from '../runtime/dag-node';
import {
  L6DagEdge,
  L6EdgeClass,
} from '../runtime/dag-edge';
import { buildL6Dag, L6Dag, L6DagStructuralViolation } from '../runtime/dag-builder';
import { topoSort } from '../runtime/dag-toposort';
import {
  L6ComputeRun,
  L6ComputeRunMode,
  L6TriggerSource,
} from '../runtime/compute-run';
import { L6Watermark, watermarkKey } from '../runtime/execution-context';
import { FeatureDefinitionContract } from '../contracts/feature-definition.contract';
import { EventDefinitionContract } from '../contracts/event-definition.contract';

export enum L6DependencyClass {
  HARD_TRUTH = 'HARD_TRUTH',
  HARD_CONTEXT = 'HARD_CONTEXT',
  OPTIONAL_CONTEXT = 'OPTIONAL_CONTEXT',
  BASELINE = 'BASELINE',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  EVENT_SUPPORT = 'EVENT_SUPPORT',
  MATERIALIZATION = 'MATERIALIZATION',
}

export const ALL_DEPENDENCY_CLASSES: readonly L6DependencyClass[] = Object.values(L6DependencyClass);

export enum L6RecomputeClass {
  MANDATORY = 'MANDATORY',
  OPTIONAL = 'OPTIONAL',
  NO_OP = 'NO_OP',
}

export enum L6LateDataRecomputeClass {
  HISTORICAL_ONLY = 'HISTORICAL_ONLY',
  EVENT_HISTORY_ONLY = 'EVENT_HISTORY_ONLY',
  CURRENT_STATE_REMATERIALIZATION_CANDIDATE = 'CURRENT_STATE_REMATERIALIZATION_CANDIDATE',
  NO_OP = 'NO_OP',
}

export interface L6DependencyLink {
  readonly from_primitive_id: string;
  readonly to_primitive_id: string;
  readonly dependency_class: L6DependencyClass;
}

export interface L6PlanTrigger {
  readonly trigger_source: L6TriggerSource;
  readonly scope: L6ScopeRef;
  readonly input_surface_id: string;
  readonly fact_as_of: string;
  readonly is_late: boolean;
}

export interface L6ExecutionPlan {
  readonly compute_run: L6ComputeRun;
  readonly dag: L6Dag;
  readonly topological_order: readonly string[];
  readonly impacted_scopes: readonly L6ScopeRef[];
  readonly recompute_class: L6RecomputeClass;
  readonly late_data_class: L6LateDataRecomputeClass | null;
  readonly dependency_links: readonly L6DependencyLink[];
  readonly violations: readonly L6DagStructuralViolation[];
}

export class DependencyPlanner {
  private readonly features = new Map<string, FeatureDefinitionContract>();
  private readonly events = new Map<string, EventDefinitionContract>();
  private readonly watermarks = new Map<string, L6Watermark>();

  registerFeature(def: FeatureDefinitionContract): void {
    this.features.set(def.primitive_id, def);
  }

  registerEvent(def: EventDefinitionContract): void {
    this.events.set(def.primitive_id, def);
  }

  setWatermark(w: L6Watermark): void {
    this.watermarks.set(watermarkKey(w.primitive_id, w.scope), w);
  }

  getWatermark(primitive_id: string, scope: L6ScopeRef): L6Watermark | undefined {
    return this.watermarks.get(watermarkKey(primitive_id, scope));
  }

  /**
   * Deterministic dependency classification for a feature's declared inputs.
   * Ordering is stable on (role, surface_id).
   */
  classifyFeatureDependencies(def: FeatureDefinitionContract): readonly L6DependencyLink[] {
    const links: L6DependencyLink[] = [];
    for (const s of def.required_truth_inputs) {
      links.push({ from_primitive_id: s.surfaceId, to_primitive_id: def.primitive_id, dependency_class: L6DependencyClass.HARD_TRUTH });
    }
    for (const s of def.required_context_inputs) {
      links.push({ from_primitive_id: s.surfaceId, to_primitive_id: def.primitive_id, dependency_class: L6DependencyClass.HARD_CONTEXT });
    }
    for (const s of def.optional_context_inputs) {
      links.push({ from_primitive_id: s.surfaceId, to_primitive_id: def.primitive_id, dependency_class: L6DependencyClass.OPTIONAL_CONTEXT });
    }
    for (const s of def.baseline_inputs) {
      links.push({ from_primitive_id: s.surfaceId, to_primitive_id: def.primitive_id, dependency_class: L6DependencyClass.BASELINE });
    }
    for (const s of def.evidence_only_inputs) {
      links.push({ from_primitive_id: s.surfaceId, to_primitive_id: def.primitive_id, dependency_class: L6DependencyClass.EVIDENCE_ONLY });
    }
    return links.sort((a, b) => {
      if (a.dependency_class !== b.dependency_class) return a.dependency_class < b.dependency_class ? -1 : 1;
      return a.from_primitive_id < b.from_primitive_id ? -1 : a.from_primitive_id > b.from_primitive_id ? 1 : 0;
    });
  }

  /**
   * Given a trigger, compute the scopes impacted. Conservative policy: only the
   * trigger scope is directly impacted; cross-scope propagation must be declared
   * via explicit peer/regime relationships (future work for L6.5).
   */
  impactedScopes(trigger: L6PlanTrigger): readonly L6ScopeRef[] {
    return [trigger.scope];
  }

  classifyRecompute(trigger: L6PlanTrigger, primitive_id: string, scope: L6ScopeRef): L6RecomputeClass {
    const w = this.getWatermark(primitive_id, scope);
    if (!w) return L6RecomputeClass.MANDATORY;
    if (trigger.fact_as_of <= w.last_processed_as_of && !w.dirty) return L6RecomputeClass.NO_OP;
    return L6RecomputeClass.MANDATORY;
  }

  classifyLateData(trigger: L6PlanTrigger, primitive_id: string): L6LateDataRecomputeClass {
    if (!trigger.is_late) return L6LateDataRecomputeClass.HISTORICAL_ONLY;
    const feat = this.features.get(primitive_id);
    const ev = this.events.get(primitive_id);
    const lateDataPolicy = feat?.late_data_policy ?? ev?.late_data_policy;
    if (!lateDataPolicy) return L6LateDataRecomputeClass.NO_OP;
    if (lateDataPolicy === 'REJECT_LATE') return L6LateDataRecomputeClass.NO_OP;
    if (lateDataPolicy === 'HISTORICAL_RECOMPUTE_ONLY') return L6LateDataRecomputeClass.HISTORICAL_ONLY;
    if (lateDataPolicy === 'GOVERNED_REMATERIALIZATION') return L6LateDataRecomputeClass.CURRENT_STATE_REMATERIALIZATION_CANDIDATE;
    return L6LateDataRecomputeClass.NO_OP;
  }

  /**
   * Builds a plan for a single primitive feature compute. This is the most
   * common planning shape and it keeps the DAG minimal: INPUT → FEATURE →
   * EVIDENCE → MATERIALIZATION.
   */
  planFeatureRun(
    compute_run: L6ComputeRun,
    trigger: L6PlanTrigger,
    feature_id: string,
  ): L6ExecutionPlan {
    const feat = this.features.get(feature_id);
    if (!feat) throw new Error(`[L6.4] Unknown feature "${feature_id}".`);

    const scope = trigger.scope;
    const links = this.classifyFeatureDependencies(feat);

    const inputNodes: L6DagNode[] = [];
    const edges: L6DagEdge[] = [];

    const featureNode: L6DagNode = {
      node_id: canonicalNodeId(L6DagNodeClass.PRIMITIVE_FEATURE, feat.primitive_id, scope),
      node_class: L6DagNodeClass.PRIMITIVE_FEATURE,
      primitive_id: feat.primitive_id,
      primitive_version: feat.version,
      scope,
      upstream: [],
      downstream: [],
      execution_state: L6NodeExecutionState.PENDING,
      meta: {},
    };

    for (const link of links) {
      if (link.dependency_class === L6DependencyClass.EVIDENCE_ONLY) continue;
      const inputNode: L6DagNode = {
        node_id: canonicalNodeId(L6DagNodeClass.INPUT, link.from_primitive_id, scope),
        node_class: L6DagNodeClass.INPUT,
        primitive_id: link.from_primitive_id,
        primitive_version: null,
        scope,
        upstream: [],
        downstream: [],
        execution_state: L6NodeExecutionState.READY,
        meta: { dependency_class: link.dependency_class },
      };
      inputNodes.push(inputNode);

      const edgeClass: L6EdgeClass =
        link.dependency_class === L6DependencyClass.BASELINE ? L6EdgeClass.BASELINE
        : link.dependency_class === L6DependencyClass.HARD_CONTEXT
            || link.dependency_class === L6DependencyClass.OPTIONAL_CONTEXT
          ? L6EdgeClass.CONTEXT
          : L6EdgeClass.DATA;

      edges.push({
        from_node_id: inputNode.node_id,
        to_node_id: featureNode.node_id,
        edge_class: edgeClass,
        required:
          link.dependency_class === L6DependencyClass.HARD_TRUTH
          || link.dependency_class === L6DependencyClass.HARD_CONTEXT
          || link.dependency_class === L6DependencyClass.BASELINE,
        meta: {},
      });
    }

    const evidenceNode: L6DagNode = {
      node_id: canonicalNodeId(L6DagNodeClass.EVIDENCE_PACK, feat.primitive_id, scope),
      node_class: L6DagNodeClass.EVIDENCE_PACK,
      primitive_id: feat.primitive_id,
      primitive_version: feat.version,
      scope,
      upstream: [],
      downstream: [],
      execution_state: L6NodeExecutionState.PENDING,
      meta: {},
    };
    edges.push({
      from_node_id: featureNode.node_id,
      to_node_id: evidenceNode.node_id,
      edge_class: L6EdgeClass.MATERIALIZATION,
      required: true,
      meta: {},
    });

    const matNode: L6DagNode = {
      node_id: canonicalNodeId(L6DagNodeClass.MATERIALIZATION, feat.primitive_id, scope),
      node_class: L6DagNodeClass.MATERIALIZATION,
      primitive_id: feat.primitive_id,
      primitive_version: feat.version,
      scope,
      upstream: [],
      downstream: [],
      execution_state: L6NodeExecutionState.PENDING,
      meta: {},
    };
    edges.push({
      from_node_id: featureNode.node_id,
      to_node_id: matNode.node_id,
      edge_class: L6EdgeClass.MATERIALIZATION,
      required: true,
      meta: {},
    });
    edges.push({
      from_node_id: evidenceNode.node_id,
      to_node_id: matNode.node_id,
      edge_class: L6EdgeClass.MATERIALIZATION,
      required: true,
      meta: {},
    });

    const { dag, violations } = buildL6Dag(
      [...inputNodes, featureNode, evidenceNode, matNode],
      edges,
    );
    const topo = dag ? topoSort(dag) : { order: [], cyclePath: [] };

    const recompute = this.classifyRecompute(trigger, feat.primitive_id, scope);
    const lateClass = trigger.is_late ? this.classifyLateData(trigger, feat.primitive_id) : null;

    return {
      compute_run,
      dag: dag ?? { nodes: new Map(), edges: [], adjacency: new Map(), reverseAdjacency: new Map() },
      topological_order: topo.order,
      impacted_scopes: this.impactedScopes(trigger),
      recompute_class: recompute,
      late_data_class: lateClass,
      dependency_links: links,
      violations,
    };
  }

  isHistoricalMode(compute_run: L6ComputeRun): boolean {
    return compute_run.mode !== L6ComputeRunMode.LIVE;
  }
}
