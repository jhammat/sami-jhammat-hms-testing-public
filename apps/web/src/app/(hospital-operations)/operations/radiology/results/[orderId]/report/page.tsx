import {
  PrintableRadiologyReport,
} from "@/components/diagnostics";

interface PrintableRadiologyReportPageProps {
  params:
    Promise<{
      orderId: string;
    }>;
}

export default async function PrintableRadiologyReportPage({
  params,
}: PrintableRadiologyReportPageProps) {
  const resolvedParams =
    await params;

  return (
    <PrintableRadiologyReport
      orderId={
        resolvedParams.orderId
      }
    />
  );
}
