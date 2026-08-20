"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Droplet,
  ExternalLink,
  FileCheck,
  FileDown,
  FilePenLine,
  FileText,
  FlaskConical,
  Globe,
  Heart,
  HelpCircle,
  History,
  Image as ImageIcon,
  KeyRound,
  Layers,
  LucideIcon,
  MapPin,
  Pause,
  PenTool,
  Phone,
  Pill,
  Play,
  Plus,
  Printer,
  Radio,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Tag,
  Thermometer,
  Trash2,
  Upload,
  User,
  Video,
  X,
} from "lucide-react";

import {
  DataError,
  DataLoading,
  SaveIndicator,
} from "@wonflow/ui";

import {
  WonFlowActionButton,
  WonFlowPageHeader,
} from "@/components/workspace";

import { useWonFlowSession } from "@/app/_providers";

import {
  WonFlowForbiddenError,
} from "@/lib/api";

import {
  completeDoctorEncounter,
  pauseDoctorEncounter,
  resumeDoctorEncounter,
} from "@/lib/api/doctor-api";

import {
  WonFlowApiError as PhaseOneApiError,
} from "@/lib/api/phase-one-api";

import {
  CONSULTATION_NOTE_TYPE,
  useAddDiagnosis,
  useCreateOrder,
  useCreatePrescription,
  useEncounter,
  useRecordObservation,
  useSaveNoteDraft,
  useSignNote,
} from "@/lib/api/clinical";

import type {
  ConsultationNoteContent,
  DiagnosisCertainty,
  DiagnosticOrderType,
  EncounterRecord,
} from "@/lib/api/clinical";

// -------------------------------------------------------------
// TYPES & DATA CONTRACTS
// -------------------------------------------------------------

interface MedicationItem {
  id: string;
  code: string;
  genericName: string;
  brandName: string | null;
  strength: string | null;
  dosageForm: string | null;
  unit: string;
  availableQuantity?: number;
  inStock?: boolean;
  isHospitalAvailable?: boolean;
}

interface StagedMedication {
  medicationId: string;
  name: string;
  genericName?: string;
  brandName?: string | null;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  quantity?: number;
  instructions: string;
}

function patientDisplayName(patient: EncounterRecord["patient"]): string {
  return [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" ");
}

function readNoteText(content: unknown): string {
  if (typeof content === "object" && content !== null && "text" in content) {
    const { text } = content as { text?: unknown };
    return typeof text === "string" ? text : "";
  }
  return "";
}

function noteAmendsId(content: unknown): string | undefined {
  if (typeof content === "object" && content !== null && "amendsNoteId" in content) {
    const { amendsNoteId } = content as { amendsNoteId?: unknown };
    return typeof amendsNoteId === "string" ? amendsNoteId : undefined;
  }
  return undefined;
}

function buildNoteChain(encounter: EncounterRecord) {
  const notes = encounter.notes
    .filter((note) => note.noteType === CONSULTATION_NOTE_TYPE)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const supersededIds = new Set(notes.map((note) => noteAmendsId(note.content)).filter((id): id is string => id !== undefined));
  const current = notes.filter((note) => !supersededIds.has(note.id)).at(-1);
  const history = notes.filter((note) => note.id !== current?.id);

  return { current, history };
}

// Default dynamic list options
const INITIAL_CHIEF_COMPLAINTS = [
  "Fever & Chills",
  "Productive Cough",
  "Chest Discomfort",
  "Acute Headache",
  "Abdominal Pain",
  "Throat Irritation",
  "Generalized Body Ache",
  "Shortness of Breath",
  "Nausea & Vomiting",
  "Dizziness / Vertigo",
  "Joint Pain & Stiffness",
  "Skin Rash / Pruritus",
];

const INITIAL_DIAGNOSES = [
  { display: "Essential (Primary) Hypertension", code: "I10", certainty: "CONFIRMED" as const },
  { display: "Type 2 Diabetes Mellitus", code: "E11.9", certainty: "CONFIRMED" as const },
  { display: "Acute Upper Respiratory Infection", code: "J06.9", certainty: "PROVISIONAL" as const },
  { display: "Acute Gastroenteritis & Colitis", code: "A09", certainty: "PROVISIONAL" as const },
  { display: "Bronchial Asthma (Acute Exacerbation)", code: "J45.901", certainty: "CONFIRMED" as const },
  { display: "Gastroesophageal Reflux Disease (GERD)", code: "K21.9", certainty: "CONFIRMED" as const },
  { display: "Allergic Rhinitis", code: "J30.9", certainty: "CONFIRMED" as const },
  { display: "Migraine without Aura", code: "G43.0", certainty: "CONFIRMED" as const },
  { display: "Urinary Tract Infection (UTI)", code: "N39.0", certainty: "PROVISIONAL" as const },
  { display: "Acute Viral Pharyngitis", code: "J02.9", certainty: "PROVISIONAL" as const },
];

const INITIAL_LAB_ORDERS = [
  { name: "Complete Blood Count (CBC)", code: "LAB-CBC", priority: "routine" },
  { name: "Glycated Hemoglobin (HbA1c)", code: "LAB-HBA1C", priority: "routine" },
  { name: "Fasting Lipid Profile", code: "LAB-LIPID", priority: "routine" },
  { name: "Liver Function Tests (LFTs)", code: "LAB-LFT", priority: "routine" },
  { name: "Renal Function Tests (RFTs / Creatinine)", code: "LAB-RFT", priority: "routine" },
  { name: "Serum Electrolytes (Na+, K+, Cl-)", code: "LAB-LYTES", priority: "urgent" },
  { name: "Urine Routine Examination (R/E)", code: "LAB-URINE", priority: "routine" },
  { name: "Thyroid Stimulating Hormone (TSH)", code: "LAB-TSH", priority: "routine" },
  { name: "Dengue NS1 Antigen & Serology", code: "LAB-DENGUE", priority: "urgent" },
  { name: "C-Reactive Protein (CRP)", code: "LAB-CRP", priority: "urgent" },
];

const INITIAL_RADIOLOGY_ORDERS = [
  { name: "Chest X-Ray (PA View)", code: "RAD-CXR-PA", priority: "routine" },
  { name: "Ultrasound Whole Abdomen & Pelvis", code: "RAD-USG-ABD", priority: "routine" },
  { name: "CT Brain (Plain)", code: "RAD-CT-BRAIN", priority: "urgent" },
  { name: "MRI Lumbar Spine", code: "RAD-MRI-LSPINE", priority: "routine" },
  { name: "Electrocardiogram (ECG 12-Lead)", code: "RAD-ECG-12L", priority: "urgent" },
  { name: "Echocardiography (2D Echo with Doppler)", code: "RAD-ECHO-2D", priority: "routine" },
];

const FREQUENCY_OPTIONS = [
  { label: "Once daily (OD)", value: "Once daily (OD)" },
  { label: "Twice daily (BD)", value: "Twice daily (BD)" },
  { label: "Thrice daily (TDS)", value: "Thrice daily (TDS)" },
  { label: "Four times daily (QDS)", value: "Four times daily (QDS)" },
  { label: "Every 8 hours", value: "Every 8 hours" },
  { label: "Every 12 hours", value: "Every 12 hours" },
  { label: "As needed (PRN)", value: "As needed (PRN)" },
  { label: "At bedtime (HS)", value: "At bedtime (HS)" },
  { label: "Before meals (AC)", value: "Before meals (AC)" },
];

const ROUTE_OPTIONS = [
  "Oral",
  "Intravenous (IV)",
  "Intramuscular (IM)",
  "Subcutaneous (SC)",
  "Topical / Skin",
  "Inhalation",
  "Sublingual",
  "Ophthalmic (Eye)",
  "Otic (Ear)",
  "Nasal Spray",
];

const DURATION_PRESETS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "1 month",
  "3 months",
  "Ongoing / Chronic",
];

const INSTRUCTION_PRESETS = [
  "Take after meals with water",
  "Take on an empty stomach",
  "Take at bedtime",
  "Complete full antibiotic course",
  "Do not crush or chew",
  "Shake well before use",
  "Avoid driving after dose",
];

// -------------------------------------------------------------
// REUSABLE DYNAMIC SEARCHABLE COMBOBOX
// -------------------------------------------------------------
interface DynamicComboboxItem {
  id?: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeTone?: "emerald" | "amber" | "rose" | "indigo" | "slate";
  data?: unknown;
}

