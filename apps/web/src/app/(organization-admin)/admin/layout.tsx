import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { homePathForRole } from "@/lib/auth/accounts";
import { readSession } from "@/lib/auth/session-server";

export default async function OrganizationAdministrationLayout({ children }: { children: ReactNode }) {
  const session = await readSession();

  if (!session) {
    redirect("/login?next=/admin");
  }

  if (session.role !== "admin") {
    redirect(homePathForRole(session.role));
  }

  if (!session.tenantId || !session.organizationId || !session.membershipId) {
    redirect("/login?next=/admin");
  }

  return children;
}
