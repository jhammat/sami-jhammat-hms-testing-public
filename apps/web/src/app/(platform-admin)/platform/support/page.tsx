import type {
  Metadata,
} from "next";

import {
  Headphones,
} from "lucide-react";

import {
  PlatformAccessBoundary,
  PlatformSupportAccessPanel,
} from "@/components/platform";
import {
  WonFlowPageHeader,
} from "@/components/workspace";

export const metadata: Metadata = {
  title: "Support Access",
};

export default function PlatformSupportAccessPage() {
  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        breadcrumbs={[
          {
            label: "Platform Administration",
            href: "/platform",
          },
          {
            label: "Support Access",
          },
        ]}
        description="Create, approve, revoke and audit temporary access to a tenant workspace."
        eyebrow="WonFlow Super Administration"
        leading={
          <Headphones
            aria-hidden="true"
            size={20}
          />
        }
        metadata={
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 ring-1 ring-red-200">
            Explicit and time-limited
          </span>
        }
        title="Support Access"
      />

      <PlatformAccessBoundary>
        <PlatformSupportAccessPanel />
      </PlatformAccessBoundary>
    </div>
  );
}
