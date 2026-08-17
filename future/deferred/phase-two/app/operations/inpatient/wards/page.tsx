import {
  WardAdmissionWorkspace,
} from "@/components/inpatient";

interface WardManagementPageProps {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function WardManagementPage({ searchParams }: WardManagementPageProps) {
  const resolvedSearchParams = await searchParams;
  return <WardAdmissionWorkspace initialPatientId={resolvedSearchParams.patientId} />;
}
