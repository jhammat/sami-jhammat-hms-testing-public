"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  MockBranch,
  MockPractitioner,
} from "@wonflow/mock-data";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";

import {
  WonFlowAsyncDataBoundary,
  WonFlowEmptyState,
  WonFlowErrorState,
  wonflowConfirm,
} from "@/components/feedback";

import {
  WonFlowActionButton,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  readDemoAppointmentBookings,
} from "@/lib/appointments";

import type {
  DemoAppointmentBooking,
} from "@/lib/appointments";

import {
  createEmptyClinicalAllergy,
  createEmptyClinicalDiagnosis,
  createEmptyClinicalOrder,
  createEmptyCurrentMedication,
  createEmptyPrescriptionItem,
  finalizeDemoClinicalConsultation,
  getOrCreateDemoClinicalDocumentation,
  readDemoClinicalDocumentation,
  readDemoClinicalEncounters,
  saveDemoClinicalDocumentation,
  validateDemoClinicalDocumentation,
} from "@/lib/clinical";

import type {
  DemoAllergySeverity,
  DemoClinicalAllergy,
  DemoClinicalDiagnosis,
  DemoClinicalDocumentation,
  DemoClinicalDocumentationErrors,
  DemoClinicalEncounter,
  DemoClinicalOrder,
  DemoClinicalPrescriptionItem,
  DemoCurrentMedication,
  DemoDiagnosisType,
  DemoMedicationRoute,
} from "@/lib/clinical";

import {
  createInitialPatientRegistrationDraft,
  getDemoPatientRegistrationAge,
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import {
  readDemoQueueEntries,
} from "@/lib/queue";

import type {
  DemoQueueEntry,
} from "@/lib/queue";

import {
  formatWonFlowDashboardDateTime,
} from "@/lib/dashboard";

const INPUT_CLASS_NAME = [
  "h-11 w-full",
  "rounded-xl border",
  "border-slate-200",
  "bg-white px-3.5",
  "text-sm text-slate-900",
  "outline-none transition",
  "placeholder:text-slate-400",
  "focus:border-blue-400",
  "focus:ring-2",
  "focus:ring-blue-100",
].join(" ");

const TEXTAREA_CLASS_NAME = [
  "min-h-24 w-full",
  "resize-y rounded-xl",
  "border border-slate-200",
  "bg-white px-3.5 py-3",
  "text-sm leading-6",
  "text-slate-900",
  "outline-none transition",
  "placeholder:text-slate-400",
  "focus:border-blue-400",
  "focus:ring-2",
  "focus:ring-blue-100",
].join(" ");

function ClinicalIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 3h10v4H7V3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />

      <path
        d="M6 5H4v16h16V5h-2M8 12h8M8 16h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PatientIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M5 21a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M20.8 5.7a5.2 5.2 0 0 0-7.4 0L12 7.1l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-7.9a5.2 5.2 0 0 0 0-7.4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MedicineIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m8 16 8-8a4 4 0 0 0-5.7-5.7l-8 8A4 4 0 0 0 8 16Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />

      <path
        d="m7 7 10 10"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DiagnosisIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="10"
        cy="10"
        r="6"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="m14.5 14.5 5 5M10 7v6M7 10h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="m8 12 2.7 2.7L16.5 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function humanizeValue(
  value: string,
): string {
  return value
    .replaceAll("-", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

function getInitials(
  value: string,
): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0)
          .toUpperCase(),
    )
    .join("");
}

function createQueueSnapshotPatient(
  queueEntry: DemoQueueEntry | undefined,
): DemoPatientRegistrationResult | undefined {
  const snapshot = queueEntry?.snapshot?.patient;

  if (queueEntry === undefined || snapshot === undefined) {
    return undefined;
  }

  const normalizedGender = snapshot.gender.toLocaleLowerCase();
  const gender =
    normalizedGender === "female" ||
    normalizedGender === "male" ||
    normalizedGender === "other"
      ? normalizedGender
      : "unknown";

  return {
    id: queueEntry.patientId,
    mrNumber: snapshot.mrNumber,
    displayName: snapshot.displayName,
    registeredAt: queueEntry.checkedInAt,
    draft: {
      ...createInitialPatientRegistrationDraft(queueEntry.branchId),
      givenName: snapshot.displayName,
      gender,
      dateOfBirth: snapshot.dateOfBirth,
      estimatedAge: snapshot.ageIsEstimated ? String(snapshot.ageYears) : "",
      mobileNumber: snapshot.mobileNumber,
      cnicNumber: snapshot.identityNumber,
      bloodGroup: snapshot.bloodGroup,
    },
  };
}

interface FieldProps {
  label: string;

  required?: boolean;

  error?: string;

  helperText?: string;

  children: ReactNode;
}

