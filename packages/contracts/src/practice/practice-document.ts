/**
 * Independent-practice patient documents, review records and signatures.
 *
 * These contracts describe document metadata and clinical workflow.
 * Actual file transfer, signed URLs, virus scanning and object storage
 * are implementation concerns handled in later tasks.
 */

import type {
  IsoDateTime,
  WonFlowId,
} from "../organization/hierarchy";

import type {
  IsoDate,
} from "../patient/identity";

export type PracticeDocumentCategory =
  | "previous-visit"
  | "prescription"
  | "laboratory-report"
  | "radiology-report"
  | "histopathology-report"
  | "discharge-summary"
  | "referral"
  | "medical-certificate"
  | "consent"
  | "patient-instruction"
  | "consultation-summary"
  | "other";

export type PracticeDocumentSource =
  | "patient-upload"
  | "practice-generated"
  | "external-provider"
  | "external-hospital"
  | "system-generated";

export type PracticeDocumentLifecycleStatus =
  | "draft"
  | "processing"
  | "available"
  | "archived"
  | "entered-in-error";

export type PracticeDocumentScanStatus =
  | "pending"
  | "scanning"
  | "clean"
  | "infected"
  | "failed"
  | "not-required";

export type PracticeDocumentReviewDisposition =
  | "unreviewed"
  | "reviewed"
  | "needs-clarification"
  | "not-relevant"
  | "superseded";

export type PracticeDocumentVisibility =
  | "practice-only"
  | "patient-visible"
  | "shared-with-external-clinician";

export type PracticeDocumentRequestStatus =
  | "open"
  | "partially-fulfilled"
  | "fulfilled"
  | "cancelled"
  | "expired";

export type PracticeDocumentAccessAction =
  | "view-metadata"
  | "open"
  | "download"
  | "print"
  | "release"
  | "revoke-release";

export type PracticeClinicalSignatureSubjectType =
  | "consultation-note"
  | "consultation-summary"
  | "prescription"
  | "patient-instructions"
  | "document-review"
  | "document-release"
  | "message-reply"
  | "other";

export type PracticeClinicalSignatureKind =
  | "author"
  | "countersignature"
  | "amendment";

export type PracticeClinicalSignatureStatus =
  | "pending"
  | "signed"
  | "rejected"
  | "superseded";

/**
 * Metadata for one stored file belonging to a practice document.
 *
 * storageKey is opaque and must never be rendered directly in the UI.
 */
export interface PracticeDocumentFile {
  id: WonFlowId;

  /**
   * Tenant organization that owns this file-metadata record.
   */
  organizationId: WonFlowId;

  practiceDocumentId: WonFlowId;

  fileName: string;

  mimeType: string;

  fileSizeBytes: number;

  checksumSha256?: string;

  /**
   * Opaque object-storage reference.
   *
   * It is not a public URL.
   */
  storageKey: string;

  scanStatus: PracticeDocumentScanStatus;

  uploadedAt: IsoDateTime;

  scanCompletedAt?: IsoDateTime;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * A clinically relevant document associated with one patient.
 */
export interface PracticeDocument {
  id: WonFlowId;

  /**
   * Tenant organization that owns this document record.
   */
  organizationId: WonFlowId;

  patientId: WonFlowId;

  category: PracticeDocumentCategory;

  source: PracticeDocumentSource;

  title: string;

  description?: string;

  /**
   * Clinical date shown on the document, when known.
   *
   * Timeline screens sort primarily by this value.
   */
  clinicalDate?: IsoDate;

  externalProviderName?: string;

  externalDoctorName?: string;

  externalSpecialtyName?: string;

  fileIds: WonFlowId[];

  currentFileId?: WonFlowId;

  reviewDisposition:
    PracticeDocumentReviewDisposition;

  visibility: PracticeDocumentVisibility;

  lifecycleStatus:
    PracticeDocumentLifecycleStatus;

  supersedesDocumentId?: WonFlowId;

  supersededByDocumentId?: WonFlowId;

  uploadedByUserId?: WonFlowId;

  uploadedByPatientAccountId?: WonFlowId;

  uploadedByTeamMemberId?: WonFlowId;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * A doctor or team member's review of a patient document.
 *
 * privateClinicalNote is never released to the patient.
 */
export interface PracticeDocumentReview {
  id: WonFlowId;

  /**
   * Tenant organization that owns this review record.
   */
  organizationId: WonFlowId;

  practiceDocumentId: WonFlowId;

  patientId: WonFlowId;

  disposition:
    Exclude<
      PracticeDocumentReviewDisposition,
      "unreviewed"
    >;

  reviewedByTeamMemberId: WonFlowId;

  privateClinicalNote?: string;

  clarificationMessage?: string;

  supersedingDocumentId?: WonFlowId;

  reviewedAt: IsoDateTime;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Records release of a document to the patient or an external clinician.
 *
 * Release records are preserved even if access is later revoked.
 */
export interface PracticeDocumentRelease {
  id: WonFlowId;

