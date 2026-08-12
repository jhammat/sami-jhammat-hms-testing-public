import {
  PatientBillingLedger,
} from "@/components/billing";

interface PatientBillingLedgerPageProps {
  params:
    Promise<{
      patientId: string;
    }>;
}

export default async function PatientBillingLedgerPage({
  params,
}: PatientBillingLedgerPageProps) {
  const resolvedParams = await params;

  return (
    <PatientBillingLedger
      patientId={resolvedParams.patientId}
    />
  );
}
