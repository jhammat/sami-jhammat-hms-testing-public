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
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  HeartPulse,
  Printer,
  Search,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Wrench,
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
  buildDemoOperationTheatreSummary,
  cancelDemoSurgicalCase,
  completeDemoSurgicalRecovery,
  finishDemoSurgicalCase,
  initializeDemoOperationTheatres,
  markDemoSurgicalCasePreoperativeReady,
  readDemoInpatientAdmissions,
  readDemoOperationTheatres,
  readDemoSurgicalCases,
  saveDemoIntraoperativeRecord,
  saveDemoPreoperativeChecklist,
  scheduleDemoSurgicalCase,
  startDemoSurgicalCase,
  updateDemoOperationTheatreStatus,
  validateDemoIntraoperativeRecord,
  validateDemoPreoperativeChecklist,
  validateDemoRecoveryRecord,
  validateDemoSurgicalCaseScheduling,
} from "@/lib/inpatient";

import type {
  DemoInpatientAdmission,
  DemoIntraoperativeRecord,
  DemoOperationTheatre,
  DemoOperationTheatreStatus,
  DemoPreoperativeChecklist,
  DemoRecoveryRecord,
  DemoSurgicalAnesthesiaType,
  DemoSurgicalCase,
  DemoSurgicalCaseStatus,
  DemoSurgicalPreparationStatus,
  DemoSurgicalUrgency,
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

type OperationTheatreView =
  | "board"
  | "schedule"
  | "preoperative"
  | "surgery"
  | "recovery";

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

  const offset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() -
    offset,
  )
    .toISOString()
    .slice(0, 16);
}

function toLocalDateTimeInput(
  value: string,
): string {
  if (
    value === ""
  ) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() -
    offset,
  )
    .toISOString()
    .slice(0, 16);
}

function cloneChecklist(
  checklist:
    DemoPreoperativeChecklist,
): DemoPreoperativeChecklist {
  return {
    ...checklist,
  };
}

function cloneIntraoperativeRecord(
  record:
    DemoIntraoperativeRecord,
): DemoIntraoperativeRecord {
  return {
    ...record,

    actualStartAt:
      toLocalDateTimeInput(
        record.actualStartAt,
      ),

    incisionAt:
      toLocalDateTimeInput(
        record.incisionAt,
      ),

    actualEndAt:
      toLocalDateTimeInput(
        record.actualEndAt,
      ),
  };
}

function cloneRecoveryRecord(
  record:
    DemoRecoveryRecord,
): DemoRecoveryRecord {
  return {
    ...record,

    arrivedAt:
      toLocalDateTimeInput(
        record.arrivedAt,
      ),
  };
}

