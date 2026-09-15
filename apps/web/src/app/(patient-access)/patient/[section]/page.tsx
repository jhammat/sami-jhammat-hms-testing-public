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

const sections = ["care", "record", "reports", "billing", "profile", "recovery", "caregivers", "vitals", "drains", "medications", "symptoms", "labs", "education"] as const;
export default async function PatientSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  if (section === "profile") return <PatientProfileEditor />;
  if (section === "recovery") return <CarePlanTaskView />;
  if (section === "caregivers") return <ManageCaregiversView />;
  if (section === "vitals") return <PatientVitalsLogger />;
  if (section === "drains") return <PatientDrainLogger />;
  if (section === "medications") return <PatientMedicationScheduleView />;
  if (section === "symptoms") return <PatientSymptomLogger />;
  if (section === "labs") return <PatientLabResultsView />;
  if (section === "education") return <PatientEducationLibraryView />;
  return <PatientAccessDashboard section={section as "care" | "record" | "reports" | "billing"} />;
}
