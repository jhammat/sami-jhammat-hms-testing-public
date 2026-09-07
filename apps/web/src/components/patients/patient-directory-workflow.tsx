"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MockBranch } from "@wonflow/mock-data";
import { DataEmpty, DataError, DataLoading } from "@wonflow/ui";
import { useWonFlowHospitalService } from "@/app/_providers";
import { WonFlowAsyncDataBoundary, useWonFlowConfirm } from "@/components/feedback";
import { WonFlowPageHeader } from "@/components/workspace";
import { useWonFlowAsyncData } from "@/lib/data";
import { useApiResource } from "@/lib/api";
import type { ListPatientsQuery } from "@/lib/api/patients";
import {
  createInitialPatientDirectoryFilters,
  fetchDirectoryPage,
  getDemoPatientRegistrationAge,
  primeLegacyPatientDirectoryCache,
  removeDirectoryPatient,
} from "@/lib/patients";
import type {
  DemoPatientRegistrationResult,
  DirectoryPage,
  PatientDirectoryFilters,
  PatientDirectoryGenderFilter,
  PatientDirectorySort,
} from "@/lib/patients";
import { formatWonFlowDashboardDateTime } from "@/lib/dashboard";
import { updateReceptionPatient } from "@/lib/api/reception-api";

const INPUT_CLASS_NAME = [
  "h-11 w-full",
  "rounded-xl border",
  "border-slate-200 dark:border-slate-700",
  "bg-white dark:bg-slate-800/90 px-3.5",
  "text-sm text-slate-900 dark:text-slate-100",
  "outline-none transition",
  "placeholder:text-slate-400 dark:placeholder:text-slate-500",
  "focus:border-blue-500 dark:focus:border-blue-400",
  "focus:ring-2",
  "focus:ring-blue-100 dark:focus:ring-blue-900/40",
].join(" ");

