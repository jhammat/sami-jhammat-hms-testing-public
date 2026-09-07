import { database } from "@wonflow/database";
import { loadAccountByIdentityId } from "../../apps/web/src/lib/auth/account-service";

async function main() {
  const identity = await database.identity.findFirst({
    where: { email: "testpatient1788162396@example.com" }
  });
  if (!identity) return console.log("Not found");

  const account = await loadAccountByIdentityId(identity.id);
  console.log("Account for pure patient:", JSON.stringify(account, null, 2));
}

main().catch(console.error).finally(() => database.$disconnect());