  /**
   * Tenant organization that owns this release record.
   */
  organizationId: WonFlowId;

  practiceDocumentId: WonFlowId;

  patientId: WonFlowId;

  visibility: Exclude<
    PracticeDocumentVisibility,
    "practice-only"
  >;

  releasedByTeamMemberId: WonFlowId;

  releasedAt: IsoDateTime;

  revokedByTeamMemberId?: WonFlowId;

  revokedAt?: IsoDateTime;

  revocationReason?: string;
}

/**
 * Request raised by the practice for a patient to provide a document.
 */
export interface PracticeDocumentRequest {
  id: WonFlowId;

  /**
   * Tenant organization that owns this request record.
   */
  organizationId: WonFlowId;

  patientId: WonFlowId;

  requestedByTeamMemberId: WonFlowId;

  category: PracticeDocumentCategory;

  title: string;

  instructions?: string;

  requestedAt: IsoDateTime;

  dueAt?: IsoDateTime;

  status: PracticeDocumentRequestStatus;

  fulfilledDocumentIds: WonFlowId[];

  fulfilledAt?: IsoDateTime;

  cancelledByTeamMemberId?: WonFlowId;

  cancelledAt?: IsoDateTime;

  cancellationReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Append-only record of document access.
 */
export interface PracticeDocumentAccessEvent {
  id: WonFlowId;

  /**
   * Tenant organization that owns this access-event record.
   */
  organizationId: WonFlowId;

  practiceDocumentId: WonFlowId;

  patientId: WonFlowId;

  actorUserId: WonFlowId;

  actorTeamMemberId?: WonFlowId;

  actorPatientAccountId?: WonFlowId;

  action: PracticeDocumentAccessAction;

  purpose?: string;

  occurredAt: IsoDateTime;
}

/**
 * Signature or countersignature applied to clinical content.
 *
 * A supervised team member may author content while a separate,
 * authorized supervisor supplies the countersignature.
 */
export interface PracticeClinicalSignature {
  id: WonFlowId;

  /**
   * Tenant organization that owns this signature workflow record.
   */
  organizationId: WonFlowId;

  subjectType:
    PracticeClinicalSignatureSubjectType;

  subjectId: WonFlowId;

  patientId: WonFlowId;

  kind: PracticeClinicalSignatureKind;

  status: PracticeClinicalSignatureStatus;

  authoredByTeamMemberId: WonFlowId;

  countersignatureRequired: boolean;

  requestedFromTeamMemberId?: WonFlowId;

  requestedAt?: IsoDateTime;

  signedByTeamMemberId?: WonFlowId;

  signedAt?: IsoDateTime;

  rejectedByTeamMemberId?: WonFlowId;

  rejectedAt?: IsoDateTime;

  rejectionReason?: string;

  /**
   * Amendments are additive and point to the signature they amend.
   */
  amendsSignatureId?: WonFlowId;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

export interface PracticeDocumentAggregate {
  document: PracticeDocument;

  files: PracticeDocumentFile[];

  reviews: PracticeDocumentReview[];

  releases: PracticeDocumentRelease[];

  accessEvents: PracticeDocumentAccessEvent[];

  signatures: PracticeClinicalSignature[];
}

/**
 * Returns documents owned by a tenant organization.
 */
export function getPracticeDocumentsForOrganization(
  documents: readonly PracticeDocument[],
  organizationId: WonFlowId,
): PracticeDocument[] {
  return documents.filter(
    (document) =>
      document.organizationId ===
      organizationId,
  );
}

/**
 * Returns documents for one patient.
 */
export function getPracticeDocumentsForPatient(
  documents: readonly PracticeDocument[],
  patientId: WonFlowId,
): PracticeDocument[] {
  return documents.filter(
    (document) =>
      document.patientId === patientId,
  );
}

/**
 * Sorts documents newest first using clinical date and creation time.
 */
export function comparePracticeDocumentsByDate(
  left: PracticeDocument,
  right: PracticeDocument,
): number {
  const leftClinicalDate =
    left.clinicalDate ??
    left.createdAt.slice(0, 10);

  const rightClinicalDate =
    right.clinicalDate ??
    right.createdAt.slice(0, 10);

  const clinicalDateDifference =
    rightClinicalDate.localeCompare(
      leftClinicalDate,
    );

  if (clinicalDateDifference !== 0) {
    return clinicalDateDifference;
  }

  return right.createdAt.localeCompare(
    left.createdAt,
  );
}

/**
 * A file can be opened only after scanning succeeds or scanning is not
 * required for a trusted generated document.
 */
export function isPracticeDocumentFileOpenable(
  file: PracticeDocumentFile,
): boolean {
  return (
    file.scanStatus === "clean" ||
    file.scanStatus === "not-required"
  );
}

/**
 * Returns true when a document remains an active patient-facing release.
 */
export function isPracticeDocumentReleaseActive(
  release: PracticeDocumentRelease,
): boolean {
  return release.revokedAt === undefined;
}
