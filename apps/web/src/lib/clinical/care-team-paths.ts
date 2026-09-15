import type { WonFlowRole } from "@/lib/auth/accounts";

/**
 * Where each care-team role opens the shared patient record.
 *
 * One page per portal, each under that portal's own guard, rather than one
 * shared route outside the portals: a route nobody's portal rule covers would
 * be reachable by any signed-in account, and the page must sit behind the same
 * boundary as the rest of the clinician's workspace.
 */
const CARE_TEAM_PATHS: Partial<Record<WonFlowRole, string>> = {
  doctor: "/doctor/care-team",
  physiotherapist: "/operations/physiotherapy/care-team",
  nutritionist: "/operations/nutrition/care-team",
};

export function careTeamPathForRole(role: WonFlowRole | null | undefined): string | null {
  return role ? (CARE_TEAM_PATHS[role] ?? null) : null;
}

export function careTeamPatientHref(role: WonFlowRole | null | undefined, patientId: string): string | null {
  const base = careTeamPathForRole(role);
  return base ? `${base}?patientId=${encodeURIComponent(patientId)}` : null;
}

/** Fired after anything that changes the viewer's unread count, so the header bell refreshes. */
export const CARE_TEAM_INBOX_CHANGED_EVENT = "wonflow:care-team-inbox-changed";
