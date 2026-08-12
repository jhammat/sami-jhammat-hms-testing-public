import {
  PrintableNursingHandover,
} from "@/components/inpatient";

interface NursingHandoverPrintPageProps {
  params: Promise<{ admissionId: string }>;
}

export default async function NursingHandoverPrintPage({
  params,
}: NursingHandoverPrintPageProps) {
  const resolvedParams = await params;
  return (
    <PrintableNursingHandover
      admissionId={resolvedParams.admissionId}
    />
  );
}
