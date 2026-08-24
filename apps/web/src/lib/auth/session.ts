import type { WorkspaceCode } from "@wonflow/database";
import type { WonFlowRole } from "./accounts";

export const WONFLOW_SESSION_COOKIE = "wf_session";
export const WONFLOW_PASSWORD_CHANGE_COOKIE = "wf_password_change_required";
export const WONFLOW_SESSION_DURATION_SECONDS = 60 * 60 * 12;

export interface WonFlowSessionPayload {
  sessionId: string;
  identityId: string;
  membershipId: string | null;
  tenantId: string | null;
  organizationId: string | null;
  branchId: string | null;
  workspace: WorkspaceCode | null;
  role: WonFlowRole;
  email: string;
  name: string;
  orgLabel: string;
  branchLabel: string | null;
  portalLabel: string;
  permissionCodes: readonly string[];
  passwordChangeRequired: boolean;
  mfaVerified: boolean;
  expiresAt: string;
  patientId?: string | null;
  actingRelationship?: string | null;
}
