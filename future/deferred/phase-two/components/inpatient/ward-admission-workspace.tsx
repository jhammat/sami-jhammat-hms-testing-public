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
  ArrowRightLeft,
  BedDouble,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  Printer,
  Search,
  UserPlus,
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
  admitDemoInpatient,
  buildDemoInpatientCensusSummary,
  dischargeDemoInpatient,
  initializeDemoInpatientDirectory,
  markDemoInpatientDischargeReady,
  readDemoInpatientAdmissions,
  readDemoInpatientBeds,
  readDemoInpatientWards,
  transferDemoInpatient,
  updateDemoInpatientBedStatus,
  validateDemoDischargeReadiness,
  validateDemoInpatientAdmission,
} from "@/lib/inpatient";

import type {
  DemoInpatientAdmission,
  DemoInpatientAdmissionPriority,
  DemoInpatientAdmissionType,
  DemoInpatientBed,
  DemoInpatientBedStatus,
  DemoInpatientDischargeReadiness,
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

type InpatientWorkspaceView =
  | "census"
  | "admission"
  | "transfer"
  | "discharge";

type BedStatusFilter =
  | "all"
  | DemoInpatientBedStatus;

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

function createEmptyReadiness():
  DemoInpatientDischargeReadiness {
  return {
    doctorClearance: false,

    nursingSummaryCompleted:
      false,

    medicationReconciliationCompleted:
      false,

    billingClearance: false,

    followUpPlanCompleted:
      false,

    finalDiagnosis: "",

    dischargeInstructions: "",

    followUpPlan: "",
  };
}

function getBedStatusClassName(
  status:
    DemoInpatientBedStatus,
): string {
  switch (status) {
    case "available":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "occupied":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "reserved":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "cleaning":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "maintenance":
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

interface WardAdmissionContentProps {
  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];

  initialPatientId?: string;
}

function WardAdmissionContent({
  branches,
  practitioners,
  initialPatientId,
}: WardAdmissionContentProps) {
  const [
    view,
    setView,
  ] = useState<InpatientWorkspaceView>(
    initialPatientId
      ? "admission"
      : "census",
  );

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
    selectedBranchId,
    setSelectedBranchId,
  ] = useState("");

  const [
    selectedWardId,
    setSelectedWardId,
  ] = useState("");

  const [
    bedStatusFilter,
    setBedStatusFilter,
  ] = useState<BedStatusFilter>(
    "all",
  );

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    selectedBedId,
    setSelectedBedId,
  ] = useState("");

  const [
    bedOperationNote,
    setBedOperationNote,
  ] = useState("");

  const [
    admissionPatientId,
    setAdmissionPatientId,
  ] = useState(
    initialPatientId ?? "",
  );

  const [
    admissionBranchId,
    setAdmissionBranchId,
  ] = useState("");

  const [
    admissionPractitionerId,
    setAdmissionPractitionerId,
  ] = useState("");

  const [
    admissionEncounterId,
    setAdmissionEncounterId,
  ] = useState("");

  const [
    admissionType,
    setAdmissionType,
  ] = useState<
    DemoInpatientAdmissionType
  >("elective");

  const [
    admissionPriority,
    setAdmissionPriority,
  ] = useState<
    DemoInpatientAdmissionPriority
  >("routine");

  const [
    admissionReason,
    setAdmissionReason,
  ] = useState("");

  const [
    provisionalDiagnosis,
    setProvisionalDiagnosis,
  ] = useState("");

  const [
    admissionBedId,
    setAdmissionBedId,
  ] = useState("");

  const [
    admittedBy,
    setAdmittedBy,
  ] = useState("");

  const [
    expectedDischargeDate,
    setExpectedDischargeDate,
  ] = useState("");

  const [
    selectedTransferAdmissionId,
    setSelectedTransferAdmissionId,
  ] = useState("");

  const [
    transferTargetBedId,
    setTransferTargetBedId,
  ] = useState("");

  const [
    transferReason,
    setTransferReason,
  ] = useState("");

  const [
    transferRequestedBy,
    setTransferRequestedBy,
  ] = useState("");

  const [
    transferredBy,
    setTransferredBy,
  ] = useState("");

  const [
    selectedDischargeAdmissionId,
    setSelectedDischargeAdmissionId,
  ] = useState("");

  const [
    dischargeReadiness,
    setDischargeReadiness,
  ] = useState<
    DemoInpatientDischargeReadiness
  >(
    createEmptyReadiness,
  );

  const [
    dischargedBy,
    setDischargedBy,
  ] = useState("");

  const [
    dischargeSummary,
    setDischargeSummary,
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
      initializeDemoInpatientDirectory(
        branches.map(
          (branch) => ({
            id: branch.id,
            name: branch.name,
          }),
        ),
      );

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
    }, [branches]);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    const eventNames = [
      "wonflow:demo-patients-changed",
      "wonflow:demo-inpatient-wards-changed",
      "wonflow:demo-inpatient-beds-changed",
      "wonflow:demo-inpatient-admissions-changed",
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

  const admissionsById =
    useMemo(
      () =>
        new Map(
          admissions.map(
            (admission) => [
              admission.id,
              admission,
            ],
          ),
        ),
      [admissions],
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

  const censusSummary =
    useMemo(
      () =>
        buildDemoInpatientCensusSummary(
          selectedBranchId,
        ),
      [
        admissions,
        beds,
        selectedBranchId,
      ],
    );

  const normalizedSearch =
    searchValue
      .trim()
      .toLocaleLowerCase();

  const visibleWards =
    wards.filter(
      (ward) =>
        selectedBranchId ===
          "" ||
        ward.branchId ===
          selectedBranchId,
    );

  const visibleBeds =
    beds
      .filter(
        (bed) => {
          if (
            selectedBranchId !==
              "" &&
            bed.branchId !==
              selectedBranchId
          ) {
            return false;
          }

          if (
            selectedWardId !==
              "" &&
            bed.wardId !==
              selectedWardId
          ) {
            return false;
          }

          if (
            bedStatusFilter !==
              "all" &&
            bed.status !==
              bedStatusFilter
          ) {
            return false;
          }

          if (
            normalizedSearch ===
            ""
          ) {
            return true;
          }

          const admission =
            admissionsById.get(
              bed.currentAdmissionId,
            );

          const patient =
            admission ===
            undefined
              ? undefined
              : patientsById.get(
                  admission.patientId,
                );

          const ward =
            wardsById.get(
              bed.wardId,
            );

          return [
            bed.bedLabel,
            bed.roomNumber,
            ward?.wardName ?? "",
            patient?.displayName ?? "",
            patient?.mrNumber ?? "",
            bed.status,
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(
              normalizedSearch,
            );
        },
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.bedLabel.localeCompare(
            right.bedLabel,
          ),
      );

  const selectedBed =
    beds.find(
      (bed) =>
        bed.id ===
        selectedBedId,
    ) ??
    visibleBeds[0];

  const admissionAvailableBeds =
    beds.filter(
      (bed) =>
        bed.status ===
          "available" &&
        (
          admissionBranchId ===
            "" ||
          bed.branchId ===
            admissionBranchId
        ),
    );

  const activeAdmissions =
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
      );

  const selectedTransferAdmission =
    activeAdmissions.find(
      (admission) =>
        admission.id ===
        selectedTransferAdmissionId,
    ) ??
    activeAdmissions.find(
      (admission) =>
        admission.status ===
        "admitted",
    );

  const transferAvailableBeds =
    selectedTransferAdmission ===
    undefined
      ? []
      : beds.filter(
          (bed) =>
            bed.status ===
              "available" &&
            bed.branchId ===
              selectedTransferAdmission.branchId,
        );

  const selectedDischargeAdmission =
    activeAdmissions.find(
      (admission) =>
        admission.id ===
        selectedDischargeAdmissionId,
    ) ??
    activeAdmissions[0];

  function resetAdmissionForm() {
    setAdmissionPatientId("");
    setAdmissionBranchId("");
    setAdmissionPractitionerId("");
    setAdmissionEncounterId("");
    setAdmissionType("elective");
    setAdmissionPriority("routine");
    setAdmissionReason("");
    setProvisionalDiagnosis("");
    setAdmissionBedId("");
    setAdmittedBy("");
    setExpectedDischargeDate("");
  }

  function admitPatient() {
    const input = {
      patientId:
        admissionPatientId,

      branchId:
        admissionBranchId,

      practitionerId:
        admissionPractitionerId,

      encounterId:
        admissionEncounterId,

      admissionType,

      priority:
        admissionPriority,

      admissionReason,

      provisionalDiagnosis,

      bedId:
        admissionBedId,

      admittedBy,

      expectedDischargeDate,
    };

    const errors =
      validateDemoInpatientAdmission(
        input,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required admission information.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Admit this patient and occupy the selected inpatient bed?",
      );

    if (!confirmed) {
      return;
    }

    const admission =
      admitDemoInpatient(
        input,
      );

    if (
      admission === undefined
    ) {
      setActionMessage(
        "The patient could not be admitted. The selected bed may no longer be available.",
      );

      return;
    }

    resetAdmissionForm();

    setValidationErrors([]);

    reloadLocalData();

    setSelectedBranchId(
      admission.branchId,
    );

    setView("census");

    setActionMessage(
      `${admission.admissionNumber} created successfully.`,
    );
  }

  function updateSelectedBedStatus(
    status:
      Exclude<
        DemoInpatientBedStatus,
        "occupied"
      >,
  ) {
    if (
      selectedBed ===
      undefined
    ) {
      return;
    }

    const updatedBed =
      updateDemoInpatientBedStatus({
        bedId:
          selectedBed.id,

        status,

        note:
          bedOperationNote,
      });

    if (
      updatedBed ===
      undefined
    ) {
      setActionMessage(
        "An occupied bed cannot be changed manually.",
      );

      return;
    }

    setBedOperationNote("");

    reloadLocalData();

    setActionMessage(
      `${updatedBed.bedLabel} marked ${humanizeValue(
        updatedBed.status,
      ).toLocaleLowerCase()}.`,
    );
  }

  function transferPatient() {
    if (
      selectedTransferAdmission ===
      undefined
    ) {
      return;
    }

    const transferredAdmission =
      transferDemoInpatient({
        admissionId:
          selectedTransferAdmission.id,

        targetBedId:
          transferTargetBedId,

        reason:
          transferReason,

        requestedBy:
          transferRequestedBy,

        transferredBy,
      });

    if (
      transferredAdmission ===
      undefined
    ) {
      setActionMessage(
        "Complete the transfer details and select an available bed in the same hospital branch.",
      );

      return;
    }

    setTransferTargetBedId("");
    setTransferReason("");
    setTransferRequestedBy("");
    setTransferredBy("");

    reloadLocalData();

    setActionMessage(
      `${transferredAdmission.admissionNumber} transferred successfully.`,
    );
  }

  function loadDischargeAdmission(
    admissionId: string,
  ) {
    const admission =
      activeAdmissions.find(
        (record) =>
          record.id ===
          admissionId,
      );

    setSelectedDischargeAdmissionId(
      admissionId,
    );

    setDischargeReadiness(
      admission === undefined
        ? createEmptyReadiness()
        : {
            ...admission
              .dischargeReadiness,
          },
    );

    setDischargeSummary(
      admission?.dischargeSummary ??
        "",
    );

    setDischargedBy(
      admission?.dischargedBy ??
        "",
    );

    setValidationErrors([]);
  }

  function updateReadiness(
    changes:
      Partial<
        DemoInpatientDischargeReadiness
      >,
  ) {
    setDischargeReadiness(
      (current) => ({
        ...current,
        ...changes,
      }),
    );

    setValidationErrors([]);
  }

  function markDischargeReady() {
    if (
      selectedDischargeAdmission ===
      undefined
    ) {
      return;
    }

    const errors =
      validateDemoDischargeReadiness(
        dischargeReadiness,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete every discharge-readiness requirement.",
      );

      return;
    }

    const updatedAdmission =
      markDemoInpatientDischargeReady(
        selectedDischargeAdmission.id,

        dischargeReadiness,
      );

    if (
      updatedAdmission ===
      undefined
    ) {
      setActionMessage(
        "The patient could not be marked discharge-ready.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      `${updatedAdmission.admissionNumber} is ready for discharge.`,
    );
  }

  function dischargePatient() {
    if (
      selectedDischargeAdmission ===
      undefined
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Discharge this patient and move the occupied bed to cleaning status?",
      );

    if (!confirmed) {
      return;
    }

    const dischargedAdmission =
      dischargeDemoInpatient({
        admissionId:
          selectedDischargeAdmission.id,

        dischargedBy,

        dischargeSummary,
      });

    if (
      dischargedAdmission ===
      undefined
    ) {
      setActionMessage(
        "The patient must be discharge-ready, with responsible staff and a discharge summary.",
      );

      return;
    }

    setSelectedDischargeAdmissionId("");
    setDischargeReadiness(
      createEmptyReadiness(),
    );
    setDischargedBy("");
    setDischargeSummary("");

    reloadLocalData();

    setView("census");

    setActionMessage(
      `${dischargedAdmission.admissionNumber} discharged successfully.`,
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href="/operations/inpatient/nursing"
            >
              Nursing Station
            </Link>
            <Link
              className="wf-button-secondary"
              href="/doctor/inpatients"
            >
              Doctor Rounds
            </Link>
            <Link
              className="wf-button-secondary"
              href="/operations/surgery/operation-theatre"
            >
              Operation Theatre
            </Link>
            <Link
              className="wf-button-secondary"
              href="/operations/inpatient/wards/census/print"
            >
              <Printer size={16} />
              Print Census
            </Link>

            <Link
              className="wf-button-secondary"
              href="/operations/patients"
            >
              Patient Directory
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
              "Inpatient Wards",
          },
        ]}
        description="Manage patient admissions, beds, ward transfers, discharge readiness and the live inpatient census."
        eyebrow="Inpatient Operations"
        leading={
          <BedDouble size={20} />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              Fictional inpatient data
            </span>

            <span>
              Multi-branch bed directory
            </span>
          </>
        }
        title="Ward Admissions and Bed Management"
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WonFlowKpiCard
          helperText={`${censusSummary.totalBeds} total inpatient beds`}
          icon={
            <BedDouble size={18} />
          }
          label="Available Beds"
          tone="emerald"
          value={
            censusSummary.availableBeds
          }
        />

        <WonFlowKpiCard
          helperText={`${censusSummary.occupancyRate}% occupancy`}
          icon={
            <Activity size={18} />
          }
          label="Occupied Beds"
          tone="blue"
          value={
            censusSummary.occupiedBeds
          }
        />

        <WonFlowKpiCard
          helperText="Beds awaiting housekeeping clearance"
          icon={
            <DoorOpen size={18} />
          }
          label="Cleaning"
          tone="amber"
          value={
            censusSummary.cleaningBeds
          }
        />

        <WonFlowKpiCard
          helperText="Patients cleared for final discharge"
          icon={
            <ClipboardCheck
              size={18}
            />
          }
          label="Discharge Ready"
          tone="violet"
          value={
            censusSummary.dischargeReadyPatients
          }
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-[18px] border border-slate-200 bg-white p-3">
        <WonFlowActionButton
          onClick={() => {
            setView("census");
          }}
          variant={
            view === "census"
              ? "primary"
              : "secondary"
          }
        >
          Live Census
        </WonFlowActionButton>

        <WonFlowActionButton
          icon={
            <UserPlus size={16} />
          }
          onClick={() => {
            setView("admission");
          }}
          variant={
            view === "admission"
              ? "primary"
              : "secondary"
          }
        >
          New Admission
        </WonFlowActionButton>

        <WonFlowActionButton
          icon={
            <ArrowRightLeft
              size={16}
            />
          }
          onClick={() => {
            setView("transfer");
          }}
          variant={
            view === "transfer"
              ? "primary"
              : "secondary"
          }
        >
          Bed Transfer
        </WonFlowActionButton>

        <WonFlowActionButton
          icon={
            <CheckCircle2
              size={16}
            />
          }
          onClick={() => {
            setView("discharge");
          }}
          variant={
            view === "discharge"
              ? "primary"
              : "secondary"
          }
        >
          Discharge
        </WonFlowActionButton>
      </div>

      {view === "census" ? (
        <div className="space-y-6">
          <section className="rounded-[18px] border border-slate-200 bg-white p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_220px]">
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
                    setSearchValue(
                      event.target.value,
                    );
                  }}
                  placeholder="Search patient, MR, ward, room or bed"
                  type="search"
                  value={searchValue}
                />
              </label>

              <select
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setSelectedBranchId(
                    event.target.value,
                  );

                  setSelectedWardId("");
                }}
                value={
                  selectedBranchId
                }
              >
                <option value="">
                  All Branches
                </option>

                {branches.map(
                  (branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                    >
                      {branch.name}
                    </option>
                  ),
                )}
              </select>

              <select
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setSelectedWardId(
                    event.target.value,
                  );
                }}
                value={
                  selectedWardId
                }
              >
                <option value="">
                  All Wards
                </option>

                {visibleWards.map(
                  (ward) => (
                    <option
                      key={ward.id}
                      value={ward.id}
                    >
                      {ward.wardName}
                    </option>
                  ),
                )}
              </select>

              <select
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setBedStatusFilter(
                    event.target
                      .value as
                      BedStatusFilter,
                  );
                }}
                value={
                  bedStatusFilter
                }
              >
                <option value="all">
                  All Bed Statuses
                </option>

                <option value="available">
                  Available
                </option>

                <option value="occupied">
                  Occupied
                </option>

                <option value="reserved">
                  Reserved
                </option>

                <option value="cleaning">
                  Cleaning
                </option>

                <option value="maintenance">
                  Maintenance
                </option>
              </select>
            </div>
          </section>

          <div className="wf-workflow-split">
            <div className="wf-workflow-main">
              <WonFlowOperationalPanel
                description="Select a bed to review its current patient and operational status."
                status={
                  <span className="wf-status wf-status-blue">
                    {
                      visibleBeds.length
                    }
                    {" beds"}
                  </span>
                }
                title="Inpatient Bed Census"
                tone="blue"
              >
                {visibleBeds.length ===
                0 ? (
                  <WonFlowEmptyState
                    description="No inpatient bed matches the selected filters."
                    title="No beds found"
                  />
                ) : (
                  <div className="wf-content-scroll">
                    <table className="w-full min-w-[1100px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-3">
                            Bed
                          </th>

                          <th className="px-3 py-3">
                            Ward
                          </th>

                          <th className="px-3 py-3">
                            Room
                          </th>

                          <th className="px-3 py-3">
                            Patient
                          </th>

                          <th className="px-3 py-3">
                            Admission
                          </th>

                          <th className="px-3 py-3">
                            Admitting Doctor
                          </th>

                          <th className="px-3 py-3">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {visibleBeds.map(
                          (bed) => {
                            const admission =
                              admissionsById.get(
                                bed.currentAdmissionId,
                              );

                            const patient =
                              admission ===
                              undefined
                                ? undefined
                                : patientsById.get(
                                    admission.patientId,
                                  );

                            const practitioner =
                              admission ===
                              undefined
                                ? undefined
                                : practitionersById.get(
                                    admission.practitionerId,
                                  );

                            const ward =
                              wardsById.get(
                                bed.wardId,
                              );

                            const selected =
                              selectedBed?.id ===
                              bed.id;

                            return (
                              <tr
                                className={[
                                  "cursor-pointer border-b border-slate-100 last:border-0",
                                  selected
                                    ? "bg-blue-50"
                                    : "hover:bg-slate-50",
                                ].join(" ")}
                                key={bed.id}
                                onClick={() => {
                                  setSelectedBedId(
                                    bed.id,
                                  );
                                }}
                              >
                                <td className="px-3 py-3">
                                  <div className="font-black text-slate-950">
                                    {
                                      bed.bedLabel
                                    }
                                  </div>

                                  <div className="mt-1 text-xs text-slate-500">
                                    {humanizeValue(
                                      bed.roomType,
                                    )}
                                  </div>
                                </td>

                                <td className="px-3 py-3 text-xs font-bold">
                                  {ward?.wardName ??
                                    "Unknown ward"}
                                </td>

                                <td className="px-3 py-3 text-xs">
                                  {
                                    bed.roomNumber
                                  }
                                </td>

                                <td className="px-3 py-3">
                                  <div className="font-black text-slate-900">
                                    {patient?.displayName ??
                                      "—"}
                                  </div>

                                  <div className="mt-1 text-xs text-slate-500">
                                    {patient?.mrNumber ??
                                      ""}
                                  </div>
                                </td>

                                <td className="px-3 py-3">
                                  <div className="font-mono text-xs font-bold">
                                    {admission?.admissionNumber ??
                                      "—"}
                                  </div>

                                  {admission !==
                                  undefined ? (
                                    <div className="mt-1 text-[11px] text-slate-500">
                                      {formatWonFlowDashboardDateTime(
                                        admission.admittedAt,
                                      )}
                                    </div>
                                  ) : null}
                                </td>

                                <td className="px-3 py-3 text-xs">
                                  {practitioner?.displayName ??
                                    "—"}
                                </td>

                                <td className="px-3 py-3">
                                  <span
                                    className={[
                                      "rounded-full border px-2.5 py-1 text-[10px] font-black",
                                      getBedStatusClassName(
                                        bed.status,
                                      ),
                                    ].join(" ")}
                                  >
                                    {humanizeValue(
                                      bed.status,
                                    )}
                                  </span>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </WonFlowOperationalPanel>
            </div>

            <aside className="wf-workflow-aside">
              <WonFlowOperationalPanel
                description="Manage non-occupied bed availability, cleaning and maintenance status."
                title="Bed Operations"
                tone="amber"
              >
                {selectedBed ===
                undefined ? (
                  <WonFlowEmptyState
                    description="Select an inpatient bed from the census."
                    title="Select a bed"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <div className="text-lg font-black text-blue-950">
                        {
                          selectedBed.bedLabel
                        }
                      </div>

                      <div className="mt-1 text-xs text-blue-700">
                        {wardsById.get(
                          selectedBed.wardId,
                        )?.wardName ??
                          "Unknown ward"}
                        {" · Room "}
                        {
                          selectedBed.roomNumber
                        }
                      </div>

                      <span
                        className={[
                          "mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black",
                          getBedStatusClassName(
                            selectedBed.status,
                          ),
                        ].join(" ")}
                      >
                        {humanizeValue(
                          selectedBed.status,
                        )}
                      </span>
                    </div>

                    {selectedBed.status ===
                    "occupied" ? (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-700">
                        Occupied beds are controlled through patient transfer and discharge workflows.
                      </div>
                    ) : (
                      <>
                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Operational Note
                          </span>

                          <textarea
                            className={[
                              wonFlowTextareaClassName,
                              "mt-1.5 min-h-24",
                            ].join(" ")}
                            onChange={(
                              event,
                            ) => {
                              setBedOperationNote(
                                event.target.value,
                              );
                            }}
                            placeholder="Cleaning, reservation or maintenance note"
                            value={
                              bedOperationNote
                            }
                          />
                        </label>

                        <div className="grid gap-2">
                          <WonFlowActionButton
                            onClick={() => {
                              updateSelectedBedStatus(
                                "available",
                              );
                            }}
                            variant="primary"
                          >
                            Mark Available
                          </WonFlowActionButton>

                          <WonFlowActionButton
                            onClick={() => {
                              updateSelectedBedStatus(
                                "cleaning",
                              );
                            }}
                            variant="secondary"
                          >
                            Send to Cleaning
                          </WonFlowActionButton>

                          <WonFlowActionButton
                            onClick={() => {
                              updateSelectedBedStatus(
                                "reserved",
                              );
                            }}
                            variant="secondary"
                          >
                            Reserve Bed
                          </WonFlowActionButton>

                          <WonFlowActionButton
                            onClick={() => {
                              updateSelectedBedStatus(
                                "maintenance",
                              );
                            }}
                            variant="danger"
                          >
                            Mark Maintenance
                          </WonFlowActionButton>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </WonFlowOperationalPanel>
            </aside>
          </div>
        </div>
      ) : null}

      {view === "admission" ? (
        <WonFlowOperationalPanel
          description="Register the inpatient admission and allocate an available bed."
          icon={
            <UserPlus size={18} />
          }
          title="New Inpatient Admission"
          tone="blue"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="xl:col-span-2">
              <span className="text-xs font-bold text-slate-600">
                Patient
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAdmissionPatientId(
                    event.target.value,
                  );
                }}
                value={
                  admissionPatientId
                }
              >
                <option value="">
                  Select patient
                </option>

                {patients.map(
                  (patient) => (
                    <option
                      key={patient.id}
                      value={patient.id}
                    >
                      {patient.displayName}
                      {" — "}
                      {patient.mrNumber}
                      {" — "}
                      {patient.draft
                        .cnicNumber}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Hospital Branch
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAdmissionBranchId(
                    event.target.value,
                  );

                  setAdmissionBedId("");
                }}
                value={
                  admissionBranchId
                }
              >
                <option value="">
                  Select branch
                </option>

                {branches.map(
                  (branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                    >
                      {branch.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Admitting Doctor
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAdmissionPractitionerId(
                    event.target.value,
                  );
                }}
                value={
                  admissionPractitionerId
                }
              >
                <option value="">
                  Select doctor
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
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Admission Type
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAdmissionType(
                    event.target
                      .value as
                      DemoInpatientAdmissionType,
                  );
                }}
                value={admissionType}
              >
                <option value="emergency">
                  Emergency
                </option>

                <option value="elective">
                  Elective
                </option>

                <option value="observation">
                  Observation
                </option>

                <option value="day-care">
                  Day Care
                </option>
              </select>
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Admission Priority
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAdmissionPriority(
                    event.target
                      .value as
                      DemoInpatientAdmissionPriority,
                  );
                }}
                value={
                  admissionPriority
                }
              >
                <option value="routine">
                  Routine
                </option>

                <option value="urgent">
                  Urgent
                </option>

                <option value="critical">
                  Critical
                </option>
              </select>
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Encounter Reference
              </span>

              <input
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAdmissionEncounterId(
                    event.target.value,
                  );
                }}
                placeholder="Optional encounter ID"
                value={
                  admissionEncounterId
                }
              />
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Expected Discharge Date
              </span>

              <input
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setExpectedDischargeDate(
                    event.target.value,
                  );
                }}
                type="date"
                value={
                  expectedDischargeDate
                }
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-xs font-bold text-slate-600">
                Admission Reason
              </span>

              <textarea
                className={[
                  wonFlowTextareaClassName,
                  "mt-1.5 min-h-24",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAdmissionReason(
                    event.target.value,
                  );
                }}
                placeholder="Clinical or operational reason for hospital admission"
                value={
                  admissionReason
                }
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-xs font-bold text-slate-600">
                Provisional Diagnosis
              </span>

              <textarea
                className={[
                  wonFlowTextareaClassName,
                  "mt-1.5 min-h-24",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setProvisionalDiagnosis(
                    event.target.value,
                  );
                }}
                placeholder="Provisional admitting diagnosis"
                value={
                  provisionalDiagnosis
                }
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-xs font-bold text-slate-600">
                Available Bed
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAdmissionBedId(
                    event.target.value,
                  );
                }}
                value={
                  admissionBedId
                }
              >
                <option value="">
                  Select available bed
                </option>

                {admissionAvailableBeds.map(
                  (bed) => {
                    const ward =
                      wardsById.get(
                        bed.wardId,
                      );

                    return (
                      <option
                        key={bed.id}
                        value={bed.id}
                      >
                        {ward?.wardName ??
                          "Unknown ward"}
                        {" — Room "}
                        {bed.roomNumber}
                        {" — Bed "}
                        {bed.bedLabel}
                      </option>
                    );
                  },
                )}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="text-xs font-bold text-slate-600">
                Admission Completed By
              </span>

              <input
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAdmittedBy(
                    event.target.value,
                  );
                }}
                placeholder="Reception, admission or nursing staff"
                value={admittedBy}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <WonFlowActionButton
              onClick={
                resetAdmissionForm
              }
              variant="secondary"
            >
              Clear Form
            </WonFlowActionButton>

            <WonFlowActionButton
              onClick={admitPatient}
              variant="primary"
            >
              Admit Patient
            </WonFlowActionButton>
          </div>
        </WonFlowOperationalPanel>
      ) : null}

      {view === "transfer" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <WonFlowOperationalPanel
            description="Select the admitted patient who needs a room or ward transfer."
            title="Current Inpatients"
            tone="blue"
          >
            {activeAdmissions.filter(
              (admission) =>
                admission.status ===
                "admitted",
            ).length === 0 ? (
              <WonFlowEmptyState
                description="No admitted patient is currently eligible for transfer."
                title="No transferable patients"
              />
            ) : (
              <div className="space-y-3">
                {activeAdmissions
                  .filter(
                    (admission) =>
                      admission.status ===
                      "admitted",
                  )
                  .map(
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
                        selectedTransferAdmission?.id ===
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
                            setSelectedTransferAdmissionId(
                              admission.id,
                            );

                            setTransferTargetBedId("");
                          }}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-black text-slate-950">
                                {patient?.displayName ??
                                  "Unknown patient"}
                              </div>

                              <div className="mt-1 text-xs font-bold text-blue-700">
                                {
                                  admission.admissionNumber
                                }
                              </div>
                            </div>

                            <span className="wf-status wf-status-blue">
                              {humanizeValue(
                                admission.priority,
                              )}
                            </span>
                          </div>

                          <div className="mt-3 text-xs text-slate-500">
                            {ward?.wardName ??
                              "Unknown ward"}
                            {" · "}
                            {bed?.bedLabel ??
                              "Unknown bed"}
                          </div>
                        </button>
                      );
                    },
                  )}
              </div>
            )}
          </WonFlowOperationalPanel>

          <WonFlowOperationalPanel
            description="The old bed will move to cleaning and the new bed will become occupied."
            icon={
              <ArrowRightLeft
                size={18}
              />
            }
            title="Complete Bed Transfer"
            tone="violet"
          >
            {selectedTransferAdmission ===
            undefined ? (
              <WonFlowEmptyState
                description="Select an admitted patient."
                title="Select patient"
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <div className="font-black text-violet-950">
                    {patientsById.get(
                      selectedTransferAdmission.patientId,
                    )?.displayName ??
                      "Unknown patient"}
                  </div>

                  <div className="mt-1 text-xs text-violet-700">
                    Current bed:
                    {" "}
                    {bedsById.get(
                      selectedTransferAdmission.currentBedId,
                    )?.bedLabel ??
                      "Unknown"}
                  </div>
                </div>

                <label>
                  <span className="text-xs font-bold text-slate-600">
                    Target Bed
                  </span>

                  <select
                    className={[
                      wonFlowInputClassName,
                      "mt-1.5",
                    ].join(" ")}
                    onChange={(
                      event,
                    ) => {
                      setTransferTargetBedId(
                        event.target.value,
                      );
                    }}
                    value={
                      transferTargetBedId
                    }
                  >
                    <option value="">
                      Select available bed
                    </option>

                    {transferAvailableBeds.map(
                      (bed) => (
                        <option
                          key={bed.id}
                          value={bed.id}
                        >
                          {wardsById.get(
                            bed.wardId,
                          )?.wardName ??
                            "Unknown ward"}
                          {" — "}
                          {bed.bedLabel}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  <span className="text-xs font-bold text-slate-600">
                    Transfer Reason
                  </span>

                  <textarea
                    className={[
                      wonFlowTextareaClassName,
                      "mt-1.5 min-h-24",
                    ].join(" ")}
                    onChange={(
                      event,
                    ) => {
                      setTransferReason(
                        event.target.value,
                      );
                    }}
                    placeholder="Clinical need, isolation, specialty ward or patient request"
                    value={
                      transferReason
                    }
                  />
                </label>

                <label>
                  <span className="text-xs font-bold text-slate-600">
                    Transfer Requested By
                  </span>

                  <input
                    className={[
                      wonFlowInputClassName,
                      "mt-1.5",
                    ].join(" ")}
                    onChange={(
                      event,
                    ) => {
                      setTransferRequestedBy(
                        event.target.value,
                      );
                    }}
                    value={
                      transferRequestedBy
                    }
                  />
                </label>

                <label>
                  <span className="text-xs font-bold text-slate-600">
                    Transfer Completed By
                  </span>

                  <input
                    className={[
                      wonFlowInputClassName,
                      "mt-1.5",
                    ].join(" ")}
                    onChange={(
                      event,
                    ) => {
                      setTransferredBy(
                        event.target.value,
                      );
                    }}
                    value={transferredBy}
                  />
                </label>

                <WonFlowActionButton
                  className="w-full"
                  onClick={
                    transferPatient
                  }
                  variant="primary"
                >
                  Complete Transfer
                </WonFlowActionButton>
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>
      ) : null}

      {view === "discharge" ? (
        <div className="wf-workspace-rail">
          <div className="wf-workspace-rail-side">
            <WonFlowOperationalPanel
              description="Select an inpatient to prepare or complete discharge."
              title="Inpatient Discharge Queue"
              tone="blue"
            >
              {activeAdmissions.length ===
              0 ? (
                <WonFlowEmptyState
                  description="No active inpatient admission exists."
                  title="No admitted patients"
                />
              ) : (
                <div className="space-y-3">
                  {activeAdmissions.map(
                    (admission) => {
                      const patient =
                        patientsById.get(
                          admission.patientId,
                        );

                      const selected =
                        selectedDischargeAdmission?.id ===
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
                            loadDischargeAdmission(
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
                            {
                              admission.admissionNumber
                            }
                          </div>

                          <div className="mt-3">
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
            {selectedDischargeAdmission ===
            undefined ? (
              <WonFlowOperationalPanel
                description="Select an admitted patient."
                title="Discharge Workspace"
                tone="blue"
              >
                <WonFlowEmptyState
                  description="No admission is currently selected."
                  title="Select patient"
                />
              </WonFlowOperationalPanel>
            ) : (
              <div className="space-y-6">
                <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white">
                  <div className="bg-blue-700 p-5 text-white">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">
                      Inpatient Discharge
                    </div>

                    <h2 className="mt-2 text-2xl font-black">
                      {patientsById.get(
                        selectedDischargeAdmission.patientId,
                      )?.displayName ??
                        "Unknown patient"}
                    </h2>

                    <div className="mt-1 text-xs text-blue-100">
                      {
                        selectedDischargeAdmission.admissionNumber
                      }
                      {" · "}
                      {bedsById.get(
                        selectedDischargeAdmission.currentBedId,
                      )?.bedLabel ??
                        "Unknown bed"}
                    </div>
                  </div>
                </section>

                <WonFlowOperationalPanel
                  description="Every item must be completed before the patient can be discharged."
                  title="Discharge Readiness Checklist"
                  tone="violet"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <ReadinessCheck
                      checked={
                        dischargeReadiness.doctorClearance
                      }
                      label="Doctor clearance completed"
                      onChange={(
                        checked,
                      ) => {
                        updateReadiness({
                          doctorClearance:
                            checked,
                        });
                      }}
                    />

                    <ReadinessCheck
                      checked={
                        dischargeReadiness.nursingSummaryCompleted
                      }
                      label="Nursing summary completed"
                      onChange={(
                        checked,
                      ) => {
                        updateReadiness({
                          nursingSummaryCompleted:
                            checked,
                        });
                      }}
                    />

                    <ReadinessCheck
                      checked={
                        dischargeReadiness.medicationReconciliationCompleted
                      }
                      label="Medication reconciliation completed"
                      onChange={(
                        checked,
                      ) => {
                        updateReadiness({
                          medicationReconciliationCompleted:
                            checked,
                        });
                      }}
                    />

                    <ReadinessCheck
                      checked={
                        dischargeReadiness.billingClearance
                      }
                      label="Billing clearance completed"
                      onChange={(
                        checked,
                      ) => {
                        updateReadiness({
                          billingClearance:
                            checked,
                        });
                      }}
                    />

                    <ReadinessCheck
                      checked={
                        dischargeReadiness.followUpPlanCompleted
                      }
                      label="Follow-up plan completed"
                      onChange={(
                        checked,
                      ) => {
                        updateReadiness({
                          followUpPlanCompleted:
                            checked,
                        });
                      }}
                    />
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
                          updateReadiness({
                            finalDiagnosis:
                              event.target.value,
                          });
                        }}
                        value={
                          dischargeReadiness.finalDiagnosis
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
                          "mt-1.5 min-h-24",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          updateReadiness({
                            followUpPlan:
                              event.target.value,
                          });
                        }}
                        value={
                          dischargeReadiness.followUpPlan
                        }
                      />
                    </label>

                    <label className="lg:col-span-2">
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
                          updateReadiness({
                            dischargeInstructions:
                              event.target.value,
                          });
                        }}
                        value={
                          dischargeReadiness.dischargeInstructions
                        }
                      />
                    </label>
                  </div>

                  {selectedDischargeAdmission.status ===
                  "admitted" ? (
                    <WonFlowActionButton
                      className="mt-4"
                      onClick={
                        markDischargeReady
                      }
                      variant="primary"
                    >
                      Mark Discharge Ready
                    </WonFlowActionButton>
                  ) : null}
                </WonFlowOperationalPanel>

                {selectedDischargeAdmission.status ===
                "discharge-ready" ? (
                  <WonFlowOperationalPanel
                    description="Complete the final discharge and release the bed for cleaning."
                    title="Complete Patient Discharge"
                    tone="emerald"
                  >
                    <div className="grid gap-4 lg:grid-cols-2">
                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Discharged By
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setDischargedBy(
                              event.target.value,
                            );
                          }}
                          placeholder="Responsible doctor, nurse or discharge officer"
                          value={
                            dischargedBy
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Discharge Summary
                        </span>

                        <textarea
                          className={[
                            wonFlowTextareaClassName,
                            "mt-1.5 min-h-28",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setDischargeSummary(
                              event.target.value,
                            );
                          }}
                          placeholder="Hospital course and final discharge summary"
                          value={
                            dischargeSummary
                          }
                        />
                      </label>
                    </div>

                    <WonFlowActionButton
                      className="mt-4"
                      onClick={
                        dischargePatient
                      }
                      variant="primary"
                    >
                      Discharge Patient
                    </WonFlowActionButton>
                  </WonFlowOperationalPanel>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReadinessCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;

  onChange:
    (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input
        checked={checked}
        className="mt-1 h-4 w-4"
        onChange={(
          event,
        ) => {
          onChange(
            event.target.checked,
          );
        }}
        type="checkbox"
      />

      <span className="text-sm font-bold text-slate-800">
        {label}
      </span>
    </label>
  );
}

interface WardAdmissionWorkspaceProps {
  initialPatientId?: string;
}

export function WardAdmissionWorkspace({
  initialPatientId,
}: WardAdmissionWorkspaceProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "inpatient-ward-directory",

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
      emptyTitle="Inpatient wards unavailable"
      loadingDescription="WonFlow is preparing wards, beds and active admissions."
      loadingTitle="Preparing inpatient ward management"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <WardAdmissionContent
          branches={
            directory.branches
          }
          initialPatientId={
            initialPatientId
          }
          practitioners={
            directory.practitioners
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}
