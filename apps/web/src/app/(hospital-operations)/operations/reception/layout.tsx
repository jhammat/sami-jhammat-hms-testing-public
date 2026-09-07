import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

import "../patients/register/registration-legacy.css";

export default async function ReceptionLayout({ children }: { children: ReactNode }) {
  await requirePortal("/operations/reception");

  return children;
}
