import type { WonFlowRole } from "./accounts";

/**
 * Which roles may open which portal.
 *
 * The proxy only ever asked "is there a session cookie?", and only `/platform`
 * and `/admin` checked anything beyond that. Every other portal was open to
 * any signed-in account, so a receptionist who typed `/doctor` — or followed
 * one of the cross-portal links that used to sit in the sidebar — was handed
 * the whole doctor workspace, and a patient session could do the same.
 *
 * A session cookie is not a portal pass. This table is the portal boundary,
 * and `requirePortal` below is the only way through it.
 *
 * Order matters: the first prefix that matches wins, so the specific
 * department paths must come before the `/operations` catch-all.
 */
interface PortalRouteRule {
  prefix: string;
  roles: readonly WonFlowRole[];
}

/** Front-desk and department staff who share the patient directory and the operations overview. */
const OPERATIONS_DESK_ROLES: readonly WonFlowRole[] = [
  "reception",
  "billing",
  "pharmacy",
  "laboratory",
  "radiology",
];

const PORTAL_ROUTE_ACCESS: readonly PortalRouteRule[] = [
  { prefix: "/platform", roles: ["platform"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/organization", roles: ["admin"] },
  { prefix: "/management", roles: ["management"] },
  { prefix: "/doctor", roles: ["doctor"] },
  { prefix: "/workspace", roles: ["doctor"] },
  { prefix: "/patient", roles: ["patient"] },
  { prefix: "/operations/physiotherapy", roles: ["physiotherapist"] },
  { prefix: "/operations/nutrition", roles: ["nutritionist"] },
  // The alert console is a clinical surface the surgical and allied teams
  // share; it is the one place where those three portals legitimately meet.
  { prefix: "/operations/alerts", roles: ["doctor", "physiotherapist", "nutritionist"] },
  { prefix: "/operations/laboratory", roles: ["laboratory"] },
  { prefix: "/operations/radiology", roles: ["radiology"] },
  { prefix: "/operations/pharmacy", roles: ["pharmacy"] },
  // Reception takes payment at the desk, so the counter is theirs as well.
  { prefix: "/operations/billing", roles: ["billing", "reception"] },
  { prefix: "/operations/reception", roles: ["reception"] },
  { prefix: "/operations/appointments", roles: ["reception", "billing"] },
  { prefix: "/operations/patients", roles: OPERATIONS_DESK_ROLES },
  { prefix: "/operations", roles: OPERATIONS_DESK_ROLES },
];

/**
 * Self-registration lives at `/patient/register` and belongs to nobody yet —
 * whoever opens it has no session at all, so the `/patient` rule below must
 * not claim it.
 */
const PUBLIC_PORTAL_PATHS = ["/patient/register"];

/** The roles allowed to open `pathname`, or null where no portal rule covers it. */
export function rolesForPortalPath(pathname: string): readonly WonFlowRole[] | null {
  if (PUBLIC_PORTAL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return null;
  }

  const rule = PORTAL_ROUTE_ACCESS.find(
    (candidate) => pathname === candidate.prefix || pathname.startsWith(`${candidate.prefix}/`),
  );

  return rule?.roles ?? null;
}

export function canRoleOpen(role: WonFlowRole, pathname: string): boolean {
  const roles = rolesForPortalPath(pathname);

  return roles === null || roles.includes(role);
}

/**
 * Every role allowed anywhere beneath `prefix`.
 *
 * A layout guards a whole subtree, so a guard high up the tree must not be
 * stricter than the branches below it. `/operations` is the case that matters:
 * the physiotherapy and dietetics workspaces live under it but belong to
 * neither the front desk nor a department counter, so guarding `/operations`
 * with the desk roles alone would lock the allied teams out of their own
 * workspace. The parent asks the broad question — are you on the operations
 * side of the hospital at all — and each child layout below asks the exact one.
 */
export function rolesUnderPortalPath(prefix: string): readonly WonFlowRole[] {
  const roles = new Set<WonFlowRole>();

  for (const rule of PORTAL_ROUTE_ACCESS) {
    if (rule.prefix === prefix || rule.prefix.startsWith(`${prefix}/`)) {
      for (const role of rule.roles) roles.add(role);
    }
  }

  return [...roles];
}
