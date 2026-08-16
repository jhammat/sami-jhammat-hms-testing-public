import { config } from "dotenv";

config({ path: ".env.local" });
config();

/**
 * Rotates the wonflow_app database role's password (created by the
 * audit_event_role_immutability migration) from WONFLOW_APP_DB_PASSWORD.
 * Connects with DATABASE_URL, the schema-owner credential — never with the
 * restricted role itself, which cannot ALTER ROLE.
 */
async function main(): Promise<void> {
  const password = process.env.WONFLOW_APP_DB_PASSWORD;

  if (!password) {
    console.log(
      "WONFLOW_APP_DB_PASSWORD is not set — leaving the wonflow_app role's " +
        "password as the migration's placeholder. Fine for a local scratch " +
        "database; set it before this reaches anything real.",
    );
    return;
  }

  const { database } = await import("../../packages/database/src/index.js");
  // ALTER ROLE ... PASSWORD takes a literal, not a bind parameter, so
  // Prisma's tagged-template $executeRaw refuses it outright. The value
  // is our own generated secret (never user input), but it's still
  // escaped like untrusted input before being inlined.
  const escapedPassword = password.replace(/'/g, "''");
  await database.$executeRawUnsafe(`ALTER ROLE wonflow_app WITH PASSWORD '${escapedPassword}'`);
  await database.$disconnect();
  console.log("wonflow_app role password rotated from WONFLOW_APP_DB_PASSWORD.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
