import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

/** `/organization` is the administration portal under another prefix, so it takes the same guard as `/admin`. */
export default async function OrganizationLayout({ children }: { children: ReactNode }) {
  await requirePortal("/organization");

  return children;
}
