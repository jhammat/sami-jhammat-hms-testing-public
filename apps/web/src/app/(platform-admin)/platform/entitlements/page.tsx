import type {
  Metadata,
} from "next";

import {
  ShieldCheck,
} from "lucide-react";

import {
  PlatformAccessBoundary,
  PlatformEntitlementsPanel,
} from "@/components/platform";
import {
  WonFlowPageHeader,
} from "@/components/workspace";

export const metadata: Metadata = {
  title: "Entitlements",
};

export default function PlatformEntitlementsPage() {
  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        breadcrumbs={[
          {
            label: "Platform Administration",
            href: "/platform",
          },
          {
            label: "Entitlements",
          },
        ]}
        description="Enable only the modules explicitly approved for each tenant organization."
        eyebrow="WonFlow Super Administration"
        leading={
          <ShieldCheck
            aria-hidden="true"
            size={20}
          />
        }
        metadata={
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
            Disabled by default
          </span>
        }
        title="Entitlements"
      />

      <PlatformAccessBoundary>
        <PlatformEntitlementsPanel />
      </PlatformAccessBoundary>
    </div>
  );
}
