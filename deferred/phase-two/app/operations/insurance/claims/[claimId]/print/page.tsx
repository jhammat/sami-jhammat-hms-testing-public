import {
  PrintableInsuranceClaim,
} from "@/components/insurance";

interface InsuranceClaimPrintPageProps {
  params:
    Promise<{
      claimId: string;
    }>;
}

export default async function InsuranceClaimPrintPage({
  params,
}: InsuranceClaimPrintPageProps) {
  const resolvedParams = await params;

  return (
    <PrintableInsuranceClaim
      claimId={resolvedParams.claimId}
    />
  );
}
