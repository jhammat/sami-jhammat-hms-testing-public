import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

export type RoleCategory =
  | "platform"
  | "organization"
  | "branch"
  | "department"
  | "clinical"
  | "operational"
  | "diagnostic"
  | "financial"
  | "management"
  | "patient";

export type PermissionEffect =
  | "allow"
  | "deny";

export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "assign"
  | "unassign"
  | "schedule"
  | "cancel"
  | "check-in"
  | "complete"
  | "verify"
  | "release"
  | "dispense"
  | "collect-payment"
  | "refund"
  | "export"
  | "print"
  | "configure"
  | "audit"
  | "impersonate"
  | "break-glass";

export type PermissionDomain =
  | "platform"
  | "organization"
  | "branch"
  | "department"
  | "facility"
  | "staff"
  | "doctor"
  | "role"
  | "permission"
  | "module"
  | "service"
  | "master-data"
  | "patient"
  | "patient-identity"
  | "appointment"
  | "schedule"
  | "queue"
  | "encounter"
  | "clinical-note"
  | "diagnosis"
  | "prescription"
  | "laboratory"
  | "radiology"
  | "pharmacy"
  | "billing"
  | "payment"
  | "refund"
  | "insurance"
  | "inventory"
  | "admission"
  | "ward"
  | "procedure"
  | "operation-theatre"
  | "report"
  | "document"
  | "message"
  | "notification"
  | "audit-log"
  | "patient-access";

export type PermissionCode =
  `${PermissionDomain}.${PermissionAction}`;

export type AccessScopeType =
  | "platform"
  | "organization"
  | "branch"
  | "department"
  | "operational-unit"
  | "service-point"
  | "patient"
  | "self";

export type AssignmentStatus =
  | "pending"
  | "active"
  | "suspended"
  | "expired"
  | "revoked";

export type AccessDecisionReason =
  | "explicit-allow"
  | "explicit-deny"
  | "missing-permission"
  | "inactive-role"
  | "inactive-assignment"
  | "outside-organization"
  | "outside-branch"
  | "outside-department"
  | "module-disabled"
  | "care-relationship-required"
  | "patient-relationship-required"
  | "support-session-required"
  | "break-glass-required"
  | "assignment-expired"
  | "resource-restricted";

export interface Permission {
  id: WonFlowId;

  code: PermissionCode;
  domain: PermissionDomain;
  action: PermissionAction;

  name: string;
  description: string;

