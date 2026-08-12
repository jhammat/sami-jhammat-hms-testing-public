import type {
  Metadata,
} from "next";

import {
  PlatformAccessBoundary,
  PlatformSystemSettingsPanel,
} from "@/components/platform";

export const metadata: Metadata = {
  title: "System Settings",
};

export default function PlatformSystemSettingsPage() {
  return (
    <PlatformAccessBoundary>
      <PlatformSystemSettingsPanel />
    </PlatformAccessBoundary>
  );
}
