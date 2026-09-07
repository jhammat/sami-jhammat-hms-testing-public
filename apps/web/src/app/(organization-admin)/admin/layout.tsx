import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { requirePortal } from "@/lib/auth/portal-guard";

export default async function OrganizationAdministrationLayout({ children }: { children: ReactNode }) {
  const session = await requirePortal("/admin");

  /*
   * An administrator with no organisation behind the session has nothing to
   * administer — the pages below would all read from a tenant that is not
   * there. This is a broken session rather than a wrong portal, so it goes
   * back to sign-in instead of to another portal's home.
   */
  if (!session.tenantId || !session.organizationId || !session.membershipId) {
    redirect("/login?next=/admin");
  }

  return children;
}
