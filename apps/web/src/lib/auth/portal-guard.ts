import { redirect } from "next/navigation";

import { homePathForRole, type WonFlowRole } from "./accounts";
import { rolesForPortalPath, rolesUnderPortalPath } from "./portal-access";
import type { WonFlowSessionPayload } from "./session";
import { readSession } from "./session-server";

/**
 * The guard every portal layout runs before it renders anything.
 *
 * `portalPath` is the portal's own prefix — the layout knows it statically,
 * which is what makes this usable from a server layout where there is no
 * pathname to read.
 *
 * Someone signed into the wrong portal is sent to their own home rather than
 * to an error: every role's home is allowed by its own rule, so this cannot
 * loop, and the destination is somewhere they can actually work.
 *
 * This lives apart from the rules it enforces because the sidebar needs the
 * same table on the client, and it must not drag the session reader — and
 * with it the database client — into a browser bundle.
 */
export async function requirePortal(portalPath: string): Promise<WonFlowSessionPayload> {
  return guard(portalPath, rolesForPortalPath(portalPath));
}

/**
 * The guard for a layout that sits above several portals — it admits anyone
 * who belongs somewhere beneath it and leaves the exact decision to the child
 * layout that owns the area.
 */
export async function requirePortalTree(prefix: string): Promise<WonFlowSessionPayload> {
  return guard(prefix, rolesUnderPortalPath(prefix));
}

async function guard(
  portalPath: string,
  roles: readonly WonFlowRole[] | null,
): Promise<WonFlowSessionPayload> {
  const session = await readSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(portalPath)}`);
  }

  if (roles !== null && !roles.includes(session.role)) {
    redirect(homePathForRole(session.role));
  }

  return session;
}
