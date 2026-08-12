import {
  PrintableTransfusionTraceabilityReport,
} from "@/components/blood-bank";

interface TransfusionPrintPageProps {
  params: Promise<{ transfusionId: string }>;
}

export default async function TransfusionPrintPage({
  params,
}: TransfusionPrintPageProps) {
  const resolvedParams = await params;
  return (
    <PrintableTransfusionTraceabilityReport
      transfusionId={resolvedParams.transfusionId}
    />
  );
}
