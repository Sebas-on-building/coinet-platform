/**
 * L12.4 — DAG edge classes and legal transition matrix (§12.4.5, §12.4.6).
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import {
  L12_NODE_CLASS_STAGE,
  L12DagNodeClass,
  L12DagStage,
} from './scenario-dag-node';

export enum L12DagEdgeClass {
  INPUTS_TO_SUBJECT = 'INPUTS_TO_SUBJECT',
  SUBJECT_TO_INPUT_RESOLUTION = 'SUBJECT_TO_INPUT_RESOLUTION',
  INPUT_RESOLUTION_TO_CANDIDATES = 'INPUT_RESOLUTION_TO_CANDIDATES',
  CANDIDATES_TO_CONDITIONS = 'CANDIDATES_TO_CONDITIONS',
  CONDITIONS_TO_TRIGGERS = 'CONDITIONS_TO_TRIGGERS',
  CONDITIONS_TO_INVALIDATIONS = 'CONDITIONS_TO_INVALIDATIONS',
  TRIGGERS_TO_PATH_CONSTRUCTION = 'TRIGGERS_TO_PATH_CONSTRUCTION',
  INVALIDATIONS_TO_PATH_CONSTRUCTION = 'INVALIDATIONS_TO_PATH_CONSTRUCTION',
  PATHS_TO_CONFIDENCE = 'PATHS_TO_CONFIDENCE',
  CONDITIONS_TO_CONFIDENCE = 'CONDITIONS_TO_CONFIDENCE',
  TRIGGERS_TO_CONFIDENCE = 'TRIGGERS_TO_CONFIDENCE',
  INVALIDATIONS_TO_CONFIDENCE = 'INVALIDATIONS_TO_CONFIDENCE',
  CONFIDENCE_TO_RANKING = 'CONFIDENCE_TO_RANKING',
  PATHS_TO_RANKING = 'PATHS_TO_RANKING',
  RANKING_TO_SHIFT_CONDITIONS = 'RANKING_TO_SHIFT_CONDITIONS',
  CONFIDENCE_TO_SHIFT_CONDITIONS = 'CONFIDENCE_TO_SHIFT_CONDITIONS',
  SHIFT_CONDITIONS_TO_RESTRICTIONS = 'SHIFT_CONDITIONS_TO_RESTRICTIONS',
  RANKING_TO_RESTRICTIONS = 'RANKING_TO_RESTRICTIONS',
  RESTRICTIONS_TO_EVIDENCE = 'RESTRICTIONS_TO_EVIDENCE',
  ALL_OUTPUTS_TO_EVIDENCE = 'ALL_OUTPUTS_TO_EVIDENCE',
  EVIDENCE_TO_MATERIALIZATION = 'EVIDENCE_TO_MATERIALIZATION',
}

export const ALL_L12_DAG_EDGE_CLASSES: readonly L12DagEdgeClass[] =
  Object.values(L12DagEdgeClass);

export interface L12DagEdgeEndpoints {
  readonly from: L12DagNodeClass;
  readonly to: L12DagNodeClass;
}

export const L12_LEGAL_EDGE_TRANSITIONS: Readonly<Record<L12DagEdgeClass, L12DagEdgeEndpoints>> = {
  [L12DagEdgeClass.INPUTS_TO_SUBJECT]: {
    from: L12DagNodeClass.INPUT_SURFACES,
    to: L12DagNodeClass.SCENARIO_SUBJECT,
  },
  [L12DagEdgeClass.SUBJECT_TO_INPUT_RESOLUTION]: {
    from: L12DagNodeClass.SCENARIO_SUBJECT,
    to: L12DagNodeClass.INPUT_RESOLUTION,
  },
  [L12DagEdgeClass.INPUT_RESOLUTION_TO_CANDIDATES]: {
    from: L12DagNodeClass.INPUT_RESOLUTION,
    to: L12DagNodeClass.CANDIDATE_GENERATION,
  },
  [L12DagEdgeClass.CANDIDATES_TO_CONDITIONS]: {
    from: L12DagNodeClass.CANDIDATE_GENERATION,
    to: L12DagNodeClass.CONDITION_RESOLUTION,
  },
  [L12DagEdgeClass.CONDITIONS_TO_TRIGGERS]: {
    from: L12DagNodeClass.CONDITION_RESOLUTION,
    to: L12DagNodeClass.TRIGGER_RESOLUTION,
  },
  [L12DagEdgeClass.CONDITIONS_TO_INVALIDATIONS]: {
    from: L12DagNodeClass.CONDITION_RESOLUTION,
    to: L12DagNodeClass.INVALIDATION_RESOLUTION,
  },
  [L12DagEdgeClass.TRIGGERS_TO_PATH_CONSTRUCTION]: {
    from: L12DagNodeClass.TRIGGER_RESOLUTION,
    to: L12DagNodeClass.PATH_CONSTRUCTION,
  },
  [L12DagEdgeClass.INVALIDATIONS_TO_PATH_CONSTRUCTION]: {
    from: L12DagNodeClass.INVALIDATION_RESOLUTION,
    to: L12DagNodeClass.PATH_CONSTRUCTION,
  },
  [L12DagEdgeClass.PATHS_TO_CONFIDENCE]: {
    from: L12DagNodeClass.PATH_CONSTRUCTION,
    to: L12DagNodeClass.PATH_CONFIDENCE,
  },
  [L12DagEdgeClass.CONDITIONS_TO_CONFIDENCE]: {
    from: L12DagNodeClass.CONDITION_RESOLUTION,
    to: L12DagNodeClass.PATH_CONFIDENCE,
  },
  [L12DagEdgeClass.TRIGGERS_TO_CONFIDENCE]: {
    from: L12DagNodeClass.TRIGGER_RESOLUTION,
    to: L12DagNodeClass.PATH_CONFIDENCE,
  },
  [L12DagEdgeClass.INVALIDATIONS_TO_CONFIDENCE]: {
    from: L12DagNodeClass.INVALIDATION_RESOLUTION,
    to: L12DagNodeClass.PATH_CONFIDENCE,
  },
  [L12DagEdgeClass.CONFIDENCE_TO_RANKING]: {
    from: L12DagNodeClass.PATH_CONFIDENCE,
    to: L12DagNodeClass.SCENARIO_RANKING,
  },
  [L12DagEdgeClass.PATHS_TO_RANKING]: {
    from: L12DagNodeClass.PATH_CONSTRUCTION,
    to: L12DagNodeClass.SCENARIO_RANKING,
  },
  [L12DagEdgeClass.RANKING_TO_SHIFT_CONDITIONS]: {
    from: L12DagNodeClass.SCENARIO_RANKING,
    to: L12DagNodeClass.SHIFT_CONDITIONS,
  },
  [L12DagEdgeClass.CONFIDENCE_TO_SHIFT_CONDITIONS]: {
    from: L12DagNodeClass.PATH_CONFIDENCE,
    to: L12DagNodeClass.SHIFT_CONDITIONS,
  },
  [L12DagEdgeClass.SHIFT_CONDITIONS_TO_RESTRICTIONS]: {
    from: L12DagNodeClass.SHIFT_CONDITIONS,
    to: L12DagNodeClass.RESTRICTIONS,
  },
  [L12DagEdgeClass.RANKING_TO_RESTRICTIONS]: {
    from: L12DagNodeClass.SCENARIO_RANKING,
    to: L12DagNodeClass.RESTRICTIONS,
  },
  [L12DagEdgeClass.RESTRICTIONS_TO_EVIDENCE]: {
    from: L12DagNodeClass.RESTRICTIONS,
    to: L12DagNodeClass.EVIDENCE_PACK,
  },
  [L12DagEdgeClass.ALL_OUTPUTS_TO_EVIDENCE]: {
    from: L12DagNodeClass.SCENARIO_RANKING,
    to: L12DagNodeClass.EVIDENCE_PACK,
  },
  [L12DagEdgeClass.EVIDENCE_TO_MATERIALIZATION]: {
    from: L12DagNodeClass.EVIDENCE_PACK,
    to: L12DagNodeClass.MATERIALIZATION,
  },
};

/**
 * Legal-only-if forward in stage order. (Enforced *in addition to* the
 * registered transition matrix above.)
 */
