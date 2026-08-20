"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  FileHeart,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DoctorPageHeader } from "./doctor-page-header";

import {
  checkPatientDuplicates,
  useRegisterPatient,
} from "@/lib/api/patients";
import type { PatientRecord, RegisterPatientInput } from "@/lib/api/patients";
import {
  buildPatientDisplayName,
  buildRegisterPatientPayload,
  createInitialPatientRegistrationDraft,
  formatPatientCnic,
  normalizePatientCnic,
  normalizePatientPhone,
  validatePatientRegistration,
} from "@/lib/patients/registration";
import type {
  PatientRegistrationDraft,
  PatientRegistrationErrors,
} from "@/lib/patients/registration";

/**
 * A doctor registers a patient directly, the same way reception does — for
 * a walk-in the doctor sees personally, or a patient transferring in with
 * their own records. `patients.manage` (see workspace-roles.ts) is what
 * makes this possible; the same permission also lets the doctor attach a
 * previous-record document to a brand-new patient with no encounter yet
 * (see the relaxed check in patient-document-service.ts).
 *
 * branchId isn't a real field on the API's RegisterPatientInput at all — it
 * never leaves the browser even in reception's own registration screen — so
 * this form doesn't collect it or depend on a branch directory to render.
 */

const PLACEHOLDER_BRANCH_ID = "unspecified";

const INPUT_CLASS_NAME = [
  "h-11 w-full rounded-xl border border-indigo-100 bg-white/90 px-3.5",
  "text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
  "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
].join(" ");

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-bold text-rose-600">{error}</span> : null}
    </label>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-indigo-100/80 bg-white/90 p-5 shadow-[0_12px_32px_rgba(79,70,229,0.06)] sm:p-6">
      <h2 className="text-base font-black text-slate-950">{title}</h2>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : "The patient could not be registered.";
}

/** Attach a photo/PDF of the patient's previous records right after registering them — no visit or encounter required yet. */
function PreviousHistoryUpload({ patientId }: { patientId: string }) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState("");

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("patientId", patientId);
      form.append("title", file.name);
      form.append("category", "PREVIOUS_MEDICAL_HISTORY");
      form.append("file", file);
      const response = await fetch("/api/v1/doctor/documents", { method: "POST", credentials: "same-origin", body: form });
      const body = await response.json() as { error?: string; scanResult?: string };
      if (!response.ok) throw new Error(body.error ?? "The file could not be attached.");
      if (body.scanResult === "INFECTED") throw new Error("This file failed a security scan and was not attached.");
      setUploaded((current) => [...current, file.name]);
    } catch (cause) {
      setUploadError(readError(cause));
    } finally {
      setUploading(false);
    }
  }, [patientId]);

  return (
    <section className="rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/60 p-4">
      <div className="flex items-center gap-2">
        <FileHeart aria-hidden className="size-4 text-indigo-600" />
        <h3 className="text-sm font-black text-indigo-950">Previous medical history</h3>
      </div>
      <p className="mt-1 text-xs text-indigo-800">
        Brought a discharge summary, an old prescription, or a scan report from elsewhere? Attach a photo or PDF now — it lands directly in this patient&apos;s documents.
      </p>
      {uploaded.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs font-bold text-emerald-700">
          {uploaded.map((name) => (
            <li className="flex items-center gap-1.5" key={name}><CheckCircle2 aria-hidden className="size-3.5" />{name}</li>
          ))}
        </ul>
      ) : null}
      <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-white px-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50">
        {uploading ? "Uploading…" : "Add a photo or PDF"}
        <input
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.tiff,.heic,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
          capture="environment"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void handleFile(file); }}
          type="file"
        />
      </label>
      {uploadError ? <p className="mt-2 text-xs font-bold text-rose-600">{uploadError}</p> : null}
    </section>
  );
}

