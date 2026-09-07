"use client";

import type {
  PracticeLocation,
} from "@wonflow/contracts";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Clock3,
  DoorClosed,
  DoorOpen,
  FileClock,
  HeartPulse,
  ListFilter,
  Loader2,
  MapPin,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Square,
  Stethoscope,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
import { ActionReadiness, ActionResult, StatusBadge } from "@wonflow/ui";
import type { ActionReadinessBlocker, ActionResultState, StatusBadgeTone } from "@wonflow/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  DonutChart,
  StackedBar,
  type DonutSlice,
} from "@/components/charts";

import {
  persistDoctorSitting,
  persistDoctorSittingStatus,
  useSittingBranch,
} from "@/lib/doctor-sittings";
import type { DemoDoctorSitting } from "@/lib/doctor-sittings";
import {
  addCustomConsultationRoom,
  calculateDemoQueueWaitMinutes,
  QUEUE_ROOMS_CHANGED_EVENT,
  QUEUE_ROOM_OPTIONS,
  loadQueueRoomOptions,
  readQueueRoomOptions,
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

function formatMinuteOfDay(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function formatMinuteAmPm(value: number): string {
  const hour24 = Math.floor(value / 60);
  const mins = value % 60;
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(mins).padStart(2, "0")} ${ampm}`;
}

const fieldClass =
  "h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const buttonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-[10px] font-black transition focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-45";

function useConsultationRooms() {
  const [rooms, setRooms] = useState(() => readQueueRoomOptions().filter((room) => room.category === "consultation"));
  useEffect(() => {
    const reloadRooms = () => setRooms(readQueueRoomOptions().filter((room) => room.category === "consultation"));
    // Pull the hospital's saved rooms once, then keep in step with any added
    // from another panel in this tab.
    queueMicrotask(() => {
      void loadQueueRoomOptions().then(reloadRooms).catch(() => undefined);
    });
    window.addEventListener(QUEUE_ROOMS_CHANGED_EVENT, reloadRooms);
    window.addEventListener("storage", reloadRooms);
    return () => {
      window.removeEventListener(QUEUE_ROOMS_CHANGED_EVENT, reloadRooms);
      window.removeEventListener("storage", reloadRooms);
    };
  }, []);
  return rooms;
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
  roster: readonly { id: string; branch: { id: string; name: string }; weekday: number; startsMinute: number; endsMinute: number; capacity: number; serviceId: string | null }[];
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

const RESOLVER_LABELS: Record<string, string> = {
  self: "You",
  administrator: "An administrator",
  reception: "Reception",
  billing: "Billing",
  doctor: "The doctor",
};

interface StartSittingReadinessResponse {
  ready: boolean;
  blockers: Array<{ code: string; reason: string; resolverRole: string; resolutionHref: string }>;
}

/** Calls the start-sitting readiness endpoint whenever the sitting is not yet active — there is nothing to gate once it already is. */
function useStartSittingReadiness(
  enabled: boolean,
  branchId: string | undefined,
  businessDate: string,
  roomLabel: string,
): { blockers: ActionReadinessBlocker[]; loading: boolean } {
  const [blockers, setBlockers] = useState<ActionReadinessBlocker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (!enabled || !branchId) {
        setBlockers([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ branchId, businessDate });
        if (roomLabel.trim()) params.set("roomLabel", roomLabel.trim());
        const response = await fetch(`/api/v1/readiness/start-sitting?${params.toString()}`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = await response.json() as StartSittingReadinessResponse;
        setBlockers(
          body.blockers.map((blocker) => ({
            code: blocker.code,
            reason: blocker.reason,
            resolverLabel: RESOLVER_LABELS[blocker.resolverRole] ?? blocker.resolverRole,
          })),
        );
      } catch (caught: unknown) {
        if (
          controller.signal.aborted ||
          (typeof caught === "object" && caught !== null && "name" in caught && (caught as { name: string }).name === "AbortError") ||
          (caught instanceof Error && (caught.name === "AbortError" || caught.message.toLowerCase().includes("abort"))) ||
          (typeof DOMException !== "undefined" && caught instanceof DOMException && caught.name === "AbortError")
        ) {
          return;
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load().catch(() => { });
    return () => {
      try {
        controller.abort();
      } catch {
        // ignore
      }
    };
  }, [enabled, branchId, businessDate, roomLabel]);

  return { blockers, loading };
}

interface OccupiedRoom {
  roomLabel: string;
  doctorName: string;
}

/** Every other doctor's occupied room at this branch today — reused from reception's own sitting list, since a doctor already has appointments.read. */
function useRoomOccupancy(branchId: string | undefined, businessDate: string, excludeDoctorId: string): OccupiedRoom[] {
  const [occupied, setOccupied] = useState<OccupiedRoom[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (!branchId) {
        setOccupied([]);
        return;
      }
      try {
        const response = await fetch(`/api/v1/reception/sittings?date=${encodeURIComponent(businessDate)}`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = await response.json() as {
          sittings: Array<{ doctorId: string; branchId: string; roomLabel: string | null; status: string; doctorName: string }>;
        };
        setOccupied(
          body.sittings
            .filter((sitting) =>
              sitting.branchId === branchId &&
              sitting.doctorId !== excludeDoctorId &&
              sitting.roomLabel !== null &&
              (sitting.status === "AVAILABLE" || sitting.status === "ON_BREAK"),
            )
            .map((sitting) => ({ roomLabel: sitting.roomLabel!, doctorName: sitting.doctorName })),
        );
      } catch (caught: unknown) {
        if (
          controller.signal.aborted ||
          (typeof caught === "object" && caught !== null && "name" in caught && (caught as { name: string }).name === "AbortError") ||
          (caught instanceof Error && (caught.name === "AbortError" || caught.message.toLowerCase().includes("abort"))) ||
          (typeof DOMException !== "undefined" && caught instanceof DOMException && caught.name === "AbortError")
        ) {
          return;
        }
      }
    };
    void load().catch(() => { });
    return () => {
      try {
        controller.abort();
      } catch {
        // ignore
      }
    };
  }, [branchId, businessDate, excludeDoctorId]);

  return occupied;
}

function formatClockTime(value: string | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

interface SittingStatusLine {
  badgeLabel: string;
  tone: StatusBadgeTone;
  detail: string;
}

/** Built from model.sitting only — the same server-fetched value the rest of the portal reads, so this line and the badge can never disagree. */
function describeSittingStatus(sitting: DemoDoctorSitting | undefined, waiting: number, inProgress: number, seen: number): SittingStatusLine {
  if (!sitting || sitting.status === "not-started") {
    // Says what to do, not just what is wrong. This is the first thing a
    // doctor sees each morning, and "patients cannot be called" on its own
    // leaves them hunting for the reason.
    return {
      badgeLabel: "NOT STARTED",
      tone: "neutral",
      detail:
        "Not started — set your room and hours below, then Start Sitting to begin calling patients",
    };
  }
  if (sitting.status === "available") {
    const since = formatClockTime(sitting.actualStartedAt);
    return {
      badgeLabel: "ACTIVE",
      tone: "positive",
      detail: `Active in ${sitting.roomLabel || "an unassigned room"}${since ? ` since ${since}` : ""} — ${waiting} waiting${inProgress > 0 ? `, ${inProgress} in progress` : ""}`,
    };
  }
  if (sitting.status === "on-break") {
    const since = formatClockTime(sitting.updatedAt);
    return {
      badgeLabel: "ON BREAK",
      tone: "caution",
      detail: `On break${since ? ` since ${since}` : ""} — patients remain queued`,
    };
  }
  const endedAt = formatClockTime(sitting.actualEndedAt);
  return {
    badgeLabel: "FINISHED",
    tone: "neutral",
    detail: `Finished${endedAt ? ` at ${endedAt}` : ""} — ${seen} patient${seen === 1 ? "" : "s"} seen`,
  };
}

export function AddCustomRoomModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose(): void;
  onCreated(roomLabel: string): void;
}) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<"consultation" | "procedure" | "triage">("consultation");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (trimmed.length < 2) {
      setError("Please enter a room name with at least 2 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Saved for the whole hospital, so the room exists for reception and for
      // every other doctor, not just this browser.
      const room = await addCustomConsultationRoom(trimmed, category);
      onCreated(room.label);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add custom room.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <DoorOpen size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-950">Add Custom Room</h3>
              <p className="text-[11px] text-slate-500">Add a consultation room to your workspace</p>
            </div>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">{error}</p>
          ) : null}

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500">
              Room Name / Number *
              <input
                autoFocus
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                onChange={(e) => {
                  setLabel(e.target.value);
                  setError(undefined);
                }}
                placeholder="e.g. Room 402, Consultation Suite B"
                required
                value={label}
              />
            </label>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500">
              Room Type
              <select
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                onChange={(e) => setCategory(e.target.value as "consultation" | "procedure" | "triage")}
                value={category}
              >
                <option value="consultation">Consultation Room</option>
                <option value="procedure">Procedure Room</option>
                <option value="triage">Triage / Pre-OPD</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
              {saving ? "Adding Room..." : "Add Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SittingControls({ model }: { model: DoctorWorkflowModel }) {
  const rooms = useConsultationRooms();
  const availableRooms = useMemo(() => {
    const list = [...rooms];
    if (model.sitting?.roomLabel?.trim() && !list.some((r) => r.label.toLowerCase() === model.sitting!.roomLabel!.trim().toLowerCase())) {
      list.unshift({ id: `sitting-${model.sitting.roomLabel}`, label: model.sitting.roomLabel.trim(), category: "consultation" });
    }
    return list;
  }, [rooms, model.sitting?.roomLabel]);
  const { branches, resolvedBranchId: sittingBranchId } = useSittingBranch(model.legacyBranchId);
  const businessDate = model.businessDate;

  const todayWeekday = useMemo(() => {
    return new Date(`${businessDate}T12:00:00`).getDay();
  }, [businessDate]);

  const todayRosterRules = useMemo(() => {
    return model.roster.filter((item) => item.weekday === todayWeekday);
  }, [model.roster, todayWeekday]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedRosterId, setSelectedRosterId] = useState<string>("");
  const [roomLabel, setRoomLabel] = useState(model.sitting?.roomLabel ?? "");
  const [startTime, setStartTime] = useState(model.sitting?.sittingStartTime ?? "09:00");
  const [endTime, setEndTime] = useState(model.sitting?.sittingEndTime ?? "13:00");
  const [minutes, setMinutes] = useState(String(model.sitting?.averageConsultationMinutes ?? 15));
  const [editingRoom, setEditingRoom] = useState(false);
  const [showCustomHours, setShowCustomHours] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showActiveMenu, setShowActiveMenu] = useState(false);

  const [showAddRoomModal, setShowAddRoomModal] = useState(false);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResultState>({ status: "idle" });

  const activeRosterRule = useMemo(() => {
    if (selectedRosterId) {
      const matched = todayRosterRules.find((item) => item.id === selectedRosterId);
      if (matched) return matched;
    }
    if (selectedBranchId) {
      const branchMatched = todayRosterRules.find((item) => item.branch.id === selectedBranchId);
      if (branchMatched) return branchMatched;
    }
    return todayRosterRules[0] ?? null;
  }, [todayRosterRules, selectedRosterId, selectedBranchId]);

  useEffect(() => {
    queueMicrotask(() => {
      if (model.sitting) {
        setRoomLabel(model.sitting.roomLabel ?? "");
        setStartTime(model.sitting.sittingStartTime ?? "09:00");
        setEndTime(model.sitting.sittingEndTime ?? "13:00");
        setMinutes(String(model.sitting.averageConsultationMinutes ?? 15));
        if (model.sitting.branchId) {
          setSelectedBranchId(model.sitting.branchId);
        }
      } else if (activeRosterRule) {
        setStartTime(formatMinuteOfDay(activeRosterRule.startsMinute));
        setEndTime(formatMinuteOfDay(activeRosterRule.endsMinute));
        const calculatedMinutes =
          activeRosterRule.capacity > 0
            ? Math.max(5, Math.min(120, Math.floor((activeRosterRule.endsMinute - activeRosterRule.startsMinute) / activeRosterRule.capacity)))
            : 15;
        setMinutes(String(calculatedMinutes));
        if (activeRosterRule.branch?.id && !selectedBranchId) {
          setSelectedBranchId(activeRosterRule.branch.id);
        }
      }
    });
  }, [model.sitting, activeRosterRule, selectedBranchId]);

  const activeBranchId = selectedBranchId || activeRosterRule?.branch.id || sittingBranchId;
  const isNotStarted = model.sitting === undefined || model.sitting.status === "not-started" || model.sitting.status === "finished";

  const { blockers: startBlockers, loading: readinessLoading } = useStartSittingReadiness(
    isNotStarted,
    activeBranchId,
    businessDate,
    roomLabel,
  );

  const occupiedRooms = useRoomOccupancy(activeBranchId, businessDate, model.doctorId);
  const occupiedByLabel = useMemo(
    () => new Map(occupiedRooms.map((occupied) => [occupied.roomLabel, occupied.doctorName])),
    [occupiedRooms],
  );

  const waitingCount = model.entries.filter((entry) => entry.status === "waiting" || entry.status === "called").length;
  const inProgressCount = model.entries.filter((entry) => entry.status === "serving").length;
  const seenCount = model.entries.filter((entry) => entry.status === "completed").length;

  const statusLine = describeSittingStatus(model.sitting, waitingCount, inProgressCount, seenCount);

  const slotCount = useMemo(() => {
    const [startHour = 0, startMinute = 0] = startTime.split(":").map(Number);
    const [endHour = 0, endMinute = 0] = endTime.split(":").map(Number);
    const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    const duration = Number(minutes);
    if (totalMinutes <= 0 || !Number.isFinite(duration) || duration <= 0) return 0;
    return Math.floor(totalMinutes / duration);
  }, [startTime, endTime, minutes]);

  const handleSelectRoster = (rule: typeof todayRosterRules[number]) => {
    setSelectedRosterId(rule.id);
    if (rule.branch?.id) {
      setSelectedBranchId(rule.branch.id);
    }
    setStartTime(formatMinuteOfDay(rule.startsMinute));
    setEndTime(formatMinuteOfDay(rule.endsMinute));
    const calculatedMinutes =
      rule.capacity > 0
        ? Math.max(5, Math.min(120, Math.floor((rule.endsMinute - rule.startsMinute) / rule.capacity)))
        : 15;
    setMinutes(String(calculatedMinutes));
  };

  /**
   * Calls the server first and only updates the interface from its confirmed
   * response — never the other way around. `mutate()` cannot resolve to
   * "success" ahead of the request completing, so there is no window where
   * this shows a result the database does not yet have.
   */
  async function save(startNow: boolean): Promise<void> {
    if (!activeBranchId) {
      setResult({ status: "error", message: "No hospital branch is available. Please add or select a branch before saving." });
      return;
    }
    if (!roomLabel.trim()) {
      setResult({ status: "error", message: "Please select a consultation room before starting the sitting." });
      return;
    }
    if (startTime >= endTime) {
      setResult({ status: "error", message: "Planned start time must be before end time." });
      return;
    }
    const duration = Number(minutes);
    if (!Number.isInteger(duration) || duration < 5 || duration > 120) {
      setResult({ status: "error", message: "Average consultation time must be a whole number between 5 and 120 minutes." });
      return;
    }

    setBusy(true);
    setResult({ status: "pending", message: startNow ? "Starting sitting…" : "Saving…" });

    const outcome = await persistDoctorSitting({
      branchId: activeBranchId,
      businessDate,
      sittingStartTime: startTime,
      sittingEndTime: endTime,
      averageConsultationMinutes: duration,
      roomLabel: roomLabel.trim(),
      status: startNow ? "available" : (model.sitting?.status ?? "not-started"),
    });

    setBusy(false);

    if (outcome.status === "failure") {
      setResult({ status: "error", message: outcome.error.message, onRetry: () => void save(startNow) });
      return;
    }

    model.reload();
    setEditingRoom(false);
    setResult({
      status: "success",
      message: startNow ? `Sitting started in ${outcome.data.sitting.roomLabel ?? roomLabel.trim()}.` : "Sitting details saved.",
    });
  }

  async function changeStatus(status: "available" | "on-break" | "finished" | "not-started"): Promise<void> {
    if (model.sitting === undefined || model.sitting.id === "") {
      setResult({ status: "error", message: "There is no sitting to update yet. Start one first." });
      return;
    }

    setBusy(true);
    setResult({
      status: "pending",
      message: status === "on-break" ? "Pausing sitting…" : status === "available" ? "Resuming sitting…" : status === "finished" ? "Ending sitting…" : "Cancelling sitting…",
    });

    const outcome = await persistDoctorSittingStatus(model.sitting.id, status);

    setBusy(false);

    if (outcome.status === "failure") {
      setResult({ status: "error", message: outcome.error.message, onRetry: () => void changeStatus(status) });
      return;
    }

    model.reload();
    setResult({
      status: "success",
      message: status === "available"
        ? "The sitting is active and the doctor is available."
        : status === "on-break"
          ? "The sitting is paused. Waiting patients remain in the queue."
          : status === "finished"
            ? "The sitting has ended for this business date."
            : "The sitting was cancelled.",
    });
  }

  async function extendOrShorten(deltaMinutes: number): Promise<void> {
    const [hour = 0, minute = 0] = endTime.split(":").map(Number);
    const total = Math.min(23 * 60 + 59, Math.max(0, hour * 60 + minute + deltaMinutes));
    const next = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    setEndTime(next);
    await save(false);
  }

  const otherBlockers = startBlockers.filter((b) => b.code !== "room-required");
  const startDisabled = busy || readinessLoading || !roomLabel.trim() || otherBlockers.length > 0;
  const startDisabledReason = !roomLabel.trim()
    ? "Please select a consultation room to start sitting."
    : otherBlockers[0]?.reason;

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm">
      {/* =========================================================
          STATE 1: SITTING NOT STARTED YET
          Ultra-clean single bar:
          [Daily Sitting · Shift Hours] [Room Dropdown] [Start Sitting] [Options ▾]
          ========================================================= */}
      {isNotStarted ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Shift Hours & Capacity Summary */}
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                <Stethoscope size={16} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-slate-950">Daily Sitting</h2>
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <Check className="stroke-[3]" size={10} /> Official Roster
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {activeRosterRule ? (
                    <>
                      <span className="font-bold text-slate-900">
                        {formatMinuteAmPm(activeRosterRule.startsMinute)} – {formatMinuteAmPm(activeRosterRule.endsMinute)}
                      </span>
                      {" · "}
                      <span className="font-semibold text-indigo-700">{activeRosterRule.capacity} slots</span>
                      {" · "}
                      <span className="text-slate-500">{activeRosterRule.branch.name}</span>
                    </>
                  ) : (
                    <span>Standard Hours ({startTime} – {endTime})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Center & Right: Room Dropdown + Start Button + Options Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Consultation Room Dropdown */}
              <div className="w-56 sm:w-64">
                <select
                  aria-label="Consultation room"
                  className={`${fieldClass} ${!roomLabel.trim() ? "border-amber-300 ring-1 ring-amber-200" : "border-emerald-300 bg-emerald-50/20 font-bold"}`}
                  id="sitting-consultation-room-select"
                  onChange={(event) => {
                    if (event.target.value === "__add_new_custom_room__") {
                      setShowAddRoomModal(true);
                    } else {
                      setRoomLabel(event.target.value);
                    }
                  }}
                  value={roomLabel}
                >
                  <option value="">Choose Consultation Room...</option>
                  {availableRooms.map((room) => {
                    const occupant = occupiedByLabel.get(room.label);
                    return (
                      <option disabled={occupant !== undefined} key={room.id} value={room.label}>
                        {room.label}{occupant ? ` — occupied by ${occupant}` : ""}
                      </option>
                    );
                  })}
                  <option value="__add_new_custom_room__">+ Add custom room...</option>
                </select>
              </div>

              {/* Start Sitting Button */}
              <span title={startDisabled ? (startDisabledReason ?? "Checking readiness…") : undefined}>
                <button
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={startDisabled}
                  onClick={() => void save(true)}
                  type="button"
                >
                  <Play size={13} />
                  <span>{roomLabel.trim() ? `Start in ${roomLabel}` : "Start Sitting"}</span>
                </button>
              </span>

              {/* Rest sent to dropdown: "Options ▾" */}
              <div className="relative">
                <button
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                  type="button"
                >
                  <Settings2 className="text-slate-500" size={13} />
                  <span>Options</span>
                  <ChevronDown className={`text-slate-400 transition-transform ${showOptionsDropdown ? "rotate-180" : ""}`} size={12} />
                </button>

                {showOptionsDropdown ? (
                  <div className="absolute right-0 z-30 mt-1.5 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-[11px] font-black text-slate-900">Sitting Options</span>
                        <button
                          className="text-slate-400 hover:text-slate-600"
                          onClick={() => setShowOptionsDropdown(false)}
                          type="button"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Shift Switcher if multiple shifts exist today */}
                      {todayRosterRules.length > 1 ? (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400">Select Shift</span>
                          <div className="mt-1 space-y-1">
                            {todayRosterRules.map((rule, idx) => (
                              <button
                                className={`w-full rounded-lg p-1.5 text-left text-xs font-semibold ${activeRosterRule?.id === rule.id
                                    ? "bg-indigo-50 font-bold text-indigo-700"
                                    : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                key={rule.id}
                                onClick={() => {
                                  handleSelectRoster(rule);
                                  setShowOptionsDropdown(false);
                                }}
                                type="button"
                              >
                                Shift {idx + 1}: {formatMinuteAmPm(rule.startsMinute)}–{formatMinuteAmPm(rule.endsMinute)} ({rule.capacity} slots)
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Hospital Branch Selector if multiple */}
                      {branches.length > 1 ? (
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400">Hospital Branch</label>
                          <select
                            className={`${fieldClass} mt-1 h-8 text-xs`}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            value={activeBranchId ?? ""}
                          >
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}{b.isMainBranch ? " (Main)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {/* Add Custom Room Action */}
                      <button
                        className="flex w-full items-center gap-2 rounded-lg p-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                        onClick={() => {
                          setShowOptionsDropdown(false);
                          setShowAddRoomModal(true);
                        }}
                        type="button"
                      >
                        <Plus size={13} /> Add Custom Room
                      </button>

                      {/* Save Draft Action */}
                      <button
                        className="flex w-full items-center gap-2 rounded-lg p-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        disabled={busy}
                        onClick={() => {
                          setShowOptionsDropdown(false);
                          void save(false);
                        }}
                        type="button"
                      >
                        Save Details as Draft
                      </button>

                      {/* Override Shift Hours Toggle */}
                      <div className="border-t border-slate-100 pt-1.5">
                        <button
                          className="flex w-full items-center justify-between text-[11px] font-bold text-slate-600 hover:text-indigo-600"
                          onClick={() => {
                            setShowCustomHours(!showCustomHours);
                            setShowOptionsDropdown(false);
                          }}
                          type="button"
                        >
                          <span>Override Shift Hours</span>
                          <span className="text-[10px] font-bold text-indigo-600">{showCustomHours ? "Hide" : "Edit"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Manual shift hours override (when opened via Options) */}
          {showCustomHours ? (
            <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Manual Shift Hours Override
                </span>
                <button
                  className="text-xs text-slate-400 hover:text-slate-600"
                  onClick={() => setShowCustomHours(false)}
                  type="button"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <label className="text-[9px] font-black uppercase text-slate-500">
                  Planned start
                  <input className={fieldClass} onChange={(e) => setStartTime(e.target.value)} type="time" value={startTime} />
                </label>
                <label className="text-[9px] font-black uppercase text-slate-500">
                  Planned end
                  <input className={fieldClass} onChange={(e) => setEndTime(e.target.value)} type="time" value={endTime} />
                </label>
                <label className="text-[9px] font-black uppercase text-slate-500">
                  Average minutes
                  <input className={fieldClass} max={120} min={5} onChange={(e) => setMinutes(e.target.value)} type="number" value={minutes} />
                </label>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                {slotCount > 0 ? `≈ ${slotCount} appointment slot${slotCount === 1 ? "" : "s"} in these hours` : "Enter valid hours"}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        /* =========================================================
           STATE 2: SITTING ALREADY ACTIVE (available / on-break / finished)
           Ultra-clean single bar:
           [🟢 In Sitting · Room: 101 · Hours] [Break] [End] [Actions ▾]
           ========================================================= */
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Active Sitting info */}
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <Stethoscope size={16} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-950">Daily Sitting</span>
                  <StatusBadge label={statusLine.badgeLabel} tone={statusLine.tone} />
                </div>
                <p className="text-xs text-slate-600">
                  <span className="font-bold text-slate-900">Room: {model.sitting?.roomLabel || "Unassigned"}</span>
                  {" · "}
                  <span>{model.sitting?.sittingStartTime} – {model.sitting?.sittingEndTime} ({model.sitting?.averageConsultationMinutes}m/slot)</span>
                  {" · "}
                  <span className="text-slate-500">{branches.find((b) => b.id === activeBranchId)?.name ?? "Hospital"}</span>
                </p>
              </div>
            </div>

            {/* Right: Primary actions + "Sitting Actions ▾" Dropdown */}
            <div className="flex items-center gap-2">
              {model.sitting?.status === "available" ? (
                <>
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-xs font-bold text-white shadow-xs hover:bg-amber-600 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void changeStatus("on-break")}
                    type="button"
                  >
                    <Pause size={13} /> Take Break
                  </button>
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void changeStatus("finished")}
                    type="button"
                  >
                    <Square size={13} /> End Sitting
                  </button>
                </>
              ) : null}

              {model.sitting?.status === "on-break" ? (
                <>
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void changeStatus("available")}
                    type="button"
                  >
                    <Play size={13} /> Resume
                  </button>
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void changeStatus("finished")}
                    type="button"
                  >
                    <Square size={13} /> End Sitting
                  </button>
                </>
              ) : null}

              {/* Sitting Actions Dropdown */}
              <div className="relative">
                <button
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowActiveMenu(!showActiveMenu)}
                  type="button"
                >
                  <Settings2 className="text-slate-500" size={13} />
                  <span>Actions</span>
                  <ChevronDown className={`text-slate-400 transition-transform ${showActiveMenu ? "rotate-180" : ""}`} size={12} />
                </button>

                {showActiveMenu ? (
                  <div className="absolute right-0 z-30 mt-1.5 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5">
                    <button
                      className="flex w-full items-center gap-2 rounded-lg p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setShowActiveMenu(false);
                        setEditingRoom(true);
                      }}
                      type="button"
                    >
                      <DoorClosed className="text-slate-500" size={13} /> Change Room
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      disabled={busy}
                      onClick={() => {
                        setShowActiveMenu(false);
                        void extendOrShorten(30);
                      }}
                      type="button"
                    >
                      <Clock3 className="text-indigo-600" size={13} /> Extend 30 min
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      disabled={busy}
                      onClick={() => {
                        setShowActiveMenu(false);
                        void extendOrShorten(-30);
                      }}
                      type="button"
                    >
                      <Clock3 className="text-slate-500" size={13} /> Shorten 30 min
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      className="flex w-full items-center gap-2 rounded-lg p-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                      disabled={busy}
                      onClick={() => {
                        setShowActiveMenu(false);
                        void changeStatus("not-started");
                      }}
                      type="button"
                    >
                      <X size={13} /> Cancel Sitting
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Change Room Inline Form */}
          {editingRoom ? (
            <div className="mt-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Change Consultation Room</span>
                <button
                  className="text-xs text-slate-400 hover:text-slate-600"
                  onClick={() => setEditingRoom(false)}
                  type="button"
                >
                  <X size={13} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  aria-label="Consultation room"
                  className={`${fieldClass} max-w-xs`}
                  onChange={(e) => setRoomLabel(e.target.value)}
                  value={roomLabel}
                >
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.label}>{room.label}</option>
                  ))}
                </select>
                <button
                  className="inline-flex h-9 items-center rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700"
                  onClick={() => void save(false)}
                  type="button"
                >
                  Save New Room
                </button>
                <button
                  className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setEditingRoom(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Result or Blocker Alerts */}
      <div className="empty:hidden mt-2">
        {isNotStarted && startBlockers.length > 0 ? (
          <ActionReadiness blockers={startBlockers} hideLinks />
        ) : null}
        <ActionResult result={result} />
      </div>

      {/* Modal for Adding Custom Room */}
      <AddCustomRoomModal
        isOpen={showAddRoomModal}
        onClose={() => setShowAddRoomModal(false)}
        onCreated={(newRoomLabel) => {
          setRoomLabel(newRoomLabel);
          setResult({ status: "success", message: `Custom room "${newRoomLabel}" added and selected.` });
        }}
      />
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
  const { encounters } = useDoctorPortalContext();
  const encounter = encounters.find(
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
          {entry.roomLabel ?? model.sitting?.roomLabel ?? "—"}
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
  const [showCharts, setShowCharts] = useState(false);

  const flowMix: DonutSlice[] = [
    {
      id: "completed",
      label: "Seen",
      value: entries.filter((entry) => entry.status === "completed").length,
      color: "var(--viz-good)",
    },
    {
      id: "serving",
      label: "In consultation",
      value: entries.filter((entry) => entry.status === "serving").length,
      color: "var(--viz-1)",
    },
    {
      id: "called",
      label: "Called",
      value: entries.filter((entry) => entry.status === "called").length,
      color: "var(--viz-4)",
    },
    {
      id: "waiting",
      label: "Waiting",
      value: entries.filter((entry) => entry.status === "waiting").length,
      color: "var(--viz-mute-mark)",
    },
  ].filter((slice) => slice.value > 0);

  const openEntries = entries.filter(
    (entry) => !["completed", "cancelled"].includes(entry.status),
  );

  const priorityMix: DonutSlice[] = [
    {
      id: "emergency",
      label: "Emergency",
      value: openEntries.filter((entry) => entry.priority === "emergency").length,
      color: "var(--viz-critical)",
    },
    {
      id: "urgent",
      label: "Urgent",
      value: openEntries.filter((entry) => entry.priority === "urgent").length,
      color: "var(--viz-warning)",
    },
    {
      id: "routine",
      label: "Routine",
      value: openEntries.filter(
        (entry) => entry.priority !== "urgent" && entry.priority !== "emergency",
      ).length,
      color: "var(--viz-mute-mark)",
    },
  ].filter((slice) => slice.value > 0);

  const waitingCount = entries.filter((entry) => entry.status === "waiting").length;
  const calledCount = entries.filter((entry) => entry.status === "called").length;
  const servingCount = entries.filter((entry) => entry.status === "serving").length;
  const urgentCount = openEntries.filter(
    (entry) => entry.priority === "urgent" || entry.priority === "emergency",
  ).length;
  const seenCount = entries.filter((entry) => entry.status === "completed").length;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-200/60 bg-amber-50/70 px-2.5 py-1 text-amber-900">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-semibold text-amber-800">Waiting:</span>
            <span className="text-xs font-black text-amber-950">{waitingCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-indigo-200/60 bg-indigo-50/70 px-2.5 py-1 text-indigo-900">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <span className="text-[11px] font-semibold text-indigo-800">Called:</span>
            <span className="text-xs font-black text-indigo-950">{calledCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-cyan-200/60 bg-cyan-50/70 px-2.5 py-1 text-cyan-900">
            <span className="h-2 w-2 rounded-full bg-cyan-500" />
            <span className="text-[11px] font-semibold text-cyan-800">In Consultation:</span>
            <span className="text-xs font-black text-cyan-950">{servingCount}</span>
          </div>

          {urgentCount > 0 ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-200/60 bg-rose-50 px-2.5 py-1 text-rose-900">
              <span className="h-2 w-2 animate-ping rounded-full bg-rose-500" />
              <span className="text-[11px] font-semibold text-rose-800">Urgent:</span>
              <span className="text-xs font-black text-rose-950">{urgentCount}</span>
            </div>
          ) : null}

          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200/60 bg-emerald-50/70 px-2.5 py-1 text-emerald-900">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-800">Completed:</span>
            <span className="text-xs font-black text-emerald-950">{seenCount}</span>
          </div>
        </div>

        {entries.length > 0 ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-indigo-600"
            onClick={() => setShowCharts(!showCharts)}
            type="button"
          >
            <BarChart3 className="text-indigo-600" size={13} />
            <span>{showCharts ? "Hide Analytics" : "Queue Analytics"}</span>
            <ChevronDown className={`text-slate-400 transition-transform ${showCharts ? "rotate-180" : ""}`} size={11} />
          </button>
        ) : null}
      </div>

      {showCharts && entries.length > 0 ? (
        <div className="border-t border-slate-100 bg-slate-50/50 p-3.5">
          <div className="grid gap-3 lg:grid-cols-2">
            <DonutChart
              centerLabel="Seen"
              centerValue={`${seenCount}/${entries.length}`}
              emptyMessage="No patients on today's list"
              size={160}
              slices={flowMix}
              subtitle="Every patient booked for this sitting"
              thickness={18}
              title="Where today's list stands"
            />
            <DonutChart
              centerLabel="Remaining"
              emptyHint="Every patient on the list has been seen."
              emptyMessage="Nobody left waiting"
              footnote="Emergency and urgent are status colours, never series colours."
              size={160}
              slices={priorityMix}
              subtitle="Excludes patients already seen"
              thickness={18}
              title="Still to see, by priority"
            />
          </div>
        </div>
      ) : null}
    </div>
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
  const { encounters } = useDoctorPortalContext();

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
            <InfoTile label="Room" value={entry.roomLabel ?? model.sitting?.roomLabel ?? "—"} />
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
          {(() => {
            const activeEncounter = encounters.find(
              (item) => item.queueEntryId === entry.id && item.status !== "cancelled",
            );

            return activeEncounter !== undefined ? (
              <Link
                className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
                href={`/doctor/encounters/${activeEncounter.id}`}
              >
                Continue Consultation
              </Link>
            ) : null;
          })()}
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
  const dayRoster = model.roster.filter(
    (item) => item.weekday === new Date(`${model.businessDate}T12:00:00`).getDay(),
  );
  const [showQueuePreview, setShowQueuePreview] = useState(false);
  const [showQuickTools, setShowQuickTools] = useState(false);

  const upcomingEntries = model.activeEntries.filter((entry) => entry.status !== "serving");

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

      {/* Primary Clinical Consultation Focus */}
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

      {/* Secondary: Upcoming Patients in Collapsible Dropdown */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
              <Users size={14} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-slate-900">
                  Upcoming Patients ({upcomingEntries.length})
                </h3>
                {upcomingEntries.length > 0 ? (
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    {upcomingEntries.filter((e) => e.status === "called").length} called · {upcomingEntries.filter((e) => e.status === "waiting").length} waiting
                  </span>
                ) : null}
              </div>
              <p className="text-[10px] text-slate-500">Upcoming and called patients for today</p>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => setShowQueuePreview(!showQueuePreview)}
            type="button"
          >
            <span>{showQueuePreview ? "Hide Patients" : `View Patients (${upcomingEntries.length})`}</span>
            <ChevronDown className={`text-slate-400 transition-transform ${showQueuePreview ? "rotate-180" : ""}`} size={12} />
          </button>
        </div>

        {showQueuePreview ? (
          <div className="mt-3 border-t border-slate-100 pt-3">
            {upcomingEntries.length ? (
              <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                {upcomingEntries.map((entry) => (
                  <PatientCard compact entry={entry} key={entry.id} model={model} />
                ))}
              </div>
            ) : (
              <EmptyState
                description="New Reception handoffs will appear here automatically."
                icon={Users}
                title="No upcoming patients"
              />
            )}
          </div>
        ) : null}
      </section>

      {/* Secondary: Clinical Tools, Reports & Schedule in Collapsible Dropdown */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
              <FileClock size={14} />
            </span>
            <div>
              <h3 className="text-xs font-black text-slate-900">Clinical Tools & Reports</h3>
              <p className="text-[10px] text-slate-500">Reports, follow-ups, documents, and schedule details</p>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => setShowQuickTools(!showQuickTools)}
            type="button"
          >
            <span>{showQuickTools ? "Hide Tools" : "Open Tools & Reports"}</span>
            <ChevronDown className={`text-slate-400 transition-transform ${showQuickTools ? "rotate-180" : ""}`} size={12} />
          </button>
        </div>

        {showQuickTools ? (
          <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 md:grid-cols-2 xl:grid-cols-4">
            <SupportCard
              icon={CalendarDays}
              label="Today's Schedule"
              value={
                dayRoster.length
                  ? dayRoster
                    .map((item) => `${formatMinuteAmPm(item.startsMinute)}–${formatMinuteAmPm(item.endsMinute)} (${item.capacity} slots)`)
                    .join(", ")
                  : "No rostered hours today"
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
          </div>
        ) : null}
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
  const { encounters } = useDoctorPortalContext();
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
    ? encounters
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
                <Detail label="Room" value={selected.roomLabel ?? model.sitting?.roomLabel ?? "—"} />
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
  const roster = [...model.roster].sort(
    (left, right) =>
      WEEK_ORDER.indexOf(left.weekday as (typeof WEEK_ORDER)[number]) -
      WEEK_ORDER.indexOf(right.weekday as (typeof WEEK_ORDER)[number]) ||
      left.startsMinute - right.startsMinute,
  );

  return (
    <div className="space-y-3">
      {!embedded ? <DoctorPageHeader
        description="Your recurring weekly availability, as booked by reception and patients."
        title="My Schedule"
      /> : null}
      {!embedded ? <PortalFilters model={model} /> : null}
      {!embedded ? <DoctorConsultationFeeCard /> : null}
      <Message value={model.message} />

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-[10px] font-bold text-blue-900">
        These hours are set by hospital administration and are what reception and patients book against. Contact administration to request a change.
      </div>

      <section className="space-y-2">
        {WEEK_ORDER.map((dayNumber) => {
          const dayRoster = roster.filter((item) => item.weekday === dayNumber);
          return (
            <div
              className="rounded-2xl border border-slate-200 bg-white p-3"
              key={DAYS[dayNumber]}
            >
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                  <CalendarDays size={15} />
                </span>
                <div>
                  <h2 className="text-[11px] font-black text-slate-950">
                    {DAYS[dayNumber]}
                  </h2>
                  <p className="text-[9px] text-slate-500">
                    {dayRoster.length
                      ? `${dayRoster.length} rostered window${dayRoster.length === 1 ? "" : "s"}`
                      : "No rostered hours"}
                  </p>
                </div>
              </div>
              {dayRoster.length ? (
                <div className="mt-2 grid gap-2 lg:grid-cols-2">
                  {dayRoster.map((item) => (
                    <article
                      className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3"
                      key={item.id}
                    >
                      <p className="text-[11px] font-black text-slate-950">
                        {formatMinuteOfDay(item.startsMinute)}–{formatMinuteOfDay(item.endsMinute)}
                      </p>
                      <p className="mt-1 text-[9px] font-semibold text-slate-500">
                        {item.branch.name}
                      </p>
                      <p className="mt-1 text-[9px] text-slate-500">
                        {item.capacity} slot{item.capacity === 1 ? "" : "s"}
                      </p>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}

interface DoctorAppointmentRecord {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  consultationMode: "IN_PERSON" | "ONLINE";
  reason: string | null;
  patient: { givenName: string; familyName: string; patientNumber: string };
  service: { name: string; durationMinutes?: number } | null;
  branch: { id?: string; name: string; timezone: string };
  branchId?: string;
  doctorId?: string;
}

/** Absorbed from the former live-doctor-appointments.tsx: in-person and online consultations booked against the doctor's real schedule. */
export function DoctorAppointmentsPanel() {
  const [appointments, setAppointments] = useState<DoctorAppointmentRecord[]>([]);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [now, setNow] = useState(0);

  // Filters
  const [filterMode, setFilterMode] = useState<"all" | "today" | "later">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState<DoctorAppointmentRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleDuration, setRescheduleDuration] = useState(20);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState<DoctorAppointmentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/doctor/appointments", { cache: "no-store" });
      const body = (await response.json()) as { appointments?: DoctorAppointmentRecord[]; error?: string };
      if (!response.ok || !body.appointments) throw new Error(body.error ?? "Appointments could not be loaded.");
      setAppointments(body.appointments);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Appointments could not be loaded.");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setNow(Date.now());
      void load();
    });
  }, [load]);

  const isAppointmentToday = useCallback((startsAt: string, timezone: string) => {
    try {
      const apptDate = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(startsAt));
      const nowInTz = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      return apptDate === nowInTz;
    } catch {
      return startsAt.slice(0, 10) === todayStr;
    }
  }, [todayStr]);

  const upcoming = useMemo(
    () => appointments.filter((item) => new Date(item.endsAt).getTime() >= now && !["CANCELLED", "NO_SHOW"].includes(item.status)),
    [appointments, now],
  );
  const previous = useMemo(() => appointments.filter((item) => !upcoming.includes(item)), [appointments, upcoming]);

  const todayAppointmentsCount = useMemo(
    () => upcoming.filter((item) => isAppointmentToday(item.startsAt, item.branch.timezone)).length,
    [upcoming, isAppointmentToday],
  );
  const laterAppointmentsCount = useMemo(
    () => upcoming.filter((item) => !isAppointmentToday(item.startsAt, item.branch.timezone)).length,
    [upcoming, isAppointmentToday],
  );

  const filteredUpcoming = useMemo(() => {
    return upcoming.filter((item) => {
      const isToday = isAppointmentToday(item.startsAt, item.branch.timezone);
      if (filterMode === "today" && !isToday) return false;
      if (filterMode === "later" && isToday) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${item.patient.givenName} ${item.patient.familyName}`.toLowerCase();
        const mrn = item.patient.patientNumber.toLowerCase();
        const reason = (item.reason ?? "").toLowerCase();
        const service = (item.service?.name ?? "").toLowerCase();
        if (!fullName.includes(q) && !mrn.includes(q) && !reason.includes(q) && !service.includes(q)) return false;
      }
      return true;
    });
  }, [upcoming, filterMode, searchQuery, isAppointmentToday]);

  const filteredPrevious = useMemo(() => {
    if (!searchQuery.trim()) return previous;
    const q = searchQuery.toLowerCase().trim();
    return previous.filter((item) => {
      const fullName = `${item.patient.givenName} ${item.patient.familyName}`.toLowerCase();
      const mrn = item.patient.patientNumber.toLowerCase();
      const reason = (item.reason ?? "").toLowerCase();
      const service = (item.service?.name ?? "").toLowerCase();
      return fullName.includes(q) || mrn.includes(q) || reason.includes(q) || service.includes(q);
    });
  }, [previous, searchQuery]);

  const openReschedule = (appointment: DoctorAppointmentRecord) => {
    setRescheduleTarget(appointment);
    setRescheduleError("");
    const d = new Date(appointment.startsAt);
    const datePart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setRescheduleDate(datePart);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    setRescheduleTime(`${hours}:${minutes}`);
    const duration = Math.max(10, Math.round((new Date(appointment.endsAt).getTime() - d.getTime()) / 60000)) || 20;
    setRescheduleDuration(duration);
  };

  const submitReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) {
      setRescheduleError("Please choose a valid date and time.");
      return;
    }
    setRescheduleLoading(true);
    setRescheduleError("");
    try {
      const startsAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      if (Number.isNaN(startsAt.getTime())) {
        throw new Error("Invalid date or time format.");
      }
      const endsAt = new Date(startsAt.getTime() + rescheduleDuration * 60000);

      const res = await fetch(`/api/v1/appointments/${rescheduleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to reschedule appointment.");
      }

      setFeedbackMessage(
        `Appointment for ${rescheduleTarget.patient.givenName} ${rescheduleTarget.patient.familyName} rescheduled successfully to ${startsAt.toLocaleDateString("en-PK", { dateStyle: "medium" })} at ${startsAt.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}.`,
      );
      setRescheduleTarget(null);
      await load();
    } catch (err) {
      setRescheduleError(err instanceof Error ? err.message : "Failed to reschedule appointment.");
    } finally {
      setRescheduleLoading(false);
    }
  };

  const openCancel = (appointment: DoctorAppointmentRecord) => {
    setCancelTarget(appointment);
    setCancelReason("Booked for incorrect date / patient requested reschedule");
    setCancelError("");
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      setCancelError("Please provide a reason for cancellation.");
      return;
    }
    setCancelLoading(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/v1/appointments/${cancelTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reason: cancelReason.trim(),
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to cancel appointment.");
      }

      setFeedbackMessage(`Appointment for ${cancelTarget.patient.givenName} ${cancelTarget.patient.familyName} has been cancelled.`);
      setCancelTarget(null);
      await load();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel appointment.");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <DoctorPageHeader
        action={
          <Link
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
            href="/doctor/register-patient"
          >
            <CalendarPlus size={15} />
            <span>Book appointment</span>
          </Link>
        }
        description="In-person and online consultations booked against your live schedule."
        icon={<CalendarDays size={18} />}
        title="My appointments"
      />

      {feedbackMessage ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
            onClick={() => setFeedbackMessage("")}
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${filterMode === "all" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            onClick={() => setFilterMode("all")}
            type="button"
          >
            All Upcoming ({upcoming.length})
          </button>
          <button
            className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${filterMode === "today" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            onClick={() => setFilterMode("today")}
            type="button"
          >
            Today ({todayAppointmentsCount})
          </button>
          <button
            className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${filterMode === "later" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            onClick={() => setFilterMode("later")}
            type="button"
          >
            Future Dates ({laterAppointmentsCount})
          </button>
        </div>

        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter patient, MRN, reason..."
            type="search"
            value={searchQuery}
          />
        </div>
      </div>

      {([["Upcoming", filteredUpcoming], ["Previous", filteredPrevious]] as const).map(([label, items]) => (
        <section
          className="overflow-hidden rounded-[22px] border border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/40 shadow-[0_16px_42px_rgba(79,70,229,0.12)]"
          key={label}
        >
          <header className="relative flex flex-wrap items-center justify-between gap-2 overflow-hidden bg-gradient-to-r from-indigo-100 via-violet-50 to-cyan-100 px-4 py-3">
            <div className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-cyan-300/30 blur-2xl" />
            <div className="relative flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
                <CalendarClock size={15} />
              </span>
              <div>
                <h2 className="text-[11px] font-black text-slate-950">{label} appointments</h2>
                <p className="text-[9px] text-slate-500">
                  {items.length} {items.length === 1 ? "appointment" : "appointments"}
                </p>
              </div>
            </div>
          </header>

          <div className="p-4">
            {items.length ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {items.map((appointment) => {
                  const isToday = isAppointmentToday(appointment.startsAt, appointment.branch.timezone);
                  const isActionable = !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status);

                  return (
                    <article
                      className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${!isToday && label === "Upcoming"
                          ? "border-violet-200/90 bg-gradient-to-br from-white to-violet-50/30"
                          : "border-indigo-100/80"
                        }`}
                      key={appointment.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900">
                              {appointment.patient.givenName} {appointment.patient.familyName}
                            </h3>
                            {isToday ? (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-700">
                                Today
                              </span>
                            ) : label === "Upcoming" ? (
                              <span className="rounded-full border border-violet-200 bg-violet-100/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-800">
                                Scheduled: {new Intl.DateTimeFormat("en-PK", { month: "short", day: "numeric" }).format(new Date(appointment.startsAt))}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs font-semibold text-slate-500">
                            {appointment.patient.patientNumber} · {appointment.service?.name ?? "Consultation"}
                          </p>
                        </div>
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-indigo-700">
                          {appointment.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                        <span className={`inline-flex items-center gap-1 font-semibold ${!isToday && label === "Upcoming" ? "text-violet-900" : ""}`}>
                          <Clock className="size-3.5 text-indigo-500" />
                          {new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: appointment.branch.timezone }).format(
                            new Date(appointment.startsAt),
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5 text-indigo-500" />
                          {appointment.consultationMode === "ONLINE" ? "Online" : appointment.branch.name}
                        </span>
                      </div>

                      {appointment.reason ? (
                        <p className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700">
                          <strong className="font-bold text-slate-900">Reason: </strong>
                          {appointment.reason}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {appointment.consultationMode === "ONLINE" && !["CANCELLED", "NO_SHOW"].includes(appointment.status) ? (
                          <Link
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5"
                            href={`/doctor/appointments/${appointment.id}/video`}
                          >
                            <Video className="size-3.5" />
                            Open video
                          </Link>
                        ) : (
                          <Link
                            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
                            href="/doctor/consultations"
                          >
                            <Stethoscope className="size-3.5" />
                            Open workspace
                          </Link>
                        )}

                        {isActionable ? (
                          <>
                            <button
                              className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
                              onClick={() => openReschedule(appointment)}
                              title="Change date or time"
                              type="button"
                            >
                              <CalendarClock className="size-3.5 text-indigo-600" />
                              Reschedule
                            </button>

                            <button
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-50"
                              onClick={() => openCancel(appointment)}
                              title="Cancel this appointment"
                              type="button"
                            >
                              <X className="size-3.5" />
                              Cancel
                            </button>
                          </>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-8 text-center text-sm font-semibold text-slate-500">
                No {label.toLowerCase()} appointments {searchQuery || filterMode !== "all" ? "matching your filters" : ""}.
              </p>
            )}
          </div>
        </section>
      ))}

      {/* Reschedule Modal */}
      {rescheduleTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-indigo-100 bg-white shadow-2xl">
            <header className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-100">
                  <CalendarClock size={16} />
                  Reschedule Appointment
                </span>
                <button
                  className="rounded-full bg-white/10 p-1 text-white hover:bg-white/20"
                  onClick={() => setRescheduleTarget(null)}
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
              <h3 className="mt-2 text-lg font-black leading-tight">
                {rescheduleTarget.patient.givenName} {rescheduleTarget.patient.familyName}
              </h3>
              <p className="text-xs text-indigo-200">
                {rescheduleTarget.patient.patientNumber} · {rescheduleTarget.service?.name ?? "Consultation"}
              </p>
            </header>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-slate-700">
                <p className="font-bold text-slate-900">Current schedule:</p>
                <p className="mt-1 font-semibold text-indigo-900">
                  {new Intl.DateTimeFormat("en-PK", { dateStyle: "full", timeStyle: "short", timeZone: rescheduleTarget.branch.timezone }).format(
                    new Date(rescheduleTarget.startsAt),
                  )}
                </p>
                <p className="mt-0.5 text-slate-500">{rescheduleTarget.branch.name}</p>
              </div>

              {rescheduleError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  {rescheduleError}
                </div>
              ) : null}

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    New Date
                  </label>
                  <button
                    className="text-[11px] font-black text-indigo-600 hover:underline"
                    onClick={() => setRescheduleDate(todayStr)}
                    type="button"
                  >
                    Set to Today ({todayStr})
                  </button>
                </div>
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  min={todayStr}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  type="date"
                  value={rescheduleDate}
                />
                {rescheduleDate ? (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-indigo-700">
                    <CalendarDays size={13} />
                    <span>
                      {new Date(`${rescheduleDate}T00:00:00`).toLocaleDateString("en-PK", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Start Time
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    type="time"
                    value={rescheduleTime}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Duration (Minutes)
                  </label>
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    onChange={(e) => setRescheduleDuration(Number(e.target.value))}
                    value={rescheduleDuration}
                  >
                    <option value={15}>15 mins</option>
                    <option value={20}>20 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>
              </div>

              {/* Quick time slots shortcuts */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Time Slots:</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {["09:00", "10:00", "11:00", "14:00", "16:00", "18:00", "20:00"].map((t) => (
                    <button
                      className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${rescheduleTime === t
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      key={t}
                      onClick={() => setRescheduleTime(t)}
                      type="button"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  disabled={rescheduleLoading}
                  onClick={() => setRescheduleTarget(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:opacity-50"
                  disabled={rescheduleLoading || !rescheduleDate || !rescheduleTime}
                  onClick={() => void submitReschedule()}
                  type="button"
                >
                  {rescheduleLoading ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  <span>{rescheduleLoading ? "Saving..." : "Confirm Reschedule"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cancel Modal */}
      {cancelTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-5 shadow-2xl">
            <h3 className="text-base font-black text-rose-950">Cancel Appointment</h3>
            <p className="mt-1 text-xs text-slate-600">
              Are you sure you want to cancel the appointment for{" "}
              <strong>
                {cancelTarget.patient.givenName} {cancelTarget.patient.familyName}
              </strong>{" "}
              ({cancelTarget.patient.patientNumber})?
            </p>

            {cancelError ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {cancelError}
              </div>
            ) : null}

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-600">Reason for cancellation</label>
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                value={cancelReason}
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                disabled={cancelLoading}
                onClick={() => setCancelTarget(null)}
                type="button"
              >
                Keep Appointment
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50"
                disabled={cancelLoading || !cancelReason.trim()}
                onClick={() => void submitCancel()}
                type="button"
              >
                {cancelLoading ? <Loader2 className="size-3 animate-spin" /> : null}
                <span>{cancelLoading ? "Cancelling..." : "Confirm Cancellation"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
