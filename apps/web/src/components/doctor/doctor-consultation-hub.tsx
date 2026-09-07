"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FilePenLine,
  ListOrdered,
  Pause,
  Pill,
  Play,
  Printer,
  Stethoscope,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ActionReadiness } from "@wonflow/ui";
import type { ActionReadinessBlocker } from "@wonflow/ui";

import type {
  DemoClinicalEncounter,
} from "@/lib/clinical";
import {
  sortDemoQueueEntries,
} from "@/lib/queue";
import type {
  DemoQueueEntry,
} from "@/lib/queue";
import {
  completeDoctorEncounter,
  createDoctorEncounter,
  pauseDoctorEncounter,
  resumeDoctorEncounter,
} from "@/lib/api/doctor-api";
import { WonFlowApiError } from "@/lib/api/phase-one-api";

import {
  usePracticeLocation,
} from "@/components/shell";

import {
  DoctorPageHeader,
} from "./doctor-page-header";
import {
  useDoctorPortalContext,
} from "./doctor-portal-shell";
import {
  EmptyState,
  formatDateTime,
  formatElapsed,
  formatTime,
  formatWait,
  getDiagnosis,
  getLocalBusinessDate,
  getPrescriptionItems,
  getReason,
  humanize,
  Metric,
  PatientAvatar,
  PatientLink,
  printPrescription,
  priorityClassName,
  requestedQueueMessage,
  resolvePatient,
  safeText,
  SectionShell,
  StatusPill,
  useConsultationHubData,
} from "./doctor-consultation-hub-support";
import type {
  ConsultationRecord,
  ReadyRecord,
} from "./doctor-consultation-hub-support";

const RESOLVER_LABELS: Record<string, string> = {
  self: "You",
  administrator: "An administrator",
  reception: "Reception",
  billing: "Billing",
  doctor: "The doctor",
};

