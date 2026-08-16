import { apiGet, apiPatch, apiPost } from "./client";
import { useApiMutation } from "./use-api-mutation";
import { useApiResource } from "./use-api-resource";
import type { UseApiResourceResult } from "./use-api-resource";
import type { UseApiMutationResult } from "./use-api-mutation";

/** Hospital administration data-access layer: org profile, branches, users, roles, policies, services and onboarding progress. Everything here is server-held; nothing is cached to the browser beyond this in-memory request cache. */

const CONFIG_TAG = "admin-configuration";
const USERS_TAG = "admin-users";
const ROLES_TAG = "admin-roles";
const POLICIES_TAG = "admin-policies";
const SERVICES_TAG = "admin-services";
const ONBOARDING_TAG = "admin-onboarding";

export interface OrganizationRecord {
  id: string;
  displayName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  doctorFeeAuthority: "HOSPITAL" | "DOCTOR";
  branches: BranchRecord[];
}

export interface BranchRecord {
  id: string;
  code: string;
  name: string;
  isMainBranch: boolean;
  status: string;
  timezone: string;
  currencyCode: string;
  email: string | null;
  phone: string | null;
}

export function useConfiguration(): UseApiResourceResult<{ configuration: OrganizationRecord }> {
  return useApiResource<{ configuration: OrganizationRecord }>({ key: "admin-configuration", tags: [CONFIG_TAG], fetcher: (signal) => apiGet<{ configuration: OrganizationRecord }>("/api/v1/admin/configuration", { signal }), isEmpty: () => false });
}

export interface UpdateOrganizationInput { displayName: string; legalName?: string; email?: string; phone?: string; website?: string }
export function useUpdateOrganization(): UseApiMutationResult<{ organization: OrganizationRecord }, UpdateOrganizationInput> {
  return useApiMutation((input: UpdateOrganizationInput) => apiPatch<{ organization: OrganizationRecord }, UpdateOrganizationInput>("/api/v1/admin/configuration", input), { invalidates: [CONFIG_TAG] });
}

export interface CreateBranchInput { code: string; name: string; isMainBranch?: boolean; timezone?: string; currencyCode?: string; email?: string; phone?: string }
export function useCreateBranch(): UseApiMutationResult<{ branch: BranchRecord }, CreateBranchInput> {
  return useApiMutation((input: CreateBranchInput) => apiPost<{ branch: BranchRecord }, CreateBranchInput>("/api/v1/admin/branches", input), { invalidates: [CONFIG_TAG] });
}

export interface AdminUserRecord {
  id: string;
  displayName: string;
  status: string;
  primaryBranchId: string | null;
  identity: { email: string; status: string };
  roles: { role: { id: string; code: string; name: string } }[];
}

export function useUsers(): UseApiResourceResult<{ users: AdminUserRecord[] }> {
  return useApiResource<{ users: AdminUserRecord[] }>({ key: "admin-users", tags: [USERS_TAG], fetcher: (signal) => apiGet<{ users: AdminUserRecord[] }>("/api/v1/admin/users", { signal }), isEmpty: (data) => data.users.length === 0 });
}

export interface InviteUserInput { email: string; displayName: string; primaryBranchId?: string; workspaceCodes?: string[] }
export interface InviteUserResult { invitation: unknown; credentials: { mode: string; username: string; temporaryPassword: string; loginUrl: string } }
export function useInviteUser(): UseApiMutationResult<InviteUserResult, InviteUserInput> {
  return useApiMutation((input: InviteUserInput) => apiPost<InviteUserResult, InviteUserInput>("/api/v1/admin/users/invitations", input), { invalidates: [USERS_TAG] });
}

export function useAssignMembershipRoles(): UseApiMutationResult<{ user: AdminUserRecord }, { membershipId: string; roleIds: string[] }> {
  return useApiMutation(({ membershipId, roleIds }) => apiPatch<{ user: AdminUserRecord }, { roleIds: string[] }>(`/api/v1/admin/users/${membershipId}/roles`, { roleIds }), { invalidates: [USERS_TAG] });
}

export function useUpdateUserStatus(): UseApiMutationResult<{ user: AdminUserRecord }, { membershipId: string; status: string }> {
  return useApiMutation(({ membershipId, status }) => apiPatch<{ user: AdminUserRecord }, { status: string }>(`/api/v1/admin/users/${membershipId}`, { status }), { invalidates: [USERS_TAG] });
}

export interface RoleRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  permissions: { permission: { id: string; code: string } }[];
}

export function useRoles(): UseApiResourceResult<{ roles: RoleRecord[] }> {
  return useApiResource<{ roles: RoleRecord[] }>({ key: "admin-roles", tags: [ROLES_TAG], fetcher: (signal) => apiGet<{ roles: RoleRecord[] }>("/api/v1/admin/roles", { signal }), isEmpty: (data) => data.roles.length === 0 });
}

export interface CreateRoleInput { code: string; name: string; description?: string; permissionCodes: string[] }
export function useCreateRole(): UseApiMutationResult<{ role: RoleRecord }, CreateRoleInput> {
  return useApiMutation((input: CreateRoleInput) => apiPost<{ role: RoleRecord }, CreateRoleInput>("/api/v1/admin/roles", input), { invalidates: [ROLES_TAG] });
}

