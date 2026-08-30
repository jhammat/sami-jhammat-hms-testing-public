import { DoctorDrainWorkspace } from "@/components/clinical/drains";

/**
 * Surgical drains, per patient.
 *
 * `ClinicianDrainMonitor` was complete — insert, log, trend, remove — but was
 * mounted on no route, so registering a drain was only possible by calling
 * the API by hand. That left the PATIENT's own drain logger permanently
 * empty too, because a patient can only record output against a drain a
 * clinician has already registered. The monitor takes a patientId, so this
 * page supplies the missing half: choose the patient, then work their drains.
 */
export default function DoctorDrainsPage() {
  return <DoctorDrainWorkspace />;
}
