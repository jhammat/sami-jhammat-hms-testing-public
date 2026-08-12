import {
  AppointmentBookingWorkflow,
} from "@/components/appointments";

interface NewAppointmentPageProps {
  searchParams:
    Promise<{
      patientId?:
        string |
        string[];
    }>;
}

export default async function NewAppointmentPage({
  searchParams,
}: NewAppointmentPageProps) {
  const resolvedSearchParams =
    await searchParams;

  const patientId =
    Array.isArray(
      resolvedSearchParams
        .patientId,
    )
      ? resolvedSearchParams
          .patientId[0]
      : resolvedSearchParams
          .patientId;

  return (
    <AppointmentBookingWorkflow
      initialPatientId={
        patientId
      }
    />
  );
}