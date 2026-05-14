/**
 * L12.4 — DAG node classes, stages, and node identity (§12.4.3, §12.4.4, §12.4.7).
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';

export enum L12DagNodeClass {
  INPUT_SURFACES = 'INPUT_SURFACES',
  SCENARIO_SUBJECT = 'SCENARIO_SUBJECT',
  INPUT_RESOLUTION = 'INPUT_RESOLUTION',
  CANDIDATE_GENERATION = 'CANDIDATE_GENERATION',
  CONDITION_RESOLUTION = 'CONDITION_RESOLUTION',
  TRIGGER_RESOLUTION = 'TRIGGER_RESOLUTION',
  INVALIDATION_RESOLUTION = 'INVALIDATION_RESOLUTION',
  PATH_CONSTRUCTION = 'PATH_CONSTRUCTION',
  PATH_CONFIDENCE = 'PATH_CONFIDENCE',
  SCENARIO_RANKING = 'SCENARIO_RANKING',
  SHIFT_CONDITIONS = 'SHIFT_CONDITIONS',
  RESTRICTIONS = 'RESTRICTIONS',
  EVIDENCE_PACK = 'EVIDENCE_PACK',
  MATERIALIZATION = 'MATERIALIZATION',
}

export const ALL_L12_DAG_NODE_CLASSES: readonly L12DagNodeClass[] =
  Object.values(L12DagNodeClass);

export enum L12DagStage {
  STAGE_00_INPUT_SURFACES = 0,
  STAGE_01_SCENARIO_SUBJECT = 1,
  STAGE_02_INPUT_RESOLUTION = 2,
  STAGE_03_CANDIDATE_GENERATION = 3,
  STAGE_04_CONDITION_RESOLUTION = 4,
  STAGE_05_TRIGGER_RESOLUTION = 5,
  STAGE_06_INVALIDATION_RESOLUTION = 6,
  STAGE_07_PATH_CONSTRUCTION = 7,
  STAGE_08_PATH_CONFIDENCE = 8,
  STAGE_09_SCENARIO_RANKING = 9,
  STAGE_10_SHIFT_CONDITIONS = 10,
  STAGE_11_RESTRICTIONS = 11,
  STAGE_12_EVIDENCE_PACK = 12,
  STAGE_13_MATERIALIZATION = 13,
}

export const ALL_L12_DAG_STAGES: readonly L12DagStage[] = [
  L12DagStage.STAGE_00_INPUT_SURFACES,
  L12DagStage.STAGE_01_SCENARIO_SUBJECT,
  L12DagStage.STAGE_02_INPUT_RESOLUTION,
  L12DagStage.STAGE_03_CANDIDATE_GENERATION,
  L12DagStage.STAGE_04_CONDITION_RESOLUTION,
  L12DagStage.STAGE_05_TRIGGER_RESOLUTION,
  L12DagStage.STAGE_06_INVALIDATION_RESOLUTION,
  L12DagStage.STAGE_07_PATH_CONSTRUCTION,
  L12DagStage.STAGE_08_PATH_CONFIDENCE,
  L12DagStage.STAGE_09_SCENARIO_RANKING,
  L12DagStage.STAGE_10_SHIFT_CONDITIONS,
  L12DagStage.STAGE_11_RESTRICTIONS,
  L12DagStage.STAGE_12_EVIDENCE_PACK,
  L12DagStage.STAGE_13_MATERIALIZATION,
];

export const L12_NODE_CLASS_STAGE: Readonly<Record<L12DagNodeClass, L12DagStage>> = {
  [L12DagNodeClass.INPUT_SURFACES]: L12DagStage.STAGE_00_INPUT_SURFACES,
  [L12DagNodeClass.SCENARIO_SUBJECT]: L12DagStage.STAGE_01_SCENARIO_SUBJECT,
  [L12DagNodeClass.INPUT_RESOLUTION]: L12DagStage.STAGE_02_INPUT_RESOLUTION,
  [L12DagNodeClass.CANDIDATE_GENERATION]: L12DagStage.STAGE_03_CANDIDATE_GENERATION,
  [L12DagNodeClass.CONDITION_RESOLUTION]: L12DagStage.STAGE_04_CONDITION_RESOLUTION,
  [L12DagNodeClass.TRIGGER_RESOLUTION]: L12DagStage.STAGE_05_TRIGGER_RESOLUTION,
  [L12DagNodeClass.INVALIDATION_RESOLUTION]: L12DagStage.STAGE_06_INVALIDATION_RESOLUTION,
  [L12DagNodeClass.PATH_CONSTRUCTION]: L12DagStage.STAGE_07_PATH_CONSTRUCTION,
  [L12DagNodeClass.PATH_CONFIDENCE]: L12DagStage.STAGE_08_PATH_CONFIDENCE,
  [L12DagNodeClass.SCENARIO_RANKING]: L12DagStage.STAGE_09_SCENARIO_RANKING,
  [L12DagNodeClass.SHIFT_CONDITIONS]: L12DagStage.STAGE_10_SHIFT_CONDITIONS,
  [L12DagNodeClass.RESTRICTIONS]: L12DagStage.STAGE_11_RESTRICTIONS,
  [L12DagNodeClass.EVIDENCE_PACK]: L12DagStage.STAGE_12_EVIDENCE_PACK,
  [L12DagNodeClass.MATERIALIZATION]: L12DagStage.STAGE_13_MATERIALIZATION,
};

export function isL12LegalNodeClassStage(
  node_class: L12DagNodeClass,
  stage: L12DagStage,
): boolean {
  return L12_NODE_CLASS_STAGE[node_class] === stage;
}

/**
 * §12.4.7 — Deterministic node id.
 *
 * Format: `l12.node.{stage}.{node_class}.{fnv96(subject_id|policy_version)}`
 */
export function buildL12DagNodeId(input: {
  scenario_subject_id: string;
  node_class: L12DagNodeClass;
  stage: L12DagStage;
  policy_version: string;
}): string {
  const hash = buildL12ScenarioReplayHash({
    domain: 'l12.dag.node',
    policy_version: input.policy_version,
    material: {
      scenario_subject_id: input.scenario_subject_id,
      node_class: input.node_class,
      stage: input.stage,
    },
  });
  return `l12.node.${input.stage}.${input.node_class}.${hash}`;
}

export interface L12ScenarioDagNode {
  readonly node_id: string;
  readonly node_class: L12DagNodeClass;
  readonly stage: L12DagStage;
  readonly scenario_subject_id: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

export function buildL12ScenarioDagNode(input: {
  scenario_subject_id: string;
  node_class: L12DagNodeClass;
  policy_version: string;
}): L12ScenarioDagNode {
  const stage = L12_NODE_CLASS_STAGE[input.node_class];
  const node_id = buildL12DagNodeId({
    scenario_subject_id: input.scenario_subject_id,
    node_class: input.node_class,
    stage,
    policy_version: input.policy_version,
  });
  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.dag.node.replay',
    policy_version: input.policy_version,
    material: {
      node_id,
      node_class: input.node_class,
      stage,
      scenario_subject_id: input.scenario_subject_id,
    },
  });
  return {
    node_id,
    node_class: input.node_class,
    stage,
    scenario_subject_id: input.scenario_subject_id,
    policy_version: input.policy_version,
    replay_hash,
  };
}
