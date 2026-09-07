import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

export default async function LaboratoryLayout({ children }: { children: ReactNode }) {
  await requirePortal("/operations/laboratory");

  return children;
}
