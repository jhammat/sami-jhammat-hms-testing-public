import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

export default async function ManagementLayout({ children }: { children: ReactNode }) {
  await requirePortal("/management");

  return children;
}