function DynamicSearchCombobox({
  placeholder = "Type to search or add new…",
  items,
  onSelect,
  onAddNew,
  label,
  icon: Icon = Search,
  accentColor = "indigo",
}: {
  placeholder?: string;
  items: DynamicComboboxItem[];
  onSelect: (item: DynamicComboboxItem) => void;
  onAddNew?: (query: string) => void;
  label?: string;
  icon?: LucideIcon;
  accentColor?: "indigo" | "emerald" | "amber" | "violet" | "rose" | "blue";
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 15);
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.sublabel && item.sublabel.toLowerCase().includes(q)) ||
        (item.badge && item.badge.toLowerCase().includes(q)),
    );
  }, [items, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return items.some((item) => item.label.toLowerCase() === q);
  }, [items, query]);

  const borderFocusClass = {
    indigo: "focus:border-indigo-500 focus:ring-indigo-100",
    emerald: "focus:border-emerald-500 focus:ring-emerald-100",
    amber: "focus:border-amber-500 focus:ring-amber-100",
    violet: "focus:border-violet-500 focus:ring-violet-100",
    rose: "focus:border-rose-500 focus:ring-rose-100",
    blue: "focus:border-blue-500 focus:ring-blue-100",
  }[accentColor];

  const buttonAccentClass = {
    indigo: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    amber: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    violet: "bg-violet-50 text-violet-700 hover:bg-violet-100",
    rose: "bg-rose-50 text-rose-700 hover:bg-rose-100",
    blue: "bg-blue-50 text-blue-700 hover:bg-blue-100",
  }[accentColor];

  return (
    <div className="relative w-full" ref={containerRef}>
      {label ? (
        <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <Icon className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`h-11 w-full rounded-2xl border border-slate-200/90 bg-white/90 pl-10 pr-10 text-xs font-bold text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${borderFocusClass}`}
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/98 p-1.5 shadow-2xl backdrop-blur-2xl dark:border-slate-700 dark:bg-slate-900/98">
          {query.trim() && !exactMatch && onAddNew ? (
            <button
              type="button"
              onClick={() => {
                onAddNew(query.trim());
                setQuery("");
                setOpen(false);
              }}
              className={`mb-1 flex w-full items-center gap-2 rounded-xl p-2.5 text-left text-xs font-black transition ${buttonAccentClass}`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Add &quot;{query.trim()}&quot; as new custom entry</span>
            </button>
          ) : null}

          {filteredItems.length === 0 && !query.trim() ? (
            <div className="p-3 text-center text-xs font-semibold text-slate-400">
              No suggestions available. Type to create a new entry.
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredItems.map((item, idx) => {
                const badgeColor = item.badgeTone === "emerald"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : item.badgeTone === "rose"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : item.badgeTone === "amber"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-200";

                return (
                  <button
                    key={`${item.label}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-bold text-slate-900 dark:text-white">
                        {item.label}
                      </div>
                      {item.sublabel ? (
                        <div className="truncate text-[11px] font-medium text-slate-500">
                          {item.sublabel}
                        </div>
                      ) : null}
                    </div>
                    {item.badge ? (
                      <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-black ${badgeColor}`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MAIN WORKSPACE ENTRY
// -------------------------------------------------------------

export interface ClinicalConsultationDocumentationProps {
  encounterId: string;
}

export function ClinicalConsultationDocumentation({
  encounterId,
}: ClinicalConsultationDocumentationProps) {
  const encounterResource = useEncounter(encounterId);

  if (encounterResource.status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl border border-white/50 bg-white/70 p-8 shadow-2xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/70">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Stethoscope className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Preparing Clinical Suite</h3>
              <p className="text-xs text-slate-500">Loading electronic patient health record and consultation desk…</p>
            </div>
          </div>
          <div className="mt-6">
            <DataLoading label="Retrieving clinical encounter records" shape="detail" />
          </div>
        </div>
      </div>
    );
  }

  if (encounterResource.status === "error") {
    if (encounterResource.error instanceof WonFlowForbiddenError) {
      return (
        <div className="mx-auto max-w-2xl p-6">
          <div className="rounded-3xl border border-amber-200/80 bg-amber-50/80 p-6 text-sm font-bold text-amber-900 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
              <span>You do not have access to this encounter. This action requires encounters.read permission.</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6">
        <DataError
          detail={encounterResource.error?.message}
          onRetry={encounterResource.reload}
          what="this encounter"
        />
      </div>
    );
  }

  if (encounterResource.data === undefined) {
    return null;
  }

  return (
    <ConsultationWorkspace
      encounter={encounterResource.data.encounter}
      reload={encounterResource.reload}
    />
  );
}

// -------------------------------------------------------------
// CONSULTATION WORKSPACE
// -------------------------------------------------------------

function ConsultationWorkspace({
  encounter,
  reload,
}: {
  encounter: EncounterRecord;
  reload: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"notes" | "rx" | "vitals" | "diagnoses" | "orders" | "history">("notes");
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const [completing, setCompleting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [portalStatus, setPortalStatus] = useState<{ hasPortalAccess: boolean; email?: string } | null>(null);
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [portalEmailInput, setPortalEmailInput] = useState("");
  const [portalPasswordInput, setPortalPasswordInput] = useState("");
  const [portalProvisionResult, setPortalProvisionResult] = useState<{ email: string; temporaryPassword?: string; portalUrl: string } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Live consultation session stopwatch
  useEffect(() => {
    if (encounter.status !== "IN_PROGRESS") return;
    const startMs = encounter.startedAt ? new Date(encounter.startedAt).getTime() : Date.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [encounter.status, encounter.startedAt]);

  // Check patient portal access status
  useEffect(() => {
    if (!encounter.patient?.id) return;
    void fetch(`/api/v1/patients/${encounter.patient.id}/portal-credentials`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hasPortalAccess: boolean; email?: string } | null) => {
        if (data) {
          setPortalStatus(data);
          setPortalEmailInput(data.email || "");
        }
      })
      .catch(() => {});
  }, [encounter.patient?.id]);

  async function handleProvisionPortal(autoGenerate = true) {
    if (!encounter.patient?.id) return;
    setPortalLoading(true);
    setPortalError("");
    try {
      const res = await fetch(`/api/v1/patients/${encounter.patient.id}/portal-credentials`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: portalEmailInput.trim() || undefined,
          password: autoGenerate ? undefined : portalPasswordInput.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { email: string; temporaryPassword?: string; portalUrl?: string; error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || data.message || "Failed to create portal access");
      setPortalProvisionResult({
        email: data.email,
        temporaryPassword: data.temporaryPassword,
        portalUrl: data.portalUrl || "/patient",
      });
      setPortalStatus({ hasPortalAccess: true, email: data.email });
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : "Failed to provision credentials");
    } finally {
      setPortalLoading(false);
    }
  }

  function copyText(text: string, field: string) {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [elapsedSeconds]);

  async function completeConsultation(): Promise<void> {
    setCompleting(true);
    try {
      await completeDoctorEncounter(encounter.id);
      setActionMessage("Consultation finalized successfully.");
      reload();
    } catch (caught) {
      setActionMessage(caught instanceof PhaseOneApiError ? caught.message : "The consultation could not be completed.");
    } finally {
      setCompleting(false);
    }
  }

  async function togglePause(): Promise<void> {
    setPausing(true);
    try {
      if (encounter.status === "PAUSED") {
        await resumeDoctorEncounter(encounter.id);
        setActionMessage("Consultation resumed.");
      } else {
        await pauseDoctorEncounter(encounter.id);
        setActionMessage("Consultation paused. Room remains reserved.");
      }
      reload();
    } catch (caught) {
      setActionMessage(caught instanceof PhaseOneApiError ? caught.message : "The consultation could not be updated.");
    } finally {
      setPausing(false);
    }
  }

  const patient = encounter.patient;
  const isEditable = encounter.status === "PLANNED" || encounter.status === "IN_PROGRESS" || encounter.status === "PAUSED";
  const totalPrescriptions = encounter.prescriptions.reduce((acc, rx) => acc + rx.items.length, 0);

  return (
    <div className="min-h-screen space-y-6 pb-20">
      {/* Top Floating Glassmorphism Patient Header */}
      <header className="sticky top-2 z-30 overflow-hidden rounded-3xl border border-white/60 bg-white/75 p-4 shadow-xl shadow-indigo-950/5 backdrop-blur-2xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5">
            <Link
              href="/doctor/consultations"
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Return to Consultations"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-md shadow-indigo-500/20">
              {patient.givenName?.[0]?.toUpperCase()}
              {patient.familyName?.[0]?.toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-black text-slate-950 dark:text-white sm:text-lg">
                  {patientDisplayName(patient)}
                </h1>
                <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                  {patient.patientNumber}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                  encounter.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : encounter.status === "PAUSED"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    encounter.status === "COMPLETED" ? "bg-emerald-500" : encounter.status === "PAUSED" ? "bg-amber-500 animate-ping" : "bg-indigo-500 animate-pulse"
                  }`} />
                  {encounter.status}
                </span>
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>{patient.sex ?? "Gender not recorded"}</span>
                <span>•</span>
                <span>{patient.dateOfBirth ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} years` : "Age not specified"}</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setShowPortalModal(true)}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300"
                >
                  <Globe size={11} className={portalStatus?.hasPortalAccess ? "text-emerald-600" : "text-slate-400"} />
                  <span>{portalStatus?.hasPortalAccess ? "Portal Active" : "Portal Not Created (+ Create)"}</span>
                </button>
                {encounter.reason ? (
                  <>
                    <span>•</span>
                    <span className="truncate text-slate-700 dark:text-slate-300 font-medium">Chief Complaint: {encounter.reason}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center">
            {encounter.status === "IN_PROGRESS" ? (
              <div className="flex items-center gap-1.5 rounded-2xl border border-indigo-200/70 bg-indigo-50/70 px-3 py-1.5 text-xs font-black text-indigo-700 shadow-inner dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                <Clock className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "8s" }} />
                <span>{formattedTimer}</span>
              </div>
            ) : null}

            {/* Video Consultation Room Button */}
            {encounter.appointmentId && (
              <Link
                href={`/doctor/appointments/${encodeURIComponent(encounter.appointmentId)}/video`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-purple-500/20 transition hover:from-purple-700 hover:to-indigo-700"
              >
                <Video className="h-4 w-4" />
                <span>Video Call Room</span>
              </Link>
            )}

            {/* Print Complete Report & Rx Button */}
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2 text-xs font-black text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300"
            >
              <Printer className="h-4 w-4" />
              <span>Print Complete Report / Rx</span>
            </button>

            {isEditable ? (
              <>
                <button
                  type="button"
                  disabled={pausing}
                  onClick={() => void togglePause()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {pausing ? <Clock className="h-3.5 w-3.5 animate-spin" /> : encounter.status === "PAUSED" ? <Play className="h-3.5 w-3.5 text-emerald-600" /> : <Pause className="h-3.5 w-3.5 text-amber-600" />}
                  {pausing ? "Updating…" : encounter.status === "PAUSED" ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  disabled={completing}
                  onClick={() => void completeConsultation()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-emerald-500/20 transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {completing ? "Finalizing…" : "Complete Consultation"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Medical Alerts & Allergies Glowing Warning Bar */}
        {patient.allergies.length > 0 ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent px-3.5 py-2 text-xs font-bold text-rose-800 shadow-sm dark:border-rose-900/60 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>
              <strong className="uppercase tracking-wider text-rose-900 dark:text-rose-200">Critical Allergies:</strong>{" "}
              {patient.allergies.map((a) => `${a.substance} (${a.severity.toLowerCase()})`).join(", ")}
            </span>
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/90 px-3.5 py-2 text-xs font-bold text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-200">
            <span>{actionMessage}</span>
            <button type="button" onClick={() => setActionMessage(undefined)} className="text-blue-600 hover:text-blue-800">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </header>

      {/* Navigation Glassmorphic Tabs */}
      <nav className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/40 bg-slate-100/60 p-1.5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
        <TabButton
          active={activeTab === "notes"}
          onClick={() => setActiveTab("notes")}
          icon={FilePenLine}
          label="Clinical Notes"
          badge={encounter.notes.length > 0 ? `${encounter.notes.length}` : undefined}
        />
        <TabButton
          active={activeTab === "rx"}
          onClick={() => setActiveTab("rx")}
          icon={Pill}
          label="Medications & Prescriptions"
          badge={totalPrescriptions > 0 ? `${totalPrescriptions}` : undefined}
          highlight
        />
        <TabButton
          active={activeTab === "vitals"}
          onClick={() => setActiveTab("vitals")}
          icon={Activity}
          label="Vitals & Observations"
          badge={patient.observations.length > 0 ? `${patient.observations.length}` : undefined}
        />
        <TabButton
          active={activeTab === "diagnoses"}
          onClick={() => setActiveTab("diagnoses")}
          icon={Stethoscope}
          label="Diagnoses & ICD"
          badge={encounter.diagnoses.length > 0 ? `${encounter.diagnoses.length}` : undefined}
        />
        <TabButton
          active={activeTab === "orders"}
          onClick={() => setActiveTab("orders")}
          icon={FlaskConical}
          label="Diagnostic Orders"
          badge={encounter.diagnosticOrders.length > 0 ? `${encounter.diagnosticOrders.length}` : undefined}
        />
        <TabButton
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          icon={History}
          label="Patient History"
        />
      </nav>

      {/* Tab Panels */}
      <main className="transition-all duration-300">
        {activeTab === "notes" && (
          <ConsultationNotePanel encounter={encounter} onSaved={reload} isEditable={isEditable} />
        )}

        {activeTab === "rx" && (
          <GlassmorphicPrescriptionPanel encounter={encounter} onSaved={reload} isEditable={isEditable} />
        )}

        {activeTab === "vitals" && (
          <ObservationsPanel encounter={encounter} onSaved={reload} isEditable={isEditable} />
        )}

        {activeTab === "diagnoses" && (
          <DiagnosesPanel encounter={encounter} onSaved={reload} isEditable={isEditable} />
        )}

        {activeTab === "orders" && (
          <OrdersPanel encounter={encounter} onSaved={reload} isEditable={isEditable} />
        )}

        {activeTab === "history" && (
          <PatientHistoryPanel encounter={encounter} />
        )}
      </main>

      {/* Patient Portal Credentials Modal */}
      {showPortalModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <KeyRound className="size-5" />
                <div>
                  <h3 className="text-base font-black">Patient Portal Access</h3>
                  <p className="text-xs text-indigo-100">{patientDisplayName(patient)} · {patient.patientNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPortalModal(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {portalError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
                  {portalError}
                </div>
              )}

              {/* Status */}
              <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/40">
                <div className="flex items-center gap-2">
                  <Globe className="text-indigo-600 dark:text-indigo-400" size={16} />
                  <div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">Portal Account Status</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {portalStatus?.hasPortalAccess ? `Active (${portalStatus.email})` : "No active portal account"}
                    </div>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  portalStatus?.hasPortalAccess ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}>
                  {portalStatus?.hasPortalAccess ? "🟢 Active" : "⚪ Not Created"}
                </span>
              </div>

              {/* Newly Generated Results */}
              {portalProvisionResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-900 dark:text-emerald-300">
                    <Check className="size-4 text-emerald-600" />
                    <span>Portal Credentials Provisioned!</span>
                  </div>
                  <div className="grid gap-2 text-[11px]">
                    <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-emerald-100 dark:border-slate-800 dark:bg-slate-800">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400">Login URL</span>
                        <div className="font-bold text-indigo-700 dark:text-indigo-400">{typeof window !== "undefined" ? window.location.origin : ""}/patient</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText((typeof window !== "undefined" ? window.location.origin : "") + "/patient", "url")}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {copiedField === "url" ? <Check className="text-emerald-600" size={14} /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-emerald-100 dark:border-slate-800 dark:bg-slate-800">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400">Login Email</span>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{portalProvisionResult.email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(portalProvisionResult.email, "email")}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {copiedField === "email" ? <Check className="text-emerald-600" size={14} /> : <Copy size={14} />}
                      </button>
                    </div>

                    {portalProvisionResult.temporaryPassword && (
                      <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-emerald-100 dark:border-slate-800 dark:bg-slate-800">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400">Temporary Password</span>
                          <div className="font-mono font-black text-slate-900 dark:text-white">{portalProvisionResult.temporaryPassword}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(portalProvisionResult.temporaryPassword!, "pw")}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          {copiedField === "pw" ? <Check className="text-emerald-600" size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Patient Login Email (optional override)</label>
                    <input
                      type="email"
                      value={portalEmailInput}
                      onChange={(e) => setPortalEmailInput(e.target.value)}
                      placeholder={`${patient.patientNumber.toLowerCase()}@patient.wonflow.com`}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Custom Password (leave blank for secure auto-generation)</label>
                    <input
                      type="text"
                      value={portalPasswordInput}
                      onChange={(e) => setPortalPasswordInput(e.target.value)}
                      placeholder="e.g. Patient#Pass2026 (or auto-generate)"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-semibold focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      disabled={portalLoading}
                      onClick={() => void handleProvisionPortal(portalPasswordInput.trim() === "")}
                      className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {portalLoading
                        ? "Generating…"
                        : portalStatus?.hasPortalAccess
                        ? "Reset / Update Credentials"
                        : "⚡ Generate Portal Credentials"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowPortalModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Patient Report & Print Modal */}
      {showReportModal && (
        <ConsultationReportModal
          encounter={encounter}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
        active
          ? "bg-white text-indigo-700 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:text-indigo-400 dark:shadow-none"
          : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
      } ${highlight && !active ? "text-indigo-600 font-black" : ""}`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
      <span>{label}</span>
      {badge ? (
        <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
          active ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
        }`}>
          {badge}
        </span>
      ) : null}
    </button>
  );
}

// -------------------------------------------------------------
// TAB 1: CLINICAL NOTES PANEL WITH DYNAMIC COMPLAINT SEARCH
// -------------------------------------------------------------
function ConsultationNotePanel({
  encounter,
  onSaved,
  isEditable,
}: {
  encounter: EncounterRecord;
  onSaved: () => void;
  isEditable: boolean;
}) {
  const { current: currentNote, history } = buildNoteChain(encounter);
  const isDraft = currentNote === undefined || currentNote.status === "DRAFT";

  const [noteText, setNoteText] = useState(() => readNoteText(currentNote?.content));
  const [noteId, setNoteId] = useState(isDraft ? currentNote?.id : undefined);
  const [noteVersion, setNoteVersion] = useState(currentNote?.version);
  const [amending, setAmending] = useState(false);

  // Dynamic chief complaints list
  const [complaintOptions, setComplaintOptions] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wonflow_custom_complaints");
      if (saved) {
        try {
          return Array.from(new Set([...INITIAL_CHIEF_COMPLAINTS, ...JSON.parse(saved)]));
        } catch {}
      }
    }
    return INITIAL_CHIEF_COMPLAINTS;
  });

  // Selected chief complaints as removable badge tags
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);

  const lastSavedTextRef = useRef(noteText);
  const noteIdRef = useRef(noteId);
  const noteVersionRef = useRef(noteVersion);

  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);

  useEffect(() => {
    noteVersionRef.current = noteVersion;
  }, [noteVersion]);

  const { mutate: saveDraft, saveState, error } = useSaveNoteDraft(encounter.id);
  const { mutate: sign, saveState: signState, error: signError } = useSignNote(encounter.id);

  const textEditable = isEditable && (isDraft || amending);

  useEffect(() => {
    if (!textEditable || noteText === lastSavedTextRef.current) return;
    const timeoutId = window.setTimeout(() => {
      const content: ConsultationNoteContent = { text: noteText };
      saveDraft({
        noteId: noteIdRef.current,
        noteType: CONSULTATION_NOTE_TYPE,
        content,
        version: noteVersionRef.current,
      })
        .then(({ note }) => {
          lastSavedTextRef.current = noteText;
          setNoteId(note.id);
          setNoteVersion(note.version);
        })
        .catch(() => {});
    }, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [textEditable, noteText, saveDraft]);

  function startAmendment(): void {
    setAmending(true);
    setNoteText("");
    lastSavedTextRef.current = "";
    setNoteId(undefined);
    setNoteVersion(undefined);
  }

  function handleAddComplaint(complaint: string) {
    if (!selectedComplaints.includes(complaint)) {
      setSelectedComplaints((prev) => [...prev, complaint]);
      // Append to note
      if (textEditable) {
        const prefix = noteText.trim() ? `${noteText}\n` : "";
        setNoteText(`${prefix}• Chief Complaint: ${complaint}`);
      }
    }
    // Save to options if new
    if (!complaintOptions.includes(complaint)) {
      const updated = [...complaintOptions, complaint];
      setComplaintOptions(updated);
      try {
        localStorage.setItem("wonflow_custom_complaints", JSON.stringify(updated));
      } catch {}
    }
  }

  function handleRemoveComplaint(complaint: string) {
    setSelectedComplaints((prev) => prev.filter((c) => c !== complaint));
  }

  function applySoapTemplate() {
    if (!textEditable) return;
    setNoteText(
      `SUBJECTIVE (S):\n- Chief Complaints: ${selectedComplaints.join(", ") || "None recorded"}\n- History of Present Illness (HPI):\n\nOBJECTIVE (O):\n- General Appearance:\n- Physical Examination Findings:\n\nASSESSMENT (A):\n- Clinical Impression:\n\nPLAN (P):\n- Treatment Plan & Patient Instructions:`,
    );
  }

  const comboboxItems: DynamicComboboxItem[] = useMemo(
    () => complaintOptions.map((c) => ({ label: c, badge: "Symptom", badgeTone: "indigo" })),
    [complaintOptions],
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
              <FilePenLine className="h-3.5 w-3.5" />
              <span>Electronic Medical Record</span>
            </div>
            <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">
              Consultation Documentation Note
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {textEditable ? (
              <button
                type="button"
                onClick={applySoapTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Insert SOAP Template</span>
              </button>
            ) : null}
          </div>
        </div>

        {!isDraft && !amending ? (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
            <FileCheck className="h-4 w-4 text-emerald-600" />
            <span>
              Signed on {currentNote?.signedAt ? new Date(currentNote.signedAt).toLocaleString() : ""} — this note is legally finalized and immutable.
            </span>
          </div>
        ) : null}

        {/* Dynamic Chief Complaints Searchable Dropdown & Removable Tags */}
        {textEditable ? (
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-3.5 dark:border-blue-950 dark:bg-blue-950/20">
            <DynamicSearchCombobox
              label="Search & Add Chief Complaints / Symptoms (Dropdown & Custom)"
              placeholder="Search complaint (e.g. Fever, Cough) or type custom and hit enter…"
              items={comboboxItems}
              onSelect={(item) => handleAddComplaint(item.label)}
              onAddNew={(query) => handleAddComplaint(query)}
              accentColor="blue"
            />

            {/* Selected Active Removable Complaint Tags */}
            {selectedComplaints.length > 0 ? (
              <div className="mt-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Active Chief Complaints ({selectedComplaints.length}):
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedComplaints.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-900 shadow-sm dark:border-blue-800 dark:bg-slate-800 dark:text-blue-200"
                    >
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveComplaint(c)}
                        className="rounded-full p-0.5 text-blue-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                        title="Delete complaint"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Note Textarea */}
        <textarea
          className="min-h-72 w-full rounded-2xl border border-slate-200/80 bg-white/90 p-4 font-mono text-sm leading-relaxed text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-slate-600 dark:border-slate-700 dark:bg-slate-800/90 dark:text-white"
          disabled={!textEditable}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder={amending ? "Enter amendment details for this finalized clinical note…" : "Document clinical history, physical examination findings, assessment, and treatment plan…"}
          value={amending ? noteText : isDraft ? noteText : readNoteText(currentNote?.content)}
        />

        {/* Save & Sign Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <SaveIndicator errorMessage={error?.message} state={amending || isDraft ? saveState : "idle"} />

          <div className="flex items-center gap-2">
            {isDraft && noteId !== undefined && noteText.trim() !== "" ? (
              <button
                type="button"
                disabled={signState === "saving"}
                onClick={() => {
                  void (async () => {
                    await sign(noteId);
                    onSaved();
                  })();
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {signState === "saving" ? "Signing Note…" : "Sign & Finalize Note"}
              </button>
            ) : null}

            {!isDraft && !amending && isEditable ? (
              <button
                type="button"
                onClick={startAmendment}
                className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
              >
                <Plus className="h-4 w-4" />
                <span>Add Amendment</span>
              </button>
            ) : null}
          </div>
        </div>

        {signError !== undefined ? (
          <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
            {signError.message}
          </p>
        ) : null}

        {/* Historical Amendments */}
        {history.length > 0 ? (
          <div className="mt-6 space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">
              Previous Version History ({history.length})
            </div>
            {history.map((note) => (
              <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <div className="mb-1.5 font-bold text-slate-500">
                  {note.status === "AMENDED" ? "Superseded / Amended" : note.status} • {new Date(note.createdAt).toLocaleString()}
                </div>
                <p className="whitespace-pre-wrap font-mono text-[13px]">{readNoteText(note.content)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

// -------------------------------------------------------------
// TAB 2: MEDICATIONS & FORMULARY PRESCRIPTION COMPOSER
// -------------------------------------------------------------
function GlassmorphicPrescriptionPanel({
  encounter,
  onSaved,
  isEditable,
}: {
  encounter: EncounterRecord;
  onSaved: () => void;
  isEditable: boolean;
}) {
  const [medicationsCatalog, setMedicationsCatalog] = useState<MedicationItem[]>([]);
  const [selectedMedication, setSelectedMedication] = useState<MedicationItem | null>(null);
  const [customMedName, setCustomMedName] = useState("");

  // Staged Prescription Items Tray
  const [stagedItems, setStagedItems] = useState<StagedMedication[]>([]);
  const [trayExpanded, setTrayExpanded] = useState(true);

  // Current item composer form
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState("Oral");
  const [frequency, setFrequency] = useState("Twice daily (BD)");
  const [duration, setDuration] = useState("5 days");
  const [quantity, setQuantity] = useState<string>("10");
  const [instructions, setInstructions] = useState("Take after meals with water");
  const [overallInstructions, setOverallInstructions] = useState("");

  const { mutate: issuePrescription, saveState: issueState, error: issueError } = useCreatePrescription(encounter.id);

  // Fetch medications from pharmacy
  const loadMedications = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/doctor/medications");
      if (!res.ok) return;
      const data = (await res.json()) as { medications?: MedicationItem[] };
      setMedicationsCatalog(data.medications ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    void loadMedications();
  }, [loadMedications]);

  // Save new custom medicine dynamically to pharmacy
  async function handleAddNewCustomMedicine(medName: string) {
    setCustomMedName(medName);
    setSelectedMedication(null);
    if (!dose) setDose("1 tablet");

    try {
      const res = await fetch("/api/v1/doctor/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genericName: medName, initialStock: 0 }),
      });
      if (res.ok) {
        const data = (await res.json()) as { medication?: MedicationItem };
        if (data.medication) {
          setMedicationsCatalog((prev) => [data.medication!, ...prev]);
          setSelectedMedication(data.medication);
        }
      }
    } catch {}
  }

  function handleSelectMedication(med: MedicationItem) {
    setSelectedMedication(med);
    setCustomMedName("");
    if (med.strength) setDose(med.strength);
    if (med.dosageForm?.toLowerCase().includes("inhaler")) {
      setRoute("Inhalation");
      setDose("1-2 puffs");
    } else if (med.dosageForm?.toLowerCase().includes("injection")) {
      setRoute("Intravenous (IV)");
    } else if (med.dosageForm?.toLowerCase().includes("capsule") || med.dosageForm?.toLowerCase().includes("tablet")) {
      setRoute("Oral");
    }
  }

  function handleAddMedicationToTray() {
    const medName = selectedMedication
      ? selectedMedication.brandName
        ? `${selectedMedication.genericName} (${selectedMedication.brandName})`
        : selectedMedication.genericName
      : customMedName.trim();

    if (!medName || !dose.trim() || !frequency.trim()) return;

    const newItem: StagedMedication = {
      medicationId: selectedMedication?.id ?? medName,
      name: medName,
      genericName: selectedMedication?.genericName,
      brandName: selectedMedication?.brandName,
      dose: dose.trim(),
      route,
      frequency,
      duration,
      quantity: Number(quantity) || undefined,
      instructions: instructions.trim(),
    };

    setStagedItems((prev) => [...prev, newItem]);
    setTrayExpanded(true);

    // Reset fields for next medication
    setSelectedMedication(null);
    setCustomMedName("");
    setDose("");
    setInstructions("Take after meals with water");
  }

  function handleRemoveStagedItem(index: number) {
    setStagedItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFinalizeAndIssuePrescription() {
    if (stagedItems.length === 0) return;
    try {
      await issuePrescription({
        instructions: overallInstructions.trim() || undefined,
        items: stagedItems.map((item) => ({
          medicationId: item.medicationId,
          dose: item.dose,
          route: item.route,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          instructions: item.instructions || undefined,
        })),
      });
      setStagedItems([]);
      setOverallInstructions("");
      onSaved();
    } catch {}
  }

  const comboboxItems: DynamicComboboxItem[] = useMemo(() => {
    return medicationsCatalog.map((m) => {
      const stock = m.availableQuantity ?? 0;
      const inStock = stock > 0;
      return {
        id: m.id,
        label: m.brandName ? `${m.genericName} (${m.brandName})` : m.genericName,
        sublabel: `${m.strength ?? ""} ${m.dosageForm ? `• ${m.dosageForm}` : ""}`,
        badge: inStock ? `In Pharmacy: ${stock}` : "Not in Stock",
        badgeTone: inStock ? "emerald" : "slate",
        data: m,
      };
    });
  }, [medicationsCatalog]);

  const activeSelectedName = selectedMedication
    ? selectedMedication.brandName
      ? `${selectedMedication.genericName} (${selectedMedication.brandName})`
      : selectedMedication.genericName
    : customMedName;

  const isSelectedOutOfStock = selectedMedication && (selectedMedication.availableQuantity ?? 0) <= 0;

  return (
    <div className="space-y-6">
      {/* Search & Composer Glassmorphic Card */}
      {isEditable ? (
        <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white/90 via-indigo-50/30 to-violet-50/20 p-6 shadow-2xl shadow-indigo-950/5 backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/10 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                <Pill className="h-3.5 w-3.5" />
                <span>Medical Prescription Composer</span>
              </div>
              <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">
                Prescribe Medication
              </h2>
            </div>

            {stagedItems.length > 0 ? (
              <button
                type="button"
                onClick={() => setTrayExpanded(!trayExpanded)}
                className="inline-flex items-center gap-2 rounded-2xl border border-indigo-300 bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700"
              >
                <Layers className="h-4 w-4" />
                <span>Prescription Tray ({stagedItems.length})</span>
                {trayExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            {/* Dynamic Medication Search Combobox */}
            <DynamicSearchCombobox
              label="Search Medication Formulary or Enter Custom Name"
              placeholder="Search generic/brand name (e.g. Panadol, Augmentin, Risek)…"
              items={comboboxItems}
              onSelect={(item) => handleSelectMedication(item.data as MedicationItem)}
              onAddNew={(query) => handleAddNewCustomMedicine(query)}
              accentColor="indigo"
              icon={Pill}
            />

            {/* Currently Selected Medicine Chip with Stock Notice */}
            {activeSelectedName ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3 dark:border-indigo-900 dark:bg-indigo-950/40">
                  <div className="flex items-center gap-2.5">
                    <Pill className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <span className="text-xs font-black text-indigo-950 dark:text-indigo-100">
                        Selected: {activeSelectedName}
                      </span>
                      {selectedMedication ? (
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                          {selectedMedication.strength} {selectedMedication.dosageForm ? `• ${selectedMedication.dosageForm}` : ""} • Code: {selectedMedication.code} •{" "}
                          {(selectedMedication.availableQuantity ?? 0) > 0 ? (
                            <span className="text-emerald-700 font-bold">🟢 Available in Hospital Pharmacy ({selectedMedication.availableQuantity} units)</span>
                          ) : (
                            <span className="text-slate-600 font-semibold">ℹ️ Not currently in hospital pharmacy stock</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Custom Prescribed Medication
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMedication(null);
                      setCustomMedName("");
                    }}
                    className="rounded-xl border border-indigo-200 bg-white p-1.5 text-indigo-600 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800"
                    title="Remove selected medication"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {/* Dosage, Route, Frequency, Duration Composer Form */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Dose / Strength</label>
                <input
                  type="text"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="e.g. 500mg, 1 tablet, 5ml"
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 text-xs font-bold text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 text-xs font-bold text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {FREQUENCY_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Route of Administration</label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 text-xs font-bold text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {ROUTE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 text-xs font-bold text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {DURATION_PRESETS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Special Patient Instructions */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Specific Administration Instructions</label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take after meals with plenty of water"
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 text-xs font-bold text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Total Quantity to Prescribe</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 10"
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 text-xs font-bold text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Add to Prescription Tray Button */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex flex-wrap gap-1.5">
                {INSTRUCTION_PRESETS.slice(0, 3).map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => setInstructions(inst)}
                    className="rounded-lg bg-slate-100/90 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    + {inst}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddMedicationToTray}
                disabled={!activeSelectedName || !dose.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                <span>Add to Prescription</span>
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Interactive Staged Prescriptions Tray */}
      {stagedItems.length > 0 ? (
        <section className="overflow-hidden rounded-3xl border border-indigo-200 bg-white/95 p-5 shadow-xl backdrop-blur-2xl dark:border-indigo-900 dark:bg-slate-900/95">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 dark:text-white">
                  Prescription Tray ({stagedItems.length} {stagedItems.length === 1 ? "Medicine" : "Medicines"} Prescribed)
                </h3>
                <p className="text-xs text-slate-500">
                  Review prescribed medicines before signing and issuing.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTrayExpanded(!trayExpanded)}
              className="rounded-xl border border-indigo-200 bg-white/80 p-2 text-indigo-700 shadow-sm transition hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300"
            >
              {trayExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {trayExpanded && (
            <div className="mt-4 space-y-3">
              <div className="grid gap-2">
                {stagedItems.map((item, index) => (
                  <div
                    key={`${item.medicationId}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">{item.name}</span>
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">{item.dose}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                          {item.route} • {item.frequency} • {item.duration} {item.quantity ? `• Qty: ${item.quantity}` : ""}
                        </p>
                        {item.instructions ? <p className="text-[10px] italic text-slate-500">Instructions: {item.instructions}</p> : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStagedItem(index)}
                      className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Doctor General Advice / Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={overallInstructions}
                  onChange={(e) => setOverallInstructions(e.target.value)}
                  placeholder="e.g. Follow up in 5 days if symptoms persist. Keep well hydrated."
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <SaveIndicator errorMessage={issueError?.message} state={issueState === "saved" ? "idle" : issueState} />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStagedItems([])}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                  >
                    Clear Tray
                  </button>
                  <button
                    type="button"
                    disabled={issueState === "saving"}
                    onClick={() => void handleFinalizeAndIssuePrescription()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-xs font-black text-white shadow-xl shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {issueState === "saving" ? "Signing & Issuing Rx…" : "Sign & Issue Prescription"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* Issued Prescriptions List */}
      <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black text-slate-950 dark:text-white">Issued Prescriptions</h3>
            <p className="text-xs text-slate-500">Official prescriptions logged in the patient electronic medical record.</p>
          </div>
          <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {encounter.prescriptions.length} {encounter.prescriptions.length === 1 ? "Prescription" : "Prescriptions"}
          </span>
        </div>

        {encounter.prescriptions.length === 0 ? (
          <div className="py-8 text-center">
            <Pill className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-xs font-bold text-slate-500">No prescriptions issued for this consultation yet.</p>
            <p className="text-[11px] text-slate-400">Use the formulary search bar above to compose and issue medications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {encounter.prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/90"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {prescription.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      Prescribed: {new Date(prescription.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    Rx ID: {prescription.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                {prescription.instructions ? (
                  <div className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">
                    <strong>Doctor Instructions:</strong> {prescription.instructions}
                  </div>
                ) : null}

                <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
                  {prescription.items.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {item.medication?.name ?? item.medicationId}
                          </span>
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {item.dose}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {item.route ? `${item.route} • ` : ""}{item.frequency} • {item.duration ?? "Standard duration"}
                        </p>
                      </div>
                      {item.instructions ? (
                        <span className="text-[11px] italic text-slate-500">{item.instructions}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// -------------------------------------------------------------
// TAB 3: VITALS & OBSERVATIONS PANEL
// -------------------------------------------------------------
function ObservationsPanel({
  encounter,
  onSaved,
  isEditable,
}: {
  encounter: EncounterRecord;
  onSaved: () => void;
  isEditable: boolean;
}) {
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");
  const [pulse, setPulse] = useState("72");
  const [spo2, setSpo2] = useState("98");
  const [temperature, setTemperature] = useState("98.6");
  const [respiratoryRate, setRespiratoryRate] = useState("16");
  const [glucose, setGlucose] = useState("110");
  const [weightKg, setWeightKg] = useState("70");
  const [heightCm, setHeightCm] = useState("172");

  // Custom observation dynamic field
  const [customObsName, setCustomObsName] = useState("");
  const [customObsValue, setCustomObsValue] = useState("");
  const [customObsUnit, setCustomObsUnit] = useState("");

  const { mutate: recordObs, saveState, error } = useRecordObservation(encounter.id);

  // BMI Calculation
  const bmi = useMemo(() => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm) / 100;
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return null;
  }, [weightKg, heightCm]);

  async function handleRecordAllVitals(): Promise<void> {
    const now = new Date().toISOString();
    const vitalsToSave = [
      { code: "BP", display: "Blood Pressure", valueText: `${systolic}/${diastolic} mmHg` },
      { code: "PULSE", display: "Heart Rate", valueText: `${pulse} bpm` },
      { code: "SPO2", display: "Oxygen Saturation (SpO2)", valueText: `${spo2} %` },
      { code: "TEMP", display: "Body Temperature", valueText: `${temperature} °F` },
      { code: "RR", display: "Respiratory Rate", valueText: `${respiratoryRate} /min` },
      { code: "RBS", display: "Blood Glucose", valueText: `${glucose} mg/dL` },
      { code: "WT", display: "Weight", valueText: `${weightKg} kg` },
      { code: "HT", display: "Height", valueText: `${heightCm} cm` },
      ...(bmi ? [{ code: "BMI", display: "Body Mass Index (BMI)", valueText: `${bmi} kg/m²` }] : []),
    ];

    if (customObsName.trim() && customObsValue.trim()) {
      vitalsToSave.push({
        code: `CUSTOM-${Date.now().toString(36).toUpperCase()}`,
        display: customObsName.trim(),
        valueText: `${customObsValue.trim()} ${customObsUnit.trim()}`.trim(),
      });
    }

    for (const v of vitalsToSave) {
      await recordObs({
        code: v.code,
        display: v.display,
        valueText: v.valueText,
        observedAt: now,
      });
    }
    setCustomObsName("");
    setCustomObsValue("");
    setCustomObsUnit("");
    onSaved();
  }

  return (
    <div className="space-y-6">
      {isEditable ? (
        <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                <Activity className="h-3.5 w-3.5" />
                <span>Clinical Vitals & Measurements</span>
              </div>
              <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">
                Record Patient Vitals
              </h2>
            </div>
            {bmi ? (
              <div className="flex items-center gap-2 rounded-2xl bg-indigo-50 px-3.5 py-1.5 text-xs font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                <span>Calculated BMI: {bmi} kg/m²</span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <VitalCard label="Blood Pressure (mmHg)" icon={Heart} tone="rose">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="Sys"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-bold"
                />
                <span className="font-bold text-slate-400">/</span>
                <input
                  type="text"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="Dia"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-bold"
                />
              </div>
            </VitalCard>

            <VitalCard label="Heart Rate (Pulse)" icon={Activity} tone="violet">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-bold"
                />
                <span className="text-xs font-bold text-slate-400">BPM</span>
              </div>
            </VitalCard>

            <VitalCard label="Oxygen Saturation (SpO2)" icon={Droplet} tone="blue">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-bold"
                />
                <span className="text-xs font-bold text-slate-400">%</span>
              </div>
            </VitalCard>

            <VitalCard label="Body Temperature" icon={Thermometer} tone="amber">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-bold"
                />
                <span className="text-xs font-bold text-slate-400">°F</span>
              </div>
            </VitalCard>

            <VitalCard label="Respiratory Rate" icon={Activity} tone="emerald">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-bold"
                />
                <span className="text-xs font-bold text-slate-400">/min</span>
              </div>
            </VitalCard>

            <VitalCard label="Blood Glucose (Random/Fasting)" icon={FlaskConical} tone="indigo">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-bold"
                />
                <span className="text-xs font-bold text-slate-400">mg/dL</span>
              </div>
            </VitalCard>

            <VitalCard label="Patient Weight" icon={User} tone="slate">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-bold"
                />
                <span className="text-xs font-bold text-slate-400">kg</span>
              </div>
            </VitalCard>

            <VitalCard label="Patient Height" icon={User} tone="slate">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-bold"
                />
                <span className="text-xs font-bold text-slate-400">cm</span>
              </div>
            </VitalCard>
          </div>

          {/* Custom Measurement Dynamic Entry */}
          <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Add Custom Measurement / Observation (Optional)
            </span>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Measurement Name (e.g. Peak Flow, Waist)"
                value={customObsName}
                onChange={(e) => setCustomObsName(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900"
              />
              <input
                type="text"
                placeholder="Value (e.g. 450, 34)"
                value={customObsValue}
                onChange={(e) => setCustomObsValue(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900"
              />
              <input
                type="text"
                placeholder="Unit (e.g. L/min, inches)"
                value={customObsUnit}
                onChange={(e) => setCustomObsUnit(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <SaveIndicator errorMessage={error?.message} state={saveState === "saved" ? "idle" : saveState} />

            <button
              type="button"
              disabled={saveState === "saving"}
              onClick={() => void handleRecordAllVitals()}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>Record Vitals Set</span>
            </button>
          </div>
        </section>
      ) : null}

      {/* Observation Records History */}
      <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
        <h3 className="mb-4 text-base font-black text-slate-950 dark:text-white">Observation History</h3>
        {encounter.patient.observations.length === 0 ? (
          <p className="py-6 text-center text-xs font-semibold text-slate-500">No vitals or observations recorded yet.</p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {encounter.patient.observations.map((obs) => (
              <div key={obs.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{obs.display}</div>
                <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {obs.valueText ?? obs.valueNumber ?? "—"} {obs.unit ?? ""}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  {new Date(obs.observedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function VitalCard({
  label,
  icon: Icon,
  tone,
  children,
}: {
  label: string;
  icon: LucideIcon;
  tone: "rose" | "violet" | "blue" | "amber" | "emerald" | "indigo" | "slate";
  children: React.ReactNode;
}) {
  const toneClasses = {
    rose: "bg-rose-500/10 text-rose-600 border-rose-200/60",
    violet: "bg-violet-500/10 text-violet-600 border-violet-200/60",
    blue: "bg-blue-500/10 text-blue-600 border-blue-200/60",
    amber: "bg-amber-500/10 text-amber-600 border-amber-200/60",
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-200/60",
    indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-200/60",
    slate: "bg-slate-500/10 text-slate-600 border-slate-200/60",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-6 w-6 items-center justify-center rounded-lg border ${toneClasses[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      {children}
    </div>
  );
}

// -------------------------------------------------------------
// TAB 4: DIAGNOSES PANEL WITH DYNAMIC SEARCH & DELETE
// -------------------------------------------------------------
function DiagnosesPanel({
  encounter,
  onSaved,
  isEditable,
}: {
  encounter: EncounterRecord;
  onSaved: () => void;
  isEditable: boolean;
}) {
  const [display, setDisplay] = useState("");
  const [code, setCode] = useState("");
  const [certainty, setCertainty] = useState<DiagnosisCertainty>("PROVISIONAL");
  const [isPrimary, setIsPrimary] = useState(false);
  const [notes, setNotes] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dynamic conditions list
  const [diagnosisOptions, setDiagnosisOptions] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wonflow_custom_diagnoses");
      if (saved) {
        try {
          return [...INITIAL_DIAGNOSES, ...JSON.parse(saved)];
        } catch {}
      }
    }
    return INITIAL_DIAGNOSES;
  });

  const { mutate, saveState, error } = useAddDiagnosis(encounter.id);

  async function submit(): Promise<void> {
    if (display.trim() === "") return;
    await mutate({
      display: display.trim(),
      code: code.trim() || undefined,
      certainty,
      isPrimary,
      notes: notes.trim() || undefined,
    });

    // Save to dynamic options if new
    if (!diagnosisOptions.some((d) => d.display.toLowerCase() === display.trim().toLowerCase())) {
      const newEntry = { display: display.trim(), code: code.trim() || "CUSTOM", certainty };
      const updated = [...diagnosisOptions, newEntry];
      setDiagnosisOptions(updated);
      try {
        localStorage.setItem("wonflow_custom_diagnoses", JSON.stringify(updated));
      } catch {}
    }

    setDisplay("");
    setCode("");
    setNotes("");
    setIsPrimary(false);
    onSaved();
  }

  async function handleDeleteDiagnosis(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/v1/doctor/encounters/${encounter.id}/diagnoses?diagnosisId=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      onSaved();
    } catch {} finally {
      setDeletingId(null);
    }
  }

  const comboboxItems: DynamicComboboxItem[] = useMemo(() => {
    return diagnosisOptions.map((d) => ({
      label: d.display,
      sublabel: d.code ? `ICD Code: ${d.code}` : undefined,
      badge: d.certainty,
      badgeTone: d.certainty === "CONFIRMED" ? "emerald" : "amber",
      data: d,
    }));
  }, [diagnosisOptions]);

  return (
    <div className="space-y-6">
      {isEditable ? (
        <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <Stethoscope className="h-3.5 w-3.5" />
              <span>Clinical Diagnostic Findings</span>
            </div>
            <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">
              Add Diagnosis (ICD-10 / Clinical Impression)
            </h2>
          </div>

          {/* Searchable Diagnosis Combobox */}
          <div className="mb-4">
            <DynamicSearchCombobox
              label="Search or Enter Diagnosis (Dropdown with Search & Custom Field)"
              placeholder="Search ICD-10 conditions (e.g. Hypertension, Diabetes) or type custom diagnosis…"
              items={comboboxItems}
              onSelect={(item) => {
                const d = item.data as typeof INITIAL_DIAGNOSES[number];
                setDisplay(d.display);
                setCode(d.code || "");
                setCertainty(d.certainty);
              }}
              onAddNew={(query) => {
                setDisplay(query);
                setCode("CUSTOM");
              }}
              accentColor="amber"
              icon={Stethoscope}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Diagnosis Name (Selected / Editable)</label>
              <input
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 text-xs font-bold text-slate-900 shadow-inner outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                onChange={(e) => setDisplay(e.target.value)}
                placeholder="e.g. Essential Hypertension"
                value={display}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Certainty Level</label>
              <select
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 text-xs font-bold text-slate-900 shadow-inner outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                onChange={(e) => setCertainty(e.target.value as DiagnosisCertainty)}
                value={certainty}
              >
                <option value="PROVISIONAL">Provisional Diagnosis</option>
                <option value="CONFIRMED">Confirmed Diagnosis</option>
                <option value="DIFFERENTIAL">Differential Diagnosis</option>
                <option value="REFUTED">Refuted</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <SaveIndicator errorMessage={error?.message} state={saveState === "saved" ? "idle" : saveState} />

            <button
              type="button"
              disabled={saveState === "saving" || display.trim() === ""}
              onClick={() => void submit()}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Record Diagnosis</span>
            </button>
          </div>
        </section>
      ) : null}

      {/* Documented Diagnoses List with Delete Action */}
      <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
        <h3 className="mb-4 text-base font-black text-slate-950 dark:text-white">Documented Diagnoses ({encounter.diagnoses.length})</h3>
        {encounter.diagnoses.length === 0 ? (
          <p className="py-6 text-center text-xs font-semibold text-slate-500">No diagnoses documented for this encounter yet.</p>
        ) : (
          <div className="space-y-2.5">
            {encounter.diagnoses.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white">{d.display}</span>
                      {d.code ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">{d.code}</span> : null}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">Logged {new Date(d.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    d.certainty === "CONFIRMED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {d.certainty}
                  </span>
                  {isEditable ? (
                    <button
                      type="button"
                      disabled={deletingId === d.id}
                      onClick={() => void handleDeleteDiagnosis(d.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                      title="Delete diagnosis"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// -------------------------------------------------------------
// TAB 5: DIAGNOSTIC ORDERS (LAB & RADIOLOGY) WITH DYNAMIC SEARCH
// -------------------------------------------------------------
function OrdersPanel({
  encounter,
  onSaved,
  isEditable,
}: {
  encounter: EncounterRecord;
  onSaved: () => void;
  isEditable: boolean;
}) {
  const [type, setType] = useState<DiagnosticOrderType>("LABORATORY");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("routine");
  const [clinicalReason, setClinicalReason] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dynamic order lists
  const [labOptions, setLabOptions] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wonflow_custom_labs");
      if (saved) {
        try {
          return [...INITIAL_LAB_ORDERS, ...JSON.parse(saved)];
        } catch {}
      }
    }
    return INITIAL_LAB_ORDERS;
  });

  const [radOptions, setRadOptions] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wonflow_custom_rads");
      if (saved) {
        try {
          return [...INITIAL_RADIOLOGY_ORDERS, ...JSON.parse(saved)];
        } catch {}
      }
    }
    return INITIAL_RADIOLOGY_ORDERS;
  });

  const { mutate, saveState, error } = useCreateOrder(encounter.id);

  async function submit(): Promise<void> {
    if (name.trim() === "") return;
    const finalCode = code.trim() || `ORD-${Date.now().toString(36).toUpperCase()}`;
    await mutate({
      type,
      code: finalCode,
      name: name.trim(),
      priority,
      clinicalReason: clinicalReason.trim() || undefined,
    });

    // Save to dynamic options if new
    const currentList = type === "LABORATORY" ? labOptions : radOptions;
    if (!currentList.some((item) => item.name.toLowerCase() === name.trim().toLowerCase())) {
      const newEntry = { name: name.trim(), code: finalCode, priority };
      if (type === "LABORATORY") {
        const updated = [...labOptions, newEntry];
        setLabOptions(updated);
        try { localStorage.setItem("wonflow_custom_labs", JSON.stringify(updated)); } catch {}
      } else {
        const updated = [...radOptions, newEntry];
        setRadOptions(updated);
        try { localStorage.setItem("wonflow_custom_rads", JSON.stringify(updated)); } catch {}
      }
    }

    setCode("");
    setName("");
    setClinicalReason("");
    onSaved();
  }

  async function handleDeleteOrder(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/v1/doctor/encounters/${encounter.id}/orders?orderId=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      onSaved();
    } catch {} finally {
      setDeletingId(null);
    }
  }

  const comboboxItems: DynamicComboboxItem[] = useMemo(() => {
    const list = type === "LABORATORY" ? labOptions : radOptions;
    return list.map((item) => ({
      label: item.name,
      sublabel: `Test Code: ${item.code}`,
      badge: item.priority,
      badgeTone: item.priority === "urgent" || item.priority === "stat" ? "amber" : "slate",
      data: item,
    }));
  }, [type, labOptions, radOptions]);

  return (
    <div className="space-y-6">
      {isEditable ? (
        <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Laboratory & Imaging Requisitions</span>
            </div>
            <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">
              Place Diagnostic Order
            </h2>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setType("LABORATORY")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
                type === "LABORATORY" ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Laboratory Investigations</span>
            </button>
            <button
              type="button"
              onClick={() => setType("RADIOLOGY")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
                type === "RADIOLOGY" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Radiology & Imaging</span>
            </button>
          </div>

          {/* Searchable Test Combobox */}
          <div className="mb-4">
            <DynamicSearchCombobox
              label={`Search or Enter ${type === "LABORATORY" ? "Lab Test" : "Radiology Scan"} (Dropdown & Custom)`}
              placeholder={`Search popular ${type.toLowerCase()} procedures or type custom requisition…`}
              items={comboboxItems}
              onSelect={(item) => {
                const d = item.data as { name: string; code: string; priority: string };
                setName(d.name);
                setCode(d.code);
                setPriority(d.priority);
              }}
              onAddNew={(query) => {
                setName(query);
                setCode(`ORD-${Date.now().toString(36).toUpperCase()}`);
              }}
              accentColor="emerald"
              icon={type === "LABORATORY" ? FlaskConical : Radio}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Test / Procedure Name</label>
              <input
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 text-xs font-bold text-slate-900 shadow-inner outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Complete Blood Count (CBC)"
                value={name}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Priority</label>
              <select
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 text-xs font-bold text-slate-900 shadow-inner outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                onChange={(e) => setPriority(e.target.value)}
                value={priority}
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT / Immediate</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <SaveIndicator errorMessage={error?.message} state={saveState === "saved" ? "idle" : saveState} />

            <button
              type="button"
              disabled={saveState === "saving" || name.trim() === ""}
              onClick={() => void submit()}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Place Requisition Order</span>
            </button>
          </div>
        </section>
      ) : null}

      {/* Requested Diagnostic Orders List with Delete Action */}
      <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
        <h3 className="mb-4 text-base font-black text-slate-950 dark:text-white">Requested Diagnostic Orders ({encounter.diagnosticOrders.length})</h3>
        {encounter.diagnosticOrders.length === 0 ? (
          <p className="py-6 text-center text-xs font-semibold text-slate-500">No diagnostic orders requisitioned yet.</p>
        ) : (
          <div className="space-y-2.5">
            {encounter.diagnosticOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    order.type === "LABORATORY" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
                  }`}>
                    {order.type === "LABORATORY" ? <FlaskConical className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">{order.name}</h4>
                    <p className="text-[11px] text-slate-500">Code: {order.code} • Priority: {order.priority}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    {order.status}
                  </span>
                  {isEditable ? (
                    <button
                      type="button"
                      disabled={deletingId === order.id}
                      onClick={() => void handleDeleteOrder(order.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                      title="Cancel/delete order"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// -------------------------------------------------------------
// TAB 6: PATIENT HISTORY PANEL
// -------------------------------------------------------------
function PatientHistoryPanel({ encounter }: { encounter: EncounterRecord }) {
  const patient = encounter.patient;
  return (
    <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
      <h3 className="mb-4 text-base font-black text-slate-950 dark:text-white">Patient Record Overview</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Demographics</span>
          <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white">Full Name: {patientDisplayName(patient)}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">MRN: {patient.patientNumber}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Gender: {patient.sex ?? "—"}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Allergies & Alerts</span>
          {patient.allergies.length > 0 ? (
            <ul className="mt-1 space-y-1 text-xs font-bold text-rose-700">
              {patient.allergies.map((a) => (
                <li key={a.id}>• {a.substance} ({a.severity.toLowerCase()})</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-slate-500">No known drug allergies recorded.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Encounter Info</span>
          <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white">Encounter ID: {encounter.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Started: {encounter.startedAt ? new Date(encounter.startedAt).toLocaleString() : "Not started"}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Status: {encounter.status}</p>
        </div>
      </div>
    </section>
  );
}

// -------------------------------------------------------------
// COMPLETE PATIENT REPORT & DOCTOR SIGNATURE PRINT MODAL
// -------------------------------------------------------------
type ReportFormatType = "rx_prescription" | "comprehensive_summary" | "medical_certificate";

function ConsultationReportModal({
  encounter,
  onClose,
}: {
  encounter: EncounterRecord;
  onClose: () => void;
}) {
  const session = useWonFlowSession();
  const [format, setFormat] = useState<ReportFormatType>("comprehensive_summary");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  // Hospital & Sitting Chamber Information
  const [hospitalName, setHospitalName] = useState(session?.orgLabel || "WONFLOW MEMORIAL HOSPITAL");
  const [branchLocation, setBranchLocation] = useState(session?.branchLabel || "Main Medical Complex");
  const [chamberRoom, setChamberRoom] = useState("Room 104 - Consultant OPD Chamber");
  const [department, setDepartment] = useState("Department of Internal Medicine & Clinical Care");
  const [hospitalContact, setHospitalContact] = useState("Tel: +92 (042) 111-966-356 • Emergency: 24/7");

  // Doctor Details & Credentials
  const [doctorName, setDoctorName] = useState(session?.name || "Dr. Attending Consultant");
  const [qualifications, setQualifications] = useState("MBBS, FCPS (Medicine), MRCP");
  const [specialty, setSpecialty] = useState("Consultant Physician & Specialist");
  const [licenseNo, setLicenseNo] = useState("PMDC-74892-A");
  const [certificateReason, setCertificateReason] = useState("Acute illness requiring medical rest and recovery");
  const [restDays, setRestDays] = useState("3");

  const [activeConfigTab, setActiveConfigTab] = useState<"doctor" | "hospital" | "signature">("doctor");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const patient = encounter.patient;
  const { current: currentNote } = buildNoteChain(encounter);

  // Safely load signature & fetch live doctor profile on mount
  useEffect(() => {
    try {
      const savedSig = localStorage.getItem("wonflow_doctor_signature");
      if (savedSig) setSignatureUrl(savedSig);
    } catch {}

    let active = true;
    async function loadDoctorProfile() {
      try {
        const res = await fetch("/api/v1/doctor/profile");
        if (!res.ok) return;
        const data = (await res.json()) as {
          profile?: {
            displayName?: string;
            specialtyName?: string;
            qualifications?: string;
            registrationNumber?: string;
            title?: string;
          };
          branches?: Array<{ id: string; name: string }>;
        };
        if (active && data.profile) {
          if (data.profile.displayName) setDoctorName(data.profile.displayName);
          if (data.profile.specialtyName) setSpecialty(data.profile.specialtyName);
          if (data.profile.qualifications) setQualifications(data.profile.qualifications);
          if (data.profile.registrationNumber) setLicenseNo(data.profile.registrationNumber);
        }
      } catch {}
    }
    void loadDoctorProfile();
    return () => {
      active = false;
    };
  }, []);

  function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setSignatureUrl(base64);
        try {
          localStorage.setItem("wonflow_doctor_signature", base64);
        } catch {}
      };
      reader.readAsDataURL(file);
    }
  }

  function handlePrint() {
    window.print();
  }

  // All prescribed items across all prescriptions
  const allPrescriptionItems = useMemo(() => {
    return encounter.prescriptions.flatMap((rx) =>
      rx.items.map((item) => ({
        ...item,
        rxId: rx.id,
        rxInstructions: rx.instructions,
      })),
    );
  }, [encounter.prescriptions]);

  const hospitalInitials = useMemo(() => {
    return hospitalName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "WF";
  }, [hospitalName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="relative my-8 flex w-full max-w-5xl flex-col rounded-3xl border border-white/40 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh]">
        {/* Modal Controls Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200/80 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Patient Medical Report & Prescription Documentation
              </h3>
              <p className="text-xs text-slate-500">
                Official clinical consultation record with doctor credentials and facility sitting location.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-violet-700"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Export PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Customization Toolbar (Screen Only) */}
        <div className="border-b border-slate-100 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-800/60">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3 dark:border-slate-700">
            {/* Format Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-slate-500">Slip Format:</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ReportFormatType)}
                className="h-8.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 shadow-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="comprehensive_summary">Comprehensive Consultation Summary (Full Record)</option>
                <option value="rx_prescription">Official Medical Prescription (Rx Only)</option>
                <option value="medical_certificate">Medical Fitness / Sick Leave Certificate</option>
              </select>
            </div>

            {/* Config Sub-Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-slate-900/60 text-xs font-black">
              <button
                type="button"
                onClick={() => setActiveConfigTab("doctor")}
                className={`rounded-lg px-3 py-1 transition ${
                  activeConfigTab === "doctor" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                👨‍⚕️ Doctor Credentials
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigTab("hospital")}
                className={`rounded-lg px-3 py-1 transition ${
                  activeConfigTab === "hospital" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                🏥 Hospital & Sitting Location
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigTab("signature")}
                className={`rounded-lg px-3 py-1 transition ${
                  activeConfigTab === "signature" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                ✍️ Signature & Seal
              </button>
            </div>
          </div>

          {/* Config Tab 1: Doctor Profile */}
          {activeConfigTab === "doctor" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Doctor Name</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Doctor Name"
                  className="h-8.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-bold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Qualifications / Degrees</label>
                <input
                  type="text"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="e.g. MBBS, FCPS, MRCP"
                  className="h-8.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-bold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Specialty / Designation</label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Consultant Physician"
                  className="h-8.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-bold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">PMDC / License Reg #</label>
                <input
                  type="text"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  placeholder="e.g. PMDC-74892-P"
                  className="h-8.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-bold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Config Tab 2: Hospital & Sitting Location */}
          {activeConfigTab === "hospital" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Hospital / Clinic Name</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="Hospital Name"
                  className="h-8.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-bold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Branch / Facility Location</label>
                <input
                  type="text"
                  value={branchLocation}
                  onChange={(e) => setBranchLocation(e.target.value)}
                  placeholder="e.g. Main Medical Complex"
                  className="h-8.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-bold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">OPD Chamber / Room #</label>
                <input
                  type="text"
                  value={chamberRoom}
                  onChange={(e) => setChamberRoom(e.target.value)}
                  placeholder="e.g. Room 104 - Consultant OPD"
                  className="h-8.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-bold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Helpline / Emergency Tel</label>
                <input
                  type="text"
                  value={hospitalContact}
                  onChange={(e) => setHospitalContact(e.target.value)}
                  placeholder="Helpline Contact"
                  className="h-8.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-bold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Config Tab 3: Signature & Certificate Settings */}
          {activeConfigTab === "signature" && (
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <input
                type="file"
                accept="image/png, image/jpeg"
                ref={fileInputRef}
                onChange={handleSignatureUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-white px-4 font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300"
              >
                <Upload className="h-4 w-4" />
                <span>{signatureUrl ? "Replace Signature Image" : "Upload Doctor Signature (.png/.jpg)"}</span>
              </button>

              {signatureUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setSignatureUrl(null);
                    try { localStorage.removeItem("wonflow_doctor_signature"); } catch {}
                  }}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 font-bold text-rose-600 hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Remove Signature</span>
                </button>
              )}

              {format === "medical_certificate" && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">Excused Days:</span>
                  <input
                    type="number"
                    min="1"
                    value={restDays}
                    onChange={(e) => setRestDays(e.target.value)}
                    className="h-8.5 w-16 rounded-xl border border-slate-200 bg-white px-2 font-black text-slate-900 shadow-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Printable Document Sheet Preview */}
        <div className="overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            id="printable-consultation-report"
            className="w-full max-w-[794px] min-h-[1123px] bg-white p-8 text-slate-900 shadow-2xl rounded-2xl border border-slate-200"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            {/* Hospital Branding & Facility Sitting Header */}
            <div className="flex items-start justify-between border-b-2 border-indigo-900 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-900 text-white font-black text-xl shadow-md">
                  {hospitalInitials}
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-indigo-950">
                    {hospitalName.toUpperCase()}
                  </h1>
                  <p className="text-xs font-bold text-slate-700">
                    🏥 Facility: <strong>{branchLocation}</strong> • <strong>{chamberRoom}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {department} • {hospitalContact}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block rounded-lg bg-indigo-50 px-3 py-1 text-xs font-black uppercase text-indigo-900">
                  {format === "rx_prescription"
                    ? "Official Medical Prescription"
                    : format === "medical_certificate"
                    ? "Medical Fitness Certificate"
                    : "Clinical Consultation Summary"}
                </span>
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  Encounter: {encounter.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-[11px] font-bold text-slate-500">
                  Date: {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Patient & Doctor Demographics Matrix Strip */}
            <div className="my-4 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs font-bold border border-slate-200">
              <div className="grid grid-cols-4 gap-3 border-b border-slate-200 pb-2.5">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Patient Name</span>
                  <span className="text-slate-950 font-black text-sm">{patientDisplayName(patient)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">MR Number</span>
                  <span className="text-indigo-900 font-mono font-bold">{patient.patientNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Age / Gender</span>
                  <span>
                    {patient.dateOfBirth ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} Yrs` : "—"} / {patient.sex ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Encounter Date</span>
                  <span className="text-slate-800">{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Doctor Information & Hospital Sitting Row */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Consulting Doctor</span>
                  <span className="text-slate-950 font-black">{doctorName}</span>
                  <span className="text-[10px] text-slate-500 block font-normal">{qualifications}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Specialty & License</span>
                  <span className="text-slate-900 font-bold">{specialty}</span>
                  <span className="text-[10px] font-mono text-indigo-700 block">Reg #: {licenseNo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Clinic Sitting</span>
                  <span className="text-slate-900 font-bold">{branchLocation}</span>
                  <span className="text-[10px] text-slate-500 block">{chamberRoom}</span>
                </div>
              </div>
            </div>

            {/* Allergies Notice */}
            {patient.allergies.length > 0 ? (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-900">
                <strong>Known Drug Allergies:</strong> {patient.allergies.map((a) => `${a.substance} (${a.severity.toLowerCase()})`).join(", ")}
              </div>
            ) : null}

            {/* FORMAT 1 & 2: Vitals Bar */}
            {format !== "medical_certificate" && patient.observations.length > 0 ? (
              <div className="mb-4 rounded-xl border border-slate-200 p-3">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Vitals & Clinical Measurements
                </h4>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-800">
                  {patient.observations.slice(0, 6).map((obs) => (
                    <div key={obs.id} className="flex items-center gap-1.5">
                      <span className="text-slate-400">{obs.display}:</span>
                      <span className="text-slate-950 font-black">{obs.valueText ?? obs.valueNumber} {obs.unit ?? ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* FORMAT 1 & 2: Diagnoses */}
            {format !== "medical_certificate" && (
              <div className="mb-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 border-b border-slate-200 pb-1 mb-2">
                  Clinical Diagnoses & Impression
                </h4>
                {encounter.diagnoses.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No formal ICD diagnosis recorded.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {encounter.diagnoses.map((d) => (
                      <li key={d.id} className="flex items-center gap-2 font-bold text-slate-900">
                        <span>• {d.display}</span>
                        {d.code ? <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">({d.code})</span> : null}
                        <span className="text-[10px] text-slate-500 font-normal">[{d.certainty.toLowerCase()}]</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* FORMAT: Comprehensive Summary (Clinical Notes & Diagnostic Orders) */}
            {format === "comprehensive_summary" && (
              <>
                {/* Clinical Notes / Findings */}
                <div className="mb-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 border-b border-slate-200 pb-1 mb-2">
                    Clinical Notes & Physical Examination
                  </h4>
                  <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                    {readNoteText(currentNote?.content) || "No examination narrative logged."}
                  </p>
                </div>

                {/* Diagnostic Orders (Labs & Radiology) */}
                {encounter.diagnosticOrders.length > 0 ? (
                  <div className="mb-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 border-b border-slate-200 pb-1 mb-2">
                      Laboratory & Diagnostic Requisitions
                    </h4>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                          <th className="py-1">Type</th>
                          <th className="py-1">Investigation Name</th>
                          <th className="py-1">Code</th>
                          <th className="py-1">Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {encounter.diagnosticOrders.map((ord) => (
                          <tr key={ord.id} className="font-bold">
                            <td className="py-1 text-slate-500">{ord.type}</td>
                            <td className="py-1 text-slate-900">{ord.name}</td>
                            <td className="py-1 font-mono text-[10px] text-slate-500">{ord.code}</td>
                            <td className="py-1 uppercase text-[10px] text-indigo-700">{ord.priority}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </>
            )}

            {/* Unified Clean Prescription Table (Rx) */}
            {format !== "medical_certificate" && (
              <div className="mb-6">
                <div className="flex items-center gap-2 border-b-2 border-indigo-900 pb-1 mb-2">
                  <span className="text-2xl font-serif font-black text-indigo-950">℞</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                    Medical Prescription
                  </h4>
                </div>

                {allPrescriptionItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No medications prescribed for this consultation.</p>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-300 text-[10px] font-black uppercase text-slate-700 bg-slate-50">
                        <th className="py-2 px-2">#</th>
                        <th className="py-2 px-2">Medicine (Generic / Brand)</th>
                        <th className="py-2 px-2">Dose</th>
                        <th className="py-2 px-2">Frequency</th>
                        <th className="py-2 px-2">Duration</th>
                        <th className="py-2 px-2">Quantity</th>
                        <th className="py-2 px-2">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allPrescriptionItems.map((item, idx) => (
                        <tr key={item.id} className="font-semibold hover:bg-slate-50">
                          <td className="py-2 px-2 font-black text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-2 font-black text-slate-900">
                            {item.medication?.name ?? item.medicationId}
                          </td>
                          <td className="py-2 px-2 font-bold text-indigo-950">{item.dose}</td>
                          <td className="py-2 px-2">{item.frequency}</td>
                          <td className="py-2 px-2">{item.duration ?? "—"}</td>
                          <td className="py-2 px-2 font-bold">{item.quantity ? String(item.quantity) : "—"}</td>
                          <td className="py-2 px-2 text-[11px] text-slate-600">{item.instructions || "Take as directed"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* FORMAT: Medical Certificate Body */}
            {format === "medical_certificate" && (
              <div className="my-8 space-y-4 text-sm leading-relaxed text-slate-800">
                <h3 className="text-center text-base font-black uppercase text-indigo-950 underline underline-offset-4">
                  Medical Fitness / Leave Certificate
                </h3>
                <p>
                  This is to certify that <strong>{patientDisplayName(patient)}</strong> (MR#: <strong>{patient.patientNumber}</strong>), aged {patient.dateOfBirth ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} years` : "—"}, {patient.sex ?? ""}, was clinically examined under my care on <strong>{new Date().toLocaleDateString()}</strong> at <strong>{hospitalName} ({branchLocation}, {chamberRoom})</strong>.
                </p>
                <p>
                  <strong>Clinical Diagnosis / Finding:</strong>{" "}
                  {encounter.diagnoses.map((d) => d.display).join(", ") || certificateReason}.
                </p>
                <p>
                  In my professional medical opinion, the patient is advised medical rest and excused from duties/classes for <strong>{restDays} consecutive days</strong> starting from <strong>{new Date().toLocaleDateString()}</strong>.
                </p>
                <p>
                  The patient is advised to return for a follow-up evaluation before resuming strenuous activities.
                </p>
              </div>
            )}

            {/* Document Footer & Doctor Signature Section */}
            <div className="mt-12 pt-6 border-t-2 border-slate-200 flex items-end justify-between">
              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p className="font-bold text-slate-700">{hospitalName} — {branchLocation}</p>
                <p>{department} • {chamberRoom}</p>
                <p>Document Security ID: WF-DOC-{encounter.id.slice(0, 12).toUpperCase()}</p>
                <p>Printed on: {new Date().toLocaleString()}</p>
              </div>

              {/* Signature Block */}
              <div className="text-center min-w-[220px]">
                <div className="h-16 flex items-center justify-center border-b border-slate-400 mb-1.5">
                  {signatureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={signatureUrl} alt="Doctor Signature" className="max-h-14 max-w-full object-contain" />
                  ) : (
                    <span className="text-xs italic text-slate-400 font-serif">Signature of Consulting Doctor</span>
                  )}
                </div>
                <p className="text-xs font-black text-slate-950">{doctorName}</p>
                <p className="text-[11px] font-bold text-slate-700">{qualifications}</p>
                <p className="text-[10px] font-semibold text-slate-600">{specialty}</p>
                <p className="text-[10px] font-mono text-indigo-900 font-bold">PMDC Reg #: {licenseNo}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{hospitalName} • {branchLocation}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
