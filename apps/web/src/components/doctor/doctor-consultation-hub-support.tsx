"use client";

import Link from "next/link";
import {
  useCallback,
} from "react";
import type {
  ReactNode,
} from "react";

import type {
  DemoClinicalDocumentation,
  DemoClinicalEncounter,
  DemoClinicalPrescriptionItem,
  StartDemoClinicalConsultationError,
} from "@/lib/clinical";
import {
  getDemoPatientRegistrationAge,
} from "@/lib/patients";
import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";
import {
  calculateDemoQueueWaitMinutes,
} from "@/lib/queue";
import type {
  DemoQueueEntry,
  DemoQueuePriority,
} from "@/lib/queue";

import { useDoctorPortalContext } from "./doctor-portal-shell";

export interface ConsultationHubData {
  patients: DemoPatientRegistrationResult[];
  queueEntries: DemoQueueEntry[];
  encounters: DemoClinicalEncounter[];
  documentation: DemoClinicalDocumentation[];
}

export interface HubPatient {
  id: string;
  displayName: string;
  mrNumber: string;
  gender: string;
  age?: number;
  allergies: string;
  medicalAlert: string;
  hasProfile: boolean;
}

export interface ConsultationRecord {
  encounter: DemoClinicalEncounter;
  queueEntry?: DemoQueueEntry;
  documentation?: DemoClinicalDocumentation;
  patient: HubPatient;
}

export interface ReadyRecord {
  queueEntry: DemoQueueEntry;
  patient: HubPatient;
}

/**
 * Sources consultation hub data from the doctor portal's real, database-backed
 * queue and encounters (see doctor-portal-shell.tsx) rather than browser-local
 * demo storage. `patients` stays empty and `documentation` (SOAP notes,
 * diagnoses, prescriptions) is not yet wired to the real clinical-record
 * endpoints, so those views fall back to the queue snapshot / show as
 * "not documented" until that follow-up lands — this hub's queue, encounter
 * lifecycle (ready / active / completed) and call/start/finish actions are
 * fully real.
 */
export function useConsultationHubData(): {
  data: ConsultationHubData;
  loaded: boolean;
  reload(): void;
} {
  const portal = useDoctorPortalContext();

  const reload = useCallback(() => {
    portal.reload();
  }, [portal]);

  return {
    data: {
      patients: [],
      queueEntries: portal.queueEntries,
      encounters: portal.encounters,
      documentation: [],
    },
    loaded: !portal.loading,
    reload,
  };
}

function getInitials(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("") || "PT";
}

export function humanize(value: string): string {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

export function safeText(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized === ""
    ? undefined
    : normalized;
}

function parseTimestamp(
  value?: string,
): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? undefined
    : parsed;
}