export function useUpdateRolePermissions(): UseApiMutationResult<{ role: RoleRecord }, { roleId: string; permissionCodes: string[] }> {
  return useApiMutation(({ roleId, permissionCodes }) => apiPatch<{ role: RoleRecord }, { permissionCodes: string[] }>(`/api/v1/admin/roles/${roleId}`, { permissionCodes }), { invalidates: [ROLES_TAG, USERS_TAG] });
}

export interface PolicyVersionRecord { id: string; version: number; title: string; body: string; publishedAt: string | null }
export interface PolicyRecord {
  id: string;
  code: string;
  title: string;
  category: string;
  summary: string | null;
  body: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
  versions: PolicyVersionRecord[];
}

export function usePolicies(): UseApiResourceResult<{ policies: PolicyRecord[] }> {
  return useApiResource<{ policies: PolicyRecord[] }>({ key: "admin-policies", tags: [POLICIES_TAG], fetcher: (signal) => apiGet<{ policies: PolicyRecord[] }>("/api/v1/admin/policies", { signal }), isEmpty: (data) => data.policies.length === 0 });
}

export interface CreatePolicyInput { code?: string; title: string; category: string; summary?: string; body: string }
export function useCreatePolicy(): UseApiMutationResult<{ policy: PolicyRecord }, CreatePolicyInput> {
  return useApiMutation((input: CreatePolicyInput) => apiPost<{ policy: PolicyRecord }, CreatePolicyInput>("/api/v1/admin/policies", input), { invalidates: [POLICIES_TAG] });
}

export function useUpdatePolicy(): UseApiMutationResult<{ policy: PolicyRecord }, { policyId: string; title?: string; summary?: string; body?: string }> {
  return useApiMutation(({ policyId, ...input }) => apiPatch<{ policy: PolicyRecord }, typeof input>(`/api/v1/admin/policies/${policyId}`, input), { invalidates: [POLICIES_TAG] });
}

export function usePolicyAction(): UseApiMutationResult<{ policy: PolicyRecord }, { policyId: string; action: "publish" | "archive" | "restore" }> {
  return useApiMutation(({ policyId, action }) => apiPatch<{ policy: PolicyRecord }, { action: string }>(`/api/v1/admin/policies/${policyId}`, { action }), { invalidates: [POLICIES_TAG] });
}

export interface AdminServiceRecord {
  id: string;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  code: string;
  name: string;
  category: string;
  durationMinutes: number;
  priceMinorUnits: number | null;
  currencyCode: string;
  publiclyBookable: boolean;
  isActive: boolean;
  feeHistory: { priceMinorUnits: number; changedAt: string }[];
}

export function useAdminServices(): UseApiResourceResult<{ services: AdminServiceRecord[] }> {
  return useApiResource<{ services: AdminServiceRecord[] }>({ key: "admin-services", tags: [SERVICES_TAG], fetcher: (signal) => apiGet<{ services: AdminServiceRecord[] }>("/api/v1/admin/services", { signal }), isEmpty: (data) => data.services.length === 0 });
}

export interface CreateAdminServiceInput { branchId?: string; name: string; category: string; durationMinutes: number; priceMinorUnits?: number; publiclyBookable?: boolean }
export function useCreateAdminService(): UseApiMutationResult<{ service: AdminServiceRecord }, CreateAdminServiceInput> {
  return useApiMutation((input: CreateAdminServiceInput) => apiPost<{ service: AdminServiceRecord }, CreateAdminServiceInput>("/api/v1/admin/services", input), { invalidates: [SERVICES_TAG] });
}

export function useUpdateAdminService(): UseApiMutationResult<{ service: AdminServiceRecord }, { serviceId: string; priceMinorUnits?: number; durationMinutes?: number; publiclyBookable?: boolean; isActive?: boolean }> {
  return useApiMutation(({ serviceId, ...input }) => apiPatch<{ service: AdminServiceRecord }, typeof input>(`/api/v1/admin/services/${serviceId}`, input), { invalidates: [SERVICES_TAG] });
}

export interface OnboardingStepState { status: "not-started" | "in-progress" | "completed" | "skipped"; startedAt?: string; completedAt?: string; skippedAt?: string }
export interface OnboardingState { currentStep: string; steps: Record<string, OnboardingStepState> }

export function getOnboardingState(signal?: AbortSignal): Promise<{ onboarding: OnboardingState }> {
  return apiGet<{ onboarding: OnboardingState }>("/api/v1/admin/onboarding", { signal });
}

export function useOnboardingState(): UseApiResourceResult<{ onboarding: OnboardingState }> {
  return useApiResource<{ onboarding: OnboardingState }>({ key: "admin-onboarding", tags: [ONBOARDING_TAG], fetcher: (signal) => getOnboardingState(signal), isEmpty: () => false });
}

export function saveOnboardingState(input: OnboardingState): Promise<{ onboarding: OnboardingState }> {
  return apiPatch<{ onboarding: OnboardingState }, OnboardingState>("/api/v1/admin/onboarding", input);
}
