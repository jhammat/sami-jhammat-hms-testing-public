import type {
  ReactNode,
} from "react";

import {
  DoctorPortalShell,
} from "@/components/doctor";

interface DoctorWorkspaceLayoutProps {
  children: ReactNode;
}

export default function DoctorWorkspaceLayout({
  children,
}: DoctorWorkspaceLayoutProps) {
  return (
    <DoctorPortalShell>
      {children}
    </DoctorPortalShell>
  );
}
