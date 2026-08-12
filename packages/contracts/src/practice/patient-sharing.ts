/**
 * Temporary, consented sharing of patient records with external
 * clinicians and organizations.
 *
 * Every sharing grant is limited to one patient, an explicit set of
 * record categories, a documented purpose and a mandatory expiry.
 *
 * Grant revocation and access events are recorded permanently rather
 * than deleted.
 */

import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

import type {
  PatientConsentRecord,
} from "./patient-account";

/**
 * Patient-record categories that may be exposed by a sharing grant.
 *
 * The grant must list explicit categories. An empty scope grants no
 * access.
 */
export type PatientSharingRecordCategory =
  | "demographics"
  | "appointments"
  | "consultations"
  | "diagnoses"
  | "medications"
  | "prescriptions"
  | "laboratory-reports"
  | "radiology-reports"
  | "histopathology-reports"
  | "discharge-summaries"
  | "documents"
  | "follow-ups"
  | "messages";

/**
 * Type of recipient receiving temporary patient-record access.
 */
export type PatientSharingTargetType =
  | "user"
  | "organization"
  | "external-clinician";

/**
 * Action recorded when shared patient information is accessed.
 */
export type SharingAccessAction =
  | "view"
  | "open"
  | "download"
  | "print";

/**
 * Shared fields common to every sharing-grant target.
 */
export interface PatientSharingGrantBase {
  id: WonFlowId;

  /**
   * Organization that owns the patient relationship and grants access.
   */
  organizationId: WonFlowId;

  patientId: WonFlowId;

  grantedByTeamMemberId: WonFlowId;

  targetType: PatientSharingTargetType;

  /**
   * Explicit patient-record categories made available by this grant.
   *
   * An empty scope grants no access.
   */
  scope: PatientSharingRecordCategory[];

  purpose: string;

  grantedAt: IsoDateTime;

  /**
   * Mandatory end of access.
   *
   * Indefinite patient sharing is not representable.
   */
  expiresAt: IsoDateTime;

  revokedByTeamMemberId?: WonFlowId;

  revokedAt?: IsoDateTime;

  revocationReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Sharing grant issued to an individual WonFlow user.
 */
export interface PatientSharingUserGrant
  extends PatientSharingGrantBase {
  targetType: "user";

  grantedToUserId: WonFlowId;

  grantedToOrganizationId?: never;

  grantedToExternalClinicianProfileId?: never;
}

/**
 * Sharing grant issued to another WonFlow organization.
 */
export interface PatientSharingOrganizationGrant
  extends PatientSharingGrantBase {
  targetType: "organization";

  grantedToOrganizationId: WonFlowId;

  grantedToUserId?: never;

  grantedToExternalClinicianProfileId?: never;
}

/**
 * Sharing grant issued to a clinician who is not currently a WonFlow
 * user.
 *
 * The grant references an ExternalClinicianProfile maintained by the
 * sharing organization.
 */
export interface PatientSharingExternalClinicianGrant
  extends PatientSharingGrantBase {
  targetType: "external-clinician";

  grantedToExternalClinicianProfileId:
    WonFlowId;

  grantedToUserId?: never;

  grantedToOrganizationId?: never;
}

/**
 * Temporary access granted to one recipient.
 *
 * The discriminated union ensures that exactly one target is selected.
 */
export type PatientSharingGrant =
  | PatientSharingUserGrant
  | PatientSharingOrganizationGrant
  | PatientSharingExternalClinicianGrant;

/**
 * Patient agreement to one specific sharing grant.
 *
 * The linked PatientConsentRecord must:
 *
 * - belong to the same patient,
 * - have consentType "sharing-with-clinician",
 * - remain unwithdrawn, and
 * - represent the consent text shown for this grant.
 */
export interface PatientSharingConsent {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientId: WonFlowId;

  patientSharingGrantId: WonFlowId;

  patientConsentRecordId: WonFlowId;

  patientAccountId: WonFlowId;

  consentedAt: IsoDateTime;

  createdAt: IsoDateTime;
}

/**
 * Contact profile for a clinician outside WonFlow.
 *
 * This profile stores professional and contact details only. It does
 * not itself grant patient-record access.
 */
export interface ExternalClinicianProfile {
  id: WonFlowId;

  /**
   * Organization maintaining this external contact record.
   */
  organizationId: WonFlowId;

  name: string;

  specialty: string;

  /**
   * Pakistan Medical and Dental Council registration number.
   */
  pmdcNumber?: string;

  organizationName?: string;

  email?: string;

  phoneNumber?: string;

  address?: string;

  notes?: string;

  status: RecordStatus;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Append-only event recording access through a sharing grant.
 *
 * These records are never modified or removed after creation.
 */
export interface SharingAccessEvent {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientSharingGrantId: WonFlowId;

  patientId: WonFlowId;

  targetType: PatientSharingTargetType;

  /**
   * WonFlow user who accessed the record, when applicable.
   */
  granteeUserId?: WonFlowId;

  /**
   * Recipient organization associated with the access, when applicable.
   */
  granteeOrganizationId?: WonFlowId;

  /**
   * External clinician associated with the access, when applicable.
   */
  externalClinicianProfileId?: WonFlowId;

  recordCategory:
    PatientSharingRecordCategory;

  /**
   * Domain resource opened through the grant.
   *
   * Examples include a consultation, document, prescription or report.
   */
  resourceType: string;

  resourceId: WonFlowId;

  action: SharingAccessAction;

  purpose?: string;

  ipAddress?: string;

  userAgent?: string;

  occurredAt: IsoDateTime;

  createdAt: IsoDateTime;
}

/**
 * Complete sharing view for a patient.
 */
export interface PatientSharingAggregate {
  grants: PatientSharingGrant[];

