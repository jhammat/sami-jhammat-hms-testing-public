/**
 * Patient portal accounts, patient links, consent and communication
 * preferences.
 *
 * Patient authentication uses email and password. Credential storage,
 * password hashes and authentication secrets are backend concerns and
 * must never appear in these public contracts.
 */

import type {
  IsoDateTime,
  WonFlowId,
} from "../organization/hierarchy";

/**
 * Lifecycle of a patient-facing portal account.
 *
 * Temporary login lockout is represented separately by lockedUntil.
 */
export type PatientAccountStatus =
  | "pending-verification"
  | "active"
  | "suspended"
  | "disabled"
  | "archived";

/**
 * Relationship between a portal account and a patient record.
 *
 * One account may be connected to multiple patient records. This allows
 * a parent, child, spouse or guardian to help manage another person's
 * care.
 */
export type PatientAccountRelationship =
  | "self"
  | "parent"
  | "child"
  | "spouse"
  | "guardian";

export type PatientAccountLinkStatus =
  | "pending-verification"
  | "active"
  | "revoked";

/**
 * Lifecycle of a staff-created patient account invitation.
 *
 * Expiry is derived from expiresAt rather than requiring a separate
 * persisted expired status.
 */
export type PatientAccountInvitationStatus =
  | "pending"
  | "redeemed"
  | "revoked";

export type PatientConsentType =
  | "data-storage"
  | "treatment"
  | "communication"
  | "sharing-with-clinician";

export type PatientContactChannel =
  | "whatsapp"
  | "sms"
  | "email"
  | "call";

/**
 * Client platform registered for patient notifications.
 *
 * These values describe supported application platforms rather than
 * tenant-specific notification providers.
 */
export type PatientDevicePlatform =
  | "android"
  | "ios"
  | "web";

/**
 * A patient-facing portal account.
 *
 * Login uses email and password, but this contract contains no password,
 * password hash or credential material. Those values belong in a
 * separate protected backend credential store.
 */
export interface PatientAccount {
  id: WonFlowId;

  organizationId: WonFlowId;

  email: string;

  /**
   * A phone number is required on every patient profile even though the
   * account signs in using email.
   *
   * It is used for reminders, account recovery and patient contact.
   */
  phoneNumber: string;

  /**
   * Optional separate WhatsApp number when it differs from phoneNumber.
   */
  whatsappNumber?: string;

  emailVerifiedAt?: IsoDateTime;

  /**
   * Timestamp of the most recent successful password creation or
   * password change.
   *
   * The password itself is never part of this contract.
   */
  passwordUpdatedAt: IsoDateTime;

  status: PatientAccountStatus;

  /**
   * Consecutive failed login attempts used by the authentication layer
   * when applying rate limits and account lockout.
   */
  failedLoginCount: number;

  /**
   * Temporary authentication lockout.
   *
   * The account may authenticate again after this timestamp when its
   * general status remains active.
   */
  lockedUntil?: IsoDateTime;

  lastLoginAt?: IsoDateTime;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Links one patient portal account to one patient record.
 *
 * Multiple links allow one account to manage care for relatives while
 * preserving the relationship through which access was granted.
 */
export interface PatientAccountLink {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientAccountId: WonFlowId;

  patientId: WonFlowId;

  relationship: PatientAccountRelationship;

  /**
   * Identifies the account holder's own or preferred patient profile
   * when one account is linked to several patients.
   */
  isPrimary: boolean;

  status: PatientAccountLinkStatus;

  linkedByUserId: WonFlowId;

  verifiedByUserId?: WonFlowId;

  verifiedAt?: IsoDateTime;

  revokedByUserId?: WonFlowId;

  revokedAt?: IsoDateTime;

  revocationReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Invitation created by staff for a patient or representative.
 *
 * redemptionTokenReference is an opaque reference to a protected,
 * hashed, single-use token stored by the backend. It is not the
 * redeemable token itself.
 */
export interface PatientAccountInvitation {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientId: WonFlowId;

  email: string;

  phoneNumber: string;

  relationship: PatientAccountRelationship;

  redemptionTokenReference: string;

  status: PatientAccountInvitationStatus;

  invitedByUserId: WonFlowId;

  expiresAt: IsoDateTime;

  redeemedPatientAccountId?: WonFlowId;

  redeemedAt?: IsoDateTime;

  revokedByUserId?: WonFlowId;

  revokedAt?: IsoDateTime;

  revocationReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Versioned record of consent granted by a patient account holder.
 *
 * A new consent record is required when the consent text version
 * changes. Older consent and withdrawal records remain preserved.
 *
 * Withdrawal is recorded by setting withdrawnAt and related metadata.
 * Consent records are never deleted to represent withdrawal.
 */
export interface PatientConsentRecord {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientAccountId: WonFlowId;

  patientId: WonFlowId;

  consentType: PatientConsentType;

  /**
   * Version of the exact consent text accepted by the patient.
   *
   * Examples may include identifiers such as "1.0" or
   * "2026-07-data-storage".
   */
  consentTextVersion: string;

  grantedAt: IsoDateTime;

  /**
   * Network address recorded when consent was granted.
   */
  ipAddress: string;

  /**
   * Browser or client user-agent recorded when consent was granted.
   */
  userAgent: string;

  withdrawnAt?: IsoDateTime;

  withdrawalReason?: string;

  withdrawalIpAddress?: string;

  withdrawalUserAgent?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Communication preference for one linked patient and one channel.
 *
 * The required patient phone number remains on PatientAccount.
 * Disabling a communication channel does not remove that phone number.
 */
export interface PatientContactPreference {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientAccountId: WonFlowId;

  patientId: WonFlowId;

  channel: PatientContactChannel;

  optedIn: boolean;

