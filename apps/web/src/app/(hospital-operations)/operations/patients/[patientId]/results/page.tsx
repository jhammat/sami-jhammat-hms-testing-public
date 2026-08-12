import {
  PatientLaboratoryTimeline,
} from "@/components/diagnostics";

interface PatientLaboratoryResultsPageProps {
  params:
    Promise<{
      patientId: string;
    }>;
}

export default async function PatientLaboratoryResultsPage({
  params,
}: PatientLaboratoryResultsPageProps) {
  const resolvedParams =
    await params;

  return (
    <PatientLaboratoryTimeline
      patientId={
        resolvedParams.patientId
      }
    />
  );
}
