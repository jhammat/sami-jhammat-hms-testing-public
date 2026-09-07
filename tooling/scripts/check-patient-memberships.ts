import { database } from "@wonflow/database";

async function main() {
  const allPatientSessions = await database.authSession.findMany({
    where: {
      patientId: { not: null },
    },
    include: {
      membership: true,
      identity: true,
    },
  });

  console.log(`Total patient sessions in DB: ${allPatientSessions.length}`);
  for (const s of allPatientSessions) {
    console.log({
      id: s.id,
      email: s.identity?.email,
      patientId: s.patientId,
      membershipId: s.membershipId,
      hasMembership: Boolean(s.membership),
      organizationId: s.organizationId,
      tenantId: s.tenantId,
      branchId: s.branchId,
      workspace: s.workspace,
      status: s.status,
    });
  }

  const allPatientIdentities = await database.patientAccess.findMany({
    include: {
      identity: {
        include: {
          memberships: true,
        }
      },
      patient: true,
    }
  });

  console.log(`\nTotal patient access rows: ${allPatientIdentities.length}`);
  for (const pa of allPatientIdentities) {
    console.log({
      patientId: pa.patientId,
      patientName: `${pa.patient.givenName} ${pa.patient.familyName}`,
      tenantId: pa.patient.tenantId,
      identityEmail: pa.identity.email,
      membershipsCount: pa.identity.memberships.length,
      memberships: pa.identity.memberships.map(m => ({
        id: m.id,
        tenantId: m.tenantId,
        organizationId: m.organizationId,
        workspaces: m.workspaceCodes,
      })),
    });
  }
}

main().catch(console.error).finally(() => database.$disconnect());
