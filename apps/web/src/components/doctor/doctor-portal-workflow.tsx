"use client";

import type {
  PracticeLocation,
} from "@wonflow/contracts";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileClock,
  HeartPulse,
  ListFilter,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Square,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { readDemoClinicalEncounters } from "@/lib/clinical";
import {
  deleteDemoDoctorSchedule,
  saveDemoDoctorSchedule,
  setDemoDoctorScheduleActive,
} from "@/lib/doctor-schedules";
import type {
  DemoDoctorSchedule,
  DemoDoctorScheduleDay,
} from "@/lib/doctor-schedules";
import {
  saveDemoDoctorSitting,
  updateDemoDoctorSittingStatus,
  persistDoctorSitting,
  persistDoctorSittingStatus,
  useSittingBranch,
} from "@/lib/doctor-sittings";
import type { DemoDoctorSitting } from "@/lib/doctor-sittings";
import {
  calculateDemoQueueWaitMinutes,
  addCustomConsultationRoom,
  QUEUE_ROOMS_CHANGED_EVENT,
  QUEUE_ROOM_OPTIONS,
  readQueueRoomOptions,
  syncDemoDoctorSittingToQueueEntries,
} from "@/lib/queue";
import type { DemoQueueEntry, DemoQueuePriority, DemoQueueStatus } from "@/lib/queue";

import { DoctorConsultationFeeCard } from "./doctor-consultation-fee-card";
import { DoctorPageHeader } from "./doctor-page-header";
import { DoctorProfileAvatar } from "./doctor-profile-avatar";
import { useDoctorPortalContext } from "./doctor-portal-shell";
import type { DoctorPortalIdentity } from "./doctor-portal-shell";

import type {
  PracticeLocationSelection,
} from "@/components/shell";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const fieldClass =
  "h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const buttonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-[10px] font-black transition focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-45";

function useConsultationRooms() {
  const [rooms, setRooms] = useState(() => [...QUEUE_ROOM_OPTIONS].filter((room) => room.category === "consultation"));
  useEffect(() => {
    const reloadRooms = () => setRooms(readQueueRoomOptions().filter((room) => room.category === "consultation"));
    queueMicrotask(reloadRooms);
    window.addEventListener(QUEUE_ROOMS_CHANGED_EVENT, reloadRooms);
    window.addEventListener("storage", reloadRooms);
    return () => {
      window.removeEventListener(QUEUE_ROOMS_CHANGED_EVENT, reloadRooms);
      window.removeEventListener("storage", reloadRooms);
    };
  }, []);
  return rooms;
}

interface DoctorScheduleLocation { id: string; name: string; custom: boolean }
const CUSTOM_DOCTOR_LOCATIONS_KEY = "wonflow-doctor-custom-locations";
const CUSTOM_DOCTOR_LOCATIONS_EVENT = "wonflow:doctor-custom-locations-changed";

function readCustomDoctorLocations(): DoctorScheduleLocation[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(CUSTOM_DOCTOR_LOCATIONS_KEY) ?? "[]") as DoctorScheduleLocation[];
    return value.filter((location) => location.id && location.name && location.custom);
  } catch { return []; }
}

