"use client";

import {
  cloneElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
  ReactNode,
} from "react";

import QRCode from "qrcode";
import {
  printTicketSlip,
  type TicketPrintFormat,
  type TicketSlipData,
} from "@/lib/printing/token-ticket-slip";
import { useWonFlowSession } from "@/app/_providers";

import {
  bookReceptionAppointment,
  checkInReceptionAppointment,
  createReceptionDiagnosticOrders,
  getReceptionAppointmentSlots,
  getReceptionOverview,
  registerReceptionPatient,
  searchReceptionPatients,
  updateReceptionPatient,
} from "@/lib/api/reception-api";
import type {
  ReceptionPatient,
  ReceptionSlot,
  ReceptionSlotsResult,
} from "@/lib/api/reception-api";
import { phaseOneApi } from "@/lib/api/phase-one-api";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  useLiveDoctorSittings,
} from "@/lib/doctor-sittings";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  FlaskConical,
  Globe,
  KeyRound,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Send,
  Stethoscope,
  UserPlus,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { localDateOffsetByDays, todayLocalDate } from "@/lib/time/local-date";

type Gender =
  | "Male"
  | "Female"
  | "Other";

type PatientMode =
  | "search"
  | "existing"
  | "new";

type IdentityType =
  | "CNIC"
  | "Passport";

type VisitPurpose =
  | "OPD Walk-in"
  | "Scheduled Appointment"
  | "Follow-up"
  | "Emergency";

export interface VisitPurposeItem {
  readonly id: VisitPurpose;
  readonly label: string;
  readonly shortDescription: string;
  readonly badge?: string;
}

export const VISIT_PURPOSE_LIST: readonly VisitPurposeItem[] = [
  {
    id: "OPD Walk-in",
    label: "OPD Walk-in",
    shortDescription: "General OPD walk-in & doctor consultation queue",
    badge: "Most Common",
  },
  {
    id: "Scheduled Appointment",
    label: "Scheduled Appointment",
    shortDescription: "Check in a pre-booked appointment",
  },
  {
    id: "Follow-up",
    label: "Follow-up",
    shortDescription: "Post-consultation follow-up review",
  },
  {
    id: "Emergency",
    label: "Emergency",
    shortDescription: "Immediate triage & urgent ER queue",
    badge: "Urgent",
  },
];

type AppointmentStatus =
  | "Booked"
  | "Confirmed"
  | "Arrived"
  | "Cancelled";

type AdmissionType =
  | "Planned"
  | "Urgent";

type TriageLevel =
  | "Red"
  | "Orange"
  | "Yellow"
  | "Green";

type DiagnosticDestination =
  | "Laboratory"
  | "Radiology"
  | "Procedure";

type DiscountMode =
  | "percent"
  | "fixed";

interface Patient {
  id: string;
  mrNumber: string;
  fullName: string;
  fatherName: string;
  identityType: IdentityType;
  identityNumber: string;
  mobile: string;
  email?: string;
  gender: Gender;
  age: number;
  dateOfBirth: string;
  bloodGroup: string;
  address: string;
  emergencyContact: string;
  allergies: string;
  medicalAlert: string;
}

interface PatientDraft {
  fullName: string;
  fatherName: string;
  identityType: IdentityType | "";
  identityNumber: string;
  mobile: string;
  email?: string;
  gender: Gender | "";
  age: string;
  dateOfBirth: string;
  bloodGroup: string;
  address: string;
  emergencyContact: string;
  allergies: string;
  medicalAlert: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  consultationFee: number;
  urgentConsultationFee: number;
  primaryBranchId: string;
}

interface ReceptionDoctorDirectory {
  branches: Array<{
    id: string;
    name: string;
  }>;
  practitioners: Array<{
    id: string;
    displayName: string;
    specialtyName: string;
    primaryBranchId: string;
    consultationFee: number;
    urgentConsultationFee: number;
  }>;
  services: AdditionalService[];
}

interface AdditionalService {
  id: string;
  name: string;
  price: number;
  category: string;
  custom?: boolean;
  doctorId?: string | null;
  branchId?: string | null;
  consultationModes?: ("IN_PERSON" | "ONLINE")[];
  requiresPrepayment?: boolean;
  durationMinutes?: number;
}

interface RecentAppointment {
  token: string;
  patient: string;
  doctor: string;
  time: string;

  status:
    | "In Progress"
    | "Arrived"
    | "Completed";
}

const CONTROL_CLASS_NAME = [
  "wf-control",
  "h-9 w-full",
  "rounded-xl border",
  "border-slate-200",
  "bg-white px-3",
  "text-[11px] font-semibold",
  "text-slate-900",
  "outline-none transition",
  "placeholder:font-medium",
  "placeholder:text-slate-400",
  "focus:border-indigo-400",
  "focus:ring-2",
  "focus:ring-indigo-100",
  "disabled:cursor-not-allowed",
  "disabled:bg-slate-50",
  "disabled:text-slate-400",
].join(" ");

const TEXTAREA_CLASS_NAME = [
  "wf-textarea",
  "min-h-[50px] w-full",
  "resize-none rounded-xl",
  "border border-slate-200",
  "bg-white px-3 py-2.5",
  "text-[11px] font-semibold",
  "text-slate-900",
  "outline-none transition",
  "placeholder:font-medium",
  "placeholder:text-slate-400",
  "focus:border-indigo-400",
  "focus:ring-2",
  "focus:ring-indigo-100",
].join(" ");

const EMPTY_PATIENT_DRAFT:
  PatientDraft = {
    fullName: "",
    fatherName: "",
    identityType: "",
    identityNumber: "",
    mobile: "",
    email: "",
    gender: "",
    age: "",
    dateOfBirth: "",
    bloodGroup: "",
    address: "",
    emergencyContact: "",
    allergies: "",
    medicalAlert: "",
  };

export const LEGACY_RECEPTION_SERVICES:
  readonly AdditionalService[] = [
    {
      id: "cbc",
      name: "CBC (Complete Blood Count)",
      price: 600,
      category: "Laboratory",
    },
    {
      id: "urine-re",
      name: "Urine Routine Examination",
      price: 200,
      category: "Laboratory",
    },
    {
      id: "blood-sugar-fasting",
      name: "Blood Sugar (Fasting)",
      price: 300,
      category: "Laboratory",
    },
    {
      id: "blood-sugar-random",
      name: "Blood Sugar (Random)",
      price: 300,
      category: "Laboratory",
    },
    {
      id: "hba1c",
      name: "HbA1c",
      price: 800,
      category: "Laboratory",
    },
    {
      id: "liver-function",
      name: "Liver Function Test",
      price: 1500,
      category: "Laboratory",
    },
    {
      id: "renal-function",
      name: "Renal Function Test",
      price: 1400,
      category: "Laboratory",
    },
    {
      id: "lipid-profile",
      name: "Lipid Profile",
      price: 1200,
      category: "Laboratory",
    },
    {
      id: "thyroid-profile",
      name: "Thyroid Profile",
      price: 1800,
      category: "Laboratory",
    },
    {
      id: "crp",
      name: "CRP (C-Reactive Protein)",
      price: 700,
      category: "Laboratory",
    },
    {
      id: "esr",
      name: "ESR",
      price: 400,
      category: "Laboratory",
    },
    {
      id: "vitamin-d",
      name: "Vitamin D",
      price: 1200,
      category: "Laboratory",
    },
    {
      id: "hbsag",
      name: "HBsAg",
      price: 1100,
      category: "Laboratory",
    },
    {
      id: "anti-hcv",
      name: "Anti-HCV",
      price: 1200,
      category: "Laboratory",
    },
    {
      id: "ultrasound-abdomen",
      name: "Ultrasound Abdomen",
      price: 3500,
      category: "Radiology",
    },
    {
      id: "chest-xray",
      name: "Chest X-Ray",
      price: 1800,
      category: "Radiology",
    },
    {
      id: "ecg",
      name: "ECG",
      price: 1000,
      category: "Cardiology",
    },
    {
      id: "follow-up-service",
      name: "Follow-up Consultation",
      price: 500,
      category: "Consultation",
    },
  ];

function getToday(): string {
  return todayLocalDate();
}

