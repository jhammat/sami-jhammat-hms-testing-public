"use client";

import Link from "next/link";
import { CalendarClock, CalendarDays, Clock, MapPin, Stethoscope, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DoctorPageHeader } from "./doctor-page-header";

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  consultationMode: "IN_PERSON" | "ONLINE";
  reason: string | null;
  patient: { givenName: string; familyName: string; patientNumber: string };
  service: { name: string } | null;
  branch: { name: string; timezone: string };
}

export function LiveDoctorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/doctor/appointments", { cache: "no-store" });
      const body = await response.json() as { appointments?: Appointment[]; error?: string };
      if (!response.ok || !body.appointments) throw new Error(body.error ?? "Appointments could not be loaded.");
      setAppointments(body.appointments);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Appointments could not be loaded.");
    }
  }, []);
  useEffect(() => { queueMicrotask(() => { setNow(Date.now()); void load(); }); }, [load]);
  const upcoming = useMemo(() => appointments.filter((item) => new Date(item.endsAt).getTime() >= now && !["CANCELLED", "NO_SHOW"].includes(item.status)), [appointments, now]);
  const previous = useMemo(() => appointments.filter((item) => !upcoming.includes(item)), [appointments, upcoming]);

  return <div className="space-y-4">
    <DoctorPageHeader
      description="In-person and online consultations booked against your live schedule."
      icon={<CalendarDays size={18} />}
      title="My appointments"
    />
    {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
    {([ ["Upcoming", upcoming], ["Previous", previous] ] as const).map(([label, items]) => <section className="overflow-hidden rounded-[22px] border border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/40 shadow-[0_16px_42px_rgba(79,70,229,0.12)]" key={label}><header className="relative flex flex-wrap items-center justify-between gap-2 overflow-hidden bg-gradient-to-r from-indigo-100 via-violet-50 to-cyan-100 px-4 py-3"><div className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-cyan-300/30 blur-2xl" /><div className="relative flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20"><CalendarClock size={15} /></span><div><h2 className="text-[11px] font-black text-slate-950">{label} appointments</h2><p className="text-[9px] text-slate-500">{items.length} {items.length === 1 ? "appointment" : "appointments"}</p></div></div></header><div className="p-4">{items.length ? <div className="grid gap-3 xl:grid-cols-2">{items.map((appointment) => <article className="rounded-2xl border border-indigo-100/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md" key={appointment.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-slate-900">{appointment.patient.givenName} {appointment.patient.familyName}</h3><p className="text-xs font-semibold text-slate-500">{appointment.patient.patientNumber} · {appointment.service?.name ?? "Consultation"}</p></div><span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-indigo-700">{appointment.status.replaceAll("_", " ")}</span></div><div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><Clock className="size-3.5 text-indigo-500" />{new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: appointment.branch.timezone }).format(new Date(appointment.startsAt))}</span><span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-indigo-500" />{appointment.consultationMode === "ONLINE" ? "Online" : appointment.branch.name}</span></div>{appointment.reason ? <p className="mt-3 text-sm text-slate-600">{appointment.reason}</p> : null}<div className="mt-4 flex flex-wrap gap-2">{appointment.consultationMode === "ONLINE" && !["CANCELLED", "NO_SHOW"].includes(appointment.status) ? <Link className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5" href={`/doctor/appointments/${appointment.id}/video`}><Video className="size-4" />Open video consultation</Link> : <Link className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-50" href="/doctor/consultations"><Stethoscope className="size-4" />Open clinical workspace</Link>}</div></article>)}</div> : <p className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-8 text-center text-sm font-semibold text-slate-500">No {label.toLowerCase()} appointments.</p>}</div></section>)}
  </div>;
}
