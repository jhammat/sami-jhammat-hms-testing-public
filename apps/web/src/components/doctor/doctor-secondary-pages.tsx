"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  FileClock,
  FileHeart,
  FileText,
  FlaskConical,
  Globe,
  History,
  Image as ImageIcon,
  KeyRound,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Stethoscope,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
  Video,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  BarChart,
  DonutChart,
  RadialMeter,
  type BarDatum,
  type DonutSlice,
} from "@/components/charts";

import { phaseOneApi } from "@/lib/api/phase-one-api";

import {
  readDemoAppointmentBookings,
  type DemoAppointmentBooking,
} from "@/lib/appointments";
import {
  readDemoClinicalDocumentation,
  readDemoClinicalEncounters,
  type DemoClinicalDocumentation,
  type DemoClinicalEncounter,
} from "@/lib/clinical";
import {
  getLaboratoryResultSeverity,
  getRadiologyResultSeverity,
  readDemoLaboratoryResultReviews,
  readDemoRadiologyResultReviews,
  readDemoStructuredLaboratoryResults,
  readDemoStructuredRadiologyResults,
  type DemoLaboratoryResultReview,
  type DemoRadiologyResultReview,
  type DemoStructuredLaboratoryResult,
  type DemoStructuredRadiologyResult,
} from "@/lib/diagnostics";
import {
  readDemoDoctorSchedules,
  type DemoDoctorSchedule,
} from "@/lib/doctor-schedules";
import {
  getDemoPatientRegistrationAge,
  readDemoPatientRegistrations,
  type DemoPatientRegistrationResult,
} from "@/lib/patients";
import {
  readDemoQueueEntries,
  type DemoQueueEntry,
} from "@/lib/queue";

import {
  WONFLOW_AVATAR_CHANGED_EVENT,
  usePracticeLocation,
} from "@/components/shell";

import { DoctorPageHeader } from "./doctor-page-header";
import {
  DoctorPortalIdentity,
  useDoctorPortalContext,
} from "./doctor-portal-shell";
import { DoctorProfileAvatar } from "./doctor-profile-avatar";
import { AddHospitalBranchModal } from "./doctor-portal-workflow";

const SECONDARY_DATA_EVENTS = [
  "wonflow:demo-patients-changed",
  "wonflow:demo-appointments-changed",
  "wonflow:demo-queue-changed",
  "wonflow:demo-clinical-encounters-changed",
  "wonflow:demo-clinical-documentation-changed",
  "wonflow:demo-doctor-schedules-changed",
  "wonflow:demo-structured-laboratory-results-changed",
  "wonflow:demo-structured-radiology-results-changed",
  "wonflow:demo-laboratory-result-reviews-changed",
  "wonflow:demo-radiology-result-reviews-changed",
] as const;

const INPUT_CLASS_NAME =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

interface DoctorSecondaryData {
  patients: DemoPatientRegistrationResult[];
  appointments: DemoAppointmentBooking[];
  queueEntries: DemoQueueEntry[];
  encounters: DemoClinicalEncounter[];
  documentation: DemoClinicalDocumentation[];
  schedules: DemoDoctorSchedule[];
  laboratoryResults: DemoStructuredLaboratoryResult[];
  radiologyResults: DemoStructuredRadiologyResult[];
  laboratoryReviews: DemoLaboratoryResultReview[];
  radiologyReviews: DemoRadiologyResultReview[];
}

const EMPTY_SECONDARY_DATA: DoctorSecondaryData = {
  patients: [],
  appointments: [],
  queueEntries: [],
  encounters: [],
  documentation: [],
  schedules: [],
  laboratoryResults: [],
  radiologyResults: [],
  laboratoryReviews: [],
  radiologyReviews: [],
};

type QueueSnapshotPatient = NonNullable<DemoQueueEntry["snapshot"]>["patient"];

interface ConnectedPatient {
  id: string;
  displayName: string;
  mrNumber: string;
  identityNumber: string;
  mobileNumber: string;
  gender: string;
  age?: number;
  appointments: DemoAppointmentBooking[];
  queueEntries: DemoQueueEntry[];
  encounters: DemoClinicalEncounter[];
  lastActivityAt?: string;
  nextAppointment?: DemoAppointmentBooking;
  lastDiagnosis?: string;
  unreadReports: number;
}

interface ReportInboxItem {
  id: string;
  kind: "laboratory" | "radiology";
  title: string;
  patientId: string;
  updatedAt: string;
  status: string;
  severity: "normal" | "abnormal" | "critical";
  reviewed: boolean;
  href: string;
}

function readSecondaryData(): DoctorSecondaryData {
  return {
    patients: readDemoPatientRegistrations(),
    appointments: readDemoAppointmentBookings(),
    queueEntries: readDemoQueueEntries(),
    encounters: readDemoClinicalEncounters(),
    documentation: readDemoClinicalDocumentation(),
    schedules: readDemoDoctorSchedules(),
    laboratoryResults: readDemoStructuredLaboratoryResults(),
    radiologyResults: readDemoStructuredRadiologyResults(),
    laboratoryReviews: readDemoLaboratoryResultReviews(),
    radiologyReviews: readDemoRadiologyResultReviews(),
  };
}

function useDoctorSecondaryData(): DoctorSecondaryData {
  const [data, setData] = useState<DoctorSecondaryData>(EMPTY_SECONDARY_DATA);

  const reload = useCallback(() => {
    setData(readSecondaryData());
  }, []);

  useEffect(() => {
    queueMicrotask(reload);

    SECONDARY_DATA_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, reload);
    });
    window.addEventListener("storage", reload);

    return () => {
      SECONDARY_DATA_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, reload);
      });
      window.removeEventListener("storage", reload);
    };
  }, [reload]);

  return data;
}

function todayValue(): string {
  return new Date().toLocaleDateString("en-CA");
}

