import {
  ClinicalConsultationDocumentation,
} from "@/components/doctor";

interface ClinicalEncounterPageProps {
  params:
    Promise<{
      encounterId: string;
    }>;
}

export default async function ClinicalEncounterPage({
  params,
}: ClinicalEncounterPageProps) {
  const resolvedParams =
    await params;

  return (
    <ClinicalConsultationDocumentation
      encounterId={
        resolvedParams.encounterId
      }
    />
  );
}