export function DoctorPatientRegistration() {
  const [draft, setDraft] = useState<PatientRegistrationDraft>(() => createInitialPatientRegistrationDraft(PLACEHOLDER_BRANCH_ID));
  const [errors, setErrors] = useState<PatientRegistrationErrors>({});
  const [duplicates, setDuplicates] = useState<PatientRecord[]>([]);
  const [registered, setRegistered] = useState<{ id: string; patientNumber: string; displayName: string }>();

  const { mutate: registerPatient, saveState, error: registerError } = useRegisterPatient();

  const abortRef = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      abortRef.current = controller;
      const displayName = buildPatientDisplayName(draft);
      if (displayName.trim() === "" && draft.mobileNumber.trim() === "") {
        setDuplicates([]);
        return;
      }
      checkPatientDuplicates(
        { givenName: draft.givenName, familyName: draft.fatherName, phone: draft.mobileNumber },
        controller.signal,
      ).then(setDuplicates).catch(() => { /* a failed duplicate check must never block registration */ });
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the fields actually used in the lookup should re-trigger it.
  }, [draft.givenName, draft.fatherName, draft.mobileNumber]);

  const update = useCallback(<K extends keyof PatientRegistrationDraft>(key: K, value: PatientRegistrationDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }, []);

  const displayName = useMemo(() => buildPatientDisplayName(draft), [draft]);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const validation = validatePatientRegistration(draft);
    delete validation.branchId;
    if (Object.keys(validation).length > 0) { setErrors(validation); return; }
    const payload: RegisterPatientInput = { ...buildRegisterPatientPayload(draft), registeredVia: "doctor" };
    try {
      const result = await registerPatient(payload);
      setRegistered({ id: result.patient.id, patientNumber: result.patient.patientNumber, displayName: `${result.patient.givenName} ${result.patient.familyName}`.trim() });
    } catch {
      // registerError below already renders the failure — form state is preserved so the doctor can retry.
    }
  }

  function registerAnother(): void {
    setDraft(createInitialPatientRegistrationDraft(PLACEHOLDER_BRANCH_ID));
    setErrors({});
    setDuplicates([]);
    setRegistered(undefined);
  }

  if (registered) {
    return (
      <div className="space-y-5">
        <DoctorPageHeader
          description="The patient is saved. Attach any records they brought, or book their visit now."
          eyebrow="Patient registration"
          icon={<UserPlus size={18} />}
          title="Patient registered"
        />
        <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white shadow-[0_16px_42px_rgba(16,185,129,0.14)]">
          <div className="flex items-center gap-3 border-b border-emerald-100 px-6 py-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <CheckCircle2 aria-hidden className="size-5" />
            </span>
            <div>
              <p className="text-lg font-black text-slate-950">{registered.displayName}</p>
              <p className="text-sm font-bold text-emerald-700">Medical record {registered.patientNumber}</p>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <PreviousHistoryUpload patientId={registered.id} />
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700"
                href={`/operations/reception?patientId=${registered.id}`}
              >
                <CalendarPlus aria-hidden className="size-4" />
                Book an appointment now
              </Link>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                onClick={registerAnother}
                type="button"
              >
                <UserPlus aria-hidden className="size-4" />
                Register another patient
              </button>
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                href="/doctor/patients"
              >
                <Users aria-hidden className="size-4" />
                My patients
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DoctorPageHeader
        description="Register a walk-in yourself, or a patient bringing their previous records — the same registration reception uses."
        eyebrow="Patient registration"
        icon={<UserPlus size={18} />}
        title="Register a patient"
      />

      {registerError ? (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
          <AlertTriangle aria-hidden className="size-4 shrink-0" />
          {registerError.message}
        </div>
      ) : null}

      {duplicates.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-amber-900">
            <AlertTriangle aria-hidden className="size-4 shrink-0" />
            Possible existing patient{duplicates.length === 1 ? "" : "s"} — check before registering a duplicate.
          </p>
          <ul className="mt-2 space-y-1">
            {duplicates.map((patient) => (
              <li className="text-xs font-bold text-amber-800" key={patient.id}>
                {patient.givenName} {patient.familyName} — {patient.patientNumber}{patient.phone ? ` · ${patient.phone}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <Card description="Name, guardian and identity details." title="Patient identity">
          <Field error={errors.givenName} label="Given name">
            <input className={INPUT_CLASS_NAME} onChange={(event) => update("givenName", event.target.value)} value={draft.givenName} />
          </Field>
          <Field label="Middle name">
            <input className={INPUT_CLASS_NAME} onChange={(event) => update("middleName", event.target.value)} value={draft.middleName} />
          </Field>
          <Field error={errors.fatherName} label="Father / guardian name">
            <input className={INPUT_CLASS_NAME} onChange={(event) => update("fatherName", event.target.value)} value={draft.fatherName} />
          </Field>
          <Field label="Gender">
            <select className={INPUT_CLASS_NAME} onChange={(event) => update("gender", event.target.value as PatientRegistrationDraft["gender"])} value={draft.gender}>
              <option value="unknown">Unspecified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Date of birth">
            <input className={INPUT_CLASS_NAME} onChange={(event) => update("dateOfBirth", event.target.value)} type="date" value={draft.dateOfBirth} />
          </Field>
          <Field label="Estimated age (if DOB unknown)">
            <input className={INPUT_CLASS_NAME} inputMode="numeric" onChange={(event) => update("estimatedAge", event.target.value)} value={draft.estimatedAge} />
          </Field>
          <Field error={errors.cnicNumber} label="CNIC / B-Form number">
            <input
              className={INPUT_CLASS_NAME}
              onChange={(event) => update("cnicNumber", normalizePatientCnic(event.target.value))}
              value={formatPatientCnic(draft.cnicNumber)}
            />
          </Field>
          <Field label="Blood group">
            <input className={INPUT_CLASS_NAME} onChange={(event) => update("bloodGroup", event.target.value)} placeholder="e.g. O+" value={draft.bloodGroup} />
          </Field>
        </Card>

        <Card description="How to reach the patient." title="Contact">
          <Field error={errors.mobileNumber} label="Mobile number">
            <input
              className={INPUT_CLASS_NAME}
              onChange={(event) => update("mobileNumber", normalizePatientPhone(event.target.value))}
              value={draft.mobileNumber}
            />
          </Field>
          <Field label="Alternate mobile number">
            <input className={INPUT_CLASS_NAME} onChange={(event) => update("alternateMobileNumber", event.target.value)} value={draft.alternateMobileNumber} />
          </Field>
          <Field error={errors.emailAddress} label="Email">
            <input className={INPUT_CLASS_NAME} onChange={(event) => update("emailAddress", event.target.value)} type="email" value={draft.emailAddress} />
          </Field>
          <Field label="City">
            <input className={INPUT_CLASS_NAME} onChange={(event) => update("city", event.target.value)} value={draft.city} />
          </Field>
          <Field label="Address">
            <input className={INPUT_CLASS_NAME} onChange={(event) => update("addressLine", event.target.value)} value={draft.addressLine} />
          </Field>
          <Field label="Preferred language">
            <select className={INPUT_CLASS_NAME} onChange={(event) => update("preferredLanguage", event.target.value as PatientRegistrationDraft["preferredLanguage"])} value={draft.preferredLanguage}>
              <option value="en">English</option>
              <option value="ur">Urdu</option>
            </select>
          </Field>
        </Card>

        <Card description="Who to contact if needed, and any notes for the record." title="Emergency contact & notes">
          <Field label="Emergency contact name">
            <input className={INPUT_CLASS_NAME} onChange={(event) => update("emergencyContactName", event.target.value)} value={draft.emergencyContactName} />
          </Field>
          <Field label="Relation">
            <input className={INPUT_CLASS_NAME} onChange={(event) => update("emergencyContactRelation", event.target.value)} value={draft.emergencyContactRelation} />
          </Field>
          <Field label="Emergency contact phone">
            <input
              className={INPUT_CLASS_NAME}
              onChange={(event) => update("emergencyContactPhone", normalizePatientPhone(event.target.value))}
              value={draft.emergencyContactPhone}
            />
          </Field>
          <Field label="Patient category">
            <select className={INPUT_CLASS_NAME} onChange={(event) => update("patientCategory", event.target.value as PatientRegistrationDraft["patientCategory"])} value={draft.patientCategory}>
              <option value="self-pay">Self-pay</option>
              <option value="insurance">Insurance</option>
              <option value="corporate">Corporate</option>
              <option value="government">Government</option>
              <option value="charity">Charity</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input checked={draft.consentToContact} className="size-4" onChange={(event) => update("consentToContact", event.target.checked)} type="checkbox" />
            <span className="text-sm font-semibold text-slate-700">The patient consents to being contacted about their care.</span>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">Notes</span>
            <textarea className={`${INPUT_CLASS_NAME} min-h-24 py-2.5`} onChange={(event) => update("notes", event.target.value)} value={draft.notes} />
          </label>
        </Card>

        <div className="flex justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
            disabled={saveState === "saving"}
            type="submit"
          >
            <UserPlus aria-hidden className="size-4" />
            {saveState === "saving" ? "Registering…" : `Register ${displayName.trim() || "patient"}`}
          </button>
        </div>
      </form>
    </div>
  );
}
