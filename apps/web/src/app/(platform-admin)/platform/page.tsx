import type {
  Metadata,
} from "next";

import {
  PlatformAccessBoundary,
  PlatformAdminDashboard,
} from "@/components/platform";

export const metadata: Metadata = {
  title: "Platform Overview",
};

export default function PlatformAdministrationPage() {
  return (
    <PlatformAccessBoundary>
      <PlatformAdminDashboard />
    </PlatformAccessBoundary>
  );
}
