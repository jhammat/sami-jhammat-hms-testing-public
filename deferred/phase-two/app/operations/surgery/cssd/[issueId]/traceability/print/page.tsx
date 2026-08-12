import {
  PrintableCssdCaseTraceabilityReport,
} from "@/components/inpatient";

interface CssdTraceabilityPageProps {
  params: Promise<{ issueId: string }>;
}

export default async function CssdTraceabilityPage({
  params,
}: CssdTraceabilityPageProps) {
  const resolvedParams = await params;
  return (
    <PrintableCssdCaseTraceabilityReport
      issueId={resolvedParams.issueId}
    />
  );
}
