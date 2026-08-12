"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  hasPracticePrivilege,
  isPracticeTeamMemberActive,
} from "@wonflow/contracts";
import type {
  DoctorConsultationMode,
  Patient,
  PracticeDocument,
  PracticeSlot,
} from "@wonflow/contracts";
import {
  WONFLOW_DEMO_ANCHOR_DATE_TIME,
} from "@wonflow/mock-data";
import type {
  ConfirmPracticeBookingResult,
  PracticeBookingActor,
  PracticeBookingOptionsView,
  PracticeBookingOfferingOption,
} from "@wonflow/mock-data";
import {
  confirmPracticeBookingFormSchema,
  isoDateSchema,
} from "@wonflow/validation";

import {
  useWonFlowApplication,
} from "@/app/_providers";
import {
  WonFlowEmptyState,
} from "@/components/feedback";
import {
  WonFlowActionButton,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";
import type {
  WonFlowPracticeTenantRuntimeContext,
} from "@/lib/data";

import {
  createPracticeBookingIdempotencyKey,
  formatPracticeBookingMoney,
  formatPracticeBookingSlot,
  getPracticeBookingDateBounds,
} from "./practice-booking-ui";

type BookingStage =
  | "patient"
  | "offering"
  | "schedule"
  | "details"
  | "review"
  | "confirmed";

interface PracticeBookingSelection {
  patientId: string;
  offeringId: string;
  consultationMode: string;
  assignedTeamMemberId: string;
  date: string;
  slotId: string;
  priority: "routine" | "urgent";
  reasonForAppointment: string;
  patientNotes: string;
  attachedDocumentIds: string[];
  paymentProviderConfigId: string;
}

interface AppointmentBookingWorkflowProps {
  initialPatientId?: string;
}

const EMPTY_SELECTION: PracticeBookingSelection = {
  patientId: "",
  offeringId: "",
  consultationMode: "",
  assignedTeamMemberId: "",
  date: "",
  slotId: "",
  priority: "routine",
  reasonForAppointment: "",
  patientNotes: "",
  attachedDocumentIds: [],
  paymentProviderConfigId: "",
};

const INPUT_CLASS_NAME = [
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5",
  "text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
  "focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
].join(" ");

function humanize(value: string): string {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The booking operation could not be completed.";
}

function stageNumber(stage: BookingStage): number {
  return ["patient", "offering", "schedule", "details", "review", "confirmed"].indexOf(stage) + 1;
}

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

function InstructionBlock({ title, value }: { title: string; value?: string }) {
  if (value === undefined || value.trim() === "") return null;
  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <h3 className="text-sm font-black text-blue-950">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-blue-900">{value}</p>
    </section>
  );
}

