import type {
  ReactNode,
} from "react";

import {
  DoctorPortalShell,
} from "@/components/doctor";

import {
  requirePortal,
} from "@/lib/auth/portal-guard";

interface DoctorWorkspaceLayoutProps {
  children: ReactNode;
}

/**
 * The doctor workspace was the only clinical portal with no guard on it at
 * all: the proxy checked that a session cookie existed and nothing checked
 * whose it was, so a reception, pharmacy or patient session that reached
 * `/doctor` — by typing it, or by following one of the cross-portal sidebar
 * links that used to point here — was handed the consulting room.
 */
export default async function DoctorWorkspaceLayout({
  children,
}: DoctorWorkspaceLayoutProps) {
  await requirePortal("/doctor");

  return (
    <DoctorPortalShell>
      {children}
    </DoctorPortalShell>
  );
}
