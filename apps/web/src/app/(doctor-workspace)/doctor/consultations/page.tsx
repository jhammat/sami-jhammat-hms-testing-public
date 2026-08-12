import {
  DoctorConsultationHub,
} from "@/components/doctor";

interface DoctorConsultationsPageProps {
  searchParams:
    Promise<{
      queueEntryId?:
        string |
        string[];
    }>;
}

export default async function DoctorConsultationsPage({
  searchParams,
}: DoctorConsultationsPageProps) {
  const resolvedSearchParams =
    await searchParams;

  const queueEntryId =
    Array.isArray(
      resolvedSearchParams
        .queueEntryId,
    )
      ? resolvedSearchParams
          .queueEntryId[0]
      : resolvedSearchParams
          .queueEntryId;

  return (
    <DoctorConsultationHub
      initialQueueEntryId={
        queueEntryId
      }
    />
  );
}
