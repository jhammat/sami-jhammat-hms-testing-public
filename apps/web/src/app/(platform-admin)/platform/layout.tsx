import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { homePathForRole } from "@/lib/auth/accounts";
import { readSession } from "@/lib/auth/session-server";

export default async function PlatformAdministrationLayout({ children }: { children: ReactNode }) {
  const session = await readSession();

  if (!session) {
    redirect("/login?next=/platform");
  }

  if (session.role !== "platform") {
    redirect(homePathForRole(session.role));
  }

  return children;
}
