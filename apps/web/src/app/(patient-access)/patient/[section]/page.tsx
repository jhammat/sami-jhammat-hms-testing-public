import { notFound } from "next/navigation";
import { PatientAccessDashboard } from "@/components/patient/patient-access-dashboard";
import { PatientProfileEditor } from "@/components/patient/patient-profile-editor";
import { ManageCaregiversView } from "@/components/patient/manage-caregivers-view";
import { CarePlanTaskView } from "@/components/patient/care-plan-task-view";
import { PatientVitalsLogger } from "@/components/patient/patient-vitals-logger";
import { PatientDrainLogger } from "@/components/patient/patient-drain-logger";
import { PatientMedicationScheduleView } from "@/components/patient/patient-medication-schedule";
import { PatientSymptomLogger } from "@/components/patient/patient-symptom-logger";
import { PatientLabResultsView } from "@/components/patient/patient-lab-results-view";
import { PatientEducationLibraryView } from "@/components/patient/patient-education-library";

const sections = ["care", "reports", "billing", "profile", "recovery", "caregivers", "vitals", "drains", "medications", "symptoms", "labs", "education"] as const;
export default async function PatientSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  if (section === "profile") return <PatientProfileEditor />;
  if (section === "recovery") return <div className="mx-auto max-w-4xl px-4 py-8"><CarePlanTaskView /></div>;
  if (section === "caregivers") return <div className="mx-auto max-w-4xl px-4 py-8"><ManageCaregiversView /></div>;
  if (section === "vitals") return <div className="mx-auto max-w-4xl px-4 py-8"><PatientVitalsLogger /></div>;
  if (section === "drains") return <div className="mx-auto max-w-4xl px-4 py-8"><PatientDrainLogger /></div>;
  if (section === "medications") return <div className="mx-auto max-w-4xl px-4 py-8"><PatientMedicationScheduleView /></div>;
  if (section === "symptoms") return <div className="mx-auto max-w-4xl px-4 py-8"><PatientSymptomLogger /></div>;
  if (section === "labs") return <div className="mx-auto max-w-4xl px-4 py-8"><PatientLabResultsView /></div>;
  if (section === "education") return <div className="mx-auto max-w-4xl px-4 py-8"><PatientEducationLibraryView /></div>;
  return <PatientAccessDashboard section={section as "care" | "reports" | "billing"} />;
}