function Field({
  label,
  required = false,
  error,
  helperText,
  children,
}: FieldProps) {
  return (
    <label className="block">
      <span className="flex items-center gap-1 text-xs font-extrabold text-slate-600">
        {label}

        {required ? (
          <span className="text-rose-500">
            *
          </span>
        ) : null}
      </span>

      <div className="mt-1.5">
        {children}
      </div>

      {error !== undefined ? (
        <span className="mt-1.5 block text-xs font-semibold text-rose-600">
          {error}
        </span>
      ) : helperText !== undefined ? (
        <span className="mt-1.5 block text-xs leading-5 text-slate-400">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 break-words text-sm font-bold text-slate-800">
        {value || "Not recorded"}
      </dd>
    </div>
  );
}

interface ClinicalConsultationContentProps {
  encounterId: string;

  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function ClinicalConsultationContent({
  encounterId,
  branches,
  practitioners,
}: ClinicalConsultationContentProps) {
  const [
    encounter,
    setEncounter,
  ] = useState<
    DemoClinicalEncounter |
    undefined
  >();

  const [
    documentation,
    setDocumentation,
  ] = useState<
    DemoClinicalDocumentation |
    undefined
  >();

  const [
    patient,
    setPatient,
  ] = useState<
    DemoPatientRegistrationResult |
    undefined
  >();

  const [
    appointment,
    setAppointment,
  ] = useState<
    DemoAppointmentBooking |
    undefined
  >();

  const [
    queueEntry,
    setQueueEntry,
  ] = useState<
    DemoQueueEntry |
    undefined
  >();

  const [
    errors,
    setErrors,
  ] = useState<
    DemoClinicalDocumentationErrors
  >({});

  const [
    actionMessage,
    setActionMessage,
  ] = useState<
    string |
    undefined
  >();

  const loadClinicalContext =
    useCallback(() => {
      const encounters =
        readDemoClinicalEncounters();

      const currentEncounter =
        encounters.find(
          (record) =>
            record.id ===
            encounterId,
        );

      setEncounter(
        currentEncounter,
      );

      if (
        currentEncounter ===
        undefined
      ) {
        setDocumentation(
          undefined,
        );

        setPatient(
          undefined,
        );

        setAppointment(
          undefined,
        );

        setQueueEntry(
          undefined,
        );

        return;
      }

      const documentationRecord =
        readDemoClinicalDocumentation()
          .find(
            (record) =>
              record.encounterId ===
              currentEncounter.id,
          ) ??
        getOrCreateDemoClinicalDocumentation(
          currentEncounter,
        );

      setDocumentation(
        documentationRecord,
      );

      const connectedQueueEntry =
        readDemoQueueEntries()
          .find(
            (record) =>
              record.id ===
              currentEncounter
                .queueEntryId,
          );

      setPatient(
        readDemoPatientRegistrations()
          .find(
            (record) =>
              record.id ===
              currentEncounter
                .patientId,
          ) ??
          createQueueSnapshotPatient(
            connectedQueueEntry,
          ),
      );

      setAppointment(
        readDemoAppointmentBookings()
          .find(
            (record) =>
              record.id ===
              currentEncounter
                .appointmentId,
          ),
      );

      setQueueEntry(
        connectedQueueEntry,
      );
    }, [encounterId]);

  useEffect(() => {
    queueMicrotask(
      loadClinicalContext,
    );

    window.addEventListener(
      "wonflow:demo-clinical-encounters-changed",
      loadClinicalContext,
    );

    window.addEventListener(
      "wonflow:demo-clinical-documentation-changed",
      loadClinicalContext,
    );

    window.addEventListener(
      "storage",
      loadClinicalContext,
    );

    return () => {
      window.removeEventListener(
        "wonflow:demo-clinical-encounters-changed",
        loadClinicalContext,
      );

      window.removeEventListener(
        "wonflow:demo-clinical-documentation-changed",
        loadClinicalContext,
      );

      window.removeEventListener(
        "storage",
        loadClinicalContext,
      );
    };
  }, [loadClinicalContext]);

  if (
    encounter === undefined
  ) {
    return (
      <WonFlowErrorState
        description="The requested clinical encounter could not be found in the local demonstration records."
        title="Encounter not found"
      />
    );
  }

  if (
    documentation ===
      undefined ||
    patient === undefined
  ) {
    return (
      <WonFlowEmptyState
        description="The encounter exists, but its connected patient or documentation could not be loaded."
        title="Clinical context unavailable"
      />
    );
  }

  const practitioner =
    practitioners.find(
      (record) =>
        record.id ===
        encounter.practitionerId,
    );

  const branch =
    branches.find(
      (record) =>
        record.id ===
        encounter.branchId,
    );

  const patientAge =
    getDemoPatientRegistrationAge(
      patient,
    );

  const isCompleted =
    documentation.status ===
      "completed" ||
    encounter.status ===
      "completed";

  function updateDocumentation(
    changes:
      Partial<
        DemoClinicalDocumentation
      >,
  ) {
    setDocumentation(
      (currentRecord) =>
        currentRecord ===
        undefined
          ? currentRecord
          : {
              ...currentRecord,
              ...changes,
            },
    );
  }

  function updateVital(
    field:
      keyof DemoClinicalDocumentation["vitals"],

    value: string,
  ) {
    setDocumentation(
      (currentRecord) =>
        currentRecord ===
        undefined
          ? currentRecord
          : {
              ...currentRecord,

              vitals: {
                ...currentRecord
                  .vitals,

                [field]: value,
              },
            },
    );

    setErrors(
      (currentErrors) => ({
        ...currentErrors,
        vitals: undefined,
      }),
    );
  }

  function updateExamination(
    field:
      keyof DemoClinicalDocumentation["examination"],

    value: string,
  ) {
    setDocumentation(
      (currentRecord) =>
        currentRecord ===
        undefined
          ? currentRecord
          : {
              ...currentRecord,

              examination: {
                ...currentRecord
                  .examination,

                [field]: value,
              },
            },
    );
  }

  function updateAllergy(
    allergyId: string,

    changes:
      Partial<
        DemoClinicalAllergy
      >,
  ) {
    setDocumentation(
      (currentDocumentation) => {
        if (
          currentDocumentation ===
          undefined
        ) {
          return currentDocumentation;
        }

        return {
          ...currentDocumentation,

          allergies:
            currentDocumentation
              .allergies
              .map(
                (allergy) =>
                  allergy.id ===
                  allergyId
                    ? {
                        ...allergy,
                        ...changes,
                      }
                    : allergy,
              ),
        };
      },
    );
  }

  function updateCurrentMedication(
    medicationId: string,

    changes:
      Partial<
        DemoCurrentMedication
      >,
  ) {
    setDocumentation(
      (currentDocumentation) => {
        if (
          currentDocumentation ===
          undefined
        ) {
          return currentDocumentation;
        }

        return {
          ...currentDocumentation,

          currentMedications:
            currentDocumentation
              .currentMedications
              .map(
                (medication) =>
                  medication.id ===
                  medicationId
                    ? {
                        ...medication,
                        ...changes,
                      }
                    : medication,
              ),
        };
      },
    );
  }

  function updateDiagnosis(
    diagnosisId: string,

    changes:
      Partial<
        DemoClinicalDiagnosis
      >,
  ) {
    setDocumentation(
      (currentDocumentation) => {
        if (
          currentDocumentation ===
          undefined
        ) {
          return currentDocumentation;
        }

        return {
          ...currentDocumentation,

          diagnoses:
            currentDocumentation
              .diagnoses
              .map(
                (diagnosis) =>
                  diagnosis.id ===
                  diagnosisId
                    ? {
                        ...diagnosis,
                        ...changes,
                      }
                    : diagnosis,
              ),
        };
      },
    );

    setErrors(
      (currentErrors) => ({
        ...currentErrors,
        diagnoses: undefined,
      }),
    );
  }

  function updateOrder(
    orderId: string,

    changes:
      Partial<
        DemoClinicalOrder
      >,
  ) {
    setDocumentation(
      (currentDocumentation) => {
        if (
          currentDocumentation ===
          undefined
        ) {
          return currentDocumentation;
        }

        return {
          ...currentDocumentation,

          orders:
            currentDocumentation
              .orders
              .map(
                (order) =>
                  order.id ===
                  orderId
                    ? {
                        ...order,
                        ...changes,
                      }
                    : order,
              ),
        };
      },
    );
  }

  function updatePrescription(
    prescriptionId: string,

    changes:
      Partial<
        DemoClinicalPrescriptionItem
      >,
  ) {
    setDocumentation(
      (currentDocumentation) => {
        if (
          currentDocumentation ===
          undefined
        ) {
          return currentDocumentation;
        }

        return {
          ...currentDocumentation,

          prescriptions:
            currentDocumentation
              .prescriptions
              .map(
                (prescription) =>
                  prescription.id ===
                  prescriptionId
                    ? {
                        ...prescription,
                        ...changes,
                      }
                    : prescription,
              ),
        };
      },
    );
  }

  function saveDraft() {
    if (
      documentation ===
      undefined
    ) {
      setActionMessage(
        "Clinical documentation is not available.",
      );

      return;
    }

    const savedRecord =
      saveDemoClinicalDocumentation(
        documentation,
      );

    setDocumentation(
      savedRecord,
    );

    setActionMessage(
      "Clinical consultation draft saved.",
    );
  }

  async function completeConsultation() {
    if (
      documentation ===
        undefined ||
      encounter === undefined
    ) {
      setActionMessage(
        "The clinical encounter or documentation could not be loaded.",
      );

      return;
    }

    const validationErrors =
      validateDemoClinicalDocumentation(
        documentation,
      );

    setErrors(
      validationErrors,
    );

    if (
      Object.keys(
        validationErrors,
      ).length > 0
    ) {
      setActionMessage(
        "Complete the required clinical fields before closing the consultation.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const confirmed =
      await wonflowConfirm({
        title: "Complete consultation",
        message: "The encounter, queue entry and appointment are all marked completed.",
        confirmLabel: "Complete consultation",
        tone: "primary",
      });

    if (!confirmed) {
      return;
    }

    const result =
      finalizeDemoClinicalConsultation(
        documentation,
      );

    if (!result.ok) {
      if (
        result.error ===
        "documentation-invalid"
      ) {
        setErrors(
          result.validationErrors,
        );
        setActionMessage(
          "Complete the required clinical fields before closing the consultation.",
        );
      } else {
        setActionMessage(
          result.error ===
            "queue-entry-not-serving"
            ? "The linked queue record is no longer in consultation. Review Today’s Queue before completing this encounter."
            : "The active encounter is no longer available to complete.",
        );
      }
      return;
    }

    const completedDocumentation =
      result.documentation;

    setDocumentation(
      completedDocumentation,
    );

    loadClinicalContext();

    const completionMessages:
      string[] = [];

    if (
      result
        .dispatchedDiagnosticOrderCount >
      0
    ) {
      completionMessages.push(
        `${result.dispatchedDiagnosticOrderCount} diagnostic order${result.dispatchedDiagnosticOrderCount === 1 ? "" : "s"} dispatched.`,
      );
    }

    if (
      result
        .pharmacyPrescriptionDispatched
    ) {
      completionMessages.push(
        "Prescription dispatched to pharmacy.",
      );
    }

    setActionMessage(
      completionMessages.length ===
      0
        ? "Consultation completed successfully."
        : `Consultation completed. ${completionMessages.join(" ")}`,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <WonFlowActionButton
              disabled={
                isCompleted
              }
              onClick={
                saveDraft
              }
              variant="ghost"
            >
              Save Draft
            </WonFlowActionButton>

            <WonFlowActionButton
              disabled={
                isCompleted
              }
              icon={<CheckIcon />}
              onClick={
                completeConsultation
              }
              variant="primary"
            >
              Complete Consultation
            </WonFlowActionButton>
          </div>
        }
        breadcrumbs={[
          {
            label:
              "Doctor Workspace",
            href: "/doctor",
          },
          {
            label:
              "Consultations",
            href:
              "/doctor/consultations",
          },
          {
            label:
              encounter.encounterNumber,
          },
        ]}
        description="Document the complete patient consultation, assessment, orders, prescription and follow-up plan."
        eyebrow="Electronic Medical Record"
        leading={<ClinicalIcon />}
        metadata={
          <>
            <span
              className={[
                "rounded-full px-2.5",
                "py-1 font-bold ring-1",
                isCompleted
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : "bg-violet-50 text-violet-700 ring-violet-100",
              ].join(" ")}
            >
              {isCompleted
                ? "Completed consultation"
                : "Clinical draft"}
            </span>

            <span>
              {
                encounter
                  .encounterNumber
              }
            </span>
          </>
        }
        title="Clinical Consultation"
      />

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-blue-50 px-4 py-3 text-xs leading-5 text-slate-600">
        <strong className="text-violet-800">
          Demonstration mode:
        </strong>
        {" "}
        Clinical documentation, orders and prescriptions are fictional and stored locally in this browser.
      </div>

      {actionMessage !==
      undefined ? (
        <div
          className={[
            "rounded-2xl border",
            "px-4 py-3",
            "text-sm font-bold",
            isCompleted
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-blue-200 bg-blue-50 text-blue-700",
          ].join(" ")}
        >
          {actionMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/40 shadow-[0_16px_42px_rgba(79,70,229,0.12)]">
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-100 via-violet-50 to-cyan-100 p-5">
          <div className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full bg-cyan-300/30 blur-2xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-base font-black text-white shadow-lg shadow-indigo-500/20">
                {getInitials(
                  patient.displayName,
                )}
              </div>

              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">
                  Active Patient
                </div>

                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {
                    patient.displayName
                  }
                </h2>

                <div className="mt-1 text-xs font-bold text-slate-600">
                  {patient.mrNumber}
                  {" · "}
                  {
                    patient.draft
                      .cnicNumber
                  }
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-600">
                Consultation
              </div>

              <div className="mt-1 text-sm font-black text-slate-950">
                {
                  appointment
                    ?.serviceName ??
                  encounter.serviceName
                }
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem
            label="Father / Guardian"
            value={
              patient.draft
                .fatherName
            }
          />

          <SummaryItem
            label="Gender and Age"
            value={[
              humanizeValue(
                patient.draft
                  .gender,
              ),

              patientAge ===
              undefined
                ? undefined
                : `${patientAge} years`,
            ]
              .filter(Boolean)
              .join(" · ")}
          />

          <SummaryItem
            label="Blood Group"
            value={
              patient.draft
                .bloodGroup ||
              "Not recorded"
            }
          />

          <SummaryItem
            label="Mobile"
            value={
              patient.draft
                .mobileNumber
            }
          />

          <SummaryItem
            label="Doctor"
            value={
              practitioner
                ?.displayName ??
              "Unknown doctor"
            }
          />

          <SummaryItem
            label="Branch"
            value={
              branch?.name ??
              "Unknown branch"
            }
          />

          <SummaryItem
            label="Consultation Room"
            value={
              queueEntry
                ?.roomLabel ??
              encounter.roomLabel ??
              "Not recorded"
            }
          />

          <SummaryItem
            label="Encounter Started"
            value={formatWonFlowDashboardDateTime(
              encounter.startedAt,
            )}
          />
        </div>
      </section>

      <fieldset
        className="space-y-6"
        disabled={isCompleted}
      >
        <WonFlowOperationalPanel
          description="Document the patient’s presenting problem and relevant history."
          icon={<PatientIcon />}
          title="Chief Complaint and Clinical History"
          tone="blue"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              error={
                errors.chiefComplaint
              }
              label="Chief Complaint"
              required
            >
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                onChange={(
                  event,
                ) => {
                  updateDocumentation({
                    chiefComplaint:
                      event.target.value,
                  });

                  setErrors(
                    (
                      currentErrors,
                    ) => ({
                      ...currentErrors,
                      chiefComplaint:
                        undefined,
                    }),
                  );
                }}
                placeholder="Primary symptom or reason for consultation"
                value={
                  documentation
                    .chiefComplaint
                }
              />
            </Field>

            <Field
              error={
                errors
                  .historyOfPresentIllness
              }
              label="History of Present Illness"
              required
            >
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                onChange={(
                  event,
                ) => {
                  updateDocumentation({
                    historyOfPresentIllness:
                      event.target.value,
                  });

                  setErrors(
                    (
                      currentErrors,
                    ) => ({
                      ...currentErrors,
                      historyOfPresentIllness:
                        undefined,
                    }),
                  );
                }}
                placeholder="Onset, duration, severity, progression, associated symptoms and relevant context"
                value={
                  documentation
                    .historyOfPresentIllness
                }
              />
            </Field>

            <Field label="Past Medical History">
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                onChange={(
                  event,
                ) => {
                  updateDocumentation({
                    pastMedicalHistory:
                      event.target.value,
                  });
                }}
                placeholder="Previous diseases, hospitalizations and chronic conditions"
                value={
                  documentation
                    .pastMedicalHistory
                }
              />
            </Field>

            <Field label="Past Surgical History">
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                onChange={(
                  event,
                ) => {
                  updateDocumentation({
                    pastSurgicalHistory:
                      event.target.value,
                  });
                }}
                placeholder="Previous operations or procedures"
                value={
                  documentation
                    .pastSurgicalHistory
                }
              />
            </Field>

            <Field label="Family History">
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                onChange={(
                  event,
                ) => {
                  updateDocumentation({
                    familyHistory:
                      event.target.value,
                  });
                }}
                placeholder="Relevant hereditary or family conditions"
                value={
                  documentation
                    .familyHistory
                }
              />
            </Field>

            <Field label="Social History">
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                onChange={(
                  event,
                ) => {
                  updateDocumentation({
                    socialHistory:
                      event.target.value,
                  });
                }}
                placeholder="Occupation, smoking, substance use, diet, activity and living situation"
                value={
                  documentation
                    .socialHistory
                }
              />
            </Field>
          </div>
        </WonFlowOperationalPanel>

        <WonFlowOperationalPanel
          description="Explicitly distinguish unknown information from confirmed absence."
          icon={<MedicineIcon />}
          title="Allergies and Current Medication"
          tone="amber"
        >
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <Field
                error={
                  errors.allergyStatus
                }
                label="Allergy Status"
                required
              >
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    const status =
                      event.target
                        .value as
                        DemoClinicalDocumentation["allergyStatus"];

                    updateDocumentation({
                      allergyStatus:
                        status,

                      allergies:
                        status ===
                        "documented"
                          ? (
                              documentation
                                .allergies
                                .length >
                              0
                                ? documentation
                                    .allergies
                                : [
                                    createEmptyClinicalAllergy(),
                                  ]
                            )
                          : [],
                    });

                    setErrors(
                      (
                        currentErrors,
                      ) => ({
                        ...currentErrors,
                        allergyStatus:
                          undefined,
                      }),
                    );
                  }}
                  value={
                    documentation
                      .allergyStatus
                  }
                >
                  <option value="unknown">
                    Allergy information unknown
                  </option>

                  <option value="none-known">
                    No known allergies confirmed
                  </option>

                  <option value="documented">
                    Allergies documented
                  </option>
                </select>
              </Field>

              {documentation
                .allergyStatus ===
              "documented" ? (
                <div className="mt-4 space-y-3">
                  {documentation
                    .allergies
                    .map(
                      (
                        allergy,
                      ) => (
                        <div
                          className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4"
                          key={
                            allergy.id
                          }
                        >
                          <div className="grid gap-3 sm:grid-cols-3">
                            <input
                              className={
                                INPUT_CLASS_NAME
                              }
                              onChange={(
                                event,
                              ) => {
                                updateAllergy(
                                  allergy.id,
                                  {
                                    substance:
                                      event
                                        .target
                                        .value,
                                  },
                                );
                              }}
                              placeholder="Allergen"
                              value={
                                allergy.substance
                              }
                            />

                            <input
                              className={
                                INPUT_CLASS_NAME
                              }
                              onChange={(
                                event,
                              ) => {
                                updateAllergy(
                                  allergy.id,
                                  {
                                    reaction:
                                      event
                                        .target
                                        .value,
                                  },
                                );
                              }}
                              placeholder="Reaction"
                              value={
                                allergy.reaction
                              }
                            />

                            <select
                              className={
                                INPUT_CLASS_NAME
                              }
                              onChange={(
                                event,
                              ) => {
                                updateAllergy(
                                  allergy.id,
                                  {
                                    severity:
                                      event
                                        .target
                                        .value as
                                        DemoAllergySeverity,
                                  },
                                );
                              }}
                              value={
                                allergy.severity
                              }
                            >
                              <option value="unknown">
                                Severity unknown
                              </option>

                              <option value="mild">
                                Mild
                              </option>

                              <option value="moderate">
                                Moderate
                              </option>

                              <option value="severe">
                                Severe
                              </option>
                            </select>
                          </div>

                          <button
                            className="mt-3 text-xs font-bold text-rose-600"
                            onClick={() => {
                              updateDocumentation({
                                allergies:
                                  documentation
                                    .allergies
                                    .filter(
                                      (
                                        record,
                                      ) =>
                                        record.id !==
                                        allergy.id,
                                    ),
                              });
                            }}
                            type="button"
                          >
                            Remove Allergy
                          </button>
                        </div>
                      ),
                    )}

                  <button
                    className="min-h-10 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700"
                    onClick={() => {
                      updateDocumentation({
                        allergies: [
                          ...documentation
                            .allergies,

                          createEmptyClinicalAllergy(),
                        ],
                      });
                    }}
                    type="button"
                  >
                    Add Another Allergy
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600 ring-1 ring-slate-100">
                  {documentation
                    .allergyStatus ===
                  "none-known"
                    ? "The clinician has explicitly recorded that no known allergies were reported."
                    : "Allergy information remains unknown and must not be treated as a confirmed negative finding."}
                </div>
              )}
            </div>

            <div>
              <Field
                error={
                  errors
                    .currentMedicationStatus
                }
                label="Current Medication Status"
                required
              >
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    const status =
                      event.target
                        .value as
                        DemoClinicalDocumentation["currentMedicationStatus"];

                    updateDocumentation({
                      currentMedicationStatus:
                        status,

                      currentMedications:
                        status ===
                        "documented"
                          ? (
                              documentation
                                .currentMedications
                                .length >
                              0
                                ? documentation
                                    .currentMedications
                                : [
                                    createEmptyCurrentMedication(),
                                  ]
                            )
                          : [],
                    });

                    setErrors(
                      (
                        currentErrors,
                      ) => ({
                        ...currentErrors,
                        currentMedicationStatus:
                          undefined,
                      }),
                    );
                  }}
                  value={
                    documentation
                      .currentMedicationStatus
                  }
                >
                  <option value="unknown">
                    Medication information unknown
                  </option>

                  <option value="none-known">
                    Patient reports no current medication
                  </option>

                  <option value="documented">
                    Current medicines documented
                  </option>
                </select>
              </Field>

              {documentation
                .currentMedicationStatus ===
              "documented" ? (
                <div className="mt-4 space-y-3">
                  {documentation
                    .currentMedications
                    .map(
                      (
                        medication,
                      ) => (
                        <div
                          className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"
                          key={
                            medication.id
                          }
                        >
                          <div className="grid gap-3 sm:grid-cols-3">
                            <input
                              className={
                                INPUT_CLASS_NAME
                              }
                              onChange={(
                                event,
                              ) => {
                                updateCurrentMedication(
                                  medication.id,
                                  {
                                    medicineName:
                                      event
                                        .target
                                        .value,
                                  },
                                );
                              }}
                              placeholder="Medicine"
                              value={
                                medication
                                  .medicineName
                              }
                            />

                            <input
                              className={
                                INPUT_CLASS_NAME
                              }
                              onChange={(
                                event,
                              ) => {
                                updateCurrentMedication(
                                  medication.id,
                                  {
                                    dose:
                                      event
                                        .target
                                        .value,
                                  },
                                );
                              }}
                              placeholder="Dose"
                              value={
                                medication.dose
                              }
                            />

                            <input
                              className={
                                INPUT_CLASS_NAME
                              }
                              onChange={(
                                event,
                              ) => {
                                updateCurrentMedication(
                                  medication.id,
                                  {
                                    frequency:
                                      event
                                        .target
                                        .value,
                                  },
                                );
                              }}
                              placeholder="Frequency"
                              value={
                                medication
                                  .frequency
                              }
                            />
                          </div>

                          <button
                            className="mt-3 text-xs font-bold text-rose-600"
                            onClick={() => {
                              updateDocumentation({
                                currentMedications:
                                  documentation
                                    .currentMedications
                                    .filter(
                                      (
                                        record,
                                      ) =>
                                        record.id !==
                                        medication.id,
                                    ),
                              });
                            }}
                            type="button"
                          >
                            Remove Medicine
                          </button>
                        </div>
                      ),
                    )}

                  <button
                    className="min-h-10 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700"
                    onClick={() => {
                      updateDocumentation({
                        currentMedications: [
                          ...documentation
                            .currentMedications,

                          createEmptyCurrentMedication(),
                        ],
                      });
                    }}
                    type="button"
                  >
                    Add Current Medicine
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600 ring-1 ring-slate-100">
                  {documentation
                    .currentMedicationStatus ===
                  "none-known"
                    ? "The patient reports no current medication."
                    : "Current medication information remains unknown."}
                </div>
              )}
            </div>
          </div>
        </WonFlowOperationalPanel>

        <WonFlowOperationalPanel
          description="Record available patient measurements without assuming missing values are normal."
          icon={<HeartIcon />}
          title="Vital Signs"
          tone="emerald"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <VitalField
              label="Temperature"
              onChange={(
                value,
              ) => {
                updateVital(
                  "temperatureCelsius",
                  value,
                );
              }}
              placeholder="°C"
              value={
                documentation.vitals
                  .temperatureCelsius
              }
            />

            <VitalField
              label="Pulse"
              onChange={(
                value,
              ) => {
                updateVital(
                  "pulsePerMinute",
                  value,
                );
              }}
              placeholder="beats/min"
              value={
                documentation.vitals
                  .pulsePerMinute
              }
            />

            <VitalField
              label="Respiratory Rate"
              onChange={(
                value,
              ) => {
                updateVital(
                  "respiratoryRatePerMinute",
                  value,
                );
              }}
              placeholder="breaths/min"
              value={
                documentation.vitals
                  .respiratoryRatePerMinute
              }
            />

            <VitalField
              label="Systolic BP"
              onChange={(
                value,
              ) => {
                updateVital(
                  "systolicBloodPressure",
                  value,
                );
              }}
              placeholder="mmHg"
              value={
                documentation.vitals
                  .systolicBloodPressure
              }
            />

            <VitalField
              label="Diastolic BP"
              onChange={(
                value,
              ) => {
                updateVital(
                  "diastolicBloodPressure",
                  value,
                );
              }}
              placeholder="mmHg"
              value={
                documentation.vitals
                  .diastolicBloodPressure
              }
            />

            <VitalField
              label="Oxygen Saturation"
              onChange={(
                value,
              ) => {
                updateVital(
                  "oxygenSaturationPercent",
                  value,
                );
              }}
              placeholder="%"
              value={
                documentation.vitals
                  .oxygenSaturationPercent
              }
            />

            <VitalField
              label="Weight"
              onChange={(
                value,
              ) => {
                updateVital(
                  "weightKilograms",
                  value,
                );
              }}
              placeholder="kg"
              value={
                documentation.vitals
                  .weightKilograms
              }
            />

            <VitalField
              label="Height"
              onChange={(
                value,
              ) => {
                updateVital(
                  "heightCentimeters",
                  value,
                );
              }}
              placeholder="cm"
              value={
                documentation.vitals
                  .heightCentimeters
              }
            />

            <VitalField
              label="Pain Score"
              max="10"
              onChange={(
                value,
              ) => {
                updateVital(
                  "painScore",
                  value,
                );
              }}
              placeholder="0–10"
              value={
                documentation.vitals
                  .painScore
              }
            />
          </div>

          {errors.vitals !==
          undefined ? (
            <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 ring-1 ring-rose-100">
              {errors.vitals}
            </div>
          ) : null}
        </WonFlowOperationalPanel>

        <WonFlowOperationalPanel
          description="Document relevant physical-examination findings by body system."
          icon={<ClinicalIcon />}
          title="Physical Examination"
          tone="violet"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <ExaminationField
              label="General Appearance"
              onChange={(
                value,
              ) => {
                updateExamination(
                  "generalAppearance",
                  value,
                );
              }}
              value={
                documentation
                  .examination
                  .generalAppearance
              }
            />

            <ExaminationField
              label="Cardiovascular"
              onChange={(
                value,
              ) => {
                updateExamination(
                  "cardiovascular",
                  value,
                );
              }}
              value={
                documentation
                  .examination
                  .cardiovascular
              }
            />

            <ExaminationField
              label="Respiratory"
              onChange={(
                value,
              ) => {
                updateExamination(
                  "respiratory",
                  value,
                );
              }}
              value={
                documentation
                  .examination
                  .respiratory
              }
            />

            <ExaminationField
              label="Abdominal"
              onChange={(
                value,
              ) => {
                updateExamination(
                  "abdomen",
                  value,
                );
              }}
              value={
                documentation
                  .examination
                  .abdomen
              }
            />

            <ExaminationField
              label="Neurological"
              onChange={(
                value,
              ) => {
                updateExamination(
                  "neurological",
                  value,
                );
              }}
              value={
                documentation
                  .examination
                  .neurological
              }
            />

            <ExaminationField
              label="Musculoskeletal"
              onChange={(
                value,
              ) => {
                updateExamination(
                  "musculoskeletal",
                  value,
                );
              }}
              value={
                documentation
                  .examination
                  .musculoskeletal
              }
            />

            <ExaminationField
              label="ENT"
              onChange={(
                value,
              ) => {
                updateExamination(
                  "ent",
                  value,
                );
              }}
              value={
                documentation
                  .examination
                  .ent
              }
            />

            <ExaminationField
              label="Skin"
              onChange={(
                value,
              ) => {
                updateExamination(
                  "skin",
                  value,
                );
              }}
              value={
                documentation
                  .examination
                  .skin
              }
            />

            <div className="lg:col-span-2">
              <ExaminationField
                label="Other Findings"
                onChange={(
                  value,
                ) => {
                  updateExamination(
                    "otherFindings",
                    value,
                  );
                }}
                value={
                  documentation
                    .examination
                    .otherFindings
                }
              />
            </div>
          </div>
        </WonFlowOperationalPanel>

        <WonFlowOperationalPanel
          description="Record provisional, differential or confirmed diagnoses."
          icon={<DiagnosisIcon />}
          title="Clinical Assessment and Diagnosis"
          tone="blue"
        >
          {documentation
            .diagnoses.length ===
          0 ? (
            <WonFlowEmptyState
              description="Add at least one diagnosis before completing the consultation."
              title="No diagnosis recorded"
            />
          ) : (
            <div className="space-y-3">
              {documentation
                .diagnoses
                .map(
                  (
                    diagnosis,
                  ) => (
                    <div
                      className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4"
                      key={
                        diagnosis.id
                      }
                    >
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_180px_180px]">
                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updateDiagnosis(
                              diagnosis.id,
                              {
                                diagnosis:
                                  event
                                    .target
                                    .value,
                              },
                            );
                          }}
                          placeholder="Diagnosis"
                          value={
                            diagnosis
                              .diagnosis
                          }
                        />

                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updateDiagnosis(
                              diagnosis.id,
                              {
                                icdCode:
                                  event
                                    .target
                                    .value,
                              },
                            );
                          }}
                          placeholder="ICD code"
                          value={
                            diagnosis
                              .icdCode
                          }
                        />

                        <select
                          className={
                            INPUT_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updateDiagnosis(
                              diagnosis.id,
                              {
                                type:
                                  event
                                    .target
                                    .value as
                                    DemoDiagnosisType,
                              },
                            );
                          }}
                          value={
                            diagnosis.type
                          }
                        >
                          <option value="provisional">
                            Provisional
                          </option>

                          <option value="differential">
                            Differential
                          </option>

                          <option value="confirmed">
                            Confirmed
                          </option>
                        </select>
                      </div>

                      <textarea
                        className={[
                          TEXTAREA_CLASS_NAME,
                          "mt-3 min-h-20",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          updateDiagnosis(
                            diagnosis.id,
                            {
                              notes:
                                event
                                  .target
                                  .value,
                            },
                          );
                        }}
                        placeholder="Diagnosis notes or supporting findings"
                        value={
                          diagnosis.notes
                        }
                      />

                      <button
                        className="mt-3 text-xs font-bold text-rose-600"
                        onClick={() => {
                          updateDocumentation({
                            diagnoses:
                              documentation
                                .diagnoses
                                .filter(
                                  (
                                    record,
                                  ) =>
                                    record.id !==
                                    diagnosis.id,
                                ),
                          });
                        }}
                        type="button"
                      >
                        Remove Diagnosis
                      </button>
                    </div>
                  ),
                )}
            </div>
          )}

          {errors.diagnoses !==
          undefined ? (
            <div className="mt-4 text-xs font-bold text-rose-600">
              {errors.diagnoses}
            </div>
          ) : null}

          <button
            className="mt-4 min-h-10 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
            onClick={() => {
              updateDocumentation({
                diagnoses: [
                  ...documentation
                    .diagnoses,

                  createEmptyClinicalDiagnosis(),
                ],
              });
            }}
            type="button"
          >
            Add Diagnosis
          </button>
        </WonFlowOperationalPanel>

        <WonFlowOperationalPanel
          description="Create investigation, procedure and referral requests connected to the encounter."
          icon={<ClinicalIcon />}
          title="Clinical Orders"
          tone="amber"
        >
          {documentation.orders.length ===
          0 ? (
            <WonFlowEmptyState
              description="No laboratory, radiology, procedure or referral orders have been added."
              title="No clinical orders"
            />
          ) : (
            <div className="space-y-3">
              {documentation.orders.map(
                (order) => (
                  <div
                    className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4"
                    key={order.id}
                  >
                    <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_150px]">
                      <select
                        className={
                          INPUT_CLASS_NAME
                        }
                        onChange={(
                          event,
                        ) => {
                          updateOrder(
                            order.id,
                            {
                              type:
                                event.target
                                  .value as
                                  DemoClinicalOrder["type"],
                            },
                          );
                        }}
                        value={order.type}
                      >
                        <option value="laboratory">
                          Laboratory
                        </option>

                        <option value="radiology">
                          Radiology
                        </option>

                        <option value="procedure">
                          Procedure
                        </option>

                        <option value="referral">
                          Referral
                        </option>
                      </select>

                      <input
                        className={
                          INPUT_CLASS_NAME
                        }
                        onChange={(
                          event,
                        ) => {
                          updateOrder(
                            order.id,
                            {
                              orderName:
                                event.target
                                  .value,
                            },
                          );
                        }}
                        placeholder="Test, imaging study, procedure or specialty"
                        value={
                          order.orderName
                        }
                      />

                      <select
                        className={
                          INPUT_CLASS_NAME
                        }
                        onChange={(
                          event,
                        ) => {
                          updateOrder(
                            order.id,
                            {
                              priority:
                                event.target
                                  .value as
                                  DemoClinicalOrder["priority"],
                            },
                          );
                        }}
                        value={
                          order.priority
                        }
                      >
                        <option value="routine">
                          Routine
                        </option>

                        <option value="urgent">
                          Urgent
                        </option>
                      </select>
                    </div>

                    <textarea
                      className={[
                        TEXTAREA_CLASS_NAME,
                        "mt-3 min-h-20",
                      ].join(" ")}
                      onChange={(
                        event,
                      ) => {
                        updateOrder(
                          order.id,
                          {
                            instructions:
                              event.target
                                .value,
                          },
                        );
                      }}
                      placeholder="Clinical indication or special instructions"
                      value={
                        order.instructions
                      }
                    />

                    <button
                      className="mt-3 text-xs font-bold text-rose-600"
                      onClick={() => {
                        updateDocumentation({
                          orders:
                            documentation
                              .orders
                              .filter(
                                (
                                  record,
                                ) =>
                                  record.id !==
                                  order.id,
                              ),
                        });
                      }}
                      type="button"
                    >
                      Remove Order
                    </button>
                  </div>
                ),
              )}
            </div>
          )}

          <button
            className="mt-4 min-h-10 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white"
            onClick={() => {
              updateDocumentation({
                orders: [
                  ...documentation.orders,

                  createEmptyClinicalOrder(),
                ],
              });
            }}
            type="button"
          >
            Add Clinical Order
          </button>
        </WonFlowOperationalPanel>

        <WonFlowOperationalPanel
          description="Record medicines prescribed during this consultation."
          icon={<MedicineIcon />}
          title="Prescription"
          tone="violet"
        >
          {documentation
            .prescriptions
            .length === 0 ? (
            <WonFlowEmptyState
              description="No medicine has been prescribed for this encounter."
              title="No prescription items"
            />
          ) : (
            <div className="space-y-3">
              {documentation
                .prescriptions
                .map(
                  (
                    prescription,
                  ) => (
                    <div
                      className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4"
                      key={
                        prescription.id
                      }
                    >
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePrescription(
                              prescription.id,
                              {
                                medicineName:
                                  event
                                    .target
                                    .value,
                              },
                            );
                          }}
                          placeholder="Medicine name"
                          value={
                            prescription
                              .medicineName
                          }
                        />

                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePrescription(
                              prescription.id,
                              {
                                strength:
                                  event
                                    .target
                                    .value,
                              },
                            );
                          }}
                          placeholder="Strength"
                          value={
                            prescription
                              .strength
                          }
                        />

                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePrescription(
                              prescription.id,
                              {
                                dosage:
                                  event
                                    .target
                                    .value,
                              },
                            );
                          }}
                          placeholder="Dosage"
                          value={
                            prescription
                              .dosage
                          }
                        />

                        <select
                          className={
                            INPUT_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePrescription(
                              prescription.id,
                              {
                                route:
                                  event
                                    .target
                                    .value as
                                    DemoMedicationRoute,
                              },
                            );
                          }}
                          value={
                            prescription.route
                          }
                        >
                          <option value="oral">
                            Oral
                          </option>

                          <option value="intravenous">
                            Intravenous
                          </option>

                          <option value="intramuscular">
                            Intramuscular
                          </option>

                          <option value="subcutaneous">
                            Subcutaneous
                          </option>

                          <option value="topical">
                            Topical
                          </option>

                          <option value="inhalation">
                            Inhalation
                          </option>

                          <option value="sublingual">
                            Sublingual
                          </option>

                          <option value="rectal">
                            Rectal
                          </option>

                          <option value="other">
                            Other
                          </option>
                        </select>

                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePrescription(
                              prescription.id,
                              {
                                frequency:
                                  event
                                    .target
                                    .value,
                              },
                            );
                          }}
                          placeholder="Frequency"
                          value={
                            prescription
                              .frequency
                          }
                        />

                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePrescription(
                              prescription.id,
                              {
                                duration:
                                  event
                                    .target
                                    .value,
                              },
                            );
                          }}
                          placeholder="Duration"
                          value={
                            prescription
                              .duration
                          }
                        />

                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePrescription(
                              prescription.id,
                              {
                                quantity:
                                  event
                                    .target
                                    .value,
                              },
                            );
                          }}
                          placeholder="Quantity"
                          value={
                            prescription
                              .quantity
                          }
                        />

                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          onChange={(
                            event,
                          ) => {
                            updatePrescription(
                              prescription.id,
                              {
                                instructions:
                                  event
                                    .target
                                    .value,
                              },
                            );
                          }}
                          placeholder="Special instructions"
                          value={
                            prescription
                              .instructions
                          }
                        />
                      </div>

                      <button
                        className="mt-3 text-xs font-bold text-rose-600"
                        onClick={() => {
                          updateDocumentation({
                            prescriptions:
                              documentation
                                .prescriptions
                                .filter(
                                  (
                                    record,
                                  ) =>
                                    record.id !==
                                    prescription.id,
                                ),
                          });
                        }}
                        type="button"
                      >
                        Remove Medicine
                      </button>
                    </div>
                  ),
                )}
            </div>
          )}

          <button
            className="mt-4 min-h-10 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white"
            onClick={() => {
              updateDocumentation({
                prescriptions: [
                  ...documentation
                    .prescriptions,

                  createEmptyPrescriptionItem(),
                ],
              });
            }}
            type="button"
          >
            Add Prescription Medicine
          </button>
        </WonFlowOperationalPanel>

        <WonFlowOperationalPanel
          description="Record patient instructions, warning signs and the required follow-up."
          icon={<CheckIcon />}
          title="Advice and Follow-Up"
          tone="emerald"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Clinical Advice">
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                onChange={(
                  event,
                ) => {
                  updateDocumentation({
                    clinicalAdvice:
                      event.target.value,
                  });
                }}
                placeholder="Diet, activity, medication advice, warning signs and other patient instructions"
                value={
                  documentation
                    .clinicalAdvice
                }
              />
            </Field>

            <Field
              error={
                errors.followUpPlan
              }
              helperText="Record a follow-up date, condition or explicitly state that no follow-up is required."
              label="Follow-Up Plan"
              required
            >
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                onChange={(
                  event,
                ) => {
                  updateDocumentation({
                    followUpPlan:
                      event.target.value,
                  });

                  setErrors(
                    (
                      currentErrors,
                    ) => ({
                      ...currentErrors,
                      followUpPlan:
                        undefined,
                    }),
                  );
                }}
                placeholder="Follow-up in 7 days, return after investigations, or no follow-up required"
                value={
                  documentation
                    .followUpPlan
                }
              />
            </Field>
          </div>
        </WonFlowOperationalPanel>
      </fieldset>

      {isCompleted ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <CheckIcon />
            </div>

            <div>
              <h2 className="text-xl font-black text-emerald-950">
                Consultation completed
              </h2>

              <p className="mt-2 text-sm leading-6 text-emerald-700">
                The clinical documentation, encounter, queue record and appointment have been marked completed.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white"
                  href="/doctor/consultations"
                >
                  Return to Doctor Queue
                </Link>

                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-700"
                  href={`/operations/billing/new?patientId=${encodeURIComponent(
                    patient.id,
                  )}`}
                >
                  Open Patient Billing
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="wf-sticky-actions flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-black text-slate-900">
              Clinical documentation remains a draft
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Save regularly. Complete only after reviewing the diagnosis, orders, prescription and follow-up.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <WonFlowActionButton
              onClick={
                saveDraft
              }
              variant="ghost"
            >
              Save Draft
            </WonFlowActionButton>

            <WonFlowActionButton
              icon={<CheckIcon />}
              onClick={
                completeConsultation
              }
              variant="primary"
            >
              Complete Consultation
            </WonFlowActionButton>
          </div>
        </div>
      )}
    </div>
  );
}

