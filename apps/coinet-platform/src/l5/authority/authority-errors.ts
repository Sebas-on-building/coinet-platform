/**
 * L5.2 Authority Model — Error Codes
 *
 * Every error encodes a specific violation of storage sovereignty law.
 */

export enum L5AuthorityErrorCode {
  /** More than one store claims primary authority for the same datum class. */
  DUAL_AUTHORITY = 'L5_AUTHORITY_DUAL_AUTHORITY',

  /** No primary authority store assigned for an authority-bearing datum. */
  NO_PRIMARY_AUTHORITY = 'L5_AUTHORITY_NO_PRIMARY_AUTHORITY',

  /** Store chosen as primary is constitutionally illegal for that state class. */
  ILLEGAL_AUTHORITY_STORE = 'L5_AUTHORITY_ILLEGAL_AUTHORITY_STORE',

  /** A projection has been marked or is behaving as authoritative. */
  PROJECTION_MASQUERADING_AS_AUTHORITY = 'L5_AUTHORITY_PROJECTION_AS_AUTHORITY',

  /** Manifest finalized in an illegal terminal state. */
  ILLEGAL_MANIFEST_FINALIZATION = 'L5_AUTHORITY_ILLEGAL_MANIFEST_FINALIZATION',

  /** Manifest transition violates the legal state machine. */
  ILLEGAL_MANIFEST_TRANSITION = 'L5_AUTHORITY_ILLEGAL_MANIFEST_TRANSITION',

  /** Required projection missing at finalization. */
  REQUIRED_PROJECTION_INCOMPLETE = 'L5_AUTHORITY_REQUIRED_PROJECTION_INCOMPLETE',

  /** Archive-required write finalized without archive linkage. */
  ARCHIVE_LINKAGE_MISSING = 'L5_AUTHORITY_ARCHIVE_LINKAGE_MISSING',

  /** Repair attempted to alter authority semantics rather than restoring projection completeness. */
  REPAIR_AUTHORITY_MUTATION = 'L5_AUTHORITY_REPAIR_AUTHORITY_MUTATION',

  /** Projection loss misreported as authority truth loss. */
  PROJECTION_LOSS_MISREPORTED = 'L5_AUTHORITY_PROJECTION_LOSS_MISREPORTED',

  /** Authority allocation contradicts L5.1 state-class classification. */
  CLASSIFICATION_CONTRADICTION = 'L5_AUTHORITY_CLASSIFICATION_CONTRADICTION',

  /** Shadow authority detected: a non-authoritative surface is acting as truth source. */
  SHADOW_AUTHORITY_DETECTED = 'L5_AUTHORITY_SHADOW_AUTHORITY_DETECTED',
}

export class L5AuthorityError extends Error {
  public readonly code: L5AuthorityErrorCode;
  public readonly details: Record<string, unknown>;

  constructor(code: L5AuthorityErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(`[${code}] ${message}`);
    this.name = 'L5AuthorityError';
    this.code = code;
    this.details = details;
  }
}
