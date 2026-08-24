export type CaregiverInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED";

export const DEFAULT_CAREGIVER_PERMISSIONS = [
  "observations.write",
  "careplan.complete",
] as const;

export interface CaregiverInviteInput {
  email: string;
  relationship: string;
  permissions?: string[];
  validDays?: number;
}

export interface CaregiverAcceptInput {
  inviteToken: string;
}

export interface CaregiverAccessSummary {
  id: string;
  patientId: string;
  identityId: string;
  caregiverEmail: string;
  caregiverName?: string | null;
  relationship: string;
  permissions: string[];
  invitedBy?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CaregiverInvitationSummary {
  id: string;
  tenantId: string;
  patientId: string;
  email: string;
  relationship: string;
  permissions: string[];
  status: CaregiverInvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface PatientCaregiversResponse {
  activeDelegates: CaregiverAccessSummary[];
  pendingInvitations: CaregiverInvitationSummary[];
}
