import { Suspense } from "react";
import { DoctorPatientRegistration } from "@/components/doctor/doctor-patient-registration";

export default function DoctorRegisterPatientPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-medium text-slate-500">Loading booking desk…</div>}>
      <DoctorPatientRegistration />
    </Suspense>
  );
}
