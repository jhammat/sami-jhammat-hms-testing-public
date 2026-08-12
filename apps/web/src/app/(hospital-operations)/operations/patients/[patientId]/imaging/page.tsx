import {
  PatientRadiologyTimeline,
} from "@/components/diagnostics";

interface PatientRadiologyTimelinePageProps {
  params:
    Promise<{
      patientId: string;
    }>;
}

export default async function PatientRadiologyTimelinePage({
  params,
}: PatientRadiologyTimelinePageProps) {
  const resolvedParams =
    await params;

  return (
    <PatientRadiologyTimeline
      patientId={
        resolvedParams.patientId
      }
    />
  );
}
