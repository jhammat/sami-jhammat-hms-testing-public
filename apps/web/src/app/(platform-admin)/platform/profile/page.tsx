import type { Metadata } from "next";

import { PlatformAccessBoundary, PlatformProfilePanel } from "@/components/platform";

export const metadata: Metadata = {
  title: "Super Admin Profile",
};

export default function PlatformProfilePage() {
  return (
    <PlatformAccessBoundary>
      <PlatformProfilePanel />
    </PlatformAccessBoundary>
  );
}
