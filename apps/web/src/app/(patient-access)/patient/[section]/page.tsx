import { notFound } from "next/navigation";
import { PatientAccessDashboard } from "@/components/patient/patient-access-dashboard";
import { PatientProfileEditor } from "@/components/patient/patient-profile-editor";

const sections = ["care", "reports", "billing", "profile"] as const;
export default async function PatientSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  if (section === "profile") return <PatientProfileEditor />;
  return <PatientAccessDashboard section={section as "care" | "reports" | "billing"} />;
}
