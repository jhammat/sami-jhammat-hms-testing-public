import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

/** The clinical alert console: the surgical and allied teams escalate to each other here. */
export default async function ClinicalAlertsLayout({ children }: { children: ReactNode }) {
  await requirePortal("/operations/alerts");

  return children;
}