  /**
   * Marks high-risk permissions such as refunds, patient merges,
   * role administration and unrestricted clinical access.
   */
  isSensitive: boolean;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Role {
  id: WonFlowId;

  /**
   * Platform roles may not belong to a hospital organization.
   */
  organizationId?: WonFlowId;

  name: string;
  code: string;
  description?: string;

  category: RoleCategory;

  /**
   * System roles are shipped by WonFlow.
   * Custom roles are created by hospital administrators.
   */
  isSystemRole: boolean;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RolePermissionGrant {
  id: WonFlowId;

  roleId: WonFlowId;
  permissionId: WonFlowId;

  effect: PermissionEffect;

  /**
   * Optional restrictions applied to this permission.
   */
  constraints?: AccessConstraints;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AccessConstraints {
  /**
   * The user may only access branches assigned to them.
   */
  requireAssignedBranch?: boolean;

  /**
   * The user may only access departments assigned to them.
   */
  requireAssignedDepartment?: boolean;

  /**
   * Clinical access requires an active care relationship,
   * encounter assignment or explicit clinical task.
   */
  requireCareRelationship?: boolean;

  /**
   * Patient Access requires a verified patient or guardian relationship.
   */
  requirePatientRelationship?: boolean;

  /**
   * Restricts actions to records created by the same user.
   */
  requireResourceOwnership?: boolean;

  /**
   * Restricts access to explicitly enabled modules.
   */
  requireEnabledModule?: boolean;

  /**
   * Restricts access to specific encounter classes.
   */
  allowedEncounterClasses?: string[];

  /**
   * Restricts access to specific service codes.
   */
  allowedServiceCodes?: string[];

  /**
   * Prevents exporting or printing even when read access is allowed.
   */
  preventDataExport?: boolean;

  /**
   * Requires reauthentication before a sensitive action.
   */
  requireReauthentication?: boolean;
}

export interface AssignmentScope {
  id: WonFlowId;

  type: AccessScopeType;

  organizationId?: WonFlowId;
  branchId?: WonFlowId;
  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  patientId?: WonFlowId;

  /**
   * Includes lower levels in the hierarchy.
   *
   * Example:
   * A department scope may include its operational units.
   */
  includeDescendants: boolean;
}

export interface UserRoleAssignment {
  id: WonFlowId;

  userId: WonFlowId;
  roleId: WonFlowId;

  organizationId?: WonFlowId;

  scopes: AssignmentScope[];

  status: AssignmentStatus;

  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;

  assignedByUserId: WonFlowId;
  assignmentReason?: string;

  suspendedByUserId?: WonFlowId;
  suspendedAt?: IsoDateTime;
  suspensionReason?: string;

  revokedByUserId?: WonFlowId;
  revokedAt?: IsoDateTime;
  revocationReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface UserModuleAssignment {
  id: WonFlowId;

  userId: WonFlowId;
  organizationId: WonFlowId;

  moduleCode: string;

  branchId?: WonFlowId;
  branchDepartmentId?: WonFlowId;

  enabled: boolean;

  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AccessContext {
  actorUserId: WonFlowId;

  organizationId?: WonFlowId;
  branchId?: WonFlowId;
  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;

  /**
   * Patient and encounter context are required for many clinical actions.
   */
  patientId?: WonFlowId;
  encounterId?: WonFlowId;
  careEpisodeId?: WonFlowId;

  activeRoleAssignmentIds: WonFlowId[];
  enabledModuleCodes: string[];

  supportAccessSessionId?: WonFlowId;
  breakGlassSessionId?: WonFlowId;

  occurredAt: IsoDateTime;
}

export interface AccessRequest {
  id: WonFlowId;

  permissionCode: PermissionCode;
  context: AccessContext;

  resourceType: PermissionDomain;
  resourceId?: WonFlowId;

  /**
   * Additional resource ownership information used by policy evaluation.
   */
  resourceOrganizationId?: WonFlowId;
  resourceBranchId?: WonFlowId;
  resourceDepartmentId?: WonFlowId;
  resourcePatientId?: WonFlowId;
  resourceOwnerUserId?: WonFlowId;
}

export interface AccessDecision {
  requestId: WonFlowId;

  allowed: boolean;

  reasons: AccessDecisionReason[];

  matchedRoleAssignmentIds: WonFlowId[];
  matchedPermissionGrantIds: WonFlowId[];

  evaluatedAt: IsoDateTime;
}

export interface SupportAccessSession {
  id: WonFlowId;

  platformUserId: WonFlowId;
  organizationId: WonFlowId;

  requestedReason: string;
  approvedReason?: string;

  approvedByUserId?: WonFlowId;
  rejectedByUserId?: WonFlowId;

  status:
    | "requested"
    | "approved"
    | "active"
    | "expired"
    | "revoked"
    | "rejected";

  requestedAt: IsoDateTime;
  approvedAt?: IsoDateTime;
  rejectedAt?: IsoDateTime;
  rejectionReason?: string;
  activatedAt?: IsoDateTime;
  activatedByUserId?: WonFlowId;
  expiresAt?: IsoDateTime;
  revokedAt?: IsoDateTime;
  revokedByUserId?: WonFlowId;
  revocationReason?: string;

  allowedPermissionCodes: PermissionCode[];
  allowedBranchIds?: WonFlowId[];

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BreakGlassAccessSession {
  id: WonFlowId;

  userId: WonFlowId;
  organizationId: WonFlowId;

  patientId: WonFlowId;
  encounterId?: WonFlowId;

  reason: string;

  status:
    | "active"
    | "expired"
    | "revoked"
    | "reviewed";

  startedAt: IsoDateTime;
  expiresAt: IsoDateTime;

  reviewedByUserId?: WonFlowId;
  reviewedAt?: IsoDateTime;
  reviewNotes?: string;
}

export interface AuthorizationAggregate {
  permissions: Permission[];
  roles: Role[];
  rolePermissionGrants: RolePermissionGrant[];
  userRoleAssignments: UserRoleAssignment[];
  moduleAssignments: UserModuleAssignment[];
}
