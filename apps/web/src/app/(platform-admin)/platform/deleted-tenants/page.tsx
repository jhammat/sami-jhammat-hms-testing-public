import type { Metadata } from "next";
import { Archive } from "lucide-react";

import { PlatformAccessBoundary, PlatformDeletedTenants } from "@/components/platform";
import { WonFlowPageHeader } from "@/components/workspace";

export const metadata: Metadata = { title: "Deleted Tenants" };

export default function DeletedTenantsPage() {
  return (
    <div className="space-y-6" id="main-content">
      <WonFlowPageHeader
        breadcrumbs={[{ label: "Platform Administration", href: "/platform" }, { label: "Deleted Tenants" }]}
        description="Deleted tenants are permanently removed from active operations. Their records remain retained as platform backups."
        eyebrow="Platform Administration"
        leading={<Archive aria-hidden size={20} />}
        title="Deleted Tenants"
      />
      <PlatformAccessBoundary><PlatformDeletedTenants /></PlatformAccessBoundary>
    </div>
  );
}
