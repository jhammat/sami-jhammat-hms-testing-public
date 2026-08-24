"use client";
/* eslint-disable react-hooks/purity -- appointment grouping uses the current render instant. */
import Link from "next/link";
import {
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Info,
  MapPin,
  Stethoscope,
  TriangleAlert,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { WonFlowPageHeader } from "@/components/workspace";

interface Option {
  ruleId: string;
  branchId: string;
  branchName: string;
  doctorId: string;
  doctorName: string;
  specialty: string | null;
  serviceId: string;
  serviceName: string;
  consultationModes: ("IN_PERSON" | "ONLINE")[];
  requiresPrepayment: boolean;
  durationMinutes: number;
  priceMinorUnits: number | null;
  currencyCode: string;
}

interface Slot {
  id: string;
  ruleId: string;
  branchId: string;
  doctorId: string;
  serviceId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  available: boolean;
}

/**
 * Why the portal has nothing to offer. The server names the missing piece —
 * an unpublished doctor, a service that is not open to patient booking, a day
 * with no clinic — so this screen never leaves a patient staring at an empty
 * dropdown with no idea whether to wait, change the date, or telephone.
 */
interface Blocker {
  code: string;
  message: string;
}

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  consultationMode: "IN_PERSON" | "ONLINE";
  reason: string | null;
  service: { name: string } | null;
  branch: { name: string; timezone: string };
  doctor: { staffProfile: { membership: { displayName: string } } } | null;
}

const humanize = (value: string) => value.replaceAll("_", " ").toLowerCase();

const toneClasses = {
  blue: "border-blue-200/80 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  emerald: "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  amber: "border-amber-200/80 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  slate: "border-slate-200/80 bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400",
} as const;

