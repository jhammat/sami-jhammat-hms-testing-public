import {
  AppointmentBookingWorkflow,
} from "@/components/appointments";

interface NewAppointmentPageProps {
  searchParams:
    Promise<{
      patientId?:
        string |
        string[];
      doctorId?:
        string |
        string[];
    }>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewAppointmentPage({
  searchParams,
}: NewAppointmentPageProps) {
  const resolvedSearchParams =
    await searchParams;

  return (
    <AppointmentBookingWorkflow
      initialDoctorId={
        firstValue(resolvedSearchParams.doctorId)
      }
      initialPatientId={
        firstValue(resolvedSearchParams.patientId)
      }
    />
  );
}
