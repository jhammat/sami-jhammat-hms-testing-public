import {
  PharmacyReturnWorklist,
} from "@/components/pharmacy";

interface PharmacyReturnPageProps {
  searchParams:
    Promise<{
      caseId?: string;
    }>;
}

export default async function PharmacyReturnPage({
  searchParams,
}: PharmacyReturnPageProps) {
  const resolvedSearchParams =
    await searchParams;

  return (
    <PharmacyReturnWorklist
      initialDispensingCaseId={
        resolvedSearchParams.caseId
      }
    />
  );
}
