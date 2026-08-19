"use client";

import {
  CheckCircle2,
  ChevronLeft,
  Home,
  Save,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { WonFlowPageHeader } from "@/components/workspace";

interface Patient {
  patientNumber: string;
  givenName: string;
  middleName: string | null;
  familyName: string;
  dateOfBirth: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: unknown;
  guardianData?: unknown;
  consentData?: unknown;
}

export function PatientProfileEditor() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/patient/profile", { cache: "no-store" });
      const body = (await response.json()) as { home?: { patient: Patient }; error?: string };
      if (!response.ok || !body.home) throw new Error(body.error);
      setPatient(body.home.patient);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile could not be loaded.");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    const address = {
      line1: String(data.get("addressLine1") ?? ""),
      city: String(data.get("city") ?? ""),
      country: String(data.get("country") ?? "Pakistan"),
    };
    const guardianData = {
      name: String(data.get("guardianName") ?? ""),
      phone: String(data.get("guardianPhone") ?? ""),
      relationship: String(data.get("guardianRelationship") ?? ""),
    };
    try {
      const response = await fetch("/api/v1/patient/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          givenName: data.get("givenName"),
          middleName: data.get("middleName"),
          familyName: data.get("familyName"),
          dateOfBirth: data.get("dateOfBirth"),
          sex: data.get("sex"),
          phone: data.get("phone"),
          email: data.get("email"),
          address,
          guardianData,
          consentData: { patientUpdatedAt: new Date().toISOString() },
        }),
      });
      const body = (await response.json()) as { patient?: Patient; error?: string };
      if (!response.ok || !body.patient) throw new Error(body.error);
      setPatient(body.patient);
      setMessage("Your profile has been saved successfully and is updated across hospital portals.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (!patient) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-600 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        {error || "Loading your patient profile…"}
      </div>
    );
  }

  const address = (patient.address && typeof patient.address === "object" ? patient.address : {}) as Record<string, string>;
  const guardian = (patient.guardianData && typeof patient.guardianData === "object" ? patient.guardianData : {}) as Record<string, string>;

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <Link
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            href="/patient"
          >
            <ChevronLeft className="size-4" />
            Back to Dashboard
          </Link>
        }
        description={`Medical Record #${patient.patientNumber}. Information is securely synchronized with hospital teams.`}
        eyebrow="Account Settings"
        title="Personal Profile & Contacts"
      />

      {message ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4.5 text-sm font-black text-emerald-800 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-emerald-600" />
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4.5 text-sm font-bold text-red-700 shadow-xs dark:border-red-900/50 dark:bg-red-950/40">
          <TriangleAlert aria-hidden className="size-5 shrink-0" />
          {error}
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={(event) => void save(event)}>
        {/* Section 1: Patient Identity */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">Patient Identity</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Legal name, date of birth, and biological sex</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">First Name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={patient.givenName}
                name="givenName"
                required
                type="text"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Middle Name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={patient.middleName ?? ""}
                name="middleName"
                type="text"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={patient.familyName}
                name="familyName"
                required
                type="text"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Date of Birth</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={patient.dateOfBirth?.slice(0, 10) ?? ""}
                name="dateOfBirth"
                type="date"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Sex</span>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={patient.sex ?? ""}
                name="sex"
              >
                <option value="">Prefer not to say</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
        </section>

        {/* Section 2: Contact & Address */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="grid size-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Home className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">Contact & Residential Address</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mobile number, email address, and home location</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Mobile Phone</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={patient.phone ?? ""}
                name="phone"
                type="tel"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Email Address</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={patient.email ?? ""}
                name="email"
                type="email"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Street Address</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={address.line1 ?? ""}
                name="addressLine1"
                type="text"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">City</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={address.city ?? ""}
                name="city"
                type="text"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Country</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={address.country ?? "Pakistan"}
                name="country"
                type="text"
              />
            </label>
          </div>
        </section>

        {/* Section 3: Emergency Contact */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="grid size-10 place-items-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <Users className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">Emergency Contact / Guardian</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Family member or contact to reach during emergency clinical situations</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Guardian / Contact Name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={guardian.name ?? ""}
                name="guardianName"
                type="text"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact Mobile Number</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={guardian.phone ?? ""}
                name="guardianPhone"
                type="tel"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Relationship</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                defaultValue={guardian.relationship ?? ""}
                name="guardianRelationship"
                placeholder="e.g. Spouse, Parent, Sibling"
                type="text"
              />
            </label>
          </div>
        </section>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-sm font-black text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          <Save className="size-4" />
          {busy ? "Saving Changes…" : "Save Personal Information"}
        </button>
      </form>
    </div>
  );
}
