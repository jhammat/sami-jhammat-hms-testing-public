import { phaseOneApi } from "./phase-one-api";
import type { WonFlowLiveOrganizationDashboardProjection } from "@/lib/dashboard/types";

export async function getOrganizationDashboard(
  signal?: AbortSignal,
): Promise<WonFlowLiveOrganizationDashboardProjection> {
  const response = await phaseOneApi<{
    dashboard: WonFlowLiveOrganizationDashboardProjection;
  }>("/api/v1/admin/dashboard", { signal });

  return response.dashboard;
}
