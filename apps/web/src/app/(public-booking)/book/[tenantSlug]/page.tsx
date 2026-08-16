import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicBookingInfo } from "@/server/public/public-registration-service";
import { PublicRegistrationForm } from "@/components/public-registration/public-registration-form";

export const metadata: Metadata = {
  title: "Book an appointment",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ doctor?: string }>;
}) {
  const { tenantSlug } = await params;
  const { doctor } = await searchParams;

  let info: Awaited<ReturnType<typeof getPublicBookingInfo>>;
  try {
    info = await getPublicBookingInfo(tenantSlug);
  } catch {
    notFound();
  }

  return (
    <PublicRegistrationForm
      initialDoctorId={doctor}
      organizationName={info.organizationName}
      doctors={info.doctors}
      tenantSlug={tenantSlug}
    />
  );
}
