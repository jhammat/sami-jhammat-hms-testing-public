#!/usr/bin/env node
/**
 * Creates and applies a Prisma migration without a shadow database.
 *
 * `prisma migrate dev` cannot be used on this project: the development
 * database carries five migrations that exist in no branch of this repo
 * (20260820000000_care_programs_engine, 20260820001000_queue_rooms,
 * 20260820002000_observation_definitions, 20260820003000_mdt_review,
 * 20260820004000_clinical_messaging) and roughly twenty-three tables that
 * schema.prisma does not declare. `migrate dev` diffs through a shadow
 * database, sees that history it cannot reproduce, and offers only to reset
 * the database — which would destroy the local data.
 *
 * `prisma migrate deploy` is unaffected and remains the deployment path.
 *
 * This script does what `migrate dev` would have done, minus the shadow
 * database:
 *   1. diff the committed schema (git HEAD) against the working schema,
 *   2. write the result as a migration file,
 *   3. apply it,
 *   4. record it in _prisma_migrations,
 *   5. regenerate the client.
 *
 * Usage:  pnpm db:migrate:safe <migration_name>
 *
 * Review the generated SQL before trusting it. The diff is only as good as
 * the two schemas it compares, and a rename still reads as a drop plus an
 * add — exactly as it would under `migrate dev`.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DATABASE_PACKAGE = path.join("packages", "database");
const SCHEMA = path.join(DATABASE_PACKAGE, "prisma", "schema.prisma");
const MIGRATIONS = path.join(DATABASE_PACKAGE, "prisma", "migrations");

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error("Usage: pnpm db:migrate:safe <migration_name>   (lower_snake_case)");
  process.exit(1);
}

// `shell: true` because pnpm is a .cmd shim on Windows, which spawnSync
// cannot execute directly. Arguments here are either literals from this file
// or the validated migration name, so there is nothing to quote-escape.
const run = (command, args, options = {}) =>
  execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: true, ...options });

const prisma = (args, options) => run("pnpm", ["exec", "prisma", ...args], { cwd: DATABASE_PACKAGE, ...options });

/** Prisma prints a dotenv banner to stdout; it is not part of the SQL. */
const stripBanner = (text) =>
  text
    .split("\n")
    .filter((line) => !/^(◇|Loaded Prisma|\s*$)/.test(line))
    .join("\n")
    .trim();

const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const directory = path.join(MIGRATIONS, `${timestamp}_${name}`);

// The committed schema is the "before"; the working tree is the "after".
const previousSchema = path.join(process.env.TEMP ?? ".", `wonflow-schema-head-${timestamp}.prisma`);
fs.writeFileSync(previousSchema, run("git", ["show", `HEAD:${SCHEMA.replace(/\\/g, "/")}`]), "utf8");

console.log("Diffing committed schema against working schema…");
const sql = stripBanner(prisma(["migrate", "diff", "--from-schema", previousSchema, "--to-schema", "prisma/schema.prisma", "--script"]));
fs.unlinkSync(previousSchema);

// Prisma reports "no difference" as the comment `-- This is an empty
// migration.`, not as empty output, so a comment-only script counts as no-op.
const hasStatements = sql.split("\n").some((line) => line.trim() && !line.trim().startsWith("--"));
if (!hasStatements) {
  console.log("No schema changes to migrate.");
  process.exit(0);
}

fs.mkdirSync(directory, { recursive: true });
const file = path.join(directory, "migration.sql");
fs.writeFileSync(file, `${sql}\n`, "utf8");
console.log(`\nWrote ${file}:\n`);
console.log(sql.replace(/^/gm, "    "));

console.log("\nApplying…");
// `prisma db execute` takes its datasource from prisma.config.ts. A bad
// invocation — or a failing statement — is printed but STILL EXITS 0, so a
// migration could otherwise be recorded as applied having run nothing. The
// output is checked for the confirmation line instead of the exit code.
let applied = "";
try {
  applied = prisma(["db", "execute", "--file", path.relative(DATABASE_PACKAGE, file).replace(/\\/g, "/")]);
} catch (error) {
  applied = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
}
if (!/executed successfully/i.test(applied)) {
  fs.rmSync(directory, { recursive: true, force: true });
  console.error("\nThe migration SQL did not run, so nothing was recorded. Prisma said:\n");
  console.error(stripBanner(applied).replace(/^/gm, "    "));
  if (/already exists/i.test(applied)) {
    console.error(
      "\nThat usually means schema.prisma already carries a change that has been\n" +
      "migrated but not committed. This script diffs against the last commit, so\n" +
      "an uncommitted-yet-applied change is generated a second time. Commit the\n" +
      "schema and its migration together, then re-run for the new change.",
    );
  }
  process.exit(1);
}

prisma(["migrate", "resolve", "--applied", path.basename(directory)]);
prisma(["generate"]);

// Prove the migration really ran rather than trusting the ledger: `migrate
// status` compares the recorded history against the live database.
const status = stripBanner(prisma(["migrate", "status"]));
if (!/up to date/i.test(status)) {
  console.error("\nMigration recorded but the database does not look up to date:\n");
  console.error(status);
  process.exit(1);
}

console.log(`\nApplied and recorded ${path.basename(directory)}.`);
console.log("Commit the migration directory together with the schema change.");
