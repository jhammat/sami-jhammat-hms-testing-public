import type { Metadata } from "next";

import { CountersignatureQueue } from "@/components/doctor/countersignature-queue";

export const metadata: Metadata = {
  title: "Countersignatures | WonFlow",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CountersignatureQueue />;
}
