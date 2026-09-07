import type { ReactNode } from "react";

import { requirePortalTree } from "@/lib/auth/portal-guard";

/**
 * The floor of the hospital: reception, the counter, the departments and the
 * allied workspaces. This layer only asks whether the signed-in role works on
 * the operations side at all — each area below narrows it to that area's own
 * role, and the overview page does the same for `/operations` itself. Asking
 * the exact question here would lock physiotherapy and dietetics out of their
 * own workspaces, which live under this prefix without belonging to a desk.
 */
export default async function HospitalOperationsLayout({ children }: { children: ReactNode }) {
  await requirePortalTree("/operations");

  return children;
}
