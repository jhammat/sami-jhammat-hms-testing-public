"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Loader2, MapPin, Stethoscope, TriangleAlert, User, Video } from "lucide-react";
import { todayLocalDate } from "@/lib/time/local-date";

interface DoctorOption {
  id: string;
  displayName: string;
  specialty: string | null;
}

interface SlotOption {
  id: string;
  ruleId: string;
  branchId: string;
  branchName: string;
  doctorId: string;
  doctorName: string;
  serviceId: string;
  serviceName: string;
  consultationModes: ("IN_PERSON" | "ONLINE")[];
  requiresPrepayment: boolean;
  startsAt: string;
  endsAt: string;
  available: boolean;
}

function todayIsoDate(): string {
  return todayLocalDate();
}

function formatSlotTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatSlotDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function PublicRegistrationForm({
  tenantSlug,
  organizationName,
  doctors,
  initialDoctorId,
}: {
  tenantSlug: string;
  organizationName: string;
  doctors: DoctorOption[];
  initialDoctorId?: string;
}) {
  const lockedDoctor = doctors.find((doctor) => doctor.id === initialDoctorId);
  const [doctorId, setDoctorId] = useState(lockedDoctor?.id ?? (doctors.length === 1 ? doctors[0]!.id : ""));
  const [date, setDate] = useState(todayIsoDate());
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | undefined>();
  const [mode, setMode] = useState<"IN_PERSON" | "ONLINE" | "">("");

  const [form, setForm] = useState({ givenName: "", familyName: "", phone: "", email: "", password: "", dateOfBirth: "", sex: "", city: "", reason: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ doctorName: string; branchName: string; startsAt: string; mode: "IN_PERSON" | "ONLINE"; requiresPrepayment: boolean } | undefined>();

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setSlotsLoading(true);
      setSlotsError("");
      setSelectedSlot(undefined);
      setMode("");
      if (!doctorId) { setSlots([]); setSlotsLoading(false); return; }
      try {
        const response = await fetch(`/api/v1/public-registration/${encodeURIComponent(tenantSlug)}/slots?date=${date}&doctorId=${encodeURIComponent(doctorId)}`, { signal: controller.signal });
        const body = await response.json() as { slots?: SlotOption[]; error?: string };
        if (!response.ok) { setSlotsError(body.error ?? "Appointment times could not be loaded."); setSlots([]); return; }
        setSlots(body.slots ?? []);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setSlotsError("Appointment times could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setSlotsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [tenantSlug, doctorId, date]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!selectedSlot) { setError("Choose an appointment time."); return; }
    if (!mode) { setError("Choose whether this is an in-person or online consultation."); return; }
    if (form.givenName.trim().length < 2 || form.familyName.trim().length < 2) { setError("Enter your full name."); return; }
    if (form.phone.trim().length < 7) { setError("Enter a valid mobile number."); return; }
    if (!form.email.trim().includes("@")) { setError("Enter a valid email address."); return; }
    if (form.password.length < 12) { setError("Password must be at least 12 characters, with uppercase, lowercase and a number."); return; }
    if (!form.dateOfBirth) { setError("Enter your date of birth."); return; }
    if (!form.sex) { setError("Select your sex."); return; }
    if (!form.city.trim()) { setError("Enter your city."); return; }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/public-registration/${encodeURIComponent(tenantSlug)}/book`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          mode,
          givenName: form.givenName.trim(),
          familyName: form.familyName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          password: form.password,
          dateOfBirth: form.dateOfBirth,
          sex: form.sex,
          city: form.city.trim(),
          reason: form.reason.trim() || undefined,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const body = await response.json() as { appointment?: { startsAt: string; doctor?: { staffProfile?: { membership?: { displayName?: string } } }; branch?: { name?: string } }; error?: string };
      if (!response.ok || !body.appointment) {
        setError(body.error ?? "This appointment could not be booked.");
        return;
      }
      setConfirmed({
        doctorName: body.appointment.doctor?.staffProfile?.membership?.displayName ?? selectedSlot.doctorName,
        branchName: body.appointment.branch?.name ?? selectedSlot.branchName,
        startsAt: body.appointment.startsAt,
        mode,
        requiresPrepayment: mode === "ONLINE" && selectedSlot.requiresPrepayment,
      });
    } catch {
      setError("This appointment could not be booked. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 size={32} />
        </span>
        <h1 className="text-2xl font-black text-slate-950">Confirm your email</h1>
        <p className="text-sm text-slate-600">
          {formatSlotDate(confirmed.startsAt.slice(0, 10))} at {formatSlotTime(confirmed.startsAt)} with {confirmed.doctorName}
          {confirmed.mode === "IN_PERSON" ? ` — ${confirmed.branchName}.` : " — online video consultation."}
        </p>
        <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800">
          We&apos;ve sent a verification link to your email. Your account and this booking are held until you click it — after that:
        </p>
        {confirmed.mode === "IN_PERSON" ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            Report to reception at {confirmed.branchName} 15 minutes before {formatSlotTime(confirmed.startsAt)} on {formatSlotDate(confirmed.startsAt.slice(0, 10))}. Bring your CNIC.
          </p>
        ) : confirmed.requiresPrepayment ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            Send payment to the account shown in your patient portal and upload your payment screenshot — your booking is confirmed once the doctor verifies payment.
          </p>
        ) : (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            The clinic will confirm this shortly. Keep your phone reachable on the number you entered.
          </p>
        )}
        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-700 hover:bg-indigo-100"
          href="/patient"
        >
          Get the WonFlow app to track this appointment
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-lg space-y-5">
        <header className="rounded-3xl bg-gradient-to-r from-indigo-700 to-blue-700 p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-200">{organizationName}</p>
          <h1 className="mt-1 text-2xl font-black">Book an appointment</h1>
          <p className="mt-1 text-sm text-indigo-100">No account needed — we&apos;ll confirm your visit by phone.</p>
        </header>

        <form className="space-y-5" onSubmit={submit}>
          {!lockedDoctor && doctors.length > 1 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
                <span className="flex items-center gap-1.5"><Stethoscope size={14} /> Doctor</span>
                <select className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" onChange={(event) => setDoctorId(event.target.value)} required value={doctorId}>
                  <option value="">Select a doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.displayName}{doctor.specialty ? ` · ${doctor.specialty}` : ""}</option>
                  ))}
                </select>
              </label>
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500"><Stethoscope size={14} /> Doctor</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{lockedDoctor?.displayName ?? doctors[0]?.displayName}</p>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
              <span className="flex items-center gap-1.5"><CalendarDays size={14} /> Date</span>
              <input className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" min={todayIsoDate()} onChange={(event) => setDate(event.target.value)} type="date" value={date} />
            </label>

            <div className="mt-3">
              {slotsLoading ? (
                <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="animate-spin" size={14} /> Loading available times…</p>
              ) : slotsError ? (
                <p className="text-xs font-semibold text-red-700">{slotsError}</p>
              ) : slots.length === 0 ? (
                <p className="text-xs text-slate-500">{doctorId ? "No clinic scheduled this day. Try another date." : "Choose a doctor to see available times."}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot) => (
                    <button
                      className={`min-h-11 rounded-xl border px-2 text-xs font-bold transition ${
                        !slot.available
                          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 line-through"
                          : selectedSlot?.id === slot.id
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                      }`}
                      disabled={!slot.available}
                      key={slot.id}
                      onClick={() => { setSelectedSlot(slot); setMode(slot.consultationModes.length === 1 ? slot.consultationModes[0]! : ""); }}
                      title={slot.available ? undefined : "This time is already booked."}
                      type="button"
                    >
                      {formatSlotTime(slot.startsAt)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSlot ? (
              <>
                <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800">
                  <MapPin size={14} /> {selectedSlot.branchName} · {selectedSlot.serviceName}
                </p>

                {selectedSlot.consultationModes.length > 1 ? (
                  <div className="mt-3">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">How would you like this consultation?</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        aria-pressed={mode === "IN_PERSON"}
                        className={`min-h-11 rounded-xl border px-2 text-xs font-bold transition ${mode === "IN_PERSON" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"}`}
                        onClick={() => setMode("IN_PERSON")}
                        type="button"
                      >
                        <MapPin size={13} className="mr-1 inline" /> In person
                      </button>
                      <button
                        aria-pressed={mode === "ONLINE"}
                        className={`min-h-11 rounded-xl border px-2 text-xs font-bold transition ${mode === "ONLINE" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"}`}
                        onClick={() => setMode("ONLINE")}
                        type="button"
                      >
                        <Video size={13} className="mr-1 inline" /> Online video
                      </button>
                    </div>
                  </div>
                ) : null}

                {mode === "ONLINE" && selectedSlot.requiresPrepayment ? (
                  <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                    Payment is required before this appointment is confirmed. You will transfer payment and upload proof after booking; the doctor confirms it before your visit.
                  </p>
                ) : null}
              </>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500"><User size={14} /> Your details</p>
            <p className="mt-1 text-[11px] text-slate-500">This creates your WonFlow patient account, used to track this and future visits.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-slate-700">Given name
                <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" onChange={(event) => setForm({ ...form, givenName: event.target.value })} required value={form.givenName} />
              </label>
              <label className="block text-xs font-bold text-slate-700">Family name
                <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" onChange={(event) => setForm({ ...form, familyName: event.target.value })} required value={form.familyName} />
              </label>
              <label className="col-span-2 block text-xs font-bold text-slate-700">Mobile number
                <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" onChange={(event) => setForm({ ...form, phone: event.target.value })} required type="tel" value={form.phone} />
                <span className="mt-1 block text-[10px] font-medium text-slate-400">Used for WhatsApp reminders, even though you sign in with email.</span>
              </label>
              <label className="col-span-2 block text-xs font-bold text-slate-700">Email
                <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" onChange={(event) => setForm({ ...form, email: event.target.value })} required type="email" value={form.email} />
              </label>
              <label className="col-span-2 block text-xs font-bold text-slate-700">Password
                <input autoComplete="new-password" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" minLength={12} onChange={(event) => setForm({ ...form, password: event.target.value })} required type="password" value={form.password} />
                <span className="mt-1 block text-[10px] font-medium text-slate-400">At least 12 characters, with uppercase, lowercase and a number.</span>
              </label>
              <label className="block text-xs font-bold text-slate-700">Date of birth
                <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" max={todayIsoDate()} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} required type="date" value={form.dateOfBirth} />
              </label>
              <label className="block text-xs font-bold text-slate-700">Sex
                <select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" onChange={(event) => setForm({ ...form, sex: event.target.value })} required value={form.sex}>
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="col-span-2 block text-xs font-bold text-slate-700">City
                <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" onChange={(event) => setForm({ ...form, city: event.target.value })} required value={form.city} />
              </label>
              <label className="col-span-2 block text-xs font-bold text-slate-700">Reason for visit (optional)
                <textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(event) => setForm({ ...form, reason: event.target.value })} rows={2} value={form.reason} />
              </label>
            </div>
          </section>

          {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p> : null}

          <button className="min-h-12 w-full rounded-xl bg-indigo-700 text-sm font-black text-white disabled:opacity-50" disabled={submitting || !selectedSlot || !mode} type="submit">
            {submitting ? "Requesting…" : "Request this appointment"}
          </button>
        </form>
      </div>
    </main>
  );
}
