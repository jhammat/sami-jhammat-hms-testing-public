import type {
  Metadata,
} from "next";

import {
  ScrollText,
} from "lucide-react";

import {
  PlatformAccessBoundary,
  PlatformAuditPanel,
} from "@/components/platform";
import {
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

export const metadata: Metadata = {
  title: "Platform Audit",
};

export default function PlatformAuditPage() {
  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        breadcrumbs={[
          {
            label: "Platform Administration",
            href: "/platform",
          },
          {
            label: "Platform Audit",
          },
        ]}
        description="Review tenant, subscription, entitlement, settings and support-access events."
        eyebrow="WonFlow Super Administration"
        leading={
          <ScrollText
            aria-hidden="true"
            size={20}
          />
        }
        metadata={
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-900 ring-1 ring-red-300">
            Critical events use deep red
          </span>
        }
        title="Platform Audit"
      />

      <PlatformAccessBoundary>
        <WonFlowOperationalPanel
          description="Newest events first. No audit records are manufactured."
          icon={
            <ScrollText
              aria-hidden="true"
              size={18}
            />
          }
          title="Audit Trail"
          tone="slate"
        >
          <PlatformAuditPanel />
        </WonFlowOperationalPanel>
      </PlatformAccessBoundary>
    </div>
  );
}
