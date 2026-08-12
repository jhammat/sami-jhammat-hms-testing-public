import type {
  Metadata,
} from "next";

import {
  PlatformAccessBoundary,
  PlatformTenantConsoleHeader,
  PlatformTenantRegistry,
} from "@/components/platform";

export const metadata: Metadata = {
  title: "Tenant Organizations",
};

export default function PlatformOrganizationsPage() {
  return (
    <div
      className="space-y-6 overflow-x-clip"
      id="main-content"
    >
      <PlatformAccessBoundary>
        <PlatformTenantConsoleHeader />
        <PlatformTenantRegistry />
      </PlatformAccessBoundary>
    </div>
  );
}
