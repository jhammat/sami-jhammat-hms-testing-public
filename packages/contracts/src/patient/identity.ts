import type {
  IsoDateTime,
  WonFlowId,
} from "../organization/hierarchy";

export type IsoDate = string;

export type PatientRecordStatus =
  | "active"
  | "inactive"
  | "deceased"
  | "merged"
  | "archived";

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export type AdministrativeSex =
  | "male"
  | "female"
  | "intersex"
  | "unknown";

export type GenderIdentity =
  | "man"
  | "woman"
  | "non-binary"
  | "self-described"
  | "prefer-not-to-say"
  | "unknown";

export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-"
  | "unknown";

export type PatientIdentifierType =
  | "cnic"
  | "national-id"
  | "passport"
  | "birth-certificate"
  | "insurance-member-id"
  | "external-mrn"
  | "legacy-mrn"
  | "other";

export type PatientRelationshipType =
  | "mother"
  | "father"
  | "parent"
  | "son"
  | "daughter"
  | "child"
  | "spouse"
  | "sibling"
  | "grandparent"
  | "guardian"
  | "caregiver"
  | "relative"
  | "other";

export interface Patient {
  id: WonFlowId;
  organizationId: WonFlowId;

  /**
   * Organization-wide medical record number.
   */
  mrn: string;

  registrationBranchId?: WonFlowId;
  preferredBranchId?: WonFlowId;

  status: PatientRecordStatus;

  legalFirstName: string;
  legalMiddleName?: string;
  legalLastName?: string;
  preferredName?: string;
  displayName: string;

  dateOfBirth?: IsoDate;
  isDateOfBirthEstimated: boolean;

  administrativeSex: AdministrativeSex;
  genderIdentity?: GenderIdentity;
  bloodGroup?: BloodGroup;

  nationalityCode?: string;
  preferredLanguageCode: string;

  photoDocumentId?: WonFlowId;
  deceasedAt?: IsoDateTime;
  mergedIntoPatientId?: WonFlowId;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientNameVariant {
  id: WonFlowId;
  organizationId: WonFlowId;
  patientId: WonFlowId;

  languageCode?: string;
  scriptCode?: string;

  firstName: string;
  middleName?: string;
  lastName?: string;
  displayName: string;

  use:
    | "legal"
    | "local-language"
    | "transliteration"
    | "maiden-name"
    | "previous-name"
    | "search-alias";

  isPrimary: boolean;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientIdentifier {
  id: WonFlowId;
  organizationId: WonFlowId;
  patientId: WonFlowId;

  type: PatientIdentifierType;
  value: string;

  issuingCountryCode?: string;
  issuerName?: string;

  verificationStatus: VerificationStatus;
  isPrimary: boolean;

  issuedOn?: IsoDate;
  expiresOn?: IsoDate;

  verifiedAt?: IsoDateTime;
  verifiedByUserId?: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientMrnAlias {
  id: WonFlowId;
  organizationId: WonFlowId;
  patientId: WonFlowId;

  mrn: string;
  source?: string;
  isActive: boolean;

  createdAt: IsoDateTime;
}

export interface PatientContactPoint {
  id: WonFlowId;
  organizationId: WonFlowId;
  patientId: WonFlowId;

  type: "mobile" | "phone" | "email";
  use: "primary" | "secondary" | "home" | "work" | "emergency";

  value: string;
  isPrimary: boolean;
  verificationStatus: VerificationStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientAddress {
  id: WonFlowId;
  organizationId: WonFlowId;
  patientId: WonFlowId;

  type: "home" | "temporary" | "work" | "billing" | "other";

  addressLine1: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  stateOrProvince?: string;
  postalCode?: string;
  countryCode: string;

  isPrimary: boolean;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientEmergencyContact {
  id: WonFlowId;
  organizationId: WonFlowId;
  patientId: WonFlowId;

  fullName: string;
  relationship?: PatientRelationshipType;

  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;

  isPrimary: boolean;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientRelationship {
  id: WonFlowId;
  organizationId: WonFlowId;
  patientId: WonFlowId;

  relatedPatientId?: WonFlowId;
  externalPersonName?: string;
  externalPersonPhone?: string;

  relationshipType: PatientRelationshipType;

  canBookAppointments: boolean;
  canViewReleasedRecords: boolean;
  canReceiveNotifications: boolean;
  canManagePayments: boolean;
  canProvideConsent: boolean;

  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientDuplicateCandidate {
  id: WonFlowId;
  organizationId: WonFlowId;

  sourcePatientId: WonFlowId;
  possibleDuplicatePatientId: WonFlowId;

  confidenceScore: number;
  matchReasons: string[];

  status:
    | "pending-review"
    | "confirmed-duplicate"
    | "not-a-duplicate"
    | "merged"
    | "dismissed";

  reviewedByUserId?: WonFlowId;
  reviewedAt?: IsoDateTime;
  reviewNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientMergeRecord {
  id: WonFlowId;
  organizationId: WonFlowId;

  survivorPatientId: WonFlowId;
  duplicatePatientId: WonFlowId;

  reason: string;
  status: "completed" | "reversed";

  performedByUserId: WonFlowId;
  performedAt: IsoDateTime;

  reversedByUserId?: WonFlowId;
  reversedAt?: IsoDateTime;
  reversalReason?: string;
}

export interface PatientIdentityAggregate {
  patient: Patient;
  nameVariants: PatientNameVariant[];
  identifiers: PatientIdentifier[];
  mrnAliases: PatientMrnAlias[];
  contactPoints: PatientContactPoint[];
  addresses: PatientAddress[];
  emergencyContacts: PatientEmergencyContact[];
  relationships: PatientRelationship[];
}