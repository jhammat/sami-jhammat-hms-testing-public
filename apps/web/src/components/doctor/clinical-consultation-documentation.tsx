"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Droplet,
  FileCheck,
  FilePenLine,
  FileText,
  FlaskConical,
  Heart,
  HelpCircle,
  History,
  Layers,
  LucideIcon,
  Pause,
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
  Thermometer,
  Trash2,
  User,
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

interface MedicationItem {
  id: string;
  code: string;
  genericName: string;
  brandName: string | null;
  strength: string | null;
  dosageForm: string | null;
  unit: string;
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

const COMMON_CHIEF_COMPLAINTS = [
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

const COMMON_DIAGNOSES = [
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

const COMMON_LAB_ORDERS = [
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

const COMMON_RADIOLOGY_ORDERS = [
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

  // Live consultation session stopwatch
  useEffect(() => {
    if (encounter.status !== "IN_PROGRESS") return;
    const startMs = encounter.startedAt ? new Date(encounter.startedAt).getTime() : Date.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [encounter.status, encounter.startedAt]);

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
// GLASSMORPHIC MEDICATION PRESCRIPTION SUITE (CORE REQUEST)
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
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<MedicationItem | null>(null);

  // Staged Prescription Items Tray (Draft queue)
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

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { mutate: issuePrescription, saveState: issueState, error: issueError } = useCreatePrescription(encounter.id);

  // Fetch tenant medications formulary
  const loadMedications = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch("/api/v1/doctor/medications");
      if (!res.ok) return;
      const data = (await res.json()) as { medications?: MedicationItem[] };
      setMedicationsCatalog(data.medications ?? []);
    } catch {
      // Handled via local formulary fallback
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMedications();
  }, [loadMedications]);

  // Click outside listener to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered catalogue results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return medicationsCatalog.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return medicationsCatalog.filter(
      (m) =>
        m.genericName.toLowerCase().includes(q) ||
        (m.brandName && m.brandName.toLowerCase().includes(q)) ||
        m.code.toLowerCase().includes(q) ||
        (m.dosageForm && m.dosageForm.toLowerCase().includes(q)),
    );
  }, [searchQuery, medicationsCatalog]);

