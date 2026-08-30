"use client";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

import { WonFlowPageHeader } from "@/components/workspace";
import { todayLocalDate } from "@/lib/time/local-date";

interface Appointment { id: string; startsAt: string; endsAt: string; status: string; reason: string | null; source: string; patient: { patientNumber: string; givenName: string; middleName: string | null; familyName: string; phone: string | null }; branch: { name: string; timezone: string }; service: { name: string } | null; doctor: { staffProfile: { membership: { displayName: string } } } | null; queueEntry: { tokenNumber: number; status: string } | null }

export function ReceptionAppointmentsWorkspace() {
  const [date, setDate] = useState(() => todayLocalDate());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/reception/appointments?date=${date}`, { cache: "no-store" });
      const body = await response.json() as { appointments?: Appointment[]; error?: string };
      if (!response.ok) throw new Error(body.error);
      setAppointments(body.appointments ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Appointments could not be loaded.");
    }
  }, [date]);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  return (
    <div className="space-y-5">
      <WonFlowPageHeader
        actions={
          <label className="relative block">
            <span className="sr-only">Appointment date</span>
            <input
              className="h-11 rounded-xl border border-indigo-200 bg-white px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>
        }
        breadcrumbs={[{ label: "Hospital Operations", href: "/operations" }, { label: "Appointments" }]}
        description="Patient and reception bookings update here from the shared schedule."
        eyebrow="Reception"
        leading={<CalendarDays aria-hidden="true" size={20} />}
        title="Appointments"
      />

      {error ? <div className="rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</div> : null}

      <section className="overflow-hidden rounded-[22px] border border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/40 shadow-[0_16px_42px_rgba(79,70,229,0.12)]">
        <header className="relative flex flex-wrap items-center justify-between gap-2 overflow-hidden bg-gradient-to-r from-indigo-100 via-violet-50 to-cyan-100 px-4 py-3">
          <div className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-cyan-300/30 blur-2xl" />
          <div className="relative flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
              <CalendarDays size={15} />
            </span>
            <h2 className="text-[13px] font-black text-slate-950">{appointments.length} scheduled visits</h2>
          </div>
        </header>

        {appointments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Service</th>
                  <th className="p-4">Doctor</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="p-4 font-black">{new Intl.DateTimeFormat("en-PK", { timeStyle: "short", timeZone: appointment.branch.timezone }).format(new Date(appointment.startsAt))}</td>
                    <td className="p-4">
                      <div className="font-black">{[appointment.patient.givenName, appointment.patient.middleName, appointment.patient.familyName].filter(Boolean).join(" ")}</div>
                      <div className="text-xs text-slate-500">{appointment.patient.patientNumber} · {appointment.patient.phone ?? "No phone"}</div>
                    </td>
                    <td className="p-4">{appointment.service?.name ?? "Hospital visit"}</td>
                    <td className="p-4">{appointment.doctor?.staffProfile.membership.displayName ?? "Care team"}</td>
                    <td className="p-4">{appointment.branch.name}</td>
                    <td className="p-4"><span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-indigo-700">{appointment.status.replaceAll("_", " ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-12 text-center text-sm font-semibold text-slate-500">No appointments for this date.</p>
        )}
      </section>
    </div>
  );
}
