"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet } from "@/lib/api/client";
import {
  listAppointmentSlots,
  useBookAppointment,
} from "@/lib/api/appointments";
import type { AppointmentSlot } from "@/lib/api/appointments";
import { usePatients } from "@/lib/api/patients";
import type { PatientRecord } from "@/lib/api/patients";
import {
  WonFlowEmptyState,
} from "@/components/feedback";
import {
  WonFlowActionButton,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

/**
 * A real booking against the live database — patients, doctors and slots
 * all come from /api/v1/patients, /api/v1/reception/catalog and
 * /api/v1/appointments?slots=1, and the booking itself is a real
 * POST /api/v1/appointments. No fictional catalogue, no mock practice
 * service. There is no same-day restriction anywhere in that chain: any
 * future date the doctor has availability for can be booked here.
 */

type BookingStage = "patient" | "doctor" | "schedule" | "review" | "confirmed";

interface ReceptionCatalog {
  branches: Array<{
    id: string;
    name: string;
    /** Free-form JSON on the branch record; only `text`/`city` are written by registration. */
    address?: { text?: string; city?: string } | null;
    phone?: string | null;
  }>;
  practitioners: Array<{
    id: string;
    displayName: string;
    specialtyName: string;
    primaryBranchId: string;
    departmentName?: string | null;
    consultationFee: number;
  }>;
  services: Array<{ id: string; name: string; price: number; category: string; doctorId?: string | null }>;
}

interface AppointmentBookingWorkflowProps {
  initialPatientId?: string;
  initialDoctorId?: string;
}

const INPUT_CLASS_NAME = [
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5",
  "text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
  "focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
].join(" ");

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-xs font-bold text-slate-700">{children}</span>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0 sm:grid sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 sm:mt-0">{value}</dd>
    </div>
  );
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : "The booking could not be completed.";
}

function stageNumber(stage: BookingStage): number {
  return ["patient", "doctor", "schedule", "review", "confirmed"].indexOf(stage) + 1;
}

