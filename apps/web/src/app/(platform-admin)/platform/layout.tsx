import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

export default async function PlatformAdministrationLayout({ children }: { children: ReactNode }) {
  await requirePortal("/platform");

  return children;
}
