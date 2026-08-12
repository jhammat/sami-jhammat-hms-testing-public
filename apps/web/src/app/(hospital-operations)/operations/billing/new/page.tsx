import {
  BillingCounterWorkflow,
} from "@/components/billing";

interface NewBillingPageProps {
  searchParams:
    Promise<{
      patientId?:
        string |
        string[];
    }>;
}

export default async function NewBillingPage({
  searchParams,
}: NewBillingPageProps) {
  const resolvedSearchParams =
    await searchParams;

  const patientId =
    Array.isArray(
      resolvedSearchParams
        .patientId,
    )
      ? resolvedSearchParams
          .patientId[0]
      : resolvedSearchParams
          .patientId;

  return (
    <BillingCounterWorkflow
      initialPatientId={
        patientId
      }
    />
  );
}