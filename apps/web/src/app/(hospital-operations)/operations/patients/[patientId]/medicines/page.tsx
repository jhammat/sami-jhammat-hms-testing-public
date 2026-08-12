import {
  PatientMedicineHistory,
} from "@/components/pharmacy";

interface PatientMedicineHistoryPageProps {
  params:
    Promise<{
      patientId: string;
    }>;
}

export default async function PatientMedicineHistoryPage({
  params,
}: PatientMedicineHistoryPageProps) {
  const resolvedParams =
    await params;

  return (
    <PatientMedicineHistory
      patientId={
        resolvedParams.patientId
      }
    />
  );
}
