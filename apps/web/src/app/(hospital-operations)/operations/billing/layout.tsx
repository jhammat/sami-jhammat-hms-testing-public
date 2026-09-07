import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

export default async function BillingLayout({ children }: { children: ReactNode }) {
  await requirePortal("/operations/billing");

  return children;
}