function formatDate(value?: string): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return parsed.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return parsed.toLocaleString([], {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function humanize(value: string): string {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getInitials(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function newestTimestamp(values: Array<string | undefined>): string | undefined {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
}

function snapshotForPatient(entries: DemoQueueEntry[]): QueueSnapshotPatient | undefined {
  return [...entries]
    .sort(
      (left, right) =>
        new Date(right.checkedInAt).getTime() - new Date(left.checkedInAt).getTime(),
    )
    .find((entry) => entry.snapshot !== undefined)?.snapshot?.patient;
}

function buildConnectedPatients(
  doctorId: string,
  data: DoctorSecondaryData,
): ConnectedPatient[] {
  if (doctorId === "") return [];

  const appointments = data.appointments.filter(
    (appointment) => appointment.practitionerId === doctorId,
  );
  const queueEntries = data.queueEntries.filter(
    (entry) => entry.practitionerId === doctorId,
  );
  const encounters = data.encounters.filter(
    (encounter) => encounter.practitionerId === doctorId,
  );
  const connectedIds = new Set([
    ...appointments.map((appointment) => appointment.patientId),
    ...queueEntries.map((entry) => entry.patientId),
    ...encounters.map((encounter) => encounter.patientId),
  ]);
  const registrationsById = new Map(
    data.patients.map((registration) => [registration.id, registration]),
  );
  const today = todayValue();

  return [...connectedIds]
    .map((patientId): ConnectedPatient | undefined => {
      const registration = registrationsById.get(patientId);
      const patientAppointments = appointments.filter(
        (appointment) => appointment.patientId === patientId,
      );
      const patientQueueEntries = queueEntries.filter(
        (entry) => entry.patientId === patientId,
      );
      const patientEncounters = encounters.filter(
        (encounter) => encounter.patientId === patientId,
      );
      const snapshot = snapshotForPatient(patientQueueEntries);

      if (registration === undefined && snapshot === undefined) return undefined;

      const nextAppointment = patientAppointments
        .filter(
          (appointment) =>
            appointment.appointmentDate >= today &&
            appointment.status !== "cancelled" &&
            appointment.status !== "completed" &&
            appointment.status !== "no-show",
        )
        .sort((left, right) =>
          left.scheduledStartAt.localeCompare(right.scheduledStartAt),
        )[0];

      const encounterIds = new Set(patientEncounters.map((encounter) => encounter.id));
      const documentation = data.documentation
        .filter((record) => encounterIds.has(record.encounterId))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      const diagnosis = documentation
        .flatMap((record) => record.diagnoses)
        .find((record) => record.diagnosis.trim() !== "")?.diagnosis;

      const laboratoryResultIds = data.laboratoryResults
        .filter(
          (result) =>
            result.practitionerId === doctorId && result.patientId === patientId,
        )
        .map((result) => result.id);
      const radiologyResultIds = data.radiologyResults
        .filter(
          (result) =>
            result.practitionerId === doctorId && result.patientId === patientId,
        )
        .map((result) => result.id);
      const reviewedLaboratoryIds = new Set(
        data.laboratoryReviews
          .filter((review) => review.status !== "pending")
          .map((review) => review.structuredResultId),
      );
      const reviewedRadiologyIds = new Set(
        data.radiologyReviews
          .filter((review) => review.status !== "pending")
          .map((review) => review.structuredResultId),
      );
      const unreadReports =
        laboratoryResultIds.filter((id) => !reviewedLaboratoryIds.has(id)).length +
        radiologyResultIds.filter((id) => !reviewedRadiologyIds.has(id)).length;

      return {
        id: patientId,
        displayName: registration?.displayName ?? snapshot?.displayName ?? "Patient",
        mrNumber: registration?.mrNumber ?? snapshot?.mrNumber ?? patientId,
        identityNumber:
          registration?.draft.cnicNumber ?? snapshot?.identityNumber ?? "",
        mobileNumber:
          registration?.draft.mobileNumber ?? snapshot?.mobileNumber ?? "",
        gender: registration?.draft.gender ?? snapshot?.gender ?? "unknown",
        age:
          registration !== undefined
            ? getDemoPatientRegistrationAge(registration)
            : snapshot?.ageYears,
        appointments: patientAppointments,
        queueEntries: patientQueueEntries,
        encounters: patientEncounters,
        lastActivityAt: newestTimestamp([
          ...patientAppointments.map((appointment) => appointment.scheduledStartAt),
          ...patientQueueEntries.map((entry) => entry.checkedInAt),
          ...patientEncounters.map((encounter) => encounter.startedAt),
        ]),
        nextAppointment,
        lastDiagnosis: diagnosis,
        unreadReports,
      };
    })
    .filter((patient): patient is ConnectedPatient => patient !== undefined)
    .sort(
      (left, right) =>
        new Date(right.lastActivityAt ?? 0).getTime() -
        new Date(left.lastActivityAt ?? 0).getTime(),
    );
}

function buildInboxItems(
  doctorId: string,
  data: DoctorSecondaryData,
): ReportInboxItem[] {
  const laboratoryReviewsByResultId = new Map(
    data.laboratoryReviews.map((review) => [review.structuredResultId, review]),
  );
  const radiologyReviewsByResultId = new Map(
    data.radiologyReviews.map((review) => [review.structuredResultId, review]),
  );

  return [
    ...data.laboratoryResults
      .filter(
        (result) => result.practitionerId === doctorId && result.status !== "draft",
      )
      .map(
        (result): ReportInboxItem => ({
          id: result.id,
          kind: "laboratory",
          title: result.panelName,
          patientId: result.patientId,
          updatedAt: result.finalizedAt || result.resultReadyAt || result.updatedAt,
          status: result.status,
          severity: getLaboratoryResultSeverity(result),
          reviewed:
            laboratoryReviewsByResultId.get(result.id)?.status !== undefined &&
            laboratoryReviewsByResultId.get(result.id)?.status !== "pending",
          href: "/doctor/results",
        }),
      ),
    ...data.radiologyResults
      .filter(
        (result) => result.practitionerId === doctorId && result.status !== "draft",
      )
      .map(
        (result): ReportInboxItem => ({
          id: result.id,
          kind: "radiology",
          title: result.studyName,
          patientId: result.patientId,
          updatedAt: result.finalizedAt || result.resultReadyAt || result.updatedAt,
          status: result.status,
          severity: getRadiologyResultSeverity(result),
          reviewed:
            radiologyReviewsByResultId.get(result.id)?.status !== undefined &&
            radiologyReviewsByResultId.get(result.id)?.status !== "pending",
          href: "/doctor/radiology-results",
        }),
      ),
  ].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function PatientAvatar({ patient }: { patient: { displayName: string } }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-black text-indigo-700 ring-1 ring-indigo-200">
      {getInitials(patient.displayName)}
    </span>
  );
}

function StatusPill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "indigo" | "emerald" | "amber" | "rose";
}) {
  // Alpha tints of each tone's own hue rather than fixed light steps. A
  // `bg-indigo-50` pill kept its pale fill in dark mode while the global
  // overrides lightened its label, so the text disappeared into it.
  const tones = {
    slate: "bg-slate-500/12 text-slate-600 ring-slate-500/25 dark:text-slate-300",
    indigo: "bg-indigo-500/12 text-indigo-700 ring-indigo-500/25 dark:text-indigo-300",
    emerald: "bg-emerald-500/14 text-emerald-700 ring-emerald-500/28 dark:text-emerald-300",
    amber: "bg-amber-500/16 text-amber-700 ring-amber-500/30 dark:text-amber-300",
    rose: "bg-rose-500/14 text-rose-700 ring-rose-500/28 dark:text-rose-300",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-500">
        {icon}
      </span>
      <h2 className="mt-3 text-sm font-black text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-slate-500">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "indigo",
}: {
  label: string;
  value: number | string;
  helper: string;
  tone?: "indigo" | "emerald" | "amber" | "rose" | "slate";
}) {
  const toneClass = {
    indigo: "border-indigo-100 bg-indigo-50/55 text-indigo-700",
    emerald: "border-emerald-100 bg-emerald-50/55 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/55 text-amber-700",
    rose: "border-rose-100 bg-rose-50/55 text-rose-700",
    slate: "border-slate-200 bg-white text-slate-700",
  } as const;

  return (
    <div className={`rounded-2xl border p-3 ${toneClass[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold opacity-75">{helper}</p>
    </div>
  );
}

type PatientFilter =
  | "all"
  | "today"
  | "upcoming"
  | "follow-ups"
  | "previous"
  | "unread";

interface RealConnectedPatient {
  id: string;
  displayName: string;
  mrNumber: string;
  identityNumber: string;
  mobileNumber: string;
  email?: string;
  gender: string;
  age?: number;
  dateOfBirth?: string;
  fatherName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  city?: string;
  addressLine?: string;
  bloodGroup?: string;
  notes?: string;
  referralSource?: string;
  lastActivityAt?: string;
  lastDiagnosis: string | null;
  nextAppointment?: { id?: string; appointmentDate: string; slotStart: string; serviceName: string; consultationMode?: string };
  encounterCount: number;
  unreadReports: number;
}

const REFERRAL_SOURCE_LABELS: Record<string, string> = {
  "walk-in": "Walk-in",
  "doctor-referral": "Doctor referral",
  "hospital-referral": "Hospital referral",
  "online-booking": "Website booking",
  emergency: "Emergency",
  corporate: "Corporate",
};

function useMyConnectedPatients() {
  const [patients, setPatients] = useState<RealConnectedPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/doctor/patients", { cache: "no-store" });
      const body = await response.json() as { patients?: RealConnectedPatient[] };
      if (response.ok && body.patients) setPatients(body.patients);
    } finally {
      setLoading(false);
    }
  }, []);

  const removePatient = useCallback(async (patientId: string) => {
    const res = await fetch(`/api/v1/doctor/patients/${patientId}`, { method: "DELETE" });
    if (!res.ok) {
      const fallback = await fetch(`/api/v1/patients/${patientId}`, { method: "DELETE" });
      if (!fallback.ok) throw new Error("Failed to delete patient");
    }
    setPatients((prev) => prev.filter((p) => p.id !== patientId));
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void reload(); });
  }, [reload]);

  return { patients, loading, reload, removePatient };
}

function DoctorPatientDetailsModal({
  patient,
  portalStatus,
  onClose,
  onOpenPortalModal,
  onDeletePatient,
}: {
  patient: RealConnectedPatient | null;
  portalStatus?: { hasPortalAccess: boolean; email?: string };
  onClose: () => void;
  onOpenPortalModal: (p: RealConnectedPatient) => void;
  onDeletePatient?: (p: RealConnectedPatient) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="grid size-14 place-items-center rounded-2xl bg-white/20 text-xl font-black text-white shadow-inner backdrop-blur-md">
                {patient.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black">{patient.displayName}</h3>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                    {patient.mrNumber}
                  </span>
                </div>
                <p className="mt-1 text-xs text-indigo-100">
                  {patient.age ? `${patient.age} yrs` : "Age N/A"} · {humanize(patient.gender)}
                  {patient.fatherName ? ` · s/o / d/o ${patient.fatherName}` : ""}
                  {patient.bloodGroup ? ` · ${patient.bloodGroup}` : ""}
                </p>
              </div>
            </div>
            <button
              className="rounded-xl p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-xs">
          {/* Quick Clinical Handling Actions */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Clinical Action Hub
            </h4>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Link
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3 text-center font-bold text-indigo-900 transition hover:bg-indigo-100 hover:scale-[1.02] dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200"
                href={`/doctor/consultations?patientId=${encodeURIComponent(patient.id)}`}
              >
                <Stethoscope className="size-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[11px] font-black">Start Consultation</span>
              </Link>

              <Link
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-center font-bold text-slate-800 transition hover:bg-slate-100 hover:scale-[1.02] dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                href={`/doctor/register-patient?patientId=${encodeURIComponent(patient.id)}`}
              >
                <CalendarPlus className="size-5 text-violet-600 dark:text-violet-400" />
                <span className="text-[11px] font-black">Book Visit / Queue</span>
              </Link>

              <Link
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-center font-bold text-slate-800 transition hover:bg-slate-100 hover:scale-[1.02] dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                href={`/doctor/documents?patientId=${encodeURIComponent(patient.id)}`}
              >
                <FileHeart className="size-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-black">Medical Documents</span>
              </Link>

              <Link
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-center font-bold text-slate-800 transition hover:bg-slate-100 hover:scale-[1.02] dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                href={`/doctor/results?patientId=${encodeURIComponent(patient.id)}`}
              >
                <Activity className="size-5 text-teal-600 dark:text-teal-400" />
                <span className="text-[11px] font-black">Labs &amp; Results</span>
              </Link>

              <Link
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-center font-bold text-slate-800 transition hover:bg-slate-100 hover:scale-[1.02] dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                href={`/doctor/drains?patientId=${encodeURIComponent(patient.id)}`}
              >
                <FileText className="size-5 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] font-black">Surgical Drains</span>
              </Link>

              <button
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-center font-bold text-slate-800 transition hover:bg-slate-100 hover:scale-[1.02] dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                onClick={() => {
                  onClose();
                  onOpenPortalModal(patient);
                }}
                type="button"
              >
                <KeyRound className="size-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[11px] font-black">
                  {portalStatus?.hasPortalAccess ? "Portal Active" : "Create Portal"}
                </span>
              </button>
            </div>
          </div>

          {/* Demographics & Contact Details */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Identity &amp; Contact Details
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Full Name:</span>
                <p className="font-bold text-slate-900 dark:text-white">{patient.displayName}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Father / Guardian:</span>
                <p className="font-bold text-slate-900 dark:text-white">{patient.fatherName || "Not documented"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Mobile Phone:</span>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 dark:text-white">{patient.mobileNumber || "N/A"}</p>
                  {patient.mobileNumber ? (
                    <a
                      className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-200"
                      href={`tel:${patient.mobileNumber}`}
                    >
                      Call
                    </a>
                  ) : null}
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">CNIC / B-Form:</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white">{patient.identityNumber || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">City / Location:</span>
                <p className="font-bold text-slate-900 dark:text-white">
                  {patient.city || "Islamabad"} {patient.addressLine ? `(${patient.addressLine})` : ""}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Blood Group:</span>
                <p className="font-bold text-slate-900 dark:text-white">{patient.bloodGroup || "Not tested"}</p>
              </div>
              {patient.emergencyContactName ? (
                <div className="sm:col-span-2">
                  <span className="text-slate-500 dark:text-slate-400">Emergency Contact:</span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {patient.emergencyContactName} {patient.emergencyContactPhone ? `(${patient.emergencyContactPhone})` : ""}
                  </p>
                </div>
              ) : null}
              {patient.notes ? (
                <div className="sm:col-span-2 rounded-xl bg-amber-50/80 p-2.5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <span className="block font-black text-[10px] uppercase tracking-wider">Clinical Notes / Allergies:</span>
                  <p className="mt-0.5 font-medium">{patient.notes}</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Clinical Activity & Caseload Record */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Clinical Caseload &amp; History
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Total Encounters:</span>
                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {patient.encounterCount} visit{patient.encounterCount === 1 ? "" : "s"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Last Diagnosis:</span>
                <p className="font-bold text-slate-900 dark:text-white">{patient.lastDiagnosis ?? "Not documented"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Next Scheduled Visit:</span>
                <p className="font-bold text-slate-900 dark:text-white">
                  {patient.nextAppointment
                    ? `${formatDate(patient.nextAppointment.appointmentDate)} · ${patient.nextAppointment.slotStart}`
                    : "None scheduled"}
                </p>
              </div>
            </div>
          </div>

          {/* Record Removal & Archival Danger Zone */}
          {onDeletePatient ? (
            <div className="rounded-2xl border border-rose-200/90 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <Trash2 size={13} />
                    Delete Patient Record
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                    Remove and archive this patient from the active hospital directory.
                  </p>
                </div>

                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-black text-rose-700 shadow-xs hover:bg-rose-50 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 transition"
                  >
                    <Trash2 size={13} />
                    Delete Patient
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-rose-800 dark:text-rose-200">
                      Confirm deletion?
                    </span>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={async () => {
                        setIsDeleting(true);
                        try {
                          await onDeletePatient(patient);
                          onClose();
                        } catch {
                          alert("Failed to delete patient");
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                      className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-700 shadow-xs disabled:opacity-50 transition"
                    >
                      {isDeleting ? "Deleting…" : "Yes, Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
          <Link
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            href={`/doctor/register-patient`}
          >
            <UserPlus size={14} /> Register New Patient
          </Link>
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DoctorPatientPortalModal({
  patient,
  onClose,
  onSuccess,
}: {
  patient: RealConnectedPatient | ConnectedPatient | null;
  onClose: () => void;
  onSuccess?: (email: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [portalStatus, setPortalStatus] = useState<{ hasPortalAccess: boolean; email?: string } | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [provisionResult, setProvisionResult] = useState<{
    email: string;
    temporaryPassword?: string;
    portalUrl: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!patient) return;
    queueMicrotask(() => {
    setLoading(true);
    setError("");
    setProvisionResult(null);
    void fetch(`/api/v1/patients/${patient.id}/portal-credentials`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load status"))))
      .then((data: { hasPortalAccess: boolean; email?: string }) => {
        setPortalStatus(data);
        setEmailInput(data.email || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error checking portal status"))
      .finally(() => setLoading(false));
    });
  }, [patient]);

  if (!patient) return null;

  async function handleProvision(autoGenerate = true) {
    if (!patient) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/patients/${patient.id}/portal-credentials`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim() || undefined,
          password: autoGenerate ? undefined : passwordInput.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { email: string; temporaryPassword?: string; portalUrl?: string; error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || data.message || "Failed to create portal access");
      setProvisionResult({
        email: data.email,
        temporaryPassword: data.temporaryPassword,
        portalUrl: data.portalUrl || "/patient",
      });
      setPortalStatus({ hasPortalAccess: true, email: data.email });
      onSuccess?.(data.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Portal credentials could not be provisioned.");
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string, field: string) {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <KeyRound className="size-5" />
            <div>
              <h3 className="text-base font-black">Patient Portal Access</h3>
              <p className="text-xs text-indigo-100">{patient.displayName} · {patient.mrNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
              {error}
            </div>
          )}

          {/* Current Status */}
          <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <div className="flex items-center gap-2">
              <Globe className="text-indigo-600" size={16} />
              <div>
                <div className="text-xs font-black text-slate-900">Portal Account Status</div>
                <div className="text-[11px] text-slate-500">
                  {loading
                    ? "Checking portal status…"
                    : portalStatus?.hasPortalAccess
                    ? `Active (${portalStatus.email})`
                    : "No active patient portal account"}
                </div>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                portalStatus?.hasPortalAccess
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {portalStatus?.hasPortalAccess ? "🟢 Active" : "⚪ Not Created"}
            </span>
          </div>

          {/* Newly Provisioned Credentials View */}
          {provisionResult ? (
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-900">
                <Check className="size-4 text-emerald-600" />
                <span>Portal Credentials Ready &amp; Active!</span>
              </div>
              <div className="grid gap-2 text-[11px]">
                <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-emerald-100">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400">Login URL</span>
                    <div className="font-bold text-indigo-700">{typeof window !== "undefined" ? window.location.origin : ""}/patient</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText((typeof window !== "undefined" ? window.location.origin : "") + "/patient", "url")}
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                  >
                    {copiedField === "url" ? <Check className="text-emerald-600" size={14} /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-emerald-100">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400">Login Email</span>
                    <div className="font-bold text-slate-800">{provisionResult.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(provisionResult.email, "email")}
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                  >
                    {copiedField === "email" ? <Check className="text-emerald-600" size={14} /> : <Copy size={14} />}
                  </button>
                </div>

                {provisionResult.temporaryPassword && (
                  <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-emerald-100">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400">Temporary Password</span>
                      <div className="font-mono font-black text-slate-900">{provisionResult.temporaryPassword}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(provisionResult.temporaryPassword!, "pw")}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                      {copiedField === "pw" ? <Check className="text-emerald-600" size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-600">
                The patient can use these credentials to log in to <strong>/patient</strong> to view prescriptions, medical records, and join scheduled video consultations.
              </p>
            </div>
          ) : (
            /* Provisioning Form */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Patient Login Email (optional override)</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={`${patient.mrNumber.toLowerCase()}@patient.wonflow.com`}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Custom Password (leave blank for secure auto-generation)</label>
                <input
                  type="text"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="e.g. Patient#Pass2026 (or auto-generate)"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-semibold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleProvision(passwordInput.trim() === "")}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading
                    ? "Generating…"
                    : portalStatus?.hasPortalAccess
                    ? "Reset / Update Credentials"
                    : "⚡ Generate Portal Credentials"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function DoctorPatientsPage() {
  const { patients, loading, removePatient } = useMyConnectedPatients();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PatientFilter>("all");
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<RealConnectedPatient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<RealConnectedPatient | null>(null);
  const [isDirectDeleting, setIsDirectDeleting] = useState(false);
  const [portalModalPatient, setPortalModalPatient] = useState<RealConnectedPatient | null>(null);
  const [portalStatusMap, setPortalStatusMap] = useState<Record<string, { hasPortalAccess: boolean; email?: string }>>({});

  const today = todayValue();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visiblePatients = patients.filter((patient) => {
    const searchText = [
      patient.displayName,
      patient.mrNumber,
      patient.identityNumber,
      patient.mobileNumber,
    ]
      .join(" ")
      .toLocaleLowerCase();
    if (normalizedQuery !== "" && !searchText.includes(normalizedQuery)) return false;

    if (filter === "today") {
      return (
        patient.nextAppointment?.appointmentDate === today ||
        patient.lastActivityAt?.slice(0, 10) === today
      );
    }
    if (filter === "upcoming") return patient.nextAppointment !== undefined;
    if (filter === "follow-ups") {
      return patient.nextAppointment?.serviceName.toLocaleLowerCase().includes("follow-up") ?? false;
    }
    if (filter === "previous") return patient.encounterCount > 0;
    if (filter === "unread") return patient.unreadReports > 0;
    return true;
  });

  useEffect(() => {
    if (visiblePatients.length === 0) return;
    const unverified = visiblePatients.filter((p) => portalStatusMap[p.id] === undefined);
    if (unverified.length === 0) return;

    unverified.forEach((p) => {
      void fetch(`/api/v1/patients/${p.id}/portal-credentials`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { hasPortalAccess: boolean; email?: string } | null) => {
          if (data) {
            setPortalStatusMap((prev) => ({ ...prev, [p.id]: data }));
          }
        })
        .catch(() => {});
    });
  }, [visiblePatients, portalStatusMap]);

  /**
   * Two different questions about the same caseload, so two forms.
   *
   * The donut is part-to-whole: what is my list made of. The bar is
   * magnitude: which patients have the most results waiting on me, ranked
   * — that ordering is the whole point and a donut would destroy it.
   */
  const caseloadMix: DonutSlice[] = [
    {
      id: "today",
      label: "Seen or due today",
      value: patients.filter(
        (patient) =>
          patient.nextAppointment?.appointmentDate === today ||
          patient.lastActivityAt?.slice(0, 10) === today,
      ).length,
      color: "var(--viz-1)",
    },
    {
      id: "upcoming",
      label: "Upcoming appointment",
      value: patients.filter(
        (patient) =>
          patient.nextAppointment !== undefined &&
          patient.nextAppointment.appointmentDate !== today,
      ).length,
      color: "var(--viz-3)",
    },
    {
      id: "unread",
      label: "Unread reports",
      value: patients.filter(
        (patient) => patient.unreadReports > 0 && patient.nextAppointment === undefined,
      ).length,
      color: "var(--viz-4)",
    },
    {
      id: "inactive",
      label: "No activity scheduled",
      value: patients.filter(
        (patient) =>
          patient.nextAppointment === undefined &&
          patient.unreadReports === 0 &&
          patient.lastActivityAt?.slice(0, 10) !== today,
      ).length,
      color: "var(--viz-mute-mark)",
    },
  ].filter((slice) => slice.value > 0);

  const unreadLeaders: BarDatum[] = patients
    .filter((patient) => patient.unreadReports > 0)
    .sort((a, b) => b.unreadReports - a.unreadReports)
    .slice(0, 6)
    .map((patient) => ({
      id: patient.id,
      label: patient.displayName,
      value: patient.unreadReports,
      detail: patient.mrNumber,
    }));

  const filters: Array<{ value: PatientFilter; label: string }> = [
    { value: "all", label: "All Patients" },
    { value: "today", label: "Today" },
    { value: "upcoming", label: "Upcoming" },
    { value: "follow-ups", label: "Follow-ups" },
    { value: "previous", label: "Previous Patients" },
    { value: "unread", label: "Unread Reports" },
  ];

  useEffect(() => {
    const rawAnchor =
      window.location.hash.slice(1);
    if (rawAnchor === "") return;

    let anchor = rawAnchor;
    try {
      anchor = decodeURIComponent(
        rawAnchor,
      );
    } catch {
      return;
    }

    const target =
      document.getElementById(anchor);
    if (target === null) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    target.focus({
      preventScroll: true,
    });
  }, [visiblePatients.length]);

  return (
    <div className="space-y-4">
      <DoctorPageHeader
        description="View all registered hospital patients, medical records, and active clinical caseload."
        icon={<UsersRound size={18} />}
        title="Patients Directory"
      />

      <section className="relative overflow-hidden rounded-[20px] border border-indigo-100/80 bg-gradient-to-r from-white via-slate-50/60 to-indigo-50/70 p-3 shadow-[0_12px_32px_rgba(79,70,229,0.08)]">
        <div className="pointer-events-none absolute -right-10 -top-16 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl" />
        <div className="relative grid gap-2 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Search patients</span>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            <input
              className={`${INPUT_CLASS_NAME} pl-9`}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, MR number, CNIC / passport or mobile"
              type="search"
              value={query}
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((item) => (
              <button
                className={`min-h-9 rounded-xl px-3 text-[11px] font-black transition ${
                  filter === item.value
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                key={item.value}
                onClick={() => setFilter(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {patients.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-2">
          <DonutChart
            title="Your caseload"
            subtitle="Every patient, by where they are"
            slices={caseloadMix}
            centerValue={String(patients.length)}
            centerLabel="Patients"
            size={168}
            thickness={20}
            emptyMessage="No patients yet"
          />

          <BarChart
            title="Patients with unread reports"
            subtitle="Results released but not yet opened by you"
            data={unreadLeaders}
            valueFormatter={(value) => `${value} report${value === 1 ? "" : "s"}`}
            emptyMessage="No unread reports"
            emptyHint="Every released result for your patients has been reviewed."
            footnote="Ranked highest first. Darker bars carry more unread results."
          />
        </section>
      ) : null}

      <div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
        <div>
          <h2 className="text-sm font-black text-slate-950">Patient Directory</h2>
          <p className="text-[11px] text-slate-500">
            {visiblePatients.length} of {patients.length} patients shown · Click any patient card for details &amp; clinical actions
          </p>
        </div>
        <StatusPill tone="indigo">Hospital Records</StatusPill>
      </div>

      {loading ? (
        <p className="p-6 text-center text-xs font-bold text-slate-500">Loading patients…</p>
      ) : visiblePatients.length === 0 ? (
        <EmptyState
          description={
            patients.length === 0
              ? "No registered patients in hospital directory yet. Click 'Register Patient' to create a record."
              : "No patient matches the current search and filter."
          }
          icon={<UserRound size={19} />}
          title={patients.length === 0 ? "No patients found" : "No matching patients"}
        />
      ) : (
        <div className="grid gap-3.5 xl:grid-cols-2">
          {visiblePatients.map((patient) => {
            const portalAccessInfo = portalStatusMap[patient.id];
            return (
              <article
                className="group relative isolate cursor-pointer overflow-hidden rounded-[22px] border border-indigo-100/90 bg-gradient-to-br from-white via-white to-indigo-50/50 p-4 shadow-[0_12px_30px_rgba(79,70,229,0.06)] transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-[0_20px_45px_rgba(79,70,229,0.14)] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                id={`doctor-patient-${patient.id}`}
                key={patient.id}
                onClick={() => setSelectedPatientDetails(patient)}
                tabIndex={0}
              >
                <div className="flex items-start gap-3.5">
                  <PatientAvatar patient={patient} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-black text-slate-950 group-hover:text-indigo-600 transition">
                            {patient.displayName}
                          </h3>
                          <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {patient.mrNumber}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
                          {patient.age === undefined ? "Age not recorded" : `${patient.age} yrs`} ·{" "}
                          {humanize(patient.gender)} · {patient.mobileNumber || "No mobile"}
                        </p>
                      </div>
                      {patient.unreadReports > 0 ? (
                        <StatusPill tone="amber">
                          {patient.unreadReports} unread report
                          {patient.unreadReports === 1 ? "" : "s"}
                        </StatusPill>
                      ) : null}
                    </div>

                    {patient.referralSource ? (
                      <span className="mt-1.5 inline-block rounded-full bg-slate-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        Source: {REFERRAL_SOURCE_LABELS[patient.referralSource] ?? humanize(patient.referralSource)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Patient Portal Status & Quick Toggle */}
                <div
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-indigo-100/70 bg-gradient-to-r from-indigo-50/60 to-white p-2.5 dark:border-indigo-400/25 dark:from-indigo-500/12 dark:to-transparent"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Globe className="text-indigo-600 size-3.5" />
                    {portalAccessInfo?.hasPortalAccess ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        Portal Active ({portalAccessInfo.email || "Registered"})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-300">
                        <span className="size-2 rounded-full bg-slate-300" />
                        Portal Not Created
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPortalModalPatient(patient);
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black transition ${
                      portalAccessInfo?.hasPortalAccess
                        ? "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-sm dark:bg-indigo-500/15 dark:text-indigo-200 dark:border-indigo-400/30 dark:hover:bg-indigo-500/25"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                    }`}
                  >
                    <KeyRound size={11} />
                    {portalAccessInfo?.hasPortalAccess ? "Manage Portal" : "+ Create Portal Access"}
                  </button>
                </div>

                <dl className="mt-3 grid gap-3 rounded-[15px] border border-white bg-gradient-to-r from-slate-50 via-indigo-50/50 to-cyan-50/45 p-3 shadow-inner sm:grid-cols-3 dark:border-white/10 dark:from-white/[0.04] dark:via-indigo-500/10 dark:to-cyan-500/10">
                  <div>
                    <dt className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                      Last visit
                    </dt>
                    <dd className="mt-1 text-[11px] font-bold text-slate-700">
                      {formatDate(patient.lastActivityAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                      Last diagnosis
                    </dt>
                    <dd className="mt-1 line-clamp-2 text-[11px] font-bold text-slate-700">
                      {patient.lastDiagnosis ?? "Not documented"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                      Next appointment
                    </dt>
                    <dd className="mt-1 text-[11px] font-bold text-slate-700">
                      {patient.nextAppointment
                        ? `${formatDate(patient.nextAppointment.appointmentDate)} · ${patient.nextAppointment.slotStart}`
                        : "None scheduled"}
                    </dd>
                  </div>
                </dl>

                {/* Direct Action Buttons on Card */}
                <div
                  className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100/80 pt-3 dark:border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] font-bold text-slate-500">
                    {patient.encounterCount} encounter{patient.encounterCount === 1 ? "" : "s"}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      onClick={() => setSelectedPatientDetails(patient)}
                      type="button"
                    >
                      <Eye size={12} className="text-slate-500" />
                      Details &amp; History
                    </button>

                    <Link
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-[10px] font-black text-white hover:bg-emerald-700 shadow-xs"
                      href={`/doctor/consultations?patientId=${encodeURIComponent(patient.id)}`}
                    >
                      <Stethoscope size={12} />
                      Consult
                    </Link>

                    <Link
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 text-[10px] font-black text-white hover:bg-indigo-700 shadow-xs"
                      href={`/doctor/register-patient?patientId=${encodeURIComponent(patient.id)}`}
                    >
                      <CalendarPlus size={12} />
                      Book Visit
                    </Link>

                    <button
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/80 px-2 text-[10px] font-bold text-rose-700 shadow-xs hover:bg-rose-100 hover:border-rose-300 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPatientToDelete(patient);
                      }}
                      title="Delete Patient from Directory"
                      type="button"
                    >
                      <Trash2 size={11} className="text-rose-600" />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Comprehensive Patient Details & Action Hub Modal */}
      {selectedPatientDetails && (
        <DoctorPatientDetailsModal
          onClose={() => setSelectedPatientDetails(null)}
          onDeletePatient={async (p) => {
            await removePatient(p.id);
            setSelectedPatientDetails(null);
          }}
          onOpenPortalModal={(p) => setPortalModalPatient(p)}
          patient={selectedPatientDetails}
          portalStatus={portalStatusMap[selectedPatientDetails.id]}
        />
      )}

      {/* Direct Delete Patient Confirmation Dialog */}
      {patientToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900/60 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950">
                <AlertTriangle size={22} />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-950 dark:text-white">
                  Delete Patient Record
                </h3>
                <p className="text-xs text-slate-500">
                  Confirm removal from directory
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong>{patientToDelete.displayName}</strong> (MRN: <code>{patientToDelete.mrNumber}</code>)? This will archive their patient file and remove them from the active directory.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDirectDeleting}
                onClick={() => setPatientToDelete(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDirectDeleting}
                onClick={async () => {
                  setIsDirectDeleting(true);
                  try {
                    await removePatient(patientToDelete.id);
                    setPatientToDelete(null);
                  } catch {
                    alert("Failed to delete patient");
                  } finally {
                    setIsDirectDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 shadow-md shadow-rose-600/20 disabled:opacity-50 transition"
              >
                <Trash2 size={13} />
                {isDirectDeleting ? "Deleting…" : "Yes, Delete Patient"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Portal Credentials Management Modal */}
      {portalModalPatient && (
        <DoctorPatientPortalModal
          patient={portalModalPatient}
          onClose={() => setPortalModalPatient(null)}
          onSuccess={(email) => {
            setPortalStatusMap((prev) => ({
              ...prev,
              [portalModalPatient.id]: { hasPortalAccess: true, email },
            }));
          }}
        />
      )}
    </div>
  );
}

type InboxFilter = "all" | "unread" | "flagged" | "laboratory" | "radiology";

export function DoctorInboxPage() {
  const { doctorId } = useDoctorPortalContext();
  const data = useDoctorSecondaryData();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const patients = useMemo(
    () => buildConnectedPatients(doctorId, data),
    [data, doctorId],
  );
  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const items = useMemo(() => buildInboxItems(doctorId, data), [data, doctorId]);
  const visibleItems = items.filter((item) => {
    if (filter === "unread") return !item.reviewed;
    if (filter === "flagged") return item.severity !== "normal";
    if (filter === "laboratory" || filter === "radiology") return item.kind === filter;
    return true;
  });
  const unread = items.filter((item) => !item.reviewed).length;
  const flagged = items.filter((item) => item.severity !== "normal").length;

  /**
   * The review backlog, two ways.
   *
   * Severity is a clinical state, so it takes the status palette and each
   * slice always carries its word — a critical result must never depend on
   * a reader separating red from amber. The source split is plain
   * identity, so it takes categorical slots.
   */
  const severityMix: DonutSlice[] = [
    {
      id: "critical",
      label: "Critical",
      value: items.filter((item) => item.severity === "critical").length,
      color: "var(--viz-critical)",
    },
    {
      id: "abnormal",
      label: "Abnormal",
      value: items.filter((item) => item.severity === "abnormal").length,
      color: "var(--viz-warning)",
    },
    {
      id: "normal",
      label: "Normal",
      value: items.filter((item) => item.severity === "normal").length,
      color: "var(--viz-good)",
    },
  ].filter((slice) => slice.value > 0);

  const sourceMix: DonutSlice[] = [
    {
      id: "laboratory",
      label: "Laboratory",
      value: items.filter((item) => item.kind === "laboratory").length,
      color: "var(--viz-1)",
    },
    {
      id: "radiology",
      label: "Radiology",
      value: items.filter((item) => item.kind === "radiology").length,
      color: "var(--viz-2)",
    },
  ].filter((slice) => slice.value > 0);

  return (
    <div className="space-y-4">
      <DoctorPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="wf-button-secondary" href="/doctor/results">
              Laboratory
            </Link>
            <Link className="wf-button-secondary" href="/doctor/radiology-results">
              Radiology
            </Link>
          </div>
        }
        description="Finalized and result-ready diagnostic records assigned to you for review."
        icon={<FileText size={18} />}
        title="Reports & Documents"
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MetricCard helper="Available reports" label="Diagnostic records" value={items.length} />
        <MetricCard helper="Not yet reviewed" label="Awaiting review" tone="amber" value={unread} />
        <MetricCard helper="Abnormal or critical" label="Flagged" tone="rose" value={flagged} />
        <MetricCard
          helper="Storage not connected"
          label="Patient uploads"
          tone="slate"
          value="—"
        />
      </div>

      {items.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-3">
          <DonutChart
            title="Results by severity"
            subtitle="Every report assigned to you"
            slices={severityMix}
            centerValue={String(items.length)}
            centerLabel="Reports"
            size={168}
            thickness={20}
            emptyMessage="No reports assigned"
          />

          <DonutChart
            title="Results by source"
            subtitle="Laboratory against radiology"
            slices={sourceMix}
            centerLabel="Reports"
            size={168}
            thickness={20}
            emptyMessage="No reports assigned"
          />

          <div className="wf-viz flex flex-col justify-center rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
            <RadialMeter
              value={items.length - unread}
              target={items.length}
              label="Review progress"
              caption={`${unread} still awaiting your review`}
              size={132}
              thickness={11}
              status={unread === 0 ? "good" : flagged > 0 ? "critical" : "warning"}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["all", "All"],
              ["unread", "Unreviewed"],
              ["flagged", "Flagged"],
              ["laboratory", "Laboratory"],
              ["radiology", "Radiology"],
            ] as const
          ).map(([value, label]) => (
            <button
              className={`min-h-9 rounded-xl px-3 text-[11px] font-black ${
                filter === value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
          <button
            className="min-h-9 cursor-not-allowed rounded-xl bg-slate-50 px-3 text-[11px] font-black text-slate-400 ring-1 ring-slate-200"
            disabled
            title="Patient-upload storage will be connected in a later milestone."
            type="button"
          >
            Uploaded Documents
          </button>
        </div>
      </section>

      {visibleItems.length === 0 ? (
        <EmptyState
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link className="wf-button-secondary" href="/doctor/results">
                Open Laboratory Worklist
              </Link>
              <Link className="wf-button-secondary" href="/doctor/radiology-results">
                Open Radiology Worklist
              </Link>
            </div>
          }
          description={
            items.length === 0
              ? "No result-ready or finalized diagnostic reports are currently assigned to this doctor. Patient-upload storage is not connected yet."
              : "No reports match the selected inbox filter."
          }
          icon={<FileText size={19} />}
          title={items.length === 0 ? "Inbox is clear" : "No matching reports"}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {visibleItems.map((item) => {
            const patient = patientsById.get(item.patientId);
            return (
              <article
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                key={`${item.kind}-${item.id}`}
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                    item.kind === "laboratory"
                      ? "bg-cyan-50 text-cyan-700"
                      : "bg-violet-50 text-violet-700"
                  }`}
                >
                  {item.kind === "laboratory" ? (
                    <FlaskConical size={18} />
                  ) : (
                    <ImageIcon size={18} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-sm font-black text-slate-950">
                      {item.title}
                    </h3>
                    <StatusPill
                      tone={
                        item.severity === "critical"
                          ? "rose"
                          : item.severity === "abnormal"
                            ? "amber"
                            : "emerald"
                      }
                    >
                      {humanize(item.severity)}
                    </StatusPill>
                    {!item.reviewed ? <StatusPill tone="indigo">Unreviewed</StatusPill> : null}
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-slate-600">
                    {patient?.displayName ?? "Patient record unavailable"} ·{" "}
                    {patient?.mrNumber ?? item.patientId}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {humanize(item.kind)} · {humanize(item.status)} · {formatDateTime(item.updatedAt)}
                  </p>
                </div>
                <Link
                  className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 text-[11px] font-black text-white"
                  href={item.href}
                >
                  Review <ChevronRight size={13} />
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DoctorHistoryPage() {
  const { doctorId } = useDoctorPortalContext();
  const {
    locations,
    matchesLegacyBranch,
    selectedLocation,
  } = usePracticeLocation();
  const data = useDoctorSecondaryData();
  const [query, setQuery] = useState("");
  const patients = useMemo(
    () => buildConnectedPatients(doctorId, data),
    [data, doctorId],
  );
  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const locationsByBranchId = useMemo(
    () => new Map(
      locations
        .filter((location) => location.linkedBranchId !== undefined)
        .map((location) => [location.linkedBranchId!, location]),
    ),
    [locations],
  );
  const documentationByEncounterId = useMemo(
    () => new Map(data.documentation.map((record) => [record.encounterId, record])),
    [data.documentation],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const completed = data.encounters
    .filter(
      (encounter) =>
        encounter.practitionerId === doctorId &&
        encounter.status === "completed" &&
        matchesLegacyBranch(encounter.branchId),
    )
    .filter((encounter) => {
      if (normalizedQuery === "") return true;
      const patient = patientsById.get(encounter.patientId);
      const documentation = documentationByEncounterId.get(encounter.id);
      return [
        patient?.displayName ?? "",
        patient?.mrNumber ?? "",
        encounter.encounterNumber,
        encounter.reasonForVisit,
        ...((documentation?.diagnoses ?? []).map((diagnosis) => diagnosis.diagnosis)),
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    })
    .sort((left, right) =>
      (right.completedAt ?? right.updatedAt).localeCompare(
        left.completedAt ?? left.updatedAt,
      ),
    );

  return (
    <div className="space-y-4">
      <DoctorPageHeader
        description="Completed clinical encounters documented under the active doctor."
        icon={<History size={18} />}
        title="Consultation History"
      />

      <label className="relative block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <span className="sr-only">Search consultation history</span>
        <Search
          aria-hidden="true"
          className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
          size={15}
        />
        <input
          className={`${INPUT_CLASS_NAME} pl-9`}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search patient, MR number, encounter, reason or diagnosis"
          type="search"
          value={query}
        />
      </label>

      {completed.length === 0 ? (
        <EmptyState
          description={
            normalizedQuery === ""
              ? selectedLocation !== undefined &&
                selectedLocation.linkedBranchId === undefined
                ? "This worklist has no branch-linked demo records for the selected external location."
                : "No items at this location"
              : "No completed encounter matches the current search."
          }
          icon={<History size={19} />}
          title="No consultation history"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[130px_minmax(180px,1fr)_minmax(220px,1.2fr)_150px_130px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 lg:grid">
            <span>Date</span>
            <span>Patient</span>
            <span>Diagnosis / reason</span>
            <span>Branch</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-slate-100">
            {completed.map((encounter) => {
              const patient = patientsById.get(encounter.patientId);
              const documentation = documentationByEncounterId.get(encounter.id);
              const diagnosis = documentation?.diagnoses.find(
                (record) => record.diagnosis.trim() !== "",
              )?.diagnosis;
              const followUp = documentation?.followUpPlan.trim();

              return (
                <article
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[130px_minmax(180px,1fr)_minmax(220px,1.2fr)_150px_130px] lg:items-center"
                  key={encounter.id}
                >
                  <div>
                    <p className="text-xs font-black text-slate-800">
                      {formatDate(encounter.completedAt ?? encounter.updatedAt)}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-400">
                      {encounter.encounterNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">
                      {patient?.displayName ?? "Patient record unavailable"}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-indigo-600">
                      {patient?.mrNumber ?? encounter.patientId}
                    </p>
                  </div>
                  <div>
                    <p className="line-clamp-2 text-xs font-bold text-slate-700">
                      {diagnosis ?? encounter.reasonForVisit ?? "Not documented"}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {followUp ? "Follow-up plan documented" : "No follow-up plan recorded"}
                    </p>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-600">
                    {locationsByBranchId.get(encounter.branchId)?.name ?? "Unknown location"}
                  </p>
                  <Link
                    className="inline-flex min-h-9 items-center justify-center rounded-xl bg-indigo-50 px-3 text-[10px] font-black text-indigo-700 ring-1 ring-indigo-100"
                    href={`/doctor/encounters/${encodeURIComponent(encounter.id)}`}
                  >
                    Open Summary
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type FollowUpState = "all" | "due-today" | "upcoming" | "overdue" | "completed";

function appointmentFollowUpState(appointment: DemoAppointmentBooking): Exclude<FollowUpState, "all"> {
  if (appointment.status === "completed") return "completed";
  const today = todayValue();
  if (appointment.appointmentDate === today) return "due-today";
  return appointment.appointmentDate > today ? "upcoming" : "overdue";
}

export function DoctorFollowUpsPage() {
  const { doctorId } = useDoctorPortalContext();
  const data = useDoctorSecondaryData();
  const [filter, setFilter] = useState<FollowUpState>("all");
  const patients = useMemo(
    () => buildConnectedPatients(doctorId, data),
    [data, doctorId],
  );
  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const followUps = data.appointments
    .filter(
      (appointment) =>
        appointment.practitionerId === doctorId &&
        appointment.serviceName.toLocaleLowerCase().includes("follow-up") &&
        appointment.status !== "cancelled" &&
        appointment.status !== "no-show",
    )
    .sort((left, right) => left.scheduledStartAt.localeCompare(right.scheduledStartAt));
  const visibleFollowUps = followUps.filter(
    (appointment) =>
      filter === "all" || appointmentFollowUpState(appointment) === filter,
  );
  const encountersById = new Map(data.encounters.map((encounter) => [encounter.id, encounter]));
  const unstructuredPlans = data.documentation
    .filter(
      (record) =>
        record.practitionerId === doctorId && record.followUpPlan.trim() !== "",
    )
    .filter((record) => {
      const encounter = encountersById.get(record.encounterId);
      return (
        encounter !== undefined &&
        !followUps.some((appointment) => appointment.id === encounter.appointmentId)
      );
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const counts = {
    "due-today": followUps.filter(
      (appointment) => appointmentFollowUpState(appointment) === "due-today",
    ).length,
    upcoming: followUps.filter(
      (appointment) => appointmentFollowUpState(appointment) === "upcoming",
    ).length,
    overdue: followUps.filter(
      (appointment) => appointmentFollowUpState(appointment) === "overdue",
    ).length,
    completed: followUps.filter(
      (appointment) => appointmentFollowUpState(appointment) === "completed",
    ).length,
  };

  return (
    <div className="space-y-4">
      <DoctorPageHeader
        description="Structured follow-up appointments plus documented plans that still need scheduling."
        icon={<CalendarClock size={18} />}
        title="Follow-ups"
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MetricCard helper="Scheduled for today" label="Due today" tone="indigo" value={counts["due-today"]} />
        <MetricCard helper="Future bookings" label="Upcoming" tone="emerald" value={counts.upcoming} />
        <MetricCard helper="Past open bookings" label="Overdue" tone="rose" value={counts.overdue} />
        <MetricCard helper="Completed bookings" label="Completed" tone="slate" value={counts.completed} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["due-today", "Due Today"],
              ["upcoming", "Upcoming"],
              ["overdue", "Overdue"],
              ["completed", "Completed"],
            ] as const
          ).map(([value, label]) => (
            <button
              className={`min-h-9 rounded-xl px-3 text-[11px] font-black ${
                filter === value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {visibleFollowUps.length === 0 ? (
        <EmptyState
          description={
            followUps.length === 0
              ? "No structured follow-up appointments are currently connected to this doctor."
              : "No follow-up appointments match the selected status."
          }
          icon={<CalendarClock size={19} />}
          title="No follow-ups in this view"
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {visibleFollowUps.map((appointment) => {
            const patient = patientsById.get(appointment.patientId);
            const state = appointmentFollowUpState(appointment);
            return (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                key={appointment.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {patient?.displayName ?? "Patient record unavailable"}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold text-indigo-600">
                      {patient?.mrNumber ?? appointment.patientId} · {appointment.appointmentNumber}
                    </p>
                  </div>
                  <StatusPill
                    tone={
                      state === "completed"
                        ? "emerald"
                        : state === "overdue"
                          ? "rose"
                          : state === "due-today"
                            ? "indigo"
                            : "amber"
                    }
                  >
                    {humanize(state)}
                  </StatusPill>
                </div>
                <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                  <p className="text-[11px] font-bold text-slate-700">
                    <Clock3 className="mr-1 inline" size={12} />
                    {formatDate(appointment.appointmentDate)} · {appointment.slotStart}
                  </p>
                  <p className="text-[11px] font-bold text-slate-700">
                    {appointment.serviceName}
                  </p>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  {appointment.reasonForVisit || "No follow-up reason recorded."}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {unstructuredPlans.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <FileClock className="mt-0.5 shrink-0 text-amber-700" size={18} />
            <div>
              <h2 className="text-sm font-black text-amber-950">
                Documented plans without structured due dates
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-amber-800">
                These are clinician-entered notes, so WonFlow does not infer due, overdue or completed status.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {unstructuredPlans.slice(0, 6).map((record) => {
              const encounter = encountersById.get(record.encounterId);
              const patient = encounter ? patientsById.get(encounter.patientId) : undefined;
              return (
                <article className="rounded-xl bg-white p-3 ring-1 ring-amber-100" key={record.id}>
                  <p className="text-[11px] font-black text-slate-900">
                    {patient?.displayName ?? "Patient record unavailable"}
                  </p>
                  <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-slate-600">
                    {record.followUpPlan}
                  </p>
                  {encounter ? (
                    <Link
                      className="mt-2 inline-flex text-[10px] font-black text-indigo-700"
                      href={`/doctor/encounters/${encodeURIComponent(encounter.id)}`}
                    >
                      Open consultation summary
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DoctorProfileEditor({
  doctor,
  onSaved,
}: {
  doctor: DoctorPortalIdentity;
  onSaved(): void;
}) {
  const { branches } = useDoctorPortalContext();
  const [form, setForm] = useState({
    displayName: doctor.displayName,
    title: doctor.title ?? "Doctor",
    specialtyName: doctor.specialtyName,
    registrationNumber: doctor.registrationNumber ?? "",
    qualifications: doctor.qualifications ?? "",
    contactPhone: doctor.contactPhone ?? "",
    biography: doctor.biography ?? "",
    primaryBranchId: doctor.primaryBranchId,
    durationMinutes: doctor.durationMinutes ?? 15,
    publiclyBookable: doctor.publiclyBookable ?? false,
    profileImageData: doctor.profileImageUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  function update<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(undefined);
    setError(undefined);
  }

  function selectPhoto(file?: File) {
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"] as string[]).includes(file.type) || file.size > 1_000_000) {
      setError("Choose a JPG, PNG or WebP image smaller than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("profileImageData", String(reader.result));
    reader.onerror = () => setError("The selected photo could not be read.");
    reader.readAsDataURL(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(undefined);
    setError(undefined);
    try {
      await phaseOneApi<{ profile: DoctorPortalIdentity }>("/api/v1/doctor/profile", {
        method: "PATCH",
        body: JSON.stringify({ ...form, profileImageData: form.profileImageData || null }),
      });
      setMessage("Your profile has been saved and updated across the doctor portal.");
      // The application shell keeps the profile photo outside the session, so
      // tell it to re-read the new one.
      window.dispatchEvent(new Event(WONFLOW_AVATAR_CHANGED_EVENT));
      window.setTimeout(onSaved, 500);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const field = "mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const label = "text-[10px] font-black uppercase tracking-wide text-slate-500";

  return (
    <form className="p-5" onSubmit={save}>
      <AddHospitalBranchModal
        isOpen={showAddBranchModal}
        onClose={() => setShowAddBranchModal(false)}
        onCreated={(newBranch) => {
          update("primaryBranchId", newBranch.id);
          setMessage(`Branch "${newBranch.name}" created and set as primary location.`);
          onSaved();
        }}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-5 text-center">
          <DoctorProfileAvatar
            className="mx-auto h-32 w-32 rounded-full text-2xl shadow-[0_14px_34px_rgba(79,70,229,0.18)] ring-4 ring-white"
            name={form.displayName}
            profileImageUrl={form.profileImageData || undefined}
          />
          <h3 className="mt-4 text-sm font-black text-slate-950">{form.displayName || "Doctor profile"}</h3>
          <p className="mt-1 text-[10px] font-semibold text-slate-500">{form.specialtyName || "Add your specialty"}</p>
          <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-xs font-black text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50">
            <Upload size={15} /> Upload photo
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => selectPhoto(event.target.files?.[0])}
              type="file"
            />
          </label>
          {form.profileImageData ? (
            <button className="mt-2 block w-full text-[10px] font-bold text-rose-600" onClick={() => update("profileImageData", "")} type="button">
              Remove photo
            </button>
          ) : null}
          <p className="mt-3 text-[9px] leading-4 text-slate-500">JPG, PNG or WebP. Maximum size 1 MB.</p>
        </aside>

        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <div className="border-b border-slate-200 pb-3 sm:col-span-2">
            <h3 className="text-sm font-black text-slate-950">Professional information</h3>
            <p className="mt-1 text-[10px] text-slate-500">Details patients and hospital teams use to identify you.</p>
          </div>
          <label className={label}>Full name<input className={field} onChange={(event) => update("displayName", event.target.value)} required value={form.displayName} /></label>
          <label className={label}>Professional title<input className={field} onChange={(event) => update("title", event.target.value)} value={form.title} /></label>
          <label className={label}>Specialty / department<input className={`${field} bg-slate-50 text-slate-500`} disabled title="Assigned by the hospital administrator" value={form.specialtyName} /></label>
          <label className={label}>Registration number<input className={field} onChange={(event) => update("registrationNumber", event.target.value)} value={form.registrationNumber} /></label>
          <label className={label}>Qualifications<input className={field} onChange={(event) => update("qualifications", event.target.value)} placeholder="MBBS, FCPS, MRCP..." value={form.qualifications} /></label>
          <label className={label}>Contact phone<input className={field} onChange={(event) => update("contactPhone", event.target.value)} type="tel" value={form.contactPhone} /></label>
          <div className="mt-3 border-b border-slate-200 pb-3 sm:col-span-2">
            <h3 className="text-sm font-black text-slate-950">Hospital assignment</h3>
            <p className="mt-1 text-[10px] text-slate-500">Your secure account identifiers and default working location.</p>
          </div>
          <label className={label}>Login email<input className={`${field} bg-slate-50 text-slate-500`} disabled value={doctor.email ?? ""} /></label>
          <label className={label}>Employee number<input className={`${field} bg-slate-50 text-slate-500`} disabled value={doctor.employeeNumber} /></label>
          <div>
            <div className="flex items-center justify-between">
              <label className={label}>Primary location</label>
              <button
                className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-800"
                onClick={() => setShowAddBranchModal(true)}
                type="button"
              >
                <Plus size={10} /> Add branch
              </button>
            </div>
            <select className={field} onChange={(event) => update("primaryBranchId", event.target.value)} value={form.primaryBranchId}>
              <option value="">Select location</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
          <label className={label}>Default consultation minutes<input className={field} max={480} min={5} onChange={(event) => update("durationMinutes", Number(event.target.value))} type="number" value={form.durationMinutes} /></label>
          <div className="mt-3 border-b border-slate-200 pb-3 sm:col-span-2">
            <h3 className="text-sm font-black text-slate-950">Patient-facing profile</h3>
            <p className="mt-1 text-[10px] text-slate-500">Introduce your experience and control appointment visibility.</p>
          </div>
          <label className={`${label} sm:col-span-2`}>Professional biography<textarea className="mt-1 min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" onChange={(event) => update("biography", event.target.value)} placeholder="Share your clinical experience, interests and approach to patient care..." value={form.biography} /></label>
          <label className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs font-bold text-indigo-950 sm:col-span-2">
            <input checked={form.publiclyBookable} onChange={(event) => update("publiclyBookable", event.target.checked)} type="checkbox" /> Allow patients to book my published services
          </label>
        </div>
      </div>
      {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
      {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{message}</p> : null}
      <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
        <button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60" disabled={saving} type="submit">
          <Save size={15} /> {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </form>
  );
}

export function DoctorProfilePage() {
  const { doctor, doctorId, reload } = useDoctorPortalContext();
  const {
    locations,
    matchesLegacyBranch,
  } = usePracticeLocation();
  const data = useDoctorSecondaryData();
  const schedules = data.schedules
    .filter(
      (schedule) =>
        schedule.practitionerId === doctorId &&
        matchesLegacyBranch(schedule.branchId),
    )
    .sort(
      (left, right) =>
        left.dayOfWeek - right.dayOfWeek || left.startTime.localeCompare(right.startTime),
    );
  const locationsByBranchId = new Map(
    locations
      .filter((location) => location.linkedBranchId !== undefined)
      .map((location) => [location.linkedBranchId!, location]),
  );
  return (
    <div className="space-y-4">
      <DoctorPageHeader
        description="Manage your practitioner identity and hospital profile."
        icon={<UserRound size={18} />}
        title="My Profile"
      />

      {doctor === undefined ? (
        <EmptyState
          description="Select an available practitioner before opening the Doctor profile."
          icon={<UserRound size={19} />}
          title="Doctor profile unavailable"
        />
      ) : (
        <>
          <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/60 px-5 py-4 text-slate-950">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-indigo-600">
                      WonFlow practitioner profile
                    </p>
                    <h2 className="mt-1 text-xl font-black">{doctor.displayName}</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {doctor.specialtyName} · Employee {doctor.employeeNumber}
                    </p>
                  </div>
                </div>
                <p className="max-w-64 text-[10px] leading-4 text-slate-500">
                  Manage your professional details and profile photo below. Changes are shown throughout your doctor portal.
                </p>
              </div>
            </div>
            <DoctorProfileEditor doctor={doctor} onSaved={reload} />
          </section>

          <section className="hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-950">Weekly schedule</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Current working blocks from Doctor Schedule.
                </p>
              </div>
              <Link className="wf-button-secondary" href="/doctor/schedule">
                Manage Schedule
              </Link>
            </div>
            {schedules.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs font-semibold text-slate-500">
                No weekly schedule blocks are configured.
              </div>
            ) : (
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {schedules.map((schedule) => (
                  <article
                    className={`rounded-xl border p-3 ${
                      schedule.active
                        ? "border-indigo-100 bg-indigo-50/50"
                        : "border-slate-200 bg-slate-50 opacity-65"
                    }`}
                    key={schedule.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-900">
                        {DAY_NAMES[schedule.dayOfWeek]}
                      </p>
                      <StatusPill tone={schedule.active ? "emerald" : "slate"}>
                        {schedule.active ? "Active" : "Inactive"}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-[11px] font-bold text-indigo-700">
                      {schedule.startTime}–{schedule.endTime}
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-500">
                      {locationsByBranchId.get(schedule.branchId)?.name ?? "Unknown location"} ·{" "}
                      {schedule.appointmentDurationMinutes} min · {schedule.maximumPatients} patients
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

type AppointmentView = "today" | "upcoming" | "all";

export function DoctorAppointmentsPage() {
  const { doctorId } = useDoctorPortalContext();
  const data = useDoctorSecondaryData();
  const [view, setView] = useState<AppointmentView>("today");
  const today = todayValue();
  const patients = new Map(buildConnectedPatients(doctorId, data).map((patient) => [patient.id, patient]));
  const appointments = data.appointments
    .filter((appointment) => appointment.practitionerId === doctorId)
    .sort((left, right) => left.scheduledStartAt.localeCompare(right.scheduledStartAt));
  const visible = appointments.filter((appointment) =>
    view === "all"
      ? true
      : view === "today"
        ? appointment.appointmentDate === today
        : appointment.appointmentDate > today && !["cancelled", "completed", "no-show"].includes(appointment.status),
  );
  const todayCount = appointments.filter((appointment) => appointment.appointmentDate === today).length;
  const upcomingCount = appointments.filter((appointment) => appointment.appointmentDate > today && !["cancelled", "completed", "no-show"].includes(appointment.status)).length;
  const waitingCount = data.queueEntries.filter((entry) => entry.practitionerId === doctorId && ["waiting", "called"].includes(entry.status)).length;

  return (
    <div className="space-y-4">
      <DoctorPageHeader description="Review your confirmed schedule, patient arrival status and consultation queue." icon={<CalendarClock size={18} />} title="Appointments" />
      <section className="grid gap-3 sm:grid-cols-3">
        {[{ label: "Today", value: todayCount, tone: "from-indigo-500 to-violet-600" }, { label: "Upcoming", value: upcomingCount, tone: "from-cyan-500 to-blue-600" }, { label: "Waiting now", value: waitingCount, tone: "from-emerald-500 to-teal-600" }].map((metric) => <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={metric.label}><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${metric.tone} text-white`}><CalendarClock size={17} /></span><div><p className="text-xl font-black text-slate-950">{metric.value}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{metric.label}</p></div></div></div>)}
      </section>
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-5 py-4"><div><h2 className="text-sm font-black text-slate-950">My appointment schedule</h2><p className="mt-1 text-[10px] text-slate-500">Appointments assigned to your practitioner profile.</p></div><div className="flex rounded-xl bg-slate-100 p-1">{(["today", "upcoming", "all"] as const).map((item) => <button className={`rounded-lg px-3 py-2 text-[10px] font-black capitalize ${view === item ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`} key={item} onClick={() => setView(item)} type="button">{item}</button>)}</div></div>
        {visible.length === 0 ? <div className="m-5"><EmptyState action={<Link className="wf-button-secondary" href="/doctor/queue">Open patient queue</Link>} description={view === "today" ? "No appointments are assigned to you for today." : "No appointments match this view."} icon={<CalendarClock size={20} />} title="No appointments found" /></div> : <div className="divide-y divide-slate-100">{visible.map((appointment) => {
          const patient = patients.get(appointment.patientId);
          const queueEntry = data.queueEntries.find((entry) => entry.appointmentId === appointment.id);
          const statusTone = appointment.status === "completed" ? "emerald" : appointment.status === "cancelled" || appointment.status === "no-show" ? "rose" : appointment.appointmentDate === today ? "indigo" : "amber";
          return <article className="grid gap-4 p-5 transition hover:bg-slate-50/70 lg:grid-cols-[110px_minmax(0,1fr)_180px] lg:items-center" key={appointment.id}><div><p className="text-lg font-black text-indigo-700">{appointment.slotStart}</p><p className="text-[10px] font-semibold text-slate-500">{formatDate(appointment.appointmentDate)}</p></div><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-black text-indigo-700">{getInitials(patient?.displayName ?? "Patient")}</span><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-950">{patient?.displayName ?? "Patient record"}</h3><p className="mt-1 text-[10px] font-semibold text-slate-500">{patient?.mrNumber ?? appointment.patientId} · {appointment.serviceName} · {appointment.durationMinutes} min</p><p className="mt-1 truncate text-[10px] text-slate-600">{appointment.reasonForVisit || "No appointment reason recorded."}</p></div></div><div className="flex items-center justify-between gap-2 lg:justify-end"><StatusPill tone={statusTone}>{humanize(queueEntry?.status ?? appointment.status)}</StatusPill><Link className="rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black text-white hover:bg-indigo-700" href={queueEntry ? `/doctor/consultations?queueEntryId=${encodeURIComponent(queueEntry.id)}` : "/doctor/queue"}>{queueEntry?.status === "serving" ? "Continue" : queueEntry ? "Open patient" : "View queue"}</Link></div></article>;
        })}</div>}
      </section>
    </div>
  );
}

type DisplayDensity = "compact" | "comfortable";

interface DoctorPortalPreferences {
  notificationsEnabled: boolean;
  queueSoundEnabled: boolean;
  defaultAppointmentDuration: string;
  displayDensity: DisplayDensity;
  mobileCompactActions: boolean;
}

const DEFAULT_PREFERENCES: DoctorPortalPreferences = {
  notificationsEnabled: true,
  queueSoundEnabled: true,
  defaultAppointmentDuration: "15",
  displayDensity: "compact",
  mobileCompactActions: true,
};

// In-memory, session-lived: display preferences only (no clinical or
// business data), so this never claims to persist across a reload.
let doctorPreferences: DoctorPortalPreferences = DEFAULT_PREFERENCES;

function readDoctorPreferences(): DoctorPortalPreferences {
  return doctorPreferences;
}

export function DoctorSettingsPage() {
  const [preferences, setPreferences] = useState<DoctorPortalPreferences>(
    DEFAULT_PREFERENCES,
  );
  const [savedMessage, setSavedMessage] = useState<string>();

  useEffect(() => {
    queueMicrotask(() => {
      setPreferences(readDoctorPreferences());
    });
  }, []);

  function updatePreference<Key extends keyof DoctorPortalPreferences>(
    key: Key,
    value: DoctorPortalPreferences[Key],
  ): void {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSavedMessage(undefined);
  }

  function savePreferences(): void {
    doctorPreferences = preferences;
    window.dispatchEvent(new Event("wonflow:doctor-portal-preferences-changed"));
    setSavedMessage("Doctor Portal preferences saved for this session.");
  }

  return (
    <div className="space-y-4">
      <DoctorPageHeader
        actions={
          <button
            className="inline-flex min-h-10 items-center rounded-xl bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700"
            onClick={savePreferences}
            type="button"
          >
            Save Preferences
          </button>
        }
        description="Preferences and workspace configuration for your Doctor Workspace."
        icon={<Settings size={18} />}
        title="Settings"
      />

      {savedMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
          {savedMessage}
        </p>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
            Active account
          </p>
          <DoctorPortalIdentity compact />
          <p className="mt-3 text-[10px] leading-4 text-slate-500">
            Preferences are stored under one browser-local Doctor Portal settings record.
          </p>
        </aside>

        <div className="grid gap-4 lg:grid-cols-2">
          <SettingsSection
            description="Choose which clinical activity should request your attention."
            icon={<Bell size={17} />}
            title="Notifications"
          >
            <PreferenceToggle
              checked={preferences.notificationsEnabled}
              description="Store the preference for Doctor Portal notifications. Browser delivery is not connected yet."
              label="Portal notifications"
              onChange={(value) => updatePreference("notificationsEnabled", value)}
            />
            <PreferenceToggle
              checked={preferences.queueSoundEnabled}
              description="Store whether queue calls should use an audible cue when sound support is connected."
              icon={<Volume2 size={15} />}
              label="Queue sound"
              onChange={(value) => updatePreference("queueSoundEnabled", value)}
            />
          </SettingsSection>

          <SettingsSection
            description="Defaults used when preparing your clinical workspace. Location is controlled by the session switcher."
            icon={<Building2 size={17} />}
            title="Clinical defaults"
          >
            <label className="block text-[11px] font-black text-slate-600">
              Default appointment duration
              <select
                className={`${INPUT_CLASS_NAME} mt-1.5`}
                onChange={(event) =>
                  updatePreference("defaultAppointmentDuration", event.target.value)
                }
                value={preferences.defaultAppointmentDuration}
              >
                {["10", "15", "20", "30", "45", "60"].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </label>
          </SettingsSection>

          <SettingsSection
            description="Select the preferred information density for future shell integration."
            icon={<SlidersHorizontal size={17} />}
            title="Display density"
          >
            <div className="grid grid-cols-2 gap-2">
              {(["compact", "comfortable"] as const).map((density) => (
                <button
                  className={`rounded-xl border p-3 text-left ${
                    preferences.displayDensity === density
                      ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                  key={density}
                  onClick={() => updatePreference("displayDensity", density)}
                  type="button"
                >
                  <span className="block text-xs font-black">{humanize(density)}</span>
                  <span className="mt-1 block text-[9px] leading-4 opacity-75">
                    {density === "compact" ? "More information per view" : "More spacing between controls"}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-4 text-slate-400">
              The preference is saved now; global density switching will be connected in a later milestone.
            </p>
          </SettingsSection>

          <SettingsSection
            description="Keep frequent clinical actions easy to reach on smaller screens."
            icon={<Smartphone size={17} />}
            title="Mobile preferences"
          >
            <PreferenceToggle
              checked={preferences.mobileCompactActions}
              description="Store a preference for compact mobile action groups."
              label="Compact action controls"
              onChange={(value) => updatePreference("mobileCompactActions", value)}
            />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-black text-slate-950">{title}</h2>
          <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange(value: boolean): void;
  icon?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-slate-50 p-3 first:mt-0 [&+&]:mt-2">
      <span className="flex min-w-0 gap-2">
        {icon ? <span className="mt-0.5 text-slate-400">{icon}</span> : null}
        <span>
          <span className="block text-xs font-black text-slate-800">{label}</span>
          <span className="mt-0.5 block text-[9px] leading-4 text-slate-500">
            {description}
          </span>
        </span>
      </span>
      <input
        checked={checked}
        className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