function humanizeValue(value: string): string {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getGenderBadgeClass(gender: string): string {
  switch (gender.toLowerCase()) {
    case "female":
      return "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-rose-200/70 dark:ring-rose-900/50";
    case "male":
      return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-blue-200/70 dark:ring-blue-900/50";
    case "other":
      return "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 ring-violet-200/70 dark:ring-violet-900/50";
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-700";
  }
}

function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center",
        "rounded-full px-2.5 py-0.5",
        "text-[11px] font-bold",
        "ring-1",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

// -------------------------------------------------------------
// Interactive Patient Detail & Edit Pop-up Modal
// -------------------------------------------------------------
interface PatientDetailModalProps {
  patient: DemoPatientRegistrationResult;
  branchesById: ReadonlyMap<string, MockBranch>;
  initialTab?: "view" | "edit";
  onClose: () => void;
  onSaved: () => void;
  onRemove: (patient: DemoPatientRegistrationResult) => void;
}

function PatientDetailModal({
  patient,
  branchesById,
  initialTab = "view",
  onClose,
  onSaved,
  onRemove,
}: PatientDetailModalProps) {
  const [tab, setTab] = useState<"view" | "edit">(initialTab);

  // Edit form state
  const [givenName, setGivenName] = useState(
    patient.draft.givenName || patient.displayName.split(/\s+/)[0] || "",
  );
  const [middleName, setMiddleName] = useState(patient.draft.middleName || "");
  const [familyName, setFamilyName] = useState(
    patient.displayName.split(/\s+/).slice(1).join(" ") || "",
  );
  const [fatherName, setFatherName] = useState(patient.draft.fatherName || "");
  const [cnicNumber, setCnicNumber] = useState(patient.draft.cnicNumber || "");
  const [phone, setPhone] = useState(patient.draft.mobileNumber || "");
  const [email, setEmail] = useState(patient.draft.emailAddress || "");
  const [gender, setGender] = useState(patient.draft.gender || "male");
  const [dateOfBirth, setDateOfBirth] = useState(patient.draft.dateOfBirth || "");
  const [bloodGroup, setBloodGroup] = useState(patient.draft.bloodGroup || "");
  const [patientCategory, setPatientCategory] = useState<
    "self-pay" | "insurance" | "corporate" | "government" | "charity"
  >(patient.draft.patientCategory || "self-pay");
  const [addressLine, setAddressLine] = useState(patient.draft.addressLine || "");
  const [city, setCity] = useState(patient.draft.city || "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    patient.draft.emergencyContactName || "",
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    patient.draft.emergencyContactPhone || "",
  );
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(
    patient.draft.emergencyContactRelation || "",
  );
  const [notes, setNotes] = useState(patient.draft.notes || "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  const age = getDemoPatientRegistrationAge(patient);
  const branch = branchesById.get(patient.draft.branchId);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!givenName.trim()) {
      setError("Patient given / first name is required.");
      return;
    }
    setSaving(true);
    setError("");
    setSaveSuccess(false);

    try {
      await updateReceptionPatient(patient.id, {
        givenName: givenName.trim(),
        middleName: middleName.trim() || undefined,
        familyName: familyName.trim() || givenName.trim(),
        fatherName: fatherName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        sex: gender.toLowerCase(),
        dateOfBirth: dateOfBirth || undefined,
        bloodGroup: bloodGroup.trim() || undefined,
        address: { text: addressLine.trim(), city: city.trim() },
        guardianData: {
          fatherName: fatherName.trim() || undefined,
          emergencyContactName: emergencyContactName.trim() || undefined,
          emergencyContactPhone: emergencyContactPhone.trim() || undefined,
          emergencyContactRelation: emergencyContactRelation.trim() || undefined,
        },
        consentData: {
          bloodGroup: bloodGroup.trim() || undefined,
          patientCategory,
          notes: notes.trim() || undefined,
        },
        identifiers: cnicNumber.trim()
          ? [
              {
                type: "NATIONAL_ID",
                system: "pk.nadra.cnic",
                value: cnicNumber.trim(),
                isPrimary: true,
              },
            ]
          : undefined,
      });

      setSaveSuccess(true);
      onSaved();
      setTimeout(() => {
        setTab("view");
        setSaveSuccess(false);
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update patient record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_25px_70px_rgba(0,0,0,0.35)]">
        
        {/* Banner Header */}
        <div className="relative overflow-hidden bg-linear-to-r from-blue-700 via-indigo-700 to-violet-800 p-5 text-white sm:p-6">
          <div className="pointer-events-none absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[16px_16px]" />
          
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-black ring-1 ring-white/30 backdrop-blur-md shadow-inner">
                {getInitials(patient.displayName)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-black text-white sm:text-2xl">
                    {patient.displayName}
                  </h2>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black tracking-wide text-indigo-100 backdrop-blur">
                    {patient.mrNumber}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-indigo-100/90">
                  Registered {formatWonFlowDashboardDateTime(patient.registeredAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-black/25 p-1 backdrop-blur-md">
                <button
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    tab === "view"
                      ? "bg-white text-indigo-950 shadow-sm"
                      : "text-indigo-100 hover:text-white"
                  }`}
                  onClick={() => setTab("view")}
                  type="button"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span>Profile</span>
                </button>

                <button
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    tab === "edit"
                      ? "bg-white text-indigo-950 shadow-sm"
                      : "text-indigo-100 hover:text-white"
                  }`}
                  onClick={() => setTab("edit")}
                  type="button"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                    <path
                      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Edit</span>
                </button>
              </div>

              <button
                aria-label="Close dialog"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                onClick={onClose}
                type="button"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {tab === "view" ? (
            <div className="space-y-5">
              {/* Structured cards layout */}
              <div className="grid gap-4 md:grid-cols-2">
                
                {/* 1. Demographics & Identity */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span>Identity & Demographics</span>
                  </div>

                  <dl className="mt-3.5 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-[10px] font-bold text-slate-400">Father / Guardian</dt>
                      <dd className="mt-0.5 font-bold text-slate-900 dark:text-white">
                        {patient.draft.fatherName || "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-bold text-slate-400">CNIC / National ID</dt>
                      <dd className="mt-0.5 font-mono font-bold text-slate-900 dark:text-white">
                        {patient.draft.cnicNumber || "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-bold text-slate-400">Gender & Age</dt>
                      <dd className="mt-1">
                        <StatusBadge
                          className={getGenderBadgeClass(patient.draft.gender)}
                          label={`${humanizeValue(patient.draft.gender)}${age !== undefined ? ` · ${age}y` : ""}`}
                        />
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-bold text-slate-400">Blood Group</dt>
                      <dd className="mt-1">
                        {patient.draft.bloodGroup ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 text-xs font-black text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-900/50">
                            🩸 {patient.draft.bloodGroup}
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-400">Not recorded</span>
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-bold text-slate-400">Date of Birth</dt>
                      <dd className="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">
                        {patient.draft.dateOfBirth || "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-bold text-slate-400">Patient Category</dt>
                      <dd className="mt-0.5 font-bold text-blue-700 dark:text-blue-400">
                        {humanizeValue(patient.draft.patientCategory)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* 2. Contact & Location */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    <span>Contact & Location</span>
                  </div>

                  <dl className="mt-3.5 space-y-3 text-xs">
                    <div className="flex items-start justify-between">
                      <dt className="text-[10px] font-bold text-slate-400">Mobile Phone</dt>
                      <dd className="font-bold text-slate-900 dark:text-white">
                        {patient.draft.mobileNumber ? (
                          <a className="text-blue-600 hover:underline" href={`tel:${patient.draft.mobileNumber}`}>
                            {patient.draft.mobileNumber}
                          </a>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between">
                      <dt className="text-[10px] font-bold text-slate-400">Email Address</dt>
                      <dd className="font-semibold text-slate-700 dark:text-slate-300">
                        {patient.draft.emailAddress || "—"}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between">
                      <dt className="text-[10px] font-bold text-slate-400">City</dt>
                      <dd className="font-bold text-slate-800 dark:text-slate-200">
                        {patient.draft.city || "—"}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between">
                      <dt className="text-[10px] font-bold text-slate-400">Street Address</dt>
                      <dd className="max-w-[60%] text-right font-medium text-slate-700 dark:text-slate-300">
                        {patient.draft.addressLine || "—"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* 3. Emergency Contact */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    <span>Emergency Contact</span>
                  </div>

                  <dl className="mt-3.5 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between">
                      <dt className="text-[10px] font-bold text-slate-400">Contact Person</dt>
                      <dd className="font-bold text-slate-900 dark:text-white">
                        {patient.draft.emergencyContactName || "—"}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between">
                      <dt className="text-[10px] font-bold text-slate-400">Relationship</dt>
                      <dd className="font-semibold text-slate-700 dark:text-slate-300">
                        {patient.draft.emergencyContactRelation || "—"}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between">
                      <dt className="text-[10px] font-bold text-slate-400">Emergency Phone</dt>
                      <dd className="font-bold text-slate-900 dark:text-white">
                        {patient.draft.emergencyContactPhone || "—"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* 4. Branch & Hospital Profile */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <svg className="h-4 w-4 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2M13 11h2M9 15h2M13 15h2"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    <span>Hospital Enrollment</span>
                  </div>

                  <dl className="mt-3.5 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between">
                      <dt className="text-[10px] font-bold text-slate-400">Branch</dt>
                      <dd className="font-bold text-slate-900 dark:text-white">
                        {branch?.name ?? "Main Branch"}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between">
                      <dt className="text-[10px] font-bold text-slate-400">Record Status</dt>
                      <dd className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Active Live Record
                      </dd>
                    </div>

                    <div className="flex items-start justify-between">
                      <dt className="text-[10px] font-bold text-slate-400">Preferred Language</dt>
                      <dd className="font-semibold text-slate-700 dark:text-slate-300">
                        {patient.draft.preferredLanguage === "ur" ? "Urdu" : "English"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Quick Clinical Links */}
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                  Clinical & Records
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition"
                    href={`/operations/patients/${encodeURIComponent(patient.id)}/results`}
                  >
                    🧪 Laboratory Results
                  </Link>

                  <Link
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-700 dark:hover:text-violet-300 transition"
                    href={`/operations/patients/${encodeURIComponent(patient.id)}/imaging`}
                  >
                    🩻 Imaging Timeline
                  </Link>

                  <Link
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition"
                    href={`/operations/patients/${encodeURIComponent(patient.id)}/medicines`}
                  >
                    💊 Medicine History
                  </Link>

                  <Link
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition"
                    href={`/operations/patients/${encodeURIComponent(patient.id)}/billing`}
                  >
                    💳 Billing Ledger
                  </Link>

                  <Link
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
                    href={`/operations/inpatient/wards?patientId=${encodeURIComponent(patient.id)}`}
                  >
                    🏥 Admit Patient
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Edit Form */
            <form className="space-y-4" onSubmit={(e) => void handleSave(e)}>
              {error !== "" && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3 text-xs font-bold text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-900/50">
                  {error}
                </div>
              )}

              {saveSuccess && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-900/50">
                  ✓ Patient record updated successfully!
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">First / Given Name *</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setGivenName(e.target.value)}
                    required
                    type="text"
                    value={givenName}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Middle Name</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setMiddleName(e.target.value)}
                    type="text"
                    value={middleName}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Family Name</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setFamilyName(e.target.value)}
                    type="text"
                    value={familyName}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Father / Guardian Name</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Father or guardian name"
                    type="text"
                    value={fatherName}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">CNIC / National ID</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setCnicNumber(e.target.value)}
                    placeholder="35201-xxxxxxx-x"
                    type="text"
                    value={cnicNumber}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Mobile Phone</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03xx-xxxxxxx"
                    type="tel"
                    value={phone}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Gender</span>
                  <select
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setGender(e.target.value as "female" | "male" | "other" | "unknown")}
                    value={gender}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="unknown">Not Specified</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Date of Birth</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    type="date"
                    value={dateOfBirth}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Blood Group</span>
                  <select
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    value={bloodGroup}
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Patient Category</span>
                  <select
                    className={INPUT_CLASS_NAME}
                    onChange={(e) =>
                      setPatientCategory(
                        e.target.value as
                          | "self-pay"
                          | "insurance"
                          | "corporate"
                          | "government"
                          | "charity",
                      )
                    }
                    value={patientCategory}
                  >
                    <option value="self-pay">Self Pay</option>
                    <option value="insurance">Insurance</option>
                    <option value="corporate">Corporate</option>
                    <option value="government">Government / Panel</option>
                    <option value="charity">Charity / Welfare / Zakat</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@example.com"
                    type="email"
                    value={email}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Street Address</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="House, Street, Area"
                    type="text"
                    value={addressLine}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">City</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    type="text"
                    value={city}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Emergency Contact Name</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Name"
                    type="text"
                    value={emergencyContactName}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Emergency Phone</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="03xx-xxxxxxx"
                    type="tel"
                    value={emergencyContactPhone}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Relationship</span>
                  <input
                    className={INPUT_CLASS_NAME}
                    onChange={(e) => setEmergencyContactRelation(e.target.value)}
                    placeholder="Brother, Spouse, etc."
                    type="text"
                    value={emergencyContactRelation}
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  onClick={() => setTab("view")}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-black text-white shadow hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Saving Changes…" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
              onClick={() => onRemove(patient)}
              type="button"
            >
              🗑️ Delete Patient
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {tab === "view" ? (
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-4 py-2 text-xs font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                onClick={() => setTab("edit")}
                type="button"
              >
                ✏️ Edit Record
              </button>
            ) : null}

            <Link
              className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition"
              href={`/operations/reception?patientId=${encodeURIComponent(patient.id)}`}
            >
              🗓️ Book Appointment
            </Link>

            <button
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Main Patient Directory Content & Table
// -------------------------------------------------------------
interface PatientDirectoryContentProps {
  branches: readonly MockBranch[];
}

function PatientDirectoryContent({ branches }: PatientDirectoryContentProps) {
  const [filters, setFilters] = useState<PatientDirectoryFilters>(
    createInitialPatientDirectoryFilters,
  );

  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(filters.query);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filters.query]);

  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    queueMicrotask(() => {
      setPage(1);
    });
  }, [
    debouncedQuery,
    filters.gender,
    filters.minimumAge,
    filters.maximumAge,
    filters.sort,
  ]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeModalPatient, setActiveModalPatient] = useState<{
    patient: DemoPatientRegistrationResult;
    tab: "view" | "edit";
  } | null>(null);

  const [removingId, setRemovingId] = useState("");
  const [removeError, setRemoveError] = useState("");
  const { confirm, dialog: confirmDialog } = useWonFlowConfirm();

  const listQuery = useMemo<ListPatientsQuery>(
    () => ({
      query: debouncedQuery.trim() || undefined,
      gender: filters.gender === "all" ? undefined : filters.gender,
      minimumAge: filters.minimumAge.trim() === "" ? undefined : Number(filters.minimumAge),
      maximumAge: filters.maximumAge.trim() === "" ? undefined : Number(filters.maximumAge),
      sort: filters.sort,
      page,
      pageSize,
    }),
    [
      debouncedQuery,
      filters.gender,
      filters.maximumAge,
      filters.minimumAge,
      filters.sort,
      page,
    ],
  );

  const directory = useApiResource<DirectoryPage>({
    key: `patient-directory:${JSON.stringify(listQuery)}`,
    tags: ["patients"],
    fetcher: (signal) => fetchDirectoryPage(listQuery, signal),
    isEmpty: (result) => result.patients.length === 0,
  });

  const registrations = directory.data?.patients ?? [];
  const directoryData = directory.data;

  useEffect(() => {
    if (directoryData !== undefined && directoryData.patients.length > 0) {
      primeLegacyPatientDirectoryCache(directoryData.patients);
    }
  }, [directoryData]);

  const branchesById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch])),
    [branches],
  );

  function updateFilter<TField extends keyof PatientDirectoryFilters>(
    field: TField,
    value: PatientDirectoryFilters[TField],
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function clearFilters() {
    setFilters(createInitialPatientDirectoryFilters());
  }

  async function removePatient(patient: DemoPatientRegistrationResult) {
    const accepted = await confirm({
      confirmLabel: "Delete patient",
      message: `This removes ${patient.displayName} from the active patient directory. Clinical and financial history will remain stored for audit.`,
      title: `Remove ${patient.displayName}?`,
      tone: "danger",
    });

    if (!accepted) {
      return;
    }

    setRemovingId(patient.id);
    setRemoveError("");

    try {
      await removeDirectoryPatient(patient.id);
      setActiveModalPatient(null);
      directory.reload();
    } catch (error) {
      setRemoveError(
        error instanceof Error ? error.message : "Patient could not be removed.",
      );
    } finally {
      setRemovingId("");
    }
  }

  return (
    <div className="space-y-4">
      {confirmDialog}

      {/* Detail & Edit Modal Pop-up */}
      {activeModalPatient && (
        <PatientDetailModal
          branchesById={branchesById}
          initialTab={activeModalPatient.tab}
          onClose={() => setActiveModalPatient(null)}
          onRemove={(patient) => void removePatient(patient)}
          onSaved={() => {
            directory.reload();
          }}
          patient={activeModalPatient.patient}
        />
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Patients
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {directory.data?.summary.totalPatients ?? 0}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Active Records
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Matching Search
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {directory.data?.total ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Shown
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Male Patients
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {directory.data?.summary.malePatients ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Registered
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Female Patients
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {directory.data?.summary.femalePatients ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Registered
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Header Bar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400 dark:text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="m16.5 16.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </span>

            <input
              className={`${INPUT_CLASS_NAME} pl-10`}
              onChange={(e) => updateFilter("query", e.target.value)}
              placeholder="Search by Patient Name, MR Number, CNIC, Father Name or Phone…"
              type="search"
              value={filters.query}
            />

            {filters.query.trim() !== "" && (
              <button
                className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => updateFilter("query", "")}
                type="button"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Sort patients"
              className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
              onChange={(e) => updateFilter("sort", e.target.value as PatientDirectorySort)}
              value={filters.sort}
            >
              <option value="recent">Recently Registered</option>
              <option value="name-ascending">Patient Name A–Z</option>
              <option value="mr-ascending">MR Number</option>
              <option value="age-ascending">Age: Youngest First</option>
              <option value="age-descending">Age: Oldest First</option>
            </select>

            <button
              className={`flex h-11 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition ${
                filtersOpen
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              onClick={() => setFiltersOpen((open) => !open)}
              type="button"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
              <span>{filtersOpen ? "Hide Filters" : "Filters"}</span>
            </button>

            <button
              className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              onClick={() => directory.reload()}
              type="button"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <path d="M20 7v5h-5M4 17v-5h5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                <path d="M6.1 9a7 7 0 0 1 11.7-2.4L20 12M4 12l2.2 5.4A7 7 0 0 0 17.9 15" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {filtersOpen && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-150">
            <label>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Branch</span>
              <select
                className={`${INPUT_CLASS_NAME} mt-1.5`}
                onChange={(e) => updateFilter("branchId", e.target.value)}
                value={filters.branchId}
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Gender</span>
              <select
                className={`${INPUT_CLASS_NAME} mt-1.5`}
                onChange={(e) => updateFilter("gender", e.target.value as PatientDirectoryGenderFilter)}
                value={filters.gender}
              >
                <option value="all">All Genders</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="unknown">Not Recorded</option>
              </select>
            </label>

            <label>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Minimum Age</span>
              <input
                className={`${INPUT_CLASS_NAME} mt-1.5`}
                max="130"
                min="0"
                onChange={(e) => updateFilter("minimumAge", e.target.value)}
                placeholder="0"
                type="number"
                value={filters.minimumAge}
              />
            </label>

            <label>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Maximum Age</span>
              <input
                className={`${INPUT_CLASS_NAME} mt-1.5`}
                max="130"
                min="0"
                onChange={(e) => updateFilter("maximumAge", e.target.value)}
                placeholder="130"
                type="number"
                value={filters.maximumAge}
              />
            </label>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                onClick={clearFilters}
                type="button"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Patients Table & Data Rendering */}
      {directory.status === "loading" ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <DataLoading label="Loading registered patient directory…" rows={8} shape="table" />
        </div>
      ) : directory.status === "error" ? (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <DataError detail={directory.error?.message} onRetry={directory.reload} what="patient directory" />
        </div>
      ) : registrations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
          <DataEmpty
            action={
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
                href="/operations/reception"
              >
                Register New Patient
              </Link>
            }
            description="No patients match the search criteria. Click below to register at the Reception Desk."
            itemLabel="patients"
            title="No Matching Patients"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          
          {/* Header Bar within Table */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900 dark:text-white">Registered Patients</span>
              <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-xs font-black text-blue-700 dark:text-blue-300 ring-1 ring-blue-100 dark:ring-blue-900/50">
                {registrations.length} Records
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              💡 Click any patient row to open their profile & edit
            </span>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 bg-slate-50/30 dark:bg-slate-800/20">
                  <th className="py-3.5 pl-5 pr-4">Patient</th>
                  <th className="py-3.5 px-4">MR Number</th>
                  <th className="py-3.5 px-4">CNIC / B-Form</th>
                  <th className="py-3.5 px-4">Father / Guardian</th>
                  <th className="py-3.5 px-4">Gender & Age</th>
                  <th className="py-3.5 px-4">Blood Group</th>
                  <th className="py-3.5 px-4">Mobile Phone</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 pl-4 pr-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {registrations.map((registration) => {
                  const age = getDemoPatientRegistrationAge(registration);

                  return (
                    <tr
                      className="group cursor-pointer transition hover:bg-indigo-50/40 dark:hover:bg-slate-800/60"
                      key={registration.id}
                      onClick={() => setActiveModalPatient({ patient: registration, tab: "view" })}
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 pl-5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-indigo-600 to-violet-600 text-xs font-black text-white shadow-sm">
                            {getInitials(registration.displayName)}
                          </div>
                          <div className="min-w-0">
                            <span className="block font-black text-slate-950 dark:text-white transition group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {registration.displayName}
                            </span>
                            <span className="mt-0.5 block text-xs font-semibold text-slate-400 dark:text-slate-500">
                              {registration.draft.city ? `${registration.draft.city} · ` : ""}
                              Registered {formatWonFlowDashboardDateTime(registration.registeredAt)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* MR Number */}
                      <td className="py-4 px-4 font-mono text-sm font-black text-indigo-700 dark:text-indigo-400">
                        {registration.mrNumber}
                      </td>

                      {/* CNIC */}
                      <td className="py-4 px-4 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {registration.draft.cnicNumber || "—"}
                      </td>

                      {/* Father / Guardian */}
                      <td className="py-4 px-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {registration.draft.fatherName || "—"}
                      </td>

                      {/* Gender & Age */}
                      <td className="py-4 px-4">
                        <StatusBadge
                          className={getGenderBadgeClass(registration.draft.gender)}
                          label={`${humanizeValue(registration.draft.gender)}${age !== undefined ? ` · ${age}y` : ""}`}
                        />
                      </td>

                      {/* Blood Group */}
                      <td className="py-4 px-4">
                        {registration.draft.bloodGroup ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-xs font-black text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-900/50">
                            🩸 {registration.draft.bloodGroup}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Mobile */}
                      <td className="py-4 px-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {registration.draft.mobileNumber || "—"}
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                        {humanizeValue(registration.draft.patientCategory)}
                      </td>

                      {/* Row Actions */}
                      <td
                        className="py-4 pl-4 pr-5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            onClick={() => setActiveModalPatient({ patient: registration, tab: "view" })}
                            type="button"
                          >
                            Details
                          </button>

                          <button
                            className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                            onClick={() => setActiveModalPatient({ patient: registration, tab: "edit" })}
                            type="button"
                          >
                            Edit
                          </button>

                          <Link
                            className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm"
                            href={`/operations/reception?patientId=${encodeURIComponent(registration.id)}`}
                          >
                            Book
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 lg:hidden">
            {registrations.map((registration) => {
              const age = getDemoPatientRegistrationAge(registration);

              return (
                <div
                  className="cursor-pointer p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  key={registration.id}
                  onClick={() => setActiveModalPatient({ patient: registration, tab: "view" })}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-indigo-600 to-violet-600 text-xs font-black text-white shadow-sm">
                        {getInitials(registration.displayName)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-black text-slate-950 dark:text-white">
                          {registration.displayName}
                        </h3>
                        <p className="mt-0.5 font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">
                          {registration.mrNumber}
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      className={getGenderBadgeClass(registration.draft.gender)}
                      label={`${humanizeValue(registration.draft.gender)}${age !== undefined ? ` · ${age}y` : ""}`}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400">CNIC: </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {registration.draft.cnicNumber || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400">Phone: </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {registration.draft.mobileNumber || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400">Father: </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {registration.draft.fatherName || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400">Blood: </span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {registration.draft.bloodGroup || "—"}
                      </span>
                    </div>
                  </div>

                  <div
                    className="mt-3 flex items-center justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200"
                      onClick={() => setActiveModalPatient({ patient: registration, tab: "view" })}
                      type="button"
                    >
                      View Profile
                    </button>

                    <button
                      className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300"
                      onClick={() => setActiveModalPatient({ patient: registration, tab: "edit" })}
                      type="button"
                    >
                      Edit
                    </button>

                    <Link
                      className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"
                      href={`/operations/reception?patientId=${encodeURIComponent(registration.id)}`}
                    >
                      Book
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Navigation */}
          {directory.data !== undefined && directory.data.total > pageSize && (
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-800/30">
              <button
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Previous
              </button>

              <span>
                Page {directory.data.page} of {Math.max(1, Math.ceil(directory.data.total / pageSize))}
              </span>

              <button
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
                disabled={directory.data.page * pageSize >= directory.data.total}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Main Workflow Component
// -------------------------------------------------------------
export function PatientDirectoryWorkflow() {
  const hospitalService = useWonFlowHospitalService();

  const branches = useWonFlowAsyncData({
    key: "patient-directory:branches",
    loader: (signal) => hospitalService.listBranches(signal),
    isEmpty: (items) => items.length === 0,
  });

  return (
    <div className="space-y-4">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700"
              href="/operations/reception"
            >
              + Register New Patient
            </Link>
          </div>
        }
        breadcrumbs={[
          {
            label: "Hospital Operations",
            href: "/operations",
          },
          {
            label: "Patients",
          },
          {
            label: "Patient Directory",
          },
        ]}
        description="Full-width patient directory with fast search, filters, and clean instant popup profiles with inline edit."
        eyebrow="Patient Management"
        leading={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
            <path d="M5 21a7 7 0 0 1 14 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            <path d="M19 7h3M20.5 5.5v3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        }
        metadata={
          <>
            <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 font-bold text-blue-700 dark:text-blue-300 ring-1 ring-blue-100 dark:ring-blue-900/50">
              Live Counter Records
            </span>
            <span>All Branches</span>
          </>
        }
        title="Patient Directory"
      />

      <WonFlowAsyncDataBoundary
        emptyDescription="No hospital branches are available for the patient directory."
        emptyTitle="Directory unavailable"
        loadingDescription="WonFlow is preparing the hospital branch directory."
        loadingTitle="Preparing patient directory"
        onRetry={branches.reload}
        state={branches}
      >
        {(branchRecords) => <PatientDirectoryContent branches={branchRecords} />}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