function formatMoney(
  value: number,
): string {
  return `Rs. ${value.toLocaleString(
    "en-PK",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function calculateAge(
  dateOfBirth: string,
): number | null {
  if (
    dateOfBirth === ""
  ) {
    return null;
  }

  const birthDate =
    new Date(
      `${dateOfBirth}T00:00:00`,
    );

  if (
    Number.isNaN(
      birthDate.getTime(),
    )
  ) {
    return null;
  }

  const today =
    new Date();

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() <
        birthDate.getDate()
    )
  ) {
    age -= 1;
  }

  return Math.max(
    0,
    age,
  );
}

function readJsonText(source: unknown, key: string): string {
  if (!source) return "";
  let obj: Record<string, unknown> | null = null;
  if (typeof source === "string") {
    try {
      obj = JSON.parse(source) as Record<string, unknown>;
    } catch {
      return source.trim();
    }
  } else if (typeof source === "object") {
    obj = source as Record<string, unknown>;
  }
  if (!obj || typeof obj !== "object") return "";
  const value = obj[key];
  return typeof value === "string" ? value : "";
}

/**
 * Converts a search result into the reception form's patient shape.
 *
 * The API already returns every stored field (sex, guardian data, the primary
 * identifier); this used to discard nearly all of it and hardcode blanks
 * instead, so an existing patient's father's name, CNIC, gender and address
 * silently vanished the moment they were found by search.
 */
function receptionPatientToLocal(patient: ReceptionPatient): Patient {
  const dateOfBirth = patient.dateOfBirth?.slice(0, 10) ?? "";
  const primaryIdentifier = patient.identifiers?.find((identifier) => identifier.isPrimary) ?? patient.identifiers?.[0];
  const identityType: IdentityType = primaryIdentifier?.type === "Passport" ? "Passport" : "CNIC";
  const gender: Gender = patient.sex === "Male" || patient.sex === "Female" || patient.sex === "Other" ? patient.sex : "Other";

  const guardianObj = (typeof patient.guardianData === "object" && patient.guardianData !== null ? patient.guardianData : (typeof patient.guardianData === "string" ? (() => { try { return JSON.parse(patient.guardianData) as Record<string, unknown>; } catch { return {}; } })() : {})) as Record<string, unknown>;
  const consentObj = (typeof patient.consentData === "object" && patient.consentData !== null ? patient.consentData : (typeof patient.consentData === "string" ? (() => { try { return JSON.parse(patient.consentData) as Record<string, unknown>; } catch { return {}; } })() : {})) as Record<string, unknown>;

  const fatherName = readJsonText(guardianObj, "fatherName") ||
    readJsonText(guardianObj, "name") ||
    readJsonText(guardianObj, "guardianName") ||
    readJsonText(guardianObj, "guardian") ||
    (typeof (patient as unknown as { fatherName?: string }).fatherName === "string" ? (patient as unknown as { fatherName?: string }).fatherName! : "");

  const bloodGroup = readJsonText(consentObj, "bloodGroup") ||
    readJsonText(guardianObj, "bloodGroup") ||
    (typeof (patient as unknown as { bloodGroup?: string }).bloodGroup === "string" ? (patient as unknown as { bloodGroup?: string }).bloodGroup! : "");

  const address = readJsonText(patient.address, "text") ||
    readJsonText(patient.address, "addressLine") ||
    readJsonText(patient.address, "line") ||
    readJsonText(patient.address, "street") ||
    (typeof patient.address === "string" ? patient.address : "");

  const emergencyContact = readJsonText(guardianObj, "emergencyContactPhone") ||
    readJsonText(guardianObj, "emergencyContact") ||
    readJsonText(guardianObj, "emergencyPhone") ||
    readJsonText(guardianObj, "phone") ||
    readJsonText(consentObj, "alternateMobileNumber") ||
    (typeof (patient as unknown as { emergencyContact?: string }).emergencyContact === "string" ? (patient as unknown as { emergencyContact?: string }).emergencyContact! : "");

  const allergies = readJsonText(consentObj, "allergies") ||
    readJsonText(consentObj, "knownAllergies") ||
    (typeof (patient as unknown as { allergies?: string }).allergies === "string" ? (patient as unknown as { allergies?: string }).allergies! : "");

  const medicalAlert = readJsonText(consentObj, "medicalAlert") ||
    readJsonText(consentObj, "notes") ||
    (typeof (patient as unknown as { medicalAlert?: string }).medicalAlert === "string" ? (patient as unknown as { medicalAlert?: string }).medicalAlert! : "");

  return {
    id: patient.id,
    mrNumber: patient.patientNumber,
    fullName: [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" "),
    fatherName,
    identityType,
    identityNumber: primaryIdentifier?.value ?? "",
    mobile: patient.phone ?? "",
    email: patient.email ?? "",
    gender,
    age: calculateAge(dateOfBirth) ?? 0,
    dateOfBirth,
    bloodGroup,
    address,
    emergencyContact,
    allergies,
    medicalAlert,
  };
}

function formatDateOfBirth(
  value: string,
): string {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (match === null) {
    return "";
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function maskDateOfBirth(
  value: string,
): string {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDateOfBirth(
  value: string,
): {
  age: number;
  isoDate: string;
} | null {
  const match =
    /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(
      value,
    );

  if (match === null) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(
    year,
    month - 1,
    day,
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const isoDate = [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
  const age = calculateAge(isoDate);

  if (
    isoDate > getToday() ||
    age === null ||
    age < 0 ||
    age > 130
  ) {
    return null;
  }

  return {
    age,
    isoDate,
  };
}

function patientToDraft(
  patient: Patient,
): PatientDraft {
  return {
    fullName:
      patient.fullName,
    fatherName:
      patient.fatherName,
    identityType:
      patient.identityType,
    identityNumber:
      patient.identityNumber,
    mobile:
      patient.mobile,
    email:
      patient.email ?? "",
    gender:
      patient.gender,
    age:
      String(patient.age),
    dateOfBirth:
      patient.dateOfBirth,
    bloodGroup:
      patient.bloodGroup,
    address:
      patient.address,
    emergencyContact:
      patient.emergencyContact,
    allergies:
      patient.allergies,
    medicalAlert:
      patient.medicalAlert,
  };
}

interface FieldControlProps {
  required?: boolean;
  className?: string;
  "aria-required"?: boolean;
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children:
    ReactElement<FieldControlProps>;
}) {
  const control =
    required
      ? cloneElement(
          children,
          {
            required: true,
            "aria-required": true,
            className: [
              children.props
                .className ?? "",
              "wf-required-control",
            ]
              .filter(Boolean)
              .join(" "),
          },
        )
      : children;

  return (
    <label
      className="wf-form-field block min-w-0"
      data-required={
        required
          ? "true"
          : "false"
      }
    >
      <span className="wf-field-label mb-1.5 flex items-center gap-1 text-[10px] font-extrabold text-slate-700">
        {label}
        {required ? (
          <span className="text-rose-500">
            {" "}
            *
          </span>
        ) : null}
      </span>

      {control}
    </label>
  );
}

function SectionHeader({
  icon,
  title,
  suffix,
}: {
  icon: ReactNode;
  title: string;
  suffix?: ReactNode;
}) {
  return (
    <div className="wf-section-header flex min-h-10 items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
          {icon}
        </div>

        <h2 className="text-[12px] font-black tracking-[-0.015em] text-slate-950">
          {title}
        </h2>
      </div>

      {suffix}
    </div>
  );
}

function BillingRow({
  label,
  value,
  strong = false,
  success = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  success?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center",
        "justify-between gap-3",
        strong
          ? "text-[12px] font-black"
          : "text-[10px] font-semibold",
        success
          ? "text-emerald-600"
          : strong
            ? "text-slate-950"
            : "text-slate-600",
      ].join(" ")}
    >
      <span>{label}</span>

      <span className="text-right">
        {value}
      </span>
    </div>
  );
}

function createAppointmentToken(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    now.getDate(),
  ).padStart(2, "0");
  const sequence = String(
    now.getTime(),
  ).slice(-6);

  return [
    "WF",
    `${year}${month}${day}`,
    sequence,
  ].join("-");
}

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function looksLikeCnic(
  value: string,
): boolean {
  const normalized = value
    .trim()
    .replaceAll(" ", "");

  return /^\d{5}-?\d{7}-?\d$/.test(
    normalized,
  );
}

function looksLikePassport(
  value: string,
): boolean {
  const normalized = value
    .trim()
    .replaceAll(" ", "");

  return /^[A-Za-z]{1,3}[0-9]{5,9}$/.test(
    normalized,
  );
}

function createPatientDraftFromSearch(
  query: string,
): PatientDraft {
  const value = query.trim();

  if (value === "") {
    return {
      ...EMPTY_PATIENT_DRAFT,
    };
  }

  if (looksLikeCnic(value)) {
    return {
      ...EMPTY_PATIENT_DRAFT,
      identityType: "CNIC",
      identityNumber: value,
    };
  }

  if (looksLikePassport(value)) {
    return {
      ...EMPTY_PATIENT_DRAFT,
      identityType: "Passport",
      identityNumber: value.toUpperCase(),
    };
  }

  return {
    ...EMPTY_PATIENT_DRAFT,
    fullName: value,
  };
}

function focusNextReceptionControl(
  currentControl: HTMLElement,
): void {
  const workspace = currentControl.closest(
    ".wf-reception-page",
  );

  if (workspace === null) {
    return;
  }

  const controls = Array.from(
    workspace.querySelectorAll<HTMLElement>(
      "input:not([type='hidden']), select, textarea, button",
    ),
  ).filter(
    (control) =>
      !control.hasAttribute("disabled") &&
      control.getAttribute("aria-hidden") !== "true" &&
      control.tabIndex !== -1 &&
      control.offsetParent !== null,
  );

  const currentIndex =
    controls.indexOf(currentControl);
  const nextControl =
    controls[currentIndex + 1];

  if (nextControl === undefined) {
    return;
  }

  nextControl.focus({
    preventScroll: true,
  });
  nextControl.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "nearest",
  });
}

function handleReceptionEnter(
  event: ReactKeyboardEvent<HTMLElement>,
): void {
  if (
    event.key !== "Enter" ||
    event.defaultPrevented
  ) {
    return;
  }

  const control = event.target;

  if (!(control instanceof HTMLElement)) {
    return;
  }

  if (
    control instanceof HTMLTextAreaElement &&
    event.shiftKey
  ) {
    return;
  }

  if (
    control instanceof HTMLSelectElement ||
    (
      control instanceof HTMLInputElement &&
      control.type === "date"
    )
  ) {
    const pickerControl = control as
      | HTMLInputElement
      | HTMLSelectElement;

    if ("showPicker" in pickerControl) {
      event.preventDefault();

      try {
        pickerControl.showPicker();
      } catch {
        // The native Enter behavior remains available when a picker cannot open.
      }
    }

    return;
  }

  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLTextAreaElement
  ) {
    event.preventDefault();
    focusNextReceptionControl(control);
  }
}

export function ReceptionDeskWorkspace() {
  const session = useWonFlowSession();
  const [hospitalBranding, setHospitalBranding] = useState<{
    displayName: string | null;
    logoDataUrl: string | null;
  }>({
    displayName: null,
    logoDataUrl: null,
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/v1/organization/branding", { cache: "no-store" });
        if (res.ok) {
          const body = (await res.json()) as { displayName?: string | null; logoDataUrl?: string | null };
          if (active) {
            setHospitalBranding({
              displayName: body.displayName || null,
              logoDataUrl: body.logoDataUrl || null,
            });
          }
        }
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, []);

  const directories = useWonFlowAsyncData<ReceptionDoctorDirectory>({
    key: "reception:directories",
    loader: (signal) => phaseOneApi<ReceptionDoctorDirectory>("/api/v1/reception/catalog", { signal }),
    isEmpty: (value) => value.practitioners.length === 0 && value.services.length === 0,
  });

  const receptionDoctors = useMemo<Doctor[]>(() => {
    const practitioners = directories.data?.practitioners ?? [];

    return practitioners.map((practitioner) => ({
      id: practitioner.id,
      name: practitioner.displayName,
      specialty: practitioner.specialtyName,
      primaryBranchId: practitioner.primaryBranchId,
      consultationFee: practitioner.consultationFee,
      urgentConsultationFee: practitioner.urgentConsultationFee,
    }));
  }, [directories.data?.practitioners]);
  const availableSpecialties = useMemo(
    () => [...new Set(receptionDoctors.map((doctor) => doctor.specialty))].sort(),
    [receptionDoctors],
  );

  const [
    patients,
    setPatients,
  ] = useState<Patient[]>([]);

  const [
    patientMode,
    setPatientMode,
  ] = useState<PatientMode>(
    "search",
  );

  const [
    selectedPatientId,
    setSelectedPatientId,
  ] = useState<string | null>(
    null,
  );

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    patientDraft,
    setPatientDraft,
  ] = useState<PatientDraft>(
    EMPTY_PATIENT_DRAFT,
  );

  const [
    patientSaved,
    setPatientSaved,
  ] = useState(false);

  /** Existing records that look like the patient just registered — see savePatient. */
  const [
    duplicateWarning,
    setDuplicateWarning,
  ] = useState<string[]>([]);

  const [
    patientError,
    setPatientError,
  ] = useState("");

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) return;
    const timeout = window.setTimeout(() => {
      void searchReceptionPatients(query).then(({ patients: results }) => {
        setPatients(results.map(receptionPatientToLocal));
      }).catch(() => setPatientError("Patient search could not be loaded. Try again."));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const [
    useEstimatedAge,
    setUseEstimatedAge,
  ] = useState(false);

  const [
    dateOfBirthDisplay,
    setDateOfBirthDisplay,
  ] = useState("");

  const [
    consultationReason,
    setConsultationReason,
  ] = useState("");

  const [
    selectedSpecialty,
    setSelectedSpecialty,
  ] = useState("");

  const [
    selectedDoctorId,
    setSelectedDoctorId,
  ] = useState("");

  /** "Do you want an online consultation or in person?" — asked before the service list, since it decides which services are even eligible. */
  const [
    consultationMode,
    setConsultationMode,
  ] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");

  const [
    visitPurpose,
    setVisitPurpose,
  ] = useState<VisitPurpose>(
    "OPD Walk-in",
  );

  const [bookedPortalAccess, setBookedPortalAccess] = useState<{
    hasPortalAccess: boolean;
    isNewlyCreated: boolean;
    email: string;
    temporaryPassword?: string;
    portalUrl: string;
    videoCallUrl?: string;
  } | null>(null);

  const [copiedPortalField, setCopiedPortalField] = useState<string | null>(null);

  const searchParams = useSearchParams();

  // Applying the deep-link query string is a one-way sync from the URL into
  // form state, deferred a tick so it does not cascade inside the effect body.
  useEffect(() => {
    const patientIdParam = searchParams?.get("patientId");
    const doctorIdParam = searchParams?.get("doctorId");
    const searchParam = searchParams?.get("search") || searchParams?.get("query");
    const modeParam = searchParams?.get("mode");

    queueMicrotask(() => {
    if (modeParam === "new") {
      setPatientMode("new");
      setPatientDraft(EMPTY_PATIENT_DRAFT);
      setSelectedPatientId(null);
      setPatientSaved(false);
    } else if (searchParam) {
      setSearchQuery(searchParam);
    }

    if (doctorIdParam) {
      setSelectedDoctorId(doctorIdParam);
    }

    if (patientIdParam) {
      void phaseOneApi<{ patient: ReceptionPatient }>(`/api/v1/patients/${encodeURIComponent(patientIdParam)}`)
        .then(({ patient }) => {
          if (patient) {
            const local = receptionPatientToLocal(patient);
            selectPatient(local);
          }
        })
        .catch(() => {});
    }
    });
  }, [searchParams]);

  const [
    appointmentReference,
    setAppointmentReference,
  ] = useState("");

  const [
    appointmentStatus,
    setAppointmentStatus,
  ] = useState<AppointmentStatus>(
    "Booked",
  );

  const [
    followUpReference,
    setFollowUpReference,
  ] = useState("");

  const [
    admissionType,
    setAdmissionType,
  ] = useState<AdmissionType>(
    "Planned",
  );

  const [
    admissionReason,
    setAdmissionReason,
  ] = useState("");

  const [
    admissionWard,
    setAdmissionWard,
  ] = useState("");

  const [
    admissionBed,
    setAdmissionBed,
  ] = useState("");

  const [
    admissionDeposit,
    setAdmissionDeposit,
  ] = useState("0");

  const [
    emergencyArrivalMode,
    setEmergencyArrivalMode,
  ] = useState("Walk-in");

  const [
    emergencyComplaint,
    setEmergencyComplaint,
  ] = useState("");

  const [
    triageLevel,
    setTriageLevel,
  ] = useState<TriageLevel>(
    "Yellow",
  );

  const [
    diagnosticDestination,
    setDiagnosticDestination,
  ] = useState<DiagnosticDestination>(
    "Laboratory",
  );

  const [
    diagnosticService,
    setDiagnosticService,
  ] = useState("");

  const [
    referringDoctor,
    setReferringDoctor,
  ] = useState("");

  const [
    appointmentDate,
    setAppointmentDate,
  ] = useState(getToday);

  const [
    appointmentTime,
    setAppointmentTime,
  ] = useState("");

  const [
    selectedSlot,
    setSelectedSlot,
  ] = useState<ReceptionSlot | null>(null);

  useEffect(() => {
    setSelectedSlot(null);
    setAppointmentTime("");
  }, [selectedDoctorId, appointmentDate]);

  const [
    selectedServiceIds,
    setSelectedServiceIds,
  ] = useState<string[]>([]);

  const [
    serviceSearch,
    setServiceSearch,
  ] = useState("");

  const [
    servicesPickerOpen,
    setServicesPickerOpen,
  ] = useState(false);

  const [
    customBillingItems,
    setCustomBillingItems,
  ] = useState<
    AdditionalService[]
  >([]);

  const [
    addItemOpen,
    setAddItemOpen,
  ] = useState(false);

  const [
    customItemName,
    setCustomItemName,
  ] = useState("");

  const [
    customItemPrice,
    setCustomItemPrice,
  ] = useState("");

  const [
    discountMode,
    setDiscountMode,
  ] = useState<DiscountMode>(
    "percent",
  );

  const [
    discountInput,
    setDiscountInput,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("");

  const [
    amountReceived,
    setAmountReceived,
  ] = useState("");

  const [
    paymentConfirmed,
    setPaymentConfirmed,
  ] = useState(false);

  const [
    issuedToken,
    setIssuedToken,
  ] = useState("");

  const [
    queueSourceReference,
    setQueueSourceReference,
  ] = useState("");

  const [
    createdQueueEntryId,
    setCreatedQueueEntryId,
  ] = useState("");

  const [queuePosition, setQueuePosition] = useState(0);
  const [estimatedWaitMinutes, setEstimatedWaitMinutes] = useState(0);
  const [issuedRoomLabel, setIssuedRoomLabel] = useState("");
  // True while the real appointment is being booked against the database, so
  // the send button can show it is doing real network work rather than the
  // instant local write, and so it cannot be double-clicked mid-request.
  const [isBookingLive, setIsBookingLive] = useState(false);

  const [
    billingNotes,
    setBillingNotes,
  ] = useState("");

  const [
    appointmentPrepared,
    setAppointmentPrepared,
  ] = useState(false);

  const [
    confirmationOpen,
    setConfirmationOpen,
  ] = useState(false);

  const [
    actionError,
    setActionError,
  ] = useState("");

  const normalizedQuery =
    searchQuery
      .trim()
      .toLocaleLowerCase();

  const searchResults =
    useMemo(() => {
      if (
        normalizedQuery === ""
      ) {
        return [];
      }

      return patients
        .filter(
          (patient) =>
            [
              patient.fullName,
              patient.mrNumber,
              patient.identityType,
              patient.identityNumber,
              patient.mobile,
            ]
              .join(" ")
              .toLocaleLowerCase()
              .includes(
                normalizedQuery,
              ),
        )
        .slice(0, 5);
    }, [
      normalizedQuery,
      patients,
    ]);

  const selectedPatient =
    patients.find(
      (patient) =>
        patient.id ===
        selectedPatientId,
    ) ?? null;

  const filteredDoctors =
    useMemo(() => {
      const specialtyFilter =
        selectedSpecialty === ""
          ? undefined
          : selectedSpecialty;

      return receptionDoctors.filter((doctor) => {
        if (specialtyFilter === undefined) {
          return true;
        }

        return doctor.specialty === specialtyFilter;
      });
    }, [receptionDoctors, selectedSpecialty]);

  const selectedDoctor =
    useMemo(
      () =>
        receptionDoctors.find(
          (doctor) =>
            doctor.id ===
            selectedDoctorId,
        ) ?? null,
      [receptionDoctors, selectedDoctorId],
    );

  const sittingBusinessDate =
    visitPurpose === "OPD Walk-in" ? getToday() : appointmentDate || getToday();

  // Sittings the doctors published to the tenant database.
  const liveSittings = useLiveDoctorSittings(sittingBusinessDate);

  const selectedDoctorSitting = useMemo(() => {
    if (selectedDoctor === null) return undefined;
    return liveSittings.findForDoctor(selectedDoctor.id);
  }, [liveSittings, selectedDoctor]);

  const normalizedServiceSearch =
    serviceSearch
      .trim()
      .toLocaleLowerCase();

  const availableServices = useMemo(() => {
    const services = directories.data?.services ?? [];
    if (selectedDoctor === null) return services.filter((service) => service.doctorId == null);
    return services.filter(
      (service) =>
        (service.doctorId == null || service.doctorId === selectedDoctor.id) &&
        (service.branchId == null || service.branchId === selectedDoctor.primaryBranchId),
    );
  }, [directories.data?.services, selectedDoctor]);
  const doctorServices = availableServices.filter(
    (service) =>
      selectedDoctor !== null &&
      service.doctorId === selectedDoctor.id &&
      // Services without recorded modes predate this field and are treated
      // as in-person-only rather than silently matching either choice.
      (service.consultationModes ?? ["IN_PERSON"]).includes(consultationMode),
  );

  const isDiagnosticCategory = (category: string) => {
    const value = category.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    return value === "LABORATORY" || value === "PATHOLOGY" || value === "RADIOLOGY" || value === "IMAGING";
  };

  /**
   * The Tests & Services catalogue offers everything except the consultation
   * itself: the doctor's fee is chosen in the Doctor service field above and
   * billed from there, so listing it here would invite double-charging.
   */
  const catalogueServices = useMemo(
    () =>
      availableServices.filter(
        (service) =>
          service.doctorId == null &&
          service.category.trim().toLocaleUpperCase().replace(/[^A-Z0-9]+/g, "_") !== "CONSULTATION",
      ),
    [availableServices],
  );

  const visibleSuggestedServices =
    useMemo(() => {
      if (
        normalizedServiceSearch === ""
      ) {
        return catalogueServices;
      }

      return catalogueServices.filter(
        (service) =>
          [
            service.name,
            service.category,
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(
              normalizedServiceSearch,
            ),
      );
    }, [catalogueServices, normalizedServiceSearch]);

  const selectedServices =
    useMemo(
      () =>
        availableServices.filter(
          (service) =>
            selectedServiceIds.includes(
              service.id,
            ),
        ),
      [availableServices, selectedServiceIds],
    );
  const selectedConsultationService = selectedServices.find(
    (service) => selectedDoctor !== null && service.doctorId === selectedDoctor.id,
  );

  const billingItems =
    useMemo(
      () => [
        ...selectedServices.filter((service) => service.id !== selectedConsultationService?.id),
        ...customBillingItems,
      ],
      [
        selectedConsultationService,
        selectedServices,
        customBillingItems,
      ],
    );

  const servicesTotal =
    billingItems.reduce(
      (
        total,
        service,
      ) =>
        total +
        service.price,
      0,
    );

  const consultationFee = useMemo(() => {
    if (selectedConsultationService) return selectedConsultationService.price;
    if (selectedDoctor === null) {
      return 0;
    }
    return selectedDoctor.consultationFee;
  }, [selectedConsultationService, selectedDoctor]);

  const tomorrowDateString = useMemo(() => localDateOffsetByDays(1), []);

  const slotsData = useWonFlowAsyncData<ReceptionSlotsResult>({
    key: `slots:${selectedDoctorId}:${appointmentDate}:${selectedConsultationService?.durationMinutes ?? 20}:${selectedDoctor?.primaryBranchId ?? ""}`,
    enabled: Boolean(selectedDoctorId && appointmentDate),
    loader: () =>
      getReceptionAppointmentSlots({
        doctorId: selectedDoctorId,
        branchId: selectedDoctor?.primaryBranchId || undefined,
        date: appointmentDate,
        durationMinutes: selectedConsultationService?.durationMinutes ?? 20,
      }),
  });
  const slotResult = slotsData.data;
  const availableSlots = useMemo(() => slotsData.data?.slots ?? [], [slotsData.data?.slots]);
  const isLoadingSlots = slotsData.status === "loading" || slotsData.isRefreshing;

  const admissionDepositValue =
    Math.max(
      0,
      Number(
        admissionDeposit,
      ) || 0,
    );

  const doctorChargeApplies =
    visitPurpose === "OPD Walk-in" ||
    visitPurpose === "Scheduled Appointment" ||
    visitPurpose === "Follow-up";

  const baseCharge = doctorChargeApplies ? consultationFee : 0;

  const baseChargeLabel =
    visitPurpose === "Emergency"
      ? "Emergency Base Charge"
      : visitPurpose === "Follow-up"
        ? "Follow-up Fee"
        : "Consultation Fee";

  const subtotal =
    baseCharge +
    servicesTotal;

  const numericDiscount =
    Math.max(
      0,
      Number(discountInput) || 0,
    );

  const calculatedDiscount =
    discountMode === "percent"
      ? subtotal *
        Math.min(
          numericDiscount,
          100,
        ) /
        100
      : Math.min(
          numericDiscount,
          subtotal,
        );

  const totalPayable =
    Math.max(
      0,
      subtotal -
        calculatedDiscount,
    );

  const received =
    Math.max(
      0,
      Number(amountReceived) || 0,
    );

  const change =
    Math.max(
      0,
      received -
        totalPayable,
    );

  const balance =
    Math.max(
      0,
      totalPayable -
        received,
    );

  const patientReady =
    patientSaved &&
    selectedPatient !== null;

  const requiresDoctorRouting =
    visitPurpose === "OPD Walk-in" ||
    visitPurpose === "Scheduled Appointment" ||
    visitPurpose === "Follow-up";

  const purposeReady =
    useMemo(() => {
      if (!patientReady) {
        return false;
      }

      const isScheduleUnavailable = Boolean(slotResult?.unavailableReason && availableSlots.length === 0);
      if (requiresDoctorRouting && isScheduleUnavailable) {
        return false;
      }

      switch (visitPurpose) {
        case "OPD Walk-in":
          return (
            selectedSpecialty !== "" &&
            selectedDoctor !== null &&
            selectedConsultationService !== undefined &&
            consultationReason.trim() !== ""
          );

        case "Scheduled Appointment":
          return (
            appointmentReference.trim() !== "" &&
            appointmentStatus !== "Cancelled" &&
            selectedSpecialty !== "" &&
            selectedDoctor !== null &&
            selectedConsultationService !== undefined &&
            appointmentDate !== "" &&
            (selectedSlot !== null || (appointmentTime !== "" && availableSlots.some((s) => s.start === appointmentTime && s.available))) &&
            consultationReason.trim() !== ""
          );

        case "Follow-up":
          return (
            followUpReference.trim() !== "" &&
            selectedSpecialty !== "" &&
            selectedDoctor !== null &&
            selectedConsultationService !== undefined &&
            appointmentDate !== "" &&
            (selectedSlot !== null || (appointmentTime !== "" && availableSlots.some((s) => s.start === appointmentTime && s.available))) &&
            consultationReason.trim() !== ""
          );

        case "Emergency":
          return emergencyComplaint.trim() !== "";
      }
    }, [
      appointmentDate,
      appointmentReference,
      appointmentStatus,
      appointmentTime,
      availableSlots,
      consultationReason,
      emergencyComplaint,
      followUpReference,
      patientReady,
      requiresDoctorRouting,
      selectedDoctor,
      selectedConsultationService,
      selectedSlot,
      selectedSpecialty,
      slotResult?.unavailableReason,
      visitPurpose,
    ]);

  const prepareActionLabel = {
    "OPD Walk-in": "Prepare OPD Visit",
    "Scheduled Appointment": "Load Appointment",
    "Follow-up": "Prepare Follow-up",
    Emergency: "Prepare Emergency Route",
  }[visitPurpose];

  const finalActionLabel = {
    "OPD Walk-in": "Create OPD Visit & Send to Doctor",
    "Scheduled Appointment": "Check In & Send to Doctor",
    "Follow-up": "Create Follow-up Visit",
    Emergency: "Send to Emergency Queue",
  }[visitPurpose];

  const routeDestination = {
    "OPD Walk-in": selectedDoctor?.name ?? "Doctor Queue",
    "Scheduled Appointment": selectedDoctor?.name ?? "Doctor Queue",
    "Follow-up": selectedDoctor?.name ?? "Doctor Queue",
    Emergency: "Emergency Department",
  }[visitPurpose];

  function updatePatientDraft(
    field:
      keyof PatientDraft,
    value: string,
  ): void {
    setPatientDraft(
      (currentDraft) => ({
        ...currentDraft,
        [field]: value,
      }),
    );

    setPatientSaved(false);
    setPatientError("");
  }

  function resetBillingForPatient(): void {
    setSelectedServiceIds([]);
    setCustomBillingItems([]);

    setServiceSearch("");
    setServicesPickerOpen(false);

    setDiscountMode(
      "percent",
    );

    setDiscountInput("");

    setPaymentMethod("");
    setAmountReceived("");
    setPaymentConfirmed(false);

    setBillingNotes("");

    setAppointmentPrepared(false);
    setIssuedToken("");

    setQueueSourceReference("");
    setCreatedQueueEntryId("");
    setQueuePosition(0);
    setEstimatedWaitMinutes(0);
    setIssuedRoomLabel("");

    setActionError("");
  }

  function selectPatient(
    patient: Patient,
  ): void {
    resetBillingForPatient();

    setSelectedPatientId(
      patient.id,
    );

    setPatientDraft(
      patientToDraft(
        patient,
      ),
    );

    setUseEstimatedAge(
      patient.dateOfBirth === "",
    );
    setDateOfBirthDisplay(
      formatDateOfBirth(
        patient.dateOfBirth,
      ),
    );
    setConsultationReason("");

    setPatientMode(
      "existing",
    );

    setPatientSaved(true);
    setSearchQuery("");
    setPatientError("");
    setActionError("");
  }

  function startNewPatient(
    prefillFromSearch = false,
  ): void {
    const nextDraft = prefillFromSearch
      ? createPatientDraftFromSearch(
          searchQuery,
        )
      : {
          ...EMPTY_PATIENT_DRAFT,
        };

    resetBillingForPatient();

    setSelectedPatientId(null);

    setPatientDraft(nextDraft);
    setUseEstimatedAge(false);
    setDateOfBirthDisplay("");
    setConsultationReason("");

    setPatientMode("new");
    setPatientSaved(false);
    setSearchQuery("");
    setPatientError("");
    setActionError("");
  }

  async function savePatient(): Promise<void> {
    const identityType =
      patientDraft.identityType;
    const age =
      Number(
        patientDraft.age,
      );

    const calculatedAge =
      calculateAge(
        patientDraft.dateOfBirth,
      );

    const validAge =
      Number.isFinite(age) &&
      age >= 0 &&
      age <= 130;

    const validDateOfBirth =
      patientDraft.dateOfBirth !== "" &&
      calculatedAge !== null;

    if (
      patientDraft.fullName
        .trim() === "" ||
      patientDraft.fatherName
        .trim() === "" ||
      identityType === "" ||
      patientDraft.identityNumber
        .trim() === "" ||
      patientDraft.mobile
        .trim() === "" ||
      patientDraft.gender === "" ||
      (
        useEstimatedAge
          ? !validAge
          : !validDateOfBirth
      )
    ) {
      setPatientError(
        useEstimatedAge
          ? "Complete the required patient information and enter a valid estimated age."
          : "Complete the required patient information and enter the patient’s date of birth.",
      );

      return;
    }

    const finalAge =
      useEstimatedAge
        ? age
        : calculatedAge ?? age;

    if (
      patientMode ===
        "existing" &&
      selectedPatient !== null
    ) {
      const nameParts = patientDraft.fullName.trim().split(/\s+/).filter(Boolean);
      const givenName = nameParts.shift() ?? "";
      const familyName = nameParts.length > 0 ? nameParts.pop()! : "";

      void updateReceptionPatient(selectedPatient.id, {
        givenName,
        familyName,
        middleName: nameParts.join(" ") || undefined,
        dateOfBirth: useEstimatedAge ? undefined : patientDraft.dateOfBirth,
        sex: patientDraft.gender,
        phone: patientDraft.mobile,
        fatherName: patientDraft.fatherName.trim(),
        bloodGroup: patientDraft.bloodGroup.trim() || undefined,
        address: patientDraft.address ? { text: patientDraft.address.trim() } : undefined,
        guardianData: {
          fatherName: patientDraft.fatherName.trim(),
          emergencyContact: patientDraft.emergencyContact.trim(),
          emergencyContactPhone: patientDraft.emergencyContact.trim(),
        },
      }).catch(() => {
        // Fallback for non-blocking local state update
      });

      const updatedPatient:
        Patient = {
          ...selectedPatient,
          fullName:
            patientDraft.fullName.trim(),
          fatherName:
            patientDraft.fatherName.trim(),
          identityType,
          identityNumber:
            patientDraft.identityNumber
              .trim()
              .toUpperCase(),
          mobile:
            patientDraft.mobile.trim(),
          gender:
            patientDraft.gender,
          age: finalAge,
          dateOfBirth:
            useEstimatedAge
              ? ""
              : patientDraft.dateOfBirth,
          bloodGroup:
            patientDraft.bloodGroup,
          address:
            patientDraft.address.trim(),
          emergencyContact:
            patientDraft.emergencyContact.trim(),
          allergies:
            patientDraft.allergies.trim() ||
            "No known allergies",
          medicalAlert:
            patientDraft.medicalAlert.trim() ||
            "None",
        };

      setPatients(
        (currentPatients) =>
          currentPatients.map(
            (patient) =>
              patient.id ===
              updatedPatient.id
                ? updatedPatient
                : patient,
          ),
      );

      setPatientSaved(true);
      setPatientError("");

      return;
    }

    // A single-word name is just the given name. Falling back to the given name
    // for the family name stored "sana" twice and displayed "sana sana".
    const nameParts = patientDraft.fullName.trim().split(/\s+/).filter(Boolean);
    const givenName = nameParts.shift() ?? "";
    const familyName = nameParts.length > 0 ? nameParts.pop()! : "";
    try {
      const { patient: saved, possibleDuplicates } = await registerReceptionPatient({
        givenName,
        familyName,
        middleName: nameParts.join(" ") || undefined,
        dateOfBirth: useEstimatedAge ? undefined : patientDraft.dateOfBirth,
        sex: patientDraft.gender,
        phone: patientDraft.mobile,
        fatherName: patientDraft.fatherName.trim(),
        bloodGroup: patientDraft.bloodGroup.trim() || undefined,
        address: patientDraft.address ? { text: patientDraft.address.trim() } : undefined,
        guardianData: {
          fatherName: patientDraft.fatherName.trim(),
          emergencyContact: patientDraft.emergencyContact.trim(),
          emergencyContactPhone: patientDraft.emergencyContact.trim(),
        },
        identifiers: [{ type: identityType, system: identityType.toLowerCase(), value: patientDraft.identityNumber, isPrimary: true }],
      });
    const newPatient: Patient = {
        id: saved.id,
        mrNumber: saved.patientNumber,
        fullName:
          patientDraft.fullName.trim(),
        fatherName:
          patientDraft.fatherName.trim(),
        identityType,
        identityNumber:
          patientDraft.identityNumber
            .trim()
            .toUpperCase(),
        mobile:
          patientDraft.mobile.trim(),
        gender:
          patientDraft.gender,
        age: finalAge,
        dateOfBirth:
          useEstimatedAge
            ? ""
            : patientDraft.dateOfBirth,
        bloodGroup:
          patientDraft.bloodGroup,
        address:
          patientDraft.address.trim(),
        emergencyContact:
          patientDraft.emergencyContact.trim(),
        allergies:
          patientDraft.allergies.trim() ||
          "No known allergies",
        medicalAlert:
          patientDraft.medicalAlert.trim() ||
          "None",
      };

    setPatients(
      (currentPatients) => [
        newPatient,
        ...currentPatients,
      ],
    );

    resetBillingForPatient();

    setSelectedPatientId(
      newPatient.id,
    );

    setPatientMode(
      "existing",
    );

    setPatientSaved(true);
    setPatientError("");
    /*
     * The server already works out whether this looks like somebody who is
     * already registered — same phone, or same name and date of birth — and
     * returns them as `possibleDuplicates`. That answer was being discarded
     * here, so a patient re-registered under a second MR number with nothing
     * shown to the receptionist and their history split across two records.
     * The registration still goes through (the front desk is not the place to
     * block on a maybe) but the match is now named, with the MR number needed
     * to go and merge or switch to it.
     */
    setDuplicateWarning(
      possibleDuplicates && possibleDuplicates.length > 0
        ? possibleDuplicates
            .slice(0, 3)
            .map((match) => `${match.givenName ?? ""} ${match.familyName ?? ""}`.trim() + ` (MR ${match.patientNumber})`)
        : [],
    );
    } catch (caught) {
      setPatientError(
        caught instanceof Error
          ? `The patient could not be registered: ${caught.message}`
          : "The patient could not be registered. Review the details and try again.",
      );
    }
  }

  function changePatient(): void {
    resetBillingForPatient();

    setPatientMode("search");
    setSelectedPatientId(null);

    setPatientDraft(
      EMPTY_PATIENT_DRAFT,
    );

    setUseEstimatedAge(false);
    setDateOfBirthDisplay("");
    setConsultationReason("");

    setPatientSaved(false);
    setSearchQuery("");
    setPatientError("");

    setSelectedSpecialty("");
    setSelectedDoctorId("");
    setAppointmentPrepared(false);
    setActionError("");
  }

  function toggleService(
    serviceId: string,
  ): void {
    setPaymentConfirmed(false);

    setSelectedServiceIds(
      (currentIds) =>
        currentIds.includes(
          serviceId,
        )
          ? currentIds.filter(
              (id) =>
                id !==
                serviceId,
            )
          : [
              ...currentIds,
              serviceId,
            ],
    );
  }

  function removeBillingItem(
    item:
      AdditionalService,
  ): void {
    setPaymentConfirmed(false);

    if (
      item.custom
    ) {
      setCustomBillingItems(
        (currentItems) =>
          currentItems.filter(
            (currentItem) =>
              currentItem.id !==
              item.id,
          ),
      );

      return;
    }

    setSelectedServiceIds(
      (currentIds) =>
        currentIds.filter(
          (id) =>
            id !==
            item.id,
        ),
    );
  }

  function addCustomBillingItem(): void {
    const price =
      Number(
        customItemPrice,
      );

    if (
      customItemName.trim() ===
        "" ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return;
    }

    setPaymentConfirmed(false);

    setCustomBillingItems(
      (currentItems) => [
        ...currentItems,
        {
          id:
            `custom-${Date.now()}`,
          name:
            customItemName.trim(),
          price,
          category:
            "Custom Service",
          custom: true,
        },
      ],
    );

    setCustomItemName("");
    setCustomItemPrice("");
    setAddItemOpen(false);
  }

  function changeVisitPurpose(
    purpose: VisitPurpose,
  ): void {
    setVisitPurpose(
      purpose,
    );

    setSelectedSpecialty("");
    setSelectedDoctorId("");
    setConsultationReason("");
    setAppointmentPrepared(false);
    setActionError("");

    setAppointmentReference("");
    setAppointmentStatus(
      "Booked",
    );

    setFollowUpReference("");

    setAdmissionType(
      "Planned",
    );

    setAdmissionReason("");
    setAdmissionWard("");
    setAdmissionBed("");
    setAdmissionDeposit("0");

    setEmergencyArrivalMode(
      "Walk-in",
    );

    setEmergencyComplaint("");
    setTriageLevel(
      "Yellow",
    );

    setDiagnosticDestination(
      "Laboratory",
    );

    setDiagnosticService("");
    setReferringDoctor("");
  }

  function prepareAppointment(): void {
    if (!patientReady) {
      setActionError(
        "Select or register the patient and save the patient details first.",
      );

      return;
    }

    if (requiresDoctorRouting && slotResult?.unavailableReason && availableSlots.length === 0) {
      setActionError(slotResult.unavailableReason);
      return;
    }

    if ((visitPurpose === "Scheduled Appointment" || visitPurpose === "Follow-up") && !selectedSlot && !appointmentTime) {
      setActionError("Please choose an available appointment time slot for this doctor.");
      return;
    }

    if (!purposeReady) {
      const message = {
        "OPD Walk-in":
          "Select the consultation type, specialty and doctor, then enter the reason for consultation.",
        "Scheduled Appointment":
          "Enter the appointment reference, doctor, date, time and reason for consultation.",
        "Follow-up":
          "Enter the previous consultation reference, follow-up details and reason for consultation.",
        Emergency:
          "Enter the emergency complaint and triage information.",
        "Admission / IPD":
          "Select the department, admitting doctor, admission reason and ward.",
        "Diagnostics / Procedure":
          "Select the destination and requested diagnostic service.",
      }[visitPurpose];

      setActionError(
        message,
      );

      return;
    }

    setActionError("");
    setAppointmentPrepared(true);
  }

  function confirmPayment(): void {
    if (paymentMethod === "") {
      setActionError(
        "Select a payment method before confirming payment.",
      );

      return;
    }

    if (
      paymentMethod !== "Unpaid" &&
      received <= 0
    ) {
      setActionError(
        "Enter the amount received before confirming payment.",
      );

      return;
    }

    if (paymentMethod === "Unpaid") {
      setAmountReceived("0");
    }

    setActionError("");
    setPaymentConfirmed(true);
  }

  async function confirmAndSend(): Promise<void> {
    if (!purposeReady) {
      prepareAppointment();

      return;
    }

    if (!paymentConfirmed) {
      setActionError(
        "Confirm the payment status before forwarding the patient.",
      );

      return;
    }

    if (selectedPatient === null) {
      setActionError(
        "Select and save a patient before forwarding the visit.",
      );
      return;
    }

    if (selectedDoctor === null) {
      setActionError(
        "Select a doctor before forwarding the patient.",
      );
      return;
    }

    const isPhaseOneDoctorRoute =
      visitPurpose === "OPD Walk-in" ||
      visitPurpose === "Scheduled Appointment" ||
      visitPurpose === "Follow-up";

    if (!isPhaseOneDoctorRoute) {
      setActionError(
        "This destination is outside the Phase 1 doctor queue workflow.",
      );
      return;
    }

    if (slotResult?.unavailableReason && availableSlots.length === 0) {
      setActionError(slotResult.unavailableReason);
      return;
    }

    if ((visitPurpose === "Scheduled Appointment" || visitPurpose === "Follow-up") && !selectedSlot && !appointmentTime) {
      setActionError("Please choose an available appointment time slot for this doctor.");
      return;
    }

    if (createdQueueEntryId !== "") {
      setActionError("");
      setConfirmationOpen(true);
      return;
    }

    const businessDate =
      visitPurpose === "OPD Walk-in"
        ? getToday()
        : appointmentDate || getToday();
    const nextSourceReference =
      queueSourceReference ||
      [
        "reception",
        selectedPatient.id,
        selectedDoctor.id,
        Date.now(),
      ].join(":");
    // Only the doctor's published sitting counts, and only while it is
    // actually active — a finished or not-yet-started sitting cannot take
    // this patient.
    const publishedSitting = liveSittings.findForDoctor(selectedDoctor.id);
    const activeSitting =
      publishedSitting && publishedSitting.status !== "finished" && publishedSitting.status !== "not-started"
        ? publishedSitting
        : undefined;

    // Book and check in against the real appointment/queue tables first, and
    // block on it: this is what makes the visit exist in the database and
    // visible on the doctor's own live "My appointments" page. Previously a
    // failure here (an expired doctor sitting, a scheduling conflict) was
    // caught and swallowed into a small error banner while the flow fell
    // through to the local-only confirmation screen anyway — the desk saw a
    // token, a room and a "success" state for a visit that was never actually
    // booked. Now a real failure stops here, with nothing to undo.
    setIsBookingLive(true);
    try {
      const startsAt =
        selectedSlot?.startsAt
          ? new Date(selectedSlot.startsAt)
          : appointmentDate && appointmentTime
          ? new Date(`${appointmentDate}T${appointmentTime}:00`)
          : new Date();
      const duration =
        selectedConsultationService?.durationMinutes ||
        activeSitting?.averageConsultationMinutes ||
        20;
      const endsAt =
        selectedSlot?.endsAt
          ? new Date(selectedSlot.endsAt)
          : new Date(startsAt.getTime() + Math.max(5, duration) * 60_000);
      const isFutureDate = appointmentDate && appointmentDate > getToday();

      const { appointment } = await bookReceptionAppointment({
        patientId: selectedPatient.id,
        doctorId: selectedDoctor.id,
        serviceId: selectedConsultationService?.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: consultationReason.trim() || undefined,
        source: "reception",
        consultationMode,
        idempotencyKey: nextSourceReference,
      });

      void slotsData.reload();

      if (!isFutureDate) {
        const { queueEntry: bookedQueueEntry } = await checkInReceptionAppointment(appointment.id, {
          queueDate: businessDate,
          priority: 0,
          notes: billingNotes || undefined,
        });

        const { overview } = await getReceptionOverview(businessDate);
        const doctorQueue = overview.queue
          .filter(
            (entry) =>
              entry.appointment?.doctorId === selectedDoctor.id &&
              entry.status === "WAITING",
          )
          .sort(
            (left, right) =>
              right.priority - left.priority || left.tokenNumber - right.tokenNumber,
          );
        const position = Math.max(
          1,
          doctorQueue.findIndex((entry) => entry.id === bookedQueueEntry.id) + 1,
        );

        setQueueSourceReference(nextSourceReference);
        setCreatedQueueEntryId(bookedQueueEntry.id);
        setIssuedToken(`Q-${String(bookedQueueEntry.tokenNumber).padStart(3, "0")}`);
        setQueuePosition(position);
        setEstimatedWaitMinutes(
          Math.max(0, position - 1) *
            (activeSitting?.averageConsultationMinutes ?? duration),
        );
        setIssuedRoomLabel(selectedSlot?.roomLabel ?? activeSitting?.roomLabel ?? "OPD Room");
      } else {
        setQueueSourceReference(nextSourceReference);
        setCreatedQueueEntryId(appointment.id);
        setIssuedToken(`APT-${appointment.id.slice(0, 6).toUpperCase()}`);
        setQueuePosition(0);
        setEstimatedWaitMinutes(0);
        setIssuedRoomLabel(selectedSlot?.roomLabel ?? "OPD Room");
      }

      // Automatically check or provision patient portal credentials for video call & records
      let portalInfo: {
        hasPortalAccess: boolean;
        isNewlyCreated: boolean;
        email: string;
        temporaryPassword?: string;
        portalUrl: string;
        videoCallUrl?: string;
      } | null = null;

      try {
        const credRes = await fetch(`/api/v1/patients/${selectedPatient.id}/portal-credentials`, { cache: "no-store" });
        if (credRes.ok) {
          const credData = (await credRes.json()) as { hasPortalAccess: boolean; email?: string };
          if (credData.hasPortalAccess) {
            portalInfo = {
              hasPortalAccess: true,
              isNewlyCreated: false,
              email: credData.email || selectedPatient.email || `${selectedPatient.mrNumber.toLowerCase()}@patient.wonflow.com`,
              portalUrl: "/patient",
              videoCallUrl: `/patient/appointments/${appointment.id}/video`,
            };
          } else {
            const createRes = await fetch(`/api/v1/patients/${selectedPatient.id}/portal-credentials`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email: selectedPatient.email || undefined }),
            });
            if (createRes.ok) {
              const created = (await createRes.json()) as { email: string; temporaryPassword?: string; portalUrl?: string };
              portalInfo = {
                hasPortalAccess: true,
                isNewlyCreated: true,
                email: created.email,
                temporaryPassword: created.temporaryPassword,
                portalUrl: created.portalUrl || "/patient",
                videoCallUrl: `/patient/appointments/${appointment.id}/video`,
              };
            }
          }
        }
      } catch {
        // Portal credential error non-blocking for reception booking
      }
      setBookedPortalAccess(portalInfo);
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? `The visit could not be booked: ${caught.message}`
          : "The visit could not be booked. Check the doctor has an active sitting or roster for now.",
      );
      setIsBookingLive(false);
      return;
    }
    setIsBookingLive(false);
    setActionError("");
    setAppointmentPrepared(true);
    setConfirmationOpen(true);

    // Laboratory and radiology services selected for this visit become real
    // diagnostic orders, so they reach the department worklists immediately.
    const diagnosticServiceIds = selectedServices
      .filter((service) => isDiagnosticCategory(service.category))
      .map((service) => service.id);
    if (diagnosticServiceIds.length > 0) {
      try {
        await createReceptionDiagnosticOrders({
          patientId: selectedPatient.id,
          serviceIds: diagnosticServiceIds,
          clinicalReason: consultationReason.trim() || undefined,
        });
      } catch (caught) {
        setActionError(
          caught instanceof Error
            ? `The visit was created, but the tests could not be sent to the department: ${caught.message}`
            : "The visit was created, but the tests could not be sent to the department.",
        );
      }
    }
  }

  function clearBill(): void {
    resetBillingForPatient();
  }

  async function printVisitTokenReceipt(
    preferredFormat: TicketPrintFormat = "thermal",
  ): Promise<void> {
    if (selectedPatient === null) {
      setActionError(
        "Select a patient before printing the token.",
      );

      return;
    }

    const tokenNumber =
      issuedToken ||
      createAppointmentToken();

    if (issuedToken === "") {
      setIssuedToken(tokenNumber);
    }

    const doctorName =
      selectedDoctor?.name ??
      routeDestination;

    const resolvedHospitalName =
      hospitalBranding.displayName ||
      session?.orgLabel ||
      "Hospital Care";

    const resolvedBranchName =
      session?.branchLabel ||
      "OPD & Clinical Services";

    const slipData: TicketSlipData = {
      hospitalName: resolvedHospitalName,
      branchName: resolvedBranchName,
      hospitalLogoUrl: hospitalBranding.logoDataUrl,
      tokenNumber,
      queuePosition: queuePosition || 1,
      estimatedWaitMinutes,
      priorityLabel: visitPurpose === "Emergency" ? "Emergency" : "Standard",
      appointmentDate,
      appointmentTime,
      patient: {
        fullName: selectedPatient.fullName,
        mrNumber: selectedPatient.mrNumber,
        mobile: selectedPatient.mobile,
        gender: selectedPatient.gender,
        ageDisplay: selectedPatient.age ? `${selectedPatient.age} Y` : undefined,
        identityType: selectedPatient.identityType,
        identityNumber: selectedPatient.identityNumber,
        email: selectedPatient.email,
      },
      doctor: {
        name: doctorName,
        specialty: selectedSpecialty || "General OPD",
        roomLabel: issuedRoomLabel || "OPD Desk",
      },
      visitPurpose,
      consultationReason,
      consultationMode,
      routeDestination,
      services: billingItems.map((item) => ({
        name: item.name,
        price: item.price,
      })),
      payment: {
        subtotal,
        discount: calculatedDiscount,
        totalPayable,
        amountReceived: received,
        changeReturned: change,
        balance,
        paymentMethod: paymentMethod || "Cash",
        status: paymentMethod === "Unpaid" ? "Unpaid" : balance > 0 ? "Partially Paid" : "Paid",
        receiptDate: new Date().toLocaleString("en-PK", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        notes: billingNotes,
      },
      portalAccess: bookedPortalAccess ? {
        portalUrl: "/patient",
        loginIdentifier: bookedPortalAccess.email || selectedPatient.email || selectedPatient.mrNumber,
        temporaryPassword: bookedPortalAccess.temporaryPassword,
        isNewlyCreated: bookedPortalAccess.isNewlyCreated,
        videoCallUrl: bookedPortalAccess.videoCallUrl,
      } : null,
    };

    try {
      await printTicketSlip(slipData, preferredFormat);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not print the visit ticket.",
      );
    }
  }

  function resetDesk(): void {
    resetBillingForPatient();

    setPatientMode("search");
    setSelectedPatientId(null);

    setPatientDraft(
      EMPTY_PATIENT_DRAFT,
    );

    setUseEstimatedAge(false);
    setDateOfBirthDisplay("");
    setConsultationReason("");

    setPatientSaved(false);
    setSearchQuery("");

    setSelectedSpecialty("");
    setSelectedDoctorId("");
    setVisitPurpose(
      "OPD Walk-in",
    );

    setAppointmentReference("");
    setAppointmentStatus(
      "Booked",
    );

    setFollowUpReference("");

    setAdmissionType(
      "Planned",
    );

    setAdmissionReason("");
    setAdmissionWard("");
    setAdmissionBed("");
    setAdmissionDeposit("0");

    setEmergencyArrivalMode(
      "Walk-in",
    );

    setEmergencyComplaint("");
    setTriageLevel(
      "Yellow",
    );

    setDiagnosticDestination(
      "Laboratory",
    );

    setDiagnosticService("");
    setReferringDoctor("");
    setAppointmentDate(
      getToday(),
    );
    setAppointmentTime("");

    setPatientError("");
    setBookedPortalAccess(null);
    setCopiedPortalField(null);
    setConfirmationOpen(false);
  }

  return (
    <>
      <main
        className="wf-reception-page min-h-0 overflow-x-hidden px-3 py-2 lg:px-4"
        lang="en-GB"
        onChangeCapture={(event) => {
          const control = event.target;

          if (
            control instanceof HTMLSelectElement ||
            (
              control instanceof HTMLInputElement &&
              (
                control.type === "date" ||
                control.type === "checkbox"
              )
            )
          ) {
            requestAnimationFrame(() => {
              focusNextReceptionControl(control);
            });
          }
        }}
        onKeyDown={handleReceptionEnter}
      >
        <div className="mx-auto max-w-[1600px]">
          <header className="wf-page-header mb-2 flex shrink-0 items-center justify-between gap-4">
            <div>
              <h1 className="text-[19px] font-black tracking-[-0.04em] text-slate-950">
                Reception Desk
              </h1>

              <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                Patient registration, visit routing and billing in one workspace
              </p>
            </div>

            <div className="flex items-center gap-2">
              {appointmentPrepared ? (
                <div className="hidden items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[9px] font-black text-emerald-700 sm:flex">
                  <CheckCircle2
                    size={13}
                  />

                  Ready to send
                </div>
              ) : null}

              <button
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-black text-slate-600 hover:bg-slate-50"
                onClick={
                  resetDesk
                }
                type="button"
              >
                <RotateCcw
                  size={12}
                />

                Reset
              </button>
            </div>
          </header>

          <div className="wf-reception-grid grid items-start gap-2 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="wf-reception-left relative min-w-0 space-y-2 xl:pr-1">
              {patientMode ===
              "search" ? (
                <section className="relative z-[80] overflow-visible rounded-xl border border-indigo-200 bg-white p-3 shadow-[0_3px_14px_rgba(15,23,42,0.035)] ring-1 ring-indigo-100">
                  <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_150px]">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={15}
                      />

                      <input
                        autoFocus
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[11px] font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        onChange={(
                          event,
                        ) => {
                          setSearchQuery(
                            event.target.value,
                          );
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") {
                            return;
                          }

                          event.preventDefault();

                          const firstResult =
                            searchResults[0];

                          if (firstResult !== undefined) {
                            selectPatient(firstResult);
                            return;
                          }

                          if (normalizedQuery !== "") {
                            startNewPatient(true);
                          }
                        }}
                        placeholder="Search by name, MR number, CNIC, passport or phone"
                        value={
                          searchQuery
                        }
                      />

                      {normalizedQuery !==
                      "" ? (
                        <div className="absolute left-0 right-0 top-[42px] z-[300] max-h-[290px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-[0_22px_55px_rgba(15,23,42,0.20)]">
                          {searchResults.length >
                          0 ? (
                            searchResults.map(
                              (
                                patient,
                              ) => (
                                <button
                                  className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-indigo-50"
                                  key={
                                    patient.id
                                  }
                                  onClick={() => {
                                    selectPatient(
                                      patient,
                                    );
                                  }}
                                  type="button"
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-black text-indigo-700">
                                    {patient.fullName
                                      .split(
                                        " ",
                                      )
                                      .slice(
                                        0,
                                        2,
                                      )
                                      .map(
                                        (
                                          part,
                                        ) =>
                                          part[0],
                                      )
                                      .join("")}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-[11px] font-black text-slate-900">
                                      {
                                        patient.fullName
                                      }
                                    </div>

                                    <div className="mt-0.5 truncate text-[9px] font-semibold text-slate-500">
                                      {
                                        patient.mrNumber
                                      }
                                      {" · "}
                                      {
                                        patient.identityNumber
                                      }
                                      {" · "}
                                      {
                                        patient.mobile
                                      }
                                    </div>
                                  </div>

                                  <ChevronRight
                                    className="shrink-0 text-slate-300"
                                    size={14}
                                  />
                                </button>
                              ),
                            )
                          ) : (
                            <div className="p-3">
                              <div className="text-[10px] font-bold text-slate-500">
                                No matching patient found.
                              </div>

                              <button
                                className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-[10px] font-black text-white hover:bg-indigo-700"
                                onClick={() => {
                                  startNewPatient(true);
                                }}
                                type="button"
                              >
                                <UserPlus
                                  size={13}
                                />

                                Open Patient Registration
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <button
                      className="flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-[10px] font-black text-white hover:from-indigo-700 hover:to-violet-700"
                      onClick={() => {
                        startNewPatient(false);
                      }}
                      type="button"
                    >
                      <UserPlus
                        size={13}
                      />

                      New Patient
                    </button>
                  </div>
                </section>
              ) : (
                <section
                  className={[
                    "wf-workflow-section",
                    "overflow-hidden rounded-xl",
                    "border shadow-[0_3px_14px_rgba(15,23,42,0.035)]",
                    patientSaved
                      ? "wf-workflow-section-complete"
                      : "border-slate-200 bg-white",
                  ].join(" ")}
                >
                  <SectionHeader
                    icon={
                      <UserRound
                        size={14}
                      />
                    }
                    suffix={
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "rounded-md px-2 py-1",
                            "text-[8px] font-black",
                            patientMode ===
                            "new"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-emerald-50 text-emerald-700",
                          ].join(" ")}
                        >
                          {patientMode ===
                          "new"
                            ? "New Registration"
                            : selectedPatient?.mrNumber ??
                              "Existing Patient"}
                        </span>

                        <button
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[8px] font-black text-indigo-600 hover:bg-indigo-50"
                          onClick={
                            changePatient
                          }
                          type="button"
                        >
                          Change Patient
                        </button>
                      </div>
                    }
                    title={
                      patientMode ===
                      "new"
                        ? "Patient Registration & Visit Reference"
                        : "Patient Details & Visit Reference"
                    }
                  />

                  <div className="p-3">
                    <div className="grid gap-x-2.5 gap-y-2 lg:grid-cols-4">
                      <Field
                        label="Patient Name"
                        required
                      >
                        <input
                          className={
                            CONTROL_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePatientDraft(
                              "fullName",
                              event.target
                                .value,
                            );
                          }}
                          placeholder="Full name"
                          value={
                            patientDraft.fullName
                          }
                        />
                      </Field>

                      <Field
                        label="Father Name"
                        required
                      >
                        <input
                          className={
                            CONTROL_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePatientDraft(
                              "fatherName",
                              event.target
                                .value,
                            );
                          }}
                          placeholder="Father name"
                          value={
                            patientDraft.fatherName
                          }
                        />
                      </Field>

                      <Field label="Identity Type" required>
                        <select
                          className={CONTROL_CLASS_NAME}
                          onChange={(event) => {
                            updatePatientDraft(
                              "identityType",
                              event.target.value,
                            );
                          }}
                          value={patientDraft.identityType}
                        >
                          <option value="">Select</option>
                          <option value="CNIC">CNIC</option>
                          <option value="Passport">Passport</option>
                        </select>
                      </Field>

                      <Field
                        label={
                          patientDraft.identityType === "Passport"
                            ? "Passport Number"
                            : "CNIC Number"
                        }
                        required
                      >
                        <input
                          className={CONTROL_CLASS_NAME}
                          onChange={(event) => {
                            const value =
                              patientDraft.identityType === "Passport"
                                ? event.target.value.toUpperCase()
                                : event.target.value;

                            updatePatientDraft(
                              "identityNumber",
                              value,
                            );
                          }}
                          placeholder={
                            patientDraft.identityType === "Passport"
                              ? "Enter passport number"
                              : "xxxxx-xxxxxxx-x"
                          }
                          value={patientDraft.identityNumber}
                        />
                      </Field>

                      <Field
                        label="Mobile"
                        required
                      >
                        <input
                          className={
                            CONTROL_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePatientDraft(
                              "mobile",
                              event.target
                                .value,
                            );
                          }}
                          placeholder="03xx-xxxxxxx"
                          value={
                            patientDraft.mobile
                          }
                        />
                      </Field>

                      <Field
                        label="Gender"
                        required
                      >
                        <select
                          className={
                            CONTROL_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePatientDraft(
                              "gender",
                              event.target
                                .value,
                            );
                          }}
                          value={
                            patientDraft.gender
                          }
                        >
                          <option value="">
                            Select
                          </option>

                          <option value="Male">
                            Male
                          </option>

                          <option value="Female">
                            Female
                          </option>

                          <option value="Other">
                            Other
                          </option>
                        </select>
                      </Field>

                      <div className="min-w-0">
                        <Field
                          label="Date of Birth"
                          required={!useEstimatedAge}
                        >
                          <input
                            className={CONTROL_CLASS_NAME}
                            disabled={useEstimatedAge}
                            inputMode="numeric"
                            maxLength={10}
                            onChange={(event) => {
                              const value =
                                maskDateOfBirth(
                                  event.target.value,
                                );
                              const parsedDate =
                                parseDateOfBirth(value);

                              setDateOfBirthDisplay(value);

                              setPatientDraft(
                                (currentDraft) => ({
                                  ...currentDraft,
                                  dateOfBirth:
                                    parsedDate?.isoDate ?? "",
                                  age:
                                    parsedDate === null
                                      ? ""
                                      : String(parsedDate.age),
                                }),
                              );
                              setPatientSaved(false);
                              setPatientError(
                                value.length === 10 &&
                                parsedDate === null
                                  ? "Enter a valid date of birth in DD/MM/YYYY format. The calculated age must be between 0 and 130."
                                  : "",
                              );
                            }}
                            placeholder="DD/MM/YYYY"
                            type="text"
                            value={dateOfBirthDisplay}
                          />
                        </Field>

                        <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[8px] font-bold text-slate-500">
                          <input
                            checked={useEstimatedAge}
                            className="h-3 w-3 rounded border-slate-300 accent-emerald-600"
                            onChange={(event) => {
                              const nextValue =
                                event.target.checked;

                              setUseEstimatedAge(nextValue);
                              setDateOfBirthDisplay("");
                              setPatientDraft(
                                (currentDraft) => ({
                                  ...currentDraft,
                                  dateOfBirth: nextValue
                                    ? ""
                                    : currentDraft.dateOfBirth,
                                  age: nextValue
                                    ? currentDraft.age
                                    : "",
                                }),
                              );
                              setPatientSaved(false);
                              setPatientError("");
                            }}
                            type="checkbox"
                          />

                          <span>
                            Date of birth unavailable
                          </span>
                        </label>
                      </div>

                      <Field
                        label={
                          useEstimatedAge
                            ? "Estimated Age"
                            : "Age"
                        }
                        required={useEstimatedAge}
                      >
                        <input
                          className={CONTROL_CLASS_NAME}
                          disabled={!useEstimatedAge}
                          max="130"
                          min="0"
                          onChange={(event) => {
                            updatePatientDraft(
                              "age",
                              event.target.value,
                            );
                          }}
                          placeholder={
                            useEstimatedAge
                              ? "Enter estimated age"
                              : "Calculated automatically"
                          }
                          type="number"
                          value={patientDraft.age}
                        />
                      </Field>

                      <Field label="Blood Group">
                        <select
                          className={
                            CONTROL_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePatientDraft(
                              "bloodGroup",
                              event.target
                                .value,
                            );
                          }}
                          value={
                            patientDraft.bloodGroup
                          }
                        >
                          <option value="">
                            Select
                          </option>

                          <option>
                            A+
                          </option>

                          <option>
                            A-
                          </option>

                          <option>
                            B+
                          </option>

                          <option>
                            B-
                          </option>

                          <option>
                            AB+
                          </option>

                          <option>
                            AB-
                          </option>

                          <option>
                            O+
                          </option>

                          <option>
                            O-
                          </option>
                        </select>
                      </Field>

                      <div className="lg:col-span-3">
                        <Field label="Address">
                          <input
                            className={
                              CONTROL_CLASS_NAME
                            }
                            onChange={(
                              event,
                            ) => {
                              updatePatientDraft(
                                "address",
                                event.target.value,
                              );
                            }}
                            placeholder="Patient address"
                            value={
                              patientDraft.address
                            }
                          />
                        </Field>
                      </div>

                      <Field label="Emergency Contact">
                        <input
                          className={
                            CONTROL_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePatientDraft(
                              "emergencyContact",
                              event.target.value,
                            );
                          }}
                          placeholder="Emergency number"
                          value={
                            patientDraft.emergencyContact
                          }
                        />
                      </Field>

                      <div className="flex items-center justify-end border-t border-slate-100 pt-2 lg:col-span-4">
                        <button
                          className={[
                            "flex h-8 min-w-[150px]",
                            "items-center",
                            "justify-center gap-2",
                            "rounded-lg px-4",
                            "text-[9px]",
                            "font-black text-white",
                            patientSaved
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700",
                          ].join(" ")}
                          onClick={
                            savePatient
                          }
                          type="button"
                        >
                          {patientSaved ? (
                            <CheckCircle2
                              size={12}
                            />
                          ) : (
                            <Save
                              size={12}
                            />
                          )}

                          {patientSaved
                            ? "Patient Ready"
                            : patientMode ===
                                "new"
                              ? "Register Patient"
                              : "Save Changes"}
                        </button>
                      </div>
                    </div>

                    {patientError !==
                    "" ? (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[9px] font-bold text-rose-700">
                        <AlertTriangle
                          size={12}
                        />

                        {
                          patientError
                        }
                      </div>
                    ) : null}

                    {duplicateWarning.length > 0 ? (
                      <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[9px] font-bold text-amber-800">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={12} />
                          Possible duplicate — this person may already be registered
                        </div>
                        <ul className="mt-1 list-disc pl-6 font-semibold">
                          {duplicateWarning.map((match) => (
                            <li key={match}>{match}</li>
                          ))}
                        </ul>
                        <p className="mt-1 font-semibold">
                          The new record was still created. If it is the same person, use the existing MR number
                          instead so their history stays in one place.
                        </p>
                        <button
                          className="mt-1.5 rounded-md bg-amber-200/70 px-2 py-1 font-black text-amber-900 hover:bg-amber-200"
                          onClick={() => setDuplicateWarning([])}
                          type="button"
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : null}
                  </div>
                </section>
              )}

              <section
                className={[
                  "wf-workflow-section",
                  "relative z-0 overflow-hidden rounded-xl",
                  "border shadow-[0_3px_14px_rgba(15,23,42,0.035)]",
                  appointmentPrepared
                    ? "wf-workflow-section-complete"
                    : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <SectionHeader
                  icon={
                    <Stethoscope
                      size={14}
                    />
                  }
                  suffix={
                    patientReady ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-[8px] font-black text-emerald-700">
                        Patient Ready
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[8px] font-black text-slate-500">
                        Select Patient
                      </span>
                    )
                  }
                  title="Purpose of Visit & Routing"
                />

                <div className="p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {VISIT_PURPOSE_LIST.map((item) => {
                      const isSelected = visitPurpose === item.id;
                      const isEmergency = item.id === "Emergency";

                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={!patientReady}
                          onClick={() => {
                            changeVisitPurpose(item.id);
                          }}
                          className={[
                            "relative flex flex-col justify-between rounded-xl p-2.5 text-left transition min-h-[58px] border",
                            isSelected
                              ? isEmergency
                                ? "border-rose-600 bg-rose-600 text-white shadow-[0_6px_16px_rgba(225,29,72,0.20)] ring-1 ring-rose-400"
                                : "border-indigo-600 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-[0_6px_16px_rgba(79,70,229,0.20)] ring-1 ring-indigo-400"
                              : "border-slate-200 bg-slate-50/80 text-slate-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-900",
                            !patientReady ? "opacity-45 cursor-not-allowed" : "cursor-pointer",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-1.5 w-full">
                            <span className={`text-[11px] font-black leading-tight ${isSelected ? "text-white" : "text-slate-900"}`}>
                              {item.label}
                            </span>
                            {item.badge ? (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[7px] font-black tracking-wide ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : isEmergency
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-indigo-100 text-indigo-800"
                                }`}
                              >
                                {item.badge}
                              </span>
                            ) : null}
                          </div>
                          <span
                            className={`mt-1 text-[9px] font-medium leading-tight ${
                              isSelected ? "text-indigo-100" : "text-slate-500"
                            }`}
                          >
                            {item.shortDescription}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {visitPurpose ===
                  "Scheduled Appointment" ? (
                    <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
                      <Field
                        label="Appointment Number"
                        required
                      >
                        <input
                          className={
                            CONTROL_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            setAppointmentReference(
                              event.target.value,
                            );
                          }}
                          placeholder="Appointment reference"
                          value={
                            appointmentReference
                          }
                        />
                      </Field>

                      <Field label="Appointment Status">
                        <select
                          className={
                            CONTROL_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            setAppointmentStatus(
                              event.target
                                .value as
                                AppointmentStatus,
                            );
                          }}
                          value={
                            appointmentStatus
                          }
                        >
                          <option>
                            Booked
                          </option>

                          <option>
                            Confirmed
                          </option>

                          <option>
                            Arrived
                          </option>

                          <option>
                            Cancelled
                          </option>
                        </select>
                      </Field>

                      <div className="flex items-end">
                        <div className="flex h-8 w-full items-center rounded-lg bg-blue-50 px-3 text-[9px] font-bold text-blue-700">
                          Existing booking will be checked in, not duplicated.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {visitPurpose ===
                  "Follow-up" ? (
                    <div className="mt-3">
                      <Field
                        label="Previous Consultation / Follow-up Reference"
                        required
                      >
                        <input
                          className={
                            CONTROL_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            setFollowUpReference(
                              event.target.value,
                            );
                          }}
                          placeholder="Previous visit, prescription or consultation number"
                          value={
                            followUpReference
                          }
                        />
                      </Field>
                    </div>
                  ) : null}

                  {requiresDoctorRouting ? (
                    <div className="mt-3 wf-form-field block min-w-0">
                      {/*
                        Not Field/<label>: two independent toggle buttons
                        wrapped in one <label> produced a single merged
                        accessible name across both buttons instead of two
                        distinct ones. A labelled radiogroup keeps the same
                        look with a screen reader announcing each button
                        correctly.
                      */}
                      <span className="wf-field-label mb-1.5 flex items-center gap-1 text-[10px] font-extrabold text-slate-700" id="consultation-type-label">
                        Consultation type
                      </span>
                      <div aria-labelledby="consultation-type-label" className="grid grid-cols-2 gap-2" role="radiogroup">
                        <button
                          aria-checked={consultationMode === "IN_PERSON"}
                          className={`h-9 rounded-xl border text-[11px] font-black transition ${consultationMode === "IN_PERSON" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                          onClick={() => {
                            setConsultationMode("IN_PERSON");
                            setSelectedServiceIds([]);
                            setAppointmentPrepared(false);
                          }}
                          role="radio"
                          type="button"
                        >
                          In person
                        </button>
                        <button
                          aria-checked={consultationMode === "ONLINE"}
                          className={`h-9 rounded-xl border text-[11px] font-black transition ${consultationMode === "ONLINE" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                          onClick={() => {
                            setConsultationMode("ONLINE");
                            setSelectedServiceIds([]);
                            setAppointmentPrepared(false);
                          }}
                          role="radio"
                          type="button"
                        >
                          Online video
                        </button>
                      </div>

                    </div>
                  ) : null}

                  {requiresDoctorRouting &&
                  visitPurpose !==
                    "OPD Walk-in" ? (
                    <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
                      <Field
                        label="Specialty / Department"
                        required
                      >
                        <select
                          className={
                            CONTROL_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            setSelectedSpecialty(
                              event.target.value,
                            );

                            setSelectedDoctorId(
                              "",
                            );

                            setAppointmentPrepared(
                              false,
                            );
                          }}
                          value={
                            selectedSpecialty
                          }
                        >
                          <option value="">
                            Select specialty first
                          </option>

                          {availableSpecialties.map(
                            (specialty) => (
                              <option
                                key={
                                  specialty
                                }
                                value={
                                  specialty
                                }
                              >
                                {specialty}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>

                      <Field
                        label="Doctor"
                        required
                      >
                        <select
                          className={
                            CONTROL_CLASS_NAME
                          }
                          disabled={
                            selectedSpecialty ===
                            ""
                          }
                          onChange={(
                            event,
                          ) => {
                            setSelectedDoctorId(
                              event.target.value,
                            );
                            setSelectedServiceIds([]);

                            setAppointmentPrepared(
                              false,
                            );
                          }}
                          value={
                            selectedDoctorId
                          }
                        >
                          <option value="">
                            {selectedSpecialty ===
                            ""
                              ? "Select specialty first"
                              : "Select doctor"}
                          </option>

                          {/* Name only: the fee comes from the selected service
                              and is shown by the billing calculator. */}
                          {filteredDoctors.map(
                            (doctor) => (
                              <option
                                key={
                                  doctor.id
                                }
                                value={
                                  doctor.id
                                }
                              >
                                {doctor.name}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>
                    </div>
                  ) : null}

                  {visitPurpose ===
                  "OPD Walk-in" ? (
                    <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
                      <Field
                        label="Specialty / Department"
                        required
                      >
                        <select
                          className={
                            CONTROL_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            setSelectedSpecialty(
                              event.target.value,
                            );

                            setSelectedDoctorId("");
                            setPaymentConfirmed(false);
                            setAppointmentPrepared(false);
                          }}
                          value={selectedSpecialty}
                        >
                          <option value="">
                            Select specialty
                          </option>

                          {availableSpecialties.map(
                            (specialty) => (
                              <option
                                key={specialty}
                                value={specialty}
                              >
                                {specialty}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>

                      <Field label="Doctor" required>
                        <select
                          className={CONTROL_CLASS_NAME}
                          disabled={selectedSpecialty === ""}
                          onChange={(event) => {
                            setSelectedDoctorId(
                              event.target.value,
                            );
                            setPaymentConfirmed(false);
                            setAppointmentPrepared(false);
                          }}
                          value={selectedDoctorId}
                        >
                          <option value="">
                            {selectedSpecialty === ""
                              ? "Select specialty first"
                              : "Select doctor"}
                          </option>

                          {/* The fee belongs to the chosen service, shown in the
                              next field and the billing calculator, so the
                              doctor is listed by name alone. */}
                          {filteredDoctors.map(
                            (doctor) => (
                              <option
                                key={doctor.id}
                                value={doctor.id}
                              >
                                {doctor.name}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>

                      <Field label="Doctor service" required>
                        <select
                          className={CONTROL_CLASS_NAME}
                          disabled={selectedDoctor === null}
                          onChange={(event) => {
                            setSelectedServiceIds(event.target.value ? [event.target.value] : []);
                            setPaymentConfirmed(false);
                            setAppointmentPrepared(false);
                          }}
                          value={selectedConsultationService?.id ?? ""}
                        >
                          <option value="">
                            {selectedDoctor === null ? "Select doctor first" : doctorServices.length ? "Select service" : "No services configured"}
                          </option>
                          {doctorServices.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name} - {formatMoney(service.price)}
                            </option>
                          ))}
                        </select>
                      </Field>

                      {selectedDoctor !== null ? (
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 lg:col-span-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[9px] font-black uppercase tracking-[0.08em] text-indigo-500">
                                Selected Consultation
                              </div>

                              <div className="mt-1 text-[11px] font-black text-indigo-950">
                                {selectedConsultationService?.name ?? "Select a service"}
                                {" with "}
                                {selectedDoctor.name}
                              </div>
                            </div>

                            <div className="flex items-center gap-5 text-right">
                              <div>
                                <div className="text-[8px] font-bold text-indigo-500">Sitting Room</div>
                                <div className="mt-1 text-[11px] font-black text-indigo-900">
                                  {selectedDoctorSitting?.roomLabel ?? "Not assigned"}
                                </div>
                                <div className={`mt-0.5 text-[8px] font-bold ${selectedDoctorSitting?.status === "available" ? "text-emerald-600" : "text-slate-500"}`}>
                                  {selectedDoctorSitting?.status === "available" ? "Available now" : selectedDoctorSitting ? selectedDoctorSitting.status.replaceAll("-", " ") : "No sitting"}
                                </div>
                              </div>
                              <div>
                              <div className="text-[8px] font-bold text-indigo-500">
                                Consultation Fee
                              </div>

                              <div className="mt-1 text-[13px] font-black text-indigo-800">
                                {formatMoney(
                                  consultationFee,
                                )}
                              </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {visitPurpose ===
                    "OPD Walk-in" ||
                  visitPurpose ===
                    "Scheduled Appointment" ||
                  visitPurpose ===
                    "Follow-up" ? (
                    <div className="mt-2">
                      <Field
                        label="Symptoms / Reason for Consultation"
                        required
                      >
                        <textarea
                          className={TEXTAREA_CLASS_NAME}
                          maxLength={300}
                          onChange={(event) => {
                            setConsultationReason(
                              event.target.value,
                            );
                            setAppointmentPrepared(false);
                            setActionError("");
                          }}
                          placeholder="Briefly enter the patient’s complaint or reason for seeing the doctor"
                          value={consultationReason}
                        />
                      </Field>

                      <div className="mt-1 text-right text-[8px] font-semibold text-slate-400">
                        {consultationReason.length}/300
                      </div>
                    </div>
                  ) : null}
                  {requiresDoctorRouting &&
                  selectedDoctor !== null &&
                  (visitPurpose === "OPD Walk-in" ||
                    visitPurpose === "Scheduled Appointment" ||
                    visitPurpose === "Follow-up") ? (
                    <div className="mt-3 rounded-2xl border border-indigo-100 bg-white p-3.5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                            <CalendarDays className="h-4 w-4 text-indigo-600" />
                            <span>Doctor Schedule & Available Time Slots</span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            Choose an appointment date to view real-time available time slots computed from the doctor&apos;s hospital stay.
                          </p>
                        </div>

                        {/* Date selection shortcuts & picker */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAppointmentDate(getToday());
                              setSelectedSlot(null);
                            }}
                            className={`h-7 px-2.5 rounded-lg text-[10px] font-extrabold transition ${
                              appointmentDate === getToday()
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAppointmentDate(tomorrowDateString);
                              setSelectedSlot(null);
                            }}
                            className={`h-7 px-2.5 rounded-lg text-[10px] font-extrabold transition ${
                              appointmentDate === tomorrowDateString
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            Tomorrow
                          </button>
                          <input
                            type="date"
                            min={getToday()}
                            value={appointmentDate}
                            onChange={(event) => {
                              setAppointmentDate(event.target.value);
                              setSelectedSlot(null);
                            }}
                            className="h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Doctor Stay Timing & Slot Metrics Summary */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-[10px]">
                        <div className="flex flex-wrap items-center gap-3">
                          <div>
                            <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block">Doctor Timing</span>
                            <span className="font-black text-indigo-950">
                              {slotResult?.doctorTimingLabel ?? (availableSlots.length > 0 ? "09:00 AM – 05:00 PM (8.0 hrs)" : "Not scheduled")}
                            </span>
                          </div>
                          <div className="h-6 w-px bg-slate-200" />
                          <div>
                            <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block">Time Per Patient</span>
                            <span className="font-black text-indigo-900">
                              {selectedConsultationService?.durationMinutes || slotResult?.slotMinutes || 20} mins / service
                            </span>
                          </div>
                          <div className="h-6 w-px bg-slate-200" />
                          <div>
                            <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block">Max Capacity</span>
                            <span className="font-black text-slate-700">
                              {slotResult?.maxSlots ?? availableSlots.length} Total Slots
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 font-black text-emerald-800 text-[9px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {availableSlots.filter((s) => s.available).length} Available
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 font-bold text-slate-600 text-[9px]">
                            {availableSlots.filter((s) => !s.available).length} Booked
                          </span>
                        </div>
                      </div>

                      {/* Selected slot banner if any */}
                      {selectedSlot ? (
                        <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/80 px-3 py-1.5 text-xs text-emerald-900">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="font-black">Selected Slot: {selectedSlot.label}</span>
                            {selectedSlot.roomLabel ? (
                              <span className="rounded bg-emerald-200/70 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800">
                                Room: {selectedSlot.roomLabel}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSlot(null);
                              setAppointmentTime("");
                            }}
                            className="text-[10px] font-bold text-emerald-700 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      ) : null}

                      {/* Slots Grid */}
                      <div className="mt-2.5">
                        {isLoadingSlots ? (
                          <div className="flex items-center justify-center py-6 text-xs text-slate-400">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mr-2" />
                            Calculating available doctor slots...
                          </div>
                        ) : slotResult?.unavailableReason && availableSlots.length === 0 ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-center dark:border-amber-900/50 dark:bg-amber-950/40">
                            <div className="flex items-center justify-center gap-2 text-xs font-black text-amber-900 dark:text-amber-200">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                              <span>{slotResult.unavailableReason}</span>
                            </div>

                            {slotResult.rosteredDays && slotResult.rosteredDays.length > 0 ? (
                              <div className="mt-3 rounded-xl bg-white/90 p-2.5 dark:bg-slate-900/70 text-left border border-amber-200/70 dark:border-amber-900/40">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block mb-1.5 dark:text-slate-400">
                                  Doctor's Rostered Weekly Schedule:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {slotResult.rosteredDays.map((d) => (
                                    <span
                                      key={d.weekday}
                                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                                    >
                                      📅 <span className="font-black">{d.weekdayName}:</span> {d.timing}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {slotResult.nextAvailableDate ? (
                              <div className="mt-3 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppointmentDate(slotResult.nextAvailableDate!);
                                    setSelectedSlot(null);
                                    setAppointmentTime("");
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-black text-white shadow-sm hover:bg-indigo-700 transition active:scale-95 cursor-pointer"
                                >
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  Switch to Next Available Date ({slotResult.nextAvailableDate})
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : availableSlots.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
                            {availableSlots.map((slot) => {
                              const isSelected = selectedSlot?.startsAt === slot.startsAt || appointmentTime === slot.start;
                              return (
                                <button
                                  key={slot.startsAt}
                                  type="button"
                                  disabled={!slot.available}
                                  onClick={() => {
                                    setSelectedSlot(slot);
                                    setAppointmentTime(slot.start);
                                    setAppointmentPrepared(false);
                                  }}
                                  className={`relative flex flex-col items-center justify-center rounded-xl p-2 text-center transition ${
                                    isSelected
                                      ? "border-2 border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm ring-2 ring-indigo-200"
                                      : slot.available
                                      ? "border border-slate-200 bg-white text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer"
                                      : "border border-slate-100 bg-slate-100/70 text-slate-400 cursor-not-allowed opacity-60"
                                  }`}
                                >
                                  <span className="text-[11px] font-black">{slot.label}</span>
                                  <div className="mt-0.5 flex items-center gap-1">
                                    {slot.roomLabel ? (
                                      <span className="text-[8px] font-bold text-slate-400">{slot.roomLabel}</span>
                                    ) : null}
                                    <span
                                      className={`text-[8px] font-extrabold ${
                                        isSelected
                                          ? "text-indigo-700"
                                          : slot.available
                                          ? "text-emerald-600"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      {isSelected ? "Selected" : slot.available ? "Available" : "Booked"}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-xs text-slate-400">
                            No slots available for this date and doctor.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {visitPurpose ===
                  "Emergency" ? (
                    <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                      <div className="grid gap-2.5 lg:grid-cols-3">
                        <Field
                          label="Arrival Mode"
                          required
                        >
                          <select
                            className={
                              CONTROL_CLASS_NAME
                            }
                            onChange={(
                              event,
                            ) => {
                              setEmergencyArrivalMode(
                                event.target.value,
                              );
                            }}
                            value={
                              emergencyArrivalMode
                            }
                          >
                            <option>
                              Walk-in
                            </option>

                            <option>
                              Ambulance
                            </option>

                            <option>
                              Police
                            </option>

                            <option>
                              Referral
                            </option>
                          </select>
                        </Field>

                        <Field
                          label="Triage Priority"
                          required
                        >
                          <select
                            className={
                              CONTROL_CLASS_NAME
                            }
                            onChange={(
                              event,
                            ) => {
                              setTriageLevel(
                                event.target
                                  .value as
                                  TriageLevel,
                              );
                            }}
                            value={
                              triageLevel
                            }
                          >
                            <option>
                              Red
                            </option>

                            <option>
                              Orange
                            </option>

                            <option>
                              Yellow
                            </option>

                            <option>
                              Green
                            </option>
                          </select>
                        </Field>

                        <div className="flex items-end">
                          <div className="flex h-8 w-full items-center rounded-lg bg-rose-100 px-3 text-[8px] font-black text-rose-700">
                            Treatment must not wait for payment.
                          </div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <Field
                          label="Emergency Complaint"
                          required
                        >
                          <textarea
                            className={
                              TEXTAREA_CLASS_NAME
                            }
                            onChange={(
                              event,
                            ) => {
                              setEmergencyComplaint(
                                event.target.value,
                              );
                            }}
                            placeholder="Immediate complaint or emergency condition"
                            value={
                              emergencyComplaint
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 flex justify-end">
                    <button
                      className="flex h-8 min-w-[180px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-[9px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        !patientReady
                      }
                      onClick={
                        prepareAppointment
                      }
                      type="button"
                    >
                      <CalendarDays
                        size={12}
                      />

                      {prepareActionLabel}
                    </button>
                  </div>
                </div>
              </section>

              <div className="wf-secondary-panels grid gap-2.5 lg:grid-cols-2">
                <section className="wf-tests-panel flex max-h-[150px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_14px_rgba(15,23,42,0.035)]">
                  <SectionHeader
                    icon={
                      <FlaskConical
                        size={14}
                      />
                    }
                    suffix={
                      <span className="rounded-md bg-indigo-50 px-2 py-1 text-[8px] font-black text-indigo-700">
                        {
                          selectedServiceIds.length
                        }{" "}
                        selected
                      </span>
                    }
                    title="Tests & Services"
                  />

                  <div className="wf-scrollbar min-h-0 overflow-y-auto p-2.5">
                    <button
                      className={[
                        "flex min-h-[54px]",
                        "w-full items-center",
                        "gap-3 rounded-lg",
                        "border border-dashed",
                        "px-3 text-left",
                        "transition",
                        selectedServiceIds.length > 0
                          ? "border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50"
                          : "border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/40",
                      ].join(" ")}
                      disabled={!patientReady}
                      onClick={() => {
                        setServicesPickerOpen(true);
                      }}
                      type="button"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-indigo-100">
                        <FlaskConical size={14} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black text-slate-800">
                          {selectedServiceIds.length > 0
                            ? `${selectedServiceIds.length} tests or services selected`
                            : "Select tests or services"}
                        </div>

                        <div className="mt-0.5 truncate text-[8px] font-semibold text-slate-400">
                          {selectedServices.length > 0
                            ? selectedServices
                                .map(
                                  (service) =>
                                    service.name,
                                )
                                .join(", ")
                            : "Open the searchable hospital service catalogue"}
                        </div>
                      </div>

                      <div className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-[8px] font-black text-white">
                        {selectedServiceIds.length > 0
                          ? "Edit Selection"
                          : "Open Catalogue"}
                      </div>
                    </button>

                    {selectedServices.length > 0 ? (
                      <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-[8px] font-semibold text-slate-500">
                          Selected services total
                        </span>

                        <span className="text-[9px] font-black text-slate-800">
                          {formatMoney(
                            servicesTotal,
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </section>

              </div>
            </div>

            <aside
              className={[
                "wf-billing-panel",
                "self-start overflow-hidden rounded-[18px]",
                "border shadow-[0_16px_38px_rgba(30,41,59,0.09)]",
                paymentConfirmed
                  ? "wf-workflow-section-complete"
                  : "border-indigo-100",
              ].join(" ")}
            >
              <div className="wf-billing-header flex items-center justify-between px-4 py-3">
                <h2 className="text-[14px] font-black tracking-[-0.02em] text-white">
                  Billing Calculator
                </h2>

                <button
                  className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[9px] font-black text-indigo-100 transition hover:bg-white/20 hover:text-white"
                  onClick={
                    clearBill
                  }
                  type="button"
                >
                  Clear Bill
                </button>
              </div>

              <div className="p-3">
                <div className="wf-purpose-card rounded-xl px-3.5 py-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.12em] text-indigo-500">
                    Purpose of Visit
                  </div>

                  <div className="mt-1.5 text-[12px] font-black tracking-[-0.01em] text-indigo-950">
                    {visitPurpose}
                  </div>

                  <div className="mt-1 text-[9px] font-bold text-indigo-600">
                    Route: {routeDestination}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[9px] font-semibold text-slate-600">
                  <span>
                    {baseChargeLabel}
                  </span>

                  <span className="font-black text-slate-900">
                    {formatMoney(
                      baseCharge,
                    )}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-slate-600">
                      Services / Tests
                    </span>

                    <button
                      className="flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-[8px] font-black text-indigo-600"
                      onClick={() => {
                        setAddItemOpen(
                          true,
                        );
                      }}
                      type="button"
                    >
                      <Plus
                        size={9}
                      />

                      Add Item
                    </button>
                  </div>

                  <div className="mt-2 max-h-[116px] space-y-1.5 overflow-y-auto">
                    {billingItems.length >
                    0 ? (
                      billingItems.map(
                        (item) => (
                          <div
                            className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5"
                            key={
                              item.id
                            }
                          >
                            <div className="min-w-0 flex-1 truncate text-[8px] font-bold text-slate-700">
                              {
                                item.name
                              }
                            </div>

                            <div className="shrink-0 text-[8px] font-black text-slate-700">
                              {formatMoney(
                                item.price,
                              )}
                            </div>

                            <button
                              aria-label={`Remove ${item.name}`}
                              className="flex h-4 w-4 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => {
                                removeBillingItem(
                                  item,
                                );
                              }}
                              type="button"
                            >
                              <X
                                size={9}
                              />
                            </button>
                          </div>
                        ),
                      )
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-[8px] font-semibold text-slate-400">
                        No additional services
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 text-[9px] font-semibold text-slate-600">
                    Discount
                  </div>

                  <div className="grid grid-cols-[64px_1fr] gap-2">
                    <select
                      className={
                        CONTROL_CLASS_NAME
                      }
                      onChange={(
                        event,
                      ) => {
                        setDiscountMode(
                          event.target
                            .value as
                            DiscountMode,
                        );

                        setPaymentConfirmed(
                          false,
                        );
                      }}
                      value={
                        discountMode
                      }
                    >
                      <option value="percent">
                        %
                      </option>

                      <option value="fixed">
                        PKR
                      </option>
                    </select>

                    <input
                      className={
                        CONTROL_CLASS_NAME
                      }
                      min="0"
                      onChange={(
                        event,
                      ) => {
                        setDiscountInput(
                          event.target
                            .value,
                        );

                        setPaymentConfirmed(
                          false,
                        );

                        setActionError("");
                      }}
                      placeholder="Enter discount"
                      type="number"
                      value={
                        discountInput
                      }
                    />
                  </div>
                </div>

                <div className="wf-billing-totals mt-3 space-y-2.5">
                  <BillingRow
                    label="Subtotal"
                    value={formatMoney(
                      subtotal,
                    )}
                  />

                  <BillingRow
                    label="Discount"
                    success
                    value={`- ${formatMoney(
                      calculatedDiscount,
                    )}`}
                  />

                  <BillingRow
                    label="Total Payable"
                    strong
                    value={formatMoney(
                      totalPayable,
                    )}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Field label="Payment Method">
                    <select
                      className={
                        CONTROL_CLASS_NAME
                      }
                      onChange={(
                        event,
                      ) => {
                        const method =
                          event.target
                            .value;

                        setPaymentMethod(
                          method,
                        );

                        setPaymentConfirmed(
                          false,
                        );

                        setActionError("");

                        if (
                          method ===
                          "Unpaid"
                        ) {
                          setAmountReceived(
                            "0",
                          );
                        } else {
                          setAmountReceived(
                            "",
                          );
                        }
                      }}
                      value={
                        paymentMethod
                      }
                    >
                      <option value="">
                        Select
                      </option>

                      <option value="Cash">
                        Cash
                      </option>

                      <option value="Card">
                        Card
                      </option>

                      <option value="Bank Transfer">
                        Bank Transfer
                      </option>

                      <option value="Unpaid">
                        Unpaid
                      </option>
                    </select>
                  </Field>

                  <Field label="Amount Received">
                    <input
                      className={
                        CONTROL_CLASS_NAME
                      }
                      disabled={
                        paymentMethod === "" ||
                        paymentMethod === "Unpaid"
                      }
                      min="0"
                      onChange={(
                        event,
                      ) => {
                        setAmountReceived(
                          event.target
                            .value,
                        );

                        setPaymentConfirmed(
                          false,
                        );

                        setActionError("");
                      }}
                      placeholder="Enter amount"
                      type="number"
                      value={
                        amountReceived
                      }
                    />
                  </Field>
                </div>

                <div className="mt-2 flex items-center justify-between text-[9px] font-semibold text-slate-600">
                  <span>
                    {balance > 0
                      ? "Balance"
                      : "Change"}
                  </span>

                  <span
                    className={
                      balance > 0
                        ? "font-black text-rose-500"
                        : "font-black text-emerald-600"
                    }
                  >
                    {formatMoney(
                      balance > 0
                        ? balance
                        : change,
                    )}
                  </span>
                </div>

                <div className="mt-2">
                  <Field label="Billing Note">
                    <textarea
                      className={
                        TEXTAREA_CLASS_NAME
                      }
                      onChange={(
                        event,
                      ) => {
                        setBillingNotes(
                          event.target
                            .value,
                        );
                      }}
                      placeholder="Optional billing note"
                      value={
                        billingNotes
                      }
                    />
                  </Field>
                </div>

                {actionError !==
                "" ? (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[8px] font-bold leading-4 text-rose-700">
                    <AlertTriangle
                      className="mt-0.5 shrink-0"
                      size={10}
                    />

                    {actionError}
                  </div>
                ) : null}

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={[
                      "flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2",
                      "text-[9px]",
                      "font-black transition",
                      purposeReady &&
                      paymentConfirmed
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400",
                    ].join(" ")}
                    disabled={
                      !purposeReady ||
                      !paymentConfirmed
                    }
                    onClick={() => {
                      void printVisitTokenReceipt("thermal");
                    }}
                    title="Print 80mm roll receipt"
                    type="button"
                  >
                    <Printer size={12} />

                    Thermal (80mm)
                  </button>

                  <button
                    className={[
                      "flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2",
                      "text-[9px]",
                      "font-black transition",
                      purposeReady &&
                      paymentConfirmed
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400",
                    ].join(" ")}
                    disabled={
                      !purposeReady ||
                      !paymentConfirmed
                    }
                    onClick={() => {
                      void printVisitTokenReceipt("pdf");
                    }}
                    title="Print letterhead slip or save as PDF"
                    type="button"
                  >
                    <FileText size={12} />

                    Slip (PDF)
                  </button>
                </div>

                <button
                  className={[
                    "mt-2 flex h-9",
                    "w-full items-center",
                    "justify-center gap-2",
                    "rounded-lg text-[9px]",
                    "font-black transition",
                    paymentConfirmed
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "bg-slate-900 text-white hover:bg-slate-800",
                  ].join(" ")}
                  onClick={confirmPayment}
                  type="button"
                >
                  <CheckCircle2 size={13} />

                  {paymentConfirmed
                    ? "Payment Confirmed"
                    : paymentMethod ===
                        "Unpaid"
                      ? "Confirm Unpaid Status"
                      : "Confirm Payment"}
                </button>

                <button
                  className={[
                    "mt-2 flex h-10",
                    "w-full items-center",
                    "justify-center gap-2",
                    "rounded-lg text-[10px]",
                    "font-black text-white",
                    "shadow-[0_10px_22px_rgba(91,61,245,0.22)]",
                    purposeReady &&
                    paymentConfirmed
                      ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 shadow-[0_10px_24px_rgba(91,61,245,0.25)] hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700"
                      : "cursor-not-allowed bg-slate-400",
                  ].join(" ")}
                  disabled={
                    !purposeReady ||
                    !paymentConfirmed ||
                    isBookingLive
                  }
                  onClick={() => {
                    void confirmAndSend();
                  }}
                  type="button"
                >
                  <Send
                    size={13}
                  />

                  {isBookingLive ? "Booking…" : finalActionLabel}
                </button>
                {requiresDoctorRouting && slotResult?.unavailableReason && availableSlots.length === 0 ? (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[9px] font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
                    ⚠️ {slotResult.unavailableReason}
                  </p>
                ) : null}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {addItemOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]">
          <button
            aria-label="Close add item"
            className="absolute inset-0"
            onClick={() => {
              setAddItemOpen(
                false,
              );
            }}
            type="button"
          />

          <section className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950">
                Add Billing Item
              </h2>

              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400"
                onClick={() => {
                  setAddItemOpen(
                    false,
                  );
                }}
                type="button"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <Field
                label="Item Name"
                required
              >
                <input
                  className={
                    CONTROL_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    setCustomItemName(
                      event.target
                        .value,
                    );
                  }}
                  value={
                    customItemName
                  }
                />
              </Field>

              <Field
                label="Price"
                required
              >
                <input
                  className={
                    CONTROL_CLASS_NAME
                  }
                  min="1"
                  onChange={(
                    event,
                  ) => {
                    setCustomItemPrice(
                      event.target
                        .value,
                    );
                  }}
                  type="number"
                  value={
                    customItemPrice
                  }
                />
              </Field>

              <button
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-[10px] font-black text-white hover:bg-indigo-700"
                onClick={
                  addCustomBillingItem
                }
                type="button"
              >
                <Plus size={13} />

                Add to Bill
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {servicesPickerOpen ? (
        <div className="fixed inset-0 z-[135] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]">
          <button
            aria-label="Close service catalogue"
            className="absolute inset-0"
            onClick={() => {
              setServicesPickerOpen(false);
            }}
            type="button"
          />

          <section className="relative flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/70 to-violet-50/70 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FlaskConical size={16} />
                </div>

                <div>
                  <h2 className="text-[16px] font-black tracking-[-0.025em] text-slate-950">
                    Tests & Services Catalogue
                  </h2>

                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    Search the complete hospital catalogue and select services for this visit.
                  </p>
                </div>
              </div>

              <button
                aria-label="Close service catalogue"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                onClick={() => {
                  setServicesPickerOpen(false);
                }}
                type="button"
              >
                <X size={14} />
              </button>
            </header>

            <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400"
                  size={16}
                />

                <input
                  autoFocus
                  className="h-11 w-full rounded-xl border border-indigo-200 bg-white pl-10 pr-10 text-[12px] font-semibold text-slate-900 shadow-sm outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) => {
                    setServiceSearch(
                      event.target.value,
                    );
                  }}
                  placeholder="Search by test, service or category"
                  value={serviceSearch}
                />

                {serviceSearch !== "" ? (
                  <button
                    aria-label="Clear service search"
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => {
                      setServiceSearch("");
                    }}
                    type="button"
                  >
                    <X size={11} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="wf-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#fbfcff] p-5">
              {visibleSuggestedServices.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {visibleSuggestedServices.map(
                    (service) => {
                      const selected =
                        selectedServiceIds.includes(
                          service.id,
                        );

                      return (
                        <button
                          aria-pressed={selected}
                          className={[
                            "group relative min-h-[96px]",
                            "rounded-2xl border",
                            "p-4 text-left",
                            "transition-all duration-150",
                            selected
                              ? [
                                  "border-indigo-400",
                                  "bg-gradient-to-br",
                                  "from-indigo-50",
                                  "to-violet-50",
                                  "shadow-[0_8px_22px_rgba(79,70,229,0.12)]",
                                  "ring-1 ring-indigo-100",
                                ].join(" ")
                              : [
                                  "border-slate-200",
                                  "bg-white",
                                  "shadow-sm",
                                  "hover:-translate-y-0.5",
                                  "hover:border-indigo-300",
                                  "hover:shadow-[0_8px_22px_rgba(15,23,42,0.08)]",
                                ].join(" "),
                          ].join(" ")}
                          key={service.id}
                          onClick={() => {
                            toggleService(
                              service.id,
                            );
                          }}
                          type="button"
                        >
                          <div
                            className={[
                              "absolute right-3 top-3",
                              "flex h-5 w-5",
                              "items-center justify-center",
                              "rounded-md border",
                              "transition",
                              selected
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                : "border-slate-300 bg-white text-transparent group-hover:border-indigo-300",
                            ].join(" ")}
                          >
                            <Check size={12} />
                          </div>

                          <div className="pr-7 text-[11px] font-black leading-4 text-indigo-800">
                            {service.name}
                          </div>

                          <div className="mt-4 flex items-end justify-between gap-3">
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[8px] font-black text-slate-500">
                              {service.category}
                            </span>

                            <span className="shrink-0 text-[10px] font-black text-slate-800">
                              {formatMoney(
                                service.price,
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                  <FlaskConical
                    className="mx-auto text-slate-300"
                    size={22}
                  />

                  <div className="mt-2 text-[10px] font-black text-slate-600">
                    No matching service found
                  </div>
                </div>
              )}
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/50 to-violet-50/50 px-6 py-4">
              <div>
                <div className="text-[9px] font-black text-slate-800">
                  {selectedServiceIds.length}{" "}
                  selected
                </div>

                <div className="mt-0.5 text-[8px] font-semibold text-slate-500">
                  Total:{" "}
                  {formatMoney(
                    servicesTotal,
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedServiceIds.length > 0 ? (
                  <button
                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-black text-slate-600 hover:bg-slate-100"
                    onClick={() => {
                      setSelectedServiceIds([]);
                      setPaymentConfirmed(false);
                    }}
                    type="button"
                  >
                    Clear
                  </button>
                ) : null}

                <button
                  className="h-8 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-[9px] font-black text-white hover:from-indigo-700 hover:to-violet-700"
                  onClick={() => {
                    setServicesPickerOpen(false);
                    setServiceSearch("");
                  }}
                  type="button"
                >
                  Done
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      {confirmationOpen &&
      selectedPatient !== null &&
      selectedDoctor !== null ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[3px]">
          <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white">
              <CheckCircle2
                size={25}
              />

              <h2 className="mt-2 text-lg font-black">
                Visit Routed Successfully
              </h2>

              <p className="mt-1 text-[10px] text-indigo-100">
                The patient and visit details have been forwarded to {routeDestination}.
              </p>
            </div>

            <div className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <UserRound
                      className="text-indigo-600"
                      size={14}
                    />

                    <div>
                      <div className="text-[11px] font-black text-slate-950">
                        {
                          selectedPatient.fullName
                        }
                      </div>

                      <div className="text-[8px] font-bold text-indigo-600">
                        {
                          selectedPatient.mrNumber
                        }
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <BillingRow
                      label="Token Number"
                      value={issuedToken}
                    />

                    <BillingRow
                      label="Room"
                      value={issuedRoomLabel || "Not assigned"}
                    />

                    <BillingRow
                      label="Queue Position"
                      value={String(queuePosition || 1)}
                    />

                    <BillingRow
                      label="Estimated Waiting"
                      value={`${estimatedWaitMinutes} minutes`}
                    />

                    <BillingRow
                      label="Age / Gender"
                      value={`${selectedPatient.age} Y / ${selectedPatient.gender}`}
                    />

                    <BillingRow
                      label="Mobile"
                      value={
                        selectedPatient.mobile
                      }
                    />

                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <Stethoscope
                      className="text-indigo-600"
                      size={14}
                    />

                    <div>
                      <div className="text-[11px] font-black text-slate-950">
                        {
                          selectedDoctor.name
                        }
                      </div>

                      <div className="text-[8px] font-bold text-indigo-600">
                        {
                          selectedSpecialty
                        }
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <BillingRow
                      label="Purpose"
                      value={
                        visitPurpose
                      }
                    />

                    <BillingRow
                      label="Destination"
                      value={
                        routeDestination
                      }
                    />

                    {visitPurpose ===
                    "Emergency" ? (
                      <>
                        <BillingRow
                          label="Arrival Mode"
                          value={
                            emergencyArrivalMode
                          }
                        />

                        <BillingRow
                          label="Triage"
                          value={
                            triageLevel
                          }
                        />
                      </>
                    ) : null}

                    <BillingRow
                      label="Doctor Service"
                      value={selectedConsultationService?.name ?? "Not selected"}
                    />

                    <BillingRow
                      label="Date"
                      value={
                        appointmentDate
                      }
                    />

                    <BillingRow
                      label="Time"
                      value={
                        appointmentTime
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                <div className="text-[8px] font-black uppercase tracking-[0.1em] text-indigo-500">
                  Reason for Consultation
                </div>

                <p className="mt-1.5 text-[10px] font-semibold leading-5 text-indigo-950">
                  {consultationReason}
                </p>
              </div>

              <div className="mt-3 space-y-2 rounded-xl bg-indigo-50 p-3">
                <BillingRow
                  label="Services / Tests"
                  value={
                    billingItems.length ===
                    0
                      ? "None"
                      : String(
                          billingItems.length,
                        )
                  }
                />

                <BillingRow
                  label="Total Payable"
                  value={formatMoney(
                    totalPayable,
                  )}
                />

                <BillingRow
                  label="Amount Received"
                  value={formatMoney(
                    received,
                  )}
                />

                <BillingRow
                  label="Change Returned"
                  value={formatMoney(
                    change,
                  )}
                />

                <BillingRow
                  label="Remaining Balance"
                  strong
                  value={formatMoney(
                    balance,
                  )}
                />
              </div>

              {/* Patient Portal & Video Consultation Access Section */}
              <div className="mt-3 overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/80 p-3.5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="text-indigo-600" size={15} />
                    <span className="text-[11px] font-black text-slate-900">
                      Patient Portal &amp; Tele-Consultation Access
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${bookedPortalAccess?.isNewlyCreated ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"}`}>
                    <KeyRound size={10} />
                    {bookedPortalAccess?.isNewlyCreated ? "New Account Created" : "Active Portal Account"}
                  </span>
                </div>

                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-indigo-100/60 bg-white/90 p-2 text-[10px]">
                    <span className="text-[9px] font-bold text-slate-400">Login Portal URL</span>
                    <div className="mt-0.5 flex items-center justify-between gap-1 font-bold text-indigo-700">
                      <span className="truncate">/patient</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            navigator.clipboard.writeText(window.location.origin + "/patient");
                            setCopiedPortalField("portalUrl");
                            setTimeout(() => setCopiedPortalField(null), 2000);
                          }
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        title="Copy Portal Link"
                      >
                        {copiedPortalField === "portalUrl" ? <Check className="text-emerald-600" size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-indigo-100/60 bg-white/90 p-2 text-[10px]">
                    <span className="text-[9px] font-bold text-slate-400">Login Email / Username</span>
                    <div className="mt-0.5 flex items-center justify-between gap-1 font-bold text-slate-800">
                      <span className="truncate">
                        {bookedPortalAccess?.email || selectedPatient.email || `${selectedPatient.mrNumber.toLowerCase()}@patient.wonflow.com`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            navigator.clipboard.writeText(bookedPortalAccess?.email || selectedPatient.email || `${selectedPatient.mrNumber.toLowerCase()}@patient.wonflow.com`);
                            setCopiedPortalField("email");
                            setTimeout(() => setCopiedPortalField(null), 2000);
                          }
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        title="Copy Login Email"
                      >
                        {copiedPortalField === "email" ? <Check className="text-emerald-600" size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-indigo-100/60 bg-white/90 p-2 text-[10px]">
                    <span className="text-[9px] font-bold text-slate-400">Temporary Password</span>
                    <div className="mt-0.5 flex items-center justify-between gap-1 font-mono font-bold text-indigo-950">
                      <span>{bookedPortalAccess?.temporaryPassword || "Existing Account Password"}</span>
                      {bookedPortalAccess?.temporaryPassword && (
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              navigator.clipboard.writeText(bookedPortalAccess.temporaryPassword!);
                              setCopiedPortalField("password");
                              setTimeout(() => setCopiedPortalField(null), 2000);
                            }
                          }}
                          className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                          title="Copy Password"
                        >
                          {copiedPortalField === "password" ? <Check className="text-emerald-600" size={12} /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-indigo-100/60 bg-white/90 p-2 text-[10px]">
                    <span className="text-[9px] font-bold text-slate-400">Consultation Delivery</span>
                    <div className="mt-0.5 flex items-center gap-1.5 font-bold text-slate-800">
                      {consultationMode === "ONLINE" ? (
                        <span className="inline-flex items-center gap-1 text-purple-700">
                          <Video size={12} /> Online Video Consultation
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Stethoscope size={12} /> In-Person OPD Chamber
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {bookedPortalAccess?.videoCallUrl && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-200 bg-purple-50/70 p-2 text-[10px]">
                    <div className="flex items-center gap-1.5 font-bold text-purple-900">
                      <Video className="text-purple-600" size={13} />
                      <span>Video Consultation Room Link Ready</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            navigator.clipboard.writeText(window.location.origin + bookedPortalAccess.videoCallUrl!);
                            setCopiedPortalField("videoUrl");
                            setTimeout(() => setCopiedPortalField(null), 2000);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 font-bold text-purple-700 shadow-sm hover:bg-purple-100"
                      >
                        {copiedPortalField === "videoUrl" ? <Check className="text-emerald-600" size={11} /> : <Copy size={11} />}
                        <span>{copiedPortalField === "videoUrl" ? "Copied!" : "Copy Call Link"}</span>
                      </button>
                      <a
                        href={bookedPortalAccess.videoCallUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-purple-600 px-2.5 py-1 font-bold text-white shadow-sm hover:bg-purple-700"
                      >
                        <span>Open Video Room</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-[9px] text-slate-500">
                  ℹ️ Reception Handover: Share login details with the patient so they can join online video calls and download prescriptions.
                </p>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-[9px] font-black text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setConfirmationOpen(false);
                  }}
                  type="button"
                >
                  <ArrowLeft size={12} />

                  Back to Desk
                </button>

                <button
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-black text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    void printVisitTokenReceipt("thermal");
                  }}
                  type="button"
                >
                  <Printer
                    size={12}
                  />

                  Thermal (80mm)
                </button>

                <button
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-black text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    void printVisitTokenReceipt("pdf");
                  }}
                  type="button"
                >
                  <FileText
                    size={12}
                  />

                  Slip (PDF)
                </button>

                <button
                  className="flex h-9 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-[9px] font-black text-white hover:bg-indigo-700"
                  onClick={
                    resetDesk
                  }
                  type="button"
                >
                  <FileText
                    size={12}
                  />

                  Start Next Patient
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
