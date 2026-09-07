import { database } from "@wonflow/database";
import { requireRequestContext } from "../../apps/web/src/lib/auth/permission-service";
import { WONFLOW_SESSION_COOKIE } from "../../apps/web/src/lib/auth/session";
import { createHash, randomBytes } from "node:crypto";

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

async function main() {
  const patient = await database.patient.findFirst({
    where: { email: "testpatient1788162396@example.com" },
    include: { tenant: true }
  });
  const identity = await database.identity.findFirst({
    where: { email: "testpatient1788162396@example.com" }
  });

  if (!patient || !identity) return console.log("Not found");

  const rawToken = randomBytes(32).toString("base64url");
  const session = await database.authSession.create({
    data: {
      identityId: identity.id,
      membershipId: null,
      tenantId: patient.tenantId,
      organizationId: null,
      branchId: null,
      workspace: null,
      patientId: patient.id,
      actingRelationship: "self",
      tokenHash: tokenHash(rawToken),
      sourceApplication: "web",
      expiresAt: new Date(Date.now() + 86400000),
    }
  });

  console.log("Created test session:", session.id);
  // Now let's see what happens if we simulate requireRequestContext logic
  console.log("Session role for this session would be: patient");
  console.log("membershipId:", session.membershipId);
  console.log("tenantId:", session.tenantId);
  console.log("organizationId:", session.organizationId);

  // If we run the check from line 70 of permission-service.ts:
  const throws = !session.membershipId || !session.tenantId || !session.organizationId;
  console.log("Does line 70 throw for this patient?", throws);
}

main().catch(console.error).finally(() => database.$disconnect());
