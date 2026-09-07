import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

/** The shared patient directory: the front desk and every department desk work from it. */
export default async function OperationsPatientsLayout({ children }: { children: ReactNode }) {
  await requirePortal("/operations/patients");

  return children;
}
