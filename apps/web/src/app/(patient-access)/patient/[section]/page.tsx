import { notFound } from "next/navigation";
import { LivePatientPortal } from "@/components/patient/live-patient-portal";
import { PatientProfileEditor } from "@/components/patient/patient-profile-editor";

const sections = ["care", "reports", "profile"] as const;
export default async function PatientSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  if (section === "profile") return <PatientProfileEditor />;
  return <LivePatientPortal section={section as (typeof sections)[number]} />;
}
