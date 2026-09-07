import { database } from "@wonflow/database";

async function main() {
  const sessions = await database.authSession.findMany({
    where: { patientId: { not: null } },
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  console.log("Patient sessions count:", sessions.length);
  for (const s of sessions) {
    console.log({
      id: s.id,
      identityId: s.identityId,
      membershipId: s.membershipId,
      tenantId: s.tenantId,
      organizationId: s.organizationId,
      branchId: s.branchId,
      workspace: s.workspace,
      patientId: s.patientId,
      status: s.status,
    });
  }
}

main().catch(console.error).finally(() => database.$disconnect());
