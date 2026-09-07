import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

export default async function RadiologyLayout({ children }: { children: ReactNode }) {
  await requirePortal("/operations/radiology");

  return children;
}
