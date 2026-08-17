"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  BedDouble,
  ClipboardPlus,
  FileClock,
  FileText,
  HeartPulse,
  Plus,
  Search,
  Stethoscope,
  Trash2,
} from "lucide-react";

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
} from "@/components/feedback";

import {
  WonFlowActionButton,
  WonFlowKpiCard,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  wonFlowInputClassName,
  wonFlowTextareaClassName,
} from "@/components/workflow";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  buildDemoInpatientDoctorRoundSummary,
  buildDemoNursingCareSummary,
  buildDemoNursingFluidSummary,
  cancelDemoInpatientDoctorDischargeOrder,
  createEmptyDemoInpatientDiagnosisUpdate,
  createEmptyDemoInpatientTreatmentOrder,
  createOrGetDemoInpatientDoctorRound,
  finalizeDemoInpatientDoctorRound,
  getActiveDemoInpatientDoctorDischargeOrder,
  placeDemoInpatientDoctorDischargeOrder,
  readDemoInpatientAdmissions,
  readDemoInpatientBeds,
  readDemoInpatientDoctorDischargeOrders,
  readDemoInpatientDoctorRounds,
  readDemoInpatientWards,
  readDemoNursingMedicationAdministrations,
  readDemoNursingVitalObservations,
  saveDemoInpatientDoctorRound,
  validateDemoInpatientDoctorDischargeOrder,
  validateDemoInpatientDoctorRound,
} from "@/lib/inpatient";

import type {
  DemoInpatientAdmission,
  DemoInpatientBed,
  DemoInpatientDiagnosisCategory,
  DemoInpatientDiagnosisStatus,
  DemoInpatientDoctorDischargeOrder,
  DemoInpatientDoctorRound,
  DemoInpatientEscalationLevel,
  DemoInpatientRoundType,
  DemoInpatientTreatmentOrderPriority,
  DemoInpatientTreatmentOrderStatus,
  DemoInpatientTreatmentOrderType,
  DemoInpatientWard,
} from "@/lib/inpatient";

