import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

export default async function PhysiotherapyLayout({ children }: { children: ReactNode }) {
  await requirePortal("/operations/physiotherapy");

  return children;
}
