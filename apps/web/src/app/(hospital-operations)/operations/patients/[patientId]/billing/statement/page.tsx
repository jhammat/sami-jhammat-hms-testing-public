import {
  PrintablePatientAccountStatement,
} from "@/components/billing";

interface PatientAccountStatementPageProps {
  params:
    Promise<{
      patientId: string;
    }>;
}

export default async function PatientAccountStatementPage({
  params,
}: PatientAccountStatementPageProps) {
  const resolvedParams = await params;

  return (
    <PrintablePatientAccountStatement
      patientId={resolvedParams.patientId}
    />
  );
}
