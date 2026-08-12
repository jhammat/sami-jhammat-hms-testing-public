import {
  PrintablePharmacyReceipt,
} from "@/components/pharmacy";

interface PharmacyReceiptPageProps {
  params:
    Promise<{
      caseId: string;
    }>;
}

export default async function PharmacyReceiptPage({
  params,
}: PharmacyReceiptPageProps) {
  const resolvedParams =
    await params;

  return (
    <PrintablePharmacyReceipt
      caseId={
        resolvedParams.caseId
      }
    />
  );
}
