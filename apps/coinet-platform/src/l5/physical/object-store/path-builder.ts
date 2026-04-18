/**
 * L5.6 — Object Storage Path Builder
 *
 * §5.6.13 — Object storage path law
 * §5.6.13.1 — Required path families
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PATH FAMILY
// ═══════════════════════════════════════════════════════════════════════════════

export enum ObjectPathFamily {
  RAW_SOURCE = 'raw',
  NORMALIZED_ENVELOPE = 'normalized',
  BACKFILL = 'backfill',
  MODEL_IO = 'model_io',
  REPORT_RENDER = 'reports',
  SNAPSHOT = 'snapshots',
  REPLAY_BUNDLE = 'replay',
  FORENSIC_EXPORT = 'forensics',
}

export const ALL_OBJECT_PATH_FAMILIES: readonly ObjectPathFamily[] = Object.values(ObjectPathFamily);

// ═══════════════════════════════════════════════════════════════════════════════
// PATH INPUTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ObjectPathInput {
  readonly env: string;
  readonly bucket: string;
}

export interface RawSourcePathInput extends ObjectPathInput {
  readonly sourceClass: string;
  readonly provider: string;
  readonly traceId: string;
  readonly envelopeId: string;
  readonly payloadHash: string;
  readonly observedAt: Date;
}

export interface NormalizedEnvelopePathInput extends ObjectPathInput {
  readonly producerService: string;
  readonly traceId: string;
  readonly envelopeId: string;
  readonly observedAt: Date;
}

export interface BackfillPathInput extends ObjectPathInput {
  readonly jobId: string;
  readonly partNumber: number;
  readonly payloadHash: string;
}

export interface ModelIOPathInput extends ObjectPathInput {
  readonly modelName: string;
  readonly runId: string;
  readonly kind: 'input' | 'output';
  readonly payloadHash: string;
}

export interface ReportRenderPathInput extends ObjectPathInput {
  readonly reportId: string;
  readonly reportVersion: string;
  readonly payloadHash: string;
}

export interface SnapshotPathInput extends ObjectPathInput {
  readonly scoreId: string;
  readonly kind: 'feature' | 'explanation';
  readonly payloadHash: string;
}

export interface ReplayBundlePathInput extends ObjectPathInput {
  readonly replayWindowId: string;
  readonly traceId: string;
  readonly payloadHash: string;
}

export interface ForensicExportPathInput extends ObjectPathInput {
  readonly caseId: string;
  readonly traceId: string;
  readonly payloadHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function rootPrefix(bucket: string, env: string): string {
  return `${bucket}/${env}/coinet-l5`;
}

function dateParts(d: Date): { yyyy: string; mm: string; dd: string; hh: string } {
  return {
    yyyy: d.getUTCFullYear().toString(),
    mm: String(d.getUTCMonth() + 1).padStart(2, '0'),
    dd: String(d.getUTCDate()).padStart(2, '0'),
    hh: String(d.getUTCHours()).padStart(2, '0'),
  };
}

export function buildRawSourcePath(input: RawSourcePathInput): string {
  const { yyyy, mm, dd, hh } = dateParts(input.observedAt);
  return `${rootPrefix(input.bucket, input.env)}/raw/source_class=${input.sourceClass}/provider=${input.provider}/yyyy=${yyyy}/mm=${mm}/dd=${dd}/hh=${hh}/trace=${input.traceId}/envelope=${input.envelopeId}_${input.payloadHash}.json.zst`;
}

export function buildNormalizedEnvelopePath(input: NormalizedEnvelopePathInput): string {
  const { yyyy, mm, dd } = dateParts(input.observedAt);
  return `${rootPrefix(input.bucket, input.env)}/normalized/producer=${input.producerService}/yyyy=${yyyy}/mm=${mm}/dd=${dd}/trace=${input.traceId}/envelope=${input.envelopeId}.json.zst`;
}

export function buildBackfillPath(input: BackfillPathInput): string {
  return `${rootPrefix(input.bucket, input.env)}/backfill/job=${input.jobId}/part=${input.partNumber}_${input.payloadHash}.parquet.zst`;
}

export function buildModelIOPath(input: ModelIOPathInput): string {
  return `${rootPrefix(input.bucket, input.env)}/model_io/model=${input.modelName}/run=${input.runId}/kind=${input.kind}_${input.payloadHash}.json.zst`;
}

export function buildReportRenderPath(input: ReportRenderPathInput): string {
  return `${rootPrefix(input.bucket, input.env)}/reports/report_id=${input.reportId}/version=${input.reportVersion}/render_${input.payloadHash}.html.zst`;
}

export function buildSnapshotPath(input: SnapshotPathInput): string {
  return `${rootPrefix(input.bucket, input.env)}/snapshots/score_id=${input.scoreId}/kind=${input.kind}_${input.payloadHash}.json.zst`;
}

export function buildReplayBundlePath(input: ReplayBundlePathInput): string {
  return `${rootPrefix(input.bucket, input.env)}/replay/window=${input.replayWindowId}/trace=${input.traceId}/bundle_${input.payloadHash}.json.zst`;
}

export function buildForensicExportPath(input: ForensicExportPathInput): string {
  return `${rootPrefix(input.bucket, input.env)}/forensics/case=${input.caseId}/trace=${input.traceId}/artifact_${input.payloadHash}.json.zst`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const PATH_ROOT_PATTERN = /^[a-z0-9\-]+\/[a-z0-9_]+\/coinet-l5\//;

export function isValidL5ObjectPath(path: string): boolean {
  return PATH_ROOT_PATTERN.test(path);
}

export function extractPathFamily(path: string): ObjectPathFamily | null {
  for (const family of ALL_OBJECT_PATH_FAMILIES) {
    if (path.includes(`/coinet-l5/${family}/`)) return family;
  }
  return null;
}

export const REQUIRED_COMPRESSION = '.zst' as const;

export function hasRequiredCompression(path: string): boolean {
  return path.endsWith('.zst');
}
