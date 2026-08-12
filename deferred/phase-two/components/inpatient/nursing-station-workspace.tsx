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
  ClipboardList,
  Droplets,
  HeartPulse,
  Pill,
  Printer,
  Search,
  UsersRound,
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
  buildDemoNursingCareSummary,
  buildDemoNursingFluidSummary,
  completeDemoNursingHandover,
  createDemoNursingFluidEntry,
  createDemoNursingMedicationSchedule,
  createDemoNursingVitalObservation,
  createOrGetDemoNursingHandover,
  readDemoInpatientAdmissions,
  readDemoInpatientBeds,
  readDemoInpatientWards,
  readDemoNursingFluidEntries,
  readDemoNursingHandovers,
  readDemoNursingMedicationAdministrations,
  readDemoNursingVitalObservations,
  recordDemoNursingMedicationAction,
  saveDemoNursingHandover,
  validateDemoNursingFluidEntry,
  validateDemoNursingHandover,
  validateDemoNursingMedicationSchedule,
  validateDemoNursingVitalObservation,
} from "@/lib/inpatient";

import type {
  DemoInpatientAdmission,
  DemoInpatientBed,
  DemoInpatientWard,
  DemoNursingConsciousness,
  DemoNursingFluidCategory,
  DemoNursingFluidDirection,
  DemoNursingFluidEntry,
  DemoNursingHandover,
  DemoNursingMedicationAdministration,
  DemoNursingMedicationRoute,
  DemoNursingMedicationStatus,
  DemoNursingOxygenSupport,
  DemoNursingShift,
  DemoNursingVitalAlert,
  DemoNursingVitalObservation,
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

type NursingView =
  | "observations"
  | "fluids"
  | "medications"
  | "handover";

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

function getCurrentDateTimeLocal():
  string {
  const date =
    new Date();

  const timezoneOffset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() -
    timezoneOffset,
  )
    .toISOString()
    .slice(0, 16);
}

