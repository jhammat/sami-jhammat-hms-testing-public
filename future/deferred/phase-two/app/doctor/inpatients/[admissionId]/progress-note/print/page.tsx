import {
  PrintableInpatientProgressNote,
} from "@/components/inpatient";

interface InpatientProgressNotePrintPageProps {
  params: Promise<{ admissionId: string }>;
}

export default async function InpatientProgressNotePrintPage({
  params,
}: InpatientProgressNotePrintPageProps) {
  const resolvedParams = await params;
  return (
    <PrintableInpatientProgressNote
      admissionId={resolvedParams.admissionId}
    />
  );
}