export function AppointmentBookingWorkflow({
  initialPatientId,
}: AppointmentBookingWorkflowProps) {
  const {
    practiceService,
    practiceTenant,
    locale,
  } = useWonFlowApplication();
  const [idempotencyKey, setIdempotencyKey] = useState(createPracticeBookingIdempotencyKey);
  const [stage, setStage] = useState<BookingStage>("patient");
  const [selection, setSelection] = useState<PracticeBookingSelection>(EMPTY_SELECTION);
  const [tenant, setTenant] = useState<WonFlowPracticeTenantRuntimeContext>();
  const [bookingActor, setBookingActor] = useState<PracticeBookingActor>();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [documents, setDocuments] = useState<PracticeDocument[]>([]);
  const [bookingOptions, setBookingOptions] = useState<PracticeBookingOptionsView>();
  const [slots, setSlots] = useState<PracticeSlot[]>([]);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmPracticeBookingResult>();
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    async function loadTenantBookingData(): Promise<void> {
      setLoading(true);
      setError(undefined);
      try {
        const resolvedTenant = await practiceTenant;
        const [memberPage, patientPage, documentPage] = await Promise.all([
          practiceService.teamMembers.list(resolvedTenant.scope, { limit: 1_000 }),
          practiceService.patients.list(resolvedTenant.scope, { limit: 1_000 }),
          practiceService.practiceDocuments.list(resolvedTenant.scope, { limit: 1_000 }),
        ]);
        const member = memberPage.items.find((candidate) =>
          candidate.userId === resolvedTenant.ownerUserId &&
          isPracticeTeamMemberActive(candidate) &&
          hasPracticePrivilege(candidate, "appointments.book", WONFLOW_DEMO_ANCHOR_DATE_TIME),
        );
        if (member === undefined) {
          throw new Error("The signed-in practice user is not authorized to book appointments.");
        }
        const activePatients = patientPage.items
          .filter((patient) => patient.status === "active")
          .sort((left, right) => left.displayName.localeCompare(right.displayName));
        const initialPatient = activePatients.find((patient) => patient.id === initialPatientId);
        if (!active) return;
        setTenant(resolvedTenant);
        setBookingActor({ type: "team-member", userId: member.userId, teamMemberId: member.id });
        setPatients(activePatients);
        setDocuments(documentPage.items);
        if (initialPatient !== undefined) {
          setSelection({ ...EMPTY_SELECTION, patientId: initialPatient.id });
          setStage("offering");
        }
      } catch (loadError) {
        if (active) setError(readError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadTenantBookingData();
    return () => { active = false; };
  }, [initialPatientId, practiceService, practiceTenant]);

  useEffect(() => {
    if (tenant === undefined || bookingActor === undefined || selection.patientId === "") {
      return;
    }
    const currentTenant = tenant;
    const currentActor = bookingActor;
    let active = true;
    async function loadBookingOptions(): Promise<void> {
      setError(undefined);
      try {
        const result = await practiceService.getPracticeBookingOptions(currentTenant.scope, {
          actor: currentActor,
          patientId: selection.patientId,
          bookingChannel: "staff",
        });
        if (active) setBookingOptions(result);
      } catch (optionsError) {
        if (active) setError(readError(optionsError));
      }
    }
    void loadBookingOptions();
    return () => { active = false; };
  }, [bookingActor, practiceService, selection.patientId, tenant]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selection.patientId),
    [patients, selection.patientId],
  );
  const selectedOption = useMemo(
    () => bookingOptions?.offerings.find((option) => option.offering.id === selection.offeringId),
    [bookingOptions, selection.offeringId],
  );
  const selectedClinician = useMemo(
    () => selectedOption?.clinicians.find((clinician) => clinician.teamMember.id === selection.assignedTeamMemberId),
    [selectedOption, selection.assignedTeamMemberId],
  );
  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.id === selection.slotId),
    [selection.slotId, slots],
  );
  const patientDocuments = useMemo(
    () => documents.filter((document) =>
      document.patientId === selection.patientId && document.lifecycleStatus === "available",
    ),
    [documents, selection.patientId],
  );
  const groupedOptions = useMemo(() => {
    const groups = new Map<string, PracticeBookingOfferingOption[]>();
    for (const option of bookingOptions?.offerings ?? []) {
      groups.set(option.location.id, [...(groups.get(option.location.id) ?? []), option]);
    }
    return [...groups.values()];
  }, [bookingOptions]);

  const dateBounds = selectedOption === undefined
    ? undefined
    : getPracticeBookingDateBounds(
        selectedOption.location.timezone,
        selectedOption.bookingHorizonDays,
        new Date(WONFLOW_DEMO_ANCHOR_DATE_TIME),
      );

  useEffect(() => {
    if (
      tenant === undefined || bookingActor === undefined || selectedOption === undefined ||
      selectedClinician === undefined || selection.consultationMode === "" || selection.date === ""
    ) {
      return;
    }
    const parsedDate = isoDateSchema.safeParse(selection.date);
    if (!parsedDate.success) {
      return;
    }
    const currentTenant = tenant;
    const currentActor = bookingActor;
    const currentOption = selectedOption;
    const currentClinician = selectedClinician;
    const currentDate = parsedDate.data;
    let active = true;
    async function loadSlots(): Promise<void> {
      setSlotLoading(true);
      setError(undefined);
      try {
        const result = await practiceService.listPracticeBookingSlots(currentTenant.scope, {
          actor: currentActor,
          patientId: selection.patientId,
          bookingChannel: "staff",
          practiceLocationId: currentOption.location.id,
          practiceServiceId: currentOption.service.id,
          practiceServiceOfferingId: currentOption.offering.id,
          consultationMode: selection.consultationMode as DoctorConsultationMode,
          assignedTeamMemberId: currentClinician.teamMember.id,
          dateFrom: currentDate,
          dateTo: currentDate,
        });
        if (active) setSlots(result);
      } catch (slotError) {
        if (active) setError(readError(slotError));
      } finally {
        if (active) setSlotLoading(false);
      }
    }
    void loadSlots();
    return () => { active = false; };
  }, [bookingActor, practiceService, selectedClinician, selectedOption, selection.consultationMode, selection.date, selection.patientId, tenant]);

  function selectPatient(patientId: string): void {
    setSelection({ ...EMPTY_SELECTION, patientId });
    setBookingOptions(undefined);
    setSlots([]);
    setConfirmationResult(undefined);
    setError(undefined);
    setStage(patientId === "" ? "patient" : "offering");
  }

  function selectOffering(offeringId: string): void {
    setSelection((current) => ({
      ...EMPTY_SELECTION,
      patientId: current.patientId,
      offeringId,
      priority: current.priority,
    }));
    setSlots([]);
    setError(undefined);
  }

  function selectMode(consultationMode: string): void {
    const automaticClinicianId = selectedOption?.clinicians.length === 1
      ? selectedOption.clinicians[0]!.teamMember.id
      : "";
    setSelection((current) => ({
      ...current,
      consultationMode,
      assignedTeamMemberId: automaticClinicianId,
      date: "",
      slotId: "",
    }));
    setSlots([]);
  }

  function selectClinician(assignedTeamMemberId: string): void {
    setSelection((current) => ({ ...current, assignedTeamMemberId, date: "", slotId: "" }));
    setSlots([]);
  }

  function selectDate(date: string): void {
    setSelection((current) => ({ ...current, date, slotId: "" }));
    setSlots([]);
  }

  function toggleDocument(documentId: string): void {
    setSelection((current) => ({
      ...current,
      attachedDocumentIds: current.attachedDocumentIds.includes(documentId)
        ? current.attachedDocumentIds.filter((id) => id !== documentId)
        : [...current.attachedDocumentIds, documentId],
    }));
  }

  async function confirmBooking(): Promise<void> {
    if (
      tenant === undefined || bookingActor === undefined || selectedOption === undefined ||
      selectedClinician === undefined || selectedSlot === undefined
    ) return;
    const trimmedReason = selection.reasonForAppointment.trim();
    const trimmedNotes = selection.patientNotes.trim();
    const providerId = selectedOption.requiresPrepayment ? selection.paymentProviderConfigId : "";
    const parsed = confirmPracticeBookingFormSchema.safeParse({
      idempotencyKey,
      patientId: selection.patientId,
      practiceLocationId: selectedOption.location.id,
      practiceServiceId: selectedOption.service.id,
      practiceServiceOfferingId: selectedOption.offering.id,
      practiceSlotId: selectedSlot.id,
      assignedTeamMemberId: selectedClinician.teamMember.id,
      consultationMode: selection.consultationMode,
      bookingChannel: "staff",
      priority: selection.priority,
      reasonForAppointment: trimmedReason === "" ? undefined : trimmedReason,
      patientNotes: trimmedNotes === "" ? undefined : trimmedNotes,
      attachedDocumentIds: selection.attachedDocumentIds,
      paymentProviderConfigId: providerId === "" ? undefined : providerId,
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(" "));
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await practiceService.confirmPracticeBooking(tenant.scope, {
        actor: bookingActor,
        ...parsed.data,
      });
      setConfirmationResult(result);
      setStage("confirmed");
    } catch (confirmationError) {
      setError(readError(confirmationError));
    } finally {
      setSubmitting(false);
    }
  }

  function startAnotherBooking(): void {
    setIdempotencyKey(createPracticeBookingIdempotencyKey());
    setSelection(EMPTY_SELECTION);
    setBookingOptions(undefined);
    setSlots([]);
    setConfirmationResult(undefined);
    setError(undefined);
    setStage("patient");
  }

  const requiredDocumentMissing = selectedOption?.service.requiresDocumentUpload === true && selection.attachedDocumentIds.length === 0;
  const providerUnavailable = selectedOption?.requiresPrepayment === true && selectedOption.paymentProviders.length === 0;
  const providerMissing = selectedOption?.requiresPrepayment === true && selection.paymentProviderConfigId === "";
  const durationMinutes = selectedOption === undefined
    ? undefined
    : selectedOption.offering.durationOverrideMinutes ?? selectedOption.service.defaultDurationMinutes;

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Loading booking configuration…</div>;
  }

  return (
    <div className="space-y-5">
      <WonFlowPageHeader
        eyebrow={`Appointment booking · Step ${stageNumber(stage)} of 6`}
        title="Book a catalogue appointment"
        description="Select a tenant-owned service, clinician and generated appointment time. Pricing and policy are confirmed by the protected booking service."
        breadcrumbs={[
          { label: "Operations", href: "/operations" },
          { label: "Appointments", href: "/operations/appointments" },
          { label: "New booking" },
        ]}
      />

      {error !== undefined ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>
      ) : null}

      {patients.length === 0 ? (
        <WonFlowEmptyState
          title="No active patients are available for booking."
          description="Register a patient before starting an appointment booking."
          action={<Link className="font-bold text-blue-700 hover:underline" href="/operations/patients/register">Register a patient</Link>}
        />
      ) : null}

      {patients.length > 0 && stage !== "confirmed" ? (
        <WonFlowOperationalPanel title="Patient" description="Only active patients in the current tenant are available.">
          <div className="p-5 sm:p-6">
            <label>
              <FieldLabel>Patient</FieldLabel>
              <select className={INPUT_CLASS_NAME} value={selection.patientId} onChange={(event) => selectPatient(event.target.value)}>
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.displayName} — {patient.mrn}</option>
                ))}
              </select>
            </label>
          </div>
        </WonFlowOperationalPanel>
      ) : null}

      {stage === "offering" && selection.patientId !== "" ? (
        <WonFlowOperationalPanel title="Service offering" description="Availability, fees and policy come from the protected catalogue operation.">
          <div className="space-y-5 p-5 sm:p-6">
            {bookingOptions === undefined ? (
              <p className="text-sm text-slate-600">Loading configured services…</p>
            ) : groupedOptions.length === 0 ? (
              <WonFlowEmptyState
                title="No configured services are currently available for booking."
                description="Configure an active location, service offering and compatible policy before booking."
                action={<div className="flex flex-wrap justify-center gap-4 text-sm font-bold text-blue-700"><Link href="/doctor/services">Services</Link><Link href="/doctor/locations">Locations</Link><Link href="/doctor/policies">Policies</Link></div>}
              />
            ) : (
              groupedOptions.map((options) => (
                <section key={options[0]!.location.id}>
                  <h3 className="mb-3 text-sm font-black text-slate-950">{options[0]!.location.name}</h3>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {options.map((option) => {
                      const selected = selection.offeringId === option.offering.id;
                      const optionDuration = option.offering.durationOverrideMinutes ?? option.service.defaultDurationMinutes;
                      return (
                        <button
                          key={option.offering.id}
                          type="button"
                          aria-pressed={selected}
                          className={`rounded-2xl border p-4 text-left transition ${selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-300"}`}
                          onClick={() => selectOffering(option.offering.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div><p className="font-black text-slate-950">{option.service.name}</p>{option.service.description !== undefined ? <p className="mt-1 text-sm text-slate-600">{option.service.description}</p> : null}</div>
                            <p className="shrink-0 font-black text-blue-700">{formatPracticeBookingMoney(option.offering.fee, locale)}</p>
                          </div>
                          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <div><dt className="font-bold text-slate-500">Category</dt><dd>{humanize(option.service.category)}</dd></div>
                            <div><dt className="font-bold text-slate-500">Duration</dt><dd>{optionDuration} minutes</dd></div>
                            <div><dt className="font-bold text-slate-500">Modes</dt><dd>{option.consultationModes.map(humanize).join(", ")}</dd></div>
                            <div><dt className="font-bold text-slate-500">Payment</dt><dd>{humanize(option.offering.paymentTiming)}</dd></div>
                            <div><dt className="font-bold text-slate-500">Minimum notice</dt><dd>{option.effectiveMinimumBookingNoticeMinutes} minutes</dd></div>
                            <div><dt className="font-bold text-slate-500">Booking horizon</dt><dd>{option.bookingHorizonDays} days</dd></div>
                          </dl>
                          <p className="mt-3 text-xs font-bold text-slate-700">{option.requiresPrepayment ? "Prepayment required" : "No prepayment required"}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}

            {selectedOption !== undefined ? (
              <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                <label>
                  <FieldLabel>Consultation mode</FieldLabel>
                  <select className={INPUT_CLASS_NAME} value={selection.consultationMode} onChange={(event) => selectMode(event.target.value)}>
                    <option value="">Select a mode</option>
                    {selectedOption.consultationModes.map((mode) => <option key={mode} value={mode}>{humanize(mode)}</option>)}
                  </select>
                </label>
                <label>
                  <FieldLabel>Clinician</FieldLabel>
                  <select
                    className={INPUT_CLASS_NAME}
                    disabled={selection.consultationMode === "" || selectedOption.clinicians.length === 0}
                    value={selection.assignedTeamMemberId}
                    onChange={(event) => selectClinician(event.target.value)}
                  >
                    <option value="">Select a clinician</option>
                    {selectedOption.clinicians.map((clinician) => <option key={clinician.teamMember.id} value={clinician.teamMember.id}>{clinician.teamMember.displayName}</option>)}
                  </select>
                </label>
                {selectedOption.clinicians.length === 0 ? <p className="md:col-span-2 text-sm font-semibold text-amber-800">No eligible, independently bookable clinician is configured for this service and location.</p> : null}
              </div>
            ) : null}

            <div className="flex justify-end">
              <WonFlowActionButton variant="primary" disabled={selectedOption === undefined || selection.consultationMode === "" || selectedClinician === undefined} onClick={() => setStage("schedule")}>Choose appointment time</WonFlowActionButton>
            </div>
          </div>
        </WonFlowOperationalPanel>
      ) : null}

      {stage === "schedule" && selectedOption !== undefined ? (
        <WonFlowOperationalPanel title="Schedule" description="Times are generated by the booking service from current sessions, overrides, notice and capacity.">
          <div className="space-y-5 p-5 sm:p-6">
            <label className="block max-w-sm">
              <FieldLabel>Appointment date</FieldLabel>
              <input className={INPUT_CLASS_NAME} min={dateBounds?.minimumDate} max={dateBounds?.maximumDate} type="date" value={selection.date} onChange={(event) => selectDate(event.target.value)} />
            </label>
            {slotLoading ? <p className="text-sm text-slate-600">Loading appointment times…</p> : null}
            {!slotLoading && selection.date !== "" && slots.length === 0 ? <WonFlowEmptyState title="No appointment times are available for this date." /> : null}
            {slots.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {slots.map((slot) => {
                  const disabled = slot.status !== "available" || slot.remainingCount === 0;
                  return <button key={slot.id} type="button" disabled={disabled} aria-pressed={selection.slotId === slot.id} className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${selection.slotId === slot.id ? "border-blue-500 bg-blue-50 text-blue-900" : "border-slate-200 hover:border-blue-300"}`} onClick={() => setSelection((current) => ({ ...current, slotId: slot.id }))}>{formatPracticeBookingSlot(slot, selectedOption.location.timezone, locale)}</button>;
                })}
              </div>
            ) : null}
            <div className="flex justify-between gap-3"><WonFlowActionButton onClick={() => setStage("offering")}>Back</WonFlowActionButton><WonFlowActionButton variant="primary" disabled={selectedSlot === undefined} onClick={() => setStage("details")}>Add booking details</WonFlowActionButton></div>
          </div>
        </WonFlowOperationalPanel>
      ) : null}

      {stage === "details" && selectedOption !== undefined ? (
        <WonFlowOperationalPanel title="Booking details" description="Attach existing patient documents and select payment configuration when required.">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label><FieldLabel>Priority</FieldLabel><select className={INPUT_CLASS_NAME} value={selection.priority} onChange={(event) => setSelection((current) => ({ ...current, priority: event.target.value as PracticeBookingSelection["priority"] }))}><option value="routine">Routine</option><option value="urgent">Urgent</option></select></label>
              <label><FieldLabel>Reason for appointment</FieldLabel><input className={INPUT_CLASS_NAME} value={selection.reasonForAppointment} onChange={(event) => setSelection((current) => ({ ...current, reasonForAppointment: event.target.value }))} /></label>
            </div>
            <label><FieldLabel>Patient notes</FieldLabel><textarea className={`${INPUT_CLASS_NAME} min-h-24 py-3`} value={selection.patientNotes} onChange={(event) => setSelection((current) => ({ ...current, patientNotes: event.target.value }))} /></label>

            <section>
              <h3 className="text-sm font-black text-slate-950">Available patient documents</h3>
              {selectedOption.service.requiresDocumentUpload ? <p className="mt-1 text-sm font-semibold text-amber-800">At least one available patient document must be attached.</p> : null}
              {patientDocuments.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No available documents exist for this patient. <Link className="font-bold text-blue-700 hover:underline" href="/patient/documents">Open patient documents</Link></div>
              ) : (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {patientDocuments.map((document) => (
                    <label key={document.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
                      <input className="mt-1" type="checkbox" checked={selection.attachedDocumentIds.includes(document.id)} onChange={() => toggleDocument(document.id)} />
                      <span><span className="block text-sm font-bold text-slate-900">{document.title}</span><span className="block text-xs text-slate-500">{humanize(document.category)}{document.clinicalDate === undefined ? "" : ` · ${document.clinicalDate}`}</span></span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {selectedOption.requiresPrepayment ? (
              <section>
                <h3 className="text-sm font-black text-slate-950">Payment provider</h3>
                {providerUnavailable ? <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">This booking requires prepayment, but no compatible payment provider is configured.</p> : (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">{selectedOption.paymentProviders.map((provider) => <label key={provider.id} className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-3"><input type="radio" name="payment-provider" value={provider.id} checked={selection.paymentProviderConfigId === provider.id} onChange={(event) => setSelection((current) => ({ ...current, paymentProviderConfigId: event.target.value }))} /><span><span className="block text-sm font-bold text-slate-900">{provider.displayName}</span><span className="block text-xs text-slate-500">{humanize(provider.collectionMode)} · {provider.supportedCurrencyCodes.join(", ")}</span></span></label>)}</div>
                )}
              </section>
            ) : null}

            <div className="flex justify-between gap-3"><WonFlowActionButton onClick={() => setStage("schedule")}>Back</WonFlowActionButton><WonFlowActionButton variant="primary" disabled={requiredDocumentMissing || providerUnavailable || providerMissing} onClick={() => setStage("review")}>Review booking</WonFlowActionButton></div>
          </div>
        </WonFlowOperationalPanel>
      ) : null}

      {stage === "review" && selectedOption !== undefined && selectedPatient !== undefined && selectedClinician !== undefined && selectedSlot !== undefined ? (
        <WonFlowOperationalPanel title="Review and confirm" description="The protected service will re-resolve the catalogue, policy, slot and payment requirements.">
          <div className="space-y-5 p-5 sm:p-6">
            <dl>
              <DetailRow label="Patient" value={`${selectedPatient.displayName} — ${selectedPatient.mrn}`} />
              <DetailRow label="Location" value={selectedOption.location.name} />
              <DetailRow label="Service" value={selectedOption.service.name} />
              <DetailRow label="Consultation mode" value={humanize(selection.consultationMode)} />
              <DetailRow label="Clinician" value={selectedClinician.teamMember.displayName} />
              <DetailRow label="Appointment time" value={formatPracticeBookingSlot(selectedSlot, selectedOption.location.timezone, locale)} />
              <DetailRow label="Duration" value={`${durationMinutes} minutes`} />
              <DetailRow label="Catalogue fee" value={formatPracticeBookingMoney(selectedOption.offering.fee, locale)} />
              <DetailRow label="Payment timing" value={humanize(selectedOption.offering.paymentTiming)} />
              <DetailRow label="Prepayment" value={selectedOption.requiresPrepayment ? "Required" : "Not required"} />
              <DetailRow label="Documents" value={selection.attachedDocumentIds.length === 0 ? "None" : patientDocuments.filter((document) => selection.attachedDocumentIds.includes(document.id)).map((document) => document.title).join(", ")} />
              <DetailRow label="Reason" value={selection.reasonForAppointment.trim() || "Not provided"} />
              <DetailRow label="Notes" value={selection.patientNotes.trim() || "Not provided"} />
            </dl>
            <div className="grid gap-3 md:grid-cols-2">
              <InstructionBlock title="Preparation instructions" value={selectedOption.service.preparationInstructions} />
              <InstructionBlock title="Location instructions" value={selectedOption.offering.locationInstructions} />
              <InstructionBlock title="Patient directions" value={selectedOption.location.patientDirections} />
              <InstructionBlock title="Clinic instructions" value={selectedOption.location.clinicInstructions} />
            </div>
            <div className="flex justify-between gap-3"><WonFlowActionButton disabled={submitting} onClick={() => setStage("details")}>Back</WonFlowActionButton><WonFlowActionButton variant="primary" disabled={submitting || requiredDocumentMissing || providerUnavailable || providerMissing} onClick={() => void confirmBooking()}>{submitting ? "Confirming…" : "Confirm appointment"}</WonFlowActionButton></div>
          </div>
        </WonFlowOperationalPanel>
      ) : null}

      {stage === "confirmed" && confirmationResult !== undefined ? (
        <WonFlowOperationalPanel title="Appointment created" description="These values were returned by the protected booking operation." tone="emerald">
          <div className="space-y-5 p-5 sm:p-6">
            <dl>
              <DetailRow label="Appointment ID" value={confirmationResult.appointment.id} />
              <DetailRow label="Status" value={humanize(confirmationResult.appointment.status)} />
              <DetailRow label="Scheduled time" value={formatPracticeBookingSlot(confirmationResult.slot, confirmationResult.location.timezone, locale)} />
              <DetailRow label="Location" value={confirmationResult.location.name} />
              <DetailRow label="Service" value={confirmationResult.service.name} />
              <DetailRow label="Clinician" value={selectedClinician?.teamMember.displayName ?? confirmationResult.practiceAppointment.assignedTeamMemberId ?? "Unassigned"} />
              <DetailRow label="Quoted fee" value={formatPracticeBookingMoney(confirmationResult.practiceAppointment.quotedFee, locale)} />
              <DetailRow label="Payment state" value={confirmationResult.practiceAppointment.paymentState === "paid" ? "Paid" : humanize(confirmationResult.practiceAppointment.paymentState)} />
              <DetailRow label="Payment timing" value={confirmationResult.practiceAppointment.paymentState === "not-required" ? "No payment required" : humanize(confirmationResult.offering.paymentTiming)} />
              {confirmationResult.paymentIntent !== undefined ? <DetailRow label="Payment intent" value={humanize(confirmationResult.paymentIntent.status)} /> : null}
            </dl>
            <div className="grid gap-3 md:grid-cols-2">
              <InstructionBlock title="Preparation instructions" value={confirmationResult.service.preparationInstructions} />
              <InstructionBlock title="Location instructions" value={confirmationResult.offering.locationInstructions} />
              <InstructionBlock title="Patient directions" value={confirmationResult.location.patientDirections} />
              <InstructionBlock title="Clinic instructions" value={confirmationResult.location.clinicInstructions} />
            </div>
            <WonFlowActionButton variant="primary" onClick={startAnotherBooking}>Book another appointment</WonFlowActionButton>
          </div>
        </WonFlowOperationalPanel>
      ) : null}
    </div>
  );
}
