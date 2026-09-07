import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

/**
 * The patient's own record, and nobody else's view of it. Staff read patient
 * data through their own portals, where the reading is scoped and audited —
 * not by opening `/patient` on a staff session, which used to work.
 *
 * Self-registration at `/patient/register` is a separate route with no
 * session yet, and is unaffected: it lives outside this folder.
 */
export default async function PatientAccessLayout({ children }: { children: ReactNode }) {
  await requirePortal("/patient");

  return children;
}
