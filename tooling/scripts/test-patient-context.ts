import { database } from "@wonflow/database";

async function testPatientContext() {
  const patientAccess = await database.patientAccess.findFirst({
    where: {
      identity: {
        memberships: {
          none: {}
        }
      }
    },
    include: {
      patient: {
        include: {
          tenant: {
            include: {
              branches: true,
              organizations: true,
            }
          }
        }
      },
      identity: {
        include: {
          memberships: true,
        }
      }
    }
  });

  console.log("Patient access found (no memberships):", {
    email: patientAccess?.identity.email,
    patientName: `${patientAccess?.patient.givenName} ${patientAccess?.patient.familyName}`,
    tenant: patientAccess?.patient.tenant.displayName,
    tenantId: patientAccess?.patient.tenantId,
    branchesCount: patientAccess?.patient.tenant.branches.length,
    organizationsCount: patientAccess?.patient.tenant.organizations.length,
    firstOrgId: patientAccess?.patient.tenant.organizations[0]?.id,
    firstBranchId: patientAccess?.patient.tenant.branches[0]?.id,
  });
}

testPatientContext().catch(console.error).finally(() => database.$disconnect());
