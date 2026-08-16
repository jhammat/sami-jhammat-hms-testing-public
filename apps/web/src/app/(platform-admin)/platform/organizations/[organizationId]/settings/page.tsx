import type { Metadata } from "next";
import { Suspense } from "react";

import { PlatformAccessBoundary, PlatformTenantSettingsPanel } from "@/components/platform";
import { WonFlowRouteLoader } from "@/components/brand/wonflow-route-loader";

export const metadata: Metadata = {
  title: "Tenant Settings",
};

export default async function PlatformTenantSettingsPage({
  params,
}: {
  params: Promise<{
    organizationId: string;
  }>;
}) {
  const { organizationId } = await params;

  return (
    <PlatformAccessBoundary>
      <Suspense
        fallback={
          <WonFlowRouteLoader
            label="Loading tenant settings…"
            overlay={false}
            visible
          />
        }
      >
        <PlatformTenantSettingsPanel tenantId={organizationId} />
      </Suspense>
    </PlatformAccessBoundary>
  );
}
