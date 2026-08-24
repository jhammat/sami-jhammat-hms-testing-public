"use client";

import { useState } from "react";
import { ClinicianCarePlanRoster } from "./clinician-care-plan-roster";
import { ClinicianCarePlanDetail } from "./clinician-care-plan-detail";

export function ClinicianCarePlanWorkspace() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  if (selectedPlanId) {
    return (
      <ClinicianCarePlanDetail
        carePlanId={selectedPlanId}
        onBack={() => setSelectedPlanId(null)}
      />
    );
  }

  return <ClinicianCarePlanRoster onSelectPlan={(id) => setSelectedPlanId(id)} />;
}
