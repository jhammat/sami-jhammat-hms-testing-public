"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileHeart,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Stethoscope,
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

import { apiGet } from "@/lib/api/client";
import {
  listAppointmentSlots,
  useBookAppointment,
  useCheckInAppointment,
} from "@/lib/api/appointments";
import type { AppointmentRecord, AppointmentSlot } from "@/lib/api/appointments";
import {
  checkPatientDuplicates,
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
  }>;
  services: Array<{
    id: string;
    name: string;
    category: string;
    doctorId?: string | null;
    durationMinutes?: number;
  }>;
}

type BookingMode = "WALK_IN_QUEUE" | "SCHEDULED_SLOT" | "NO_BOOKING";

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

export function DoctorPatientRegistration() {
  const { doctor, doctorId: currentDoctorId, sitting, branches: doctorBranches, reload: reloadDoctorContext } =
    useDoctorPortalContext();

  const defaultBranchId = sitting?.branchId || doctorBranches[0]?.id || "";

  // Search existing patient state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [existingPatient, setExistingPatient] = useState<PatientRecord | null>(null);

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
  const [appointmentDate, setAppointmentDate] = useState(todayDateInputValue());
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot>();
  const [consultationMode, setConsultationMode] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");
  const [visitReason, setVisitReason] = useState("");
  const [queuePriority, setQueuePriority] = useState<number>(0);

  // Catalog & Slot loading
  const [catalog, setCatalog] = useState<ReceptionCatalog>();
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotUnavailableReason, setSlotUnavailableReason] = useState<string>();

  // Confirmation result
  const [registeredResult, setRegisteredResult] = useState<{
    patient: { id: string; patientNumber: string; displayName: string };
    appointment?: AppointmentRecord;
    tokenNumber?: number;
    queueEntryId?: string;
  }>();

  const { mutate: registerPatient, saveState: registerSaveState } = useRegisterPatient();
  const bookMutation = useBookAppointment();
  const checkInMutation = useCheckInAppointment();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  /*
   * The branch defaults to the doctor's own once it is known, and only while
   * the registrar has not chosen one. Adjusting during render rather than in
   * an effect is React's documented way to derive state from a prop that
   * arrives late: it settles before the browser paints, so the select never
   * flashes empty and then fills in.
   */
  const [branchDefaultApplied, setBranchDefaultApplied] = useState(false);

  if (defaultBranchId && !branchId && !branchDefaultApplied) {
    setBranchDefaultApplied(true);
    setBranchId(defaultBranchId);
  }

  // Load catalog for doctor consultation services
  useEffect(() => {
    let active = true;
    apiGet<ReceptionCatalog>("/api/v1/reception/catalog")
      .then((result) => {
        if (active) {
          setCatalog(result);
          const defaultService = result.services.find(
            (s) => s.category === "CONSULTATION" || (!s.doctorId || s.doctorId === currentDoctorId),
          );
          if (defaultService) setSelectedServiceId(defaultService.id);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentDoctorId]);

  // Live Patient Search (Auto-fill existing records)
  /*
   * Debounced patient search.
   *
   * `set-state-in-effect` cannot distinguish "cascading render" from "clear
   * the stale list and raise the spinner before the request goes out", which
   * is all that happens here. Disabled for the block rather than line by
   * line, so the reason is stated once.
   */
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
      listPatients({ query: searchQuery.trim(), pageSize: 6 })
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
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Auto-fill when existing patient is selected
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
    setErrors({});
  };

  // Load slots when in SCHEDULED_SLOT mode
  useEffect(() => {
    if (bookingMode !== "SCHEDULED_SLOT" || !selectedDoctorId || !branchId || !appointmentDate) {
      return;
    }
    let active = true;
    setSlotLoading(true);
    setSlotUnavailableReason(undefined);
    listAppointmentSlots({
      doctorId: selectedDoctorId,
      branchId,
      date: appointmentDate,
      durationMinutes: 20,
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
  }, [bookingMode, selectedDoctorId, branchId, appointmentDate]);

  const estimatedAgeDisplay = useMemo(() => {
    if (dateOfBirth) {
      const age = calculatePatientAge(dateOfBirth);
      return age !== undefined ? `${age} yrs` : "";
    }
    return estimatedAge ? `${estimatedAge} yrs (est)` : "";
  }, [dateOfBirth, estimatedAge]);

  const selectedDoctorRecord = useMemo(() => {
    return catalog?.practitioners.find((p) => p.id === selectedDoctorId) ?? {
      id: currentDoctorId,
      displayName: doctor?.displayName ?? "Doctor",
      specialtyName: doctor?.specialtyName ?? "Clinical Doctor",
      primaryBranchId: defaultBranchId,
    };
  }, [catalog, selectedDoctorId, currentDoctorId, doctor, defaultBranchId]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitError("");
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = "Enter patient full name.";
    if (!fatherName.trim()) newErrors.fatherName = "Enter father or guardian name.";
    if (!mobileNumber.trim() || mobileNumber.replace(/\D/g, "").length < 10) {
      newErrors.mobileNumber = "Enter a valid mobile number.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      let patientId = existingPatient?.id;
      let patientNumber = existingPatient?.patientNumber;
      let patientDisplayName = fullName.trim();

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

      // 2. Perform Booking
      if (bookingMode === "WALK_IN_QUEUE") {
        const now = new Date();
        const startIso = now.toISOString();
        const endIso = new Date(now.getTime() + 20 * 60000).toISOString();

        const bookRes = await bookMutation.mutate({
          patientId,
          doctorId: selectedDoctorId || currentDoctorId,
          serviceId: selectedServiceId || undefined,
          startsAt: startIso,
          endsAt: endIso,
          reason: visitReason || notes || "Walk-in Doctor Consultation",
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
              notes: visitReason || "Walk-in Queue",
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
          doctorId: selectedDoctorId || currentDoctorId,
          serviceId: selectedServiceId || undefined,
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.endsAt,
          reason: visitReason || notes || "Scheduled Consultation",
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

  // Render Post-Registration & Booking Slip
  if (registeredResult) {
    const { patient, appointment, tokenNumber, queueEntryId } = registeredResult;
    return (
      <div className="space-y-6 pb-12">
        <DoctorPageHeader
          description="Patient registration & appointment confirmed. Start consultation or print slip."
          eyebrow="Clinical Desk"
          icon={<UserCheck size={20} />}
          title="Registration &amp; Booking Confirmed"
        />

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 p-5 shadow-[0_20px_50px_rgba(16,185,129,0.12)] sm:p-6 dark:border-emerald-500/30 dark:bg-slate-900">
              <div className="flex flex-col gap-4 border-b border-emerald-100/80 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-500/20">
                <div className="flex items-center gap-3.5">
                  <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30 sm:size-14">
                    <CheckCircle2 size={28} />
                  </span>
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      Confirmed
                    </span>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white sm:text-2xl">
                      {patient.displayName}
                    </h2>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      MRN: {patient.patientNumber}
                    </p>
                  </div>
                </div>

                {tokenNumber ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-emerald-300 bg-white px-5 py-2.5 shadow-sm dark:border-emerald-700 dark:bg-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Live Queue Token
                    </span>
                    <span className="text-2xl font-black tracking-tight text-emerald-600 sm:text-3xl dark:text-emerald-400">
                      #{String(tokenNumber).padStart(2, "0")}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Booking Summary */}
              <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-800/80">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Calendar className="size-3.5 text-indigo-500" />
                  Clinical Booking Details
                </h3>
                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Consulting Doctor:</span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedDoctorRecord?.displayName} ({selectedDoctorRecord?.specialtyName})
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Location / Branch:</span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {doctorBranches.find((b) => b.id === branchId)?.name ?? "Main Hospital"}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Schedule:</span>
                    <p className="font-bold text-indigo-700 dark:text-indigo-400">
                      {appointment
                        ? new Date(appointment.startsAt).toLocaleDateString("en-PK", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Walk-in Queue for Today"}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Status:</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {tokenNumber ? `In Live Queue (Token #${tokenNumber})` : appointment ? "Booked" : "Active Profile"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
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
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={() => window.print()}
                  type="button"
                >
                  <Printer className="size-4 text-slate-500" />
                  Print Token Slip
                </button>

                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={resetForm}
                  type="button"
                >
                  <UserPlus className="size-4 text-slate-500" />
                  Register Another Patient
                </button>

                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  href="/doctor/patients"
                >
                  <Users className="size-4 text-slate-500" />
                  Patients Directory
                </Link>
              </div>
            </section>

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
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // Fast Unified Form
  return (
    <div className="space-y-5 pb-12">
      <DoctorPageHeader
        description="Search existing hospital patients to auto-fill or register a new patient with instant queue check-in."
        eyebrow="Clinical Registration Desk"
        icon={<UserPlus size={20} />}
        title="Register &amp; Book Patient"
      />

      {/* TOP SEARCH & AUTO-FILL BAR */}
      <div className="relative rounded-3xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/80 p-4 shadow-sm backdrop-blur-md dark:border-indigo-800/60 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Search className="size-4" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                Quick Search &amp; Auto-Fill
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Search existing patients by Name, Phone, CNIC, or MRN.
              </p>
            </div>
          </div>

          {existingPatient ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-100/80 px-3 py-1.5 dark:bg-emerald-950/60">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Auto-filled: {existingPatient.givenName} {existingPatient.familyName} ({existingPatient.patientNumber})
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

        <div className="relative mt-3">
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
              placeholder="Search by patient name, phone (0300...), CNIC (35201...), or MRN..."
              value={searchQuery}
            />
            {isSearching ? (
              <RefreshCw className="absolute right-3.5 size-4 animate-spin text-indigo-600" />
            ) : searchQuery ? (
              <button
                className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                type="button"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && searchResults.length > 0 ? (
            <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
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
                          Auto-fill
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

      {/* MAIN FORM GRID */}
      <form onSubmit={(event) => void submit(event)}>
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            {/* BOOKING MODE SELECTOR FIRST (Quick & Intuitive) */}
            <SectionCard
              badge="Quick Action"
              description="Choose how to process this patient visit."
              icon={<Zap className="size-5" />}
              title="Visit Booking Mode"
            >
              <div className="grid gap-3 sm:grid-cols-3">
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
              </div>

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

                    <Field label="Consultation Mode">
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
                  </div>

                  {/* Slots list */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Available Slots on {appointmentDate}:
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
                              key={slot.start}
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

              {/* Chief complaint / Visit reason */}
              {bookingMode !== "NO_BOOKING" ? (
                <div className="mt-3">
                  <Field label="Chief Complaint / Reason for Visit">
                    <input
                      className={INPUT_CLASS_NAME}
                      onChange={(e) => setVisitReason(e.target.value)}
                      placeholder="e.g. Follow-up consultation, fever, abdominal discomfort"
                      value={visitReason}
                    />
                  </Field>
                </div>
              ) : null}
            </SectionCard>

            {/* SIMPLIFIED PATIENT DETAILS */}
            <SectionCard
              badge="Identity"
              description="Essential patient information."
              icon={<User className="size-5" />}
              title="Patient Information"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Single Full Name field */}
                <Field error={errors.fullName} label="Patient Full Name" required>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
                    }}
                    placeholder="e.g. Muhammad Javaid"
                    required
                    value={fullName}
                  />
                </Field>

                {/* Single Father / Guardian Name */}
                <Field error={errors.fatherName} label="Father / Guardian Name" required>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => {
                      setFatherName(e.target.value);
                      if (errors.fatherName) setErrors((prev) => ({ ...prev, fatherName: "" }));
                    }}
                    placeholder="Father or legal guardian"
                    required
                    value={fatherName}
                  />
                </Field>

                {/* Mobile Number */}
                <Field error={errors.mobileNumber} label="Mobile Phone Number" required>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => {
                      setMobileNumber(normalizePatientPhone(e.target.value));
                      if (errors.mobileNumber) setErrors((prev) => ({ ...prev, mobileNumber: "" }));
                    }}
                    placeholder="03001234567"
                    required
                    value={mobileNumber}
                  />
                </Field>

                {/* CNIC / B-Form */}
                <Field helperText="13 digits without dashes" label="CNIC / B-Form Number">
                  <input
                    className={INPUT_CLASS_NAME}
                    maxLength={15}
                    onChange={(e) => setCnicNumber(normalizePatientCnic(e.target.value))}
                    placeholder="XXXXX-XXXXXXX-X"
                    value={formatPatientCnic(cnicNumber)}
                  />
                </Field>

                {/* Gender quick pill selector */}
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

                {/* Date of Birth (DD/MM/YYYY) & Estimated Age */}
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

              {/* City quick pills */}
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

              {/* Collapsible Additional Details (Address, Blood Group, Emergency, Notes) */}
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                  type="button"
                >
                  {showOptionalFields ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  {showOptionalFields ? "Hide Extra Details" : "+ Add Blood Group, Address & Clinical Notes (Optional)"}
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
          </div>

          {/* RIGHT LIVE SUMMARY & SUBMIT PANEL */}
          <aside className="space-y-4">
            <div className="sticky top-20 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Sparkles className="size-3.5 text-indigo-500" />
                  Live Preview
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-black text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  {existingPatient ? "Existing Patient" : "New Patient"}
                </span>
              </div>

              {/* Avatar & Patient Name */}
              <div className="mt-4 flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-700 font-black text-white shadow-md shadow-indigo-500/20">
                  {fullName.trim() ? fullName.slice(0, 2).toUpperCase() : "PT"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">
                    {fullName.trim() || "Patient Name"}
                  </h3>
                  <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {fatherName ? `s/o / d/o ${fatherName}` : "Guardian not entered"}
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {gender.toUpperCase()}
                </span>
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
                <div className="flex justify-between">
                  <span className="text-slate-500">CNIC:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatPatientCnic(cnicNumber) || "Optional"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">City:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{city}</span>
                </div>
              </div>

              {/* Booking Target Summary (NO FEE DISPLAY) */}
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
              </div>

              {/* Primary Submit Button */}
              <div className="mt-5">
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-700 px-5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition hover:scale-[1.02] disabled:opacity-60"
                  disabled={isSubmitting || registerSaveState === "saving"}
                  type="submit"
                >
                  <UserPlus className="size-4" />
                  {isSubmitting
                    ? "Processing…"
                    : existingPatient
                    ? `Confirm Booking for ${fullName.split(" ")[0] || "Patient"}`
                    : `Register & Book Patient`}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
