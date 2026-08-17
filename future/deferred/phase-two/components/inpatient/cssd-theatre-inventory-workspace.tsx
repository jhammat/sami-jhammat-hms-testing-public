"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Archive,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  TestTube2,
  Trash2,
  Wrench,
} from "lucide-react";

import type {
  MockBranch,
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
  adjustDemoTheatreInventoryBatch,
  buildDemoCssdTheatreInventorySummary,
  classifyDemoCssdSterility,
  classifyDemoTheatreInventoryExpiry,
  completeDemoCssdCycle,
  createDemoCssdCycleDraft,
  createDemoTheatreInventoryBatch,
  finalizeDemoTheatreCaseIssue,
  initializeDemoCssdTheatreInventory,
  issueDemoTheatreSuppliesToCase,
  markDemoCssdTrayPacked,
  readDemoCssdInstrumentTrays,
  readDemoCssdSterilizationCycles,
  readDemoCssdSterilizers,
  readDemoSurgicalCases,
  readDemoTheatreCaseIssues,
  readDemoTheatreInventoryBatches,
  readDemoTheatreInventoryMovements,
  releaseDemoCssdCycle,
  sendDemoCssdTrayForReprocessing,
  startDemoCssdCycle,
  updateDemoCssdSterilizerStatus,
  validateDemoCssdCycleCompletion,
  validateDemoCssdCycleDraft,
  validateDemoTheatreCaseIssue,
  validateDemoTheatreInventoryBatch,
} from "@/lib/inpatient";

import type {
  DemoCssdIndicatorResult,
  DemoCssdInstrumentTray,
  DemoCssdSterilizationCycle,
  DemoCssdSterilizer,
  DemoCssdSterilizerStatus,
  DemoCssdSterilityState,
  DemoTheatreCaseIssue,
  DemoTheatreInventoryBatch,
  DemoTheatreInventoryItemType,
  DemoTheatreInventoryMovement,
} from "@/lib/inpatient";

