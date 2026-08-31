#!/usr/bin/env node
/**
 * Say exactly how a database differs from the schema this build expects, and
 * optionally close the gap.
 *
 * `prisma migrate deploy` applies migrations that are not recorded in
 * `_prisma_migrations`. It cannot help when the record and the database
 * disagree — a migration marked applied whose columns are not actually there.
 * Deploy then skips it, reports success, and the application keeps failing on
 * a column that does not exist:
 *
 *   The column PatientAccess.permissions does not exist in the current database
 *
 * That is the state this exists for. It compares the live database against
 * schema.prisma and prints the SQL that would reconcile them. Nothing is
 * written without `--apply`.
 *
 *   pnpm db:repair            what is missing, and the SQL that would fix it
 *   pnpm db:repair --apply    run that SQL
 *
 * Always run `prisma migrate deploy` first. This is for what deploy cannot
 * reach, not a replacement for it.
 */

import { spawn } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";

const databaseDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "packages",
  "database",
);

const apply = process.argv.includes("--apply");

/*
 * Run the Prisma CLI's own entry point with this Node, rather than going
 * through `npx`. On Windows npx resolves to a `.cmd`, which recent Node
 * refuses to spawn without a shell (EINVAL), and `shell: true` concatenates
 * arguments instead of escaping them. Resolving the package settles both.
 */
const prismaCli = createRequire(join(databaseDir, "package.json")).resolve(
  "prisma/build/index.js",
);

function run(args, { capture = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [prismaCli, ...args], {
      cwd: databaseDir,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let out = "";
    let err = "";

    if (capture) {
      child.stdout.on("data", (chunk) => (out += chunk));
      child.stderr.on("data", (chunk) => (err += chunk));
    }

    child.on("close", (code) => resolve({ code, out, err }));
  });
}

function heading(text) {
  console.log(`\n${text}\n${"-".repeat(text.length)}`);
}

heading("Migration history");

// Status is informational here. It exits non-zero whenever anything is
// pending, which is the normal case on a server that has not deployed yet.
await run(["migrate", "status"]);

heading("Database compared against the schema");

const diff = await run(
  [
    "migrate",
    "diff",
    "--from-config-datasource",
    "--to-schema",
    "prisma/schema.prisma",
    "--script",
  ],
  { capture: true },
);

if (diff.code !== 0) {
  console.error(diff.err || diff.out);
  console.error("\nCould not compare the database with the schema.");
  console.error("Check that DATABASE_URL points at a database this host can reach.");
  process.exit(1);
}

/*
 * The CLI writes a banner to stdout before the script - the dotenv loader
 * announcing the file it read, and Prisma naming its config and schema.
 * Captured verbatim and handed to `db execute`, that banner is the first
 * thing Postgres tries to parse, and it fails on the very first character.
 * Everything Prisma emits as SQL begins at its first `--` comment.
 */
const scriptLines = diff.out.split(/\r?\n/);
const firstSql = scriptLines.findIndex((line) => line.trimStart().startsWith("--"));
const sql = firstSql === -1 ? "" : scriptLines.slice(firstSql).join("\n");

// A clean comparison still prints a comment line, so judge by whether any
// statement survives once comments and blanks are removed.
const statements = sql
  .split("\n")
  .filter((line) => line.trim() && !line.trim().startsWith("--"));

if (statements.length === 0) {
  console.log("No difference. The database matches the schema this build expects.\n");
  process.exit(0);
}

console.log(sql);

if (!apply) {
  console.log(
    [
      "",
      `${statements.length} statement(s) would bring the database up to the schema.`,
      "",
      "Nothing has been changed. Run `prisma migrate deploy` first if you have",
      "not; it is the correct tool when migrations are simply unapplied. Use",
      "this only for a database whose recorded history and real shape disagree:",
      "",
      "  pnpm db:repair --apply",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

const scriptPath = join(tmpdir(), `wonflow-db-repair-${Date.now()}.sql`);
await writeFile(scriptPath, sql, "utf8");

heading("Applying");

// The datasource comes from prisma.config.ts. Prisma 7's db execute takes
// no --schema, and passing one is an error rather than a no-op.
const applied = await run(["db", "execute", "--file", scriptPath]);

await unlink(scriptPath).catch(() => undefined);

if (applied.code !== 0) {
  console.error("\nThe repair did not complete. The database is unchanged by any");
  console.error("statement that failed; earlier statements in the script may have run.");
  process.exit(applied.code ?? 1);
}

heading("Verifying");

const after = await run(
  ["migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"],
  { capture: true },
);

if (after.code === 0) {
  console.log("The database now matches the schema.\n");
  process.exit(0);
}

console.error("Differences remain:\n");
console.error(after.out || after.err);
process.exit(1);
