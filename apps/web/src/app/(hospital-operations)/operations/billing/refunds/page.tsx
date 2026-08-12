import {
  BillingRefundWorklist,
} from "@/components/billing";

interface BillingRefundPageProps {
  searchParams:
    Promise<{
      returnId?: string;
    }>;
}

export default async function BillingRefundPage({
  searchParams,
}: BillingRefundPageProps) {
  const resolvedSearchParams =
    await searchParams;

  return (
    <BillingRefundWorklist
      initialReturnId={
        resolvedSearchParams.returnId
      }
    />
  );
}