  consents: PatientSharingConsent[];

  externalClinicians:
    ExternalClinicianProfile[];

  accessEvents: SharingAccessEvent[];
}

/**
 * Returns true when the underlying patient-consent record remains active
 * and is specifically suitable for patient-record sharing.
 */
export function isPatientSharingConsentRecordActive(
  consentRecord: PatientConsentRecord,
): boolean {
  return (
    consentRecord.consentType ===
      "sharing-with-clinician" &&
    consentRecord.withdrawnAt ===
      undefined
  );
}

/**
 * Determines whether one sharing-consent record validly supports a
 * specific grant.
 */
export function doesPatientSharingConsentMatchGrant(
  sharingConsent: PatientSharingConsent,
  grant: PatientSharingGrant,
  consentRecord:
    | PatientConsentRecord
    | undefined,
): boolean {
  if (consentRecord === undefined) {
    return false;
  }

  if (
    sharingConsent.patientSharingGrantId !==
      grant.id ||
    sharingConsent.patientId !==
      grant.patientId ||
    sharingConsent.organizationId !==
      grant.organizationId
  ) {
    return false;
  }

  if (
    sharingConsent.patientConsentRecordId !==
      consentRecord.id ||
    sharingConsent.patientAccountId !==
      consentRecord.patientAccountId ||
    sharingConsent.patientId !==
      consentRecord.patientId
  ) {
    return false;
  }

  return isPatientSharingConsentRecordActive(
    consentRecord,
  );
}

/**
 * Returns true when a sharing grant is inside its active time window and
 * has not been revoked.
 */
export function isPatientSharingGrantWithinActivePeriod(
  grant: PatientSharingGrant,
  at: IsoDateTime,
): boolean {
  if (grant.revokedAt !== undefined) {
    return false;
  }

  const currentTime =
    Date.parse(at);

  const grantedTime =
    Date.parse(grant.grantedAt);

  const expiryTime =
    Date.parse(grant.expiresAt);

  if (
    Number.isNaN(currentTime) ||
    Number.isNaN(grantedTime) ||
    Number.isNaN(expiryTime)
  ) {
    return false;
  }

  if (expiryTime <= grantedTime) {
    return false;
  }

  return (
    currentTime >= grantedTime &&
    currentTime < expiryTime
  );
}

/**
 * Determines whether a grant has valid, active patient consent.
 *
 * A grant without a matching consent record never grants access.
 */
export function hasValidPatientSharingConsent(
  grant: PatientSharingGrant,
  sharingConsents:
    readonly PatientSharingConsent[],
  consentRecords:
    readonly PatientConsentRecord[],
): boolean {
  return sharingConsents.some(
    (sharingConsent) => {
      if (
        sharingConsent.patientSharingGrantId !==
        grant.id
      ) {
        return false;
      }

      const consentRecord =
        consentRecords.find(
          (candidate) =>
            candidate.id ===
            sharingConsent
              .patientConsentRecordId,
        );

      return doesPatientSharingConsentMatchGrant(
        sharingConsent,
        grant,
        consentRecord,
      );
    },
  );
}

/**
 * Determines whether a grant currently provides access.
 */
export function isPatientSharingGrantActive(
  grant: PatientSharingGrant,
  sharingConsents:
    readonly PatientSharingConsent[],
  consentRecords:
    readonly PatientConsentRecord[],
  at: IsoDateTime,
): boolean {
  if (
    grant.scope.length === 0 ||
    !isPatientSharingGrantWithinActivePeriod(
      grant,
      at,
    )
  ) {
    return false;
  }

  return hasValidPatientSharingConsent(
    grant,
    sharingConsents,
    consentRecords,
  );
}

/**
 * Determines whether a grant includes one patient-record category.
 */
export function canPatientSharingGrantAccessCategory(
  grant: PatientSharingGrant,
  recordCategory:
    PatientSharingRecordCategory,
): boolean {
  return grant.scope.includes(
    recordCategory,
  );
}

/**
 * Returns active sharing grants for one patient.
 */
export function getActivePatientSharingGrantsForPatient(
  grants:
    readonly PatientSharingGrant[],
  sharingConsents:
    readonly PatientSharingConsent[],
  consentRecords:
    readonly PatientConsentRecord[],
  patientId: WonFlowId,
  at: IsoDateTime,
): PatientSharingGrant[] {
  return grants.filter(
    (grant) =>
      grant.patientId === patientId &&
      isPatientSharingGrantActive(
        grant,
        sharingConsents,
        consentRecords,
        at,
      ),
  );
}

/**
 * Determines whether a grant may access a specific category at a
 * timestamp.
 */
export function canAccessPatientRecordThroughSharingGrant(
  grant: PatientSharingGrant,
  sharingConsents:
    readonly PatientSharingConsent[],
  consentRecords:
    readonly PatientConsentRecord[],
  recordCategory:
    PatientSharingRecordCategory,
  at: IsoDateTime,
): boolean {
  return (
    isPatientSharingGrantActive(
      grant,
      sharingConsents,
      consentRecords,
      at,
    ) &&
    canPatientSharingGrantAccessCategory(
      grant,
      recordCategory,
    )
  );
}

/**
 * Returns access events belonging to one sharing grant in chronological
 * order.
 */
export function getSharingAccessEventsForGrant(
  events:
    readonly SharingAccessEvent[],
  patientSharingGrantId: WonFlowId,
): SharingAccessEvent[] {
  return events
    .filter(
      (event) =>
        event.patientSharingGrantId ===
        patientSharingGrantId,
    )
    .sort(
      (left, right) =>
        left.occurredAt.localeCompare(
          right.occurredAt,
        ),
    );
}
