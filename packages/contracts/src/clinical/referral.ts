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

export const REFERRAL_SPECIALTIES = [
  "PHYSIOTHERAPY",
  "NUTRITION",
] as const;

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
  priority?: ReferralPriority;
  reason: string;
  goal?: string;
  clinicalSummary?: string;
  surgicalSummary?: string;
  precautions?: string;
  validDays?: number;
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
