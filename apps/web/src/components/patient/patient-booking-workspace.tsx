"use client";
/* eslint-disable react-hooks/purity -- appointment grouping uses the current render instant. */
import Link from "next/link";
import {
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  MapPin,
  Stethoscope,
  TriangleAlert,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { WonFlowPageHeader } from "@/components/workspace";

interface Option { ruleId: string; branchId: string; branchName: string; doctorId: string; doctorName: string; specialty: string | null; serviceId: string; serviceName: string; consultationModes: ("IN_PERSON" | "ONLINE")[]; requiresPrepayment: boolean; durationMinutes: number; priceMinorUnits: number | null; currencyCode: string }
interface Slot { id: string; ruleId: string; branchId: string; doctorId: string; serviceId: string; startsAt: string; endsAt: string; timezone: string; available: boolean }
interface Appointment { id: string; startsAt: string; endsAt: string; status: string; consultationMode: "IN_PERSON" | "ONLINE"; reason: string | null; service: { name: string } | null; branch: { name: string; timezone: string }; doctor: { staffProfile: { membership: { displayName: string } } } | null }

const humanize = (value: string) => value.replaceAll("_", " ").toLowerCase();

/** Limited to the palette that globals.css remaps for dark mode. */
const toneClasses = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  emerald: "border-blue-100 bg-emerald-50 text-emerald-700",
  amber: "border-blue-100 bg-amber-50 text-amber-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

function statusTone(status: string): keyof typeof toneClasses {
  const value = status.toUpperCase();
  if (["CANCELLED", "NO_SHOW"].includes(value)) return "amber";
  if (["COMPLETED", "CONFIRMED"].includes(value)) return "emerald";
  if (["PENDING", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"].includes(value)) return "blue";
  return "slate";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${toneClasses[statusTone(status)]}`}>
      {humanize(status)}
    </span>
  );
}

function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="mt-3 text-sm font-black text-slate-700">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const startsAt = new Date(appointment.startsAt);
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid shrink-0 place-items-center rounded-xl bg-blue-50 px-3 py-2 text-center">
        <span className="text-[11px] font-black uppercase text-slate-500">
          {new Intl.DateTimeFormat("en-PK", { month: "short" }).format(startsAt)}
        </span>
        <span className="text-2xl font-black leading-none text-slate-900">
          {new Intl.DateTimeFormat("en-PK", { day: "2-digit" }).format(startsAt)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-black text-slate-900">{appointment.service?.name ?? "Hospital appointment"}</span>
          <StatusPill status={appointment.status} />
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${appointment.consultationMode === "ONLINE" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
            {appointment.consultationMode === "ONLINE" ? <Video aria-hidden className="size-3" /> : <MapPin aria-hidden className="size-3" />}
            {appointment.consultationMode === "ONLINE" ? "Online" : "In person"}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-3.5" />
            {new Intl.DateTimeFormat("en-PK", { timeStyle: "short" }).format(startsAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden className="size-3.5" />
            {appointment.branch.name}
          </span>
          {appointment.doctor ? (
            <span className="inline-flex items-center gap-1">
              <Stethoscope aria-hidden className="size-3.5" />
              {appointment.doctor.staffProfile.membership.displayName}
            </span>
          ) : null}
        </div>
        {appointment.reason ? <p className="mt-2 line-clamp-2 text-sm text-slate-600">{appointment.reason}</p> : null}
        {appointment.consultationMode === "ONLINE" && !["CANCELLED", "NO_SHOW"].includes(appointment.status) ? (
          <Link className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700" href={`/patient/appointments/${appointment.id}/video`}>
            <Video aria-hidden className="size-4" />
            Open video consultation
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function PatientBookingWorkspace({ booking }: { booking: boolean }) {
  const [date, setDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [options, setOptions] = useState<Option[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ruleId, setRuleId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [chosenMode, setChosenMode] = useState<"IN_PERSON" | "ONLINE" | "">("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/api/v1/patient/booking?date=${date}`, { cache: "no-store" });
      const body = await response.json() as { catalog?: { options: Option[]; slots: Slot[] }; appointments?: Appointment[]; error?: string };
      if (!response.ok || !body.catalog) throw new Error(body.error);
      setOptions(body.catalog.options);
      setSlots(body.catalog.slots);
      setAppointments(body.appointments ?? []);
      setRuleId((current) => current && body.catalog!.options.some((option) => option.ruleId === current) ? current : body.catalog!.options[0]?.ruleId ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Appointments could not be loaded.");
    }
  }, [date]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const availableSlots = useMemo(() => slots.filter((slot) => slot.ruleId === ruleId), [ruleId, slots]);
  const selectedOption = options.find((option) => option.ruleId === ruleId);
  // A service offering only one mode never needs an explicit choice; one
  // offering both requires the patient to pick, so chosenMode stays empty
  // (and the confirm button stays disabled) until they do.
  const mode = selectedOption?.consultationModes.length === 1 ? selectedOption.consultationModes[0]! : chosenMode;
  const modeRequiresChoice = (selectedOption?.consultationModes.length ?? 0) > 1;
  const requiresPrepayment = mode === "ONLINE" && selectedOption?.requiresPrepayment === true;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slotId || !mode) return;
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/patient/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slotId, mode, reason: data.get("reason"), idempotencyKey: crypto.randomUUID() }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error);
      setMessage(
        requiresPrepayment
          ? "Appointment reserved. Pay and upload proof to confirm it — see the payment screen for this appointment."
          : "Appointment confirmed. Reception and your doctor can now see this booking.",
      );
      setSlotId("");
      setChosenMode("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Appointment could not be booked.");
    } finally {
      setBusy(false);
    }
  }

  if (!booking) {
    const now = Date.now();
    const upcoming = appointments
      .filter((item) => new Date(item.endsAt).getTime() >= now && item.status.toUpperCase() !== "CANCELLED")
      .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
    const previous = appointments.filter((item) => !upcoming.includes(item));

    return (
      <div className="space-y-5">
        <WonFlowPageHeader
          actions={
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-black text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700"
              href="/patient/appointments/book"
            >
              <CalendarPlus aria-hidden className="size-4" />
              Book appointment
            </Link>
          }
          description={upcoming.length ? `${upcoming.length} upcoming ${upcoming.length === 1 ? "visit" : "visits"}.` : "You have no upcoming visits."}
          eyebrow="Patient portal"
          title="My appointments"
        />

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <TriangleAlert aria-hidden className="size-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {([["Upcoming", upcoming], ["Previous", previous]] as const).map(([label, items]) => (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" key={label}>
            <h2 className="text-lg font-black text-slate-900">{label} appointments</h2>
            {items.length ? (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {items.map((item) => <AppointmentCard appointment={item} key={item.id} />)}
              </div>
            ) : (
              <EmptyState
                icon={label === "Upcoming" ? CalendarDays : CalendarCheck}
                title={`No ${label.toLowerCase()} appointments.`}
                hint={label === "Upcoming" ? "Book a consultation and it will appear here straight away." : "Visits you have already attended will be listed here."}
                action={label === "Upcoming" ? (
                  <Link className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700" href="/patient/appointments/book">
                    <CalendarPlus aria-hidden className="size-4" />
                    Book appointment
                  </Link>
                ) : undefined}
              />
            )}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WonFlowPageHeader
        description="Times come directly from hospital schedules and are shown in the branch timezone."
        eyebrow="Patient booking"
        title="Book an appointment"
      />

      {message ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
          <CheckCircle2 aria-hidden className="size-5 shrink-0" />
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <form className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Appointment date</span>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-semibold text-slate-900"
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => { setDate(event.target.value); setSlotId(""); }}
              type="date"
              value={date}
            />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Specialty, doctor and service</span>
            <select
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-semibold text-slate-900"
              onChange={(event) => { setRuleId(event.target.value); setSlotId(""); setChosenMode(""); }}
              value={ruleId}
            >
              <option value="">No published schedules</option>
              {options.map((option) => (
                <option key={option.ruleId} value={option.ruleId}>
                  {option.specialty ?? "Clinical care"} · {option.doctorName} · {option.serviceName} · {option.branchName}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedOption ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <Stethoscope aria-hidden className="size-4 text-blue-600" />
                {selectedOption.doctorName}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden className="size-4 text-blue-600" />
                {selectedOption.durationMinutes} minutes
              </span>
              {!modeRequiresChoice ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-4 text-blue-600" />
                  {mode === "ONLINE" ? "Online video consultation" : selectedOption.branchName}
                </span>
              ) : null}
              <span className="ml-auto font-black text-slate-900">
                {selectedOption.priceMinorUnits === null
                  ? "Fee confirmed by hospital"
                  : `${selectedOption.currencyCode} ${(selectedOption.priceMinorUnits / 100).toLocaleString("en-PK")}`}
              </span>
            </div>

            {modeRequiresChoice ? (
              <fieldset className="rounded-2xl border border-slate-200 p-3">
                <legend className="px-1 text-xs font-black uppercase tracking-wide text-slate-500">How would you like this consultation?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    aria-pressed={mode === "IN_PERSON"}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-black transition ${mode === "IN_PERSON" ? "border-blue-100 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-blue-100 hover:bg-blue-50"}`}
                    onClick={() => setChosenMode("IN_PERSON")}
                    type="button"
                  >
                    <MapPin aria-hidden className="mr-1.5 inline size-4" />
                    In person at {selectedOption.branchName}
                  </button>
                  <button
                    aria-pressed={mode === "ONLINE"}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-black transition ${mode === "ONLINE" ? "border-blue-100 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-blue-100 hover:bg-blue-50"}`}
                    onClick={() => setChosenMode("ONLINE")}
                    type="button"
                  >
                    <Video aria-hidden className="mr-1.5 inline size-4" />
                    Online video consultation
                  </button>
                </div>
              </fieldset>
            ) : null}

            {requiresPrepayment ? (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                Online consultations for this service require payment before confirmation. After booking you will need to transfer payment and upload proof — your doctor confirms it before the visit.
              </div>
            ) : null}
          </div>
        ) : null}

        <fieldset>
          <legend className="text-xs font-black uppercase tracking-wide text-slate-500">Available time</legend>
          {availableSlots.length ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {availableSlots.map((slot) => {
                const selected = slotId === slot.id;
                return (
                  <button
                    aria-pressed={selected}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-black transition ${
                      !slot.available
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 line-through"
                        : selected
                          ? "border-blue-100 bg-blue-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-100 hover:bg-blue-50"
                    }`}
                    disabled={!slot.available}
                    key={slot.id}
                    onClick={() => setSlotId(slot.id)}
                    title={slot.available ? undefined : "This time is already booked."}
                    type="button"
                  >
                    {new Intl.DateTimeFormat("en-PK", { timeStyle: "short", timeZone: slot.timezone }).format(new Date(slot.startsAt))}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
              {ruleId ? "No clinic scheduled for this doctor on this date. Try another day." : "Choose a specialty and doctor to see available times."}
            </p>
          )}
        </fieldset>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Reason for appointment</span>
          <textarea
            className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
            maxLength={500}
            name="reason"
            placeholder="Briefly describe your symptoms or the reason for this visit."
            required
          />
        </label>

        <button
          className="w-full rounded-xl bg-blue-600 p-3.5 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy || !slotId || !mode}
          type="submit"
        >
          {busy ? "Confirming…" : !slotId ? "Select a time to continue" : !mode ? "Choose in person or online" : "Confirm appointment"}
        </button>
      </form>
    </div>
  );
}