/** Checks the start-consultation readiness endpoint for one appointment — called per ready-record card so each patient's own blockers (not checked in, payment pending, a different doctor's booking) show individually. */
function useStartConsultationReadiness(
  appointmentId: string,
): { blockers: ActionReadinessBlocker[]; loading: boolean } {
  const [blockers, setBlockers] = useState<ActionReadinessBlocker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/v1/readiness/start-consultation?appointmentId=${encodeURIComponent(appointmentId)}`,
          { credentials: "same-origin", signal: controller.signal },
        );
        if (!response.ok) return;
        const body = await response.json() as {
          blockers: Array<{ code: string; reason: string; resolverRole: string; resolutionHref: string }>;
        };
        setBlockers(
          body.blockers.map((blocker) => ({
            code: blocker.code,
            reason: blocker.reason,
            resolverLabel: RESOLVER_LABELS[blocker.resolverRole] ?? blocker.resolverRole,
          })),
        );
      } catch (caught: unknown) {
        if (
          controller.signal.aborted ||
          (typeof caught === "object" && caught !== null && "name" in caught && (caught as { name: string }).name === "AbortError") ||
          (caught instanceof Error && (caught.name === "AbortError" || caught.message.toLowerCase().includes("abort"))) ||
          (typeof DOMException !== "undefined" && caught instanceof DOMException && caught.name === "AbortError")
        ) {
          return;
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load().catch(() => { });
    return () => {
      try {
        controller.abort();
      } catch {
        // ignore
      }
    };
  }, [appointmentId]);

  return { blockers, loading };
}

export interface DoctorConsultationHubProps {
  initialQueueEntryId?: string;
}

export function DoctorConsultationHub({
  initialQueueEntryId,
}: DoctorConsultationHubProps) {
  const router = useRouter();
  const portal =
    useDoctorPortalContext();
  const locationContext =
    usePracticeLocation();
  const locationEmptyDescription =
    locationContext.selectedLocation !== undefined &&
      locationContext.selectedLocation.linkedBranchId === undefined
      ? "This worklist has no branch-linked demo records for the selected external location."
      : "No items at this location";
  const hub = useConsultationHubData();
  const [message, setMessage] =
    useState<string>();
  const [now, setNow] =
    useState<number>();

  useEffect(() => {
    const updateClock = () => {
      setNow(Date.now());
    };
    queueMicrotask(updateClock);
    const interval = window.setInterval(
      updateClock,
      30_000,
    );
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const patientsById = useMemo(
    () =>
      new Map(
        hub.data.patients.map(
          (patient) => [
            patient.id,
            patient,
          ],
        ),
      ),
    [hub.data.patients],
  );
  const queueEntriesById = useMemo(
    () =>
      new Map(
        hub.data.queueEntries.map(
          (entry) => [entry.id, entry],
        ),
      ),
    [hub.data.queueEntries],
  );
  const documentationByEncounterId =
    useMemo(
      () =>
        new Map(
          hub.data.documentation.map(
            (record) => [
              record.encounterId,
              record,
            ],
          ),
        ),
      [hub.data.documentation],
    );

  const doctorEncounters = useMemo(
    () =>
      hub.data.encounters.filter(
        (encounter) =>
          encounter.practitionerId ===
          portal.doctorId &&
          locationContext.matchesLegacyBranch(
            encounter.branchId,
          ) &&
          encounter.status !==
          "cancelled",
      ),
    [
      hub.data.encounters,
      locationContext,
      portal.doctorId,
    ],
  );

  const encounterByQueueEntryId =
    useMemo(() => {
      const result = new Map<
        string,
        DemoClinicalEncounter
      >();
      [...doctorEncounters]
        .sort((left, right) =>
          String(
            right.updatedAt ?? "",
          ).localeCompare(
            String(
              left.updatedAt ?? "",
            ),
          ),
        )
        .forEach((encounter) => {
          if (
            !result.has(
              encounter.queueEntryId,
            )
          ) {
            result.set(
              encounter.queueEntryId,
              encounter,
            );
          }
        });
      return result;
    }, [doctorEncounters]);

  const buildConsultationRecord =
    useCallback(
      (
        encounter: DemoClinicalEncounter,
      ): ConsultationRecord => {
        const queueEntry =
          queueEntriesById.get(
            encounter.queueEntryId,
          );
        const documentation =
          documentationByEncounterId.get(
            encounter.id,
          );
        return {
          encounter,
          queueEntry,
          documentation,
          patient: resolvePatient(
            encounter.patientId,
            queueEntry,
            documentation,
            patientsById,
          ),
        };
      },
      [
        documentationByEncounterId,
        patientsById,
        queueEntriesById,
      ],
    );

  const currentQueueEntries = useMemo(
    () =>
      hub.data.queueEntries.filter(
        (entry) =>
          entry.practitionerId ===
          portal.doctorId &&
          locationContext.matchesLegacyBranch(
            entry.branchId,
          ) &&
          entry.businessDate ===
          portal.businessDate,
      ),
    [
      hub.data.queueEntries,
      locationContext,
      portal.businessDate,
      portal.doctorId,
    ],
  );

  const servingEntries =
    currentQueueEntries.filter(
      (entry) =>
        entry.status === "serving",
    );
  const hasServingConflict =
    hub.data.queueEntries.some(
      (entry) =>
        entry.practitionerId ===
        portal.doctorId &&
        entry.businessDate ===
        portal.businessDate &&
        locationContext.matchesLegacyBranch(
          entry.branchId,
        ) &&
        entry.status === "serving",
    );
  const activeRecords = servingEntries
    .map((entry) =>
      encounterByQueueEntryId.get(
        entry.id,
      ),
    )
    .filter(
      (
        encounter,
      ): encounter is DemoClinicalEncounter =>
        encounter !== undefined &&
        encounter.status !== "completed" &&
        encounter.status !== "cancelled",
    )
    .map(buildConsultationRecord)
    .sort((left, right) =>
      String(
        left.encounter.startedAt ?? "",
      ).localeCompare(
        String(
          right.encounter.startedAt ?? "",
        ),
      ),
    );
  const activeRecord = activeRecords[0];
  const activeEncounterIds = new Set(
    activeRecords.map(
      (record) => record.encounter.id,
    ),
  );
  const servingWithoutEncounter =
    servingEntries.filter((entry) => {
      const encounter =
        encounterByQueueEntryId.get(
          entry.id,
        );
      return (
        encounter === undefined ||
        encounter.status === "completed" ||
        encounter.status === "cancelled"
      );
    });

  const draftRecords = doctorEncounters
    .filter(
      (encounter) =>
        encounter.status !== "completed" &&
        !activeEncounterIds.has(
          encounter.id,
        ),
    )
    .map(buildConsultationRecord)
    .sort((left, right) => {
      const leftUpdated =
        left.documentation?.updatedAt ??
        left.encounter.updatedAt;
      const rightUpdated =
        right.documentation?.updatedAt ??
        right.encounter.updatedAt;
      return String(
        rightUpdated ?? "",
      ).localeCompare(
        String(leftUpdated ?? ""),
      );
    });

  const readyRecords: ReadyRecord[] =
    sortDemoQueueEntries(
      currentQueueEntries.filter(
        (entry) =>
          entry.status === "called" &&
          !encounterByQueueEntryId.has(
            entry.id,
          ),
      ),
    ).map((queueEntry) => ({
      queueEntry,
      patient: resolvePatient(
        queueEntry.patientId,
        queueEntry,
        undefined,
        patientsById,
      ),
    }));

  const completedRecords =
    doctorEncounters
      .filter((encounter) => {
        if (
          encounter.status !==
          "completed"
        ) {
          return false;
        }
        const queueEntry =
          queueEntriesById.get(
            encounter.queueEntryId,
          );
        if (
          safeText(
            queueEntry?.businessDate,
          ) !== undefined
        ) {
          return (
            queueEntry?.businessDate ===
            portal.businessDate
          );
        }
        return (
          getLocalBusinessDate(
            encounter.completedAt ??
            encounter.updatedAt,
          ) === portal.businessDate
        );
      })
      .map(buildConsultationRecord)
      .sort((left, right) =>
        String(
          right.encounter.completedAt ??
          right.encounter.updatedAt ??
          "",
        ).localeCompare(
          String(
            left.encounter.completedAt ??
            left.encounter.updatedAt ??
            "",
          ),
        ),
      );

  const requestedQueueEntry =
    initialQueueEntryId === undefined
      ? undefined
      : queueEntriesById.get(
        initialQueueEntryId,
      );
  const requestedEntryVisible = [
    ...activeRecords,
    ...draftRecords,
    ...completedRecords,
  ].some(
    (record) =>
      record.queueEntry?.id ===
      initialQueueEntryId,
  ) ||
    readyRecords.some(
      (record) =>
        record.queueEntry.id ===
        initialQueueEntryId,
    );
  const sittingAvailable =
    portal.sitting?.status ===
    "available";

  function reload(): void {
    hub.reload();
  }

  /**
   * Creates the clinical encounter via POST /api/v1/doctor/encounters —
   * validated server-side against the same start-consultation readiness the
   * ready-record cards check before enabling this button, so a stale client
   * check never lets a request through the server would refuse anyway.
   * Navigation only happens once the server has confirmed the encounter
   * exists; nothing here assumes success ahead of that response.
   */
  async function startConsultation(
    queueEntry: DemoQueueEntry,
  ): Promise<void> {
    try {
      const { encounter } = await createDoctorEncounter(queueEntry.appointmentId);
      reload();
      router.push(`/doctor/encounters/${encodeURIComponent(encounter.id)}`);
    } catch (error) {
      setMessage(
        error instanceof WonFlowApiError
          ? error.message
          : "The consultation could not be started.",
      );
      reload();
    }
  }

  async function finishConsultation(
    record: ConsultationRecord,
  ): Promise<void> {
    try {
      await completeDoctorEncounter(record.encounter.id);
      reload();
      const token = record.queueEntry?.tokenNumber;
      setMessage(
        token === undefined
          ? "Consultation completed."
          : `${token} completed. The next waiting patient is ready to be called.`,
      );
    } catch (error) {
      setMessage(
        error instanceof WonFlowApiError
          ? error.message
          : "The consultation could not be completed.",
      );
      reload();
    }
  }

  /** Pauses without releasing the patient — the queue entry stays in progress, so nobody else can be called into the same room. */
  async function pauseConsultation(
    record: ConsultationRecord,
  ): Promise<void> {
    try {
      await pauseDoctorEncounter(record.encounter.id);
      reload();
      setMessage("Consultation paused. The patient remains in progress.");
    } catch (error) {
      setMessage(
        error instanceof WonFlowApiError
          ? error.message
          : "The consultation could not be paused.",
      );
      reload();
    }
  }

  async function resumeConsultation(
    record: ConsultationRecord,
  ): Promise<void> {
    try {
      await resumeDoctorEncounter(record.encounter.id);
      reload();
      setMessage("Consultation resumed.");
    } catch (error) {
      setMessage(
        error instanceof WonFlowApiError
          ? error.message
          : "The consultation could not be resumed.",
      );
      reload();
    }
  }

  const header = (
    <DoctorPageHeader
      action={
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-[11px] font-black text-white shadow-sm transition hover:bg-indigo-700"
          href="/doctor"
        >
          <ListOrdered size={14} />
          Today&apos;s Queue
        </Link>
      }
      description="Manage active, draft and recently completed clinical encounters."
      icon={<Stethoscope size={18} />}
      title="Consultations"
    />
  );

  if (
    portal.loading ||
    !hub.loaded
  ) {
    return (
      <div className="space-y-3">
        {header}
        <EmptyState
          description="WonFlow is loading clinical encounters and assigned patients."
          title="Preparing Consultation Hub"
        />
      </div>
    );
  }

  if (portal.doctor === undefined) {
    return (
      <div className="space-y-3">
        {header}
        <EmptyState
          description="Select an active doctor from the shared Doctor Portal context before opening consultations."
          title="No active doctor"
          tone="amber"
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      {header}

      {message !== undefined ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-[11px] font-bold text-indigo-800"
        >
          {message}
        </div>
      ) : null}

      {!sittingAvailable ? (
        <div
          className={[
            "flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-[11px] sm:flex-row sm:items-center sm:justify-between",
            portal.sitting?.status ===
              "on-break"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-slate-200 bg-slate-50 text-slate-600",
          ].join(" ")}
        >
          <span className="inline-flex items-center gap-2 font-bold">
            <AlertTriangle
              aria-hidden="true"
              size={14}
            />
            {portal.sitting?.status ===
              "on-break"
              ? "The doctor is on break. Resume the sitting before starting another consultation."
              : "No available sitting. Start today's sitting before beginning a consultation."}
          </span>
          <Link
            className="shrink-0 font-black text-indigo-700 hover:text-indigo-900"
            href="/doctor"
          >
            Open Today
          </Link>
        </div>
      ) : null}

      {initialQueueEntryId !==
        undefined &&
        !requestedEntryVisible ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] font-bold text-amber-800">
          {requestedQueueEntry ===
            undefined
            ? "The requested queue record is unavailable."
            : requestedQueueMessage(
              requestedQueueEntry,
              {
                practitionerId:
                  portal.doctorId,
                branchId:
                  locationContext.selectedLocation?.linkedBranchId ?? "",
                businessDate:
                  portal.businessDate,
              },
            )}
        </div>
      ) : null}

      <section
        aria-label="Consultation summary"
        className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:grid-cols-4"
      >
        <Metric
          label="Active"
          tone="indigo"
          value={activeRecords.length}
        />
        <Metric
          label="Draft"
          tone="violet"
          value={draftRecords.length}
        />
        <Metric
          label="Ready"
          tone="amber"
          value={readyRecords.length}
        />
        <Metric
          label="Completed Today"
          tone="emerald"
          value={completedRecords.length}
        />
      </section>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SectionShell
          count={activeRecords.length}
          description="The patient currently being seen."
          icon={<Activity size={15} />}
          title="Active Consultation"
        >
          {activeRecord === undefined ? (
            <div>
              <EmptyState
                description={
                  servingWithoutEncounter.length >
                    0
                    ? "A serving queue record has no open clinical encounter. Restore the encounter without changing the patient's queue position."
                    : locationEmptyDescription
                }
                title={
                  servingWithoutEncounter.length >
                    0
                    ? "Encounter link unavailable"
                    : "No active consultation"
                }
                tone={
                  servingWithoutEncounter.length >
                    0
                    ? "rose"
                    : "slate"
                }
              />
              {servingWithoutEncounter[0] !==
                undefined ? (
                <button
                  className="mx-auto mt-2 flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[10px] font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!sittingAvailable}
                  onClick={() => {
                    startConsultation(
                      servingWithoutEncounter[0],
                    );
                  }}
                  type="button"
                >
                  <FilePenLine size={13} />
                  Restore Clinical Encounter
                </button>
              ) : null}
            </div>
          ) : (
            <article
              className={[
                "rounded-xl border bg-linear-to-br from-white to-indigo-50/50 p-3",
                activeRecord.queueEntry?.id ===
                  initialQueueEntryId
                  ? "border-indigo-400 ring-2 ring-indigo-100"
                  : "border-indigo-200",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <PatientAvatar
                  patient={
                    activeRecord.patient
                  }
                  urgent={
                    activeRecord.queueEntry !==
                    undefined &&
                    activeRecord.queueEntry
                      .priority !== "routine"
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-slate-950">
                        {
                          activeRecord.patient
                            .displayName
                        }
                      </h3>
                      <p className="mt-0.5 text-[10px] font-bold text-indigo-600">
                        {
                          activeRecord.patient
                            .mrNumber
                        }
                        {" · "}
                        {activeRecord.patient
                          .age === undefined
                          ? "Age not recorded"
                          : `${activeRecord.patient.age} years`}
                        {" · "}
                        {humanize(
                          activeRecord.patient
                            .gender,
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusPill className="bg-indigo-50 text-indigo-700 ring-indigo-200">
                        {activeRecord.queueEntry
                          ?.tokenNumber ??
                          "Token unavailable"}
                      </StatusPill>
                      {activeRecord.encounter
                        .status === "paused" ? (
                        <StatusPill className="bg-amber-50 text-amber-700 ring-amber-200">
                          Paused — patient still in progress
                        </StatusPill>
                      ) : null}
                      <StatusPill className="bg-violet-50 text-violet-700 ring-violet-200">
                        {activeRecord
                          .documentation?.status ===
                          "completed"
                          ? "Finalized"
                          : activeRecord
                            .documentation ===
                            undefined
                            ? "Documentation not started"
                            : "Clinical draft"}
                      </StatusPill>
                    </div>
                  </div>
                </div>
              </div>

              <dl className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Room",
                    value:
                      activeRecord.queueEntry
                        ?.roomLabel ??
                      activeRecord.encounter
                        .roomLabel ??
                      "Not assigned",
                  },
                  {
                    label: "Started",
                    value: formatTime(
                      activeRecord.queueEntry
                        ?.serviceStartedAt ??
                      activeRecord.encounter
                        .startedAt,
                    ),
                  },
                  {
                    label: "Elapsed",
                    value: formatElapsed(
                      activeRecord.queueEntry
                        ?.serviceStartedAt ??
                      activeRecord.encounter
                        .startedAt,
                      now,
                    ),
                  },
                  {
                    label: "Encounter",
                    value:
                      activeRecord.encounter
                        .encounterNumber,
                  },
                ].map((item) => (
                  <div
                    className="rounded-lg border border-slate-100 bg-white px-2.5 py-2"
                    key={item.label}
                  >
                    <dt className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                      {item.label}
                    </dt>
                    <dd className="mt-1 truncate text-[11px] font-bold text-slate-700">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 px-2.5 py-2 sm:col-span-3">
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                    Consultation reason
                  </p>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-700">
                    {getReason(
                      activeRecord.encounter,
                      activeRecord.queueEntry,
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-rose-100 bg-rose-50/70 px-2.5 py-2 sm:col-span-2">
                  <p className="text-[9px] font-black uppercase tracking-wide text-rose-500">
                    Allergies
                  </p>
                  <p className="mt-1 text-[11px] font-bold leading-4 text-rose-800">
                    {
                      activeRecord.patient
                        .allergies
                    }
                  </p>
                </div>
                <div className="rounded-lg border border-rose-100 bg-white px-2.5 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wide text-rose-500">
                    Medical alerts
                  </p>
                  <p className="mt-1 text-[11px] font-bold leading-4 text-rose-800">
                    {
                      activeRecord.patient
                        .medicalAlert
                    }
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-indigo-100 pt-3">
                <Link
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[10px] font-black text-white transition hover:bg-indigo-700"
                  href={`/doctor/encounters/${encodeURIComponent(
                    activeRecord.encounter.id,
                  )}`}
                >
                  <FilePenLine size={13} />
                  Continue Consultation
                </Link>
                <PatientLink
                  label="Open Patient Profile"
                  patient={
                    activeRecord.patient
                  }
                />
                {activeRecord.encounter.status === "paused" ? (
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-[10px] font-black text-violet-700 transition hover:bg-violet-100"
                    onClick={() => {
                      resumeConsultation(
                        activeRecord,
                      );
                    }}
                    type="button"
                  >
                    <Play size={13} />
                    Resume
                  </button>
                ) : (
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[10px] font-black text-amber-700 transition hover:bg-amber-100"
                    onClick={() => {
                      pauseConsultation(
                        activeRecord,
                      );
                    }}
                    type="button"
                  >
                    <Pause size={13} />
                    Pause
                  </button>
                )}
                <button
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100"
                  onClick={() => {
                    finishConsultation(
                      activeRecord,
                    );
                  }}
                  type="button"
                >
                  <CheckCircle2 size={13} />
                  Finish Consultation
                </button>
              </div>
            </article>
          )}

          {activeRecords.length > 1 ? (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[10px] font-bold text-rose-700">
              {activeRecords.length} serving consultations were found in older local data. Finish the displayed encounter before starting another.
            </p>
          ) : null}
        </SectionShell>

        <SectionShell
          count={readyRecords.length}
          description="Called patients eligible to begin."
          icon={<Play size={15} />}
          title="Ready to Start"
        >
          {readyRecords.length === 0 ? (
            <EmptyState
              description={locationEmptyDescription}
              title="No patient ready"
              tone="amber"
            />
          ) : (
            <div className="space-y-2">
              {readyRecords.map((record) => (
                <ReadyRecordCard
                  hasServingConflict={hasServingConflict}
                  highlighted={
                    record.queueEntry.id ===
                    initialQueueEntryId
                  }
                  key={record.queueEntry.id}
                  onStart={startConsultation}
                  record={record}
                  sittingAvailable={sittingAvailable}
                  sittingRoomLabel={
                    portal.sitting?.roomLabel
                  }
                />
              ))}
            </div>
          )}
        </SectionShell>
      </div>

      <SectionShell
        count={draftRecords.length}
        description="Started or saved encounters that are not completed."
        icon={<FilePenLine size={15} />}
        title="Draft Consultations"
      >
        {draftRecords.length === 0 ? (
          <EmptyState
            description={locationEmptyDescription}
            title="No draft consultations"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {draftRecords.map((record) => (
              <article
                className={[
                  "grid gap-2 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(180px,1.2fr)_minmax(90px,0.55fr)_minmax(110px,0.7fr)_minmax(110px,0.7fr)_minmax(180px,1.2fr)_auto] lg:items-center",
                  record.queueEntry?.id ===
                    initialQueueEntryId
                    ? "rounded-xl bg-indigo-50 px-2 ring-1 ring-indigo-100"
                    : "",
                ].join(" ")}
                key={record.encounter.id}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <PatientAvatar
                    patient={record.patient}
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-black text-slate-950">
                      {record.patient.displayName}
                    </h3>
                    <p className="mt-0.5 truncate text-[10px] font-bold text-indigo-600">
                      {record.patient.mrNumber}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-400 lg:hidden">
                    Token
                  </p>
                  <p className="text-[10px] font-bold text-slate-700">
                    {record.queueEntry
                      ?.tokenNumber ??
                      "Unavailable"}
                    {record.queueEntry ===
                      undefined ? (
                      <span className="ml-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[8px] font-black text-rose-700 ring-1 ring-rose-100">
                        Queue link missing
                      </span>
                    ) : null}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-400 lg:hidden">
                    Started
                  </p>
                  <p className="text-[10px] font-bold text-slate-700">
                    {formatDateTime(
                      record.encounter
                        .startedAt,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-400 lg:hidden">
                    Updated
                  </p>
                  <p className="text-[10px] font-bold text-slate-700">
                    {formatDateTime(
                      record.documentation
                        ?.updatedAt ??
                      record.encounter
                        .updatedAt,
                    )}
                  </p>
                </div>
                <p className="line-clamp-2 text-[10px] font-medium leading-4 text-slate-600">
                  {getReason(
                    record.encounter,
                    record.queueEntry,
                  )}
                </p>
                <Link
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-indigo-600 px-3 text-[10px] font-black text-white transition hover:bg-indigo-700"
                  href={`/doctor/encounters/${encodeURIComponent(
                    record.encounter.id,
                  )}`}
                >
                  Continue
                </Link>
              </article>
            ))}
          </div>
        )}
      </SectionShell>

      <SectionShell
        count={completedRecords.length}
        description="Clinical encounters completed on the active business date."
        icon={<CheckCircle2 size={15} />}
        title="Recently Completed Today"
      >
        {completedRecords.length === 0 ? (
          <EmptyState
            description={locationEmptyDescription}
            title="No completed consultations today"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {completedRecords.map((record) => {
              const diagnosis =
                getDiagnosis(
                  record.documentation,
                );
              const prescriptions =
                getPrescriptionItems(
                  record.documentation,
                );
              return (
                <article
                  className="grid gap-2 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(180px,1.2fr)_minmax(90px,0.55fr)_minmax(120px,0.7fr)_minmax(220px,1.5fr)_auto] lg:items-center"
                  key={record.encounter.id}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <PatientAvatar
                      patient={record.patient}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-black text-slate-950">
                        {
                          record.patient
                            .displayName
                        }
                      </h3>
                      <p className="mt-0.5 truncate text-[10px] font-bold text-indigo-600">
                        {
                          record.patient
                            .mrNumber
                        }
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400 lg:hidden">
                      Token
                    </p>
                    <p className="text-[10px] font-bold text-slate-700">
                      {record.queueEntry
                        ?.tokenNumber ??
                        "Unavailable"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400 lg:hidden">
                      Completed
                    </p>
                    <p className="text-[10px] font-bold text-slate-700">
                      {formatDateTime(
                        record.encounter
                          .completedAt ??
                        record.encounter
                          .updatedAt,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                      {diagnosis === undefined
                        ? "Consultation reason"
                        : "Diagnosis"}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-700">
                      {diagnosis ??
                        getReason(
                          record.encounter,
                          record.queueEntry,
                        )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100"
                      href={`/doctor/encounters/${encodeURIComponent(
                        record.encounter.id,
                      )}`}
                    >
                      Open Summary
                    </Link>
                    {prescriptions.length > 0 ? (
                      <button
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-[10px] font-black text-indigo-700 transition hover:bg-indigo-100"
                        onClick={() => {
                          const opened =
                            printPrescription({
                              doctorName:
                                portal.doctor
                                  ?.displayName ??
                                "Doctor",
                              record,
                              prescriptions,
                            });
                          if (!opened) {
                            setMessage(
                              "Allow pop-ups to print this prescription.",
                            );
                          }
                        }}
                        type="button"
                      >
                        <Printer size={12} />
                        Print Prescription
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionShell>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium text-slate-500">
        <Pill
          aria-hidden="true"
          className="shrink-0 text-indigo-500"
          size={13}
        />
        Prescription printing is offered only for finalized documentation containing stored medicine items.
      </div>
    </div>
  );
}

interface ReadyRecordCardProps {
  record: ReadyRecord;
  highlighted: boolean;
  sittingAvailable: boolean;
  hasServingConflict: boolean;
  sittingRoomLabel?: string;
  onStart: (queueEntry: DemoQueueEntry) => void;
}

/**
 * One "ready to start" patient card. Its own component (not inlined in the
 * list map) because it needs to call the start-consultation readiness hook
 * per appointment — every patient can be blocked for a different reason
 * (not checked in, prepayment pending, booked with someone else), so each
 * card fetches and shows its own blockers rather than one shared check.
 */
function ReadyRecordCard({
  record,
  highlighted,
  sittingAvailable,
  hasServingConflict,
  sittingRoomLabel,
  onStart,
}: ReadyRecordCardProps) {
  const { blockers, loading } = useStartConsultationReadiness(record.queueEntry.appointmentId);

  const localBlockReason = !sittingAvailable
    ? "An available sitting is required."
    : hasServingConflict
      ? "Finish or restore the serving consultation first."
      : undefined;
  const startDisabled = !sittingAvailable || hasServingConflict || loading || blockers.length > 0;

  return (
    <article
      className={[
        "rounded-xl border bg-white p-3",
        highlighted
          ? "border-indigo-400 ring-2 ring-indigo-100"
          : record.queueEntry.priority === "routine"
            ? "border-amber-200"
            : "border-rose-200",
      ].join(" ")}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 min-w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 px-2 text-[10px] font-black text-white">
          {record.queueEntry.tokenNumber}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-1.5">
            <div className="min-w-0">
              <h3 className="truncate text-xs font-black text-slate-950">
                {record.patient.displayName}
              </h3>
              <p className="mt-0.5 text-[10px] font-bold text-indigo-600">
                {record.patient.mrNumber}
              </p>
            </div>
            <StatusPill className={priorityClassName(record.queueEntry.priority)}>
              {humanize(record.queueEntry.priority)}
            </StatusPill>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-4 text-slate-600">
            {getReason(undefined, record.queueEntry)}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
        <span className="rounded-lg bg-slate-50 px-2 py-1.5 font-bold text-slate-600">
          Wait: {formatWait(record.queueEntry)}
        </span>
        <span className="rounded-lg bg-slate-50 px-2 py-1.5 font-bold text-slate-600">
          {record.queueEntry.roomLabel ?? sittingRoomLabel ?? "Room not assigned"}
        </span>
        <span className="rounded-lg bg-amber-50 px-2 py-1.5 font-bold text-amber-700">
          Called {formatTime(record.queueEntry.calledAt)}
        </span>
      </div>

      {blockers.length > 0 ? (
        <ActionReadiness blockers={blockers} className="mt-2" hideLinks />
      ) : null}

      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[10px] font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={startDisabled}
          onClick={() => {
            onStart(record.queueEntry);
          }}
          title={localBlockReason}
          type="button"
        >
          <Play size={12} />
          Start Consultation
        </button>
        <PatientLink label="Open Patient" patient={record.patient} />
      </div>
    </article>
  );
}
