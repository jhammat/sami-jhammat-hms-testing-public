import { database } from "@wonflow/database";
import { NextResponse } from "next/server";

/**
 * Is this instance ready to serve?
 *
 * This used to be `SELECT 1`, which answers "can I reach Postgres" and
 * nothing else. A server whose database was several migrations behind passed
 * it happily while every sign-in failed with
 *
 *   The column PatientAccess.permissions does not exist in the current database
 *
 * so the one endpoint that exists to say "something is wrong here" said
 * everything was fine. Reaching the database and having the schema the code
 * was built against are different questions, and the second is the one that
 * actually broke a deployment.
 *
 * The name of the newest applied migration is reported so an operator can
 * compare it against `packages/database/prisma/migrations` without shell
 * access to the database. Migration names are timestamps and feature
 * descriptions - no patient data, no configuration, nothing an attacker gains
 * from. This endpoint is public because a health check that needs a session is
 * useless exactly when the database is down.
 */
export async function GET() {
  try {
    await database.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json(
      { status: "not-ready", database: "unreachable" },
      { status: 503 },
    );
  }

  let latestMigration: string | null = null;
  let failedMigration: string | null = null;

  try {
    const rows = await database.$queryRaw<
      { migration_name: string; finished_at: Date | null }[]
    >`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY started_at DESC
      LIMIT 25
    `;

    latestMigration = rows.find((row) => row.finished_at !== null)?.migration_name ?? null;

    // A migration that started and never finished leaves the schema in a state
    // no code was written against, and `migrate deploy` refuses to continue
    // until someone resolves it. Worth saying out loud rather than leaving an
    // operator to find it.
    failedMigration = rows.find((row) => row.finished_at === null)?.migration_name ?? null;
  } catch {
    // A database that has never been migrated has no _prisma_migrations table.
    // That is itself the answer, and it is not an error to report it.
    return NextResponse.json(
      { status: "not-ready", database: "ok", migrations: "never-applied" },
      { status: 503 },
    );
  }

  if (failedMigration) {
    return NextResponse.json(
      { status: "not-ready", database: "ok", failedMigration },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: "ready",
    latestMigration,
    timestamp: new Date().toISOString(),
  });
}