function addCustomDoctorLocation(nameInput: string): DoctorScheduleLocation {
  const name = nameInput.trim();
  if (name.length < 2) throw new Error("Enter a clinic or location name.");
  const locations = readCustomDoctorLocations();
  const existing = locations.find((location) => location.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const location = { id: `external-clinic-${crypto.randomUUID()}`, name, custom: true };
  window.localStorage.setItem(CUSTOM_DOCTOR_LOCATIONS_KEY, JSON.stringify([...locations, location]));
  window.dispatchEvent(new Event(CUSTOM_DOCTOR_LOCATIONS_EVENT));
  return location;
}

function useDoctorScheduleLocations(branches: { id: string; name: string }[]) {
  const [customLocations, setCustomLocations] = useState<DoctorScheduleLocation[]>([]);
  useEffect(() => {
    const reload = () => setCustomLocations(readCustomDoctorLocations());
    queueMicrotask(reload);
    window.addEventListener(CUSTOM_DOCTOR_LOCATIONS_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(CUSTOM_DOCTOR_LOCATIONS_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);
  return [...branches.map((branch) => ({ ...branch, custom: false })), ...customLocations];
}

export interface DoctorWorkflowModel {
  doctor: DoctorPortalIdentity;
  doctors: readonly DoctorPortalIdentity[];
  location?: PracticeLocation;
  locations: readonly PracticeLocation[];
  locationSelection: PracticeLocationSelection;
  legacyBranchId?: string;
  doctorId: string;
  businessDate: string;
  sitting?: DemoDoctorSitting;
  schedules: readonly DemoDoctorSchedule[];
  entries: readonly DemoQueueEntry[];
  activeEntries: readonly DemoQueueEntry[];
  message?: string;
  setDoctorId(value: string): void;
  setBusinessDate(value: string): void;
  setMessage(value?: string): void;
  reload(): void;
  callPatient(entry: DemoQueueEntry): void;
  startConsultation(entry: DemoQueueEntry): void;
  finishConsultation(entry: DemoQueueEntry): void;
  skipPatient(entry: DemoQueueEntry): void;
  returnPatient(entry: DemoQueueEntry): void;
}

function locationEmptyDescription(
  model: DoctorWorkflowModel,
): string {
  return model.location !== undefined &&
    model.location.linkedBranchId === undefined
    ? "This worklist has no branch-linked demo records for the selected external location."
    : "No items at this location";
}

function getPatientName(entry: DemoQueueEntry): string {
  return entry.snapshot?.patient.displayName ?? "Patient record unavailable";
}

function getMrNumber(entry: DemoQueueEntry): string {
  return entry.snapshot?.patient.mrNumber ?? entry.patientId;
}

function getReason(entry: DemoQueueEntry): string {
  return (
    entry.snapshot?.visit.reasonForVisit || entry.notes || entry.serviceName
  );
}

function formatBusinessDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Message({ value }: { value?: string }) {
  if (value === undefined) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-900">
      <Bell className="mt-0.5 shrink-0" size={14} />
      <span>{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const style =
    status === "available" || status === "completed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "on-break" || status === "waiting" || status === "called"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : status === "urgent" || status === "serving"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wide ${style}`}>
      {status.replaceAll("-", " ")}
    </span>
  );
}

function EmptyState({
  icon: Icon = UserRound,
  title,
  description,
}: {
  icon?: typeof UserRound;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative grid min-h-32 place-items-center overflow-hidden rounded-[20px] border border-dashed border-indigo-200 bg-gradient-to-br from-white via-indigo-50/55 to-cyan-50/70 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-violet-200/35 blur-2xl" />
      <div className="relative">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.25)] transition group-hover:scale-105">
          <Icon size={18} />
        </span>
        <h3 className="mt-2 text-xs font-black text-slate-900">{title}</h3>
        <p className="mt-1 max-w-sm text-[10px] leading-4 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function PortalFilters({ model }: { model: DoctorWorkflowModel }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-[9px] font-black uppercase tracking-wide text-slate-500">
        Doctor
        <select
          className={fieldClass}
          onChange={(event) => model.setDoctorId(event.target.value)}
          value={model.doctorId}
        >
          {model.doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="text-[9px] font-black uppercase tracking-wide text-slate-500">
        Business date
        <input
          className={fieldClass}
          onChange={(event) => model.setBusinessDate(event.target.value)}
          type="date"
          value={model.businessDate}
        />
      </label>
    </div>
  );
}

function SittingControls({ model }: { model: DoctorWorkflowModel }) {
  const rooms = useConsultationRooms();
  const { resolvedBranchId: sittingBranchId } = useSittingBranch(model.legacyBranchId);
  const [roomId, setRoomId] = useState(model.sitting?.roomId ?? "");
  const [addingRoom, setAddingRoom] = useState(false);
  const [customRoomName, setCustomRoomName] = useState("");
  const [startTime, setStartTime] = useState(
    model.sitting?.sittingStartTime ?? "09:00",
  );
  const [endTime, setEndTime] = useState(
    model.sitting?.sittingEndTime ?? "17:00",
  );
  const [minutes, setMinutes] = useState(
    String(model.sitting?.averageConsultationMinutes ?? 15),
  );

  useEffect(() => {
    queueMicrotask(() => {
      setRoomId(model.sitting?.roomId ?? "");
      setStartTime(model.sitting?.sittingStartTime ?? "09:00");
      setEndTime(model.sitting?.sittingEndTime ?? "17:00");
      setMinutes(String(model.sitting?.averageConsultationMinutes ?? 15));
    });
  }, [model.sitting]);

  function save(startNow = false, overrideEndTime = endTime): void {
    const room = rooms.find(
      (item) => item.id === roomId && item.category === "consultation",
    );
    const duration = Number(minutes);

    if (room === undefined) {
      model.setMessage("Select an available consultation room.");
      return;
    }
    if (sittingBranchId === undefined) {
      model.setMessage(
        "No hospital branch is available for your account. Ask an administrator to assign you to a branch.",
      );
      return;
    }
    if (startTime >= overrideEndTime) {
      model.setMessage("Planned start time must be before end time.");
      return;
    }
    if (!Number.isInteger(duration) || duration < 5 || duration > 120) {
      model.setMessage(
        "Average consultation time must be between 5 and 120 minutes.",
      );
      return;
    }

    const sitting = saveDemoDoctorSitting({
      practitionerId: model.doctor.id,
      branchId: sittingBranchId,
      businessDate: model.businessDate,
      roomId,
      roomLabel: room.label,
      sittingStartTime: startTime,
      sittingEndTime: overrideEndTime,
      averageConsultationMinutes: duration,
      status: startNow
        ? "available"
        : (model.sitting?.status ?? "not-started"),
    });
    const updated = syncDemoDoctorSittingToQueueEntries(sitting);
    model.reload();
    model.setMessage(
      startNow
        ? `Sitting started in ${room.label}.`
        : `${room.label} saved. ${updated} active queue patient${updated === 1 ? "" : "s"} updated.`,
    );

    // Publish to the tenant database so reception and the patient portal book
    // against these hours instead of the hospital roster.
    void persistDoctorSitting({
      localId: sitting.id,
      branchId: sitting.branchId,
      businessDate: sitting.businessDate,
      sittingStartTime: sitting.sittingStartTime,
      sittingEndTime: sitting.sittingEndTime,
      averageConsultationMinutes: sitting.averageConsultationMinutes,
      roomLabel: sitting.roomLabel,
      status: sitting.status,
    }).then((failure) => {
      if (failure) model.setMessage(failure);
    });
  }

  function changeStatus(status: "available" | "on-break" | "finished"): void {
    if (model.sitting === undefined) {
      model.setMessage("Save the sitting configuration first.");
      return;
    }
    const sitting = updateDemoDoctorSittingStatus(model.sitting.id, status);
    if (sitting !== undefined) syncDemoDoctorSittingToQueueEntries(sitting);
    model.reload();
    model.setMessage(
      status === "available"
        ? "The sitting is active and the doctor is available."
        : status === "on-break"
          ? "The sitting is paused. Waiting patients remain in the queue."
          : "The sitting has ended for this business date.",
    );

    if (sitting !== undefined) {
      void persistDoctorSittingStatus(sitting.id, status).then((failure) => {
        if (failure) model.setMessage(failure);
      });
    }
  }

  function extendTime(): void {
    const [hour, minute] = endTime.split(":").map(Number);
    const total = Math.min(23 * 60 + 59, hour * 60 + minute + 30);
    const extended = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    setEndTime(extended);
    save(false, extended);
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/40 shadow-[0_16px_42px_rgba(79,70,229,0.12)]">
      <header className="relative flex flex-wrap items-center justify-between gap-2 overflow-hidden bg-gradient-to-r from-indigo-100 via-violet-50 to-cyan-100 px-4 py-3">
        <div className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-cyan-300/30 blur-2xl" />
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
            <Stethoscope size={15} />
          </span>
          <div>
            <h2 className="text-[11px] font-black text-slate-950">
              Daily Sitting Controls
            </h2>
            <p className="text-[9px] text-slate-500">
              Room changes update every active assigned patient.
            </p>
          </div>
        </div>
        <StatusPill status={model.sitting?.status ?? "not-started"} />
      </header>

      <div className="p-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-[9px] font-black uppercase text-slate-500">
            Consultation room
            <select
              className={fieldClass}
              onChange={(event) => {
                if (event.target.value === "__custom__") {
                  setAddingRoom(true);
                  return;
                }
                setRoomId(event.target.value);
              }}
              value={roomId}
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.label}
                </option>
              ))}
              <option value="__custom__">+ Add a custom room</option>
            </select>
          </label>
          <label className="text-[9px] font-black uppercase text-slate-500">
            Planned start
            <input
              className={fieldClass}
              onChange={(event) => setStartTime(event.target.value)}
              type="time"
              value={startTime}
            />
          </label>
          <label className="text-[9px] font-black uppercase text-slate-500">
            Planned end
            <input
              className={fieldClass}
              onChange={(event) => setEndTime(event.target.value)}
              type="time"
              value={endTime}
            />
          </label>
          <label className="text-[9px] font-black uppercase text-slate-500">
            Average minutes
            <input
              className={fieldClass}
              max={120}
              min={5}
              onChange={(event) => setMinutes(event.target.value)}
              type="number"
              value={minutes}
            />
          </label>
        </div>

        {addingRoom ? (
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <label className="min-w-56 flex-1 text-[9px] font-black uppercase text-slate-500">New consultation room<input autoFocus className={fieldClass} onChange={(event) => setCustomRoomName(event.target.value)} placeholder="e.g. Consultation Room 7" value={customRoomName} /></label>
            <button className={`${buttonClass} bg-indigo-600 text-white`} onClick={() => { try { const room = addCustomConsultationRoom(customRoomName); setRoomId(room.id); setCustomRoomName(""); setAddingRoom(false); model.setMessage(`${room.label} was added to hospital rooms.`); } catch (caught) { model.setMessage(caught instanceof Error ? caught.message : "Unable to add room."); } }} type="button"><Plus size={13} /> Add room</button>
            <button className={`${buttonClass} bg-white text-slate-600`} onClick={() => setAddingRoom(false)} type="button">Cancel</button>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
            onClick={() => save(false)}
            type="button"
          >
            Save / Change Room
          </button>
          {model.sitting === undefined ||
          model.sitting.status === "not-started" ||
          model.sitting.status === "finished" ? (
            <button
              className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
              onClick={() => save(true)}
              type="button"
            >
              <Play size={13} /> Start Sitting
            </button>
          ) : null}
          {model.sitting?.status === "available" ? (
            <button
              className={`${buttonClass} bg-amber-500 text-white hover:bg-amber-600`}
              onClick={() => changeStatus("on-break")}
              type="button"
            >
              <Pause size={13} /> Take Break
            </button>
          ) : null}
          {model.sitting?.status === "on-break" ? (
            <button
              className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
              onClick={() => changeStatus("available")}
              type="button"
            >
              <Play size={13} /> Resume
            </button>
          ) : null}
          {model.sitting !== undefined &&
          !["not-started", "finished"].includes(model.sitting.status) ? (
            <>
              <button
                className={`${buttonClass} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
                onClick={extendTime}
                type="button"
              >
                <Clock3 size={13} /> Extend 30 min
              </button>
              <button
                className={`${buttonClass} bg-rose-50 text-rose-700 hover:bg-rose-100`}
                onClick={() => changeStatus("finished")}
                type="button"
              >
                <Square size={13} /> End Sitting
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

interface PatientCardProps {
  entry: DemoQueueEntry;
  model: DoctorWorkflowModel;
  compact?: boolean;
  primary?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

function PatientCard({
  entry,
  model,
  compact = false,
  primary = false,
  selected = false,
  onSelect,
}: PatientCardProps) {
  const encounter = readDemoClinicalEncounters().find(
    (item) => item.queueEntryId === entry.id && item.status !== "cancelled",
  );
  const urgent = entry.priority === "urgent" || entry.priority === "emergency";

  return (
    <article
      className={[
          "group relative isolate overflow-hidden rounded-[20px] border bg-gradient-to-br from-white via-white to-indigo-50/45 transition duration-300",
        selected
          ? "border-indigo-300 shadow-[0_14px_34px_rgba(79,70,229,0.16)] ring-2 ring-indigo-100"
          : urgent
            ? "border-rose-200"
            : "border-slate-200/80 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_14px_34px_rgba(79,70,229,0.10)]",
        compact ? "p-2.5" : "p-3",
      ].join(" ")}
    >
      <button
        className="flex w-full items-start gap-3 text-left"
        onClick={onSelect}
        type="button"
      >
        <DoctorProfileAvatar
          className="h-10 w-10 shrink-0 rounded-xl text-xs"
          name={getPatientName(entry)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-black text-indigo-700">
              {entry.tokenNumber}
            </span>
            <StatusPill status={entry.status} />
          </div>
          <h3 className="mt-0.5 truncate text-[11px] font-black text-slate-950">
            {getPatientName(entry)}
          </h3>
          <p className="mt-0.5 text-[9px] font-semibold text-slate-500">
            {getMrNumber(entry)} · {entry.snapshot?.patient.ageYears ?? "—"}y ·{" "}
            {entry.snapshot?.patient.gender ?? "—"}
          </p>
        </div>
      </button>

      <p className="mt-2 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-700">
        {getReason(entry)}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-semibold text-slate-500">
        <span className="rounded-lg bg-slate-50 px-2 py-1">
          {calculateDemoQueueWaitMinutes(entry)} min wait
        </span>
        <span className="rounded-lg bg-slate-50 px-2 py-1">
          {entry.roomLabel ?? "Room pending"}
        </span>
        <StatusPill status={entry.priority} />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {entry.status === "waiting" ? (
          <button
            className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
            onClick={() => model.callPatient(entry)}
            type="button"
          >
            {primary ? "Call Next" : "Call Patient"}
          </button>
        ) : null}
        {entry.status === "waiting" || entry.status === "called" ? (
          <button
            className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
            onClick={() => model.startConsultation(entry)}
            type="button"
          >
            Start Consultation
          </button>
        ) : null}
        {entry.status === "serving" && encounter !== undefined ? (
          <Link
            className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
            href={`/doctor/encounters/${encounter.id}`}
          >
            Continue Consultation
          </Link>
        ) : null}
        {entry.status === "serving" ? (
          <button
            className={`${buttonClass} bg-rose-50 text-rose-700 hover:bg-rose-100`}
            onClick={() => model.finishConsultation(entry)}
            type="button"
          >
            Finish Consultation
          </button>
        ) : null}
        {entry.status === "called" ? (
          <button
            className={`${buttonClass} bg-amber-50 text-amber-700 hover:bg-amber-100`}
            onClick={() => model.skipPatient(entry)}
            type="button"
          >
            Skip
          </button>
        ) : null}
        {entry.status === "skipped" ? (
          <button
            className={`${buttonClass} bg-slate-100 text-slate-700 hover:bg-slate-200`}
            onClick={() => model.returnPatient(entry)}
            type="button"
          >
            Return to Queue
          </button>
        ) : null}
        <Link
          className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          href={`/doctor/consultations?queueEntryId=${entry.id}`}
        >
          Open Patient
        </Link>
      </div>
    </article>
  );
}

function MetricCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "indigo" | "amber" | "rose" | "emerald" | "cyan";
  icon: typeof Bell;
}) {
  const styles = {
    indigo: "from-indigo-500 to-violet-600 text-white shadow-indigo-500/25",
    amber: "from-amber-400 to-orange-500 text-white shadow-amber-500/25",
    rose: "from-rose-500 to-pink-600 text-white shadow-rose-500/25",
    emerald: "from-emerald-500 to-teal-600 text-white shadow-emerald-500/25",
    cyan: "from-cyan-500 to-blue-600 text-white shadow-cyan-500/25",
  } as const;
  return (
    <div className="group relative overflow-hidden rounded-[18px] border border-white/80 bg-gradient-to-br from-white via-white to-indigo-50 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.08)] ring-1 ring-indigo-100 transition hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(79,70,229,0.16)]">
      <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-indigo-100/60 blur-xl" />
      <div className="flex items-center gap-2.5">
      <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br shadow-lg ${styles[tone]}`}>
        <Icon size={16} />
      </span>
      <div>
        <p className="text-lg font-black leading-none text-slate-950">{value}</p>
        <p className="mt-1 text-[8px] font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>
      </div>
    </div>
  );
}

function QueueMetrics({ entries }: { entries: readonly DemoQueueEntry[] }) {
  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <MetricCard
        icon={Clock3}
        label="Waiting"
        tone="amber"
        value={entries.filter((entry) => entry.status === "waiting").length}
      />
      <MetricCard
        icon={Bell}
        label="Called"
        tone="indigo"
        value={entries.filter((entry) => entry.status === "called").length}
      />
      <MetricCard
        icon={Stethoscope}
        label="In Consultation"
        tone="cyan"
        value={entries.filter((entry) => entry.status === "serving").length}
      />
      <MetricCard
        icon={AlertTriangle}
        label="Urgent"
        tone="rose"
        value={
          entries.filter(
            (entry) =>
              (entry.priority === "urgent" || entry.priority === "emergency") &&
              !["completed", "cancelled"].includes(entry.status),
          ).length
        }
      />
      <MetricCard
        icon={CheckCircle2}
        label="Completed Today"
        tone="emerald"
        value={entries.filter((entry) => entry.status === "completed").length}
      />
    </section>
  );
}

function CurrentConsultation({
  entry,
  model,
}: {
  entry?: DemoQueueEntry;
  model: DoctorWorkflowModel;
}) {
  const [renderedAt] = useState(() => Date.now());

  if (entry === undefined) {
    const next = model.entries.find((item) => item.status === "waiting");
    return (
      <section>
        <SectionHeading
          icon={HeartPulse}
          label="Current Consultation"
          subtitle="The patient currently being served"
        />
        <EmptyState
          description={
            next === undefined
              ? "No patient is in consultation and no one is currently waiting."
              : `${next.tokenNumber} is next. Call the patient when you are ready.`
          }
          icon={Stethoscope}
          title="No active consultation"
        />
      </section>
    );
  }

  const startedAt = entry.serviceStartedAt ?? entry.checkedInAt;
  const duration = Math.max(
    0,
    Math.floor((renderedAt - new Date(startedAt).getTime()) / 60_000),
  );

  return (
    <section>
      <SectionHeading
        icon={HeartPulse}
        label="Current Consultation"
        subtitle="Active patient context and clinical alerts"
      />
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/50 p-4 shadow-[0_12px_34px_rgba(79,70,229,0.1)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <DoctorProfileAvatar
            className="h-14 w-14 shrink-0 rounded-2xl text-base"
            name={getPatientName(entry)}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-black text-white">
                {entry.tokenNumber}
              </span>
              <StatusPill status={entry.status} />
            </div>
            <h3 className="mt-2 text-base font-black text-slate-950">
              {getPatientName(entry)}
            </h3>
            <p className="mt-1 text-[10px] font-semibold text-slate-500">
              {getMrNumber(entry)} · {entry.snapshot?.patient.ageYears ?? "—"} years ·{" "}
              {entry.snapshot?.patient.gender ?? "—"}
            </p>
            <p className="mt-2 text-[11px] font-bold text-slate-700">
              {getReason(entry)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-52">
            <InfoTile label="Duration" value={`${duration} min`} />
            <InfoTile label="Room" value={entry.roomLabel ?? "Pending"} />
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <AlertStrip
            label="Allergies"
            value={entry.snapshot?.patient.allergies || "No allergy information recorded"}
          />
          <AlertStrip
            label="Medical alerts"
            value={entry.snapshot?.patient.medicalAlert || "No medical alerts recorded"}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {readDemoClinicalEncounters().find(
            (item) => item.queueEntryId === entry.id && item.status !== "cancelled",
          ) ? (
            <Link
              className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
              href={`/doctor/encounters/${readDemoClinicalEncounters().find((item) => item.queueEntryId === entry.id && item.status !== "cancelled")?.id}`}
            >
              Continue Consultation
            </Link>
          ) : null}
          <button
            className={`${buttonClass} bg-rose-50 text-rose-700 hover:bg-rose-100`}
            onClick={() => model.finishConsultation(entry)}
            type="button"
          >
            Finish Consultation
          </button>
        </div>
      </div>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white bg-white/90 p-2 shadow-sm">
      <p className="text-[8px] font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 truncate text-[10px] font-black text-slate-900">{value}</p>
    </div>
  );
}

function AlertStrip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2">
      <AlertTriangle className="mt-0.5 shrink-0 text-rose-500" size={13} />
      <div>
        <p className="text-[8px] font-black uppercase text-rose-600">{label}</p>
        <p className="mt-0.5 text-[10px] font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  label,
  subtitle,
  action,
}: {
  icon: typeof Bell;
  label: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-[0_7px_18px_rgba(79,70,229,0.24)]">
          <Icon size={14} />
        </span>
        <div>
          <h2 className="text-xs font-black tracking-[-0.02em] text-slate-950">{label}</h2>
          {subtitle ? <p className="text-[9px] text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function DoctorTodayPanel({ model }: { model: DoctorWorkflowModel }) {
  const current = model.entries.find((entry) => entry.status === "serving");
  const next = model.entries.find((entry) => entry.status === "waiting");
  const daySchedule = model.schedules.filter(
    (schedule) =>
      schedule.practitionerId === model.doctor.id &&
      schedule.dayOfWeek === new Date(`${model.businessDate}T12:00:00`).getDay() &&
      schedule.active,
  );

  return (
    <div className="space-y-3">
      <DoctorPageHeader
        description={`${model.doctor.specialtyName} · Your sitting, active consultation and patient flow in one clinical view.`}
        eyebrow="Doctor Portal · Today"
        title={`${getGreeting()}, ${model.doctor.displayName}`}
      />

      <SittingControls model={model} />
      <Message value={model.message} />
      <QueueMetrics entries={model.entries} />

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <CurrentConsultation entry={current} model={model} />
        <section>
          <SectionHeading
            icon={Bell}
            label="Next Patient"
            subtitle="Call manually when ready"
          />
          {next ? (
            <PatientCard entry={next} model={model} primary />
          ) : (
            <EmptyState
              description="There are no waiting patients for the selected doctor, branch and date."
              icon={CheckCircle2}
              title="Queue is clear"
            />
          )}
        </section>
      </div>

      <section>
        <SectionHeading
          action={
            <Link className="text-[10px] font-black text-indigo-700" href="/doctor/queue">
              View Full Queue
            </Link>
          }
          icon={ListFilter}
          label="Today's Queue Preview"
          subtitle="Upcoming and called patients"
        />
        {model.activeEntries.filter((entry) => entry.status !== "serving").length ? (
          <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
            {model.activeEntries
              .filter((entry) => entry.status !== "serving")
              .slice(0, 6)
              .map((entry) => (
                <PatientCard compact entry={entry} key={entry.id} model={model} />
              ))}
          </div>
        ) : (
          <EmptyState
            description="New Reception handoffs will appear here automatically."
            icon={ListFilter}
            title="No upcoming patients"
          />
        )}
      </section>

      <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <SupportCard
          icon={CalendarDays}
          label="Today's Schedule"
          value={
            daySchedule.length
              ? daySchedule
                  .map((item) => `${item.startTime}–${item.endTime}`)
                  .join(", ")
              : "No weekly block configured"
          }
        />
        <SupportCard
          icon={FileClock}
          label="Pending Reports"
          value="Open Reports & Documents to review connected results"
        />
        <SupportCard
          icon={Clock3}
          label="Follow-ups Due"
          value="Open Follow-ups for appointment-based due dates"
        />
        <SupportCard
          icon={UserRound}
          label="New Patient Uploads"
          value="Patient upload storage is not connected yet"
        />
      </section>
    </div>
  );
}

function SupportCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bell;
  label: string;
  value: string;
}) {
  return (
    <div className="group rounded-[18px] border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/35 to-cyan-50/50 p-3 shadow-[0_10px_26px_rgba(79,70,229,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_15px_34px_rgba(79,70,229,0.12)]">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
        <Icon size={15} />
      </span>
      <h3 className="mt-2 text-[10px] font-black text-slate-900">{label}</h3>
      <p className="mt-1 text-[9px] leading-4 text-slate-500">{value}</p>
    </div>
  );
}

export function DoctorQueuePanel({ model }: { model: DoctorWorkflowModel }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DemoQueueStatus | "all">("all");
  const [priority, setPriority] = useState<DemoQueuePriority | "all">("all");
  const [selectedId, setSelectedId] = useState(model.activeEntries[0]?.id ?? "");

  const visibleEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return model.entries.filter((entry) => {
      const matchesQuery =
        normalized === "" ||
        [
          entry.tokenNumber,
          getPatientName(entry),
          getMrNumber(entry),
          getReason(entry),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalized);
      return (
        matchesQuery &&
        (status === "all" || entry.status === status) &&
        (priority === "all" || entry.priority === priority)
      );
    });
  }, [model.entries, priority, query, status]);

  const selected =
    visibleEntries.find((entry) => entry.id === selectedId) ?? visibleEntries[0];
  const selectedPosition = selected
    ? model.entries.findIndex((entry) => entry.id === selected.id) + 1
    : 0;
  const lastEncounter = selected
    ? readDemoClinicalEncounters()
        .filter(
          (encounter) =>
            encounter.patientId === selected.patientId &&
            encounter.practitionerId === model.doctor.id &&
            encounter.status === "completed",
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    : undefined;
  const next = model.entries.find((entry) => entry.status === "waiting");

  return (
    <div className="space-y-3">
      <DoctorPageHeader
        actions={
          next ? (
            <button
              className={`${buttonClass} bg-indigo-600 text-white`}
              onClick={() => model.callPatient(next)}
              type="button"
            >
              <Bell size={13} /> Call Next
            </button>
          ) : undefined
        }
        description="Doctor-controlled clinical progress for assigned patients only."
        title="Today's Queue"
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_170px_auto]">
          <label className="relative text-[9px] font-black uppercase text-slate-500">
            Search queue
            <Search className="absolute bottom-2.5 left-3 text-slate-400" size={14} />
            <input
              className={`${fieldClass} pl-9`}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Token, patient, MR or reason"
              value={query}
            />
          </label>
          <label className="text-[9px] font-black uppercase text-slate-500">
            Queue status
            <select
              className={fieldClass}
              onChange={(event) => setStatus(event.target.value as DemoQueueStatus | "all")}
              value={status}
            >
              <option value="all">All statuses</option>
              {(["waiting", "called", "serving", "skipped", "completed", "cancelled"] as const).map(
                (value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("-", " ")}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="text-[9px] font-black uppercase text-slate-500">
            Priority
            <select
              className={fieldClass}
              onChange={(event) =>
                setPriority(event.target.value as DemoQueuePriority | "all")
              }
              value={priority}
            >
              <option value="all">All priorities</option>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
          </label>
          <button
            className={`${buttonClass} self-end border border-slate-200 bg-white text-slate-700`}
            onClick={model.reload}
            type="button"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] font-bold text-slate-500">
          <StatusPill status={model.sitting?.status ?? "not-started"} />
          <span>{model.sitting?.roomLabel ?? "No consultation room assigned"}</span>
          <span>·</span>
          <span>{formatBusinessDate(model.businessDate)}</span>
        </div>
      </section>

      <Message value={model.message} />
      <QueueMetrics entries={model.entries} />

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          <SectionHeading
            icon={ListFilter}
            label={`Clinical Queue (${visibleEntries.length})`}
            subtitle="Select a patient to open the clinical preview"
          />
          {visibleEntries.length ? (
            <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {visibleEntries.map((entry) => (
                <PatientCard
                  entry={entry}
                  key={entry.id}
                  model={model}
                  onSelect={() => setSelectedId(entry.id)}
                  selected={selected?.id === entry.id}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              description={locationEmptyDescription(model)}
              icon={Search}
              title="No matching queue patients"
            />
          )}
        </section>

        <aside className="xl:sticky xl:top-3">
          <SectionHeading
            icon={UserRound}
            label="Selected Patient"
            subtitle="Queue and clinical context"
          />
          {selected ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <DoctorProfileAvatar
                  className="h-14 w-14 rounded-2xl text-base"
                  name={getPatientName(selected)}
                />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-slate-950">
                    {getPatientName(selected)}
                  </h3>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500">
                    {getMrNumber(selected)} · {selected.snapshot?.patient.ageYears ?? "—"}y ·{" "}
                    {selected.snapshot?.patient.gender ?? "—"}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-500">
                    {selected.snapshot?.patient.mobileNumber || "Mobile unavailable"}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2">
                <Detail label="Queue position" value={String(selectedPosition)} />
                <Detail
                  label="Waiting time"
                  value={`${calculateDemoQueueWaitMinutes(selected)} min`}
                />
                <Detail label="Room" value={selected.roomLabel ?? "Pending"} />
                <Detail
                  label="Payment"
                  value={selected.snapshot?.billing.paymentStatus ?? "Unavailable"}
                />
                <Detail
                  label="Last consultation"
                  value={
                    lastEncounter
                      ? new Date(lastEncounter.updatedAt).toLocaleDateString()
                      : "None recorded"
                  }
                />
                <Detail label="Uploaded documents" value="Not connected" />
              </dl>
              <div className="mt-3 space-y-2">
                <AlertStrip
                  label="Allergies"
                  value={selected.snapshot?.patient.allergies || "No allergy data recorded"}
                />
                <AlertStrip
                  label="Medical alerts"
                  value={selected.snapshot?.patient.medicalAlert || "No alerts recorded"}
                />
              </div>
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Consultation reason
                </p>
                <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-700">
                  {getReason(selected)}
                </p>
              </div>
              <div className="mt-3">
                <PatientCard compact entry={selected} model={model} />
              </div>
            </div>
          ) : (
            <EmptyState
              description="Choose a queue patient to review details and actions."
              icon={UserRound}
              title="No patient selected"
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2">
      <dt className="text-[8px] font-black uppercase text-slate-400">{label}</dt>
      <dd className="mt-1 truncate text-[10px] font-black text-slate-800">{value}</dd>
    </div>
  );
}

export function DoctorSchedulePanel({ model, embedded = false }: { model: DoctorWorkflowModel; embedded?: boolean }) {
  const portal = useDoctorPortalContext();
  const rooms = useConsultationRooms();
  const scheduleLocations = useDoctorScheduleLocations(portal.branches);
  const formRef = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState<DemoDoctorSchedule>();
  const [formOpen, setFormOpen] = useState(false);
  const [day, setDay] = useState<DemoDoctorScheduleDay>(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [duration, setDuration] = useState("15");
  const [maximum, setMaximum] = useState("18");
  const [walkIns, setWalkIns] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(
    model.doctor.primaryBranchId ?? "",
  );
  const [addingLocation, setAddingLocation] = useState(false);
  const [customLocationName, setCustomLocationName] = useState("");
  const [preferredRoomId, setPreferredRoomId] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);
  const [customRoomName, setCustomRoomName] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (editing === undefined) {
      queueMicrotask(() => setSelectedLocationId(model.doctor.primaryBranchId ?? ""));
    }
  }, [editing, model.doctor.primaryBranchId]);

  const schedules = model.schedules
    .filter((item) => item.practitionerId === model.doctor.id)
    .sort(
      (left, right) =>
        WEEK_ORDER.indexOf(left.dayOfWeek as (typeof WEEK_ORDER)[number]) -
          WEEK_ORDER.indexOf(right.dayOfWeek as (typeof WEEK_ORDER)[number]) ||
        left.startTime.localeCompare(right.startTime),
    );

  function openForm(item?: DemoDoctorSchedule): void {
    setEditing(item);
    setDay(item?.dayOfWeek ?? 1);
    setStart(item?.startTime ?? "09:00");
    setEnd(item?.endTime ?? "13:00");
    setDuration(String(item?.appointmentDurationMinutes ?? 15));
    setMaximum(String(item?.maximumPatients ?? 18));
    setWalkIns(item?.allowWalkIns ?? true);
    setSelectedLocationId(
      item === undefined
        ? model.doctor.primaryBranchId ?? ""
        : item.branchId,
    );
    setPreferredRoomId(item?.preferredRoomId ?? "");
    setError(undefined);
    setFormOpen(true);
    queueMicrotask(() => formRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  function save(): void {
    const selectedLocation = scheduleLocations.find(
      (location) => location.id === selectedLocationId,
    );
    if (selectedLocation === undefined) {
      setError("Choose a hospital branch or external clinic.");
      return;
    }
    try {
      saveDemoDoctorSchedule({
        id: editing?.id,
        practitionerId: model.doctor.id,
        branchId: selectedLocation.id,
        dayOfWeek: day,
        startTime: start,
        endTime: end,
        appointmentDurationMinutes: Number(duration),
        maximumPatients: Number(maximum),
        allowWalkIns: walkIns,
        preferredRoomId: preferredRoomId || undefined,
        active: editing?.active ?? true,
      });
      setEditing(undefined);
      setFormOpen(false);
      setError(undefined);
      model.reload();
      model.setMessage("Weekly schedule block saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save schedule.");
    }
  }

  return (
    <div className="space-y-3">
      {!embedded ? <DoctorPageHeader
        actions={
          <button
            className={`${buttonClass} bg-indigo-600 text-white`}
            onClick={() => openForm()}
            type="button"
          >
            <Plus size={13} /> Add Schedule
          </button>
        }
        description="Manage recurring weekly availability without overlapping blocks."
        title="My Schedule"
      /> : null}
      {!embedded ? <PortalFilters model={model} /> : null}
      {!embedded ? <DoctorConsultationFeeCard /> : null}
      <Message value={model.message} />

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-2">
          {WEEK_ORDER.map((dayNumber) => {
            const daySchedules = schedules.filter(
              (item) => item.dayOfWeek === dayNumber,
            );
            return (
              <div
                className="rounded-2xl border border-slate-200 bg-white p-3"
                key={DAYS[dayNumber]}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                      <CalendarDays size={15} />
                    </span>
                    <div>
                      <h2 className="text-[11px] font-black text-slate-950">
                        {DAYS[dayNumber]}
                      </h2>
                      <p className="text-[9px] text-slate-500">
                        {daySchedules.length
                          ? `${daySchedules.length} schedule block${daySchedules.length === 1 ? "" : "s"}`
                          : "No recurring availability"}
                      </p>
                    </div>
                  </div>
                  <button
                    aria-label={`Add ${DAYS[dayNumber]} schedule`}
                    className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                    onClick={() => {
                      openForm();
                      setDay(dayNumber as DemoDoctorScheduleDay);
                    }}
                    type="button"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {daySchedules.length ? (
                  <div className="mt-2 grid gap-2 lg:grid-cols-2">
                    {daySchedules.map((schedule) => {
                      const room = rooms.find(
                        (item) => item.id === schedule.preferredRoomId,
                      );
                      return (
                        <article
                          className={`rounded-xl border p-3 ${
                            schedule.active
                              ? "border-indigo-100 bg-indigo-50/40"
                              : "border-slate-200 bg-slate-50 opacity-65"
                          }`}
                          key={schedule.id}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-black text-slate-950">
                                {schedule.startTime}–{schedule.endTime}
                              </p>
                              <p className="mt-1 text-[9px] font-semibold text-slate-500">
                                {scheduleLocations.find((location) => location.id === schedule.branchId)?.name ?? "Unavailable location"}
                              </p>
                            </div>
                            <StatusPill status={schedule.active ? "active" : "inactive"} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-semibold text-slate-600">
                            <span>{schedule.appointmentDurationMinutes}-minute visits</span>
                            <span>·</span>
                            <span>{schedule.maximumPatients} patients</span>
                            <span>·</span>
                            <span>{schedule.allowWalkIns ? "Walk-ins allowed" : "Appointments only"}</span>
                          </div>
                          <p className="mt-1 text-[9px] text-slate-500">
                            Preferred room: {room?.label ?? "Not selected"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <button
                              className={`${buttonClass} border border-slate-200 bg-white text-slate-700`}
                              onClick={() => openForm(schedule)}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className={`${buttonClass} bg-amber-50 text-amber-700`}
                              onClick={() => {
                                setDemoDoctorScheduleActive(schedule.id, !schedule.active);
                                model.reload();
                              }}
                              type="button"
                            >
                              {schedule.active ? "Disable" : "Enable"}
                            </button>
                            <button
                              className={`${buttonClass} bg-rose-50 text-rose-700`}
                              onClick={() => {
                                deleteDemoDoctorSchedule(schedule.id);
                                model.reload();
                              }}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        <aside
          className={`${formOpen ? "block" : "hidden xl:block"} xl:sticky xl:top-3`}
          ref={formRef}
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.07)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black text-slate-950">
                  {editing ? "Edit Schedule Block" : "Add Schedule Block"}
                </h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  Recurring weekly availability
                </p>
              </div>
              <button
                className="text-[10px] font-black text-slate-500 xl:hidden"
                onClick={() => setFormOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <FormField className="col-span-2" label="Practice location">
                <select
                  className={fieldClass}
                  onChange={(event) => {
                    if (event.target.value === "__custom__") {
                      setAddingLocation(true);
                      return;
                    }
                    setSelectedLocationId(event.target.value);
                  }}
                  value={selectedLocationId}
                >
                  <option value="">Select a practice location</option>
                  <optgroup label="Hospital branches">
                    {scheduleLocations.filter((location) => !location.custom).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </optgroup>
                  {scheduleLocations.some((location) => location.custom) ? <optgroup label="External clinics">
                    {scheduleLocations.filter((location) => location.custom).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </optgroup> : null}
                  <option value="__custom__">+ Add an external clinic</option>
                </select>
              </FormField>
              {addingLocation ? <div className="col-span-2 rounded-xl border border-cyan-100 bg-cyan-50/60 p-3"><label className="text-[9px] font-black uppercase text-slate-500">Clinic or location name<input autoFocus className={fieldClass} onChange={(event) => setCustomLocationName(event.target.value)} placeholder="e.g. City Medical Clinic" value={customLocationName} /></label><div className="mt-2 flex gap-2"><button className={`${buttonClass} bg-cyan-600 text-white`} onClick={() => { try { const location = addCustomDoctorLocation(customLocationName); setSelectedLocationId(location.id); setCustomLocationName(""); setAddingLocation(false); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to add location."); } }} type="button"><Plus size={13} /> Add clinic</button><button className={`${buttonClass} bg-white text-slate-600`} onClick={() => setAddingLocation(false)} type="button">Cancel</button></div></div> : null}
              <FormField className="col-span-2" label="Day">
                <select
                  className={fieldClass}
                  onChange={(event) =>
                    setDay(Number(event.target.value) as DemoDoctorScheduleDay)
                  }
                  value={day}
                >
                  {WEEK_ORDER.map((dayNumber) => (
                    <option key={DAYS[dayNumber]} value={dayNumber}>
                      {DAYS[dayNumber]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Start time">
                <input
                  className={fieldClass}
                  onChange={(event) => setStart(event.target.value)}
                  type="time"
                  value={start}
                />
              </FormField>
              <FormField label="End time">
                <input
                  className={fieldClass}
                  onChange={(event) => setEnd(event.target.value)}
                  type="time"
                  value={end}
                />
              </FormField>
              <FormField label="Duration (minutes)">
                <input
                  className={fieldClass}
                  max={120}
                  min={5}
                  onChange={(event) => setDuration(event.target.value)}
                  type="number"
                  value={duration}
                />
              </FormField>
              <FormField label="Maximum patients">
                <input
                  className={fieldClass}
                  min={1}
                  onChange={(event) => setMaximum(event.target.value)}
                  type="number"
                  value={maximum}
                />
              </FormField>
              <FormField className="col-span-2" label="Preferred room">
                <select
                  className={fieldClass}
                  onChange={(event) => {
                    if (event.target.value === "__custom__") {
                      setAddingRoom(true);
                      return;
                    }
                    setPreferredRoomId(event.target.value);
                  }}
                  value={preferredRoomId}
                >
                  <option value="">No preferred room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.label}
                    </option>
                  ))}
                  <option value="__custom__">+ Add a custom room</option>
                </select>
              </FormField>
              {addingRoom ? (
                <div className="col-span-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                  <label className="text-[9px] font-black uppercase text-slate-500">New room<input autoFocus className={fieldClass} onChange={(event) => setCustomRoomName(event.target.value)} placeholder="e.g. OPD Room 7" value={customRoomName} /></label>
                  <div className="mt-2 flex gap-2"><button className={`${buttonClass} bg-indigo-600 text-white`} onClick={() => { try { const room = addCustomConsultationRoom(customRoomName); setPreferredRoomId(room.id); setCustomRoomName(""); setAddingRoom(false); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to add room."); } }} type="button"><Plus size={13} /> Add room</button><button className={`${buttonClass} bg-white text-slate-600`} onClick={() => setAddingRoom(false)} type="button">Cancel</button></div>
                </div>
              ) : null}
              <label className="col-span-2 flex h-9 items-center gap-2 rounded-xl bg-slate-50 px-3 text-[10px] font-bold text-slate-700">
                <input
                  checked={walkIns}
                  onChange={(event) => setWalkIns(event.target.checked)}
                  type="checkbox"
                />
                Allow walk-in patients
              </label>
            </div>
            {error ? (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">
                {error}
              </p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                className={`${buttonClass} bg-indigo-600 text-white`}
                onClick={save}
                type="button"
              >
                {editing ? "Update Schedule" : "Save Schedule"}
              </button>
              <button
                className={`${buttonClass} border border-slate-200 bg-white text-slate-700`}
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(false);
                  setError(undefined);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FormField({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`text-[9px] font-black uppercase text-slate-500 ${className}`}>
      {label}
      {children}
    </label>
  );
}
