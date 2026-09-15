import { database } from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import { ALLIED_STAFF_TYPES, backfillAlliedStaffProfiles } from "@/server/access/staff-provisioning";

export interface CareTeamMember {
  /** StaffProfile id — what a care plan assignment and a referral assignee are keyed on. */
  id: string;
  staffType: string;
  displayName: string;
  title: string | null;
  employeeNumber: string;
  branchId: string | null;
  branchName: string | null;
  /** Present for doctors only. */
  doctorProfileId?: string;
  departmentId?: string | null;
  departmentName?: string | null;
  specialty?: string | null;
}

export interface CareTeamDirectory {
  allied: CareTeamMember[];
  doctors: CareTeamMember[];
  departments: Array<{ id: string; name: string; code: string; doctorCount: number }>;
}

/**
 * Everyone a surgeon can hand a patient to, named.
 *
 * One call rather than three because the care plan dialog and the referral
 * dialog ask the same question — who is there to assign — and used to answer
 * it from `/api/v1/allied/staff`, which knew about physiotherapists and
 * dietitians and nothing else. A referral to a colleague in another
 * department could not be raised from any screen, so "refer to hepatology"
 * meant a phone call.
 *
 * Names come from `TenantMembership.displayName`, which is the name the
 * hospital actually typed when the account was created — never a placeholder.
 */
export async function readCareTeam(requestContext: WonFlowRequestContext): Promise<CareTeamDirectory> {
  const context = requireTenantContext(requestContext);
  requirePermission(context, "patients.read");

  // Allied clinicians invited before staff records were provisioned on
  // invitation have a login and no StaffProfile, so they cannot be assigned to
  // anything. Give them one here rather than leaving the picker blank with no
  // way for the surgeon to fix it.
  await backfillAlliedStaffProfiles({ tenantId: context.tenantId, organizationId: context.organizationId });

  const [allied, doctors, departments] = await Promise.all([
    database.staffProfile.findMany({
      where: {
        tenantId: context.tenantId,
        status: "ACTIVE",
        staffType: { in: [...ALLIED_STAFF_TYPES] },
        membership: { organizationId: context.organizationId, archivedAt: null, status: { in: ["ACTIVE", "INVITED"] } },
      },
      select: {
        id: true,
        staffType: true,
        title: true,
        employeeNumber: true,
        branch: { select: { id: true, name: true } },
        membership: { select: { displayName: true } },
      },
      orderBy: [{ staffType: "asc" }, { membership: { displayName: "asc" } }],
    }),
    database.doctorProfile.findMany({
      where: {
        tenantId: context.tenantId,
        staffProfile: {
          status: "ACTIVE",
          membership: { organizationId: context.organizationId, archivedAt: null, status: { in: ["ACTIVE", "INVITED"] } },
        },
      },
      select: {
        id: true,
        specialty: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        staffProfile: {
          select: {
            id: true,
            staffType: true,
            title: true,
            employeeNumber: true,
            branch: { select: { id: true, name: true } },
            membership: { select: { displayName: true } },
          },
        },
      },
      orderBy: { staffProfile: { membership: { displayName: "asc" } } },
    }),
    database.department.findMany({
      where: { tenantId: context.tenantId, organizationId: context.organizationId, archivedAt: null, isActive: true },
      select: { id: true, name: true, code: true, _count: { select: { doctors: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    allied: allied.map((row) => ({
      id: row.id,
      staffType: row.staffType,
      displayName: row.membership.displayName,
      title: row.title,
      employeeNumber: row.employeeNumber,
      branchId: row.branch?.id ?? null,
      branchName: row.branch?.name ?? null,
    })),
    doctors: doctors.map((row) => ({
      id: row.staffProfile.id,
      doctorProfileId: row.id,
      staffType: row.staffProfile.staffType,
      displayName: row.staffProfile.membership.displayName,
      title: row.staffProfile.title,
      employeeNumber: row.staffProfile.employeeNumber,
      branchId: row.staffProfile.branch?.id ?? null,
      branchName: row.staffProfile.branch?.name ?? null,
      departmentId: row.department?.id ?? row.departmentId ?? null,
      departmentName: row.department?.name ?? null,
      specialty: row.specialty,
    })),
    departments: departments.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      doctorCount: row._count.doctors,
    })),
  };
}