function getTheatreStatusClassName(
  status:
    DemoOperationTheatreStatus,
): string {
  switch (status) {
    case "available":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "in-use":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "cleaning":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "maintenance":
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function getCaseStatusClassName(
  status:
    DemoSurgicalCaseStatus,
): string {
  switch (status) {
    case "scheduled":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "pre-op-ready":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "in-surgery":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "recovery":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "cancelled":
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

interface OperationTheatreContentProps {
  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function OperationTheatreContent({
  branches,
  practitioners,
}: OperationTheatreContentProps) {
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
    theatres,
    setTheatres,
  ] = useState<
    DemoOperationTheatre[]
  >([]);

  const [
    surgicalCases,
    setSurgicalCases,
  ] = useState<
    DemoSurgicalCase[]
  >([]);

  const [
    view,
    setView,
  ] = useState<OperationTheatreView>(
    "board",
  );

  const [
    selectedBranchId,
    setSelectedBranchId,
  ] = useState("");

  const [
    selectedCaseId,
    setSelectedCaseId,
  ] = useState("");

  const [
    caseSearch,
    setCaseSearch,
  ] = useState("");

  const [
    patientId,
    setPatientId,
  ] = useState("");

  const [
    admissionId,
    setAdmissionId,
  ] = useState("");

  const [
    branchId,
    setBranchId,
  ] = useState("");

  const [
    theatreId,
    setTheatreId,
  ] = useState("");

  const [
    procedureName,
    setProcedureName,
  ] = useState("");

  const [
    preoperativeDiagnosis,
    setPreoperativeDiagnosis,
  ] = useState("");

  const [
    urgency,
    setUrgency,
  ] = useState<
    DemoSurgicalUrgency
  >("elective");

  const [
    anesthesiaType,
    setAnesthesiaType,
  ] = useState<
    DemoSurgicalAnesthesiaType
  >("general");

  const [
    scheduledStartAt,
    setScheduledStartAt,
  ] = useState(
    getCurrentDateTimeLocal,
  );

  const [
    estimatedDuration,
    setEstimatedDuration,
  ] = useState("90");

  const [
    primarySurgeonId,
    setPrimarySurgeonId,
  ] = useState("");

  const [
    assistantSurgeonId,
    setAssistantSurgeonId,
  ] = useState("");

  const [
    anesthetistId,
    setAnesthetistId,
  ] = useState("");

  const [
    scrubNurse,
    setScrubNurse,
  ] = useState("");

  const [
    circulatingNurse,
    setCirculatingNurse,
  ] = useState("");

  const [
    specialRequirements,
    setSpecialRequirements,
  ] = useState("");

  const [
    scheduledBy,
    setScheduledBy,
  ] = useState("");

  const [
    checklistDraft,
    setChecklistDraft,
  ] = useState<
    DemoPreoperativeChecklist |
    undefined
  >();

  const [
    intraoperativeDraft,
    setIntraoperativeDraft,
  ] = useState<
    DemoIntraoperativeRecord |
    undefined
  >();

  const [
    recoveryDraft,
    setRecoveryDraft,
  ] = useState<
    DemoRecoveryRecord |
    undefined
  >();

  const [
    surgeryStartedBy,
    setSurgeryStartedBy,
  ] = useState("");

  const [
    cancellationReason,
    setCancellationReason,
  ] = useState("");

  const [
    cancelledBy,
    setCancelledBy,
  ] = useState("");

  const [
    theatreOperationNote,
    setTheatreOperationNote,
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
      initializeDemoOperationTheatres(
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

      setAdmissions(
        readDemoInpatientAdmissions(),
      );

      setTheatres(
        readDemoOperationTheatres(),
      );

      setSurgicalCases(
        readDemoSurgicalCases(),
      );
    }, [branches]);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    const eventNames = [
      "wonflow:demo-patients-changed",
      "wonflow:demo-inpatient-admissions-changed",
      "wonflow:demo-operation-theatres-changed",
      "wonflow:demo-surgical-cases-changed",
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

  const theatresById =
    useMemo(
      () =>
        new Map(
          theatres.map(
            (theatre) => [
              theatre.id,
              theatre,
            ],
          ),
        ),
      [theatres],
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

  const summary =
    useMemo(
      () =>
        buildDemoOperationTheatreSummary(
          selectedBranchId,
        ),
      [
        selectedBranchId,
        theatres,
        surgicalCases,
      ],
    );

  const filteredTheatres =
    theatres.filter(
      (theatre) =>
        selectedBranchId ===
          "" ||
        theatre.branchId ===
          selectedBranchId,
    );

  const patientAdmissions =
    admissions.filter(
      (admission) =>
        admission.patientId ===
          patientId &&
        (
          admission.status ===
            "admitted" ||
          admission.status ===
            "discharge-ready"
        ),
    );

  const scheduleTheatres =
    theatres.filter(
      (theatre) =>
        branchId === "" ||
        theatre.branchId ===
          branchId,
    );

  const normalizedSearch =
    caseSearch
      .trim()
      .toLocaleLowerCase();

  const eligibleCases =
    surgicalCases
      .filter(
        (surgicalCase) => {
          if (
            selectedBranchId !==
              "" &&
            surgicalCase.branchId !==
              selectedBranchId
          ) {
            return false;
          }

          if (
            view ===
              "preoperative" &&
            surgicalCase.status !==
              "scheduled" &&
            surgicalCase.status !==
              "pre-op-ready"
          ) {
            return false;
          }

          if (
            view === "surgery" &&
            surgicalCase.status !==
              "pre-op-ready" &&
            surgicalCase.status !==
              "in-surgery"
          ) {
            return false;
          }

          if (
            view === "recovery" &&
            surgicalCase.status !==
              "recovery" &&
            surgicalCase.status !==
              "completed"
          ) {
            return false;
          }

          if (
            normalizedSearch ===
            ""
          ) {
            return true;
          }

          const patient =
            patientsById.get(
              surgicalCase.patientId,
            );

          const theatre =
            theatresById.get(
              surgicalCase.theatreId,
            );

          return [
            surgicalCase.caseNumber,
            surgicalCase.procedureName,
            surgicalCase
              .preoperativeDiagnosis,
            patient?.displayName ?? "",
            patient?.mrNumber ?? "",
            theatre?.theatreName ?? "",
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
          new Date(
            left.scheduledStartAt,
          ).getTime() -
          new Date(
            right.scheduledStartAt,
          ).getTime(),
      );

  const selectedCase =
    surgicalCases.find(
      (surgicalCase) =>
        surgicalCase.id ===
        selectedCaseId,
    ) ??
    eligibleCases[0];

  useEffect(() => {
    if (
      selectedCase ===
      undefined
    ) {
      return;
    }

    queueMicrotask(() => {
      setChecklistDraft(
        cloneChecklist(
          selectedCase
            .preoperativeChecklist,
        ),
      );

      setIntraoperativeDraft(
        cloneIntraoperativeRecord(
          selectedCase
            .intraoperativeRecord,
        ),
      );

      setRecoveryDraft(
        cloneRecoveryRecord(
          selectedCase
            .recoveryRecord,
        ),
      );

      setCancellationReason("");
      setCancelledBy("");
      setSurgeryStartedBy("");
      setValidationErrors([]);
    });
  }, [selectedCase?.id]);

  function resetScheduleForm() {
    setPatientId("");
    setAdmissionId("");
    setBranchId("");
    setTheatreId("");
    setProcedureName("");
    setPreoperativeDiagnosis("");
    setUrgency("elective");
    setAnesthesiaType("general");
    setScheduledStartAt(
      getCurrentDateTimeLocal(),
    );
    setEstimatedDuration("90");
    setPrimarySurgeonId("");
    setAssistantSurgeonId("");
    setAnesthetistId("");
    setScrubNurse("");
    setCirculatingNurse("");
    setSpecialRequirements("");
    setScheduledBy("");
  }

  function scheduleCase() {
    const input = {
      patientId,
      admissionId,
      branchId,
      theatreId,
      procedureName,
      preoperativeDiagnosis,
      urgency,
      anesthesiaType,
      scheduledStartAt,

      estimatedDurationMinutes:
        Number(
          estimatedDuration,
        ),

      team: {
        primarySurgeonId,
        assistantSurgeonId,
        anesthetistId,
        scrubNurse,
        circulatingNurse,
      },

      specialRequirements,
      scheduledBy,
    };

    const errors =
      validateDemoSurgicalCaseScheduling(
        input,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required surgical-booking information.",
      );

      return;
    }

    const surgicalCase =
      scheduleDemoSurgicalCase(
        input,
      );

    if (
      surgicalCase ===
      undefined
    ) {
      setActionMessage(
        "The surgical case could not be scheduled.",
      );

      return;
    }

    resetScheduleForm();
    setValidationErrors([]);

    reloadLocalData();

    setSelectedCaseId(
      surgicalCase.id,
    );

    setSelectedBranchId(
      surgicalCase.branchId,
    );

    setView("preoperative");

    setActionMessage(
      `${surgicalCase.caseNumber} scheduled successfully.`,
    );
  }

  function updateChecklist(
    changes:
      Partial<
        DemoPreoperativeChecklist
      >,
  ) {
    setChecklistDraft(
      (current) =>
        current === undefined
          ? current
          : {
              ...current,
              ...changes,
            },
    );

    setValidationErrors([]);
  }

  function saveChecklist() {
    if (
      selectedCase ===
        undefined ||
      checklistDraft ===
        undefined
    ) {
      return;
    }

    const updatedCase =
      saveDemoPreoperativeChecklist(
        selectedCase.id,
        checklistDraft,
      );

    if (
      updatedCase ===
      undefined
    ) {
      setActionMessage(
        "The preoperative checklist could not be saved.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      "Preoperative checklist draft saved.",
    );
  }

  function markPreoperativeReady() {
    if (
      selectedCase ===
        undefined ||
      checklistDraft ===
        undefined
    ) {
      return;
    }

    const errors =
      validateDemoPreoperativeChecklist(
        checklistDraft,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete every required surgical-safety check.",
      );

      return;
    }

    const readyCase =
      markDemoSurgicalCasePreoperativeReady(
        selectedCase.id,
        checklistDraft,
      );

    if (
      readyCase === undefined
    ) {
      setActionMessage(
        "The case could not be marked preoperative-ready.",
      );

      return;
    }

    reloadLocalData();

    setView("surgery");

    setActionMessage(
      `${readyCase.caseNumber} is ready for theatre.`,
    );
  }

  function startSurgery() {
    if (
      selectedCase ===
      undefined
    ) {
      return;
    }

    const startedCase =
      startDemoSurgicalCase({
        caseId:
          selectedCase.id,

        startedBy:
          surgeryStartedBy,
      });

    if (
      startedCase === undefined
    ) {
      setActionMessage(
        "Enter the responsible theatre staff and confirm the theatre is available.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      `${startedCase.caseNumber} has entered surgery.`,
    );
  }

  function updateIntraoperativeRecord(
    changes:
      Partial<
        DemoIntraoperativeRecord
      >,
  ) {
    setIntraoperativeDraft(
      (current) =>
        current === undefined
          ? current
          : {
              ...current,
              ...changes,
            },
    );

    setValidationErrors([]);
  }

  function saveIntraoperativeDraft() {
    if (
      selectedCase ===
        undefined ||
      intraoperativeDraft ===
        undefined
    ) {
      return;
    }

    const savedCase =
      saveDemoIntraoperativeRecord(
        selectedCase.id,
        intraoperativeDraft,
      );

    if (
      savedCase === undefined
    ) {
      setActionMessage(
        "The operative-record draft could not be saved.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      "Intraoperative record saved.",
    );
  }

  function finishSurgery() {
    if (
      selectedCase ===
        undefined ||
      intraoperativeDraft ===
        undefined
    ) {
      return;
    }

    const errors =
      validateDemoIntraoperativeRecord(
        intraoperativeDraft,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required intraoperative information.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Complete the operation and transfer the patient to recovery?",
      );

    if (!confirmed) {
      return;
    }

    const recoveryCase =
      finishDemoSurgicalCase(
        selectedCase.id,
        intraoperativeDraft,
      );

    if (
      recoveryCase === undefined
    ) {
      setActionMessage(
        "The operation could not be completed.",
      );

      return;
    }

    reloadLocalData();

    setView("recovery");

    setActionMessage(
      `${recoveryCase.caseNumber} transferred to recovery. The theatre now requires cleaning.`,
    );
  }

  function updateRecoveryRecord(
    changes:
      Partial<
        DemoRecoveryRecord
      >,
  ) {
    setRecoveryDraft(
      (current) =>
        current === undefined
          ? current
          : {
              ...current,
              ...changes,
            },
    );

    setValidationErrors([]);
  }

  function completeRecovery() {
    if (
      selectedCase ===
        undefined ||
      recoveryDraft ===
        undefined
    ) {
      return;
    }

    const errors =
      validateDemoRecoveryRecord(
        recoveryDraft,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete all recovery-stability requirements.",
      );

      return;
    }

    const completedCase =
      completeDemoSurgicalRecovery(
        selectedCase.id,
        recoveryDraft,
      );

    if (
      completedCase ===
      undefined
    ) {
      setActionMessage(
        "The recovery assessment could not be completed.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      `${completedCase.caseNumber} completed successfully.`,
    );
  }

  function cancelCase() {
    if (
      selectedCase ===
      undefined
    ) {
      return;
    }

    const cancelledCase =
      cancelDemoSurgicalCase({
        caseId:
          selectedCase.id,

        cancelledBy,
        cancellationReason,
      });

    if (
      cancelledCase ===
      undefined
    ) {
      setActionMessage(
        "Enter the responsible staff member and a clear cancellation reason.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      `${cancelledCase.caseNumber} cancelled.`,
    );
  }

  function changeTheatreStatus(
    theatre:
      DemoOperationTheatre,

    status:
      Exclude<
        DemoOperationTheatreStatus,
        "in-use"
      >,
  ) {
    const updatedTheatre =
      updateDemoOperationTheatreStatus({
        theatreId:
          theatre.id,

        status,

        note:
          theatreOperationNote,
      });

    if (
      updatedTheatre ===
      undefined
    ) {
      setActionMessage(
        "A theatre currently in use cannot be updated manually.",
      );

      return;
    }

    setTheatreOperationNote("");

    reloadLocalData();

    setActionMessage(
      `${updatedTheatre.theatreName} marked ${humanizeValue(
        updatedTheatre.status,
      ).toLocaleLowerCase()}.`,
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href="/operations/surgery/cssd"
            >
              CSSD and Theatre Inventory
            </Link>
            {selectedCase !==
              undefined &&
            (
              selectedCase.status ===
                "recovery" ||
              selectedCase.status ===
                "completed"
            ) ? (
              <Link
                className="wf-button-secondary"
                href={`/operations/surgery/operation-theatre/${encodeURIComponent(
                  selectedCase.id,
                )}/report/print`}
              >
                <Printer size={16} />
                Print Operative Report
              </Link>
            ) : null}

            <Link
              className="wf-button-secondary"
              href="/doctor/inpatients"
            >
              Doctor Inpatient Rounds
            </Link>

            <Link
              className="wf-button-secondary"
              href="/operations/inpatient/wards"
            >
              Ward and Beds
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
              "Operation Theatre",
          },
        ]}
        description="Schedule operations, complete surgical-safety checks, document procedures and manage recovery."
        eyebrow="Surgical Operations"
        leading={
          <Syringe size={20} />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              Fictional surgical data
            </span>

            <span>
              Multi-branch theatres
            </span>
          </>
        }
        title="Operation Theatre Management"
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

            Complete the required surgical information
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
          helperText={`${summary.totalTheatres} total theatres`}
          icon={
            <DoorOpen size={18} />
          }
          label="Available Theatres"
          tone="emerald"
          value={
            summary.availableTheatres
          }
        />

        <WonFlowKpiCard
          helperText="Operations currently in progress"
          icon={
            <Activity size={18} />
          }
          label="Theatres In Use"
          tone="blue"
          value={
            summary.theatresInUse
          }
        />

        <WonFlowKpiCard
          helperText="Cases cleared by preoperative checklist"
          icon={
            <ShieldCheck
              size={18}
            />
          }
          label="Pre-Op Ready"
          tone="violet"
          value={
            summary.preoperativeReadyCases
          }
        />

        <WonFlowKpiCard
          helperText="Patients currently in recovery"
          icon={
            <HeartPulse
              size={18}
            />
          }
          label="Recovery Cases"
          tone="amber"
          value={
            summary.recoveryCases
          }
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-[18px] border border-slate-200 bg-white p-3">
        {[
          ["board", "Theatre Board"],
          ["schedule", "Schedule Surgery"],
          ["preoperative", "Preoperative Checklist"],
          ["surgery", "Intraoperative Record"],
          ["recovery", "Recovery"],
        ].map(
          ([value, label]) => (
            <WonFlowActionButton
              key={value}
              onClick={() => {
                setView(
                  value as
                  OperationTheatreView,
                );

                setValidationErrors([]);
              }}
              variant={
                view === value
                  ? "primary"
                  : "secondary"
              }
            >
              {label}
            </WonFlowActionButton>
          ),
        )}
      </div>

      {view === "board" ? (
        <div className="space-y-6">
          <WonFlowOperationalPanel
            description="Filter theatre availability by hospital branch."
            title="Theatre Directory"
            tone="blue"
          >
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
              }}
              value={
                selectedBranchId
              }
            >
              <option value="">
                All Hospital Branches
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
          </WonFlowOperationalPanel>

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {filteredTheatres.map(
              (theatre) => {
                const currentCase =
                  surgicalCases.find(
                    (surgicalCase) =>
                      surgicalCase.id ===
                      theatre.currentCaseId,
                  );

                return (
                  <article
                    className="rounded-[22px] border border-slate-200 bg-white p-5"
                    key={theatre.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wide text-blue-700">
                          {
                            theatre.theatreCode
                          }
                        </div>

                        <h2 className="mt-1 text-lg font-black text-slate-950">
                          {
                            theatre.theatreName
                          }
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          {branchesById.get(
                            theatre.branchId,
                          )?.name ??
                            "Unknown branch"}
                          {" · "}
                          {
                            theatre.floorName
                          }
                        </p>
                      </div>

                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-[10px] font-black",
                          getTheatreStatusClassName(
                            theatre.status,
                          ),
                        ].join(" ")}
                      >
                        {humanizeValue(
                          theatre.status,
                        )}
                      </span>
                    </div>

                    {currentCase !==
                    undefined ? (
                      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <div className="font-black text-blue-950">
                          {
                            currentCase.procedureName
                          }
                        </div>

                        <div className="mt-1 text-xs text-blue-700">
                          {
                            currentCase.caseNumber
                          }
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                        {theatre.note ||
                          "No operation currently in progress."}
                      </div>
                    )}

                    {theatre.status !==
                    "in-use" ? (
                      <div className="mt-4 space-y-3">
                        <textarea
                          className={[
                            wonFlowTextareaClassName,
                            "min-h-20",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setTheatreOperationNote(
                              event.target.value,
                            );
                          }}
                          placeholder="Cleaning or maintenance note"
                          value={
                            theatreOperationNote
                          }
                        />

                        <div className="flex flex-wrap gap-2">
                          <WonFlowActionButton
                            onClick={() => {
                              changeTheatreStatus(
                                theatre,
                                "available",
                              );
                            }}
                            variant="primary"
                          >
                            Mark Available
                          </WonFlowActionButton>

                          <WonFlowActionButton
                            onClick={() => {
                              changeTheatreStatus(
                                theatre,
                                "cleaning",
                              );
                            }}
                            variant="secondary"
                          >
                            Cleaning
                          </WonFlowActionButton>

                          <WonFlowActionButton
                            onClick={() => {
                              changeTheatreStatus(
                                theatre,
                                "maintenance",
                              );
                            }}
                            variant="secondary"
                          >
                            Maintenance
                          </WonFlowActionButton>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              },
            )}
          </div>
        </div>
      ) : null}

      {view === "schedule" ? (
        <WonFlowOperationalPanel
          description="Book an operation theatre and assign the complete surgical team."
          icon={
            <CalendarClock
              size={18}
            />
          }
          title="Schedule Surgical Case"
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
                  setPatientId(
                    event.target.value,
                  );

                  setAdmissionId("");
                }}
                value={patientId}
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
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Inpatient Admission
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  const value =
                    event.target.value;

                  setAdmissionId(
                    value,
                  );

                  const admission =
                    admissionsById.get(
                      value,
                    );

                  if (
                    admission !==
                    undefined
                  ) {
                    setBranchId(
                      admission.branchId,
                    );

                    setTheatreId("");
                  }
                }}
                value={admissionId}
              >
                <option value="">
                  No linked inpatient admission
                </option>

                {patientAdmissions.map(
                  (admission) => (
                    <option
                      key={admission.id}
                      value={admission.id}
                    >
                      {
                        admission.admissionNumber
                      }
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
                  setBranchId(
                    event.target.value,
                  );

                  setTheatreId("");
                }}
                value={branchId}
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
                Operation Theatre
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setTheatreId(
                    event.target.value,
                  );
                }}
                value={theatreId}
              >
                <option value="">
                  Select theatre
                </option>

                {scheduleTheatres.map(
                  (theatre) => (
                    <option
                      disabled={
                        theatre.status ===
                        "maintenance"
                      }
                      key={theatre.id}
                      value={theatre.id}
                    >
                      {theatre.theatreCode}
                      {" — "}
                      {theatre.theatreName}
                      {" — "}
                      {humanizeValue(
                        theatre.status,
                      )}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="text-xs font-bold text-slate-600">
                Planned Procedure
              </span>

              <input
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setProcedureName(
                    event.target.value,
                  );
                }}
                placeholder="Procedure or operation name"
                value={procedureName}
              />
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Urgency
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setUrgency(
                    event.target
                      .value as
                      DemoSurgicalUrgency,
                  );
                }}
                value={urgency}
              >
                <option value="elective">
                  Elective
                </option>

                <option value="urgent">
                  Urgent
                </option>

                <option value="emergency">
                  Emergency
                </option>
              </select>
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Anesthesia
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAnesthesiaType(
                    event.target
                      .value as
                      DemoSurgicalAnesthesiaType,
                  );
                }}
                value={anesthesiaType}
              >
                <option value="general">
                  General
                </option>

                <option value="regional">
                  Regional
                </option>

                <option value="local">
                  Local
                </option>

                <option value="sedation">
                  Sedation
                </option>
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="text-xs font-bold text-slate-600">
                Preoperative Diagnosis
              </span>

              <textarea
                className={[
                  wonFlowTextareaClassName,
                  "mt-1.5 min-h-24",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setPreoperativeDiagnosis(
                    event.target.value,
                  );
                }}
                value={
                  preoperativeDiagnosis
                }
              />
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
                  setScheduledStartAt(
                    event.target.value,
                  );
                }}
                type="datetime-local"
                value={
                  scheduledStartAt
                }
              />
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Estimated Duration
              </span>

              <input
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                min={15}
                onChange={(
                  event,
                ) => {
                  setEstimatedDuration(
                    event.target.value,
                  );
                }}
                type="number"
                value={
                  estimatedDuration
                }
              />

              <span className="mt-1 block text-[10px] text-slate-400">
                Minutes
              </span>
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Primary Surgeon
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setPrimarySurgeonId(
                    event.target.value,
                  );
                }}
                value={
                  primarySurgeonId
                }
              >
                <option value="">
                  Select surgeon
                </option>

                {practitioners.map(
                  (practitioner) => (
                    <option
                      key={practitioner.id}
                      value={practitioner.id}
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
                Assistant Surgeon
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAssistantSurgeonId(
                    event.target.value,
                  );
                }}
                value={
                  assistantSurgeonId
                }
              >
                <option value="">
                  No assistant selected
                </option>

                {practitioners.map(
                  (practitioner) => (
                    <option
                      key={practitioner.id}
                      value={practitioner.id}
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
                Anesthetist
              </span>

              <select
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setAnesthetistId(
                    event.target.value,
                  );
                }}
                value={anesthetistId}
              >
                <option value="">
                  Select anesthetist
                </option>

                {practitioners.map(
                  (practitioner) => (
                    <option
                      key={practitioner.id}
                      value={practitioner.id}
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
                Scrub Nurse
              </span>

              <input
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setScrubNurse(
                    event.target.value,
                  );
                }}
                value={scrubNurse}
              />
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Circulating Nurse
              </span>

              <input
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setCirculatingNurse(
                    event.target.value,
                  );
                }}
                value={
                  circulatingNurse
                }
              />
            </label>

            <label>
              <span className="text-xs font-bold text-slate-600">
                Scheduled By
              </span>

              <input
                className={[
                  wonFlowInputClassName,
                  "mt-1.5",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setScheduledBy(
                    event.target.value,
                  );
                }}
                value={scheduledBy}
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-xs font-bold text-slate-600">
                Special Requirements
              </span>

              <textarea
                className={[
                  wonFlowTextareaClassName,
                  "mt-1.5 min-h-24",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setSpecialRequirements(
                    event.target.value,
                  );
                }}
                placeholder="Blood, implants, equipment, ICU bed, isolation or other requirements"
                value={
                  specialRequirements
                }
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <WonFlowActionButton
              onClick={
                resetScheduleForm
              }
              variant="secondary"
            >
              Clear Form
            </WonFlowActionButton>

            <WonFlowActionButton
              onClick={scheduleCase}
              variant="primary"
            >
              Schedule Operation
            </WonFlowActionButton>
          </div>
        </WonFlowOperationalPanel>
      ) : null}

      {view ===
        "preoperative" ||
      view === "surgery" ||
      view === "recovery" ? (
        <div className="wf-workspace-rail">
          <div className="wf-workspace-rail-side">
            <WonFlowOperationalPanel
              description="Select a surgical case from the current workflow stage."
              title="Surgical Case Queue"
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
                    setCaseSearch(
                      event.target.value,
                    );
                  }}
                  placeholder="Search case, patient or procedure"
                  type="search"
                  value={caseSearch}
                />
              </label>

              {eligibleCases.length ===
              0 ? (
                <div className="mt-4">
                  <WonFlowEmptyState
                    description="No surgical case is currently available at this workflow stage."
                    title="No surgical cases"
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {eligibleCases.map(
                    (surgicalCase) => {
                      const patient =
                        patientsById.get(
                          surgicalCase.patientId,
                        );

                      const selected =
                        selectedCase?.id ===
                        surgicalCase.id;

                      return (
                        <button
                          className={[
                            "w-full rounded-2xl border p-4 text-left transition",
                            selected
                              ? "border-blue-300 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                          ].join(" ")}
                          key={
                            surgicalCase.id
                          }
                          onClick={() => {
                            setSelectedCaseId(
                              surgicalCase.id,
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
                              surgicalCase.caseNumber
                            }
                          </div>

                          <div className="mt-3 text-xs text-slate-500">
                            {
                              surgicalCase.procedureName
                            }
                          </div>

                          <span
                            className={[
                              "mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black",
                              getCaseStatusClassName(
                                surgicalCase.status,
                              ),
                            ].join(" ")}
                          >
                            {humanizeValue(
                              surgicalCase.status,
                            )}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              )}
            </WonFlowOperationalPanel>
          </div>

          <div className="wf-workspace-rail-main">
            {selectedCase ===
            undefined ? (
              <WonFlowOperationalPanel
                description="Select a surgical case."
                title="Operation Theatre Workspace"
                tone="blue"
              >
                <WonFlowEmptyState
                  description="No surgical case is currently selected."
                  title="Select a case"
                />
              </WonFlowOperationalPanel>
            ) : (
              <div className="space-y-6">
                <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white">
                  <div className="bg-blue-700 p-5 text-white">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">
                      Surgical Case
                    </div>

                    <h2 className="mt-2 text-2xl font-black">
                      {patientsById.get(
                        selectedCase.patientId,
                      )?.displayName ??
                        "Unknown patient"}
                    </h2>

                    <div className="mt-1 text-xs text-blue-100">
                      {
                        selectedCase.caseNumber
                      }
                      {" · "}
                      {
                        selectedCase.procedureName
                      }
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryItem
                      label="Theatre"
                      value={
                        theatresById.get(
                          selectedCase.theatreId,
                        )?.theatreName ??
                        "Unknown theatre"
                      }
                    />

                    <SummaryItem
                      label="Scheduled"
                      value={formatWonFlowDashboardDateTime(
                        selectedCase.scheduledStartAt,
                      )}
                    />

                    <SummaryItem
                      label="Primary Surgeon"
                      value={
                        practitionersById.get(
                          selectedCase.team
                            .primarySurgeonId,
                        )?.displayName ??
                        "Unknown surgeon"
                      }
                    />

                    <SummaryItem
                      label="Anesthetist"
                      value={
                        practitionersById.get(
                          selectedCase.team
                            .anesthetistId,
                        )?.displayName ??
                        "Not selected"
                      }
                    />

                    <SummaryItem
                      label="Urgency"
                      value={humanizeValue(
                        selectedCase.urgency,
                      )}
                    />

                    <SummaryItem
                      label="Anesthesia"
                      value={humanizeValue(
                        selectedCase.anesthesiaType,
                      )}
                    />

                    <SummaryItem
                      label="Diagnosis"
                      value={
                        selectedCase.preoperativeDiagnosis
                      }
                    />

                    <SummaryItem
                      label="Status"
                      value={humanizeValue(
                        selectedCase.status,
                      )}
                    />
                  </div>
                </section>

                {view ===
                "preoperative" ? (
                  <>
                    <WonFlowOperationalPanel
                      description="Every safety item must be completed before the patient enters theatre."
                      icon={
                        <ClipboardCheck
                          size={18}
                        />
                      }
                      title="Preoperative Surgical-Safety Checklist"
                      tone="violet"
                    >
                      {checklistDraft ===
                      undefined ? null : (
                        <fieldset
                          disabled={
                            selectedCase.status !==
                            "scheduled"
                          }
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <ChecklistItem
                              checked={
                                checklistDraft.patientIdentityConfirmed
                              }
                              label="Patient identity confirmed"
                              onChange={(
                                checked,
                              ) => {
                                updateChecklist({
                                  patientIdentityConfirmed:
                                    checked,
                                });
                              }}
                            />

                            <ChecklistItem
                              checked={
                                checklistDraft.procedureConfirmed
                              }
                              label="Procedure confirmed"
                              onChange={(
                                checked,
                              ) => {
                                updateChecklist({
                                  procedureConfirmed:
                                    checked,
                                });
                              }}
                            />

                            <ChecklistItem
                              checked={
                                checklistDraft.consentSigned
                              }
                              label="Surgical consent signed"
                              onChange={(
                                checked,
                              ) => {
                                updateChecklist({
                                  consentSigned:
                                    checked,
                                });
                              }}
                            />

                            <ChecklistItem
                              checked={
                                checklistDraft.procedureSiteMarked
                              }
                              label="Procedure site marked or N/A confirmed"
                              onChange={(
                                checked,
                              ) => {
                                updateChecklist({
                                  procedureSiteMarked:
                                    checked,
                                });
                              }}
                            />

                            <ChecklistItem
                              checked={
                                checklistDraft.allergiesReviewed
                              }
                              label="Allergies reviewed"
                              onChange={(
                                checked,
                              ) => {
                                updateChecklist({
                                  allergiesReviewed:
                                    checked,
                                });
                              }}
                            />

                            <ChecklistItem
                              checked={
                                checklistDraft.fastingConfirmed
                              }
                              label="Fasting confirmed"
                              onChange={(
                                checked,
                              ) => {
                                updateChecklist({
                                  fastingConfirmed:
                                    checked,
                                });
                              }}
                            />

                            <ChecklistItem
                              checked={
                                checklistDraft.investigationsReviewed
                              }
                              label="Investigations reviewed"
                              onChange={(
                                checked,
                              ) => {
                                updateChecklist({
                                  investigationsReviewed:
                                    checked,
                                });
                              }}
                            />

                            <ChecklistItem
                              checked={
                                checklistDraft.anesthesiaAssessmentCompleted
                              }
                              label="Anesthesia assessment completed"
                              onChange={(
                                checked,
                              ) => {
                                updateChecklist({
                                  anesthesiaAssessmentCompleted:
                                    checked,
                                });
                              }}
                            />

                            <ChecklistItem
                              checked={
                                checklistDraft.equipmentReady
                              }
                              label="Required equipment ready"
                              onChange={(
                                checked,
                              ) => {
                                updateChecklist({
                                  equipmentReady:
                                    checked,
                                });
                              }}
                            />

                            <ChecklistItem
                              checked={
                                checklistDraft.prophylacticAntibioticsConfirmed
                              }
                              label="Antibiotic requirement confirmed"
                              onChange={(
                                checked,
                              ) => {
                                updateChecklist({
                                  prophylacticAntibioticsConfirmed:
                                    checked,
                                });
                              }}
                            />
                          </div>

                          <div className="mt-5 grid gap-4 lg:grid-cols-2">
                            <PreparationField
                              label="Blood Preparation"
                              onChange={(
                                value,
                              ) => {
                                updateChecklist({
                                  bloodPreparation:
                                    value,
                                });
                              }}
                              value={
                                checklistDraft.bloodPreparation
                              }
                            />

                            <PreparationField
                              label="Implant Preparation"
                              onChange={(
                                value,
                              ) => {
                                updateChecklist({
                                  implantPreparation:
                                    value,
                                });
                              }}
                              value={
                                checklistDraft.implantPreparation
                              }
                            />

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Checklist Completed By
                              </span>

                              <input
                                className={[
                                  wonFlowInputClassName,
                                  "mt-1.5",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  updateChecklist({
                                    completedBy:
                                      event.target.value,
                                  });
                                }}
                                value={
                                  checklistDraft.completedBy
                                }
                              />
                            </label>

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Checklist Note
                              </span>

                              <textarea
                                className={[
                                  wonFlowTextareaClassName,
                                  "mt-1.5 min-h-24",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  updateChecklist({
                                    checklistNote:
                                      event.target.value,
                                  });
                                }}
                                value={
                                  checklistDraft.checklistNote
                                }
                              />
                            </label>
                          </div>
                        </fieldset>
                      )}

                      {selectedCase.status ===
                      "scheduled" ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          <WonFlowActionButton
                            onClick={
                              saveChecklist
                            }
                            variant="secondary"
                          >
                            Save Checklist
                          </WonFlowActionButton>

                          <WonFlowActionButton
                            onClick={
                              markPreoperativeReady
                            }
                            variant="primary"
                          >
                            Mark Pre-Op Ready
                          </WonFlowActionButton>
                        </div>
                      ) : (
                        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                          Preoperative safety clearance completed.
                        </div>
                      )}
                    </WonFlowOperationalPanel>

                    {selectedCase.status ===
                    "scheduled" ||
                    selectedCase.status ===
                    "pre-op-ready" ? (
                      <WonFlowOperationalPanel
                        description="Only scheduled or preoperative-ready cases may be cancelled."
                        title="Cancel Surgical Case"
                        tone="amber"
                      >
                        <div className="grid gap-4 lg:grid-cols-2">
                          <input
                            className={
                              wonFlowInputClassName
                            }
                            onChange={(
                              event,
                            ) => {
                              setCancelledBy(
                                event.target.value,
                              );
                            }}
                            placeholder="Cancelled by"
                            value={cancelledBy}
                          />

                          <textarea
                            className={[
                              wonFlowTextareaClassName,
                              "min-h-20",
                            ].join(" ")}
                            onChange={(
                              event,
                            ) => {
                              setCancellationReason(
                                event.target.value,
                              );
                            }}
                            placeholder="Cancellation reason"
                            value={
                              cancellationReason
                            }
                          />
                        </div>

                        <WonFlowActionButton
                          className="mt-4"
                          onClick={cancelCase}
                          variant="secondary"
                        >
                          Cancel Surgical Case
                        </WonFlowActionButton>
                      </WonFlowOperationalPanel>
                    ) : null}
                  </>
                ) : null}

                {view === "surgery" ? (
                  <>
                    {selectedCase.status ===
                    "pre-op-ready" ? (
                      <WonFlowOperationalPanel
                        description="Confirm the responsible theatre staff member and start the operation."
                        icon={
                          <Clock3 size={18} />
                        }
                        title="Patient Enters Theatre"
                        tone="blue"
                      >
                        <input
                          className={
                            wonFlowInputClassName
                          }
                          onChange={(
                            event,
                          ) => {
                            setSurgeryStartedBy(
                              event.target.value,
                            );
                          }}
                          placeholder="Theatre staff starting the surgical case"
                          value={
                            surgeryStartedBy
                          }
                        />

                        <WonFlowActionButton
                          className="mt-4"
                          onClick={
                            startSurgery
                          }
                          variant="primary"
                        >
                          Start Operation
                        </WonFlowActionButton>
                      </WonFlowOperationalPanel>
                    ) : null}

                    {selectedCase.status ===
                      "in-surgery" &&
                    intraoperativeDraft !==
                      undefined ? (
                      <>
                        <WonFlowOperationalPanel
                          description="Document the procedure, operative findings, blood loss, specimens, implants and surgical counts."
                          icon={
                            <Stethoscope
                              size={18}
                            />
                          }
                          title="Intraoperative Record"
                          tone="blue"
                        >
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <DateTimeField
                              label="Theatre Start"
                              onChange={(
                                value,
                              ) => {
                                updateIntraoperativeRecord({
                                  actualStartAt:
                                    value,
                                });
                              }}
                              value={
                                intraoperativeDraft.actualStartAt
                              }
                            />

                            <DateTimeField
                              label="Incision / Procedure Start"
                              onChange={(
                                value,
                              ) => {
                                updateIntraoperativeRecord({
                                  incisionAt:
                                    value,
                                });
                              }}
                              value={
                                intraoperativeDraft.incisionAt
                              }
                            />

                            <DateTimeField
                              label="Procedure End"
                              onChange={(
                                value,
                              ) => {
                                updateIntraoperativeRecord({
                                  actualEndAt:
                                    value,
                                });
                              }}
                              value={
                                intraoperativeDraft.actualEndAt
                              }
                            />

                            <label className="md:col-span-2">
                              <span className="text-xs font-bold text-slate-600">
                                Procedure Performed
                              </span>

                              <textarea
                                className={[
                                  wonFlowTextareaClassName,
                                  "mt-1.5 min-h-24",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  updateIntraoperativeRecord({
                                    procedurePerformed:
                                      event.target.value,
                                  });
                                }}
                                value={
                                  intraoperativeDraft.procedurePerformed
                                }
                              />
                            </label>

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Estimated Blood Loss
                              </span>

                              <input
                                className={[
                                  wonFlowInputClassName,
                                  "mt-1.5",
                                ].join(" ")}
                                min={0}
                                onChange={(
                                  event,
                                ) => {
                                  updateIntraoperativeRecord({
                                    estimatedBloodLossMillilitres:
                                      Number(
                                        event.target.value,
                                      ),
                                  });
                                }}
                                type="number"
                                value={
                                  intraoperativeDraft.estimatedBloodLossMillilitres
                                }
                              />

                              <span className="mt-1 block text-[10px] text-slate-400">
                                Millilitres
                              </span>
                            </label>

                            <ClinicalTextarea
                              label="Operative Findings"
                              onChange={(
                                value,
                              ) => {
                                updateIntraoperativeRecord({
                                  operativeFindings:
                                    value,
                                });
                              }}
                              value={
                                intraoperativeDraft.operativeFindings
                              }
                            />

                            <ClinicalTextarea
                              label="Specimens"
                              onChange={(
                                value,
                              ) => {
                                updateIntraoperativeRecord({
                                  specimens:
                                    value,
                                });
                              }}
                              value={
                                intraoperativeDraft.specimens
                              }
                            />

                            <ClinicalTextarea
                              label="Implants"
                              onChange={(
                                value,
                              ) => {
                                updateIntraoperativeRecord({
                                  implants:
                                    value,
                                });
                              }}
                              value={
                                intraoperativeDraft.implants
                              }
                            />

                            <ClinicalTextarea
                              label="Complications"
                              onChange={(
                                value,
                              ) => {
                                updateIntraoperativeRecord({
                                  complications:
                                    value,
                                });
                              }}
                              value={
                                intraoperativeDraft.complications
                              }
                            />

                            <ClinicalTextarea
                              label="Anesthesia Notes"
                              onChange={(
                                value,
                              ) => {
                                updateIntraoperativeRecord({
                                  anesthesiaNotes:
                                    value,
                                });
                              }}
                              value={
                                intraoperativeDraft.anesthesiaNotes
                              }
                            />

                            <ClinicalTextarea
                              label="Surgeon Notes"
                              onChange={(
                                value,
                              ) => {
                                updateIntraoperativeRecord({
                                  surgeonNotes:
                                    value,
                                });
                              }}
                              value={
                                intraoperativeDraft.surgeonNotes
                              }
                            />

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Operative Record Completed By
                              </span>

                              <input
                                className={[
                                  wonFlowInputClassName,
                                  "mt-1.5",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  updateIntraoperativeRecord({
                                    recordedBy:
                                      event.target.value,
                                  });
                                }}
                                value={
                                  intraoperativeDraft.recordedBy
                                }
                              />
                            </label>
                          </div>
                        </WonFlowOperationalPanel>

                        <WonFlowOperationalPanel
                          description="All surgical counts must be confirmed before the patient leaves theatre."
                          icon={
                            <ShieldCheck
                              size={18}
                            />
                          }
                          title="Surgical Count Confirmation"
                          tone="violet"
                        >
                          <div className="grid gap-3 md:grid-cols-3">
                            <ChecklistItem
                              checked={
                                intraoperativeDraft.instrumentCountCorrect
                              }
                              label="Instrument count correct"
                              onChange={(
                                checked,
                              ) => {
                                updateIntraoperativeRecord({
                                  instrumentCountCorrect:
                                    checked,
                                });
                              }}
                            />

                            <ChecklistItem
                              checked={
                                intraoperativeDraft.swabCountCorrect
                              }
                              label="Swab count correct"
                              onChange={(
                                checked,
                              ) => {
                                updateIntraoperativeRecord({
                                  swabCountCorrect:
                                    checked,
                                });
                              }}
                            />

                            <ChecklistItem
                              checked={
                                intraoperativeDraft.needleCountCorrect
                              }
                              label="Needle count correct"
                              onChange={(
                                checked,
                              ) => {
                                updateIntraoperativeRecord({
                                  needleCountCorrect:
                                    checked,
                                });
                              }}
                            />
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <WonFlowActionButton
                              onClick={
                                saveIntraoperativeDraft
                              }
                              variant="secondary"
                            >
                              Save Operative Record
                            </WonFlowActionButton>

                            <WonFlowActionButton
                              onClick={
                                finishSurgery
                              }
                              variant="primary"
                            >
                              Complete Surgery and Transfer to Recovery
                            </WonFlowActionButton>
                          </div>
                        </WonFlowOperationalPanel>
                      </>
                    ) : null}
                  </>
                ) : null}

                {view ===
                  "recovery" &&
                recoveryDraft !==
                  undefined ? (
                  <WonFlowOperationalPanel
                    description="Complete the post-anesthesia recovery assessment before transferring the patient."
                    icon={
                      <HeartPulse
                        size={18}
                      />
                    }
                    title="Recovery-Room Assessment"
                    tone="emerald"
                  >
                    <fieldset
                      disabled={
                        selectedCase.status ===
                        "completed"
                      }
                    >
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <DateTimeField
                          label="Recovery Arrival"
                          onChange={(
                            value,
                          ) => {
                            updateRecoveryRecord({
                              arrivedAt:
                                value,
                            });
                          }}
                          value={
                            recoveryDraft.arrivedAt
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
                              updateRecoveryRecord({
                                consciousness:
                                  event.target
                                    .value as
                                    DemoRecoveryRecord["consciousness"],
                              });
                            }}
                            value={
                              recoveryDraft.consciousness
                            }
                          >
                            <option value="awake">
                              Awake
                            </option>

                            <option value="drowsy">
                              Drowsy
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

                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Pain Score
                          </span>

                          <input
                            className={[
                              wonFlowInputClassName,
                              "mt-1.5",
                            ].join(" ")}
                            max={10}
                            min={0}
                            onChange={(
                              event,
                            ) => {
                              updateRecoveryRecord({
                                painScore:
                                  Number(
                                    event.target.value,
                                  ),
                              });
                            }}
                            type="number"
                            value={
                              recoveryDraft.painScore
                            }
                          />
                        </label>

                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Oxygen Saturation
                          </span>

                          <input
                            className={[
                              wonFlowInputClassName,
                              "mt-1.5",
                            ].join(" ")}
                            max={100}
                            min={50}
                            onChange={(
                              event,
                            ) => {
                              updateRecoveryRecord({
                                oxygenSaturationPercent:
                                  Number(
                                    event.target.value,
                                  ),
                              });
                            }}
                            type="number"
                            value={
                              recoveryDraft.oxygenSaturationPercent
                            }
                          />
                        </label>

                        <ChecklistItem
                          checked={
                            recoveryDraft.airwayStable
                          }
                          label="Airway stable"
                          onChange={(
                            checked,
                          ) => {
                            updateRecoveryRecord({
                              airwayStable:
                                checked,
                            });
                          }}
                        />

                        <ChecklistItem
                          checked={
                            recoveryDraft.circulationStable
                          }
                          label="Circulation stable"
                          onChange={(
                            checked,
                          ) => {
                            updateRecoveryRecord({
                              circulationStable:
                                checked,
                            });
                          }}
                        />

                        <ChecklistItem
                          checked={
                            recoveryDraft.bleedingControlled
                          }
                          label="Bleeding controlled"
                          onChange={(
                            checked,
                          ) => {
                            updateRecoveryRecord({
                              bleedingControlled:
                                checked,
                            });
                          }}
                        />

                        <ChecklistItem
                          checked={
                            recoveryDraft.nauseaOrVomiting
                          }
                          label="Nausea or vomiting present"
                          onChange={(
                            checked,
                          ) => {
                            updateRecoveryRecord({
                              nauseaOrVomiting:
                                checked,
                            });
                          }}
                        />

                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Handed Over To
                          </span>

                          <input
                            className={[
                              wonFlowInputClassName,
                              "mt-1.5",
                            ].join(" ")}
                            onChange={(
                              event,
                            ) => {
                              updateRecoveryRecord({
                                handedOverTo:
                                  event.target.value,
                              });
                            }}
                            placeholder="Ward, ICU or receiving nurse"
                            value={
                              recoveryDraft.handedOverTo
                            }
                          />
                        </label>

                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Recovery Completed By
                          </span>

                          <input
                            className={[
                              wonFlowInputClassName,
                              "mt-1.5",
                            ].join(" ")}
                            onChange={(
                              event,
                            ) => {
                              updateRecoveryRecord({
                                completedBy:
                                  event.target.value,
                              });
                            }}
                            value={
                              recoveryDraft.completedBy
                            }
                          />
                        </label>

                        <label className="md:col-span-2 xl:col-span-3">
                          <span className="text-xs font-bold text-slate-600">
                            Recovery Note
                          </span>

                          <textarea
                            className={[
                              wonFlowTextareaClassName,
                              "mt-1.5 min-h-28",
                            ].join(" ")}
                            onChange={(
                              event,
                            ) => {
                              updateRecoveryRecord({
                                recoveryNote:
                                  event.target.value,
                              });
                            }}
                            value={
                              recoveryDraft.recoveryNote
                            }
                          />
                        </label>
                      </div>
                    </fieldset>

                    {selectedCase.status ===
                    "recovery" ? (
                      <WonFlowActionButton
                        className="mt-5"
                        onClick={
                          completeRecovery
                        }
                        variant="primary"
                      >
                        Complete Recovery and Handover
                      </WonFlowActionButton>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 font-black text-emerald-900">
                          <CheckCircle2
                            size={18}
                          />

                          Surgical case completed
                        </div>

                        <p className="mt-2 text-sm text-emerald-700">
                          The patient has completed recovery and was handed over successfully.
                        </p>
                      </div>
                    )}
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

function ChecklistItem({
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

function PreparationField({
  label,
  value,
  onChange,
}: {
  label: string;

  value:
    DemoSurgicalPreparationStatus;

  onChange:
    (
      value:
        DemoSurgicalPreparationStatus,
    ) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-600">
        {label}
      </span>

      <select
        className={[
          wonFlowInputClassName,
          "mt-1.5",
        ].join(" ")}
        onChange={(
          event,
        ) => {
          onChange(
            event.target
              .value as
              DemoSurgicalPreparationStatus,
          );
        }}
        value={value}
      >
        <option value="not-required">
          Not Required
        </option>

        <option value="available">
          Available
        </option>

        <option value="pending">
          Pending
        </option>
      </select>
    </label>
  );
}

function DateTimeField({
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
        type="datetime-local"
        value={value}
      />
    </label>
  );
}

function ClinicalTextarea({
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

      <textarea
        className={[
          wonFlowTextareaClassName,
          "mt-1.5 min-h-24",
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

export function OperationTheatreWorkspace() {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "operation-theatre-directory",

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
                  limit: 200,
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
      emptyTitle="Operation theatre unavailable"
      loadingDescription="WonFlow is preparing theatres, surgical cases and clinical teams."
      loadingTitle="Preparing operation theatre"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <OperationTheatreContent
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
