import type {
  Metadata,
} from "next";

import {
  PlatformAccessBoundary,
  PlatformTenantCreateForm,
} from "@/components/platform";

export const metadata: Metadata = {
  title: "Add Tenant",
};

export default function PlatformTenantCreatePage() {
  return (
    <PlatformAccessBoundary>
      <PlatformTenantCreateForm />
    </PlatformAccessBoundary>
  );
}
