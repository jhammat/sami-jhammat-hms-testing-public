import {
  PrintableBillingRefundReceipt,
} from "@/components/billing";

interface BillingRefundReceiptPageProps {
  params:
    Promise<{
      refundId: string;
    }>;
}

export default async function BillingRefundReceiptPage({
  params,
}: BillingRefundReceiptPageProps) {
  const resolvedParams =
    await params;

  return (
    <PrintableBillingRefundReceipt
      refundId={resolvedParams.refundId}
    />
  );
}