function VitalField({
  label,
  value,
  placeholder,
  max,
  onChange,
}: {
  label: string;
  value: string;

  placeholder: string;

  max?: string;

  onChange:
    (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <input
        className={[
          INPUT_CLASS_NAME,
          "mt-1.5",
        ].join(" ")}
        inputMode="decimal"
        max={max}
        min="0"
        onChange={(
          event,
        ) => {
          onChange(
            event.target.value,
          );
        }}
        placeholder={placeholder}
        step="any"
        type="number"
        value={value}
      />
    </label>
  );
}

function ExaminationField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;

  onChange:
    (value: string) => void;
}) {
  return (
    <Field label={label}>
      <textarea
        className={
          TEXTAREA_CLASS_NAME
        }
        onChange={(
          event,
        ) => {
          onChange(
            event.target.value,
          );
        }}
        placeholder={`${label} findings`}
        value={value}
      />
    </Field>
  );
}

interface ClinicalConsultationDocumentationProps {
  encounterId: string;
}

export function ClinicalConsultationDocumentation({
  encounterId,
}: ClinicalConsultationDocumentationProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        `clinical-documentation:${encounterId}`,

      loader:
        async (
          signal,
        ) => {
          const [
            branches,
            practitioners,
          ] = await Promise.all([
            hospitalService
              .listBranches(
                signal,
              ),

            hospitalService
              .listPractitioners(
                {
                  limit: 100,
                },
                signal,
              ),
          ]);

          return {
            branches,

            practitioners:
              practitioners.items,
          };
        },

      isEmpty:
        (directory) =>
          directory
            .branches
            .length === 0 ||
          directory
            .practitioners
            .length === 0,
    });

  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital branch or practitioner information is unavailable."
      emptyTitle="Clinical documentation unavailable"
      loadingDescription="WonFlow is preparing the patient encounter and clinical workspace."
      loadingTitle="Preparing clinical consultation"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <ClinicalConsultationContent
          branches={
            directory.branches
          }
          encounterId={
            encounterId
          }
          practitioners={
            directory.practitioners
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}
