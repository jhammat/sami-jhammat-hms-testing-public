import Link from "next/link";
import { Archive, Building2, Plus } from "lucide-react";

import {
  WonFlowPageHeader,
} from "@/components/workspace";

export function PlatformTenantConsoleHeader() {
  return (
    <WonFlowPageHeader
      actions={<><Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href="/platform/deleted-tenants"><Archive aria-hidden size={17} />Deleted tenants</Link><Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" href="/platform/organizations/new"><Plus aria-hidden size={17} />Add tenant</Link></>}
      breadcrumbs={[
        {
          label: "Platform Administration",
          href: "/platform",
        },
        {
          label: "Tenants",
        },
      ]}
      description="Create and manage hospital organizations without preloaded or fictional records."
      eyebrow="WonFlow Platform Administration"
      leading={
        <Building2
          aria-hidden="true"
          size={20}
        />
      }
      metadata={
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
          Empty until configured
        </span>
      }
      title="Tenant Organizations"
    />
  );
}