function getVitalAlertClassName(
  alert:
    DemoNursingVitalAlert,
): string {
  switch (alert) {
    case "stable":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "observe":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "urgent":
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function getMedicationStatusClassName(
  status:
    DemoNursingMedicationStatus,
): string {
  switch (status) {
    case "scheduled":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "administered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "withheld":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "refused":
    case "missed":
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

interface NursingStationContentProps {
  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function NursingStationContent({
  branches,
  practitioners,
}: NursingStationContentProps) {
  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    wards,
    setWards,
  ] = useState<
    DemoInpatientWard[]
  >([]);

  const [
    beds,
    setBeds,
  ] = useState<
    DemoInpatientBed[]
  >([]);

  const [
    admissions,
    setAdmissions,
  ] = useState<
    DemoInpatientAdmission[]
  >([]);

  const [
    vitalObservations,
    setVitalObservations,
  ] = useState<
    DemoNursingVitalObservation[]
  >([]);

  const [
    fluidEntries,
    setFluidEntries,
  ] = useState<
    DemoNursingFluidEntry[]
  >([]);

  const [
    medications,
    setMedications,
  ] = useState<
    DemoNursingMedicationAdministration[]
  >([]);

  const [
    handovers,
    setHandovers,
  ] = useState<
    DemoNursingHandover[]
  >([]);

  const [
    view,
    setView,
  ] = useState<NursingView>(
    "observations",
  );

  const [
    selectedAdmissionId,
    setSelectedAdmissionId,
  ] = useState("");

  const [
    patientSearch,
    setPatientSearch,
  ] = useState("");

  const [
    temperature,
    setTemperature,
  ] = useState("36.8");

  const [
    pulse,
    setPulse,
  ] = useState("78");

  const [
    respiratoryRate,
    setRespiratoryRate,
  ] = useState("18");

  const [
    systolicPressure,
    setSystolicPressure,
  ] = useState("120");

  const [
    diastolicPressure,
    setDiastolicPressure,
  ] = useState("80");

  const [
    oxygenSaturation,
    setOxygenSaturation,
  ] = useState("98");

  const [
    painScore,
    setPainScore,
  ] = useState("0");

  const [
    consciousness,
    setConsciousness,
  ] = useState<
    DemoNursingConsciousness
  >("alert");

  const [
    oxygenSupport,
    setOxygenSupport,
  ] = useState<
    DemoNursingOxygenSupport
  >("room-air");

  const [
    observationNote,
    setObservationNote,
  ] = useState("");

  const [
    observationNurse,
    setObservationNurse,
  ] = useState("");

  const [
    observationTime,
    setObservationTime,
  ] = useState(
    getCurrentDateTimeLocal,
  );

  const [
    fluidDirection,
    setFluidDirection,
  ] = useState<
    DemoNursingFluidDirection
  >("intake");

  const [
    fluidCategory,
    setFluidCategory,
  ] = useState<
    DemoNursingFluidCategory
  >("oral");

  const [
    fluidAmount,
    setFluidAmount,
  ] = useState("");

  const [
    fluidDescription,
    setFluidDescription,
  ] = useState("");

  const [
    fluidNurse,
    setFluidNurse,
  ] = useState("");

  const [
    fluidTime,
    setFluidTime,
  ] = useState(
    getCurrentDateTimeLocal,
  );

  const [
    medicineName,
    setMedicineName,
  ] = useState("");

  const [
    medicineDose,
    setMedicineDose,
  ] = useState("");

  const [
    medicationRoute,
    setMedicationRoute,
  ] = useState<
    DemoNursingMedicationRoute
  >("oral");

  const [
    medicationTime,
    setMedicationTime,
  ] = useState(
    getCurrentDateTimeLocal,
  );

  const [
    medicationOrderedBy,
    setMedicationOrderedBy,
  ] = useState("");

  const [
    medicationInstructions,
    setMedicationInstructions,
  ] = useState("");

  const [
    selectedMedicationId,
    setSelectedMedicationId,
  ] = useState("");

  const [
    medicationActionStatus,
    setMedicationActionStatus,
  ] = useState<
    Exclude<
      DemoNursingMedicationStatus,
      "scheduled"
    >
  >("administered");

  const [
    medicationActionNurse,
    setMedicationActionNurse,
  ] = useState("");

  const [
    medicationActionReason,
    setMedicationActionReason,
  ] = useState("");

  const [
    medicationActionNote,
    setMedicationActionNote,
  ] = useState("");

  const [
    handoverShift,
    setHandoverShift,
  ] = useState<
    DemoNursingShift
  >("day");

  const [
    handoverDraft,
    setHandoverDraft,
  ] = useState<
    DemoNursingHandover |
    undefined
  >();

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

      setWards(
        readDemoInpatientWards(),
      );

      setBeds(
        readDemoInpatientBeds(),
      );

      setAdmissions(
        readDemoInpatientAdmissions(),
      );

      setVitalObservations(
        readDemoNursingVitalObservations(),
      );

      setFluidEntries(
        readDemoNursingFluidEntries(),
      );

      setMedications(
        readDemoNursingMedicationAdministrations(),
      );

      setHandovers(
        readDemoNursingHandovers(),
      );
    }, []);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    const eventNames = [
      "wonflow:demo-inpatient-admissions-changed",
      "wonflow:demo-inpatient-beds-changed",
      "wonflow:demo-nursing-vitals-changed",
      "wonflow:demo-nursing-fluids-changed",
      "wonflow:demo-nursing-medications-changed",
      "wonflow:demo-nursing-handovers-changed",
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

  const selectedPractitioner =
    selectedAdmission ===
    undefined
      ? undefined
      : practitionersById.get(
          selectedAdmission.practitionerId,
        );

  const selectedBranch =
    selectedAdmission ===
    undefined
      ? undefined
      : branchesById.get(
          selectedAdmission.branchId,
        );

  const selectedVitals =
    selectedAdmission ===
    undefined
      ? []
      : vitalObservations
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
          );

  const selectedFluids =
    selectedAdmission ===
    undefined
      ? []
      : fluidEntries
          .filter(
            (entry) =>
              entry.admissionId ===
              selectedAdmission.id,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.recordedAt,
              ).getTime() -
              new Date(
                left.recordedAt,
              ).getTime(),
          );

  const selectedMedications =
    selectedAdmission ===
    undefined
      ? []
      : medications
          .filter(
            (medication) =>
              medication.admissionId ===
              selectedAdmission.id,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                left.scheduledAt,
              ).getTime() -
              new Date(
                right.scheduledAt,
              ).getTime(),
          );

  const selectedMedication =
    selectedMedications.find(
      (medication) =>
        medication.id ===
        selectedMedicationId,
    ) ??
    selectedMedications.find(
      (medication) =>
        medication.status ===
        "scheduled",
    );

  const selectedHandovers =
    selectedAdmission ===
    undefined
      ? []
      : handovers
          .filter(
            (handover) =>
              handover.admissionId ===
              selectedAdmission.id,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.createdAt,
              ).getTime() -
              new Date(
                left.createdAt,
              ).getTime(),
          );

  const careSummary =
    selectedAdmission ===
    undefined
      ? undefined
      : buildDemoNursingCareSummary(
          selectedAdmission.id,
        );

  const fluidSummary =
    selectedAdmission ===
    undefined
      ? {
          intakeMillilitres: 0,
          outputMillilitres: 0,
          netBalanceMillilitres: 0,
          entryCount: 0,
        }
      : buildDemoNursingFluidSummary(
          selectedAdmission.id,
        );

  useEffect(() => {
    if (
      selectedAdmission ===
      undefined
    ) {
      return;
    }

    queueMicrotask(() => {
      const handover =
        createOrGetDemoNursingHandover(
          selectedAdmission.id,
          handoverShift,
        );

      setHandoverDraft(
        handover === undefined
          ? undefined
          : {
              ...handover,
            },
      );
    });
  }, [
    handoverShift,
    selectedAdmission?.id,
  ]);

  function selectAdmission(
    admissionId: string,
  ) {
    setSelectedAdmissionId(
      admissionId,
    );

    setSelectedMedicationId("");
    setValidationErrors([]);
    setActionMessage(undefined);
  }

  function recordVitalObservation() {
    if (
      selectedAdmission ===
      undefined
    ) {
      return;
    }

    const input = {
      admissionId:
        selectedAdmission.id,

      temperatureCelsius:
        Number(temperature),

      pulsePerMinute:
        Number(pulse),

      respiratoryRatePerMinute:
        Number(
          respiratoryRate,
        ),

      systolicBloodPressure:
        Number(
          systolicPressure,
        ),

      diastolicBloodPressure:
        Number(
          diastolicPressure,
        ),

      oxygenSaturationPercent:
        Number(
          oxygenSaturation,
        ),

      painScore:
        Number(painScore),

      consciousness,

      oxygenSupport,

      observationNote,

      recordedBy:
        observationNurse,

      observedAt:
        observationTime,
    };

    const errors =
      validateDemoNursingVitalObservation(
        input,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required vital-sign information.",
      );

      return;
    }

    const observation =
      createDemoNursingVitalObservation(
        input,
      );

    if (
      observation ===
      undefined
    ) {
      setActionMessage(
        "The nursing observation could not be recorded.",
      );

      return;
    }

    setObservationNote("");
    setObservationTime(
      getCurrentDateTimeLocal(),
    );

    setValidationErrors([]);

    reloadLocalData();

    setActionMessage(
      observation.alertLevel ===
        "urgent"
        ? "Observation saved. Urgent clinical review is required."
        : observation.alertLevel ===
            "observe"
          ? "Observation saved. Continue close monitoring."
          : "Vital signs recorded successfully.",
    );
  }

  function recordFluidEntry() {
    if (
      selectedAdmission ===
      undefined
    ) {
      return;
    }

    const input = {
      admissionId:
        selectedAdmission.id,

      direction:
        fluidDirection,

      category:
        fluidCategory,

      amountMillilitres:
        Number(fluidAmount),

      description:
        fluidDescription,

      recordedBy:
        fluidNurse,

      recordedAt:
        fluidTime,
    };

    const errors =
      validateDemoNursingFluidEntry(
        input,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required fluid-balance information.",
      );

      return;
    }

    const entry =
      createDemoNursingFluidEntry(
        input,
      );

    if (
      entry === undefined
    ) {
      setActionMessage(
        "The fluid-balance entry could not be recorded.",
      );

      return;
    }

    setFluidAmount("");
    setFluidDescription("");
    setFluidTime(
      getCurrentDateTimeLocal(),
    );

    setValidationErrors([]);

    reloadLocalData();

    setActionMessage(
      `${entry.amountMillilitres} mL ${entry.direction} recorded.`,
    );
  }

  function createMedicationSchedule() {
    if (
      selectedAdmission ===
      undefined
    ) {
      return;
    }

    const input = {
      admissionId:
        selectedAdmission.id,

      medicineName,

      dose:
        medicineDose,

      route:
        medicationRoute,

      scheduledAt:
        medicationTime,

      orderedBy:
        medicationOrderedBy,

      administrationInstructions:
        medicationInstructions,
    };

    const errors =
      validateDemoNursingMedicationSchedule(
        input,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required medication schedule.",
      );

      return;
    }

    const medication =
      createDemoNursingMedicationSchedule(
        input,
      );

    if (
      medication ===
      undefined
    ) {
      setActionMessage(
        "The medication schedule could not be created. Check for a duplicate schedule.",
      );

      return;
    }

    setMedicineName("");
    setMedicineDose("");
    setMedicationInstructions("");
    setMedicationTime(
      getCurrentDateTimeLocal(),
    );

    setValidationErrors([]);

    reloadLocalData();

    setSelectedMedicationId(
      medication.id,
    );

    setActionMessage(
      `${medication.medicineName} scheduled successfully.`,
    );
  }

  function recordMedicationAction() {
    if (
      selectedMedication ===
      undefined
    ) {
      return;
    }

    const updatedMedication =
      recordDemoNursingMedicationAction({
        medicationId:
          selectedMedication.id,

        status:
          medicationActionStatus,

        actionedBy:
          medicationActionNurse,

        actionReason:
          medicationActionReason,

        administrationNote:
          medicationActionNote,
      });

    if (
      updatedMedication ===
      undefined
    ) {
      setActionMessage(
        medicationActionStatus ===
        "administered"
          ? "Enter the nurse administering the medicine."
          : "Enter the responsible nurse and a reason for the medication status.",
      );

      return;
    }

    setMedicationActionNurse("");
    setMedicationActionReason("");
    setMedicationActionNote("");
    setSelectedMedicationId("");

    reloadLocalData();

    setActionMessage(
      `${updatedMedication.medicineName} marked ${humanizeValue(
        updatedMedication.status,
      ).toLocaleLowerCase()}.`,
    );
  }

  function updateHandover(
    changes:
      Partial<
        DemoNursingHandover
      >,
  ) {
    setHandoverDraft(
      (currentHandover) =>
        currentHandover ===
        undefined
          ? currentHandover
          : {
              ...currentHandover,
              ...changes,
            },
    );

    setValidationErrors([]);
  }

  function saveHandoverDraft() {
    if (
      handoverDraft ===
      undefined
    ) {
      return;
    }

    const savedHandover =
      saveDemoNursingHandover(
        handoverDraft,
      );

    setHandoverDraft({
      ...savedHandover,
    });

    reloadLocalData();

    setActionMessage(
      "Nursing handover draft saved.",
    );
  }

  function completeHandover() {
    if (
      handoverDraft ===
      undefined
    ) {
      return;
    }

    const errors =
      validateDemoNursingHandover(
        handoverDraft,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete every required nursing handover field.",
      );

      return;
    }

    const completedHandover =
      completeDemoNursingHandover(
        handoverDraft,
      );

    if (
      completedHandover ===
      undefined
    ) {
      setActionMessage(
        "The nursing handover could not be completed.",
      );

      return;
    }

    setHandoverDraft({
      ...completedHandover,
    });

    reloadLocalData();

    setActionMessage(
      `${completedHandover.handoverNumber} completed successfully.`,
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            {selectedAdmission !==
            undefined ? (
              <Link
                className="wf-button-secondary"
                href={`/operations/inpatient/nursing/${encodeURIComponent(
                  selectedAdmission.id,
                )}/handover/print`}
              >
                <Printer size={16} />
                Print Handover
              </Link>
            ) : null}

            <Link
              className="wf-button-secondary"
              href="/operations/inpatient/wards"
            >
              Ward and Beds
            </Link>
            <Link
              className="wf-button-secondary"
              href="/doctor/inpatients"
            >
              Doctor Inpatient Rounds
            </Link>
            <Link
              className="wf-button-secondary"
              href="/operations/blood-bank"
            >
              Blood Bank
            </Link>
          </div>
        }
        breadcrumbs={[
          {
            label:
              "Hospital Operations",
            href: "/operations",
          },
          {
            label:
              "Ward and Beds",
            href:
              "/operations/inpatient/wards",
          },
          {
            label:
              "Nursing Station",
          },
        ]}
        description="Record inpatient observations, vital signs, fluid balance, medication administration and nursing shift handovers."
        eyebrow="Inpatient Nursing"
        leading={
          <HeartPulse
            size={20}
          />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              Fictional nursing data
            </span>

            <span>
              Active inpatients only
            </span>
          </>
        }
        title="Inpatient Nursing Station"
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

            Complete the required information
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

      <div className="wf-workspace-rail">
        <div className="wf-workspace-rail-side">
          <WonFlowOperationalPanel
            description="Select an active inpatient admission."
            icon={
              <UsersRound
                size={18}
              />
            }
            status={
              <span className="wf-status wf-status-blue">
                {
                  visibleAdmissions.length
                }
                {" patients"}
              </span>
            }
            title="Nursing Patient List"
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
                placeholder="Search patient, MR, bed or ward"
                type="search"
                value={patientSearch}
              />
            </label>

            {visibleAdmissions.length ===
            0 ? (
              <div className="mt-4">
                <WonFlowEmptyState
                  description="Admit a patient through Ward and Beds before recording nursing care."
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
                            "No MR number"}
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
              description="Select an admitted patient from the nursing list."
              title="Nursing Workspace"
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
                    label="Hospital Branch"
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
                      selectedPractitioner?.displayName ??
                      "Unknown doctor"
                    }
                  />

                  <SummaryItem
                    label="Diagnosis"
                    value={
                      selectedAdmission.provisionalDiagnosis
                    }
                  />

                  <SummaryItem
                    label="Priority"
                    value={humanizeValue(
                      selectedAdmission.priority,
                    )}
                  />

                  <SummaryItem
                    label="Admission Type"
                    value={humanizeValue(
                      selectedAdmission.admissionType,
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

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <WonFlowKpiCard
                  helperText={
                    careSummary?.latestVital ===
                    undefined
                      ? "No observation recorded"
                      : formatWonFlowDashboardDateTime(
                          careSummary.latestVital.observedAt,
                        )
                  }
                  icon={
                    <Activity
                      size={18}
                    />
                  }
                  label="Latest Vitals"
                  tone={
                    careSummary?.latestVital
                      ?.alertLevel ===
                    "urgent"
                      ? "amber"
                      : careSummary?.latestVital
                            ?.alertLevel ===
                          "observe"
                        ? "violet"
                        : "emerald"
                  }
                  value={
                    careSummary?.latestVital ===
                    undefined
                      ? "Pending"
                      : humanizeValue(
                          careSummary.latestVital.alertLevel,
                        )
                  }
                />

                <WonFlowKpiCard
                  helperText={`${fluidSummary.intakeMillilitres} mL intake · ${fluidSummary.outputMillilitres} mL output`}
                  icon={
                    <Droplets
                      size={18}
                    />
                  }
                  label="24h Fluid Balance"
                  tone={
                    fluidSummary.netBalanceMillilitres <
                    0
                      ? "amber"
                      : "blue"
                  }
                  value={`${fluidSummary.netBalanceMillilitres} mL`}
                />

                <WonFlowKpiCard
                  helperText={`${careSummary?.overdueMedicationCount ?? 0} overdue`}
                  icon={
                    <Pill size={18} />
                  }
                  label="Scheduled Medicines"
                  tone="violet"
                  value={
                    careSummary?.scheduledMedicationCount ??
                    0
                  }
                />

                <WonFlowKpiCard
                  helperText="Completed shift handovers"
                  icon={
                    <ClipboardList
                      size={18}
                    />
                  }
                  label="Handovers"
                  tone="blue"
                  value={
                    careSummary?.completedHandoverCount ??
                    0
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2 rounded-[18px] border border-slate-200 bg-white p-3">
                <WonFlowActionButton
                  onClick={() => {
                    setView(
                      "observations",
                    );
                  }}
                  variant={
                    view ===
                    "observations"
                      ? "primary"
                      : "secondary"
                  }
                >
                  Vital Signs
                </WonFlowActionButton>

                <WonFlowActionButton
                  onClick={() => {
                    setView("fluids");
                  }}
                  variant={
                    view === "fluids"
                      ? "primary"
                      : "secondary"
                  }
                >
                  Fluid Balance
                </WonFlowActionButton>

                <WonFlowActionButton
                  onClick={() => {
                    setView(
                      "medications",
                    );
                  }}
                  variant={
                    view ===
                    "medications"
                      ? "primary"
                      : "secondary"
                  }
                >
                  Medication Administration
                </WonFlowActionButton>

                <WonFlowActionButton
                  onClick={() => {
                    setView("handover");
                  }}
                  variant={
                    view === "handover"
                      ? "primary"
                      : "secondary"
                  }
                >
                  Shift Handover
                </WonFlowActionButton>
              </div>

              {view ===
              "observations" ? (
                <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                  <WonFlowOperationalPanel
                    description="Record the patient’s current vital signs and nursing assessment."
                    icon={
                      <HeartPulse
                        size={18}
                      />
                    }
                    title="New Vital Observation"
                    tone="blue"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <NumberField
                        label="Temperature °C"
                        onChange={
                          setTemperature
                        }
                        step="0.1"
                        value={
                          temperature
                        }
                      />

                      <NumberField
                        label="Pulse / Minute"
                        onChange={
                          setPulse
                        }
                        value={pulse}
                      />

                      <NumberField
                        label="Respiratory Rate"
                        onChange={
                          setRespiratoryRate
                        }
                        value={
                          respiratoryRate
                        }
                      />

                      <NumberField
                        label="SpO₂ %"
                        onChange={
                          setOxygenSaturation
                        }
                        value={
                          oxygenSaturation
                        }
                      />

                      <NumberField
                        label="Systolic BP"
                        onChange={
                          setSystolicPressure
                        }
                        value={
                          systolicPressure
                        }
                      />

                      <NumberField
                        label="Diastolic BP"
                        onChange={
                          setDiastolicPressure
                        }
                        value={
                          diastolicPressure
                        }
                      />

                      <NumberField
                        label="Pain Score 0–10"
                        onChange={
                          setPainScore
                        }
                        value={
                          painScore
                        }
                      />

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Consciousness
                        </span>

                        <select
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setConsciousness(
                              event.target
                                .value as
                                DemoNursingConsciousness,
                            );
                          }}
                          value={
                            consciousness
                          }
                        >
                          <option value="alert">
                            Alert
                          </option>

                          <option value="responds-to-voice">
                            Responds to Voice
                          </option>

                          <option value="responds-to-pain">
                            Responds to Pain
                          </option>

                          <option value="unresponsive">
                            Unresponsive
                          </option>
                        </select>
                      </label>

                      <label className="sm:col-span-2">
                        <span className="text-xs font-bold text-slate-600">
                          Oxygen Support
                        </span>

                        <select
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setOxygenSupport(
                              event.target
                                .value as
                                DemoNursingOxygenSupport,
                            );
                          }}
                          value={
                            oxygenSupport
                          }
                        >
                          <option value="room-air">
                            Room Air
                          </option>

                          <option value="nasal-cannula">
                            Nasal Cannula
                          </option>

                          <option value="face-mask">
                            Face Mask
                          </option>

                          <option value="non-rebreather-mask">
                            Non-Rebreather Mask
                          </option>

                          <option value="other">
                            Other
                          </option>
                        </select>
                      </label>

                      <label className="sm:col-span-2">
                        <span className="text-xs font-bold text-slate-600">
                          Observation Date and Time
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setObservationTime(
                              event.target.value,
                            );
                          }}
                          type="datetime-local"
                          value={
                            observationTime
                          }
                        />
                      </label>

                      <label className="sm:col-span-2">
                        <span className="text-xs font-bold text-slate-600">
                          Recorded By
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setObservationNurse(
                              event.target.value,
                            );
                          }}
                          placeholder="Nurse name"
                          value={
                            observationNurse
                          }
                        />
                      </label>

                      <label className="sm:col-span-2">
                        <span className="text-xs font-bold text-slate-600">
                          Nursing Note
                        </span>

                        <textarea
                          className={[
                            wonFlowTextareaClassName,
                            "mt-1.5 min-h-24",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setObservationNote(
                              event.target.value,
                            );
                          }}
                          value={
                            observationNote
                          }
                        />
                      </label>
                    </div>

                    <WonFlowActionButton
                      className="mt-4 w-full"
                      onClick={
                        recordVitalObservation
                      }
                      variant="primary"
                    >
                      Record Vital Signs
                    </WonFlowActionButton>
                  </WonFlowOperationalPanel>

                  <WonFlowOperationalPanel
                    description="Recent nursing observations for the selected inpatient."
                    title="Vital-Sign History"
                    tone="violet"
                  >
                    {selectedVitals.length ===
                    0 ? (
                      <WonFlowEmptyState
                        description="Recorded vital signs will appear here."
                        title="No observations"
                      />
                    ) : (
                      <div className="wf-content-scroll">
                        <table className="w-full min-w-[1050px] border-collapse text-left">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                              <th className="px-3 py-3">
                                Time
                              </th>

                              <th className="px-3 py-3">
                                Temp
                              </th>

                              <th className="px-3 py-3">
                                Pulse
                              </th>

                              <th className="px-3 py-3">
                                Resp.
                              </th>

                              <th className="px-3 py-3">
                                Blood Pressure
                              </th>

                              <th className="px-3 py-3">
                                SpO₂
                              </th>

                              <th className="px-3 py-3">
                                Pain
                              </th>

                              <th className="px-3 py-3">
                                Alert
                              </th>

                              <th className="px-3 py-3">
                                Nurse
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {selectedVitals.map(
                              (
                                observation,
                              ) => (
                                <tr
                                  className="border-b border-slate-100 last:border-0"
                                  key={
                                    observation.id
                                  }
                                >
                                  <td className="px-3 py-3 text-xs">
                                    {formatWonFlowDashboardDateTime(
                                      observation.observedAt,
                                    )}
                                  </td>

                                  <td className="px-3 py-3 font-bold">
                                    {
                                      observation.temperatureCelsius
                                    }
                                    °C
                                  </td>

                                  <td className="px-3 py-3">
                                    {
                                      observation.pulsePerMinute
                                    }
                                  </td>

                                  <td className="px-3 py-3">
                                    {
                                      observation.respiratoryRatePerMinute
                                    }
                                  </td>

                                  <td className="px-3 py-3 font-bold">
                                    {
                                      observation.systolicBloodPressure
                                    }
                                    /
                                    {
                                      observation.diastolicBloodPressure
                                    }
                                  </td>

                                  <td className="px-3 py-3">
                                    {
                                      observation.oxygenSaturationPercent
                                    }
                                    %
                                  </td>

                                  <td className="px-3 py-3">
                                    {
                                      observation.painScore
                                    }
                                    /10
                                  </td>

                                  <td className="px-3 py-3">
                                    <span
                                      className={[
                                        "rounded-full border px-2.5 py-1 text-[10px] font-black",
                                        getVitalAlertClassName(
                                          observation.alertLevel,
                                        ),
                                      ].join(" ")}
                                    >
                                      {humanizeValue(
                                        observation.alertLevel,
                                      )}
                                    </span>
                                  </td>

                                  <td className="px-3 py-3 text-xs">
                                    {
                                      observation.recordedBy
                                    }
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </WonFlowOperationalPanel>
                </div>
              ) : null}

              {view === "fluids" ? (
                <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                  <WonFlowOperationalPanel
                    description="Record patient fluid intake and output."
                    icon={
                      <Droplets
                        size={18}
                      />
                    }
                    title="New Fluid Entry"
                    tone="blue"
                  >
                    <div className="space-y-4">
                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Direction
                        </span>

                        <select
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setFluidDirection(
                              event.target
                                .value as
                                DemoNursingFluidDirection,
                            );
                          }}
                          value={
                            fluidDirection
                          }
                        >
                          <option value="intake">
                            Intake
                          </option>

                          <option value="output">
                            Output
                          </option>
                        </select>
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Category
                        </span>

                        <select
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setFluidCategory(
                              event.target
                                .value as
                                DemoNursingFluidCategory,
                            );
                          }}
                          value={
                            fluidCategory
                          }
                        >
                          <option value="oral">
                            Oral
                          </option>

                          <option value="intravenous">
                            Intravenous
                          </option>

                          <option value="tube-feed">
                            Tube Feed
                          </option>

                          <option value="blood-product">
                            Blood Product
                          </option>

                          <option value="urine">
                            Urine
                          </option>

                          <option value="drain">
                            Drain
                          </option>

                          <option value="vomit">
                            Vomit
                          </option>

                          <option value="stool">
                            Stool
                          </option>

                          <option value="other">
                            Other
                          </option>
                        </select>
                      </label>

                      <NumberField
                        label="Amount mL"
                        onChange={
                          setFluidAmount
                        }
                        value={
                          fluidAmount
                        }
                      />

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Date and Time
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setFluidTime(
                              event.target.value,
                            );
                          }}
                          type="datetime-local"
                          value={
                            fluidTime
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Recorded By
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setFluidNurse(
                              event.target.value,
                            );
                          }}
                          placeholder="Nurse name"
                          value={
                            fluidNurse
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Description
                        </span>

                        <textarea
                          className={[
                            wonFlowTextareaClassName,
                            "mt-1.5 min-h-24",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setFluidDescription(
                              event.target.value,
                            );
                          }}
                          value={
                            fluidDescription
                          }
                        />
                      </label>

                      <WonFlowActionButton
                        className="w-full"
                        onClick={
                          recordFluidEntry
                        }
                        variant="primary"
                      >
                        Record Fluid Entry
                      </WonFlowActionButton>
                    </div>
                  </WonFlowOperationalPanel>

                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <FluidTotal
                        label="24h Intake"
                        value={
                          fluidSummary.intakeMillilitres
                        }
                      />

                      <FluidTotal
                        label="24h Output"
                        value={
                          fluidSummary.outputMillilitres
                        }
                      />

                      <FluidTotal
                        label="Net Balance"
                        value={
                          fluidSummary.netBalanceMillilitres
                        }
                      />
                    </div>

                    <WonFlowOperationalPanel
                      description="Recent fluid intake and output entries."
                      title="Fluid-Balance History"
                      tone="violet"
                    >
                      {selectedFluids.length ===
                      0 ? (
                        <WonFlowEmptyState
                          description="Fluid-balance entries will appear here."
                          title="No fluid entries"
                        />
                      ) : (
                        <div className="wf-content-scroll">
                          <table className="w-full min-w-[850px] border-collapse text-left">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                <th className="px-3 py-3">
                                  Time
                                </th>

                                <th className="px-3 py-3">
                                  Direction
                                </th>

                                <th className="px-3 py-3">
                                  Category
                                </th>

                                <th className="px-3 py-3 text-right">
                                  Amount
                                </th>

                                <th className="px-3 py-3">
                                  Description
                                </th>

                                <th className="px-3 py-3">
                                  Nurse
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {selectedFluids.map(
                                (entry) => (
                                  <tr
                                    className="border-b border-slate-100 last:border-0"
                                    key={
                                      entry.id
                                    }
                                  >
                                    <td className="px-3 py-3 text-xs">
                                      {formatWonFlowDashboardDateTime(
                                        entry.recordedAt,
                                      )}
                                    </td>

                                    <td className="px-3 py-3">
                                      <span
                                        className={
                                          entry.direction ===
                                          "intake"
                                            ? "wf-status wf-status-blue"
                                            : "wf-status wf-status-neutral"
                                        }
                                      >
                                        {humanizeValue(
                                          entry.direction,
                                        )}
                                      </span>
                                    </td>

                                    <td className="px-3 py-3 text-xs font-bold">
                                      {humanizeValue(
                                        entry.category,
                                      )}
                                    </td>

                                    <td className="px-3 py-3 text-right font-black">
                                      {
                                        entry.amountMillilitres
                                      }
                                      {" mL"}
                                    </td>

                                    <td className="px-3 py-3 text-xs">
                                      {entry.description ||
                                        "—"}
                                    </td>

                                    <td className="px-3 py-3 text-xs">
                                      {
                                        entry.recordedBy
                                      }
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </WonFlowOperationalPanel>
                  </div>
                </div>
              ) : null}

              {view ===
              "medications" ? (
                <div className="space-y-6">
                  <WonFlowOperationalPanel
                    description="Create a demonstration medication-administration schedule for the admitted patient."
                    icon={
                      <Pill size={18} />
                    }
                    title="Medication Schedule"
                    tone="blue"
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Medicine
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setMedicineName(
                              event.target.value,
                            );
                          }}
                          placeholder="Medicine name"
                          value={
                            medicineName
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Dose
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setMedicineDose(
                              event.target.value,
                            );
                          }}
                          placeholder="500 mg, 1 tablet..."
                          value={
                            medicineDose
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Route
                        </span>

                        <select
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setMedicationRoute(
                              event.target
                                .value as
                                DemoNursingMedicationRoute,
                            );
                          }}
                          value={
                            medicationRoute
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

                          <option value="inhaled">
                            Inhaled
                          </option>

                          <option value="topical">
                            Topical
                          </option>

                          <option value="rectal">
                            Rectal
                          </option>

                          <option value="other">
                            Other
                          </option>
                        </select>
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Scheduled Date and Time
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setMedicationTime(
                              event.target.value,
                            );
                          }}
                          type="datetime-local"
                          value={
                            medicationTime
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Ordered By
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setMedicationOrderedBy(
                              event.target.value,
                            );
                          }}
                          placeholder="Doctor or authorized prescriber"
                          value={
                            medicationOrderedBy
                          }
                        />
                      </label>

                      <label className="md:col-span-2 xl:col-span-3">
                        <span className="text-xs font-bold text-slate-600">
                          Administration Instructions
                        </span>

                        <textarea
                          className={[
                            wonFlowTextareaClassName,
                            "mt-1.5 min-h-20",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setMedicationInstructions(
                              event.target.value,
                            );
                          }}
                          value={
                            medicationInstructions
                          }
                        />
                      </label>
                    </div>

                    <WonFlowActionButton
                      className="mt-4"
                      onClick={
                        createMedicationSchedule
                      }
                      variant="primary"
                    >
                      Add Medication Schedule
                    </WonFlowActionButton>
                  </WonFlowOperationalPanel>

                  <div className="wf-workspace-rail">
                    <div className="wf-workspace-rail-side">
                      <WonFlowOperationalPanel
                        description="Select a scheduled medication to record its administration result."
                        title="Medication Queue"
                        tone="violet"
                      >
                        {selectedMedications.length ===
                        0 ? (
                          <WonFlowEmptyState
                            description="Scheduled inpatient medications will appear here."
                            title="No medications"
                          />
                        ) : (
                          <div className="space-y-3">
                            {selectedMedications.map(
                              (
                                medication,
                              ) => (
                                <button
                                  className={[
                                    "w-full rounded-2xl border p-4 text-left transition",
                                    selectedMedication?.id ===
                                    medication.id
                                      ? "border-violet-300 bg-violet-50"
                                      : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50",
                                  ].join(" ")}
                                  key={
                                    medication.id
                                  }
                                  onClick={() => {
                                    setSelectedMedicationId(
                                      medication.id,
                                    );
                                  }}
                                  type="button"
                                >
                                  <div className="font-black text-slate-950">
                                    {
                                      medication.medicineName
                                    }
                                  </div>

                                  <div className="mt-1 text-xs text-slate-500">
                                    {
                                      medication.dose
                                    }
                                    {" · "}
                                    {humanizeValue(
                                      medication.route,
                                    )}
                                  </div>

                                  <div className="mt-2 text-xs font-bold text-violet-700">
                                    {formatWonFlowDashboardDateTime(
                                      medication.scheduledAt,
                                    )}
                                  </div>

                                  <span
                                    className={[
                                      "mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black",
                                      getMedicationStatusClassName(
                                        medication.status,
                                      ),
                                    ].join(" ")}
                                  >
                                    {humanizeValue(
                                      medication.status,
                                    )}
                                  </span>
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </WonFlowOperationalPanel>
                    </div>

                    <div className="wf-workspace-rail-main">
                      <WonFlowOperationalPanel
                        description="Record whether the scheduled medicine was administered, withheld, refused or missed."
                        title="Medication Administration"
                        tone="emerald"
                      >
                        {selectedMedication ===
                        undefined ? (
                          <WonFlowEmptyState
                            description="Select a scheduled medication."
                            title="Select medication"
                          />
                        ) : selectedMedication.status !==
                          "scheduled" ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                            <div className="text-lg font-black text-emerald-950">
                              {humanizeValue(
                                selectedMedication.status,
                              )}
                            </div>

                            <p className="mt-2 text-sm text-emerald-700">
                              Recorded by
                              {" "}
                              <strong>
                                {
                                  selectedMedication.actionedBy
                                }
                              </strong>
                              {" "}
                              on
                              {" "}
                              {formatWonFlowDashboardDateTime(
                                selectedMedication.actionedAt,
                              )}
                              .
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                              <div className="text-lg font-black text-blue-950">
                                {
                                  selectedMedication.medicineName
                                }
                              </div>

                              <div className="mt-1 text-xs text-blue-700">
                                {
                                  selectedMedication.dose
                                }
                                {" · "}
                                {humanizeValue(
                                  selectedMedication.route,
                                )}
                              </div>

                              <div className="mt-2 text-xs text-blue-700">
                                Due:
                                {" "}
                                {formatWonFlowDashboardDateTime(
                                  selectedMedication.scheduledAt,
                                )}
                              </div>
                            </div>

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Administration Result
                              </span>

                              <select
                                className={[
                                  wonFlowInputClassName,
                                  "mt-1.5",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  setMedicationActionStatus(
                                    event.target
                                      .value as
                                      Exclude<
                                        DemoNursingMedicationStatus,
                                        "scheduled"
                                      >,
                                  );
                                }}
                                value={
                                  medicationActionStatus
                                }
                              >
                                <option value="administered">
                                  Administered
                                </option>

                                <option value="withheld">
                                  Withheld
                                </option>

                                <option value="refused">
                                  Patient Refused
                                </option>

                                <option value="missed">
                                  Missed
                                </option>
                              </select>
                            </label>

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Responsible Nurse
                              </span>

                              <input
                                className={[
                                  wonFlowInputClassName,
                                  "mt-1.5",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  setMedicationActionNurse(
                                    event.target.value,
                                  );
                                }}
                                value={
                                  medicationActionNurse
                                }
                              />
                            </label>

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Reason
                              </span>

                              <textarea
                                className={[
                                  wonFlowTextareaClassName,
                                  "mt-1.5 min-h-20",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  setMedicationActionReason(
                                    event.target.value,
                                  );
                                }}
                                placeholder={
                                  medicationActionStatus ===
                                  "administered"
                                    ? "Optional"
                                    : "Required reason"
                                }
                                value={
                                  medicationActionReason
                                }
                              />
                            </label>

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Administration Note
                              </span>

                              <textarea
                                className={[
                                  wonFlowTextareaClassName,
                                  "mt-1.5 min-h-20",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  setMedicationActionNote(
                                    event.target.value,
                                  );
                                }}
                                value={
                                  medicationActionNote
                                }
                              />
                            </label>

                            <WonFlowActionButton
                              className="w-full"
                              onClick={
                                recordMedicationAction
                              }
                              variant="primary"
                            >
                              Record Medication Result
                            </WonFlowActionButton>
                          </div>
                        )}
                      </WonFlowOperationalPanel>
                    </div>
                  </div>
                </div>
              ) : null}

              {view === "handover" ? (
                <div className="space-y-6">
                  <WonFlowOperationalPanel
                    description="Prepare a structured nursing handover for the incoming shift."
                    icon={
                      <ClipboardList
                        size={18}
                      />
                    }
                    title="Shift Handover"
                    tone="violet"
                  >
                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        Nursing Shift
                      </span>

                      <select
                        className={[
                          wonFlowInputClassName,
                          "mt-1.5",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          setHandoverShift(
                            event.target
                              .value as
                              DemoNursingShift,
                          );
                        }}
                        value={
                          handoverShift
                        }
                      >
                        <option value="day">
                          Day Shift
                        </option>

                        <option value="evening">
                          Evening Shift
                        </option>

                        <option value="night">
                          Night Shift
                        </option>
                      </select>
                    </label>

                    {handoverDraft ===
                    undefined ? (
                      <div className="mt-4">
                        <WonFlowEmptyState
                          description="The handover draft could not be prepared."
                          title="Handover unavailable"
                        />
                      </div>
                    ) : (
                      <fieldset
                        className="mt-5"
                        disabled={
                          handoverDraft.status ===
                          "completed"
                        }
                      >
                        <div className="grid gap-4 lg:grid-cols-2">
                          <HandoverField
                            label="Outgoing Nurse"
                            onChange={(
                              value,
                            ) => {
                              updateHandover({
                                fromNurse:
                                  value,
                              });
                            }}
                            value={
                              handoverDraft.fromNurse
                            }
                          />

                          <HandoverField
                            label="Incoming Nurse"
                            onChange={(
                              value,
                            ) => {
                              updateHandover({
                                toNurse:
                                  value,
                              });
                            }}
                            value={
                              handoverDraft.toNurse
                            }
                          />

                          <HandoverTextarea
                            label="Situation"
                            onChange={(
                              value,
                            ) => {
                              updateHandover({
                                situation:
                                  value,
                              });
                            }}
                            placeholder="Current condition, reason for admission and immediate concerns"
                            value={
                              handoverDraft.situation
                            }
                          />

                          <HandoverTextarea
                            label="Background"
                            onChange={(
                              value,
                            ) => {
                              updateHandover({
                                background:
                                  value,
                              });
                            }}
                            placeholder="Relevant history, diagnosis, procedures and treatment"
                            value={
                              handoverDraft.background
                            }
                          />

                          <HandoverTextarea
                            label="Assessment"
                            onChange={(
                              value,
                            ) => {
                              updateHandover({
                                assessment:
                                  value,
                              });
                            }}
                            placeholder="Latest nursing assessment, vitals, pain, fluids and response"
                            value={
                              handoverDraft.assessment
                            }
                          />

                          <HandoverTextarea
                            label="Recommendation"
                            onChange={(
                              value,
                            ) => {
                              updateHandover({
                                recommendation:
                                  value,
                              });
                            }}
                            placeholder="Monitoring, medication, tests and escalation required"
                            value={
                              handoverDraft.recommendation
                            }
                          />

                          <HandoverTextarea
                            label="Safety Risks"
                            onChange={(
                              value,
                            ) => {
                              updateHandover({
                                safetyRisks:
                                  value,
                              });
                            }}
                            placeholder="Falls, allergies, pressure injury, infection, oxygen or other risks"
                            value={
                              handoverDraft.safetyRisks
                            }
                          />

                          <HandoverTextarea
                            label="Pending Tasks"
                            onChange={(
                              value,
                            ) => {
                              updateHandover({
                                pendingTasks:
                                  value,
                              });
                            }}
                            placeholder="Pending medication, sample, report, procedure or review"
                            value={
                              handoverDraft.pendingTasks
                            }
                          />
                        </div>
                      </fieldset>
                    )}
                  </WonFlowOperationalPanel>

                  {handoverDraft !==
                    undefined &&
                  handoverDraft.status ===
                    "draft" ? (
                    <div className="wf-sticky-actions flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">
                          {
                            handoverDraft.handoverNumber
                          }
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Save the draft or complete the shift handover.
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <WonFlowActionButton
                          onClick={
                            saveHandoverDraft
                          }
                          variant="secondary"
                        >
                          Save Draft
                        </WonFlowActionButton>

                        <WonFlowActionButton
                          onClick={
                            completeHandover
                          }
                          variant="primary"
                        >
                          Complete Handover
                        </WonFlowActionButton>
                      </div>
                    </div>
                  ) : null}

                  <WonFlowOperationalPanel
                    description="Previously prepared nursing handovers for this admission."
                    title="Handover History"
                    tone="blue"
                  >
                    {selectedHandovers.length ===
                    0 ? (
                      <WonFlowEmptyState
                        description="Completed nursing handovers will appear here."
                        title="No handovers"
                      />
                    ) : (
                      <div className="wf-content-scroll">
                        <table className="w-full min-w-[900px] border-collapse text-left">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                              <th className="px-3 py-3">
                                Handover
                              </th>

                              <th className="px-3 py-3">
                                Shift
                              </th>

                              <th className="px-3 py-3">
                                Outgoing Nurse
                              </th>

                              <th className="px-3 py-3">
                                Incoming Nurse
                              </th>

                              <th className="px-3 py-3">
                                Status
                              </th>

                              <th className="px-3 py-3">
                                Completed
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {selectedHandovers.map(
                              (handover) => (
                                <tr
                                  className="border-b border-slate-100 last:border-0"
                                  key={
                                    handover.id
                                  }
                                >
                                  <td className="px-3 py-3 font-mono text-xs font-bold">
                                    {
                                      handover.handoverNumber
                                    }
                                  </td>

                                  <td className="px-3 py-3 text-xs font-bold">
                                    {humanizeValue(
                                      handover.shift,
                                    )}
                                  </td>

                                  <td className="px-3 py-3 text-xs">
                                    {handover.fromNurse ||
                                      "—"}
                                  </td>

                                  <td className="px-3 py-3 text-xs">
                                    {handover.toNurse ||
                                      "—"}
                                  </td>

                                  <td className="px-3 py-3">
                                    <span className="wf-status wf-status-neutral">
                                      {humanizeValue(
                                        handover.status,
                                      )}
                                    </span>
                                  </td>

                                  <td className="px-3 py-3 text-xs">
                                    {handover.completedAt
                                      ? formatWonFlowDashboardDateTime(
                                          handover.completedAt,
                                        )
                                      : "Not completed"}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </WonFlowOperationalPanel>
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

function NumberField({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: string;
  step?: string;

  onChange:
    (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-600">
        {label}
      </span>

      <input
        className={[
          wonFlowInputClassName,
          "mt-1.5",
        ].join(" ")}
        onChange={(
          event,
        ) => {
          onChange(
            event.target.value,
          );
        }}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function FluidTotal({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[18px] border border-blue-100 bg-blue-50 p-4">
      <div className="text-xs font-black uppercase tracking-wide text-blue-700">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black text-blue-950">
        {value.toLocaleString(
          "en-US",
        )}
        {" mL"}
      </div>
    </div>
  );
}

function HandoverField({
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
    <label>
      <span className="text-xs font-bold text-slate-600">
        {label}
      </span>

      <input
        className={[
          wonFlowInputClassName,
          "mt-1.5",
        ].join(" ")}
        onChange={(
          event,
        ) => {
          onChange(
            event.target.value,
          );
        }}
        value={value}
      />
    </label>
  );
}

function HandoverTextarea({
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
          "mt-1.5 min-h-28",
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

export function NursingStationWorkspace() {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "inpatient-nursing-station",

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
      emptyTitle="Nursing station unavailable"
      loadingDescription="WonFlow is preparing inpatient admissions and nursing records."
      loadingTitle="Preparing nursing station"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <NursingStationContent
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
