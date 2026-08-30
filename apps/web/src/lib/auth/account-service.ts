import { database } from "@wonflow/database";
import type { Prisma, WorkspaceCode } from "@wonflow/database";
import { homePathForRole } from "./accounts";
import type { WonFlowRole } from "./accounts";
import { verifyPassword } from "./password";

const MAX_FAILURES = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface AvailableLoginContext {
  membershipId: string | null; tenantId: string | null; organizationId: string | null;
  branchId: string | null; workspace: WorkspaceCode | null; role: WonFlowRole;
  organizationLabel: string; branchLabel: string | null; homePath: string;
  patientId?: string | null; relationship?: string | null; patientName?: string | null;
}
export interface AuthenticatedAccount {
  identityId: string; email: string; displayName: string;
  contexts: AvailableLoginContext[]; requiresMfa: boolean; mustChangePassword: boolean;
  /** Set when every one of this identity's memberships belongs to a suspended organization — the login route surfaces this distinctly rather than a generic "no access" message. */
  suspendedOrganizationLabel: string | null;
}

const workspaceRoles: Record<WorkspaceCode, WonFlowRole> = {
  ADMIN: "admin", RECEPTION: "reception", DOCTOR: "doctor", PATIENT: "patient",
  LABORATORY: "laboratory", RADIOLOGY: "radiology", PHARMACY: "pharmacy",
  BILLING: "billing", MANAGEMENT: "management",
  PHYSIOTHERAPIST: "physiotherapist", NUTRITIONIST: "nutritionist",
};


/**
 * The one query both sign-in paths use, so the context list cannot drift
 * between "signed in with a password" and "picked a portal afterwards".
 */
function findIdentityForLogin(where: Prisma.IdentityWhereUniqueInput) {
  return database.identity.findUnique({
    where,
    include: {
      memberships: { where: { status: "ACTIVE" }, include: { organization: true, primaryBranch: true, tenant: true } },
      mfaCredentials: { where: { status: "ACTIVE" }, select: { id: true } },
    },
  });
}

type IdentityWithContext = NonNullable<Awaited<ReturnType<typeof findIdentityForLogin>>>;

export async function authenticateAccount(email: string, password: string): Promise<AuthenticatedAccount | null> {
  const identity = await findIdentityForLogin({ normalizedEmail: email.trim().toLowerCase() });
  if (!identity?.passwordHash || identity.status !== "ACTIVE" || (identity.lockedUntil && identity.lockedUntil > new Date())) return null;
  if (!(await verifyPassword(password, identity.passwordHash))) {
    const failures = identity.failedLoginCount + 1;
    await database.identity.update({ where: { id: identity.id }, data: {
      failedLoginCount: failures, lockedUntil: failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      status: failures >= MAX_FAILURES ? "LOCKED" : identity.status,
    } });
    return null;
  }
  await database.identity.update({ where: { id: identity.id }, data: { failedLoginCount: 0, lockedUntil: null, lastAuthenticatedAt: new Date() } });
  return buildAccount(identity);
}

/**
 * Rebuilds an account for an identity whose password was already accepted.
 *
 * The second step of a multi-workspace sign-in has to know which portals this
 * person may enter, and it must not take the client's word for it. The
 * pending-login cookie says WHO; this says what they are allowed to be. The
 * contexts are re-read from the database every time, so a membership revoked
 * between the two steps is gone by the time the session is created.
 */
export async function loadAccountByIdentityId(identityId: string): Promise<AuthenticatedAccount | null> {
  const identity = await findIdentityForLogin({ id: identityId });

  if (!identity || identity.status !== "ACTIVE") return null;
  if (identity.lockedUntil && identity.lockedUntil > new Date()) return null;

  return buildAccount(identity);
}