function statusTone(status: string): keyof typeof toneClasses {
  const value = status.toUpperCase();
  if (["CANCELLED", "NO_SHOW"].includes(value)) return "amber";
  if (["COMPLETED", "CONFIRMED"].includes(value)) return "emerald";
  if (["PENDING", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"].includes(value)) return "blue";
  return "slate";
}

function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${toneClasses[tone]}`}>
      <span className={`size-1.5 rounded-full ${tone === "emerald" ? "bg-emerald-500" : tone === "blue" ? "bg-blue-500" : tone === "amber" ? "bg-amber-500" : "bg-slate-400"}`} />
      {humanize(status)}
    </span>
  );
}

function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-900/40">
      <span className="grid size-12 place-items-center rounded-2xl bg-white text-blue-600 shadow-xs ring-1 ring-slate-200/60 dark:bg-slate-800 dark:text-blue-400 dark:ring-slate-700">
        <Icon aria-hidden className="size-6" />
      </span>
      <p className="mt-3.5 text-sm font-black text-slate-800 dark:text-slate-200">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const startsAt = new Date(appointment.startsAt);
  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-4">
        <div className="grid shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-blue-600 to-indigo-600 px-3.5 py-2.5 text-center text-white shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">
            {new Intl.DateTimeFormat("en-PK", { month: "short" }).format(startsAt)}
          </span>
          <span className="text-2xl font-black leading-none tracking-tight">
            {new Intl.DateTimeFormat("en-PK", { day: "2-digit" }).format(startsAt)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-base font-black text-slate-900 dark:text-white">
              {appointment.service?.name ?? "Hospital Consultation"}
            </span>
            <StatusPill status={appointment.status} />
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                appointment.consultationMode === "ONLINE"
                  ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400"
              }`}
            >
              {appointment.consultationMode === "ONLINE" ? <Video aria-hidden className="size-3" /> : <MapPin aria-hidden className="size-3" />}
              {appointment.consultationMode === "ONLINE" ? "Online Video" : "In Person"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
              <Clock aria-hidden className="size-3.5 text-blue-600" />
              {new Intl.DateTimeFormat("en-PK", { timeStyle: "short" }).format(startsAt)}
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin aria-hidden className="size-3.5 text-indigo-600" />
              {appointment.branch.name}
            </span>
            {appointment.doctor ? (
              <span className="inline-flex items-center gap-1 font-medium">
                <Stethoscope aria-hidden className="size-3.5 text-cyan-600" />
                {appointment.doctor.staffProfile.membership.displayName}
              </span>
            ) : null}
          </div>

          {appointment.reason ? (
            <p className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-xs font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <span className="font-bold text-slate-700 dark:text-slate-200">Reason: </span>
              {appointment.reason}
            </p>
          ) : null}

          {appointment.consultationMode === "ONLINE" && !["CANCELLED", "NO_SHOW"].includes(appointment.status) ? (
            <Link
              className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-black text-white shadow-xs transition hover:from-blue-700 hover:to-indigo-700"
              href={`/patient/appointments/${appointment.id}/video`}
            >
              <Video aria-hidden className="size-4" />
              Join Video Room
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/**
 * `toISOString` would give the UTC date, which is the wrong day for a patient
 * in Karachi booking before 05:00 local — the calendar would refuse today and
 * default to the wrong tomorrow.
 */
function localDate(offsetDays = 0) {
  const value = new Date();
  value.setDate(value.getDate() + offsetDays);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function PatientBookingWorkspace({ booking }: { booking: boolean }) {
  const [date, setDate] = useState(() => localDate(1));
  const [options, setOptions] = useState<Option[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ruleId, setRuleId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [chosenMode, setChosenMode] = useState<"IN_PERSON" | "ONLINE" | "">("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [paymentHref, setPaymentHref] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/patient/booking?date=${date}`, { cache: "no-store" });
      const body = (await response.json()) as { catalog?: { options: Option[]; slots: Slot[]; blockers?: Blocker[] }; appointments?: Appointment[]; error?: string };
      if (!response.ok || !body.catalog) throw new Error(body.error || "Appointments could not be loaded. Please try again.");
      setOptions(body.catalog.options);
      setSlots(body.catalog.slots);
      setBlockers(body.catalog.blockers ?? []);
      setAppointments(body.appointments ?? []);
      setRuleId((current) => (current && body.catalog!.options.some((option) => option.ruleId === current) ? current : body.catalog!.options[0]?.ruleId ?? ""));
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : "Appointments could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const availableSlots = useMemo(() => slots.filter((slot) => slot.ruleId === ruleId), [ruleId, slots]);
  const selectedOption = options.find((option) => option.ruleId === ruleId);
  const mode = selectedOption?.consultationModes.length === 1 ? selectedOption.consultationModes[0]! : chosenMode;
  const modeRequiresChoice = (selectedOption?.consultationModes.length ?? 0) > 1;
  const requiresPrepayment = mode === "ONLINE" && selectedOption?.requiresPrepayment === true;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slotId || !mode) return;
    setBusy(true);
    setError("");
    setMessage("");
    setPaymentHref("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/v1/patient/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // The key is generated per submit attempt, so a network retry of the
        // same click cannot create a second appointment.
        body: JSON.stringify({ slotId, mode, reason: data.get("reason"), idempotencyKey: crypto.randomUUID() }),
      });
      const body = (await response.json()) as { appointment?: { id: string; paymentStatus?: string }; error?: string };
      if (!response.ok) throw new Error(body.error || "Appointment could not be booked. Please try again.");
      const awaitingPayment = body.appointment?.paymentStatus === "AWAITING_PAYMENT" || requiresPrepayment;
      setMessage(
        awaitingPayment
          ? "Appointment reserved. Complete the payment to have it confirmed by the hospital."
          : "Appointment confirmed! Your care team can now see this booking.",
      );
      if (awaitingPayment && body.appointment?.id) setPaymentHref(`/patient/appointments/${body.appointment.id}/payment`);
      setSlotId("");
      setChosenMode("");
      form.reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : "Appointment could not be booked. Please try again.");
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
      <div className="space-y-6">
        <WonFlowPageHeader
          actions={
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-black text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700"
              href="/patient/appointments/book"
            >
              <CalendarPlus aria-hidden className="size-4" />
              Book New Appointment
            </Link>
          }
          description={upcoming.length ? `${upcoming.length} upcoming scheduled ${upcoming.length === 1 ? "visit" : "visits"}.` : "You have no upcoming hospital visits."}
          eyebrow="Patient Care Schedule"
          title="My Appointments"
        />

        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40">
            <TriangleAlert aria-hidden className="size-5 shrink-0" />
            {error}
          </div>
        ) : null}

        {([["Upcoming", upcoming], ["Previous", previous]] as const).map(([label, items]) => (
          <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900" key={label}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{label} Visits</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {items.length} {items.length === 1 ? "record" : "records"}
              </span>
            </div>

            {items.length ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {items.map((item) => (
                  <AppointmentCard appointment={item} key={item.id} />
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  action={
                    label === "Upcoming" ? (
                      <Link className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-sm" href="/patient/appointments/book">
                        <CalendarPlus className="size-4" />
                        Book Appointment
                      </Link>
                    ) : undefined
                  }
                  hint={label === "Upcoming" ? "Book a consultation to schedule your visit with a physician." : "Attended consultations will be archived here."}
                  icon={label === "Upcoming" ? CalendarDays : CalendarCheck}
                  title={`No ${label.toLowerCase()} appointments`}
                />
              </div>
            )}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" href="/patient/appointments">
            <ChevronLeft className="size-4" />
            Back to Visits
          </Link>
        }
        description="Select a doctor, preferred date, and choose an available clinic consultation slot."
        eyebrow="Online Visit Booking"
        title="Schedule a Consultation"
      />

      {message ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4.5 text-sm font-black text-emerald-800 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-emerald-600" />
          {message}
          <Link className="ml-auto inline-flex min-h-10 items-center rounded-xl bg-emerald-600 px-4 text-xs font-black text-white transition hover:bg-emerald-700" href={paymentHref || "/patient/appointments"}>
            {paymentHref ? "Pay Now" : "View My Visits"}
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4.5 text-sm font-bold text-red-700 shadow-xs dark:border-red-900/50 dark:bg-red-950/40">
          <TriangleAlert aria-hidden className="size-5 shrink-0" />
          {error}
        </div>
      ) : null}

      <form className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">1. Select Appointment Date</span>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
              min={localDate()}
              onChange={(event) => {
                setDate(event.target.value);
                setSlotId("");
              }}
              type="date"
              value={date}
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">2. Select Doctor & Specialty</span>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
              onChange={(event) => {
                setRuleId(event.target.value);
                setSlotId("");
                setChosenMode("");
              }}
              value={ruleId}
            >
              <option value="">{loading ? "Loading clinics…" : options.length ? "Select a doctor" : "No clinics available on this date"}</option>
              {options.map((option) => (
                <option key={option.ruleId} value={option.ruleId}>
                  {option.specialty ?? "Clinical Care"} · {option.doctorName} · {option.serviceName} ({option.branchName})
                </option>
              ))}
            </select>
          </label>
        </div>

        {!loading && blockers.length ? (
          <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4.5 dark:border-amber-900/50 dark:bg-amber-950/40">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
              <Info aria-hidden className="size-4 shrink-0 text-amber-600" />
              Why no times are shown
            </p>
            {blockers.map((blocker) => (
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200" key={blocker.code}>
                {blocker.message}
              </p>
            ))}
          </div>
        ) : null}

        {selectedOption ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 text-xs font-bold text-slate-700 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-slate-900 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 text-sm font-black text-slate-900 dark:text-white">
                <Stethoscope aria-hidden className="size-4 text-blue-600" />
                {selectedOption.doctorName}
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Clock aria-hidden className="size-4 text-indigo-600" />
                {selectedOption.durationMinutes} minutes consultation
              </span>
              <span className="ml-auto font-black text-sm text-indigo-700 dark:text-indigo-300">
                {selectedOption.priceMinorUnits === null ? "Fee billed by hospital" : `${selectedOption.currencyCode} ${(selectedOption.priceMinorUnits / 100).toLocaleString("en-PK")}`}
              </span>
            </div>

            {modeRequiresChoice ? (
              <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <legend className="px-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">3. Select Consultation Format</legend>
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    aria-pressed={mode === "IN_PERSON"}
                    className={`flex items-center gap-2 rounded-2xl border px-5 py-3 text-xs font-black transition ${
                      mode === "IN_PERSON"
                        ? "border-blue-600 bg-blue-600 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                    onClick={() => setChosenMode("IN_PERSON")}
                    type="button"
                  >
                    <MapPin aria-hidden className="size-4" />
                    In Person at {selectedOption.branchName}
                  </button>

                  <button
                    aria-pressed={mode === "ONLINE"}
                    className={`flex items-center gap-2 rounded-2xl border px-5 py-3 text-xs font-black transition ${
                      mode === "ONLINE"
                        ? "border-blue-600 bg-blue-600 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                    onClick={() => setChosenMode("ONLINE")}
                    type="button"
                  >
                    <Video aria-hidden className="size-4" />
                    Online Video Consultation
                  </button>
                </div>
              </fieldset>
            ) : null}

            {requiresPrepayment ? (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-600" />
                Online consultations for this service require prepayment. After booking you can upload proof of transfer for quick physician confirmation.
              </div>
            ) : null}
          </div>
        ) : null}

        <fieldset>
          <legend className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Available Time Slots</legend>
          {availableSlots.length ? (
            <div className="mt-3 flex flex-wrap gap-2.5">
              {availableSlots.map((slot) => {
                const selected = slotId === slot.id;
                return (
                  <button
                    aria-pressed={selected}
                    className={`rounded-2xl border px-4 py-2.5 text-xs font-black transition-all ${
                      !slot.available
                        ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400 line-through dark:border-slate-800 dark:bg-slate-800/40"
                        : selected
                          ? "border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-300 dark:ring-blue-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                    disabled={!slot.available}
                    key={slot.id}
                    onClick={() => setSlotId(slot.id)}
                    title={slot.available ? undefined : "This slot has already been reserved."}
                    type="button"
                  >
                    {new Intl.DateTimeFormat("en-PK", { timeStyle: "short", timeZone: slot.timezone }).format(new Date(slot.startsAt))}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
              {loading
                ? "Loading available consultation slots…"
                : ruleId
                  ? "No consultation times remain for this doctor on this date. Please select another date."
                  : options.length
                    ? "Select a doctor and date to view bookable consultation slots."
                    : blockers[0]?.message ?? "No consultation slots are available on this date. Please select another date."}
            </div>
          )}
        </fieldset>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Reason for Visit</span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
            maxLength={500}
            name="reason"
            placeholder="Briefly describe your symptoms or reason for consulting the doctor."
            required
          />
        </label>

        <button
          className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-sm font-black text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy || !slotId || !mode}
          type="submit"
        >
          {busy ? "Confirming Visit…" : !slotId ? "Select an Available Time to Continue" : !mode ? "Select Consultation Format" : "Confirm Appointment"}
        </button>
      </form>
    </div>
  );
}
