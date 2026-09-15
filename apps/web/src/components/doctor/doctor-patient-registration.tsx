"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileHeart,
  FileText,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { DoctorPageHeader } from "./doctor-page-header";
import { useDoctorPortalContext } from "./doctor-portal-shell";
import { useWonFlowSession } from "@/app/_providers";
import {
  printTicketSlip,
  type TicketPrintFormat,
  type TicketSlipData,
} from "@/lib/printing/token-ticket-slip";

import { apiGet } from "@/lib/api/client";
import {
  listAppointmentSlots,
  useBookAppointment,
  useCheckInAppointment,
} from "@/lib/api/appointments";
import type { AppointmentRecord, AppointmentSlot } from "@/lib/api/appointments";
import {
  listPatients,
  useRegisterPatient,
} from "@/lib/api/patients";
import type { PatientRecord, RegisterPatientInput } from "@/lib/api/patients";
import {
  calculatePatientAge,
  formatPatientCnic,
  normalizePatientCnic,
  normalizePatientPhone,
} from "@/lib/patients/registration";
import { todayLocalDate } from "@/lib/time/local-date";

interface ReceptionCatalog {
  branches: Array<{
    id: string;
    name: string;
    address?: { text?: string; city?: string } | null;
    phone?: string | null;
  }>;
  practitioners: Array<{
    id: string;
    displayName: string;
    specialtyName: string;
    primaryBranchId: string;
    departmentName?: string | null;
    consultationFee?: number;
    urgentConsultationFee?: number;
  }>;
  services: Array<{
    id: string;
    name: string;
    category: string;
    price?: number;
    doctorId?: string | null;
    branchId?: string | null;
    durationMinutes?: number;
    consultationModes?: ("IN_PERSON" | "ONLINE")[];
  }>;
}

interface DoctorServiceDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceMinorUnits: number | null;
  currencyCode: string;
  publiclyBookable: boolean;
  consultationModes: ("IN_PERSON" | "ONLINE")[];
  isActive: boolean;
  branch: { id: string; name: string } | null;
}

export interface ExtraServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
}

type BookingMode = "WALK_IN_QUEUE" | "SCHEDULED_SLOT" | "NO_BOOKING";

/**
 * Whether a catalogue service is a consultation.
 *
 * Service categories are stored inconsistently — this hospital's data holds
 * both "CONSULTATION" and "Consultation", and both "LABORATORY" and
 * "Laboratory". Every comparison on this screen was an exact `=== "CONSULTATION"`,
 * so the title-case half was invisible to the primary consultation picker while
 * simultaneously being offered as an *extra procedure* by the add-on dropdown,
 * which excluded only the upper-case spelling. Comparing case-insensitively
 * makes both lists agree about what a consultation is.
 */
const isConsultationCategory = (category: string | null | undefined): boolean =>
  (category ?? "").trim().toUpperCase() === "CONSULTATION";

function formatDobInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDobToIso(ddMmYyyy: string): string | null {
  const parts = ddMmYyyy.split("/");
  if (parts.length === 3 && parts[0]?.length === 2 && parts[1]?.length === 2 && parts[2]?.length === 4) {
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    const numDay = Number(day);
    const numMonth = Number(month);
    const numYear = Number(year);
    if (numDay >= 1 && numDay <= 31 && numMonth >= 1 && numMonth <= 12 && numYear >= 1900 && numYear <= new Date().getFullYear()) {
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

function isoToDdMmYyyy(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.slice(0, 10).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

const PK_CITIES = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Karachi",
  "Peshawar",
  "Quetta",
  "Multan",
  "Faisalabad",
];

const CHIEF_COMPLAINT_TAGS = [
  "Routine Follow-up",
  "Post-Op Review",
  "Fever & Infection",
  "Report Review",
  "Acute Pain / Discomfort",
  "General Consultation",
];

const CLINICAL_ADDON_PRESETS: Array<{ id: string; name: string; category: string; price: number }> = [
  { id: "preset-dressing", name: "Wound Dressing / Cleaning", category: "PROCEDURE", price: 800 },
  { id: "preset-suture", name: "Suture / Stitches Removal", category: "PROCEDURE", price: 1200 },
  { id: "preset-ecg", name: "Point-of-care ECG (12-Lead)", category: "DIAGNOSTIC", price: 1500 },
  { id: "preset-glucose", name: "Blood Glucose & Vital Signs", category: "DIAGNOSTIC", price: 300 },
  { id: "preset-nebulization", name: "Nebulization Session", category: "PROCEDURE", price: 600 },
  { id: "preset-injection", name: "IV / IM Injection Administration", category: "PROCEDURE", price: 500 },
  { id: "preset-nutrition", name: "Diet & Nutrition Counseling", category: "COUNSELING", price: 1000 },
  { id: "preset-catheter", name: "Catheter Flush / Care", category: "PROCEDURE", price: 1000 },
];

const INPUT_CLASS_NAME = [
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5",
  "text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400",
  "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100",
  "dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40",
].join(" ");

const SELECT_CLASS_NAME = [
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5",
  "text-sm font-medium text-slate-900 outline-none transition",
  "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100",
  "dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40",
].join(" ");

function Field({
  label,
  error,
  required,
  helperText,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
          {required ? <span className="text-rose-500">*</span> : null}
        </span>
      </div>
      {children}
      {helperText && !error ? (
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{helperText}</p>
      ) : null}
      {error ? (
        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
    </label>
  );
}

function SectionCard({
  title,
  description,
  badge,
  icon,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {icon ? (
            <span className="grid size-9 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs sm:size-10 dark:bg-indigo-950/60 dark:text-indigo-400">
              {icon}
            </span>
          ) : null}
          <div>
            <h2 className="text-sm font-black tracking-tight text-slate-950 dark:text-white sm:text-base">
              {title}
            </h2>
            {description ? (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
        </div>
        {badge ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : "The operation could not be completed.";
}

function todayDateInputValue(): string {
  return todayLocalDate();
}

/** Attach previous documents / discharge summaries */
function PreviousHistoryUpload({ patientId }: { patientId: string }) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError("");
      try {
        const form = new FormData();
        form.append("patientId", patientId);
        form.append("title", file.name);
        form.append("category", "PREVIOUS_MEDICAL_HISTORY");
        form.append("file", file);
        const response = await fetch("/api/v1/doctor/documents", {
          method: "POST",
          credentials: "same-origin",
          body: form,
        });
        const body = (await response.json()) as { error?: string; scanResult?: string };
        if (!response.ok) throw new Error(body.error ?? "The file could not be attached.");
        if (body.scanResult === "INFECTED")
          throw new Error("This file failed a security scan and was not attached.");
        setUploaded((current) => [...current, file.name]);
      } catch (cause) {
        setUploadError(readError(cause));
      } finally {
        setUploading(false);
      }
    },
    [patientId],
  );

  return (
    <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
      <div className="flex items-center gap-2">
        <FileHeart aria-hidden className="size-4 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-black text-slate-900 dark:text-white">
          Attach Previous Medical Records
        </h3>
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Discharge summary, prescription, or previous scan report.
      </p>
      {uploaded.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          {uploaded.map((name) => (
            <li className="flex items-center gap-1.5" key={name}>
              <CheckCircle2 aria-hidden className="size-3.5" />
              {name}
            </li>
          ))}
        </ul>
      ) : null}
      <label className="mt-3 flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-xs font-bold text-indigo-700 shadow-xs transition hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700">
        {uploading ? "Uploading…" : "Add PDF or Scan Photo"}
        <input
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.tiff,.heic,image/*,application/pdf"
          capture="environment"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
          type="file"
        />
      </label>
      {uploadError ? <p className="mt-2 text-xs font-bold text-rose-600">{uploadError}</p> : null}
    </div>
  );
}

export interface RegisteredResultData {
  patient: { id: string; patientNumber: string; displayName: string };
  appointment?: AppointmentRecord;
  tokenNumber?: number;
  queueEntryId?: string;
  consultationServiceName: string;
  consultationFee: number;
  extraServices: ExtraServiceItem[];
  totalCharges: number;
  priorityLabel: string;
  branchName: string;
  doctorName: string;
  doctorSpecialty: string;
  scheduleTimeDisplay: string;
  bookingMode: BookingMode;
}

export function DoctorPatientRegistration() {
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

  const { doctor, doctorId: currentDoctorId, sitting, branches: doctorBranches, reload: reloadDoctorContext } =
    useDoctorPortalContext();

  const searchParams = useSearchParams();
  const urlPatientId = searchParams?.get("patientId") ?? null;

  const defaultBranchId = sitting?.branchId || doctorBranches[0]?.id || "";

  // Search existing patient state & click-outside ref
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [existingPatient, setExistingPatient] = useState<PatientRecord | null>(null);
  const [isLoadingUrlPatient, setIsLoadingUrlPatient] = useState(false);

  // Simplified Form State (Unified Full Name, Father Name, Contact, Demographics)
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [cnicNumber, setCnicNumber] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unknown">("unknown");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dobInput, setDobInput] = useState("");
  const [estimatedAge, setEstimatedAge] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [city, setCity] = useState("Islamabad");
  const [addressLine, setAddressLine] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Booking details
  const [bookingMode, setBookingMode] = useState<BookingMode>("WALK_IN_QUEUE");
  const [selectedDoctorId, setSelectedDoctorId] = useState(currentDoctorId || "");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [consultationFeeOverride, setConsultationFeeOverride] = useState<string>("");
  const [appointmentDate, setAppointmentDate] = useState(todayDateInputValue());
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot>();
  const [consultationMode, setConsultationMode] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");
  const [visitReason, setVisitReason] = useState("");
  const [queuePriority, setQueuePriority] = useState<number>(0);

  // Extra Services & Charges State
  const [extraServices, setExtraServices] = useState<ExtraServiceItem[]>([]);
  const [selectedCatalogExtraId, setSelectedCatalogExtraId] = useState("");
  const [showCustomExtraInput, setShowCustomExtraInput] = useState(false);
  const [customExtraName, setCustomExtraName] = useState("");
  const [customExtraPrice, setCustomExtraPrice] = useState("");

  // Catalog & Slot loading
  const [catalog, setCatalog] = useState<ReceptionCatalog>();
  const [doctorServices, setDoctorServices] = useState<DoctorServiceDefinition[]>([]);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotUnavailableReason, setSlotUnavailableReason] = useState<string>();

  // Confirmation result
  const [registeredResult, setRegisteredResult] = useState<RegisteredResultData>();

  // Smoothly scroll to top upon confirmation so the full displayed token slip is in view
  useEffect(() => {
    if (registeredResult) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [registeredResult]);

  const { mutate: registerPatient, saveState: registerSaveState } = useRegisterPatient();
  const bookMutation = useBookAppointment();
  const checkInMutation = useCheckInAppointment();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [branchDefaultApplied, setBranchDefaultApplied] = useState(false);
  if (defaultBranchId && !branchId && !branchDefaultApplied) {
    setBranchDefaultApplied(true);
    setBranchId(defaultBranchId);
  }

  // Load catalog for doctor consultation services
  useEffect(() => {
    let active = true;
    /*
     * The default service is no longer chosen here.
     *
     * It used to be `s.category === "CONSULTATION" || (!s.doctorId || s.doctorId === currentDoctorId)`,
     * and `||` binds the whole thing loosely enough that the first service with
     * no doctor on it won — a lab test or a dressing could be picked as the
     * "primary consultation" and billed as one. Which service is valid depends
     * on the doctor selected further down the form, so the choice belongs with
     * that list rather than with whichever fetch happens to land first.
     */
    apiGet<ReceptionCatalog>("/api/v1/reception/catalog")
      .then((result) => {
        if (active) setCatalog(result);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentDoctorId]);

  /*
   * The signed-in doctor's own configured services and prices.
   *
   * Fetched once. This effect used to depend on `selectedServiceId` and set it,
   * so every change of the service dropdown re-requested the whole list from
   * the server — a round trip per keystroke-equivalent, and a loop waiting for
   * the response to differ.
   */
  useEffect(() => {
    let active = true;
    apiGet<{ services?: { services?: DoctorServiceDefinition[] } }>("/api/v1/doctor/services")
      .then((res) => {
        if (active && res?.services?.services) {
          setDoctorServices(res.services.services.filter((s) => s.isActive));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Live Patient Search (Auto-fill existing records)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    let active = true;
    setIsSearching(true);
    const timer = setTimeout(() => {
      listPatients({ query: searchQuery.trim(), pageSize: 8 })
        .then((res) => {
          if (active) {
            setSearchResults(res.patients);
            setIsSearchOpen(true);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setIsSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Auto-fill ALL form fields when existing patient is selected - Direct selection
  const selectExistingPatient = (p: PatientRecord) => {
    setExistingPatient(p);
    const full = `${p.givenName || ""} ${p.middleName || ""} ${p.familyName || ""}`.trim();
    setFullName(full);
    setFatherName(p.guardianData?.fatherName || p.familyName || "");
    setMobileNumber(p.phone || "");
    const cnic = p.identifiers?.find((id) => id.type === "CNIC" || id.type === "B_FORM")?.value || "";
    setCnicNumber(normalizePatientCnic(cnic));
    setGender((p.sex?.toLowerCase() as "male" | "female" | "other") || "unknown");
    if (p.dateOfBirth) {
      setDateOfBirth(p.dateOfBirth);
      setDobInput(isoToDdMmYyyy(p.dateOfBirth));
      const age = calculatePatientAge(p.dateOfBirth);
      if (age !== undefined) setEstimatedAge(String(age));
    } else {
      setDateOfBirth("");
      setDobInput("");
    }
    if (p.address?.city) setCity(p.address.city);
    if (p.address?.text) setAddressLine(p.address.text);
    if (p.guardianData?.emergencyContactName) setEmergencyContactName(p.guardianData.emergencyContactName);
    if (p.guardianData?.emergencyContactPhone) setEmergencyContactPhone(p.guardianData.emergencyContactPhone);
    if (p.consentData?.bloodGroup) setBloodGroup(p.consentData.bloodGroup);
    if (p.consentData?.notes) setNotes(p.consentData.notes);

    // If patient has address, blood group, emergency contact or notes, show the section
    if (p.address?.text || p.consentData?.bloodGroup || p.guardianData?.emergencyContactName || p.consentData?.notes) {
      setShowOptionalFields(true);
    }

    setBookingMode((current) => (current === "NO_BOOKING" ? "WALK_IN_QUEUE" : current));
    setSearchQuery("");
    setIsSearchOpen(false);
    setErrors({});
  };

  const clearExistingPatient = () => {
    setExistingPatient(null);
    setFullName("");
    setFatherName("");
    setMobileNumber("");
    setCnicNumber("");
    setGender("unknown");
    setDateOfBirth("");
    setDobInput("");
    setEstimatedAge("");
    setBloodGroup("");
    setCity("Islamabad");
    setAddressLine("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setNotes("");
    setShowOptionalFields(false);
    setExtraServices([]);
    setErrors({});
  };

  // Preload patient if patientId query param is supplied (e.g. from Patients Directory "Book Visit")
  useEffect(() => {
    if (!urlPatientId) return;
    let active = true;
    setIsLoadingUrlPatient(true);
    apiGet<{ patient: PatientRecord }>(`/api/v1/patients/${encodeURIComponent(urlPatientId)}`)
      .then((res) => {
        if (active && res.patient) {
          selectExistingPatient(res.patient);
        }
      })
      .catch(() => {
        if (active) {
          setSubmitError("Could not load requested patient record. Please search by name or MRN.");
        }
      })
      .finally(() => {
        if (active) setIsLoadingUrlPatient(false);
      });
    return () => {
      active = false;
    };
  }, [urlPatientId]);

  const estimatedAgeDisplay = useMemo(() => {
    if (dateOfBirth) {
      const age = calculatePatientAge(dateOfBirth);
      return age !== undefined ? `${age} yrs` : "";
    }
    return estimatedAge ? `${estimatedAge} yrs (est)` : "";
  }, [dateOfBirth, estimatedAge]);

  /**
   * The doctor this visit is for.
   *
   * `selectedDoctorId` is seeded from the portal context, which resolves after
   * the first render, so it is "" until the dropdown is touched. Everything
   * that needs "who is seeing this patient" reads this instead, so the form
   * behaves the same whether or not the user opened that select.
   */
  const effectiveDoctorId = selectedDoctorId || currentDoctorId;

  const selectedDoctorRecord = useMemo(() => {
    return catalog?.practitioners.find((p) => p.id === effectiveDoctorId) ?? {
      id: currentDoctorId,
      displayName: doctor?.displayName ?? "Doctor",
      specialtyName: doctor?.specialtyName ?? "Clinical Doctor",
      primaryBranchId: defaultBranchId,
      consultationFee: 3000,
    };
  }, [catalog, effectiveDoctorId, currentDoctorId, doctor, defaultBranchId]);

  /**
   * The consultation services that may be charged for the doctor actually seeing
   * the patient.
   *
   * The dropdown listed the signed-in doctor's own services *and* every
   * consultation service in the hospital, whoever it belonged to, and changing
   * the consulting doctor never revisited the choice. So the form would happily
   * sit on "Consultation — Dr Sami Tariq" with Dr Anas Anwar selected below it,
   * and bill the patient one clinician's fee for another clinician's visit.
   *
   * A service belongs here when it is the selected doctor's own, or when it is
   * a hospital consultation service tied to no doctor at all. Another doctor's
   * priced service is theirs, and is left out.
   */
  const consultationOptions = useMemo(() => {
    const options: Array<{
      id: string;
      name: string;
      price: number;
      durationMinutes: number;
      category: string;
    }> = [];

    if (effectiveDoctorId === currentDoctorId) {
      for (const svc of doctorServices) {
        options.push({
          id: svc.id,
          name: svc.name,
          price: svc.priceMinorUnits !== null ? svc.priceMinorUnits / 100 : 3000,
          durationMinutes: svc.durationMinutes,
          category: "CONSULTATION",
        });
      }
    }

    for (const svc of catalog?.services ?? []) {
      if (!isConsultationCategory(svc.category)) continue;
      if (svc.doctorId && svc.doctorId !== effectiveDoctorId) continue;
      if (options.some((option) => option.id === svc.id)) continue;
      options.push({
        id: svc.id,
        name: svc.name,
        price: svc.price ?? (selectedDoctorRecord?.consultationFee || 3000),
        durationMinutes: svc.durationMinutes || 20,
        category: svc.category,
      });
    }

    return options;
  }, [doctorServices, catalog, effectiveDoctorId, currentDoctorId, selectedDoctorRecord]);

  /*
   * Keep the chosen service valid for the chosen doctor.
   *
   * Switching the consulting doctor can take the current service out of the
   * list entirely; leaving it selected is how the mismatch above got billed.
   * Any override typed against the old service's price goes with it, because a
   * fee entered for a 4,500 consultation means nothing against a 2,000 one.
   */
  useEffect(() => {
    if (consultationOptions.length === 0) return;
    if (consultationOptions.some((option) => option.id === selectedServiceId)) return;
    setSelectedServiceId(consultationOptions[0]!.id);
    setConsultationFeeOverride("");
  }, [consultationOptions, selectedServiceId]);

  // Primary Consultation Service and Fee calculation
  const effectiveConsultationService = useMemo(() => {
    const option = consultationOptions.find((entry) => entry.id === selectedServiceId);
    if (option) return option;

    /*
     * No consultation service exists for this doctor.
     *
     * The fallback used to invent "General Clinical Consultation — PKR 3,000",
     * which put a price nobody had configured onto the patient's slip and into
     * the estimate. The visit can still be booked — a doctor should not be
     * blocked from seeing a patient because billing has not set their fee — but
     * the amount is zero and the screen says why, so the counter prices it.
     */
    return {
      id: "",
      name: "Consultation (fee not configured)",
      price: 0,
      durationMinutes: 20,
      category: "CONSULTATION",
    };
  }, [consultationOptions, selectedServiceId]);

  const hasConfiguredConsultation = consultationOptions.length > 0;

  /** The appointment length actually booked, taken from the service rather than assumed. */
  const visitDurationMinutes = effectiveConsultationService.durationMinutes || 20;

  const consultationFee = useMemo(() => {
    if (consultationFeeOverride.trim() !== "") {
      const parsed = Number(consultationFeeOverride);
      return !Number.isNaN(parsed) && parsed >= 0 ? parsed : effectiveConsultationService.price;
    }
    return effectiveConsultationService.price;
  }, [consultationFeeOverride, effectiveConsultationService]);

  const totalExtraServicesFee = useMemo(() => {
    return extraServices.reduce((sum, item) => sum + item.price, 0);
  }, [extraServices]);

  const totalCharges = useMemo(() => {
    return consultationFee + totalExtraServicesFee;
  }, [consultationFee, totalExtraServicesFee]);

  /**
   * Where the visit is booked.
   *
   * The list came from the doctor portal context, which knows only the branches
   * the *signed-in* doctor works at. Booking a colleague at their own site was
   * therefore impossible — and now that staff can hold several branches, the
   * right list is the hospital's, with the doctor's own as the fallback for a
   * context that has not loaded the catalogue yet.
   */
  const branchOptions = useMemo(() => {
    const fromCatalog = (catalog?.branches ?? []).map((branch) => ({ id: branch.id, name: branch.name }));
    if (fromCatalog.length > 0) return fromCatalog;
    return doctorBranches.map((branch) => ({ id: branch.id, name: branch.name }));
  }, [catalog, doctorBranches]);

  const effectiveBranch = useMemo(
    () => branchOptions.find((branch) => branch.id === (branchId || defaultBranchId)),
    [branchOptions, branchId, defaultBranchId],
  );

  /** A visit that is not being booked has nothing to charge for. */
  const isBookingVisit = bookingMode !== "NO_BOOKING";

  /*
   * Load the bookable slots for the chosen day.
   *
   * Sits below the service derivation because it books against the service's
   * real duration; reading `visitDurationMinutes` from above it would evaluate
   * the dependency array before the constant exists.
   */
  useEffect(() => {
    /*
     * `effectiveDoctorId`, not `selectedDoctorId`.
     *
     * `selectedDoctorId` is seeded from the portal context, which resolves
     * after the first render, so it stayed "" for any doctor who never touched
     * the dropdown — and this guard then returned early every time. Choosing
     * "Schedule Slot" showed an empty slot list forever, and the only way to
     * make slots appear was to open the doctor select and pick yourself.
     */
    if (bookingMode !== "SCHEDULED_SLOT" || !effectiveDoctorId || !branchId || !appointmentDate) {
      setSlots([]);
      setSelectedSlot(undefined);
      return;
    }
    let active = true;
    setSlotLoading(true);
    setSlotUnavailableReason(undefined);
    listAppointmentSlots({
      doctorId: effectiveDoctorId,
      branchId,
      date: appointmentDate,
      // The service's own length, not a flat 20 minutes — offering 20-minute
      // slots for a 45-minute consultation books the doctor into a double.
      durationMinutes: visitDurationMinutes,
    })
      .then((result) => {
        if (active) {
          setSlots(result.slots);
          setSlotUnavailableReason(result.unavailableReason);
          const firstAvailable = result.slots.find((s) => s.available);
          setSelectedSlot(firstAvailable);
        }
      })
      .catch((cause) => {
        if (active) setSlotUnavailableReason(readError(cause));
      })
      .finally(() => {
        if (active) setSlotLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingMode, effectiveDoctorId, branchId, appointmentDate, visitDurationMinutes]);

  // Non-consultation hospital services available for extra add-on
  const otherHospitalServices = useMemo(() => {
    if (!catalog?.services) return [];
    return catalog.services.filter(
      (s) => !isConsultationCategory(s.category) && s.id !== selectedServiceId,
    );
  }, [catalog, selectedServiceId]);

  // Toggle quick clinical preset extra service
  const togglePresetService = (preset: { id: string; name: string; category: string; price: number }) => {
    setExtraServices((prev) => {
      const exists = prev.some((p) => p.name.toLowerCase() === preset.name.toLowerCase());
      if (exists) {
        return prev.filter((p) => p.name.toLowerCase() !== preset.name.toLowerCase());
      }
      return [...prev, preset];
    });
  };

  const addCatalogServiceAsExtra = (serviceId: string) => {
    if (!serviceId) return;
    const svc = catalog?.services.find((s) => s.id === serviceId);
    if (!svc) return;
    setExtraServices((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === svc.name.toLowerCase())) return prev;
      return [
        ...prev,
        {
          id: svc.id,
          name: svc.name,
          category: svc.category,
          price: svc.price ?? 1000,
        },
      ];
    });
    setSelectedCatalogExtraId("");
  };

  const addCustomExtraService = () => {
    if (!customExtraName.trim()) return;
    const priceNum = Number(customExtraPrice) || 0;
    setExtraServices((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customExtraName.trim(),
        category: "EXTRA_SERVICE",
        price: priceNum,
      },
    ]);
    setCustomExtraName("");
    setCustomExtraPrice("");
    setShowCustomExtraInput(false);
  };

  const removeExtraService = (id: string) => {
    setExtraServices((prev) => prev.filter((p) => p.id !== id));
  };

  // High-fidelity token receipt print (Thermal 80mm & PDF Slip)
  const printTokenSlip = async (
    result: RegisteredResultData,
    format: TicketPrintFormat = "thermal",
  ) => {
    const dateStr = new Date().toLocaleDateString("en-PK", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeStr = new Date().toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const slipData: TicketSlipData = {
      hospitalName: hospitalBranding.displayName || session?.orgLabel || "Hospital Care",
      branchName: result.branchName || session?.branchLabel || "OPD & Clinical Services",
      hospitalLogoUrl: hospitalBranding.logoDataUrl,
      tokenNumber: String(result.tokenNumber ?? "01").padStart(2, "0"),
      queuePosition: result.tokenNumber ?? 1,
      priorityLabel: result.priorityLabel,
      appointmentDate: dateStr,
      appointmentTime: timeStr,
      patient: {
        fullName: result.patient.displayName,
        mrNumber: result.patient.patientNumber,
        mobile: mobileNumber || undefined,
        identityType: "CNIC",
        identityNumber: cnicNumber ? formatPatientCnic(cnicNumber) : undefined,
      },
      doctor: {
        name: result.doctorName,
        specialty: result.doctorSpecialty,
        roomLabel: sitting?.roomLabel || "Doctor Chamber",
      },
      visitPurpose: result.bookingMode === "WALK_IN_QUEUE" ? "Walk-in OPD" : "Scheduled Consultation",
      consultationReason: visitReason || undefined,
      services: [
        { name: result.consultationServiceName, price: result.consultationFee },
        ...(result.extraServices || []).map((s) => ({ name: s.name, price: s.price })),
      ],
      payment: {
        subtotal: result.totalCharges,
        discount: 0,
        totalPayable: result.totalCharges,
        amountReceived: result.totalCharges,
        changeReturned: 0,
        balance: 0,
        paymentMethod: "Cash / Counter Collection",
        status: "Paid",
      },
      portalAccess: {
        portalUrl: "/patient",
        loginIdentifier: result.patient.patientNumber,
      },
    };

    try {
      await printTicketSlip(slipData, format);
    } catch {
      // Graceful fallback
    }
  };

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitError("");
    const newErrors: Record<string, string> = {};

    // For new patients, require name, guardian, and mobile.
    // For direct existing patients, no questions asked: accept their existing records.
    if (!existingPatient) {
      if (!fullName.trim()) newErrors.fullName = "Enter patient full name.";
      if (!fatherName.trim()) newErrors.fatherName = "Enter father or guardian name.";
      if (!mobileNumber.trim() || mobileNumber.replace(/\D/g, "").length < 10) {
        newErrors.mobileNumber = "Enter a valid mobile number.";
      }
    } else if (!fullName.trim() && !existingPatient.givenName && !existingPatient.familyName) {
      newErrors.fullName = "Patient name is required.";
    }

    if (bookingMode === "SCHEDULED_SLOT" && !selectedSlot) {
      newErrors.slot = "Please select an available appointment time slot.";
      setSubmitError("Please select an available appointment time slot.");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      let patientId = existingPatient?.id;
      let patientNumber = existingPatient?.patientNumber;
      let patientDisplayName =
        fullName.trim() || `${existingPatient?.givenName || ""} ${existingPatient?.familyName || ""}`.trim() || "Patient";

      // 1. If not an existing patient, register in DB
      if (!patientId) {
        const nameParts = fullName.trim().split(/\s+/);
        const given = nameParts[0] || "Patient";
        const middle = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";
        const family = nameParts.length > 1 ? nameParts[nameParts.length - 1] : fatherName || "Patient";

        const payload: RegisterPatientInput = {
          givenName: given,
          middleName: middle || undefined,
          familyName: family,
          fatherName: fatherName || undefined,
          dateOfBirth: dateOfBirth || undefined,
          sex: gender !== "unknown" ? gender : "other",
          phone: mobileNumber.replace(/\D/g, ""),
          city: city || "Islamabad",
          addressLine: addressLine || undefined,
          bloodGroup: bloodGroup || undefined,
          emergencyContactName: emergencyContactName || undefined,
          emergencyContactPhone: emergencyContactPhone ? emergencyContactPhone.replace(/\D/g, "") : undefined,
          notes: notes || undefined,
          consentToContact: true,
          registeredVia: "doctor",
          identifiers: cnicNumber
            ? [
                {
                  type: cnicNumber.length === 13 ? "CNIC" : "B_FORM",
                  system: "https://nadra.gov.pk/cnic",
                  value: cnicNumber,
                  isPrimary: true,
                },
              ]
            : undefined,
        };

        const res = await registerPatient(payload);
        patientId = res.patient.id;
        patientNumber = res.patient.patientNumber;
        patientDisplayName = `${res.patient.givenName} ${res.patient.familyName}`.trim();
      }

      let bookedAppointment: AppointmentRecord | undefined;
      let tokenNumber: number | undefined;
      let queueEntryId: string | undefined;
      const effectiveBranchId = branchId || defaultBranchId || undefined;

      const finalReason = visitReason.trim() || effectiveConsultationService.name;

      // 2. Perform Booking
      if (bookingMode === "WALK_IN_QUEUE") {
        const now = new Date();
        const startIso = now.toISOString();
        const endIso = new Date(now.getTime() + visitDurationMinutes * 60000).toISOString();

        const bookRes = await bookMutation.mutate({
          patientId,
          doctorId: effectiveDoctorId,
          branchId: effectiveBranchId,
          serviceId: selectedServiceId || undefined,
          startsAt: startIso,
          endsAt: endIso,
          reason: finalReason,
          source: "doctor-portal",
          consultationMode,
          idempotencyKey: `walkin-${patientId}-${Date.now()}`,
        });
        bookedAppointment = bookRes.appointment;

        try {
          const checkInRes = await checkInMutation.mutate({
            appointmentId: bookRes.appointment.id,
            input: {
              queueDate: todayDateInputValue(),
              priority: queuePriority,
              notes: finalReason,
              branchId: effectiveBranchId,
            },
          });
          if (checkInRes.appointment?.tokenNumber) {
            tokenNumber = checkInRes.appointment.tokenNumber;
          }
          if (checkInRes.queueEntry && typeof checkInRes.queueEntry === "object" && "id" in checkInRes.queueEntry) {
            queueEntryId = String((checkInRes.queueEntry as { id: string }).id);
          }
        } catch {
          tokenNumber = bookRes.appointment.tokenNumber ?? 1;
        }

        reloadDoctorContext();
      } else if (bookingMode === "SCHEDULED_SLOT") {
        if (!selectedSlot) {
          throw new Error("Please select an available appointment time slot.");
        }
        const bookRes = await bookMutation.mutate({
          patientId,
          doctorId: effectiveDoctorId,
          branchId: effectiveBranchId,
          serviceId: selectedServiceId || undefined,
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.endsAt,
          reason: finalReason,
          source: "doctor-portal",
          consultationMode,
          idempotencyKey: `sched-${patientId}-${Date.now()}`,
        });
        bookedAppointment = bookRes.appointment;
        reloadDoctorContext();
      }

      setRegisteredResult({
        patient: { id: patientId, patientNumber: patientNumber || "MRN-PENDING", displayName: patientDisplayName },
        appointment: bookedAppointment,
        tokenNumber,
        queueEntryId,
        // Registering a patient without booking them a visit charges nothing,
        // so the slip must not print a consultation fee for a visit that does
        // not exist.
        consultationServiceName: isBookingVisit ? effectiveConsultationService.name : "",
        consultationFee: isBookingVisit ? consultationFee : 0,
        extraServices: isBookingVisit ? extraServices : [],
        totalCharges: isBookingVisit ? totalCharges : 0,
        priorityLabel: queuePriority === 2 ? "Urgent" : queuePriority === 1 ? "Priority" : "Normal",
        branchName: effectiveBranch?.name ?? "Main Hospital",
        doctorName: selectedDoctorRecord?.displayName ?? doctor?.displayName ?? "Attending Clinician",
        doctorSpecialty: selectedDoctorRecord?.specialtyName ?? doctor?.specialtyName ?? "Clinical Specialist",
        scheduleTimeDisplay: bookedAppointment
          ? new Date(bookedAppointment.startsAt).toLocaleDateString("en-PK", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Walk-in Queue for Today",
        bookingMode,
      });
    } catch (cause) {
      setSubmitError(readError(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm(): void {
    clearExistingPatient();
    setRegisteredResult(undefined);
    setSubmitError("");
    setVisitReason("");
    setBookingMode("WALK_IN_QUEUE");
  }

  // Render Post-Registration & Booking Slip with prominent on-screen displayable Token Slip
  if (registeredResult) {
    const { patient, tokenNumber, queueEntryId } = registeredResult;
    return (
      <div className="space-y-6 pb-12">
        <DoctorPageHeader
          description="Patient registration & appointment confirmed. Start consultation or print slip."
          eyebrow="Clinical Desk"
          icon={<UserCheck size={20} />}
          title="Registration &amp; Booking Confirmed"
        />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            {/* Displayable On-Screen Official Visit Token Slip */}
            <article className="relative overflow-hidden rounded-3xl border-2 border-indigo-200/90 bg-white shadow-xl dark:border-indigo-800/80 dark:bg-slate-900">
              {/* Slip Header */}
              <div className="bg-gradient-to-r from-[#172554] via-[#312e81] to-[#4338ca] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                      <Receipt className="size-5 text-indigo-200" />
                    </span>
                    <div>
                      <h2 className="text-base font-black tracking-tight">{registeredResult.branchName}</h2>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                        OPD Visit Token &amp; Clinical Charges Receipt
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-mono text-xs font-black uppercase text-emerald-300 ring-1 ring-emerald-400/30">
                    Confirmed
                  </span>
                </div>
              </div>

              {/*
               * The queue token, for a walk-in.
               *
               * This block printed unconditionally: a scheduled appointment and
               * a plain registration both showed "Live Queue Token Number #01",
               * because `tokenNumber ?? "01"` invented one whenever there was
               * none. A slot booking gets its time, and a registration with no
               * visit gets neither.
               */}
              {registeredResult.bookingMode === "WALK_IN_QUEUE" && tokenNumber !== undefined ? (
                <div className="border-b-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Live Queue Token Number
                  </span>
                  <div className="my-1 font-mono text-5xl font-black text-indigo-600 sm:text-6xl dark:text-indigo-400">
                    #{String(tokenNumber).padStart(2, "0")}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-wider ${
                        registeredResult.priorityLabel === "Urgent"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          : registeredResult.priorityLabel === "Priority"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                      }`}
                    >
                      <Zap className="size-3" />
                      {registeredResult.priorityLabel} Priority Order
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Walk-in Queue
                    </span>
                  </div>
                </div>
              ) : registeredResult.bookingMode === "SCHEDULED_SLOT" ? (
                <div className="border-b-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Scheduled Appointment
                  </span>
                  <div className="my-1 text-2xl font-black text-indigo-600 sm:text-3xl dark:text-indigo-400">
                    {registeredResult.scheduleTimeDisplay}
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Booked slot — no queue token is issued until check-in.
                  </span>
                </div>
              ) : (
                <div className="border-b-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Patient Record Created
                  </span>
                  <div className="my-1 font-mono text-3xl font-black text-indigo-600 sm:text-4xl dark:text-indigo-400">
                    {patient.patientNumber}
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    No visit booked — book an appointment when the patient is ready.
                  </span>
                </div>
              )}

              {/* Patient & Clinical Details Grid */}
              <div className="grid gap-3 p-5 sm:grid-cols-2 text-xs border-b border-slate-100 dark:border-slate-800">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patient Details</span>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{patient.displayName}</p>
                  <p className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">MRN: {patient.patientNumber}</p>
                  {mobileNumber ? <p className="mt-0.5 text-slate-600 dark:text-slate-300">{mobileNumber}</p> : null}
                  {cnicNumber ? <p className="font-mono text-[11px] text-slate-500">CNIC: {formatPatientCnic(cnicNumber)}</p> : null}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consulting Clinician</span>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{registeredResult.doctorName}</p>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{registeredResult.doctorSpecialty}</p>
                  <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">{registeredResult.scheduleTimeDisplay}</p>
                </div>
              </div>

              {/* Charges, only where a visit was actually booked. */}
              {registeredResult.totalCharges > 0 ? (
              <div className="p-5 bg-slate-50/40 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 mb-3">
                  <Banknote className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Clinical Services &amp; Charges Breakdown
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">{registeredResult.consultationServiceName}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      PKR {registeredResult.consultationFee.toLocaleString()}
                    </span>
                  </div>

                  {registeredResult.extraServices.map((svc) => (
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300" key={svc.id}>
                      <span>+ {svc.name}</span>
                      <span className="font-mono font-medium">PKR {svc.price.toLocaleString()}</span>
                    </div>
                  ))}

                  <div className="pt-2 mt-2 border-t border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-900 dark:text-white">Total Payable Charges:</span>
                    <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                      PKR {registeredResult.totalCharges.toLocaleString()}
                    </span>
                  </div>
                  <p className="pt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                    Present this slip at the billing counter to settle payment.
                  </p>
                </div>

                {visitReason ? (
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold">Chief Complaint:</span> {visitReason}
                  </div>
                ) : null}
              </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 p-5 bg-white border-t border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 px-6 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition hover:scale-[1.02]"
                  href={
                    queueEntryId
                      ? `/doctor/consultations?queueEntryId=${queueEntryId}`
                      : `/doctor/consultations`
                  }
                >
                  <Stethoscope className="size-4" />
                  Start Consultation Now
                </Link>

                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-4 text-xs font-black text-indigo-700 shadow-xs transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                  onClick={() => void printTokenSlip(registeredResult, "thermal")}
                  type="button"
                >
                  <Printer className="size-4 text-indigo-600 dark:text-indigo-400" />
                  Thermal (80mm)
                </button>

                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-4 text-xs font-black text-indigo-700 shadow-xs transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                  onClick={() => void printTokenSlip(registeredResult, "pdf")}
                  type="button"
                >
                  <FileText className="size-4 text-indigo-600 dark:text-indigo-400" />
                  Slip (PDF)
                </button>

                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={resetForm}
                  type="button"
                >
                  <UserPlus className="size-4 text-slate-500" />
                  Book Another Patient
                </button>

                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  href="/doctor/patients"
                >
                  <Users className="size-4 text-slate-500" />
                  Patients Directory
                </Link>
              </div>
            </article>

            <SectionCard
              description="Attach past discharge summaries, scan reports or prescriptions."
              icon={<FileHeart className="size-5" />}
              title="Attach Medical History Documents"
            >
              <PreviousHistoryUpload patientId={patient.id} />
            </SectionCard>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Patient Card
              </h4>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-indigo-600 font-black text-white shadow-md shadow-indigo-500/20">
                  {patient.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-950 dark:text-white">{patient.displayName}</p>
                  <p className="text-xs font-semibold text-slate-500">{gender} · {estimatedAgeDisplay || "Age not specified"}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">MRN:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{patient.patientNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{mobileNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Charges:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">PKR {registeredResult.totalCharges.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <DoctorPageHeader
        action={
          existingPatient ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-white hover:border-indigo-300 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300"
              onClick={clearExistingPatient}
              type="button"
            >
              <UserPlus size={14} />
              <span>Register New Patient</span>
            </button>
          ) : undefined
        }
        description={
          existingPatient
            ? `MRN: ${existingPatient.patientNumber} · Selecting services & booking OPD visit.`
            : "Search existing hospital patients to auto-fill or register a new patient with instant queue check-in."
        }
        eyebrow={existingPatient ? "Direct Patient Booking Desk" : "Clinical Registration Desk"}
        icon={existingPatient ? <CalendarPlus size={20} /> : <UserPlus size={20} />}
        title={
          existingPatient
            ? `Book Visit: ${existingPatient.givenName} ${existingPatient.familyName}`
            : "Register & Book Patient"
        }
      />

      {/* TOP SEARCH & AUTO-FILL BAR (relative z-40 overflow-visible guarantees dropdown floats above all lower cards) */}
      <div
        className="relative z-40 overflow-visible rounded-3xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-4 shadow-sm dark:border-indigo-800/60 dark:bg-slate-900"
        ref={searchContainerRef}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Search className="size-4" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                {existingPatient ? "Switch or Search Another Patient" : "Quick Search & Select Patient"}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Search existing hospital patients by Name, Phone (0300...), CNIC, or MRN.
              </p>
            </div>
          </div>

          {existingPatient ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100/90 px-3 py-1.5 dark:border-emerald-800 dark:bg-emerald-950/60">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Selected: {existingPatient.givenName} {existingPatient.familyName} ({existingPatient.patientNumber})
              </span>
              <button
                className="ml-1 rounded-md p-1 text-slate-500 hover:bg-emerald-200 dark:hover:bg-emerald-900"
                onClick={clearExistingPatient}
                title="Clear and register new"
                type="button"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative mt-3 z-40 overflow-visible">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 size-4 text-slate-400" />
            <input
              className={`${INPUT_CLASS_NAME} pl-10 pr-10`}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => {
                if (searchResults.length > 0) setIsSearchOpen(true);
              }}
              placeholder={
                existingPatient
                  ? `Search to change patient from ${existingPatient.givenName}…`
                  : "Search by patient name, phone (0300...), CNIC (35201...), or MRN..."
              }
              value={searchQuery}
            />
            {isSearching || isLoadingUrlPatient ? (
              <RefreshCw className="absolute right-3.5 size-4 animate-spin text-indigo-600" />
            ) : searchQuery ? (
              <button
                className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsSearchOpen(false);
                }}
                type="button"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {/* Autocomplete Dropdown - elevated z-50 with shadow-2xl so it always floats over lower sections */}
          {isSearchOpen && searchResults.length > 0 ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)] ring-1 ring-black/10 dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 bg-slate-50 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800">
                Found {searchResults.length} existing patient record{searchResults.length === 1 ? "" : "s"} — click to auto-fill:
              </div>
              <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {searchResults.map((p) => {
                  const pFull = `${p.givenName || ""} ${p.middleName || ""} ${p.familyName || ""}`.trim();
                  return (
                    <li key={p.id}>
                      <button
                        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40"
                        onClick={() => selectExistingPatient(p)}
                        type="button"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">{pFull}</p>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            MRN: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{p.patientNumber}</strong>
                            {p.phone ? ` · Phone: ${p.phone}` : ""}
                            {p.sex ? ` · ${p.sex}` : ""}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white shadow-xs">
                          Select Patient
                          <ArrowRight className="size-3" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* Global Error Banner */}
      {submitError ? (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="size-4 shrink-0 text-rose-600" />
          <span>{submitError}</span>
        </div>
      ) : null}

      {/* MAIN FORM GRID (relative z-10 ensures search dropdown at z-40 stays completely on top) */}
      <form className="relative z-10" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            {/* 1. VISIT BOOKING MODE — chosen first, because it decides whether the
                charges section below applies at all */}
            <SectionCard
              badge={existingPatient ? "Booking Details" : "Visit Action"}
              description="Choose how this patient's consultation is scheduled or queued."
              icon={<Zap className="size-5" />}
              title={existingPatient ? "Appointment & Live Queue" : "Visit Booking Mode"}
            >
              <div className={`grid gap-3 ${existingPatient ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                <button
                  className={`flex flex-col rounded-2xl border-2 p-3.5 text-left transition ${
                    bookingMode === "WALK_IN_QUEUE"
                      ? "border-indigo-600 bg-indigo-50/80 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/60"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                  }`}
                  onClick={() => setBookingMode("WALK_IN_QUEUE")}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-7 place-items-center rounded-xl bg-indigo-600 text-white">
                      <Zap className="size-3.5" />
                    </span>
                    {bookingMode === "WALK_IN_QUEUE" ? <span className="size-2 rounded-full bg-indigo-600" /> : null}
                  </div>
                  <strong className="mt-2.5 block text-xs font-black text-slate-950 dark:text-white">
                    ⚡ Walk-in &amp; Live Queue
                  </strong>
                  <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Assigns live queue token for today.
                  </span>
                </button>

                <button
                  className={`flex flex-col rounded-2xl border-2 p-3.5 text-left transition ${
                    bookingMode === "SCHEDULED_SLOT"
                      ? "border-indigo-600 bg-indigo-50/80 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/60"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                  }`}
                  onClick={() => setBookingMode("SCHEDULED_SLOT")}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-7 place-items-center rounded-xl bg-violet-600 text-white">
                      <CalendarDays className="size-3.5" />
                    </span>
                    {bookingMode === "SCHEDULED_SLOT" ? <span className="size-2 rounded-full bg-indigo-600" /> : null}
                  </div>
                  <strong className="mt-2.5 block text-xs font-black text-slate-950 dark:text-white">
                    📅 Schedule Slot
                  </strong>
                  <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Pick specific date and sitting time.
                  </span>
                </button>

                {!existingPatient ? (
                  <button
                    className={`flex flex-col rounded-2xl border-2 p-3.5 text-left transition ${
                      bookingMode === "NO_BOOKING"
                        ? "border-indigo-600 bg-indigo-50/80 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/60"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                    onClick={() => setBookingMode("NO_BOOKING")}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-7 place-items-center rounded-xl bg-slate-600 text-white">
                        <User className="size-3.5" />
                      </span>
                      {bookingMode === "NO_BOOKING" ? <span className="size-2 rounded-full bg-indigo-600" /> : null}
                    </div>
                    <strong className="mt-2.5 block text-xs font-black text-slate-950 dark:text-white">
                      📝 Register Only
                    </strong>
                    <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      Save record without visit booking.
                    </span>
                  </button>
                ) : null}
              </div>

              {/* Live Queue Priority (if Walk-in Queue) */}
              {bookingMode === "WALK_IN_QUEUE" ? (
                <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Queue Priority:
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {queuePriority === 0 ? "Normal order" : queuePriority === 1 ? "Priority care" : "Urgent / Emergency"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      { label: "Normal (0)", val: 0 },
                      { label: "Priority (1)", val: 1 },
                      { label: "Urgent (2)", val: 2 },
                    ].map((item) => (
                      <button
                        className={`rounded-xl border py-2 text-xs font-bold transition ${
                          queuePriority === item.val
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                        key={item.val}
                        onClick={() => setQueuePriority(item.val)}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Slot and Date picker if SCHEDULED_SLOT */}
              {bookingMode === "SCHEDULED_SLOT" ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Appointment Date">
                      <input
                        className={INPUT_CLASS_NAME}
                        min={todayDateInputValue()}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        type="date"
                        value={appointmentDate}
                      />
                    </Field>

                    <Field label="Consultation Delivery Mode">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                            consultationMode === "IN_PERSON"
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                              : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                          onClick={() => setConsultationMode("IN_PERSON")}
                          type="button"
                        >
                          In-Person Clinic
                        </button>
                        <button
                          className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                            consultationMode === "ONLINE"
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                              : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                          onClick={() => setConsultationMode("ONLINE")}
                          type="button"
                        >
                          Online Video
                        </button>
                      </div>
                    </Field>
                  </div>

                  {/* Slots list */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Available Sitting Slots on {appointmentDate}:
                      </span>
                      {slotLoading ? (
                        <span className="flex items-center gap-1 text-[11px] text-indigo-600">
                          <RefreshCw className="size-3 animate-spin" /> Loading…
                        </span>
                      ) : null}
                    </div>

                    {slotUnavailableReason ? (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{slotUnavailableReason}</p>
                    ) : (
                      <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                        {slots.map((slot) => {
                          const isSelected = selectedSlot?.start === slot.start;
                          return (
                            <button
                              className={`rounded-xl border p-2 text-center transition ${
                                isSelected
                                  ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                                  : slot.available
                                  ? "border-slate-200 bg-white text-slate-800 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  : "cursor-not-allowed border-slate-100 bg-slate-100/50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/30"
                              }`}
                              disabled={!slot.available}
                              key={slot.startsAt}
                              onClick={() => setSelectedSlot(slot)}
                              type="button"
                            >
                              <span className="text-xs font-black">{slot.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* CLINICIAN & BRANCH DETAILS */}
              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-slate-800">
                <Field label="Consulting Doctor">
                  <select
                    className={SELECT_CLASS_NAME}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      // A fee typed for one clinician is not a fee for another.
                      setConsultationFeeOverride("");
                    }}
                    value={effectiveDoctorId}
                  >
                    {catalog?.practitioners.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.displayName} ({doc.specialtyName}) {doc.id === currentDoctorId ? "— You" : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Hospital Branch / Location">
                  <select
                    className={SELECT_CLASS_NAME}
                    onChange={(e) => setBranchId(e.target.value)}
                    value={branchId || defaultBranchId}
                  >
                    {branchOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Delivery Mode if in Walk-in */}
                {bookingMode === "WALK_IN_QUEUE" ? (
                  <Field label="Delivery Mode">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                          consultationMode === "IN_PERSON"
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                            : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                        onClick={() => setConsultationMode("IN_PERSON")}
                        type="button"
                      >
                        In-Person
                      </button>
                      <button
                        className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                          consultationMode === "ONLINE"
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                            : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                        onClick={() => setConsultationMode("ONLINE")}
                        type="button"
                      >
                        Online Video
                      </button>
                    </div>
                  </Field>
                ) : null}
              </div>

              {/* Chief complaint / Visit reason */}
              {bookingMode !== "NO_BOOKING" ? (
                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <Field label="Chief Complaint / Reason for Visit">
                    <input
                      className={INPUT_CLASS_NAME}
                      onChange={(e) => setVisitReason(e.target.value)}
                      placeholder="e.g. Follow-up consultation, fever, abdominal discomfort"
                      value={visitReason}
                    />
                  </Field>

                  {/* Quick complaint tags */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CHIEF_COMPLAINT_TAGS.map((tag) => (
                      <button
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                          visitReason === tag
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                        key={tag}
                        onClick={() => setVisitReason(tag)}
                        type="button"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </SectionCard>

            {/* 2. PATIENT INFORMATION SECTION (Auto-filled if existing patient, no questions asked) */}
            <SectionCard
              badge={existingPatient ? "Record Auto-filled" : "New Patient Record"}
              description={
                existingPatient
                  ? "All patient demographics are auto-filled directly from hospital records."
                  : "Essential patient demographic information."
              }
              icon={<User className="size-5" />}
              title="Patient Information"
            >
              {existingPatient ? (
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/40">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-xs font-black text-white shadow-xs">
                      {fullName.slice(0, 2).toUpperCase() || "PT"}
                    </div>
                    <div>
                      <span className="rounded bg-emerald-200/80 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                        MRN: {existingPatient.patientNumber}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {fullName}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {mobileNumber ? `Phone: ${mobileNumber} · ` : ""}
                        {gender.toUpperCase()} · {estimatedAgeDisplay || "Age TBD"}
                      </p>
                    </div>
                  </div>

                  <button
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    onClick={clearExistingPatient}
                    type="button"
                  >
                    <X className="size-3.5 text-slate-400" />
                    <span>Change Patient</span>
                  </button>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field error={errors.fullName} label="Patient Full Name" required={!existingPatient}>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
                    }}
                    placeholder="e.g. Muhammad Javaid"
                    required={!existingPatient}
                    value={fullName}
                  />
                </Field>

                <Field error={errors.fatherName} label="Father / Guardian Name" required={!existingPatient}>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => {
                      setFatherName(e.target.value);
                      if (errors.fatherName) setErrors((prev) => ({ ...prev, fatherName: "" }));
                    }}
                    placeholder="Father or legal guardian"
                    required={!existingPatient}
                    value={fatherName}
                  />
                </Field>

                <Field error={errors.mobileNumber} label="Mobile Phone Number" required={!existingPatient}>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => {
                      setMobileNumber(normalizePatientPhone(e.target.value));
                      if (errors.mobileNumber) setErrors((prev) => ({ ...prev, mobileNumber: "" }));
                    }}
                    placeholder="03001234567"
                    required={!existingPatient}
                    value={mobileNumber}
                  />
                </Field>

                <Field helperText="13 digits without dashes" label="CNIC / B-Form Number">
                  <input
                    className={INPUT_CLASS_NAME}
                    maxLength={15}
                    onChange={(e) => setCnicNumber(normalizePatientCnic(e.target.value))}
                    placeholder="XXXXX-XXXXXXX-X"
                    value={formatPatientCnic(cnicNumber)}
                  />
                </Field>

                <div>
                  <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Gender
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["male", "female", "other"] as const).map((g) => (
                      <button
                        className={`rounded-xl border py-2 text-xs font-bold capitalize transition ${
                          gender === g
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                        key={g}
                        onClick={() => setGender(g)}
                        type="button"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field helperText="Format: DD/MM/YYYY" label="Date of Birth">
                    <input
                      className={INPUT_CLASS_NAME}
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(e) => {
                        const masked = formatDobInput(e.target.value);
                        setDobInput(masked);
                        const iso = parseDobToIso(masked);
                        if (iso) {
                          setDateOfBirth(iso);
                          const age = calculatePatientAge(iso);
                          if (age !== undefined) setEstimatedAge(String(age));
                        } else if (!masked) {
                          setDateOfBirth("");
                        }
                      }}
                      placeholder="dd/mm/yyyy"
                      value={dobInput}
                    />
                  </Field>

                  <Field helperText="Auto-calculated from DOB" label="Age (Years)">
                    <input
                      className={INPUT_CLASS_NAME}
                      inputMode="numeric"
                      onChange={(e) => {
                        const ageVal = e.target.value.replace(/\D/g, "");
                        setEstimatedAge(ageVal);
                        if (ageVal && !dobInput) {
                          const calcYear = String(new Date().getFullYear() - Number(ageVal));
                          setDobInput(`01/01/${calcYear}`);
                          setDateOfBirth(`${calcYear}-01-01`);
                        }
                      }}
                      placeholder="e.g. 35"
                      value={estimatedAge}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  City:
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PK_CITIES.map((c) => (
                    <button
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        city === c
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                      key={c}
                      onClick={() => setCity(c)}
                      type="button"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                  type="button"
                >
                  {showOptionalFields ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  {showOptionalFields ? "Hide Extra Details" : "+ Add Blood Group, Address & Notes (Optional)"}
                </button>

                {showOptionalFields ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40">
                    <Field label="Blood Group">
                      <select
                        className={SELECT_CLASS_NAME}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        value={bloodGroup}
                      >
                        <option value="">Unknown / Not Tested</option>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Street Address">
                      <input
                        className={INPUT_CLASS_NAME}
                        onChange={(e) => setAddressLine(e.target.value)}
                        placeholder="House / Street / Sector"
                        value={addressLine}
                      />
                    </Field>

                    <Field label="Emergency Contact Name">
                      <input
                        className={INPUT_CLASS_NAME}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        placeholder="Next of kin name"
                        value={emergencyContactName}
                      />
                    </Field>

                    <Field label="Emergency Phone">
                      <input
                        className={INPUT_CLASS_NAME}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        placeholder="Emergency contact phone"
                        value={emergencyContactPhone}
                      />
                    </Field>

                    <div className="sm:col-span-2">
                      <Field label="Clinical Notes / Allergies">
                        <textarea
                          className={`${INPUT_CLASS_NAME} min-h-20 py-2`}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Known allergies, previous conditions, or notes"
                          value={notes}
                        />
                      </Field>
                    </div>
                  </div>
                ) : null}
              </div>
            </SectionCard>

            {/* 3. DOCTOR SERVICES, CHARGES & CLINICAL ADD-ONS
                Hidden when no visit is being booked: "Register Only" creates no
                appointment, so there is nothing for a consultation fee or a
                procedure charge to attach to. */}
            {isBookingVisit ? (
              <SectionCard
                badge="Pricing & Billing"
                description="Configure primary consultation service, fee, and any extra clinical procedures."
                icon={<Banknote className="size-5" />}
                title="Doctor Services &amp; Charges"
              >
                {/* Primary Consultation Service Selection */}
                <div className="space-y-3">
                  {!hasConfiguredConsultation ? (
                    <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        No consultation service is configured for this doctor, so this visit carries no fee
                        yet. The visit can still be booked — the billing counter will price it. Add a service
                        under Fees &amp; Services to charge it here.
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Primary Consultation Service:
                    </span>
                    <span className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-400">
                      Base Fee: PKR {consultationFee.toLocaleString()}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <select
                        className={SELECT_CLASS_NAME}
                        onChange={(e) => {
                          setSelectedServiceId(e.target.value);
                          // A fee typed against the previous service is not a
                          // fee for this one.
                          setConsultationFeeOverride("");
                        }}
                        value={selectedServiceId}
                      >
                        {consultationOptions.length === 0 ? (
                          <option value="">No consultation service configured for this doctor</option>
                        ) : null}
                        {consultationOptions.map((svc) => (
                          <option key={svc.id} value={svc.id}>
                            {svc.name} — PKR {svc.price.toLocaleString()} ({svc.durationMinutes} min)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-slate-400">PKR</span>
                        <input
                          className={`${INPUT_CLASS_NAME} pl-12`}
                          min="0"
                          onChange={(e) => setConsultationFeeOverride(e.target.value)}
                          placeholder={`Fee override (Default: ${effectiveConsultationService.price})`}
                          type="number"
                          value={consultationFeeOverride}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extra Services & Clinical Procedures Section */}
                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Extra Services &amp; Clinical Procedures
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Add extra clinical procedures, dressing, ECG, or lab orders to this visit.
                      </p>
                    </div>
                    <button
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      onClick={() => setShowCustomExtraInput(!showCustomExtraInput)}
                      type="button"
                    >
                      <Plus className="size-3.5" />
                      <span>Add Custom Service</span>
                    </button>
                  </div>

                  {/* Quick Add-on Preset Chips */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CLINICAL_ADDON_PRESETS.map((preset) => {
                      const isAdded = extraServices.some((s) => s.name.toLowerCase() === preset.name.toLowerCase());
                      return (
                        <button
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                            isAdded
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs dark:bg-indigo-950/60 dark:text-indigo-300"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                          key={preset.id}
                          onClick={() => togglePresetService(preset)}
                          type="button"
                        >
                          {isAdded ? <Check className="size-3.5 text-indigo-600" /> : <Plus className="size-3.5 text-slate-400" />}
                          <span>{preset.name}</span>
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            +PKR {preset.price.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Additional Catalog Services Dropdown */}
                  {otherHospitalServices.length > 0 ? (
                    <div className="mt-3 flex items-center gap-2">
                      <select
                        className={`${SELECT_CLASS_NAME} h-9 text-xs`}
                        onChange={(e) => {
                          setSelectedCatalogExtraId(e.target.value);
                          addCatalogServiceAsExtra(e.target.value);
                        }}
                        value={selectedCatalogExtraId}
                      >
                        <option value="">+ Add other Hospital Diagnostic / Service…</option>
                        {otherHospitalServices.map((svc) => (
                          <option key={svc.id} value={svc.id}>
                            {svc.name} ({svc.category}) — PKR {svc.price?.toLocaleString() || "1,000"}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {/* Custom Extra Service Form */}
                  {showCustomExtraInput ? (
                    <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 sm:flex-row dark:border-indigo-900/40 dark:bg-indigo-950/30">
                      <input
                        className={`${INPUT_CLASS_NAME} h-9 text-xs flex-1`}
                        onChange={(e) => setCustomExtraName(e.target.value)}
                        placeholder="Procedure / service name (e.g. Suture Removal)"
                        value={customExtraName}
                      />
                      <div className="relative flex items-center sm:w-36">
                        <span className="absolute left-3 text-xs font-bold text-slate-400">PKR</span>
                        <input
                          className={`${INPUT_CLASS_NAME} h-9 pl-11 text-xs`}
                          min="0"
                          onChange={(e) => setCustomExtraPrice(e.target.value)}
                          placeholder="Price"
                          type="number"
                          value={customExtraPrice}
                        />
                      </div>
                      <button
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                        onClick={addCustomExtraService}
                        type="button"
                      >
                        <Plus className="size-3.5" />
                        Add
                      </button>
                    </div>
                  ) : null}

                  {/* Active Added Extra Services List */}
                  {extraServices.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Selected Extra Services ({extraServices.length}):
                      </span>
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                        {extraServices.map((svc) => (
                          <div className="flex items-center justify-between px-3.5 py-2.5 text-xs" key={svc.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">{svc.name}</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {svc.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                PKR {svc.price.toLocaleString()}
                              </span>
                              <button
                                className="text-slate-400 hover:text-rose-600"
                                onClick={() => removeExtraService(svc.id)}
                                type="button"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Total Itemized Charges Summary Box */}
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
                        <CreditCard className="size-4" />
                      </span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          Total Visit Charges
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Consultation (PKR {consultationFee.toLocaleString()})
                          {extraServices.length > 0 ? ` + ${extraServices.length} extra service${extraServices.length === 1 ? "" : "s"} (PKR ${totalExtraServicesFee.toLocaleString()})` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-300">
                        PKR {totalCharges.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </SectionCard>
            ) : null}

            {/* Document attachment if existing patient */}
            {existingPatient ? (
              <SectionCard
                badge="Optional"
                description="Attach previous discharge summaries or scan reports to this visit."
                icon={<FileHeart className="size-5" />}
                title="Medical History &amp; Records"
              >
                <PreviousHistoryUpload patientId={existingPatient.id} />
              </SectionCard>
            ) : null}
          </div>

          {/* RIGHT LIVE SUMMARY & SUBMIT PANEL */}
          <aside className="space-y-4">
            <div className="sticky top-20 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Sparkles className="size-3.5 text-indigo-500" />
                  Live Booking Summary
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-black text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  {existingPatient ? "Existing Patient" : "New Patient"}
                </span>
              </div>

              {/* Avatar & Patient Name */}
              <div className="mt-4 flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-700 font-black text-white shadow-md shadow-indigo-500/20">
                  {fullName.trim() ? fullName.slice(0, 2).toUpperCase() : existingPatient ? (existingPatient.givenName?.[0] || "P") : "PT"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">
                    {fullName.trim() || (existingPatient ? `${existingPatient.givenName} ${existingPatient.familyName}` : "Patient Name")}
                  </h3>
                  <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {existingPatient
                      ? `MRN: ${existingPatient.patientNumber}`
                      : fatherName
                      ? `s/o / d/o ${fatherName}`
                      : "Guardian not entered"}
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                {gender !== "unknown" ? (
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {gender.toUpperCase()}
                  </span>
                ) : null}
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {estimatedAgeDisplay || "AGE TBD"}
                </span>
                {bloodGroup ? (
                  <span className="rounded-lg bg-rose-50 px-2 py-0.5 font-black text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                    {bloodGroup}
                  </span>
                ) : null}
              </div>

              {/* Patient Details list */}
              <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{mobileNumber || "Required"}</span>
                </div>
                {cnicNumber ? (
                  <div className="flex justify-between">
                    <span className="text-slate-500">CNIC:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatPatientCnic(cnicNumber)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {effectiveBranch?.name ?? "Main Hospital"}
                  </span>
                </div>
              </div>

              {/* Charges estimate — only when a visit is actually being booked. */}
              {isBookingVisit ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Estimated Charges
                    </span>
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                      PKR {totalCharges.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="truncate pr-2">{effectiveConsultationService.name}:</span>
                      <span className="font-mono font-bold">PKR {consultationFee.toLocaleString()}</span>
                    </div>
                    {extraServices.map((svc) => (
                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400" key={svc.id}>
                        <span className="truncate pr-2">+ {svc.name}:</span>
                        <span className="font-mono">PKR {svc.price.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="pt-1.5 mt-1 border-t border-dashed border-emerald-200 dark:border-emerald-800 flex justify-between font-black text-slate-900 dark:text-white">
                      <span>Estimated Total:</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-300">
                        PKR {totalCharges.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {/*
                   * Said plainly, because it is true: this screen books the
                   * visit, it does not raise the invoice. Only billing holds
                   * `billing.invoices.manage`, and the extra procedures picked
                   * here are printed on the slip for the counter to charge.
                   */}
                  <p className="pt-1 text-[10px] leading-4 text-emerald-800/80 dark:text-emerald-300/70">
                    Estimate only — the invoice is raised at the billing counter from this slip.
                  </p>
                </div>
              ) : null}

              {/* Booking Target Summary */}
              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                    Booking Action
                  </span>
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                    {bookingMode === "WALK_IN_QUEUE" ? "⚡ Live Token" : bookingMode === "SCHEDULED_SLOT" ? "📅 Slot" : "None"}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  {bookingMode === "WALK_IN_QUEUE"
                    ? `⚡ Walk-in Queue with ${selectedDoctorRecord?.displayName}`
                    : bookingMode === "SCHEDULED_SLOT"
                    ? `📅 ${selectedSlot?.label ?? "Select Slot"} on ${appointmentDate}`
                    : "No visit booked (Save profile only)"}
                </p>
                {visitReason ? (
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    Reason: <em>{visitReason}</em>
                  </p>
                ) : null}
              </div>

              {/* Primary Submit Button */}
              <div className="mt-5">
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-700 px-5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition hover:scale-[1.02] disabled:opacity-60"
                  disabled={isSubmitting || registerSaveState === "saving"}
                  type="submit"
                >
                  {isSubmitting ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : bookingMode === "WALK_IN_QUEUE" ? (
                    <Zap className="size-4" />
                  ) : bookingMode === "SCHEDULED_SLOT" ? (
                    <CalendarPlus className="size-4" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  {/*
                   * The label follows the booking mode for a new patient too.
                   * It was hardcoded to "Register & Book · PKR x", so choosing
                   * "Register Only" left the button promising a booking and a
                   * bill directly beneath a panel reading "No visit booked".
                   */}
                  {isSubmitting
                    ? "Processing…"
                    : bookingMode === "WALK_IN_QUEUE"
                    ? `${existingPatient ? "Issue Token" : "Register & Issue Token"} · PKR ${totalCharges.toLocaleString()}`
                    : bookingMode === "SCHEDULED_SLOT"
                    ? `${existingPatient ? "Confirm Slot" : "Register & Book Slot"} · PKR ${totalCharges.toLocaleString()}`
                    : existingPatient
                    ? "Save Record"
                    : "Register Patient"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
