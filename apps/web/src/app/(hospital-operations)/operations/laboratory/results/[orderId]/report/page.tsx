import {
  PrintableLaboratoryReport,
} from "@/components/diagnostics";

interface PrintableLaboratoryReportPageProps {
  params:
    Promise<{
      orderId: string;
    }>;
}

export default async function PrintableLaboratoryReportPage({
  params,
}: PrintableLaboratoryReportPageProps) {
  const resolvedParams =
    await params;

  return (
    <PrintableLaboratoryReport
      orderId={
        resolvedParams.orderId
      }
    />
  );
}
