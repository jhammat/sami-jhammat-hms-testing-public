import { DiagnosticsResultWorkspace } from "@/components/diagnostics/diagnostics-result-workspace";

export default async function RadiologyResultPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <DiagnosticsResultWorkspace orderId={orderId} type="RADIOLOGY" />;
}