export function formatTime(value?: string): string {
  const parsed = parseTimestamp(value);
  if (parsed === undefined) {
    return "Not recorded";
  }
  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(value?: string): string {
  const parsed = parseTimestamp(value);
  if (parsed === undefined) {
    return "Not recorded";
  }
  return parsed.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getLocalBusinessDate(
  value?: string,
): string | undefined {
  const parsed = parseTimestamp(value);
  if (parsed === undefined) {
    return undefined;
  }
  return [
    parsed.getFullYear(),
    String(
      parsed.getMonth() + 1,
    ).padStart(2, "0"),
    String(parsed.getDate()).padStart(
      2,
      "0",
    ),
  ].join("-");
}

export function formatElapsed(
  value: string | undefined,
  now: number | undefined,
): string {
  const parsed = parseTimestamp(value);
  if (
    parsed === undefined ||
    now === undefined
  ) {
    return "Not available";
  }

  const totalSeconds = Math.max(
    0,
    Math.floor(
      (now - parsed.getTime()) /
        1000,
    ),
  );
  const hours = Math.floor(
    totalSeconds / 3600,
  );
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return totalSeconds < 60
    ? "<1 min"
    : `${minutes} min`;
}

export function formatWait(entry: DemoQueueEntry): string {
  if (
    parseTimestamp(entry.checkedInAt) ===
    undefined
  ) {
    return "Not available";
  }
  const minutes =
    calculateDemoQueueWaitMinutes(
      entry,
    );
  if (!Number.isFinite(minutes)) {
    return "Not available";
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function getAllergySummary(
  documentation:
    | DemoClinicalDocumentation
    | undefined,
  queueEntry:
    | DemoQueueEntry
    | undefined,
): string {
  if (
    documentation?.allergyStatus ===
    "none-known"
  ) {
    return "No known allergies";
  }

  if (
    documentation?.allergyStatus ===
    "documented"
  ) {
    const allergies =
      (documentation.allergies ?? [])
        .map((record) =>
          [
            safeText(record.substance),
            safeText(record.reaction),
          ]
            .filter(Boolean)
            .join(" â€” "),
        )
        .filter(Boolean);

    if (allergies.length > 0) {
      return allergies.join(", ");
    }
  }

  return (
    safeText(
      queueEntry?.snapshot?.patient
        ?.allergies,
    ) ||
    "Not documented"
  );
}

export function resolvePatient(
  patientId: string,
  queueEntry: DemoQueueEntry | undefined,
  documentation:
    | DemoClinicalDocumentation
    | undefined,
  patientsById: ReadonlyMap<
    string,
    DemoPatientRegistrationResult
  >,
): HubPatient {
  const registration =
    patientsById.get(patientId);
  const snapshot =
    queueEntry?.snapshot?.patient;
  const registrationAge =
    registration?.draft === undefined
      ? undefined
      : getDemoPatientRegistrationAge(
          registration,
        );
  const snapshotAge =
    typeof snapshot?.ageYears ===
      "number" &&
    Number.isFinite(snapshot.ageYears)
      ? snapshot.ageYears
      : undefined;

  return {
    id: patientId,
    displayName:
      safeText(
        registration?.displayName,
      ) ||
      safeText(snapshot?.displayName) ||
      "Patient record unavailable",
    mrNumber:
      safeText(registration?.mrNumber) ||
      safeText(snapshot?.mrNumber) ||
      "MR number unavailable",
    gender:
      safeText(
        registration?.draft?.gender,
      ) ||
      safeText(snapshot?.gender) ||
      "unknown",
    age: registrationAge ?? snapshotAge,
    allergies: getAllergySummary(
      documentation,
      queueEntry,
    ),
    medicalAlert:
      safeText(snapshot?.medicalAlert) ||
      "Not documented",
    hasProfile:
      registration !== undefined ||
      snapshot !== undefined,
  };
}

function getPatientHref(
  patient: HubPatient,
): string | undefined {
  if (!patient.hasProfile) {
    return undefined;
  }

  const anchor =
    `doctor-patient-${patient.id}`;
  return `/doctor/patients#${encodeURIComponent(
    anchor,
  )}`;
}

export function getReason(
  encounter:
    | DemoClinicalEncounter
    | undefined,
  queueEntry:
    | DemoQueueEntry
    | undefined,
): string {
  return (
    safeText(encounter?.reasonForVisit) ||
    safeText(
      queueEntry?.snapshot?.visit
        ?.reasonForVisit,
    ) ||
    safeText(queueEntry?.notes) ||
    safeText(queueEntry?.serviceName) ||
    "Not recorded"
  );
}

export function getDiagnosis(
  documentation:
    | DemoClinicalDocumentation
    | undefined,
): string | undefined {
  const diagnoses =
    documentation?.diagnoses?.filter(
      (record) =>
        safeText(record.diagnosis) !==
        undefined,
    ) ?? [];

  return (
    safeText(
      diagnoses.find(
      (record) =>
        record.type === "confirmed",
      )?.diagnosis,
    ) ??
    safeText(diagnoses[0]?.diagnosis)
  );
}

export function getPrescriptionItems(
  documentation:
    | DemoClinicalDocumentation
    | undefined,
): DemoClinicalPrescriptionItem[] {
  if (
    documentation?.status !==
    "completed"
  ) {
    return [];
  }

  return (documentation.prescriptions ?? []).filter(
    (item) =>
      safeText(item.medicineName) !==
      undefined,
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

export function printPrescription(
  input: {
    doctorName: string;
    record: ConsultationRecord;
    prescriptions:
      readonly DemoClinicalPrescriptionItem[];
  },
): boolean {
  const printWindow = window.open(
    "",
    "wonflow-prescription",
    "width=860,height=720",
  );
  if (printWindow === null) {
    return false;
  }

  printWindow.opener = null;
  const rows = input.prescriptions
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(safeText(item.medicineName) ?? "â€”")}</td>
          <td>${escapeHtml(safeText(item.strength) ?? "â€”")}</td>
          <td>${escapeHtml(safeText(item.dosage) ?? "â€”")}</td>
          <td>${escapeHtml(safeText(item.route) === undefined ? "â€”" : humanize(item.route))}</td>
          <td>${escapeHtml(safeText(item.frequency) ?? "â€”")}</td>
          <td>${escapeHtml(safeText(item.duration) ?? "â€”")}</td>
          <td>${escapeHtml(safeText(item.instructions) ?? "â€”")}</td>
        </tr>`,
    )
    .join("");

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Prescription ${escapeHtml(input.record.encounter.encounterNumber)}</title>
        <style>
          body { color: #0f172a; font-family: Arial, sans-serif; margin: 32px; }
          header { border-bottom: 2px solid #4f46e5; margin-bottom: 22px; padding-bottom: 14px; }
          h1 { font-size: 22px; margin: 0 0 6px; }
          p { font-size: 12px; margin: 4px 0; }
          .meta { display: grid; gap: 8px; grid-template-columns: repeat(2, 1fr); margin: 18px 0; }
          .meta div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
          .label { color: #64748b; display: block; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
          .value { display: block; font-size: 12px; font-weight: 700; margin-top: 4px; }
          table { border-collapse: collapse; font-size: 10px; table-layout: fixed; width: 100%; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
          td { overflow-wrap: anywhere; }
          th { background: #eef2ff; }
          footer { color: #64748b; font-size: 9px; margin-top: 24px; }
          @page { margin: 12mm; size: landscape; }
        </style>
      </head>
      <body>
        <header>
          <h1>Clinical Prescription</h1>
          <p>${escapeHtml(input.doctorName)}</p>
          <p>${escapeHtml(input.record.encounter.encounterNumber)}</p>
        </header>
        <section class="meta">
          <div><span class="label">Patient</span><span class="value">${escapeHtml(input.record.patient.displayName)}</span></div>
          <div><span class="label">MR number</span><span class="value">${escapeHtml(input.record.patient.mrNumber)}</span></div>
          <div><span class="label">Completed</span><span class="value">${escapeHtml(formatDateTime(input.record.encounter.completedAt))}</span></div>
          <div><span class="label">Reason</span><span class="value">${escapeHtml(getReason(input.record.encounter, input.record.queueEntry))}</span></div>
        </section>
        <table>
          <thead><tr><th>Medicine</th><th>Strength</th><th>Dose</th><th>Route</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <footer>Printed from WonFlow using finalized browser-local clinical documentation.</footer>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.onafterprint = () => {
    printWindow.close();
  };
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 100);
  return true;
}

export function priorityClassName(
  priority: DemoQueuePriority,
): string {
  return priority === "routine"
    ? "bg-amber-50 text-amber-700 ring-amber-200"
    : "bg-rose-50 text-rose-700 ring-rose-200";
}

export function PatientAvatar({
  patient,
  urgent = false,
}: {
  patient: HubPatient;
  urgent?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ring-1",
        urgent
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : "bg-indigo-50 text-indigo-700 ring-indigo-200",
      ].join(" ")}
    >
      {getInitials(
        patient.displayName,
      )}
    </div>
  );
}

export function StatusPill({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex min-h-5 items-center rounded-full px-2 py-0.5 text-[9px] font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

export function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "indigo"
    | "violet"
    | "amber"
    | "emerald";
}) {
  const tones = {
    indigo:
      "border-indigo-100 bg-indigo-50/70 text-indigo-700",
    violet:
      "border-violet-100 bg-violet-50/70 text-violet-700",
    amber:
      "border-amber-100 bg-amber-50/70 text-amber-700",
    emerald:
      "border-emerald-100 bg-emerald-50/70 text-emerald-700",
  } as const;

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-3 py-2 ${tones[tone]}`}
    >
      <span className="text-[10px] font-black uppercase tracking-[0.08em]">
        {label}
      </span>
      <span className="text-lg font-black text-slate-950">
        {value}
      </span>
    </div>
  );
}

export function SectionShell({
  title,
  description,
  count,
  icon,
  children,
}: {
  title: string;
  description: string;
  count: number;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-indigo-600 ring-1 ring-slate-200">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-black text-slate-950 sm:text-sm">
              {title}
            </h2>
            <p className="mt-0.5 text-[10px] font-medium text-slate-500">
              {description}
            </p>
          </div>
        </div>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-lg bg-slate-100 px-1.5 text-[10px] font-black text-slate-600">
          {count}
        </span>
      </div>
      <div className="p-3">
        {children}
      </div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  tone = "slate",
}: {
  title: string;
  description: string;
  tone?: "slate" | "amber" | "rose";
}) {
  const tones = {
    slate:
      "border-slate-200 bg-slate-50 text-slate-500",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700",
    rose:
      "border-rose-200 bg-rose-50 text-rose-700",
  } as const;

  return (
    <div
      className={`rounded-xl border border-dashed px-4 py-5 text-center ${tones[tone]}`}
    >
      <p className="text-xs font-black text-slate-800">
        {title}
      </p>
      <p className="mx-auto mt-1 max-w-md text-[10px] font-medium leading-4">
        {description}
      </p>
    </div>
  );
}

export function PatientLink({
  patient,
  label,
}: {
  patient: HubPatient;
  label: string;
}) {
  const href = getPatientHref(patient);
  if (href === undefined) {
    return (
      <button
        className="inline-flex h-8 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] font-black text-slate-400"
        disabled
        title="The linked patient record is unavailable."
        type="button"
      >
        {label}
      </button>
    );
  }

  return (
    <Link
      className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
      href={href}
    >
      {label}
    </Link>
  );
}

export function startErrorMessage(
  error: StartDemoClinicalConsultationError,
  conflictingQueueEntry?: DemoQueueEntry,
): string {
  switch (error) {
    case "queue-entry-not-found":
      return "The queue record is no longer available.";
    case "queue-entry-outside-context":
      return "This patient belongs to a different doctor, branch, or business date.";
    case "sitting-not-available":
      return "Start an available doctor sitting on Today before beginning the consultation.";
    case "sitting-on-break":
      return "Resume the doctor sitting before beginning the consultation.";
    case "patient-not-called":
      return "Call the patient from Todayâ€™s Queue before beginning the consultation.";
    case "another-consultation-serving":
      return `${conflictingQueueEntry?.tokenNumber ?? "Another patient"} is already in consultation. Finish it before starting another.`;
    case "encounter-already-completed":
      return "This queue record is linked to a completed encounter.";
    case "queue-entry-closed":
      return "This queue record is not available to start.";
  }
}

export function requestedQueueMessage(
  entry: DemoQueueEntry,
  context: {
    practitionerId: string;
    branchId: string;
    businessDate: string;
  },
): string {
  if (
    entry.practitionerId !==
      context.practitionerId ||
    entry.branchId !== context.branchId ||
    entry.businessDate !==
      context.businessDate
  ) {
    return `${entry.tokenNumber} belongs to a different doctor, branch, or business date.`;
  }

  switch (entry.status) {
    case "waiting":
      return `${entry.tokenNumber} is waiting. Call the patient from Todayâ€™s Queue before starting a consultation.`;
    case "skipped":
      return `${entry.tokenNumber} is skipped. Return the patient from Todayâ€™s Queue before continuing.`;
    case "serving":
      return `${entry.tokenNumber} is serving, but its clinical encounter link is unavailable. Restore the encounter below.`;
    case "completed":
      return `${entry.tokenNumber} is already completed and is not part of the active consultation lists.`;
    case "cancelled":
      return `${entry.tokenNumber} was cancelled and cannot be opened for consultation.`;
    case "called":
      return `${entry.tokenNumber} is called but is linked to an existing clinical encounter. Continue it from Draft Consultations.`;
  }
}
