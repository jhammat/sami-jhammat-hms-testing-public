"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Search } from "lucide-react";

import {
  PhaseOneEmptyState,
  PhaseOnePanel,
  PhaseOneSelectableRow,
  PhaseOneSkeleton,
  PhaseOneWorkspaceHero,
} from "@/components/phase-one-design";

import { ClinicianDrainMonitor } from "./clinician-drain-monitor";

interface PatientRow {
  id: string;
  patientNumber: string;
  givenName: string;
  familyName: string;
}

/**
 * Picks the patient, then hands off to the drain monitor.
 *
 * The monitor itself needs a patientId and had no screen supplying one. This
 * is deliberately a thin shell: it owns the search and the selection, and
 * nothing else, so the clinical behaviour stays in the component that
 * already implements it.
 */
export function DoctorDrainWorkspace() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [selected, setSelected] = useState<PatientRow | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (search: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/v1/patients?pageSize=25${search.trim() ? `&query=${encodeURIComponent(search.trim())}` : ""}`,
        { credentials: "same-origin", cache: "no-store" },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "The patient list could not be loaded.");
      }

      setPatients(payload?.patients ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The patient list could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Debounced so typing a name does not fire a request per keystroke.
    const timer = window.setTimeout(() => void load(query), 300);
    return () => window.clearTimeout(timer);
  }, [query, load]);

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <PhaseOneWorkspaceHero
        accent="sky"
        eyebrow="Clinical · Surgical drains"
        title="Drain monitoring"
        description="Register a drain when it is placed, follow its output and amylase, and remove it when the surgical team is satisfied. What you register here is what the patient can log against at home."
        chips={[{ label: "Output and amylase trends", tone: "quiet" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <PhaseOnePanel
            title="Choose a patient"
            description="Search by name or medical record number"
          >
            <label className="relative block">
              <span className="sr-only">Search patients</span>

              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={15}
              />

              <input
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or MR number"
                type="search"
                value={query}
              />
            </label>

            <div className="mt-3">
              {loading ? (
                <PhaseOneSkeleton rows={4} height={64} />
              ) : error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {error}
                </p>
              ) : patients.length === 0 ? (
                <PhaseOneEmptyState
                  icon={<FlaskConical aria-hidden size={20} />}
                  title="No patients found"
                  description={
                    query.trim()
                      ? "No patient matches that search. Check the spelling or the MR number."
                      : "Register a patient first, then their drains can be tracked here."
                  }
                />
              ) : (
                <ul className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {patients.map((patient) => (
                    <li key={patient.id}>
                      <PhaseOneSelectableRow
                        accent="sky"
                        selected={selected?.id === patient.id}
                        onSelect={() => setSelected(patient)}
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {patient.givenName} {patient.familyName}
                        </p>

                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {patient.patientNumber}
                        </p>
                      </PhaseOneSelectableRow>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PhaseOnePanel>
        </div>

        <div className="lg:col-span-8">
          {selected ? (
            <ClinicianDrainMonitor
              key={selected.id}
              patientId={selected.id}
              patientName={`${selected.givenName} ${selected.familyName}`}
            />
          ) : (
            <PhaseOnePanel>
              <PhaseOneEmptyState
                icon={<FlaskConical aria-hidden size={20} />}
                title="Select a patient"
                description="Choose a patient on the left to register a drain, review its output trend, or remove it."
              />
            </PhaseOnePanel>
          )}
        </div>
      </div>
    </div>
  );
}
