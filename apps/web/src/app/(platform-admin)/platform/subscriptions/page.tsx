import type {
  Metadata,
} from "next";

import {
  ReceiptText,
} from "lucide-react";

import {
  PlatformAccessBoundary,
  PlatformSubscriptionsPanel,
} from "@/components/platform";
import {
  WonFlowPageHeader,
  WonFlowOperationalPanel,
} from "@/components/workspace";

export const metadata: Metadata = {
  title: "Subscriptions",
};

export default function PlatformSubscriptionsPage() {
  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        breadcrumbs={[
          {
            label: "Platform Administration",
            href: "/platform",
          },
          {
            label: "Subscriptions",
          },
        ]}
        description="Configure real tenant billing plans, seats and renewal information. PKR is the default currency."
        eyebrow="WonFlow Super Administration"
        leading={
          <ReceiptText
            aria-hidden="true"
            size={20}
          />
        }
        title="Subscriptions"
      />

      <PlatformAccessBoundary>
        <WonFlowOperationalPanel
          description="No subscription plan or amount is preloaded."
          icon={
            <ReceiptText
              aria-hidden="true"
              size={18}
            />
          }
          title="Tenant Subscription"
          tone="blue"
        >
          <PlatformSubscriptionsPanel />
        </WonFlowOperationalPanel>
      </PlatformAccessBoundary>
    </div>
  );
}
