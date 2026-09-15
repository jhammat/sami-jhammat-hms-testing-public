export const REFERRAL_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const REFERRAL_PRIORITIES = [
  "ROUTINE",
  "URGENT",
  "EMERGENCY",
] as const;

export type ReferralPriority = (typeof REFERRAL_PRIORITIES)[number];

export const REFERRAL_DISCIPLINES = [
  "PHYSIOTHERAPY",
  "NUTRITION",
  "OTHER",
] as const;

export type ReferralDiscipline = (typeof REFERRAL_DISCIPLINES)[number];

/**
 * The allied disciplines a referral can name, which are also the specialties
 * an allied portal opens a patient record under: a physiotherapist sees the
 * patients referred to PHYSIOTHERAPY and nobody else.
 */
export const ALLIED_REFERRAL_SPECIALTIES = [
  "PHYSIOTHERAPY",
  "NUTRITION",
] as const;

/**
 * `DOCTOR` is a referral to a named colleague — a second opinion, or a handover
 * to another department — rather than to an allied discipline. It carries the
 * `OTHER` discipline and a specific assignee, and it deliberately does not widen
 * any allied clinician's patient scope: that scope is matched on the exact
 * specialty string, so a doctor-to-doctor referral is invisible to it.
 */
export const REFERRAL_SPECIALTIES = [
  ...ALLIED_REFERRAL_SPECIALTIES,
  "DOCTOR",
] as const;

export type AlliedReferralSpecialty = (typeof ALLIED_REFERRAL_SPECIALTIES)[number];
export type ReferralSpecialty = (typeof REFERRAL_SPECIALTIES)[number];

export interface ClinicalReferral {
  id: string;
  tenantId: string;
  patientId: string;
  referringDoctorId: string;
  specialty: string;
  discipline: ReferralDiscipline;
  assignedToId: string | null;
  status: ReferralStatus;
  priority: ReferralPriority;
  reason: string;
  goal?: string | null;
  clinicalSummary: string | null;
  surgicalSummary?: string | null;
  precautions?: string | null;
  outcomeNotes?: string | null;
  validFrom: string;
  validUntil: string | null;
  acceptedAt?: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    patientNumber: string;
    givenName: string;
    familyName: string;
    dateOfBirth?: string | null;
    sex?: string | null;
  };
  referringDoctor?: {
    id: string;
    specialty?: string | null;
    staffProfile?: {
      title?: string | null;
      membership?: {
        displayName?: string | null;
      };
    };
  };
  assignedTo?: {
    id: string;
    staffType: string;
    title?: string | null;
    membership?: {
      displayName?: string | null;
    };
  } | null;
}

export interface CreateReferralInput {
  patientId: string;
  specialty: ReferralSpecialty | string;
  discipline?: ReferralDiscipline;
  assignedToId?: string | null;
  /** Set on a DOCTOR referral to record which department is taking it on. */
  departmentId?: string | null;
  priority?: ReferralPriority;
  reason: string;
  goal?: string;
  clinicalSummary?: string;
  surgicalSummary?: string;
  precautions?: string;
  validDays?: number;
  /** The care plan this referral hands the patient off from, if any. */
  carePlanId?: string | null;
}

export interface AcceptReferralInput {
  referralId: string;
  notes?: string;
}

export interface CompleteReferralInput {
  referralId: string;
  outcomeNotes: string;
}

export interface DeclineReferralInput {
  referralId: string;
  reason: string;
}

export interface ListReferralsQuery {
  patientId?: string;
  specialty?: string;
  discipline?: ReferralDiscipline;
  assignedToId?: string;
  status?: ReferralStatus;
  page?: number;
  pageSize?: number;
}