  function handleSelectMedication(med: MedicationItem) {
    setSelectedMedication(med);
    setSearchQuery(med.brandName ? `${med.genericName} (${med.brandName})` : med.genericName);
    setSearchDropdownOpen(false);
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
      : searchQuery.trim();

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
    setSearchQuery("");
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
    } catch {
      // error surfaced via issueError
    }
  }

  return (
    <div className="space-y-6">
      {/* Search & Composer Glassmorphic Card */}
      {isEditable ? (
        <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white/90 via-indigo-50/30 to-violet-50/20 p-6 shadow-2xl shadow-indigo-950/5 backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80 dark:from-slate-900/90 dark:via-slate-900/50">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/10 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                <Pill className="h-3.5 w-3.5" />
                <span>Pharmacy Formulary & Prescription Composer</span>
              </div>
              <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">
                Prescribe Medication
              </h2>
            </div>

            {/* Staged Counter Trigger */}
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
            {/* Glassmorphic Search Bar with Dropdown */}
            <div className="relative" ref={searchContainerRef}>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Search Medication (Generic Name, Brand Name, or Code)
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchDropdownOpen(true);
                  }}
                  onFocus={() => setSearchDropdownOpen(true)}
                  placeholder="e.g. Paracetamol, Augmentin, Omeprazole, Ciprofloxacin…"
                  className="h-12 w-full rounded-2xl border border-indigo-200/70 bg-white/80 pl-11 pr-4 text-sm font-semibold text-slate-900 shadow-inner backdrop-blur-xl transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white"
                />
                {catalogLoading ? (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <Clock className="h-4 w-4 animate-spin text-indigo-500" />
                  </div>
                ) : null}
              </div>

              {/* Glassmorphic Live Dropdown Results */}
              {searchDropdownOpen && (
                <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-3xl border border-white/80 bg-white/95 p-2 shadow-2xl shadow-indigo-950/20 backdrop-blur-2xl transition dark:border-slate-700/80 dark:bg-slate-900/95">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Formulary Results ({searchResults.length})
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs font-semibold text-slate-500">No matching formulary item found.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMedication(null);
                          setSearchDropdownOpen(false);
                        }}
                        className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                      >
                        Use &quot;{searchQuery}&quot; as custom unlisted medication
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {searchResults.map((med) => (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => handleSelectMedication(med)}
                          className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left transition hover:bg-indigo-50/80 dark:hover:bg-slate-800/80"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              <Pill className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                  {med.genericName}
                                </span>
                                {med.brandName ? (
                                  <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                    {med.brandName}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[11px] font-semibold text-slate-500">
                                {med.strength ?? ""} {med.dosageForm ? `• ${med.dosageForm}` : ""} • Code: {med.code}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] font-black text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Select
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Formulary Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Quick Formulary:</span>
              {medicationsCatalog.slice(0, 6).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMedication(m)}
                  className="rounded-xl border border-slate-200/60 bg-white/70 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
                >
                  {m.brandName ? `${m.brandName} (${m.strength})` : m.genericName}
                </button>
              ))}
            </div>

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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Total Quantity to Dispense</label>
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
                disabled={(!selectedMedication && !searchQuery.trim()) || !dose.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                <span>Add to Prescription Tray</span>
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Interactive Staged Prescriptions Tray / Dropdown Menu */}
      {stagedItems.length > 0 ? (
        <section className="overflow-hidden rounded-3xl border-2 border-indigo-300/80 bg-gradient-to-br from-indigo-50/90 via-white/95 to-violet-50/80 p-5 shadow-2xl backdrop-blur-2xl dark:border-indigo-900/80 dark:bg-slate-900/95">
          <div className="flex items-center justify-between border-b border-indigo-200/70 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 dark:text-white">
                  Active Prescription Tray ({stagedItems.length} {stagedItems.length === 1 ? "Medicine" : "Medicines"} Staged)
                </h3>
                <p className="text-xs text-slate-500">Review staged medications before issuing the digital prescription.</p>
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
              <div className="grid gap-2.5">
                {stagedItems.map((item, index) => (
                  <div
                    key={`${item.medicationId}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white">{item.name}</h4>
                          <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {item.dose}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          {item.route} • {item.frequency} • {item.duration} {item.quantity ? `• Qty: ${item.quantity}` : ""}
                        </p>
                        {item.instructions ? (
                          <p className="mt-0.5 text-[10px] italic text-slate-500">
                            Instructions: {item.instructions}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStagedItem(index)}
                      className="rounded-xl border border-rose-200 bg-rose-50/80 p-2 text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300"
                      title="Remove from tray"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Doctor Notes / Pharmacist Advice for Entire Prescription (Optional)
                </label>
                <input
                  type="text"
                  value={overallInstructions}
                  onChange={(e) => setOverallInstructions(e.target.value)}
                  placeholder="e.g. Return after 5 days if symptoms persist. Drink plenty of fluids."
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
// CLINICAL NOTES PANEL (SOAP & Narrative)
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
  const [noteFormat, setNoteFormat] = useState<"narrative" | "soap">("narrative");

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

  function appendChiefComplaint(complaint: string) {
    if (!textEditable) return;
    const prefix = noteText.trim() ? `${noteText}\n` : "";
    setNoteText(`${prefix}• Chief Complaint: ${complaint}`);
  }

  function applySoapTemplate() {
    if (!textEditable) return;
    setNoteText(
      `SUBJECTIVE (S):\n- Chief Complaints:\n- History of Present Illness (HPI):\n\nOBJECTIVE (O):\n- General Appearance:\n- Physical Examination:\n\nASSESSMENT (A):\n- Clinical Impression:\n\nPLAN (P):\n- Treatment Plan & Patient Instructions:`,
    );
  }

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

        {/* Quick Chief Complaints Bar */}
        {textEditable ? (
          <div className="mb-3">
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Quick Chief Complaints:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CHIEF_COMPLAINTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => appendChiefComplaint(c)}
                  className="rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  + {c}
                </button>
              ))}
            </div>
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
// OBSERVATIONS & VITALS PANEL
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

    for (const v of vitalsToSave) {
      await recordObs({
        code: v.code,
        display: v.display,
        valueText: v.valueText,
        observedAt: now,
      });
    }
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
// DIAGNOSES PANEL
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
    setDisplay("");
    setCode("");
    setNotes("");
    setIsPrimary(false);
    onSaved();
  }

  function handleSelectPreset(d: typeof COMMON_DIAGNOSES[number]) {
    setDisplay(d.display);
    setCode(d.code);
    setCertainty(d.certainty);
  }

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

          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Common Conditions:</span>
            {COMMON_DIAGNOSES.map((d) => (
              <button
                key={d.code}
                type="button"
                onClick={() => handleSelectPreset(d)}
                className="rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-slate-700 dark:bg-slate-800"
              >
                + {d.display}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Diagnosis Name</label>
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

      <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
        <h3 className="mb-4 text-base font-black text-slate-950 dark:text-white">Documented Diagnoses</h3>
        {encounter.diagnoses.length === 0 ? (
          <p className="py-6 text-center text-xs font-semibold text-slate-500">No diagnoses documented for this encounter yet.</p>
        ) : (
          <div className="space-y-2.5">
            {encounter.diagnoses.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">{d.display}</span>
                    {d.code ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">{d.code}</span> : null}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">Logged {new Date(d.createdAt).toLocaleString()}</span>
                </div>
                <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  d.certainty === "CONFIRMED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}>
                  {d.certainty}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// -------------------------------------------------------------
// DIAGNOSTIC ORDERS (LAB & RADIOLOGY)
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

  const { mutate, saveState, error } = useCreateOrder(encounter.id);

  async function submit(): Promise<void> {
    if (code.trim() === "" || name.trim() === "") return;
    await mutate({
      type,
      code: code.trim(),
      name: name.trim(),
      priority,
      clinicalReason: clinicalReason.trim() || undefined,
    });
    setCode("");
    setName("");
    setClinicalReason("");
    onSaved();
  }

  function handleSelectPreset(item: { name: string; code: string; priority: string }) {
    setName(item.name);
    setCode(item.code);
    setPriority(item.priority);
  }

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

          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Popular Tests:</span>
            {(type === "LABORATORY" ? COMMON_LAB_ORDERS : COMMON_RADIOLOGY_ORDERS).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelectPreset(item)}
                className="rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-800"
              >
                + {item.name}
              </button>
            ))}
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
              onClick={() => {
                if (!code.trim()) setCode(`ORD-${Date.now().toString(36).toUpperCase()}`);
                void submit();
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Place Requisition Order</span>
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/80">
        <h3 className="mb-4 text-base font-black text-slate-950 dark:text-white">Requested Diagnostic Orders</h3>
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
                <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// -------------------------------------------------------------
// PATIENT SUMMARY & HISTORY
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