function formatSlotLabel(slot: AppointmentSlot): string {
  return slot.label;
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AppointmentBookingWorkflow({
  initialPatientId,
  initialDoctorId,
}: AppointmentBookingWorkflowProps) {
  const [stage, setStage] = useState<BookingStage>(() => {
    if (initialPatientId && initialDoctorId) return "schedule";
    if (initialPatientId) return "doctor";
    return "patient";
  });
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [patientSearch, setPatientSearch] = useState("");
  const [doctorId, setDoctorId] = useState(initialDoctorId ?? "");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(todayDateInputValue());
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot>();
  const [reason, setReason] = useState("");
  /** "online or in person?" — the first thing reception asks on the phone. */
  const [consultationMode, setConsultationMode] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");

  const [catalog, setCatalog] = useState<ReceptionCatalog>();
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string>();

  const [slots, setSlots] = useState<AppointmentSlot[]>();
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotUnavailableReason, setSlotUnavailableReason] = useState<string>();

  const [confirmedAppointmentId, setConfirmedAppointmentId] = useState<string>();
  /**
   * Snapshot of what was booked, captured at confirmation time. The live
   * selections are cleared for the next booking, but reception still needs to
   * read the room, department and address back to the patient.
   */
  const [confirmedDetails, setConfirmedDetails] = useState<{
    doctor: string;
    department: string;
    mode: string;
    time: string;
    room: string;
    location: string;
  }>();
  const [error, setError] = useState<string>();

  const bookMutation = useBookAppointment();

  const initialPatientResource = usePatients({ query: "", sort: "recent" });
  const searchResource = usePatients({ query: patientSearch });

  useEffect(() => {
    let active = true;
    apiGet<ReceptionCatalog>("/api/v1/reception/catalog")
      .then((result) => { if (active) setCatalog(result); })
      .catch((cause: unknown) => { if (active) setCatalogError(readError(cause)); })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedDoctor = useMemo(
    () => catalog?.practitioners.find((practitioner) => practitioner.id === doctorId),
    [catalog, doctorId],
  );
  const doctorServices = useMemo(
    () => (catalog?.services ?? []).filter((service) => !service.doctorId || service.doctorId === doctorId),
    [catalog, doctorId],
  );
  const selectedService = useMemo(
    () => doctorServices.find((service) => service.id === serviceId),
    [doctorServices, serviceId],
  );

  /** Branch name, street and phone, so reception can read the patient a full address. */
  const locationSummary = useMemo(() => {
    const branch = catalog?.branches.find((item) => item.id === selectedDoctor?.primaryBranchId);
    if (!branch) return "Not available";
    return [branch.name, branch.address?.text, branch.address?.city, branch.phone]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(" · ");
  }, [catalog, selectedDoctor]);

  const durationMinutes = 20;

  const loadSlots = useCallback(async () => {
    if (!selectedDoctor || !date) return;
    setSlotLoading(true);
    setSlotUnavailableReason(undefined);
    setError(undefined);
    try {
      const result = await listAppointmentSlots({
        doctorId: selectedDoctor.id,
        branchId: selectedDoctor.primaryBranchId,
        date,
        durationMinutes,
      });
      setSlots(result.slots);
      setSlotUnavailableReason(result.unavailableReason);
    } catch (cause) {
      setError(readError(cause));
      setSlots(undefined);
    } finally {
      setSlotLoading(false);
    }
  }, [date, selectedDoctor]);

  useEffect(() => {
    if (stage !== "schedule") return;
    queueMicrotask(() => { void loadSlots(); });
  }, [stage, loadSlots]);

  const selectedPatient: PatientRecord | undefined = useMemo(() => {
    const pool = [...(initialPatientResource.data?.patients ?? []), ...(searchResource.data?.patients ?? [])];
    return pool.find((patient) => patient.id === patientId);
  }, [initialPatientResource.data, searchResource.data, patientId]);

  function selectPatient(id: string): void {
    setPatientId(id);
    setStage(id === "" ? "patient" : "doctor");
  }

  function selectDoctor(id: string): void {
    setDoctorId(id);
    setServiceId("");
    setSlots(undefined);
    setSelectedSlot(undefined);
  }

  async function confirmBooking(): Promise<void> {
    if (!selectedDoctor || !selectedSlot) return;
    setError(undefined);
    try {
      const result = await bookMutation.mutate({
        patientId,
        doctorId: selectedDoctor.id,
        serviceId: serviceId || undefined,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        reason: reason.trim() || undefined,
        source: "reception",
        consultationMode,
        idempotencyKey: crypto.randomUUID(),
      });
      setConfirmedDetails({
        doctor: `${selectedDoctor.displayName} — ${selectedDoctor.specialtyName}`,
        department: selectedDoctor.departmentName ?? "Not assigned",
        mode: consultationMode === "ONLINE" ? "Online video consultation" : "In person at the hospital",
        time: formatSlotLabel(selectedSlot),
        room: consultationMode === "ONLINE"
          ? "Not applicable — video consultation"
          : selectedSlot.roomLabel ?? "Confirmed when the doctor starts their sitting",
        location: consultationMode === "ONLINE"
          ? "Link opens on the patient's portal at the appointment time"
          : locationSummary,
      });
      setConfirmedAppointmentId(result.appointment.id);
      setStage("confirmed");
    } catch (cause) {
      setError(readError(cause));
    }
  }

  function startAnotherBooking(): void {
    setPatientId("");
    setPatientSearch("");
    setDoctorId("");
    setServiceId("");
    setDate(todayDateInputValue());
    setSlots(undefined);
    setSelectedSlot(undefined);
    setReason("");
    setConfirmedAppointmentId(undefined);
    setConfirmedDetails(undefined);
    setError(undefined);
    setStage("patient");
  }

  if (catalogLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Loading booking configuration…</div>;
  }

  if (catalogError || !catalog) {
    return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{catalogError ?? "The doctor and service directory could not be loaded."}</div>;
  }

  return (
    <div className="space-y-5">
      <WonFlowPageHeader
        eyebrow={`Appointment booking · Step ${stageNumber(stage)} of 5`}
        title="Book an appointment"
        description="Real doctors, real availability — any future date the doctor has a roster or sitting for can be booked."
        breadcrumbs={[
          { label: "Operations", href: "/operations" },
          { label: "Appointments", href: "/operations/appointments" },
          { label: "New booking" },
        ]}
      />

      {error !== undefined ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>
      ) : null}

      {stage !== "confirmed" ? (
        <WonFlowOperationalPanel title="Patient" description="Search by name, MRN or phone.">
          <div className="space-y-3 p-5 sm:p-6">
            {selectedPatient ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <span className="font-bold text-slate-900">{selectedPatient.givenName} {selectedPatient.familyName} — {selectedPatient.patientNumber}</span>
                <button className="text-sm font-bold text-blue-700 hover:underline" onClick={() => selectPatient("")} type="button">Change</button>
              </div>
            ) : (
              <>
                <input
                  className={INPUT_CLASS_NAME}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Search patients…"
                  value={patientSearch}
                />
                {patientSearch.trim() !== "" ? (
                  searchResource.data && searchResource.data.patients.length > 0 ? (
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                      {searchResource.data.patients.map((patient) => (
                        <button
                          className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-300"
                          key={patient.id}
                          onClick={() => selectPatient(patient.id)}
                          type="button"
                        >
                          <span className="font-bold text-slate-900">{patient.givenName} {patient.familyName}</span>
                          <span className="ml-2 text-xs text-slate-500">{patient.patientNumber} · {patient.phone ?? "No phone on file"}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <WonFlowEmptyState
                      title="No matching patients."
                      description="Register the patient first, then come back to book."
                      action={<Link className="font-bold text-blue-700 hover:underline" href="/operations/patients/register">Register a patient</Link>}
                    />
                  )
                ) : null}
              </>
            )}
          </div>
        </WonFlowOperationalPanel>
      ) : null}

      {stage === "doctor" && patientId !== "" ? (
        <WonFlowOperationalPanel title="Doctor and service" description="Consultation fee and availability come from the doctor's real profile and roster.">
          <div className="space-y-4 p-5 sm:p-6">
            <label>
              <FieldLabel>Consultation type</FieldLabel>
              <select className={INPUT_CLASS_NAME} onChange={(event) => setConsultationMode(event.target.value as "IN_PERSON" | "ONLINE")} value={consultationMode}>
                <option value="IN_PERSON">In person at the hospital</option>
                <option value="ONLINE">Online video consultation</option>
              </select>
            </label>
            <label>
              <FieldLabel>Doctor</FieldLabel>
              <select className={INPUT_CLASS_NAME} onChange={(event) => selectDoctor(event.target.value)} value={doctorId}>
                <option value="">Select a doctor</option>
                {catalog.practitioners.map((practitioner) => (
                  <option key={practitioner.id} value={practitioner.id}>{practitioner.displayName} — {practitioner.specialtyName}</option>
                ))}
              </select>
            </label>
            {selectedDoctor ? (
              <label>
                <FieldLabel>Service (optional)</FieldLabel>
                <select className={INPUT_CLASS_NAME} onChange={(event) => setServiceId(event.target.value)} value={serviceId}>
                  <option value="">General consultation</option>
                  {doctorServices.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="flex justify-between gap-3">
              <WonFlowActionButton onClick={() => selectPatient("")}>Back</WonFlowActionButton>
              <WonFlowActionButton disabled={!selectedDoctor} onClick={() => setStage("schedule")} variant="primary">Choose a time</WonFlowActionButton>
            </div>
          </div>
        </WonFlowOperationalPanel>
      ) : null}

      {stage === "schedule" && selectedDoctor ? (
        <WonFlowOperationalPanel title="Schedule" description="Times are generated by the same server-side slot engine reception uses — no same-day limit.">
          <div className="space-y-5 p-5 sm:p-6">
            <label className="block max-w-sm">
              <FieldLabel>Appointment date</FieldLabel>
              <input
                className={INPUT_CLASS_NAME}
                min={todayDateInputValue()}
                onChange={(event) => { setDate(event.target.value); setSelectedSlot(undefined); }}
                type="date"
                value={date}
              />
            </label>
            {slotLoading ? <p className="text-sm text-slate-600">Loading appointment times…</p> : null}
            {!slotLoading && slotUnavailableReason ? <WonFlowEmptyState title={slotUnavailableReason} /> : null}
            {!slotLoading && !slotUnavailableReason && slots && slots.length === 0 ? <WonFlowEmptyState title="No appointment times are available for this date." /> : null}
            {slots && slots.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {slots.map((slot) => (
                  <button
                    aria-pressed={selectedSlot?.startsAt === slot.startsAt}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedSlot?.startsAt === slot.startsAt ? "border-blue-500 bg-blue-50 text-blue-900" : "border-slate-200 hover:border-blue-300"}`}
                    disabled={!slot.available}
                    key={slot.startsAt}
                    onClick={() => setSelectedSlot(slot)}
                    type="button"
                  >
                    {formatSlotLabel(slot)}
                  </button>
                ))}
              </div>
            ) : null}
            <label className="block">
              <FieldLabel>Reason for appointment</FieldLabel>
              <input className={INPUT_CLASS_NAME} onChange={(event) => setReason(event.target.value)} value={reason} />
            </label>
            <div className="flex justify-between gap-3">
              <WonFlowActionButton onClick={() => setStage("doctor")}>Back</WonFlowActionButton>
              <WonFlowActionButton disabled={!selectedSlot} onClick={() => setStage("review")} variant="primary">Review booking</WonFlowActionButton>
            </div>
          </div>
        </WonFlowOperationalPanel>
      ) : null}

      {stage === "review" && selectedDoctor && selectedSlot && selectedPatient ? (
        <WonFlowOperationalPanel title="Review and confirm" description="This creates a real appointment the moment you confirm.">
          <div className="space-y-5 p-5 sm:p-6">
            <dl>
              <DetailRow label="Patient" value={`${selectedPatient.givenName} ${selectedPatient.familyName} — ${selectedPatient.patientNumber}`} />
              <DetailRow label="Doctor" value={`${selectedDoctor.displayName} — ${selectedDoctor.specialtyName}`} />
              <DetailRow label="Department" value={selectedDoctor.departmentName ?? "Not assigned"} />
              <DetailRow label="Service" value={selectedService?.name ?? "General consultation"} />
              <DetailRow label="Consultation type" value={consultationMode === "ONLINE" ? "Online video consultation" : "In person at the hospital"} />
              <DetailRow label="Appointment time" value={formatSlotLabel(selectedSlot)} />
              {consultationMode === "IN_PERSON" ? (
                <>
                  <DetailRow
                    label="Room"
                    value={selectedSlot.roomLabel ?? "Confirmed when the doctor starts their sitting"}
                  />
                  <DetailRow label="Location" value={locationSummary} />
                </>
              ) : (
                <DetailRow label="Joining" value="A video consultation link opens on the patient's portal at the appointment time." />
              )}
              <DetailRow label="Reason" value={reason.trim() || "Not provided"} />
            </dl>
            <div className="flex justify-between gap-3">
              <WonFlowActionButton disabled={bookMutation.saveState === "saving"} onClick={() => setStage("schedule")}>Back</WonFlowActionButton>
              <WonFlowActionButton disabled={bookMutation.saveState === "saving"} onClick={() => void confirmBooking()} variant="primary">
                {bookMutation.saveState === "saving" ? "Confirming…" : "Confirm appointment"}
              </WonFlowActionButton>
            </div>
          </div>
        </WonFlowOperationalPanel>
      ) : null}

      {stage === "confirmed" && confirmedAppointmentId ? (
        <WonFlowOperationalPanel description="The appointment is now on the reception directory and the doctor's schedule." title="Appointment created" tone="emerald">
          <div className="space-y-5 p-5 sm:p-6">
            {/* Read these back to the patient on the phone — where to go, and when. */}
            <dl>
              <DetailRow label="Appointment ID" value={confirmedAppointmentId} />
              {confirmedDetails ? (
                <>
                  <DetailRow label="Doctor" value={confirmedDetails.doctor} />
                  <DetailRow label="Department" value={confirmedDetails.department} />
                  <DetailRow label="Consultation type" value={confirmedDetails.mode} />
                  <DetailRow label="Appointment time" value={confirmedDetails.time} />
                  <DetailRow label="Room" value={confirmedDetails.room} />
                  <DetailRow label="Location" value={confirmedDetails.location} />
                </>
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-3">
              <WonFlowActionButton onClick={startAnotherBooking} variant="primary">Book another appointment</WonFlowActionButton>
              <Link className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50" href="/operations/appointments">
                Back to appointments
              </Link>
            </div>
          </div>
        </WonFlowOperationalPanel>
      ) : null}
    </div>
  );
}
