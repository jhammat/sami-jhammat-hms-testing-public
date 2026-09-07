import type { ReactNode } from "react";

import { requirePortal } from "@/lib/auth/portal-guard";

export default async function NutritionLayout({ children }: { children: ReactNode }) {
  await requirePortal("/operations/nutrition");

  return children;
}
