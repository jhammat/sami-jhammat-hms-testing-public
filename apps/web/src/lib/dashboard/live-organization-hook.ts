"use client";

import { getOrganizationDashboard } from "@/lib/api/organization-dashboard-api";
import { useWonFlowAsyncData } from "@/lib/data";
import type { UseWonFlowAsyncDataResult } from "@/lib/data";

import type { WonFlowLiveOrganizationDashboardProjection } from "./types";

export function useWonFlowOrganizationDashboard(): UseWonFlowAsyncDataResult<WonFlowLiveOrganizationDashboardProjection> {
  return useWonFlowAsyncData({
    key: "dashboard:organization:live",
    loader: (signal) => getOrganizationDashboard(signal),
  });
}
