import { HospitalOperationsDashboard } from "@/components/operations/hospital-operations-dashboard";
import { requirePortal } from "@/lib/auth/portal-guard";

/**
 * The overview is the front desk's and the department counters' own page, so
 * it is guarded here rather than in the layout above — the layout has to stay
 * broad enough for physiotherapy and dietetics, which sit under the same
 * prefix but have nothing to do with this dashboard.
 */
export default async function HospitalOperationsPage() {
  await requirePortal("/operations");

  return <HospitalOperationsDashboard />;
}