import {
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import type {
  DemoSurgicalCase,
} from "@/lib/inpatient";

import {
  formatWonFlowDashboardDateTime,
} from "@/lib/dashboard";

type CssdWorkspaceView =
  | "dashboard"
  | "sterilization"
  | "case-issue"
  | "inventory"
  | "movements";

interface IssueDraftLine {
  batchId: string;
  quantity: number;
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

function getTrayStatusClassName(
  status:
    DemoCssdInstrumentTray["status"],
): string {
  switch (status) {
    case "available":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "packed":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "sterilizing":
    case "issued":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "decontamination":
    case "used":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "quarantined":
    case "expired":
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function getCycleStatusClassName(
  status:
    DemoCssdSterilizationCycle["status"],
): string {
  switch (status) {
    case "draft":
      return "border-slate-200 bg-slate-100 text-slate-700";

    case "running":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "completed":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "released":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function getExpiryClassName(
  state:
    DemoCssdSterilityState,
): string {
  switch (state) {
    case "safe":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "expiring":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "critical":
    case "expired":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "unknown":
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

interface CssdContentProps {
  branches:
    readonly MockBranch[];
}

function CssdContent({
  branches,
}: CssdContentProps) {
  const [
    view,
    setView,
  ] = useState<CssdWorkspaceView>(
    "dashboard",
  );

  const [
    sterilizers,
    setSterilizers,
  ] = useState<
    DemoCssdSterilizer[]
  >([]);

  const [
    trays,
    setTrays,
  ] = useState<
    DemoCssdInstrumentTray[]
  >([]);

  const [
    cycles,
    setCycles,
  ] = useState<
    DemoCssdSterilizationCycle[]
  >([]);

  const [
    inventory,
    setInventory,
  ] = useState<
    DemoTheatreInventoryBatch[]
  >([]);

  const [
    surgicalCases,
    setSurgicalCases,
  ] = useState<
    DemoSurgicalCase[]
  >([]);

  const [
    issues,
    setIssues,
  ] = useState<
    DemoTheatreCaseIssue[]
  >([]);

  const [
    movements,
    setMovements,
  ] = useState<
    DemoTheatreInventoryMovement[]
  >([]);

  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    selectedBranchId,
    setSelectedBranchId,
  ] = useState("");

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    selectedTrayId,
    setSelectedTrayId,
  ] = useState("");

  const [
    trayProcessingStaff,
    setTrayProcessingStaff,
  ] = useState("");

  const [
    trayProcessingNote,
    setTrayProcessingNote,
  ] = useState("");

  const [
    sterilizerOperationNote,
    setSterilizerOperationNote,
  ] = useState("");

  const [
    cycleBranchId,
    setCycleBranchId,
  ] = useState("");

  const [
    cycleSterilizerId,
    setCycleSterilizerId,
  ] = useState("");

  const [
    cycleTrayIds,
    setCycleTrayIds,
  ] = useState<string[]>([]);

  const [
    cycleLoadDescription,
    setCycleLoadDescription,
  ] = useState("");

  const [
    cycleOperator,
    setCycleOperator,
  ] = useState("");

  const [
    selectedCycleId,
    setSelectedCycleId,
  ] = useState("");

  const [
    cycleTemperature,
    setCycleTemperature,
  ] = useState("134");

  const [
    cyclePressure,
    setCyclePressure,
  ] = useState("2.1");

  const [
    cycleExposure,
    setCycleExposure,
  ] = useState("18");

  const [
    chemicalIndicator,
    setChemicalIndicator,
  ] = useState<
    DemoCssdIndicatorResult
  >("pass");

  const [
    biologicalIndicator,
    setBiologicalIndicator,
  ] = useState<
    DemoCssdIndicatorResult
  >("not-required");

  const [
    machineReference,
    setMachineReference,
  ] = useState("");

  const [
    cycleCompletedBy,
    setCycleCompletedBy,
  ] = useState("");

  const [
    cycleFailureReason,
    setCycleFailureReason,
  ] = useState("");

  const [
    cycleReleasedBy,
    setCycleReleasedBy,
  ] = useState("");

  const [
    sterilityDays,
    setSterilityDays,
  ] = useState("30");

  const [
    issueCaseId,
    setIssueCaseId,
  ] = useState("");

  const [
    issueTrayIds,
    setIssueTrayIds,
  ] = useState<string[]>([]);

  const [
    issueLines,
    setIssueLines,
  ] = useState<IssueDraftLine[]>(
    [],
  );

  const [
    issueBatchId,
    setIssueBatchId,
  ] = useState("");

  const [
    issueQuantity,
    setIssueQuantity,
  ] = useState("1");

  const [
    issuedBy,
    setIssuedBy,
  ] = useState("");

  const [
    issueNote,
    setIssueNote,
  ] = useState("");

  const [
    selectedIssueId,
    setSelectedIssueId,
  ] = useState("");

  const [
    issueUsage,
    setIssueUsage,
  ] = useState<
    Record<string, string>
  >({});

  const [
    issueFinalizedBy,
    setIssueFinalizedBy,
  ] = useState("");

  const [
    inventoryBranchId,
    setInventoryBranchId,
  ] = useState("");

  const [
    inventoryItemCode,
    setInventoryItemCode,
  ] = useState("");

  const [
    inventoryItemName,
    setInventoryItemName,
  ] = useState("");

  const [
    inventoryItemType,
    setInventoryItemType,
  ] = useState<
    DemoTheatreInventoryItemType
  >("consumable");

  const [
    inventoryManufacturer,
    setInventoryManufacturer,
  ] = useState("");

  const [
    inventoryLotNumber,
    setInventoryLotNumber,
  ] = useState("");

  const [
    inventorySerialNumber,
    setInventorySerialNumber,
  ] = useState("");

  const [
    inventoryExpiryDate,
    setInventoryExpiryDate,
  ] = useState("");

  const [
    inventoryQuantity,
    setInventoryQuantity,
  ] = useState("");

  const [
    inventoryReorderLevel,
    setInventoryReorderLevel,
  ] = useState("");

  const [
    inventoryUnit,
    setInventoryUnit,
  ] = useState("unit");

  const [
    inventoryReceivedBy,
    setInventoryReceivedBy,
  ] = useState("");

  const [
    selectedBatchId,
    setSelectedBatchId,
  ] = useState("");

  const [
    adjustmentMode,
    setAdjustmentMode,
  ] = useState<
    | "increase"
    | "decrease"
    | "expiry-write-off"
  >("increase");

  const [
    adjustmentQuantity,
    setAdjustmentQuantity,
  ] = useState("");

  const [
    adjustmentPerformedBy,
    setAdjustmentPerformedBy,
  ] = useState("");

  const [
    adjustmentNote,
    setAdjustmentNote,
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
      initializeDemoCssdTheatreInventory(
        branches.map(
          (branch) => ({
            id: branch.id,
            name: branch.name,
          }),
        ),
      );

      setSterilizers(
        readDemoCssdSterilizers(),
      );

      setTrays(
        readDemoCssdInstrumentTrays(),
      );

      setCycles(
        readDemoCssdSterilizationCycles(),
      );

      setInventory(
        readDemoTheatreInventoryBatches(),
      );

      setSurgicalCases(
        readDemoSurgicalCases(),
      );

      setIssues(
        readDemoTheatreCaseIssues(),
      );

      setMovements(
        readDemoTheatreInventoryMovements(),
      );

      setPatients(
        readDemoPatientRegistrations(),
      );
    }, [branches]);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    const eventNames = [
      "wonflow:demo-cssd-sterilizers-changed",
      "wonflow:demo-cssd-trays-changed",
      "wonflow:demo-cssd-cycles-changed",
      "wonflow:demo-theatre-inventory-changed",
      "wonflow:demo-theatre-case-issues-changed",
      "wonflow:demo-theatre-inventory-movements-changed",
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

  const sterilizersById =
    useMemo(
      () =>
        new Map(
          sterilizers.map(
            (sterilizer) => [
              sterilizer.id,
              sterilizer,
            ],
          ),
        ),
      [sterilizers],
    );

  const traysById =
    useMemo(
      () =>
        new Map(
          trays.map(
            (tray) => [
              tray.id,
              tray,
            ],
          ),
        ),
      [trays],
    );

  const inventoryById =
    useMemo(
      () =>
        new Map(
          inventory.map(
            (batch) => [
              batch.id,
              batch,
            ],
          ),
        ),
      [inventory],
    );

  const casesById =
    useMemo(
      () =>
        new Map(
          surgicalCases.map(
            (surgicalCase) => [
              surgicalCase.id,
              surgicalCase,
            ],
          ),
        ),
      [surgicalCases],
    );

  const summary =
    useMemo(
      () =>
        buildDemoCssdTheatreInventorySummary(
          selectedBranchId,
        ),
      [
        selectedBranchId,
        trays,
        cycles,
        inventory,
        issues,
      ],
    );

  const normalizedSearch =
    searchValue
      .trim()
      .toLocaleLowerCase();

  const visibleTrays =
    trays.filter(
      (tray) => {
        if (
          selectedBranchId !==
            "" &&
          tray.branchId !==
            selectedBranchId
        ) {
          return false;
        }

        if (
          normalizedSearch ===
          ""
        ) {
          return true;
        }

        return [
          tray.trayCode,
          tray.trayName,
          tray.specialty,
          tray.status,
          tray.location,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(
            normalizedSearch,
          );
      },
    );

  const visibleSterilizers =
    sterilizers.filter(
      (sterilizer) =>
        selectedBranchId ===
          "" ||
        sterilizer.branchId ===
          selectedBranchId,
    );

  const selectedTray =
    trays.find(
      (tray) =>
        tray.id ===
        selectedTrayId,
    ) ??
    visibleTrays[0];

  const cycleSterilizers =
    sterilizers.filter(
      (sterilizer) =>
        cycleBranchId ===
          "" ||
        sterilizer.branchId ===
          cycleBranchId,
    );

  const packedTrays =
    trays.filter(
      (tray) =>
        tray.status ===
          "packed" &&
        (
          cycleBranchId ===
            "" ||
          tray.branchId ===
            cycleBranchId
        ),
    );

  const visibleCycles =
    cycles
      .filter(
        (cycle) =>
          selectedBranchId ===
            "" ||
          cycle.branchId ===
            selectedBranchId,
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

  const selectedCycle =
    cycles.find(
      (cycle) =>
        cycle.id ===
        selectedCycleId,
    ) ??
    visibleCycles[0];

  const eligibleSurgicalCases =
    surgicalCases
      .filter(
        (surgicalCase) =>
          surgicalCase.status ===
            "scheduled" ||
          surgicalCase.status ===
            "pre-op-ready" ||
          surgicalCase.status ===
            "in-surgery",
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

  const selectedIssueCase =
    eligibleSurgicalCases.find(
      (surgicalCase) =>
        surgicalCase.id ===
        issueCaseId,
    );

  const issueAvailableTrays =
    selectedIssueCase ===
    undefined
      ? []
      : trays.filter(
          (tray) =>
            tray.branchId ===
              selectedIssueCase.branchId &&
            tray.status ===
              "available" &&
            classifyDemoCssdSterility(
              tray,
            ) !== "expired",
        );

  const issueAvailableInventory =
    selectedIssueCase ===
    undefined
      ? []
      : inventory.filter(
          (batch) =>
            batch.branchId ===
              selectedIssueCase.branchId &&
            batch.availableQuantity >
              0 &&
            classifyDemoTheatreInventoryExpiry(
              batch,
            ) !== "expired",
        );

  const sortedIssues =
    [...issues].sort(
      (
        left,
        right,
      ) =>
        new Date(
          right.issuedAt,
        ).getTime() -
        new Date(
          left.issuedAt,
        ).getTime(),
    );

  const selectedIssue =
    issues.find(
      (issue) =>
        issue.id ===
        selectedIssueId,
    ) ??
    sortedIssues[0];

  const visibleInventory =
    inventory.filter(
      (batch) => {
        if (
          selectedBranchId !==
            "" &&
          batch.branchId !==
            selectedBranchId
        ) {
          return false;
        }

        if (
          normalizedSearch ===
          ""
        ) {
          return true;
        }

        return [
          batch.itemCode,
          batch.itemName,
          batch.manufacturer,
          batch.lotNumber,
          batch.serialNumber,
          batch.itemType,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(
            normalizedSearch,
          );
      },
    );

  const selectedBatch =
    inventory.find(
      (batch) =>
        batch.id ===
        selectedBatchId,
    ) ??
    visibleInventory[0];

  useEffect(() => {
    if (
      selectedIssue ===
      undefined
    ) {
      return;
    }

    queueMicrotask(() => {
      setIssueUsage(
        Object.fromEntries(
          selectedIssue.lines.map(
            (line) => [
              line.id,
              String(
                line.quantityUsed,
              ),
            ],
          ),
        ),
      );

      setIssueFinalizedBy("");
    });
  }, [selectedIssue?.id]);

  function changeSterilizerStatus(
    sterilizer:
      DemoCssdSterilizer,

    status:
      Exclude<
        DemoCssdSterilizerStatus,
        "running"
      >,
  ) {
    const updated =
      updateDemoCssdSterilizerStatus({
        sterilizerId:
          sterilizer.id,

        status,

        note:
          sterilizerOperationNote,
      });

    if (
      updated === undefined
    ) {
      setActionMessage(
        "A sterilizer currently running cannot be updated manually.",
      );

      return;
    }

    setSterilizerOperationNote("");

    reloadLocalData();

    setActionMessage(
      `${updated.sterilizerName} marked ${humanizeValue(
        updated.status,
      ).toLocaleLowerCase()}.`,
    );
  }

  function sendTrayToDecontamination() {
    if (
      selectedTray ===
      undefined
    ) {
      return;
    }

    const updated =
      sendDemoCssdTrayForReprocessing({
        trayId:
          selectedTray.id,

        note:
          trayProcessingNote,
      });

    if (
      updated === undefined
    ) {
      setActionMessage(
        "This tray cannot currently be sent for reprocessing.",
      );

      return;
    }

    setTrayProcessingNote("");

    reloadLocalData();

    setActionMessage(
      `${updated.trayCode} moved to decontamination.`,
    );
  }

  function markTrayPacked() {
    if (
      selectedTray ===
      undefined
    ) {
      return;
    }

    const updated =
      markDemoCssdTrayPacked({
        trayId:
          selectedTray.id,

        completedBy:
          trayProcessingStaff,
      });

    if (
      updated === undefined
    ) {
      setActionMessage(
        "Enter the responsible CSSD staff member. Only a decontaminated tray can be packed.",
      );

      return;
    }

    setTrayProcessingStaff("");

    reloadLocalData();

    setActionMessage(
      `${updated.trayCode} inspected and packed.`,
    );
  }

  function toggleCycleTray(
    trayId: string,
  ) {
    setCycleTrayIds(
      (current) =>
        current.includes(
          trayId,
        )
          ? current.filter(
              (id) =>
                id !== trayId,
            )
          : [
              ...current,
              trayId,
            ],
    );
  }

  function createCycle() {
    const input = {
      branchId:
        cycleBranchId,

      sterilizerId:
        cycleSterilizerId,

      trayIds:
        cycleTrayIds,

      loadDescription:
        cycleLoadDescription,

      operator:
        cycleOperator,
    };

    const errors =
      validateDemoCssdCycleDraft(
        input,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required sterilization-cycle information.",
      );

      return;
    }

    const cycle =
      createDemoCssdCycleDraft(
        input,
      );

    if (
      cycle === undefined
    ) {
      setActionMessage(
        "The sterilization cycle could not be created.",
      );

      return;
    }

    setCycleSterilizerId("");
    setCycleTrayIds([]);
    setCycleLoadDescription("");
    setCycleOperator("");

    setValidationErrors([]);

    reloadLocalData();

    setSelectedCycleId(
      cycle.id,
    );

    setActionMessage(
      `${cycle.cycleNumber} created successfully.`,
    );
  }

  function startCycle() {
    if (
      selectedCycle ===
      undefined
    ) {
      return;
    }

    const started =
      startDemoCssdCycle({
        cycleId:
          selectedCycle.id,

        startedBy:
          cycleOperator,
      });

    if (
      started === undefined
    ) {
      setActionMessage(
        "Enter the CSSD operator and confirm the sterilizer and trays are available.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      `${started.cycleNumber} started.`,
    );
  }

  function completeCycle() {
    if (
      selectedCycle ===
      undefined
    ) {
      return;
    }

    const input = {
      cycleId:
        selectedCycle.id,

      temperatureCelsius:
        Number(
          cycleTemperature,
        ),

      pressureBar:
        Number(
          cyclePressure,
        ),

      exposureMinutes:
        Number(
          cycleExposure,
        ),

      chemicalIndicator,

      biologicalIndicator,

      machinePrintoutReference:
        machineReference,

      completedBy:
        cycleCompletedBy,

      failureReason:
        cycleFailureReason,
    };

    const errors =
      validateDemoCssdCycleCompletion(
        input,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required sterilization results.",
      );

      return;
    }

    const completed =
      completeDemoCssdCycle(
        input,
      );

    if (
      completed === undefined
    ) {
      setActionMessage(
        "The sterilization cycle could not be completed.",
      );

      return;
    }

    setValidationErrors([]);

    reloadLocalData();

    setActionMessage(
      completed.status ===
        "failed"
        ? `${completed.cycleNumber} failed. All trays were quarantined.`
        : `${completed.cycleNumber} completed and is awaiting CSSD release.`,
    );
  }

  function releaseCycle() {
    if (
      selectedCycle ===
      undefined
    ) {
      return;
    }

    const released =
      releaseDemoCssdCycle({
        cycleId:
          selectedCycle.id,

        releasedBy:
          cycleReleasedBy,

        sterilityDays:
          Number(
            sterilityDays,
          ),
      });

    if (
      released === undefined
    ) {
      setActionMessage(
        "Enter the release officer and a valid sterility period. Both indicators must pass.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      `${released.cycleNumber} released. Trays are now available in the sterile store.`,
    );
  }

  function addIssueLine() {
    const quantity =
      Number(
        issueQuantity,
      );

    if (
      issueBatchId === "" ||
      !Number.isFinite(
        quantity,
      ) ||
      quantity <= 0
    ) {
      setActionMessage(
        "Select an inventory batch and enter a valid quantity.",
      );

      return;
    }

    setIssueLines(
      (current) => {
        const existing =
          current.find(
            (line) =>
              line.batchId ===
              issueBatchId,
          );

        if (
          existing !== undefined
        ) {
          return current.map(
            (line) =>
              line.batchId ===
              issueBatchId
                ? {
                    ...line,

                    quantity:
                      line.quantity +
                      Math.round(
                        quantity,
                      ),
                  }
                : line,
          );
        }

        return [
          ...current,

          {
            batchId:
              issueBatchId,

            quantity:
              Math.round(
                quantity,
              ),
          },
        ];
      },
    );

    setIssueBatchId("");
    setIssueQuantity("1");
  }

  function createCaseIssue() {
    const input = {
      caseId:
        issueCaseId,

      trayIds:
        issueTrayIds,

      lines:
        issueLines,

      issuedBy,

      note:
        issueNote,
    };

    const errors =
      validateDemoTheatreCaseIssue(
        input,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required surgical-supply issue information.",
      );

      return;
    }

    const issue =
      issueDemoTheatreSuppliesToCase(
        input,
      );

    if (
      issue === undefined
    ) {
      setActionMessage(
        "The surgical supplies could not be issued.",
      );

      return;
    }

    setIssueTrayIds([]);
    setIssueLines([]);
    setIssuedBy("");
    setIssueNote("");

    setValidationErrors([]);

    reloadLocalData();

    setSelectedIssueId(
      issue.id,
    );

    setActionMessage(
      `${issue.issueNumber} issued successfully.`,
    );
  }

  function finalizeIssue() {
    if (
      selectedIssue ===
      undefined
    ) {
      return;
    }

    const usage =
      selectedIssue.lines.map(
        (line) => ({
          lineId:
            line.id,

          quantityUsed:
            Number(
              issueUsage[
                line.id
              ] ?? "0",
            ),
        }),
      );

    const finalized =
      finalizeDemoTheatreCaseIssue({
        issueId:
          selectedIssue.id,

        usage,

        finalizedBy:
          issueFinalizedBy,
      });

    if (
      finalized === undefined
    ) {
      setActionMessage(
        "Enter valid used quantities and the staff member finalizing the surgical issue.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      `${finalized.issueNumber} reconciled. Returned stock was restored and trays now require reprocessing.`,
    );
  }

  function createInventoryBatch() {
    const input = {
      branchId:
        inventoryBranchId,

      itemCode:
        inventoryItemCode,

      itemName:
        inventoryItemName,

      itemType:
        inventoryItemType,

      manufacturer:
        inventoryManufacturer,

      lotNumber:
        inventoryLotNumber,

      serialNumber:
        inventorySerialNumber,

      expiryDate:
        inventoryExpiryDate,

      availableQuantity:
        Number(
          inventoryQuantity,
        ),

      reorderLevel:
        Number(
          inventoryReorderLevel,
        ),

      unitOfMeasure:
        inventoryUnit,

      receivedBy:
        inventoryReceivedBy,
    };

    const errors =
      validateDemoTheatreInventoryBatch(
        input,
      );

    if (
      inventoryReceivedBy
        .trim()
        .length < 2
    ) {
      errors.push(
        "Enter the staff member receiving the inventory.",
      );
    }

    setValidationErrors(
      [
        ...new Set(errors),
      ],
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required inventory-batch information.",
      );

      return;
    }

    const batch =
      createDemoTheatreInventoryBatch(
        input,
      );

    if (
      batch === undefined
    ) {
      setActionMessage(
        "The inventory batch could not be created. Check for a duplicate item, lot and serial combination.",
      );

      return;
    }

    setInventoryItemCode("");
    setInventoryItemName("");
    setInventoryManufacturer("");
    setInventoryLotNumber("");
    setInventorySerialNumber("");
    setInventoryExpiryDate("");
    setInventoryQuantity("");
    setInventoryReorderLevel("");
    setInventoryReceivedBy("");

    setValidationErrors([]);

    reloadLocalData();

    setSelectedBatchId(
      batch.id,
    );

    setActionMessage(
      `${batch.itemName} lot ${batch.lotNumber} received successfully.`,
    );
  }

  function adjustInventory() {
    if (
      selectedBatch ===
      undefined
    ) {
      return;
    }

    const updated =
      adjustDemoTheatreInventoryBatch({
        batchId:
          selectedBatch.id,

        mode:
          adjustmentMode,

        quantity:
          Number(
            adjustmentQuantity,
          ),

        performedBy:
          adjustmentPerformedBy,

        note:
          adjustmentNote,
      });

    if (
      updated === undefined
    ) {
      setActionMessage(
        "Enter a valid quantity, responsible staff member and adjustment reason. Stock cannot become negative.",
      );

      return;
    }

    setAdjustmentQuantity("");
    setAdjustmentPerformedBy("");
    setAdjustmentNote("");

    reloadLocalData();

    setActionMessage(
      `${updated.itemName} adjusted successfully. New balance: ${updated.availableQuantity}.`,
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            {selectedIssue !==
              undefined ? (
              <Link
                className="wf-button-secondary"
                href={`/operations/surgery/cssd/${encodeURIComponent(
                  selectedIssue.id,
                )}/traceability/print`}
              >
                <Printer size={16} />
                Print Traceability
              </Link>
            ) : null}

            <Link
              className="wf-button-secondary"
              href="/operations/surgery/operation-theatre"
            >
              Operation Theatre
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
            href:
              "/operations/surgery/operation-theatre",
          },
          {
            label:
              "CSSD and Theatre Inventory",
          },
        ]}
        description="Manage instrument reprocessing, sterilization-cycle release, implant traceability and surgical inventory."
        eyebrow="Sterile Services"
        leading={
          <PackageCheck
            size={20}
          />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              Fictional CSSD data
            </span>

            <span>
              Multi-branch traceability
            </span>
          </>
        }
        title="CSSD and Theatre Inventory"
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
          helperText={`${summary.totalTrays} registered trays`}
          icon={
            <Archive size={18} />
          }
          label="Available Sterile Trays"
          tone="emerald"
          value={
            summary.availableTrays
          }
        />

        <WonFlowKpiCard
          helperText={`${summary.packedTrays} packed · ${summary.sterilizingTrays} sterilizing`}
          icon={
            <TestTube2
              size={18}
            />
          }
          label="Active CSSD Work"
          tone="blue"
          value={
            summary.decontaminationTrays +
            summary.packedTrays +
            summary.sterilizingTrays
          }
        />

        <WonFlowKpiCard
          helperText={`${summary.failedCycles} failed cycles`}
          icon={
            <ShieldCheck
              size={18}
            />
          }
          label="Quarantined Trays"
          tone="amber"
          value={
            summary.quarantinedTrays
          }
        />

        <WonFlowKpiCard
          helperText={`${summary.expiringBatches} expiry alerts`}
          icon={
            <Boxes size={18} />
          }
          label="Low Stock Batches"
          tone="violet"
          value={
            summary.lowStockBatches
          }
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-[18px] border border-slate-200 bg-white p-3">
        {[
          [
            "dashboard",
            "CSSD Dashboard",
          ],
          [
            "sterilization",
            "Sterilization Cycles",
          ],
          [
            "case-issue",
            "Issue to Theatre",
          ],
          [
            "inventory",
            "Theatre Inventory",
          ],
          [
            "movements",
            "Movement History",
          ],
        ].map(
          (
            [
              value,
              label,
            ],
          ) => (
            <WonFlowActionButton
              key={value}
              onClick={() => {
                setView(
                  value as
                  CssdWorkspaceView,
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

      {view ===
      "dashboard" ? (
        <div className="space-y-6">
          <section className="rounded-[18px] border border-slate-200 bg-white p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
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
                  placeholder="Search tray, inventory item, lot or serial number"
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
            </div>
          </section>

          <div className="wf-workflow-split">
            <div className="wf-workflow-main">
              <WonFlowOperationalPanel
                description="Select a tray to manage its reprocessing status."
                status={
                  <span className="wf-status wf-status-blue">
                    {
                      visibleTrays.length
                    }
                    {" trays"}
                  </span>
                }
                title="Surgical Instrument Trays"
                tone="blue"
              >
                <div className="wf-content-scroll">
                  <table className="w-full min-w-[1050px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">
                          Tray
                        </th>

                        <th className="px-3 py-3">
                          Branch
                        </th>

                        <th className="px-3 py-3">
                          Specialty
                        </th>

                        <th className="px-3 py-3">
                          Instruments
                        </th>

                        <th className="px-3 py-3">
                          Location
                        </th>

                        <th className="px-3 py-3">
                          Sterility
                        </th>

                        <th className="px-3 py-3">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleTrays.map(
                        (tray) => {
                          const selected =
                            selectedTray?.id ===
                            tray.id;

                          const sterility =
                            classifyDemoCssdSterility(
                              tray,
                            );

                          return (
                            <tr
                              className={[
                                "cursor-pointer border-b border-slate-100 last:border-0",
                                selected
                                  ? "bg-blue-50"
                                  : "hover:bg-slate-50",
                              ].join(" ")}
                              key={tray.id}
                              onClick={() => {
                                setSelectedTrayId(
                                  tray.id,
                                );
                              }}
                            >
                              <td className="px-3 py-3">
                                <div className="font-black text-slate-950">
                                  {
                                    tray.trayName
                                  }
                                </div>

                                <div className="mt-1 font-mono text-xs text-blue-700">
                                  {
                                    tray.trayCode
                                  }
                                </div>
                              </td>

                              <td className="px-3 py-3 text-xs">
                                {branchesById.get(
                                  tray.branchId,
                                )?.name ??
                                  "Unknown branch"}
                              </td>

                              <td className="px-3 py-3 text-xs font-bold">
                                {humanizeValue(
                                  tray.specialty,
                                )}
                              </td>

                              <td className="px-3 py-3 font-black">
                                {
                                  tray.instrumentCount
                                }
                              </td>

                              <td className="px-3 py-3 text-xs">
                                {
                                  tray.location
                                }
                              </td>

                              <td className="px-3 py-3">
                                <span
                                  className={[
                                    "rounded-full border px-2.5 py-1 text-[10px] font-black",
                                    getExpiryClassName(
                                      sterility,
                                    ),
                                  ].join(" ")}
                                >
                                  {humanizeValue(
                                    sterility,
                                  )}
                                </span>
                              </td>

                              <td className="px-3 py-3">
                                <span
                                  className={[
                                    "rounded-full border px-2.5 py-1 text-[10px] font-black",
                                    getTrayStatusClassName(
                                      tray.status,
                                    ),
                                  ].join(" ")}
                                >
                                  {humanizeValue(
                                    tray.status,
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
              </WonFlowOperationalPanel>
            </div>

            <aside className="wf-workflow-aside">
              <WonFlowOperationalPanel
                description="Move used trays through decontamination and packing."
                title="Tray Processing"
                tone="violet"
              >
                {selectedTray ===
                undefined ? (
                  <WonFlowEmptyState
                    description="Select a surgical instrument tray."
                    title="Select a tray"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                      <div className="font-black text-violet-950">
                        {
                          selectedTray.trayName
                        }
                      </div>

                      <div className="mt-1 font-mono text-xs text-violet-700">
                        {
                          selectedTray.trayCode
                        }
                      </div>

                      <span
                        className={[
                          "mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black",
                          getTrayStatusClassName(
                            selectedTray.status,
                          ),
                        ].join(" ")}
                      >
                        {humanizeValue(
                          selectedTray.status,
                        )}
                      </span>
                    </div>

                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setTrayProcessingStaff(
                          event.target.value,
                        );
                      }}
                      placeholder="Responsible CSSD staff"
                      value={
                        trayProcessingStaff
                      }
                    />

                    <textarea
                      className={[
                        wonFlowTextareaClassName,
                        "min-h-24",
                      ].join(" ")}
                      onChange={(
                        event,
                      ) => {
                        setTrayProcessingNote(
                          event.target.value,
                        );
                      }}
                      placeholder="Processing or quarantine note"
                      value={
                        trayProcessingNote
                      }
                    />

                    <div className="grid gap-2">
                      <WonFlowActionButton
                        onClick={
                          sendTrayToDecontamination
                        }
                        variant="secondary"
                      >
                        Send to Decontamination
                      </WonFlowActionButton>

                      <WonFlowActionButton
                        onClick={
                          markTrayPacked
                        }
                        variant="primary"
                      >
                        Complete Inspection and Packing
                      </WonFlowActionButton>
                    </div>
                  </div>
                )}
              </WonFlowOperationalPanel>
            </aside>
          </div>

          <WonFlowOperationalPanel
            description="Manage sterilizer availability and maintenance."
            title="CSSD Sterilizers"
            tone="emerald"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleSterilizers.map(
                (sterilizer) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    key={
                      sterilizer.id
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-slate-950">
                          {
                            sterilizer.sterilizerName
                          }
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {
                            sterilizer.sterilizerCode
                          }
                          {" · "}
                          {humanizeValue(
                            sterilizer.method,
                          )}
                        </div>
                      </div>

                      <span className="wf-status wf-status-neutral">
                        {humanizeValue(
                          sterilizer.status,
                        )}
                      </span>
                    </div>

                    {sterilizer.status !==
                    "running" ? (
                      <div className="mt-4 space-y-3">
                        <input
                          className={
                            wonFlowInputClassName
                          }
                          onChange={(
                            event,
                          ) => {
                            setSterilizerOperationNote(
                              event.target.value,
                            );
                          }}
                          placeholder="Maintenance note"
                          value={
                            sterilizerOperationNote
                          }
                        />

                        <div className="flex flex-wrap gap-2">
                          <WonFlowActionButton
                            onClick={() => {
                              changeSterilizerStatus(
                                sterilizer,
                                "available",
                              );
                            }}
                            variant="primary"
                          >
                            Mark Available
                          </WonFlowActionButton>

                          <WonFlowActionButton
                            onClick={() => {
                              changeSterilizerStatus(
                                sterilizer,
                                "maintenance",
                              );
                            }}
                            variant="secondary"
                          >
                            <Wrench
                              size={16}
                            />
                            Maintenance
                          </WonFlowActionButton>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-700">
                        Sterilization cycle currently running.
                      </div>
                    )}
                  </article>
                ),
              )}
            </div>
          </WonFlowOperationalPanel>
        </div>
      ) : null}

      {view ===
      "sterilization" ? (
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <WonFlowOperationalPanel
            description="Create a sterilization load using packed instrument trays."
            icon={
              <TestTube2
                size={18}
              />
            }
            title="New Sterilization Cycle"
            tone="blue"
          >
            <div className="space-y-4">
              <select
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setCycleBranchId(
                    event.target.value,
                  );

                  setCycleSterilizerId("");
                  setCycleTrayIds([]);
                }}
                value={
                  cycleBranchId
                }
              >
                <option value="">
                  Select hospital branch
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
                  setCycleSterilizerId(
                    event.target.value,
                  );
                }}
                value={
                  cycleSterilizerId
                }
              >
                <option value="">
                  Select sterilizer
                </option>

                {cycleSterilizers.map(
                  (sterilizer) => (
                    <option
                      disabled={
                        sterilizer.status !==
                        "available"
                      }
                      key={
                        sterilizer.id
                      }
                      value={
                        sterilizer.id
                      }
                    >
                      {
                        sterilizer.sterilizerName
                      }
                      {" — "}
                      {humanizeValue(
                        sterilizer.status,
                      )}
                    </option>
                  ),
                )}
              </select>

              <div>
                <div className="text-xs font-bold text-slate-600">
                  Packed Trays
                </div>

                <div className="mt-2 space-y-2">
                  {packedTrays.length ===
                  0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                      No packed tray is available for the selected branch.
                    </div>
                  ) : (
                    packedTrays.map(
                      (tray) => (
                        <label
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                          key={tray.id}
                        >
                          <input
                            checked={cycleTrayIds.includes(
                              tray.id,
                            )}
                            className="mt-1"
                            onChange={() => {
                              toggleCycleTray(
                                tray.id,
                              );
                            }}
                            type="checkbox"
                          />

                          <span>
                            <span className="block text-sm font-black text-slate-900">
                              {
                                tray.trayName
                              }
                            </span>

                            <span className="mt-1 block font-mono text-xs text-slate-500">
                              {
                                tray.trayCode
                              }
                            </span>
                          </span>
                        </label>
                      ),
                    )
                  )}
                </div>
              </div>

              <textarea
                className={[
                  wonFlowTextareaClassName,
                  "min-h-24",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setCycleLoadDescription(
                    event.target.value,
                  );
                }}
                placeholder="Load description"
                value={
                  cycleLoadDescription
                }
              />

              <input
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setCycleOperator(
                    event.target.value,
                  );
                }}
                placeholder="CSSD operator"
                value={
                  cycleOperator
                }
              />

              <WonFlowActionButton
                onClick={
                  createCycle
                }
                variant="primary"
              >
                Create Cycle Draft
              </WonFlowActionButton>
            </div>
          </WonFlowOperationalPanel>

          <div className="space-y-6">
            <WonFlowOperationalPanel
              description="Select a cycle to start, complete or release."
              status={
                <span className="wf-status wf-status-blue">
                  {
                    visibleCycles.length
                  }
                  {" cycles"}
                </span>
              }
              title="Sterilization Cycle History"
              tone="violet"
            >
              {visibleCycles.length ===
              0 ? (
                <WonFlowEmptyState
                  description="Sterilization cycles will appear here."
                  title="No cycles"
                />
              ) : (
                <div className="space-y-3">
                  {visibleCycles.map(
                    (cycle) => (
                      <button
                        className={[
                          "w-full rounded-2xl border p-4 text-left transition",
                          selectedCycle?.id ===
                          cycle.id
                            ? "border-violet-300 bg-violet-50"
                            : "border-slate-200 bg-white hover:border-violet-200",
                        ].join(" ")}
                        key={cycle.id}
                        onClick={() => {
                          setSelectedCycleId(
                            cycle.id,
                          );
                        }}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-mono text-sm font-black text-slate-950">
                              {
                                cycle.cycleNumber
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                cycle.loadDescription
                              }
                            </div>
                          </div>

                          <span
                            className={[
                              "rounded-full border px-2.5 py-1 text-[10px] font-black",
                              getCycleStatusClassName(
                                cycle.status,
                              ),
                            ].join(" ")}
                          >
                            {humanizeValue(
                              cycle.status,
                            )}
                          </span>
                        </div>

                        <div className="mt-3 text-xs text-slate-500">
                          {sterilizersById.get(
                            cycle.sterilizerId,
                          )?.sterilizerName ??
                            "Unknown sterilizer"}
                          {" · "}
                          {
                            cycle.trayIds.length
                          }
                          {" trays"}
                        </div>
                      </button>
                    ),
                  )}
                </div>
              )}
            </WonFlowOperationalPanel>

            {selectedCycle !==
            undefined ? (
              <WonFlowOperationalPanel
                description="Complete the current CSSD cycle stage."
                title={`${selectedCycle.cycleNumber} — ${humanizeValue(
                  selectedCycle.status,
                )}`}
                tone="emerald"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SummaryItem
                    label="Sterilizer"
                    value={
                      sterilizersById.get(
                        selectedCycle.sterilizerId,
                      )?.sterilizerName ??
                      "Unknown sterilizer"
                    }
                  />

                  <SummaryItem
                    label="Method"
                    value={humanizeValue(
                      selectedCycle.method,
                    )}
                  />

                  <SummaryItem
                    label="Operator"
                    value={
                      selectedCycle.operator
                    }
                  />

                  <SummaryItem
                    label="Trays"
                    value={
                      selectedCycle.trayIds
                        .map(
                          (trayId) =>
                            traysById.get(
                              trayId,
                            )?.trayCode ??
                            trayId,
                        )
                        .join(", ")
                    }
                  />
                </div>

                {selectedCycle.status ===
                "draft" ? (
                  <div className="mt-5 space-y-3">
                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setCycleOperator(
                          event.target.value,
                        );
                      }}
                      placeholder="Operator starting the cycle"
                      value={
                        cycleOperator
                      }
                    />

                    <WonFlowActionButton
                      onClick={
                        startCycle
                      }
                      variant="primary"
                    >
                      Start Sterilization Cycle
                    </WonFlowActionButton>
                  </div>
                ) : null}

                {selectedCycle.status ===
                "running" ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <NumberField
                      label="Temperature °C"
                      onChange={
                        setCycleTemperature
                      }
                      step="0.1"
                      value={
                        cycleTemperature
                      }
                    />

                    <NumberField
                      label="Pressure Bar"
                      onChange={
                        setCyclePressure
                      }
                      step="0.1"
                      value={
                        cyclePressure
                      }
                    />

                    <NumberField
                      label="Exposure Minutes"
                      onChange={
                        setCycleExposure
                      }
                      value={
                        cycleExposure
                      }
                    />

                    <IndicatorField
                      label="Chemical Indicator"
                      onChange={
                        setChemicalIndicator
                      }
                      value={
                        chemicalIndicator
                      }
                    />

                    <IndicatorField
                      allowNotRequired
                      label="Biological Indicator"
                      onChange={
                        setBiologicalIndicator
                      }
                      value={
                        biologicalIndicator
                      }
                    />

                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setMachineReference(
                          event.target.value,
                        );
                      }}
                      placeholder="Sterilizer printout reference"
                      value={
                        machineReference
                      }
                    />

                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setCycleCompletedBy(
                          event.target.value,
                        );
                      }}
                      placeholder="Cycle completed by"
                      value={
                        cycleCompletedBy
                      }
                    />

                    <textarea
                      className={[
                        wonFlowTextareaClassName,
                        "min-h-24",
                      ].join(" ")}
                      onChange={(
                        event,
                      ) => {
                        setCycleFailureReason(
                          event.target.value,
                        );
                      }}
                      placeholder="Failure reason when an indicator fails"
                      value={
                        cycleFailureReason
                      }
                    />

                    <div className="md:col-span-2">
                      <WonFlowActionButton
                        onClick={
                          completeCycle
                        }
                        variant="primary"
                      >
                        Complete Cycle
                      </WonFlowActionButton>
                    </div>
                  </div>
                ) : null}

                {selectedCycle.status ===
                "completed" ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setCycleReleasedBy(
                          event.target.value,
                        );
                      }}
                      placeholder="CSSD release officer"
                      value={
                        cycleReleasedBy
                      }
                    />

                    <NumberField
                      label="Sterility Validity Days"
                      onChange={
                        setSterilityDays
                      }
                      value={
                        sterilityDays
                      }
                    />

                    <div className="md:col-span-2">
                      <WonFlowActionButton
                        onClick={
                          releaseCycle
                        }
                        variant="primary"
                      >
                        Release Sterile Load
                      </WonFlowActionButton>
                    </div>
                  </div>
                ) : null}

                {selectedCycle.status ===
                "failed" ? (
                  <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <div className="font-black text-rose-900">
                      Cycle failed and trays quarantined
                    </div>

                    <p className="mt-2 text-sm text-rose-700">
                      {
                        selectedCycle.failureReason
                      }
                    </p>
                  </div>
                ) : null}

                {selectedCycle.status ===
                "released" ? (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 font-black text-emerald-900">
                      <CheckCircle2
                        size={18}
                      />

                      Sterile load released
                    </div>

                    <p className="mt-2 text-sm text-emerald-700">
                      Released by
                      {" "}
                      {
                        selectedCycle.releasedBy
                      }
                      {" on "}
                      {formatWonFlowDashboardDateTime(
                        selectedCycle.releasedAt,
                      )}
                      .
                    </p>
                  </div>
                ) : null}
              </WonFlowOperationalPanel>
            ) : null}
          </div>
        </div>
      ) : null}

      {view ===
      "case-issue" ? (
        <div className="space-y-6">
          <WonFlowOperationalPanel
            description="Issue sterile trays, consumables and implants to an active surgical case."
            icon={
              <ClipboardCheck
                size={18}
              />
            }
            title="New Theatre Supply Issue"
            tone="blue"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label>
                <span className="text-xs font-bold text-slate-600">
                  Surgical Case
                </span>

                <select
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    setIssueCaseId(
                      event.target.value,
                    );

                    setIssueTrayIds([]);
                    setIssueLines([]);
                  }}
                  value={
                    issueCaseId
                  }
                >
                  <option value="">
                    Select surgical case
                  </option>

                  {eligibleSurgicalCases.map(
                    (surgicalCase) => {
                      const patient =
                        patientsById.get(
                          surgicalCase.patientId,
                        );

                      return (
                        <option
                          key={
                            surgicalCase.id
                          }
                          value={
                            surgicalCase.id
                          }
                        >
                          {
                            surgicalCase.caseNumber
                          }
                          {" — "}
                          {patient?.displayName ??
                            "Unknown patient"}
                          {" — "}
                          {
                            surgicalCase.procedureName
                          }
                        </option>
                      );
                    },
                  )}
                </select>
              </label>

              <label>
                <span className="text-xs font-bold text-slate-600">
                  Issued By
                </span>

                <input
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    setIssuedBy(
                      event.target.value,
                    );
                  }}
                  value={issuedBy}
                />
              </label>
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-slate-600">
                  Sterile Instrument Trays
                </div>

                <div className="mt-3 space-y-2">
                  {issueAvailableTrays.length ===
                  0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No sterile tray is available for the selected branch.
                    </div>
                  ) : (
                    issueAvailableTrays.map(
                      (tray) => (
                        <label
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                          key={tray.id}
                        >
                          <input
                            checked={issueTrayIds.includes(
                              tray.id,
                            )}
                            className="mt-1"
                            onChange={() => {
                              setIssueTrayIds(
                                (current) =>
                                  current.includes(
                                    tray.id,
                                  )
                                    ? current.filter(
                                        (id) =>
                                          id !==
                                          tray.id,
                                      )
                                    : [
                                        ...current,
                                        tray.id,
                                      ],
                              );
                            }}
                            type="checkbox"
                          />

                          <span>
                            <span className="block text-sm font-black text-slate-900">
                              {
                                tray.trayName
                              }
                            </span>

                            <span className="mt-1 block text-xs text-slate-500">
                              {
                                tray.trayCode
                              }
                              {" · "}
                              {humanizeValue(
                                classifyDemoCssdSterility(
                                  tray,
                                ),
                              )}
                            </span>
                          </span>
                        </label>
                      ),
                    )
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-wide text-slate-600">
                  Consumables and Implants
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                  <select
                    className={
                      wonFlowInputClassName
                    }
                    onChange={(
                      event,
                    ) => {
                      setIssueBatchId(
                        event.target.value,
                      );
                    }}
                    value={
                      issueBatchId
                    }
                  >
                    <option value="">
                      Select inventory batch
                    </option>

                    {issueAvailableInventory.map(
                      (batch) => (
                        <option
                          key={batch.id}
                          value={batch.id}
                        >
                          {batch.itemName}
                          {" — Lot "}
                          {batch.lotNumber}
                          {" — "}
                          {batch.availableQuantity}
                          {" available"}
                        </option>
                      ),
                    )}
                  </select>

                  <input
                    className={
                      wonFlowInputClassName
                    }
                    min={1}
                    onChange={(
                      event,
                    ) => {
                      setIssueQuantity(
                        event.target.value,
                      );
                    }}
                    type="number"
                    value={
                      issueQuantity
                    }
                  />

                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white"
                    onClick={
                      addIssueLine
                    }
                    type="button"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {issueLines.map(
                    (line) => {
                      const batch =
                        inventoryById.get(
                          line.batchId,
                        );

                      return (
                        <div
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                          key={
                            line.batchId
                          }
                        >
                          <div>
                            <div className="text-sm font-black text-slate-900">
                              {batch?.itemName ??
                                "Unknown item"}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              Lot
                              {" "}
                              {batch?.lotNumber ??
                                "Unknown"}
                              {" · Qty "}
                              {
                                line.quantity
                              }
                            </div>
                          </div>

                          <button
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                            onClick={() => {
                              setIssueLines(
                                (current) =>
                                  current.filter(
                                    (record) =>
                                      record.batchId !==
                                      line.batchId,
                                  ),
                              );
                            }}
                            type="button"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </div>

            <textarea
              className={[
                wonFlowTextareaClassName,
                "mt-5 min-h-24",
              ].join(" ")}
              onChange={(
                event,
              ) => {
                setIssueNote(
                  event.target.value,
                );
              }}
              placeholder="Theatre issue note"
              value={issueNote}
            />

            <div className="mt-4">
              <WonFlowActionButton
                onClick={
                  createCaseIssue
                }
                variant="primary"
              >
                Issue Supplies to Theatre
              </WonFlowActionButton>
            </div>
          </WonFlowOperationalPanel>

          <div className="wf-workspace-rail">
            <div className="wf-workspace-rail-side">
              <WonFlowOperationalPanel
                description="Select an issue to reconcile used and returned supplies."
                title="Theatre Issue History"
                tone="violet"
              >
                {sortedIssues.length ===
                0 ? (
                  <WonFlowEmptyState
                    description="Surgical supply issues will appear here."
                    title="No theatre issues"
                  />
                ) : (
                  <div className="space-y-3">
                    {sortedIssues.map(
                      (issue) => {
                        const surgicalCase =
                          casesById.get(
                            issue.caseId,
                          );

                        const patient =
                          patientsById.get(
                            issue.patientId,
                          );

                        return (
                          <button
                            className={[
                              "w-full rounded-2xl border p-4 text-left transition",
                              selectedIssue?.id ===
                              issue.id
                                ? "border-violet-300 bg-violet-50"
                                : "border-slate-200 bg-white hover:border-violet-200",
                            ].join(" ")}
                            key={issue.id}
                            onClick={() => {
                              setSelectedIssueId(
                                issue.id,
                              );
                            }}
                            type="button"
                          >
                            <div className="font-mono text-xs font-black text-violet-700">
                              {
                                issue.issueNumber
                              }
                            </div>

                            <div className="mt-2 font-black text-slate-950">
                              {patient?.displayName ??
                                "Unknown patient"}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {surgicalCase?.procedureName ??
                                "Unknown procedure"}
                            </div>

                            <span className="mt-3 inline-flex wf-status wf-status-neutral">
                              {humanizeValue(
                                issue.status,
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
              <WonFlowOperationalPanel
                description="Record consumed quantities and return unused stock."
                title="Case Supply Reconciliation"
                tone="emerald"
              >
                {selectedIssue ===
                undefined ? (
                  <WonFlowEmptyState
                    description="Select a theatre supply issue."
                    title="Select an issue"
                  />
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <div className="font-mono text-sm font-black text-blue-950">
                        {
                          selectedIssue.issueNumber
                        }
                      </div>

                      <div className="mt-1 text-xs text-blue-700">
                        Issued by
                        {" "}
                        {
                          selectedIssue.issuedBy
                        }
                        {" on "}
                        {formatWonFlowDashboardDateTime(
                          selectedIssue.issuedAt,
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-black uppercase tracking-wide text-slate-600">
                        Instrument Trays
                      </div>

                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {selectedIssue.trays.map(
                          (tray) => (
                            <div
                              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                              key={
                                tray.trayId
                              }
                            >
                              <div className="font-black text-slate-900">
                                {
                                  tray.trayName
                                }
                              </div>

                              <div className="mt-1 font-mono text-xs text-slate-500">
                                {
                                  tray.trayCode
                                }
                                {" · "}
                                {
                                  tray.cycleNumber
                                }
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-black uppercase tracking-wide text-slate-600">
                        Inventory Usage
                      </div>

                      <div className="mt-2 space-y-3">
                        {selectedIssue.lines.map(
                          (line) => (
                            <div
                              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_160px_160px]"
                              key={line.id}
                            >
                              <div>
                                <div className="font-black text-slate-900">
                                  {
                                    line.itemName
                                  }
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  Lot
                                  {" "}
                                  {
                                    line.lotNumber
                                  }
                                  {line.serialNumber
                                    ? ` · Serial ${line.serialNumber}`
                                    : ""}
                                </div>

                                <div className="mt-1 text-xs font-bold text-blue-700">
                                  {
                                    line.quantityIssued
                                  }
                                  {" "}
                                  {
                                    line.unitOfMeasure
                                  }
                                  {" issued"}
                                </div>
                              </div>

                              <label>
                                <span className="text-xs font-bold text-slate-600">
                                  Quantity Used
                                </span>

                                <input
                                  className={[
                                    wonFlowInputClassName,
                                    "mt-1.5",
                                  ].join(" ")}
                                  disabled={
                                    selectedIssue.status !==
                                    "issued"
                                  }
                                  max={
                                    line.quantityIssued
                                  }
                                  min={0}
                                  onChange={(
                                    event,
                                  ) => {
                                    setIssueUsage(
                                      (current) => ({
                                        ...current,

                                        [line.id]:
                                          event.target.value,
                                      }),
                                    );
                                  }}
                                  type="number"
                                  value={
                                    issueUsage[
                                      line.id
                                    ] ??
                                    String(
                                      line.quantityUsed,
                                    )
                                  }
                                />
                              </label>

                              <div>
                                <span className="text-xs font-bold text-slate-600">
                                  Quantity Returned
                                </span>

                                <div className="mt-1.5 flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 font-black text-slate-900">
                                  {selectedIssue.status ===
                                  "closed"
                                    ? line.quantityReturned
                                    : Math.max(
                                        0,

                                        line.quantityIssued -
                                          Number(
                                            issueUsage[
                                              line.id
                                            ] ??
                                              "0",
                                          ),
                                      )}
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {selectedIssue.status ===
                    "issued" ? (
                      <>
                        <input
                          className={
                            wonFlowInputClassName
                          }
                          onChange={(
                            event,
                          ) => {
                            setIssueFinalizedBy(
                              event.target.value,
                            );
                          }}
                          placeholder="Reconciliation completed by"
                          value={
                            issueFinalizedBy
                          }
                        />

                        <WonFlowActionButton
                          onClick={
                            finalizeIssue
                          }
                          variant="primary"
                        >
                          Finalize Usage and Returns
                        </WonFlowActionButton>
                      </>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 font-black text-emerald-900">
                          <CheckCircle2
                            size={18}
                          />

                          Issue reconciliation completed
                        </div>

                        <p className="mt-2 text-sm text-emerald-700">
                          Finalized by
                          {" "}
                          {
                            selectedIssue.finalizedBy
                          }
                          {" on "}
                          {formatWonFlowDashboardDateTime(
                            selectedIssue.finalizedAt,
                          )}
                          .
                        </p>
                      </div>
                    )}

                    <Link
                      className="wf-button-secondary"
                      href={`/operations/surgery/cssd/${encodeURIComponent(
                        selectedIssue.id,
                      )}/traceability/print`}
                    >
                      <Printer size={16} />
                      Print Traceability Report
                    </Link>
                  </div>
                )}
              </WonFlowOperationalPanel>
            </div>
          </div>
        </div>
      ) : null}

      {view ===
      "inventory" ? (
        <div className="space-y-6">
          <WonFlowOperationalPanel
            description="Receive surgical consumables and implant batches with full lot and expiry information."
            icon={
              <Boxes size={18} />
            }
            title="Receive Theatre Inventory"
            tone="blue"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <select
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setInventoryBranchId(
                    event.target.value,
                  );
                }}
                value={
                  inventoryBranchId
                }
              >
                <option value="">
                  Select hospital branch
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

              <input
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setInventoryItemCode(
                    event.target.value,
                  );
                }}
                placeholder="Item code"
                value={
                  inventoryItemCode
                }
              />

              <input
                className={[
                  wonFlowInputClassName,
                  "md:col-span-2",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setInventoryItemName(
                    event.target.value,
                  );
                }}
                placeholder="Item or implant name"
                value={
                  inventoryItemName
                }
              />

              <select
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setInventoryItemType(
                    event.target
                      .value as
                      DemoTheatreInventoryItemType,
                  );
                }}
                value={
                  inventoryItemType
                }
              >
                <option value="consumable">
                  Consumable
                </option>

                <option value="implant">
                  Implant
                </option>
              </select>

              <input
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setInventoryManufacturer(
                    event.target.value,
                  );
                }}
                placeholder="Manufacturer"
                value={
                  inventoryManufacturer
                }
              />

              <input
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setInventoryLotNumber(
                    event.target.value,
                  );
                }}
                placeholder="Lot or batch number"
                value={
                  inventoryLotNumber
                }
              />

              <input
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setInventorySerialNumber(
                    event.target.value,
                  );
                }}
                placeholder="Serial number"
                value={
                  inventorySerialNumber
                }
              />

              <label>
                <span className="text-xs font-bold text-slate-600">
                  Expiry Date
                </span>

                <input
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    setInventoryExpiryDate(
                      event.target.value,
                    );
                  }}
                  type="date"
                  value={
                    inventoryExpiryDate
                  }
                />
              </label>

              <NumberField
                label="Received Quantity"
                onChange={
                  setInventoryQuantity
                }
                value={
                  inventoryQuantity
                }
              />

              <NumberField
                label="Reorder Level"
                onChange={
                  setInventoryReorderLevel
                }
                value={
                  inventoryReorderLevel
                }
              />

              <input
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setInventoryUnit(
                    event.target.value,
                  );
                }}
                placeholder="Unit"
                value={
                  inventoryUnit
                }
              />

              <input
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setInventoryReceivedBy(
                    event.target.value,
                  );
                }}
                placeholder="Received by"
                value={
                  inventoryReceivedBy
                }
              />
            </div>

            <div className="mt-4">
              <WonFlowActionButton
                onClick={
                  createInventoryBatch
                }
                variant="primary"
              >
                Receive Inventory Batch
              </WonFlowActionButton>
            </div>
          </WonFlowOperationalPanel>

          <div className="wf-workflow-split">
            <div className="wf-workflow-main">
              <WonFlowOperationalPanel
                description="Monitor surgical stock, implants, lot numbers and expiry alerts."
                title="Theatre Inventory Batches"
                tone="violet"
              >
                <div className="wf-content-scroll">
                  <table className="w-full min-w-[1200px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">
                          Item
                        </th>

                        <th className="px-3 py-3">
                          Type
                        </th>

                        <th className="px-3 py-3">
                          Branch
                        </th>

                        <th className="px-3 py-3">
                          Manufacturer
                        </th>

                        <th className="px-3 py-3">
                          Lot
                        </th>

                        <th className="px-3 py-3">
                          Serial
                        </th>

                        <th className="px-3 py-3">
                          Expiry
                        </th>

                        <th className="px-3 py-3 text-right">
                          Available
                        </th>

                        <th className="px-3 py-3 text-right">
                          Reorder
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleInventory.map(
                        (batch) => {
                          const selected =
                            selectedBatch?.id ===
                            batch.id;

                          const expiryState =
                            classifyDemoTheatreInventoryExpiry(
                              batch,
                            );

                          return (
                            <tr
                              className={[
                                "cursor-pointer border-b border-slate-100 last:border-0",
                                selected
                                  ? "bg-violet-50"
                                  : "hover:bg-slate-50",
                              ].join(" ")}
                              key={batch.id}
                              onClick={() => {
                                setSelectedBatchId(
                                  batch.id,
                                );
                              }}
                            >
                              <td className="px-3 py-3">
                                <div className="font-black text-slate-950">
                                  {
                                    batch.itemName
                                  }
                                </div>

                                <div className="mt-1 font-mono text-xs text-blue-700">
                                  {
                                    batch.itemCode
                                  }
                                </div>
                              </td>

                              <td className="px-3 py-3 text-xs font-bold">
                                {humanizeValue(
                                  batch.itemType,
                                )}
                              </td>

                              <td className="px-3 py-3 text-xs">
                                {branchesById.get(
                                  batch.branchId,
                                )?.name ??
                                  "Unknown branch"}
                              </td>

                              <td className="px-3 py-3 text-xs">
                                {
                                  batch.manufacturer
                                }
                              </td>

                              <td className="px-3 py-3 font-mono text-xs">
                                {
                                  batch.lotNumber
                                }
                              </td>

                              <td className="px-3 py-3 font-mono text-xs">
                                {batch.serialNumber ||
                                  "—"}
                              </td>

                              <td className="px-3 py-3">
                                <div className="text-xs font-bold">
                                  {
                                    batch.expiryDate
                                  }
                                </div>

                                <span
                                  className={[
                                    "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black",
                                    getExpiryClassName(
                                      expiryState,
                                    ),
                                  ].join(" ")}
                                >
                                  {humanizeValue(
                                    expiryState,
                                  )}
                                </span>
                              </td>

                              <td className="px-3 py-3 text-right font-black">
                                {
                                  batch.availableQuantity
                                }
                                {" "}
                                {
                                  batch.unitOfMeasure
                                }
                              </td>

                              <td className="px-3 py-3 text-right">
                                {
                                  batch.reorderLevel
                                }
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </WonFlowOperationalPanel>
            </div>

            <aside className="wf-workflow-aside">
              <WonFlowOperationalPanel
                description="Increase, reduce or write off the selected stock batch."
                title="Stock Adjustment"
                tone="amber"
              >
                {selectedBatch ===
                undefined ? (
                  <WonFlowEmptyState
                    description="Select an inventory batch."
                    title="Select a batch"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <div className="font-black text-amber-950">
                        {
                          selectedBatch.itemName
                        }
                      </div>

                      <div className="mt-1 text-xs text-amber-700">
                        Lot
                        {" "}
                        {
                          selectedBatch.lotNumber
                        }
                        {" · "}
                        {
                          selectedBatch.availableQuantity
                        }
                        {" available"}
                      </div>
                    </div>

                    <select
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setAdjustmentMode(
                          event.target
                            .value as
                            | "increase"
                            | "decrease"
                            | "expiry-write-off",
                        );
                      }}
                      value={
                        adjustmentMode
                      }
                    >
                      <option value="increase">
                        Manual Increase
                      </option>

                      <option value="decrease">
                        Manual Decrease
                      </option>

                      <option value="expiry-write-off">
                        Expiry Write-Off
                      </option>
                    </select>

                    <input
                      className={
                        wonFlowInputClassName
                      }
                      min={1}
                      onChange={(
                        event,
                      ) => {
                        setAdjustmentQuantity(
                          event.target.value,
                        );
                      }}
                      placeholder="Quantity"
                      type="number"
                      value={
                        adjustmentQuantity
                      }
                    />

                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setAdjustmentPerformedBy(
                          event.target.value,
                        );
                      }}
                      placeholder="Performed by"
                      value={
                        adjustmentPerformedBy
                      }
                    />

                    <textarea
                      className={[
                        wonFlowTextareaClassName,
                        "min-h-24",
                      ].join(" ")}
                      onChange={(
                        event,
                      ) => {
                        setAdjustmentNote(
                          event.target.value,
                        );
                      }}
                      placeholder="Adjustment reason"
                      value={
                        adjustmentNote
                      }
                    />

                    <WonFlowActionButton
                      onClick={
                        adjustInventory
                      }
                      variant="primary"
                    >
                      Save Stock Adjustment
                    </WonFlowActionButton>
                  </div>
                )}
              </WonFlowOperationalPanel>
            </aside>
          </div>
        </div>
      ) : null}

      {view ===
      "movements" ? (
        <WonFlowOperationalPanel
          description="Audit theatre inventory receipts, issues, returns, write-offs and manual adjustments."
          icon={
            <RefreshCcw
              size={18}
            />
          }
          title="Theatre Inventory Movement History"
          tone="blue"
        >
          {movements.length ===
          0 ? (
            <WonFlowEmptyState
              description="Inventory movements will appear here."
              title="No movements"
            />
          ) : (
            <div className="wf-content-scroll">
              <table className="w-full min-w-[1150px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">
                      Date
                    </th>

                    <th className="px-3 py-3">
                      Item
                    </th>

                    <th className="px-3 py-3">
                      Lot
                    </th>

                    <th className="px-3 py-3">
                      Movement
                    </th>

                    <th className="px-3 py-3 text-right">
                      Change
                    </th>

                    <th className="px-3 py-3 text-right">
                      Balance
                    </th>

                    <th className="px-3 py-3">
                      Staff
                    </th>

                    <th className="px-3 py-3">
                      Note
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {movements
                    .slice()
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
                    )
                    .map(
                      (movement) => {
                        const batch =
                          inventoryById.get(
                            movement.batchId,
                          );

                        return (
                          <tr
                            className="border-b border-slate-100 last:border-0"
                            key={
                              movement.id
                            }
                          >
                            <td className="px-3 py-3 text-xs">
                              {formatWonFlowDashboardDateTime(
                                movement.createdAt,
                              )}
                            </td>

                            <td className="px-3 py-3 text-xs font-bold">
                              {batch?.itemName ??
                                "Unknown item"}
                            </td>

                            <td className="px-3 py-3 font-mono text-xs">
                              {batch?.lotNumber ??
                                "Unknown lot"}
                            </td>

                            <td className="px-3 py-3">
                              <span className="wf-status wf-status-neutral">
                                {humanizeValue(
                                  movement.movementType,
                                )}
                              </span>
                            </td>

                            <td className={[
                              "px-3 py-3 text-right font-black",
                              movement.quantityChange <
                              0
                                ? "text-rose-700"
                                : "text-emerald-700",
                            ].join(" ")}>
                              {movement.quantityChange >
                              0
                                ? "+"
                                : ""}
                              {
                                movement.quantityChange
                              }
                            </td>

                            <td className="px-3 py-3 text-right font-black">
                              {
                                movement.balanceAfter
                              }
                            </td>

                            <td className="px-3 py-3 text-xs">
                              {
                                movement.performedBy
                              }
                            </td>

                            <td className="px-3 py-3 text-xs text-slate-600">
                              {
                                movement.note
                              }
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

function IndicatorField({
  label,
  value,
  onChange,
  allowNotRequired = false,
}: {
  label: string;

  value:
    DemoCssdIndicatorResult;

  allowNotRequired?: boolean;

  onChange:
    (
      value:
        DemoCssdIndicatorResult,
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
              DemoCssdIndicatorResult,
          );
        }}
        value={value}
      >
        <option value="pending">
          Pending
        </option>

        <option value="pass">
          Pass
        </option>

        <option value="fail">
          Fail
        </option>

        {allowNotRequired ? (
          <option value="not-required">
            Not Required
          </option>
        ) : null}
      </select>
    </label>
  );
}

export function CssdTheatreInventoryWorkspace() {
  const hospitalService =
    useWonFlowHospitalService();

  const directory =
    useWonFlowAsyncData({
      key:
        "cssd-theatre-inventory",

      loader:
        async (
          signal,
        ) => {
          const branches =
            await hospitalService
              .listBranches(
                signal,
              );

          return {
            branches,
          };
        },

      isEmpty:
        (value) =>
          value.branches.length ===
          0,
    });

  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital branch information is unavailable."
      emptyTitle="CSSD unavailable"
      loadingDescription="WonFlow is preparing sterilizers, instrument trays and theatre inventory."
      loadingTitle="Preparing CSSD"
      onRetry={
        directory.reload
      }
      state={directory}
    >
      {(value) => (
        <CssdContent
          branches={
            value.branches
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}