  optedInAt?: IsoDateTime;

  optedOutAt?: IsoDateTime;

  updatedByUserId?: WonFlowId;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Push-notification registration for one patient account installation.
 *
 * The actual provider token is secret implementation data and must not
 * appear in this shared contract. tokenReference is an opaque reference
 * to the protected token stored by the backend.
 *
 * A registration is revoked by recording revocation metadata. It is
 * never deleted merely because the user signs out or disables push.
 */
export interface PatientDeviceRegistration {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientAccountId: WonFlowId;

  platform: PatientDevicePlatform;

  /**
   * Stable identifier created by the installed application or browser.
   *
   * This allows a refreshed provider token to update the same device
   * registration instead of creating an unrelated duplicate.
   */
  installationId: string;

  /**
   * Opaque reference to a protected push-notification token.
   *
   * This is not the provider token itself.
   */
  tokenReference: string;

  /**
   * Optional application version reported by the client.
   */
  applicationVersion?: string;

  /**
   * Optional operating-system version reported by the client.
   */
  operatingSystemVersion?: string;

  /**
   * Most recent time the application confirmed that this installation
   * remained active.
   */
  lastSeenAt: IsoDateTime;

  registeredAt: IsoDateTime;

  revokedByUserId?: WonFlowId;

  revokedAt?: IsoDateTime;

  revocationReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

export interface PatientAccountAggregate {
  account: PatientAccount;

  links: PatientAccountLink[];

  invitations: PatientAccountInvitation[];

  consentRecords: PatientConsentRecord[];

  contactPreferences: PatientContactPreference[];

  deviceRegistrations:
    PatientDeviceRegistration[];
}

/**
 * Returns true while an account remains under temporary login lockout.
 */
export function isPatientAccountTemporarilyLocked(
  account: PatientAccount,
  at: IsoDateTime,
): boolean {
  return (
    account.lockedUntil !== undefined &&
    account.lockedUntil > at
  );
}

/**
 * Determines whether an account is currently eligible to authenticate.
 *
 * Authentication implementations must still verify credentials and
 * apply rate limiting on the server.
 */
export function canPatientAccountAuthenticate(
  account: PatientAccount,
  at: IsoDateTime,
): boolean {
  if (account.status !== "active") {
    return false;
  }

  if (account.emailVerifiedAt === undefined) {
    return false;
  }

  return !isPatientAccountTemporarilyLocked(
    account,
    at,
  );
}

/**
 * Returns true when a patient-account link currently grants access.
 */
export function isPatientAccountLinkActive(
  link: PatientAccountLink,
): boolean {
  return link.status === "active";
}

/**
 * Returns active patient links belonging to one portal account.
 */
export function getActivePatientAccountLinks(
  links: readonly PatientAccountLink[],
  patientAccountId: WonFlowId,
): PatientAccountLink[] {
  return links.filter(
    (link) =>
      link.patientAccountId ===
        patientAccountId &&
      isPatientAccountLinkActive(link),
  );
}

/**
 * Returns unique patient IDs currently linked to one portal account.
 */
export function getLinkedPatientIdsForAccount(
  links: readonly PatientAccountLink[],
  patientAccountId: WonFlowId,
): WonFlowId[] {
  return [
    ...new Set(
      getActivePatientAccountLinks(
        links,
        patientAccountId,
      ).map(
        (link) =>
          link.patientId,
      ),
    ),
  ];
}

/**
 * Determines whether an invitation may still be redeemed.
 */
export function isPatientAccountInvitationRedeemable(
  invitation: PatientAccountInvitation,
  at: IsoDateTime,
): boolean {
  return (
    invitation.status === "pending" &&
    invitation.expiresAt > at
  );
}

/**
 * Determines whether consent is active for the currently required text
 * version.
 *
 * A previous consent version does not satisfy a newer consent text.
 */
export function isPatientConsentActiveForVersion(
  consent: PatientConsentRecord,
  requiredConsentTextVersion: string,
): boolean {
  return (
    consent.withdrawnAt === undefined &&
    consent.consentTextVersion ===
      requiredConsentTextVersion
  );
}

/**
 * Finds the newest active consent matching a type and required version.
 */
export function getLatestActivePatientConsent(
  consents:
    readonly PatientConsentRecord[],
  patientId: WonFlowId,
  consentType: PatientConsentType,
  requiredConsentTextVersion: string,
):
  | PatientConsentRecord
  | undefined {
  return consents
    .filter(
      (consent) =>
        consent.patientId ===
          patientId &&
        consent.consentType ===
          consentType &&
        isPatientConsentActiveForVersion(
          consent,
          requiredConsentTextVersion,
        ),
    )
    .sort(
      (left, right) =>
        right.grantedAt.localeCompare(
          left.grantedAt,
        ),
    )[0];
}

/**
 * Finds one patient's preference for a communication channel.
 */
export function getPatientContactPreference(
  preferences:
    readonly PatientContactPreference[],
  patientAccountId: WonFlowId,
  patientId: WonFlowId,
  channel: PatientContactChannel,
):
  | PatientContactPreference
  | undefined {
  return preferences.find(
    (preference) =>
      preference.patientAccountId ===
        patientAccountId &&
      preference.patientId ===
        patientId &&
      preference.channel === channel,
  );
}

/**
 * Returns true only when a matching preference explicitly opts in.
 *
 * Missing preferences default to disabled.
 */
export function isPatientContactChannelEnabled(
  preferences:
    readonly PatientContactPreference[],
  patientAccountId: WonFlowId,
  patientId: WonFlowId,
  channel: PatientContactChannel,
): boolean {
  return (
    getPatientContactPreference(
      preferences,
      patientAccountId,
      patientId,
      channel,
    )?.optedIn === true
  );
}
