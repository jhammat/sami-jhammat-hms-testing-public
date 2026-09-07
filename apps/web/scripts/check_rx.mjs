import { PrismaClient } from '../../../packages/database/src/generated/prisma/client/index.js';
const prisma = new PrismaClient();

async function main() {
  const rxList = await prisma.prescription.findMany({
    include: {
      patient: true,
      items: { include: { medication: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('Total Rx in DB:', rxList.length);
  for (const r of rxList) {
    console.log({
      id: r.id,
      patient: `${r.patient?.givenName} ${r.patient?.familyName}`,
      patientId: r.patientId,
      mrNumber: r.patient?.patientNumber,
      status: r.status,
      itemsCount: r.items?.length,
      items: r.items?.map(i => `${i.medication?.genericName || i.medication?.brandName || i.medicationId} (${i.dose})`),
      createdAt: r.createdAt
    });
  }

  const accesses = await prisma.patientAccess.findMany({
    include: {
      patient: true,
      identity: true
    },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log('\nPatient Access records:');
  for (const a of accesses) {
    console.log({
      email: a.identity?.email,
      patientName: `${a.patient?.givenName} ${a.patient?.familyName}`,
      patientId: a.patientId,
      mrNumber: a.patient?.patientNumber,
      isActive: a.isActive
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
