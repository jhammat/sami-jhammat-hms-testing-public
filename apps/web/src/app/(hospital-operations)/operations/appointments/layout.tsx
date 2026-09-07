import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

export default async function AppointmentsLayout({ children }: { children: ReactNode }) {
  await requirePortal("/operations/appointments");

  return children;
}
