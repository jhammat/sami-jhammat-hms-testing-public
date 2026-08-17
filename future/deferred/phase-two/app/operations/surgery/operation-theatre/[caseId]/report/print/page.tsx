import {
  PrintableOperativeReport,
} from "@/components/inpatient";

interface OperativeReportPageProps {
  params: Promise<{ caseId: string }>;
}

export default async function OperativeReportPage({
  params,
}: OperativeReportPageProps) {
  const resolvedParams = await params;
  return (
    <PrintableOperativeReport
      caseId={resolvedParams.caseId}
    />
  );
}