export function isL12LegalEdgeForward(
  from: L12DagNodeClass,
  to: L12DagNodeClass,
): boolean {
  return L12_NODE_CLASS_STAGE[from] < L12_NODE_CLASS_STAGE[to];
}

export function isL12RegisteredEdge(
  edge_class: L12DagEdgeClass,
  from: L12DagNodeClass,
  to: L12DagNodeClass,
): boolean {
  const reg = L12_LEGAL_EDGE_TRANSITIONS[edge_class];
  return reg.from === from && reg.to === to;
}

export interface L12ScenarioDagEdge {
  readonly edge_id: string;
  readonly edge_class: L12DagEdgeClass;
  readonly from_node_id: string;
  readonly to_node_id: string;
  readonly from_class: L12DagNodeClass;
  readonly to_class: L12DagNodeClass;
  readonly from_stage: L12DagStage;
  readonly to_stage: L12DagStage;
  readonly policy_version: string;
  readonly replay_hash: string;
}

export function buildL12ScenarioDagEdge(input: {
  edge_class: L12DagEdgeClass;
  from_node_id: string;
  to_node_id: string;
  policy_version: string;
}): L12ScenarioDagEdge {
  const reg = L12_LEGAL_EDGE_TRANSITIONS[input.edge_class];
  const from_stage = L12_NODE_CLASS_STAGE[reg.from];
  const to_stage = L12_NODE_CLASS_STAGE[reg.to];
  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.dag.edge',
    policy_version: input.policy_version,
    material: {
      edge_class: input.edge_class,
      from_node_id: input.from_node_id,
      to_node_id: input.to_node_id,
    },
  });
  const edge_id = `l12.edge.${input.edge_class}.${replay_hash}`;
  return {
    edge_id,
    edge_class: input.edge_class,
    from_node_id: input.from_node_id,
    to_node_id: input.to_node_id,
    from_class: reg.from,
    to_class: reg.to,
    from_stage,
    to_stage,
    policy_version: input.policy_version,
    replay_hash,
  };
}
