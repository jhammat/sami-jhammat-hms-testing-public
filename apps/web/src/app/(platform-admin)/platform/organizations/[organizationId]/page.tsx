import type {
  Metadata,
} from "next";
import {
  Suspense,
} from "react";

import {
  PlatformAccessBoundary,
  PlatformTenantDetails,
} from "@/components/platform";
import {
  WonFlowRouteLoader,
} from "@/components/brand/wonflow-route-loader";

export const metadata: Metadata = {
  title: "Tenant Details",
};

export default async function PlatformTenantDetailsPage({
  params,
}: {
  params: Promise<{
    organizationId: string;
  }>;
}) {
  const {
    organizationId,
  } = await params;

  return (
    <PlatformAccessBoundary>
      <Suspense
        fallback={
          <WonFlowRouteLoader
            label="Loading tenant details…"
            overlay={false}
            visible
          />
        }
      >
        <PlatformTenantDetails
          tenantId={organizationId}
        />
      </Suspense>
    </PlatformAccessBoundary>
  );
}