async function buildAccount(identity: IdentityWithContext): Promise<AuthenticatedAccount> {
  const contexts: AvailableLoginContext[] = [];
  let suspendedOrganizationLabel: string | null = null;
  if (identity.isPlatformAdministrator) contexts.push({ membershipId: null, tenantId: null, organizationId: null, branchId: null, workspace: null, role: "platform", organizationLabel: "WonFlow Platform", branchLabel: null, homePath: homePathForRole("platform") });
  for (const membership of identity.memberships) {
    if (membership.tenant.status !== "ACTIVE") {
      if (membership.tenant.status === "SUSPENDED") suspendedOrganizationLabel = membership.organization.displayName;
      continue;
    }
    for (const workspace of membership.workspaceCodes) {
      const role = workspaceRoles[workspace];
      contexts.push({ membershipId: membership.id, tenantId: membership.tenantId, organizationId: membership.organizationId,
        branchId: membership.primaryBranchId, workspace, role, organizationLabel: membership.organization.displayName,
        branchLabel: membership.primaryBranch?.name ?? null, homePath: homePathForRole(role) });
    }
  }

  const now = new Date();

  /**
   * Relationships that are clinical staff access, not a patient-portal seat.
   *
   * Accepting a referral writes a PatientAccess row with relationship
   * "care-team-allied" so the therapist can reach that patient's record. It
   * is NOT a portal login. Counting it as one gave every physiotherapist a
   * second context the moment they accepted their first referral, so signing
   * in stopped going straight to their workspace and instead asked them to
   * choose between Physiotherapy and "Caregiver for <patient>" — a seat that
   * would show them the patient's own phone view.
   *
   * Family caregivers are a different thing entirely and still belong here;
   * only staff-side grants are excluded.
   */
  const STAFF_ACCESS_RELATIONSHIPS = ["care-team-allied", "care-team"];

  const patientAccesses = await database.patientAccess.findMany({
    where: {
      identityId: identity.id,
      isActive: true,
      relationship: { notIn: STAFF_ACCESS_RELATIONSHIPS },
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      patient: { status: "ACTIVE", tenant: { status: "ACTIVE" } },
    },
    include: {
      patient: {
        include: {
          tenant: true,
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  for (const access of patientAccesses) {
    const patientName = `${access.patient.givenName} ${access.patient.familyName}`;
    const orgLabel = access.patient.tenant.displayName;
    const isCaregiver = access.relationship !== "self";
    const branchLabel = isCaregiver ? `Caregiver for ${patientName} (${access.relationship})` : `Patient Portal`;

    // If an existing membership context for this tenant is already a patient context without a patientId, enrich it
    const existingMembershipPatientContext = contexts.find(
      (c) => c.tenantId === access.patient.tenantId && c.role === "patient" && !c.patientId,
    );

    if (existingMembershipPatientContext) {
      existingMembershipPatientContext.patientId = access.patient.id;
      existingMembershipPatientContext.relationship = access.relationship;
      existingMembershipPatientContext.patientName = patientName;
      if (isCaregiver) {
        existingMembershipPatientContext.branchLabel = branchLabel;
      }
      continue;
    }

    // Only add if not already in contexts with same patientId/tenantId
    const alreadyPresent = contexts.some(
      (c) => c.tenantId === access.patient.tenantId && c.role === "patient" && c.patientId === access.patient.id,
    );
    if (!alreadyPresent) {
      contexts.push({
        membershipId: null,
        tenantId: access.patient.tenantId,
        organizationId: null,
        branchId: null,
        workspace: null,
        role: "patient",
        organizationLabel: orgLabel,
        branchLabel,
        homePath: homePathForRole("patient"),
        patientId: access.patient.id,
        relationship: access.relationship,
        patientName,
      });
    }
  }

  return { identityId: identity.id, email: identity.email, displayName: identity.memberships[0]?.displayName ?? identity.email,
    contexts, requiresMfa: identity.mfaCredentials.length > 0, mustChangePassword: identity.mustChangePassword,
    suspendedOrganizationLabel: contexts.length === 0 ? suspendedOrganizationLabel : null };
}