import {
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import {
  formatWonFlowDashboardDateTime,
} from "@/lib/dashboard";

type DoctorInpatientView =
  | "progress-note"
  | "round-history"
  | "discharge-order";

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

function getTodayDate():
  string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function cloneRound(
  round:
    DemoInpatientDoctorRound,
): DemoInpatientDoctorRound {
  return {
    ...round,

    diagnoses:
      round.diagnoses.map(
        (diagnosis) => ({
          ...diagnosis,
        }),
      ),

    treatmentOrders:
      round.treatmentOrders.map(
        (order) => ({
          ...order,
        }),
      ),
  };
}

interface DoctorInpatientRoundsContentProps {
  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function DoctorInpatientRoundsContent({
  branches,
  practitioners,
}: DoctorInpatientRoundsContentProps) {
  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    admissions,
    setAdmissions,
  ] = useState<
    DemoInpatientAdmission[]
  >([]);

  const [
    beds,
    setBeds,
  ] = useState<
    DemoInpatientBed[]
  >([]);

  const [
    wards,
    setWards,
  ] = useState<
    DemoInpatientWard[]
  >([]);

  const [
    rounds,
    setRounds,
  ] = useState<
    DemoInpatientDoctorRound[]
  >([]);

  const [
    dischargeOrders,
    setDischargeOrders,
  ] = useState<
    DemoInpatientDoctorDischargeOrder[]
  >([]);

  const [
    view,
    setView,
  ] = useState<DoctorInpatientView>(
    "progress-note",
  );

  const [
    selectedAdmissionId,
    setSelectedAdmissionId,
  ] = useState("");

  const [
    selectedPractitionerId,
    setSelectedPractitionerId,
  ] = useState("");

  const [
    patientSearch,
    setPatientSearch,
  ] = useState("");

  const [
    roundType,
    setRoundType,
  ] = useState<
    DemoInpatientRoundType
  >("morning");

  const [
    roundDraft,
    setRoundDraft,
  ] = useState<
    DemoInpatientDoctorRound |
    undefined
  >();

  const [
    plannedDischargeDate,
    setPlannedDischargeDate,
  ] = useState(
    getTodayDate,
  );

  const [
    finalDiagnosis,
    setFinalDiagnosis,
  ] = useState("");

  const [
    conditionAtDischarge,
    setConditionAtDischarge,
  ] = useState("");

  const [
    dischargeMedicationPlan,
    setDischargeMedicationPlan,
  ] = useState("");

  const [
    dischargeInstructions,
    setDischargeInstructions,
  ] = useState("");

  const [
    dischargeFollowUpPlan,
    setDischargeFollowUpPlan,
  ] = useState("");

  const [
    dischargeCancellationReason,
    setDischargeCancellationReason,
  ] = useState("");

  const [
    validationErrors,
    setValidationErrors,
  ] = useState<string[]>([]);

  const [
    actionMessage,
    setActionMessage,
  ] = useState<
    string |
    undefined
  >();

  const reloadLocalData =
    useCallback(() => {
      setPatients(
        readDemoPatientRegistrations(),
      );

      setAdmissions(
        readDemoInpatientAdmissions(),
      );

      setBeds(
        readDemoInpatientBeds(),
      );

      setWards(
        readDemoInpatientWards(),
      );

      setRounds(
        readDemoInpatientDoctorRounds(),
      );

      setDischargeOrders(
        readDemoInpatientDoctorDischargeOrders(),
      );
    }, []);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    const eventNames = [
      "wonflow:demo-inpatient-admissions-changed",
      "wonflow:demo-inpatient-beds-changed",
      "wonflow:demo-inpatient-doctor-rounds-changed",
      "wonflow:demo-inpatient-doctor-discharge-orders-changed",
      "wonflow:demo-nursing-vitals-changed",
      "wonflow:demo-nursing-fluids-changed",
      "wonflow:demo-nursing-medications-changed",
      "storage",
    ];

    eventNames.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          reloadLocalData,
        );
      },
    );

    return () => {
      eventNames.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            reloadLocalData,
          );
        },
      );
    };
  }, [reloadLocalData]);

  const activeAdmissions =
    useMemo(
      () =>
        admissions
          .filter(
            (admission) =>
              admission.status ===
                "admitted" ||
              admission.status ===
                "discharge-ready",
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.admittedAt,
              ).getTime() -
              new Date(
                left.admittedAt,
              ).getTime(),
          ),
      [admissions],
    );

  const patientsById =
    useMemo(
      () =>
        new Map(
          patients.map(
            (patient) => [
              patient.id,
              patient,
            ],
          ),
        ),
      [patients],
    );

  const bedsById =
    useMemo(
      () =>
        new Map(
          beds.map(
            (bed) => [
              bed.id,
              bed,
            ],
          ),
        ),
      [beds],
    );

  const wardsById =
    useMemo(
      () =>
        new Map(
          wards.map(
            (ward) => [
              ward.id,
              ward,
            ],
          ),
        ),
      [wards],
    );

  const branchesById =
    useMemo(
      () =>
        new Map(
          branches.map(
            (branch) => [
              branch.id,
              branch,
            ],
          ),
        ),
      [branches],
    );

  const practitionersById =
    useMemo(
      () =>
        new Map(
          practitioners.map(
            (practitioner) => [
              practitioner.id,
              practitioner,
            ],
          ),
        ),
      [practitioners],
    );

  const normalizedSearch =
    patientSearch
      .trim()
      .toLocaleLowerCase();

  const visibleAdmissions =
    activeAdmissions.filter(
      (admission) => {
        if (
          normalizedSearch ===
          ""
        ) {
          return true;
        }

        const patient =
          patientsById.get(
            admission.patientId,
          );

        const bed =
          bedsById.get(
            admission.currentBedId,
          );

        const ward =
          bed === undefined
            ? undefined
            : wardsById.get(
                bed.wardId,
              );

        return [
          admission.admissionNumber,
          patient?.displayName ?? "",
          patient?.mrNumber ?? "",
          patient?.draft
            .cnicNumber ?? "",
          bed?.bedLabel ?? "",
          ward?.wardName ?? "",
          admission
            .provisionalDiagnosis,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(
            normalizedSearch,
          );
      },
    );

  const selectedAdmission =
    activeAdmissions.find(
      (admission) =>
        admission.id ===
        selectedAdmissionId,
    ) ??
    visibleAdmissions[0];

  const selectedPatient =
    selectedAdmission ===
    undefined
      ? undefined
      : patientsById.get(
          selectedAdmission.patientId,
        );

  const selectedBed =
    selectedAdmission ===
    undefined
      ? undefined
      : bedsById.get(
          selectedAdmission.currentBedId,
        );

  const selectedWard =
    selectedBed === undefined
      ? undefined
      : wardsById.get(
          selectedBed.wardId,
        );

  const selectedBranch =
    selectedAdmission ===
    undefined
      ? undefined
      : branchesById.get(
          selectedAdmission.branchId,
        );

  const selectedAdmittingDoctor =
    selectedAdmission ===
    undefined
      ? undefined
      : practitionersById.get(
          selectedAdmission.practitionerId,
        );

  const selectedRounds =
    selectedAdmission ===
    undefined
      ? []
      : rounds
          .filter(
            (round) =>
              round.admissionId ===
              selectedAdmission.id,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.finalizedAt ||
                  right.updatedAt,
              ).getTime() -
              new Date(
                left.finalizedAt ||
                  left.updatedAt,
              ).getTime(),
          );

  const selectedDischargeOrder =
    selectedAdmission ===
    undefined
      ? undefined
      : dischargeOrders.find(
          (order) =>
            order.admissionId ===
              selectedAdmission.id &&
            order.status ===
              "ordered",
        );

  const doctorRoundSummary =
    selectedAdmission ===
    undefined
      ? undefined
      : buildDemoInpatientDoctorRoundSummary(
          selectedAdmission.id,
        );

  const nursingSummary =
    selectedAdmission ===
    undefined
      ? undefined
      : buildDemoNursingCareSummary(
          selectedAdmission.id,
        );

  const fluidSummary =
    selectedAdmission ===
    undefined
      ? undefined
      : buildDemoNursingFluidSummary(
          selectedAdmission.id,
        );

  const latestVital =
    selectedAdmission ===
    undefined
      ? undefined
      : readDemoNursingVitalObservations()
          .filter(
            (observation) =>
              observation.admissionId ===
              selectedAdmission.id,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.observedAt,
              ).getTime() -
              new Date(
                left.observedAt,
              ).getTime(),
          )[0];

  const activeMedicationCount =
    selectedAdmission ===
    undefined
      ? 0
      : readDemoNursingMedicationAdministrations()
          .filter(
            (medication) =>
              medication.admissionId ===
                selectedAdmission.id &&
              medication.status ===
                "scheduled",
          )
          .length;

  useEffect(() => {
    if (
      selectedAdmission ===
      undefined
    ) {
      return;
    }

    queueMicrotask(() => {
      const order =
        getActiveDemoInpatientDoctorDischargeOrder(
          selectedAdmission.id,
        );

      setPlannedDischargeDate(
        order
          ?.plannedDischargeDate ??
        getTodayDate(),
      );

      setFinalDiagnosis(
        order?.finalDiagnosis ??
        selectedAdmission
          .dischargeReadiness
          .finalDiagnosis ??
        "",
      );

      setConditionAtDischarge(
        order?.conditionAtDischarge ??
        "",
      );

      setDischargeMedicationPlan(
        order?.medicationPlan ??
        "",
      );

      setDischargeInstructions(
        order?.dischargeInstructions ??
        selectedAdmission
          .dischargeReadiness
          .dischargeInstructions ??
        "",
      );

      setDischargeFollowUpPlan(
        order?.followUpPlan ??
        selectedAdmission
          .dischargeReadiness
          .followUpPlan ??
        "",
      );

      setDischargeCancellationReason("");
      setRoundDraft(undefined);
      setValidationErrors([]);
    });
  }, [selectedAdmission?.id]);

  function selectAdmission(
    admissionId: string,
  ) {
    setSelectedAdmissionId(
      admissionId,
    );

    setRoundDraft(undefined);
    setValidationErrors([]);
    setActionMessage(undefined);
  }

  function startOrResumeRound() {
    if (
      selectedAdmission ===
        undefined ||
      selectedPractitionerId ===
        ""
    ) {
      setActionMessage(
        "Select the inpatient and responsible doctor.",
      );

      return;
    }

    const round =
      createOrGetDemoInpatientDoctorRound({
        admissionId:
          selectedAdmission.id,

        practitionerId:
          selectedPractitionerId,

        roundType,
      });

    if (
      round === undefined
    ) {
      setActionMessage(
        "The doctor round could not be started.",
      );

      return;
    }

    setRoundDraft(
      cloneRound(round),
    );

    reloadLocalData();

    setActionMessage(
      `${round.roundNumber} is ready for documentation.`,
    );
  }

  function updateRound(
    changes:
      Partial<
        DemoInpatientDoctorRound
      >,
  ) {
    setRoundDraft(
      (currentRound) =>
        currentRound ===
        undefined
          ? currentRound
          : {
              ...currentRound,
              ...changes,
            },
    );

    setValidationErrors([]);
  }

  function updateDiagnosis(
    diagnosisId: string,

    changes:
      Partial<
        DemoInpatientDoctorRound["diagnoses"][number]
      >,
  ) {
    setRoundDraft(
      (currentRound) =>
        currentRound ===
        undefined
          ? currentRound
          : {
              ...currentRound,

              diagnoses:
                currentRound.diagnoses.map(
                  (diagnosis) =>
                    diagnosis.id ===
                    diagnosisId
                      ? {
                          ...diagnosis,
                          ...changes,
                        }
                      : diagnosis,
                ),
            },
    );

    setValidationErrors([]);
  }

  function updateTreatmentOrder(
    orderId: string,

    changes:
      Partial<
        DemoInpatientDoctorRound["treatmentOrders"][number]
      >,
  ) {
    setRoundDraft(
      (currentRound) =>
        currentRound ===
        undefined
          ? currentRound
          : {
              ...currentRound,

              treatmentOrders:
                currentRound
                  .treatmentOrders
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
            },
    );

    setValidationErrors([]);
  }

  function saveRoundDraft() {
    if (
      roundDraft === undefined
    ) {
      return;
    }

    const savedRound =
      saveDemoInpatientDoctorRound(
        roundDraft,
      );

    if (
      savedRound === undefined
    ) {
      setActionMessage(
        "The progress-note draft could not be saved.",
      );

      return;
    }

    setRoundDraft(
      cloneRound(
        savedRound,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Doctor progress-note draft saved.",
    );
  }

  function finalizeRound() {
    if (
      roundDraft === undefined
    ) {
      return;
    }

    const errors =
      validateDemoInpatientDoctorRound(
        roundDraft,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required doctor progress-note information.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Finalize this inpatient progress note? Finalized clinical notes cannot be edited.",
      );

    if (!confirmed) {
      return;
    }

    const finalizedRound =
      finalizeDemoInpatientDoctorRound(
        roundDraft,
      );

    if (
      finalizedRound ===
      undefined
    ) {
      setActionMessage(
        "The progress note could not be finalized.",
      );

      return;
    }

    setRoundDraft(
      cloneRound(
        finalizedRound,
      ),
    );

    reloadLocalData();

    setView("round-history");

    setActionMessage(
      `${finalizedRound.roundNumber} finalized successfully.`,
    );
  }

  function placeDischargeOrder() {
    if (
      selectedAdmission ===
        undefined
    ) {
      return;
    }

    const input = {
      admissionId:
        selectedAdmission.id,

      practitionerId:
        selectedPractitionerId,

      plannedDischargeDate,

      finalDiagnosis,

      conditionAtDischarge,

      medicationPlan:
        dischargeMedicationPlan,

      dischargeInstructions,

      followUpPlan:
        dischargeFollowUpPlan,
    };

    const errors =
      validateDemoInpatientDoctorDischargeOrder(
        input,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required doctor discharge-order information.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Place the doctor discharge order and mark doctor clearance complete?",
      );

    if (!confirmed) {
      return;
    }

    const order =
      placeDemoInpatientDoctorDischargeOrder(
        input,
      );

    if (
      order === undefined
    ) {
      setActionMessage(
        "The doctor discharge order could not be placed.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      `${order.orderNumber} placed successfully. Nursing and billing clearance are still required.`,
    );
  }

  function cancelDischargeOrder() {
    if (
      selectedDischargeOrder ===
      undefined
    ) {
      return;
    }

    const cancelledOrder =
      cancelDemoInpatientDoctorDischargeOrder({
        orderId:
          selectedDischargeOrder.id,

        cancellationReason:
          dischargeCancellationReason,
      });

    if (
      cancelledOrder ===
      undefined
    ) {
      setActionMessage(
        "Enter a clear reason for cancelling the discharge order.",
      );

      return;
    }

    setDischargeCancellationReason("");

    reloadLocalData();

    setActionMessage(
      `${cancelledOrder.orderNumber} cancelled. Doctor clearance has been removed.`,
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href="/operations/surgery/operation-theatre"
            >
              Operation Theatre
            </Link>
            <Link
              className="wf-button-secondary"
              href="/operations/blood-bank"
            >
              Blood Bank
            </Link>
            {selectedAdmission !==
              undefined &&
            doctorRoundSummary
              ?.latestFinalizedRound !==
              undefined ? (
              <Link
                className="wf-button-secondary"
                href={`/doctor/inpatients/${encodeURIComponent(
                  selectedAdmission.id,
                )}/progress-note/print`}
              >
                Print Latest Progress Note
              </Link>
            ) : null}

            <Link
              className="wf-button-secondary"
              href="/operations/inpatient/nursing"
            >
              Nursing Station
            </Link>

            <Link
              className="wf-button-secondary"
              href="/doctor/results"
            >
              Laboratory Results
            </Link>

            <Link
              className="wf-button-secondary"
              href="/doctor/radiology-results"
            >
              Radiology Results
            </Link>
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
              "Inpatient Rounds",
          },
        ]}
        description="Review admitted patients, record structured progress notes, update diagnoses and place treatment or discharge orders."
        eyebrow="Doctor Inpatient Care"
        leading={
          <Stethoscope
            size={20}
          />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              Fictional clinical data
            </span>

            <span>
              Active admissions only
            </span>
          </>
        }
        title="Doctor Inpatient Rounds"
      />

      {actionMessage !==
      undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          {actionMessage}
        </div>
      ) : null}

      {validationErrors.length >
      0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-rose-800">
            <AlertTriangle
              size={18}
            />

            Complete the required clinical information
          </div>

          <ul className="mt-3 space-y-1 text-xs leading-5 text-rose-700">
            {validationErrors.map(
              (error) => (
                <li key={error}>
                  • {error}
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}

      <WonFlowOperationalPanel
        description="Select the doctor completing inpatient rounds."
        title="Current Doctor"
        tone="blue"
      >
        <select
          className={
            wonFlowInputClassName
          }
          onChange={(
            event,
          ) => {
            setSelectedPractitionerId(
              event.target.value,
            );

            setRoundDraft(undefined);
          }}
          value={
            selectedPractitionerId
          }
        >
          <option value="">
            Select responsible doctor
          </option>

          {practitioners.map(
            (practitioner) => (
              <option
                key={
                  practitioner.id
                }
                value={
                  practitioner.id
                }
              >
                {
                  practitioner.displayName
                }
              </option>
            ),
          )}
        </select>
      </WonFlowOperationalPanel>

      <div className="wf-workspace-rail">
        <div className="wf-workspace-rail-side">
          <WonFlowOperationalPanel
            description="Select an admitted patient for review."
            status={
              <span className="wf-status wf-status-blue">
                {
                  visibleAdmissions.length
                }
                {" inpatients"}
              </span>
            }
            title="Doctor Inpatient List"
            tone="blue"
          >
            <label className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />

              <input
                className={[
                  wonFlowInputClassName,
                  "pl-10",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setPatientSearch(
                    event.target.value,
                  );
                }}
                placeholder="Search patient, MR, diagnosis, ward or bed"
                type="search"
                value={patientSearch}
              />
            </label>

            {visibleAdmissions.length ===
            0 ? (
              <div className="mt-4">
                <WonFlowEmptyState
                  description="Patients admitted through Ward and Beds will appear here."
                  title="No active inpatients"
                />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {visibleAdmissions.map(
                  (admission) => {
                    const patient =
                      patientsById.get(
                        admission.patientId,
                      );

                    const bed =
                      bedsById.get(
                        admission.currentBedId,
                      );

                    const ward =
                      bed === undefined
                        ? undefined
                        : wardsById.get(
                            bed.wardId,
                          );

                    const selected =
                      selectedAdmission?.id ===
                      admission.id;

                    return (
                      <button
                        className={[
                          "w-full rounded-2xl border p-4 text-left transition",
                          selected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                        ].join(" ")}
                        key={admission.id}
                        onClick={() => {
                          selectAdmission(
                            admission.id,
                          );
                        }}
                        type="button"
                      >
                        <div className="font-black text-slate-950">
                          {patient?.displayName ??
                            "Unknown patient"}
                        </div>

                        <div className="mt-1 text-xs font-bold text-blue-700">
                          {patient?.mrNumber ??
                            "No MR"}
                        </div>

                        <div className="mt-3 text-xs text-slate-500">
                          {ward?.wardName ??
                            "Unknown ward"}
                          {" · "}
                          {bed?.bedLabel ??
                            "Unknown bed"}
                        </div>

                        <div className="mt-2">
                          <span className="wf-status wf-status-neutral">
                            {humanizeValue(
                              admission.status,
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>

        <div className="wf-workspace-rail-main">
          {selectedAdmission ===
            undefined ||
          selectedPatient ===
            undefined ? (
            <WonFlowOperationalPanel
              description="Select an active inpatient."
              title="Doctor Round Workspace"
              tone="blue"
            >
              <WonFlowEmptyState
                description="No inpatient admission is currently selected."
                title="Select a patient"
              />
            </WonFlowOperationalPanel>
          ) : (
            <div className="space-y-6">
              <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white">
                <div className="bg-blue-700 p-5 text-white">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">
                    Active Inpatient
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    {
                      selectedPatient.displayName
                    }
                  </h2>

                  <div className="mt-1 text-xs text-blue-100">
                    {
                      selectedPatient.mrNumber
                    }
                    {" · "}
                    {
                      selectedAdmission.admissionNumber
                    }
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryItem
                    label="Branch"
                    value={
                      selectedBranch?.name ??
                      "Unknown branch"
                    }
                  />

                  <SummaryItem
                    label="Ward"
                    value={
                      selectedWard?.wardName ??
                      "Unknown ward"
                    }
                  />

                  <SummaryItem
                    label="Bed"
                    value={
                      selectedBed?.bedLabel ??
                      "Unknown bed"
                    }
                  />

                  <SummaryItem
                    label="Admitting Doctor"
                    value={
                      selectedAdmittingDoctor
                        ?.displayName ??
                      "Unknown doctor"
                    }
                  />

                  <SummaryItem
                    label="Provisional Diagnosis"
                    value={
                      selectedAdmission.provisionalDiagnosis
                    }
                  />

                  <SummaryItem
                    label="Admission Reason"
                    value={
                      selectedAdmission.admissionReason
                    }
                  />

                  <SummaryItem
                    label="Priority"
                    value={humanizeValue(
                      selectedAdmission.priority,
                    )}
                  />

                  <SummaryItem
                    label="Admitted"
                    value={formatWonFlowDashboardDateTime(
                      selectedAdmission.admittedAt,
                    )}
                  />
                </div>
              </section>

              {latestVital?.alertLevel ===
              "urgent" ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-rose-900">
                    <AlertTriangle
                      size={18}
                    />

                    Urgent nursing observation
                  </div>

                  <p className="mt-2 text-xs leading-5 text-rose-700">
                    The latest recorded vital signs require urgent clinical review.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <WonFlowKpiCard
                  helperText={
                    latestVital ===
                    undefined
                      ? "No vitals recorded"
                      : `${latestVital.systolicBloodPressure}/${latestVital.diastolicBloodPressure} BP · ${latestVital.oxygenSaturationPercent}% SpO₂`
                  }
                  icon={
                    <HeartPulse
                      size={18}
                    />
                  }
                  label="Latest Nursing Alert"
                  tone={
                    latestVital
                      ?.alertLevel ===
                    "urgent"
                      ? "amber"
                      : latestVital
                            ?.alertLevel ===
                          "observe"
                        ? "violet"
                        : "emerald"
                  }
                  value={
                    latestVital ===
                    undefined
                      ? "Pending"
                      : humanizeValue(
                          latestVital.alertLevel,
                        )
                  }
                />

                <WonFlowKpiCard
                  helperText={`${fluidSummary?.intakeMillilitres ?? 0} mL intake · ${fluidSummary?.outputMillilitres ?? 0} mL output`}
                  icon={
                    <Activity
                      size={18}
                    />
                  }
                  label="24h Fluid Balance"
                  tone="blue"
                  value={`${fluidSummary?.netBalanceMillilitres ?? 0} mL`}
                />

                <WonFlowKpiCard
                  helperText="Scheduled inpatient medicines"
                  icon={
                    <ClipboardPlus
                      size={18}
                    />
                  }
                  label="Active Medicines"
                  tone="violet"
                  value={
                    activeMedicationCount
                  }
                />

                <WonFlowKpiCard
                  helperText={`${doctorRoundSummary?.finalizedRoundCount ?? 0} finalized`}
                  icon={
                    <FileText
                      size={18}
                    />
                  }
                  label="Progress Notes"
                  tone="emerald"
                  value={
                    doctorRoundSummary
                      ?.roundCount ??
                    0
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2 rounded-[18px] border border-slate-200 bg-white p-3">
                <WonFlowActionButton
                  onClick={() => {
                    setView(
                      "progress-note",
                    );
                  }}
                  variant={
                    view ===
                    "progress-note"
                      ? "primary"
                      : "secondary"
                  }
                >
                  Current Progress Note
                </WonFlowActionButton>

                <WonFlowActionButton
                  onClick={() => {
                    setView(
                      "round-history",
                    );
                  }}
                  variant={
                    view ===
                    "round-history"
                      ? "primary"
                      : "secondary"
                  }
                >
                  Progress-Note History
                </WonFlowActionButton>

                <WonFlowActionButton
                  onClick={() => {
                    setView(
                      "discharge-order",
                    );
                  }}
                  variant={
                    view ===
                    "discharge-order"
                      ? "primary"
                      : "secondary"
                  }
                >
                  Doctor Discharge Order
                </WonFlowActionButton>
              </div>

              {view ===
              "progress-note" ? (
                <div className="space-y-6">
                  {roundDraft ===
                  undefined ? (
                    <WonFlowOperationalPanel
                      description="Start or resume today’s doctor progress note."
                      icon={
                        <Stethoscope
                          size={18}
                        />
                      }
                      title="Start Inpatient Round"
                      tone="blue"
                    >
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <select
                          className={
                            wonFlowInputClassName
                          }
                          onChange={(
                            event,
                          ) => {
                            setRoundType(
                              event.target
                                .value as
                                DemoInpatientRoundType,
                            );
                          }}
                          value={roundType}
                        >
                          <option value="morning">
                            Morning Round
                          </option>

                          <option value="evening">
                            Evening Round
                          </option>

                          <option value="emergency-review">
                            Emergency Review
                          </option>

                          <option value="specialist-review">
                            Specialist Review
                          </option>
                        </select>

                        <WonFlowActionButton
                          onClick={
                            startOrResumeRound
                          }
                          variant="primary"
                        >
                          Start or Resume Round
                        </WonFlowActionButton>
                      </div>
                    </WonFlowOperationalPanel>
                  ) : (
                    <>
                      <WonFlowOperationalPanel
                        description="Document the patient’s structured SOAP progress note."
                        title={`${roundDraft.roundNumber} — ${humanizeValue(
                          roundDraft.roundType,
                        )}`}
                        tone="blue"
                      >
                        <fieldset
                          disabled={
                            roundDraft.status ===
                            "finalized"
                          }
                        >
                          <div className="grid gap-4 lg:grid-cols-2">
                            <ClinicalTextarea
                              label="Subjective"
                              onChange={(
                                value,
                              ) => {
                                updateRound({
                                  subjective:
                                    value,
                                });
                              }}
                              placeholder="Symptoms, patient concerns and interval history"
                              value={
                                roundDraft.subjective
                              }
                            />

                            <ClinicalTextarea
                              label="Objective"
                              onChange={(
                                value,
                              ) => {
                                updateRound({
                                  objective:
                                    value,
                                });
                              }}
                              placeholder="Vitals, examination findings and available results"
                              value={
                                roundDraft.objective
                              }
                            />

                            <ClinicalTextarea
                              label="Assessment"
                              onChange={(
                                value,
                              ) => {
                                updateRound({
                                  assessment:
                                    value,
                                });
                              }}
                              placeholder="Clinical assessment and current problems"
                              value={
                                roundDraft.assessment
                              }
                            />

                            <ClinicalTextarea
                              label="Plan"
                              onChange={(
                                value,
                              ) => {
                                updateRound({
                                  plan:
                                    value,
                                });
                              }}
                              placeholder="Investigations, treatment and monitoring plan"
                              value={
                                roundDraft.plan
                              }
                            />

                            <ClinicalTextarea
                              label="Examination Summary"
                              onChange={(
                                value,
                              ) => {
                                updateRound({
                                  examinationSummary:
                                    value,
                                });
                              }}
                              placeholder="General and system examination findings"
                              value={
                                roundDraft.examinationSummary
                              }
                            />

                            <ClinicalTextarea
                              label="Treatment Plan"
                              onChange={(
                                value,
                              ) => {
                                updateRound({
                                  treatmentPlan:
                                    value,
                                });
                              }}
                              placeholder="Medication, procedures, diet and monitoring plan"
                              value={
                                roundDraft.treatmentPlan
                              }
                            />

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Escalation Level
                              </span>

                              <select
                                className={[
                                  wonFlowInputClassName,
                                  "mt-1.5",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  updateRound({
                                    escalationLevel:
                                      event.target
                                        .value as
                                        DemoInpatientEscalationLevel,
                                  });
                                }}
                                value={
                                  roundDraft.escalationLevel
                                }
                              >
                                <option value="routine">
                                  Routine
                                </option>

                                <option value="close-monitoring">
                                  Close Monitoring
                                </option>

                                <option value="urgent-review">
                                  Urgent Review
                                </option>
                              </select>
                            </label>

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Next Review
                              </span>

                              <input
                                className={[
                                  wonFlowInputClassName,
                                  "mt-1.5",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  updateRound({
                                    nextReviewAt:
                                      event.target.value,
                                  });
                                }}
                                type="datetime-local"
                                value={
                                  roundDraft.nextReviewAt
                                }
                              />
                            </label>
                          </div>
                        </fieldset>
                      </WonFlowOperationalPanel>

                      <WonFlowOperationalPanel
                        description="Update the patient’s working, final and associated diagnoses."
                        title="Diagnosis Updates"
                        tone="violet"
                      >
                        <fieldset
                          disabled={
                            roundDraft.status ===
                            "finalized"
                          }
                        >
                          <div className="space-y-4">
                            {roundDraft.diagnoses.map(
                              (
                                diagnosis,
                                index,
                              ) => (
                                <article
                                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                  key={
                                    diagnosis.id
                                  }
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-black text-slate-900">
                                      Diagnosis
                                      {" "}
                                      {index + 1}
                                    </h3>

                                    <button
                                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                                      onClick={() => {
                                        updateRound({
                                          diagnoses:
                                            roundDraft.diagnoses.filter(
                                              (record) =>
                                                record.id !==
                                                diagnosis.id,
                                            ),
                                        });
                                      }}
                                      type="button"
                                    >
                                      <Trash2
                                        size={16}
                                      />
                                    </button>
                                  </div>

                                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <input
                                      className={[
                                        wonFlowInputClassName,
                                        "xl:col-span-2",
                                      ].join(" ")}
                                      onChange={(
                                        event,
                                      ) => {
                                        updateDiagnosis(
                                          diagnosis.id,
                                          {
                                            diagnosis:
                                              event.target.value,
                                          },
                                        );
                                      }}
                                      placeholder="Diagnosis"
                                      value={
                                        diagnosis.diagnosis
                                      }
                                    />

                                    <input
                                      className={
                                        wonFlowInputClassName
                                      }
                                      onChange={(
                                        event,
                                      ) => {
                                        updateDiagnosis(
                                          diagnosis.id,
                                          {
                                            diagnosisCode:
                                              event.target.value,
                                          },
                                        );
                                      }}
                                      placeholder="Optional ICD code"
                                      value={
                                        diagnosis.diagnosisCode
                                      }
                                    />

                                    <select
                                      className={
                                        wonFlowInputClassName
                                      }
                                      onChange={(
                                        event,
                                      ) => {
                                        updateDiagnosis(
                                          diagnosis.id,
                                          {
                                            category:
                                              event.target
                                                .value as
                                                DemoInpatientDiagnosisCategory,
                                          },
                                        );
                                      }}
                                      value={
                                        diagnosis.category
                                      }
                                    >
                                      <option value="primary">
                                        Primary
                                      </option>

                                      <option value="secondary">
                                        Secondary
                                      </option>

                                      <option value="comorbidity">
                                        Comorbidity
                                      </option>

                                      <option value="complication">
                                        Complication
                                      </option>
                                    </select>

                                    <select
                                      className={
                                        wonFlowInputClassName
                                      }
                                      onChange={(
                                        event,
                                      ) => {
                                        updateDiagnosis(
                                          diagnosis.id,
                                          {
                                            status:
                                              event.target
                                                .value as
                                                DemoInpatientDiagnosisStatus,
                                          },
                                        );
                                      }}
                                      value={
                                        diagnosis.status
                                      }
                                    >
                                      <option value="active">
                                        Active
                                      </option>

                                      <option value="resolved">
                                        Resolved
                                      </option>

                                      <option value="ruled-out">
                                        Ruled Out
                                      </option>
                                    </select>

                                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4">
                                      <input
                                        checked={
                                          diagnosis.isPrimary
                                        }
                                        onChange={(
                                          event,
                                        ) => {
                                          updateDiagnosis(
                                            diagnosis.id,
                                            {
                                              isPrimary:
                                                event.target.checked,
                                            },
                                          );
                                        }}
                                        type="checkbox"
                                      />

                                      <span className="text-xs font-bold text-slate-700">
                                        Primary diagnosis
                                      </span>
                                    </label>

                                    <textarea
                                      className={[
                                        wonFlowTextareaClassName,
                                        "md:col-span-2 xl:col-span-2",
                                      ].join(" ")}
                                      onChange={(
                                        event,
                                      ) => {
                                        updateDiagnosis(
                                          diagnosis.id,
                                          {
                                            note:
                                              event.target.value,
                                          },
                                        );
                                      }}
                                      placeholder="Diagnosis note"
                                      value={
                                        diagnosis.note
                                      }
                                    />
                                  </div>
                                </article>
                              ),
                            )}
                          </div>

                          <button
                            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-bold text-violet-700"
                            onClick={() => {
                              updateRound({
                                diagnoses: [
                                  ...roundDraft.diagnoses,

                                  createEmptyDemoInpatientDiagnosisUpdate(),
                                ],
                              });
                            }}
                            type="button"
                          >
                            <Plus size={16} />
                            Add Diagnosis
                          </button>
                        </fieldset>
                      </WonFlowOperationalPanel>

                      <WonFlowOperationalPanel
                        description="Record medication, investigation, procedure, nursing and monitoring instructions."
                        title="Treatment Orders"
                        tone="emerald"
                      >
                        <fieldset
                          disabled={
                            roundDraft.status ===
                            "finalized"
                          }
                        >
                          <div className="space-y-4">
                            {roundDraft.treatmentOrders.map(
                              (
                                order,
                                index,
                              ) => (
                                <article
                                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                  key={order.id}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-black text-slate-900">
                                      Treatment Order
                                      {" "}
                                      {index + 1}
                                    </h3>

                                    <button
                                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                                      onClick={() => {
                                        updateRound({
                                          treatmentOrders:
                                            roundDraft.treatmentOrders.filter(
                                              (record) =>
                                                record.id !==
                                                order.id,
                                            ),
                                        });
                                      }}
                                      type="button"
                                    >
                                      <Trash2
                                        size={16}
                                      />
                                    </button>
                                  </div>

                                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <select
                                      className={
                                        wonFlowInputClassName
                                      }
                                      onChange={(
                                        event,
                                      ) => {
                                        updateTreatmentOrder(
                                          order.id,
                                          {
                                            orderType:
                                              event.target
                                                .value as
                                                DemoInpatientTreatmentOrderType,
                                          },
                                        );
                                      }}
                                      value={
                                        order.orderType
                                      }
                                    >
                                      <option value="medication">
                                        Medication
                                      </option>

                                      <option value="laboratory">
                                        Laboratory
                                      </option>

                                      <option value="radiology">
                                        Radiology
                                      </option>

                                      <option value="procedure">
                                        Procedure
                                      </option>

                                      <option value="nursing">
                                        Nursing
                                      </option>

                                      <option value="diet">
                                        Diet
                                      </option>

                                      <option value="monitoring">
                                        Monitoring
                                      </option>

                                      <option value="consultation">
                                        Consultation
                                      </option>

                                      <option value="other">
                                        Other
                                      </option>
                                    </select>

                                    <input
                                      className={[
                                        wonFlowInputClassName,
                                        "md:col-span-1 xl:col-span-2",
                                      ].join(" ")}
                                      onChange={(
                                        event,
                                      ) => {
                                        updateTreatmentOrder(
                                          order.id,
                                          {
                                            orderName:
                                              event.target.value,
                                          },
                                        );
                                      }}
                                      placeholder="Order name"
                                      value={
                                        order.orderName
                                      }
                                    />

                                    <select
                                      className={
                                        wonFlowInputClassName
                                      }
                                      onChange={(
                                        event,
                                      ) => {
                                        updateTreatmentOrder(
                                          order.id,
                                          {
                                            priority:
                                              event.target
                                                .value as
                                                DemoInpatientTreatmentOrderPriority,
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

                                      <option value="stat">
                                        STAT
                                      </option>
                                    </select>

                                    <select
                                      className={
                                        wonFlowInputClassName
                                      }
                                      onChange={(
                                        event,
                                      ) => {
                                        updateTreatmentOrder(
                                          order.id,
                                          {
                                            status:
                                              event.target
                                                .value as
                                                DemoInpatientTreatmentOrderStatus,
                                          },
                                        );
                                      }}
                                      value={
                                        order.status
                                      }
                                    >
                                      <option value="active">
                                        Active
                                      </option>

                                      <option value="completed">
                                        Completed
                                      </option>

                                      <option value="discontinued">
                                        Discontinued
                                      </option>
                                    </select>

                                    <input
                                      className={
                                        wonFlowInputClassName
                                      }
                                      onChange={(
                                        event,
                                      ) => {
                                        updateTreatmentOrder(
                                          order.id,
                                          {
                                            startAt:
                                              event.target.value,
                                          },
                                        );
                                      }}
                                      type="datetime-local"
                                      value={
                                        order.startAt
                                      }
                                    />

                                    <textarea
                                      className={[
                                        wonFlowTextareaClassName,
                                        "md:col-span-2",
                                      ].join(" ")}
                                      onChange={(
                                        event,
                                      ) => {
                                        updateTreatmentOrder(
                                          order.id,
                                          {
                                            instructions:
                                              event.target.value,
                                          },
                                        );
                                      }}
                                      placeholder="Clinical instructions"
                                      value={
                                        order.instructions
                                      }
                                    />
                                  </div>
                                </article>
                              ),
                            )}
                          </div>

                          <button
                            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700"
                            onClick={() => {
                              updateRound({
                                treatmentOrders: [
                                  ...roundDraft.treatmentOrders,

                                  createEmptyDemoInpatientTreatmentOrder(),
                                ],
                              });
                            }}
                            type="button"
                          >
                            <Plus size={16} />
                            Add Treatment Order
                          </button>
                        </fieldset>
                      </WonFlowOperationalPanel>

                      {roundDraft.status ===
                      "draft" ? (
                        <div className="wf-sticky-actions flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">
                              {
                                roundDraft.roundNumber
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              Save as draft or finalize the clinical progress note.
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <WonFlowActionButton
                              onClick={
                                saveRoundDraft
                              }
                              variant="secondary"
                            >
                              Save Draft
                            </WonFlowActionButton>

                            <WonFlowActionButton
                              onClick={
                                finalizeRound
                              }
                              variant="primary"
                            >
                              Finalize Progress Note
                            </WonFlowActionButton>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}

              {view ===
              "round-history" ? (
                <WonFlowOperationalPanel
                  description="Draft and finalized inpatient doctor progress notes."
                  icon={
                    <FileClock
                      size={18}
                    />
                  }
                  title="Doctor Round History"
                  tone="violet"
                >
                  {selectedRounds.length ===
                  0 ? (
                    <WonFlowEmptyState
                      description="Doctor progress notes will appear here."
                      title="No progress notes"
                    />
                  ) : (
                    <div className="wf-content-scroll">
                      <table className="w-full min-w-[1050px] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-3">
                              Round
                            </th>

                            <th className="px-3 py-3">
                              Doctor
                            </th>

                            <th className="px-3 py-3">
                              Type
                            </th>

                            <th className="px-3 py-3">
                              Escalation
                            </th>

                            <th className="px-3 py-3">
                              Assessment
                            </th>

                            <th className="px-3 py-3">
                              Status
                            </th>

                            <th className="px-3 py-3">
                              Finalized
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {selectedRounds.map(
                            (round) => (
                              <tr
                                className="border-b border-slate-100 last:border-0"
                                key={
                                  round.id
                                }
                              >
                                <td className="px-3 py-3">
                                  <div className="font-mono text-xs font-bold">
                                    {
                                      round.roundNumber
                                    }
                                  </div>

                                  <div className="mt-1 text-[11px] text-slate-500">
                                    {
                                      round.roundDate
                                    }
                                  </div>
                                </td>

                                <td className="px-3 py-3 text-xs font-bold">
                                  {practitionersById.get(
                                    round.practitionerId,
                                  )?.displayName ??
                                    "Unknown doctor"}
                                </td>

                                <td className="px-3 py-3 text-xs">
                                  {humanizeValue(
                                    round.roundType,
                                  )}
                                </td>

                                <td className="px-3 py-3">
                                  <span className="wf-status wf-status-neutral">
                                    {humanizeValue(
                                      round.escalationLevel,
                                    )}
                                  </span>
                                </td>

                                <td className="max-w-[320px] px-3 py-3 text-xs text-slate-600">
                                  {round.assessment ||
                                    "Draft not completed"}
                                </td>

                                <td className="px-3 py-3">
                                  <span className="wf-status wf-status-blue">
                                    {humanizeValue(
                                      round.status,
                                    )}
                                  </span>
                                </td>

                                <td className="px-3 py-3 text-xs">
                                  {round.finalizedAt
                                    ? formatWonFlowDashboardDateTime(
                                        round.finalizedAt,
                                      )
                                    : "Not finalized"}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </WonFlowOperationalPanel>
              ) : null}

              {view ===
              "discharge-order" ? (
                <div className="space-y-6">
                  {selectedDischargeOrder !==
                  undefined ? (
                    <section className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-6">
                      <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
                        Active Doctor Discharge Order
                      </div>

                      <div className="mt-2 text-xl font-black text-emerald-950">
                        {
                          selectedDischargeOrder.orderNumber
                        }
                      </div>

                      <p className="mt-2 text-sm leading-6 text-emerald-700">
                        Doctor clearance is complete. Nursing, medication, billing and follow-up clearance must still be completed through the Ward and Beds discharge workflow.
                      </p>
                    </section>
                  ) : null}

                  <WonFlowOperationalPanel
                    description="Place or update the doctor’s discharge order. This completes only the doctor-clearance portion of discharge readiness."
                    title="Doctor Discharge Order"
                    tone="emerald"
                  >
                    <div className="grid gap-4 lg:grid-cols-2">
                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Planned Discharge Date
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setPlannedDischargeDate(
                              event.target.value,
                            );
                          }}
                          type="date"
                          value={
                            plannedDischargeDate
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Final Diagnosis
                        </span>

                        <textarea
                          className={[
                            wonFlowTextareaClassName,
                            "mt-1.5 min-h-24",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setFinalDiagnosis(
                              event.target.value,
                            );
                          }}
                          value={
                            finalDiagnosis
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Condition at Discharge
                        </span>

                        <textarea
                          className={[
                            wonFlowTextareaClassName,
                            "mt-1.5 min-h-24",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setConditionAtDischarge(
                              event.target.value,
                            );
                          }}
                          placeholder="Stable, improved, ambulatory..."
                          value={
                            conditionAtDischarge
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Discharge Medication Plan
                        </span>

                        <textarea
                          className={[
                            wonFlowTextareaClassName,
                            "mt-1.5 min-h-24",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setDischargeMedicationPlan(
                              event.target.value,
                            );
                          }}
                          value={
                            dischargeMedicationPlan
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Discharge Instructions
                        </span>

                        <textarea
                          className={[
                            wonFlowTextareaClassName,
                            "mt-1.5 min-h-28",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setDischargeInstructions(
                              event.target.value,
                            );
                          }}
                          value={
                            dischargeInstructions
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Follow-Up Plan
                        </span>

                        <textarea
                          className={[
                            wonFlowTextareaClassName,
                            "mt-1.5 min-h-28",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setDischargeFollowUpPlan(
                              event.target.value,
                            );
                          }}
                          value={
                            dischargeFollowUpPlan
                          }
                        />
                      </label>
                    </div>

                    <WonFlowActionButton
                      className="mt-4"
                      onClick={
                        placeDischargeOrder
                      }
                      variant="primary"
                    >
                      {selectedDischargeOrder ===
                      undefined
                        ? "Place Discharge Order"
                        : "Update Discharge Order"}
                    </WonFlowActionButton>
                  </WonFlowOperationalPanel>

                  {selectedDischargeOrder !==
                  undefined ? (
                    <WonFlowOperationalPanel
                      description="Cancelling the order removes doctor clearance from discharge readiness."
                      title="Cancel Discharge Order"
                      tone="amber"
                    >
                      <textarea
                        className={[
                          wonFlowTextareaClassName,
                          "min-h-24",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          setDischargeCancellationReason(
                            event.target.value,
                          );
                        }}
                        placeholder="Reason for cancelling discharge"
                        value={
                          dischargeCancellationReason
                        }
                      />

                      <WonFlowActionButton
                        className="mt-4"
                        onClick={
                          cancelDischargeOrder
                        }
                        variant="secondary"
                      >
                        Cancel Doctor Discharge Order
                      </WonFlowActionButton>
                    </WonFlowOperationalPanel>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="wf-button-primary"
                      href="/operations/inpatient/wards"
                    >
                      Open Ward Discharge Checklist
                    </Link>

                    <Link
                      className="wf-button-secondary"
                      href="/operations/inpatient/nursing"
                    >
                      Open Nursing Station
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
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
      <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 text-sm font-bold text-slate-800">
        {value || "Not recorded"}
      </dd>
    </div>
  );
}

function ClinicalTextarea({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;

  onChange:
    (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-600">
        {label}
      </span>

      <textarea
        className={[
          wonFlowTextareaClassName,
          "mt-1.5 min-h-32",
        ].join(" ")}
        onChange={(
          event,
        ) => {
          onChange(
            event.target.value,
          );
        }}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

export function DoctorInpatientRoundsWorkspace() {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "doctor-inpatient-rounds",

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
                  limit: 150,
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
            .length === 0,
    });

  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital branch information is unavailable."
      emptyTitle="Doctor inpatient rounds unavailable"
      loadingDescription="WonFlow is preparing admissions, nursing summaries and clinical progress notes."
      loadingTitle="Preparing doctor inpatient rounds"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <DoctorInpatientRoundsContent
          branches={
            directory.branches
          }
          practitioners={
            directory.practitioners
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}
