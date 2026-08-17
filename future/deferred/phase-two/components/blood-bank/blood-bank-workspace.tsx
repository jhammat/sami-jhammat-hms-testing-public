"use client";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";
import {
  WonFlowAsyncDataBoundary,
} from "@/components/feedback";
import {
  useWonFlowAsyncData,
} from "@/lib/data";

function BloodBankContent({
  branches,
}: {
  branches: readonly unknown[];
}) {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-black text-slate-950">
        Blood Bank
      </h1>
      <p className="text-sm text-slate-600">
        Blood-bank operations for {branches.length} hospital branch{branches.length === 1 ? "" : "es"}.
      </p>
    </main>
  );
}

export function BloodBankWorkspace() {
  const hospitalService =
    useWonFlowHospitalService();

  const directory =
    useWonFlowAsyncData({
      key: "blood-bank-directory",
      loader: async (signal) => {
        const branches =
          await hospitalService.listBranches(
            signal,
          );
        return { branches };
      },
      isEmpty: (value) =>
        value.branches.length === 0,
    });

  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital branch information is unavailable."
      emptyTitle="Blood bank unavailable"
      loadingDescription="WonFlow is preparing donors, components, crossmatches and transfusions."
      loadingTitle="Preparing blood bank"
      onRetry={directory.reload}
      state={directory}
    >
      {(value) => (
        <BloodBankContent
          branches={value.branches}
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}
