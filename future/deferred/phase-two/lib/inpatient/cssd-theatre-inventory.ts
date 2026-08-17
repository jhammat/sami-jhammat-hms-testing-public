import {
  readDemoSurgicalCases,
} from "./operation-theatre";

import type {
  DemoSurgicalCase,
} from "./operation-theatre";

export type DemoCssdSterilizationMethod =
  | "steam"
  | "hydrogen-peroxide-plasma"
  | "ethylene-oxide";

export type DemoCssdSterilizerStatus =
  | "available"
  | "running"
  | "maintenance";

export type DemoCssdTraySpecialty =
  | "general-surgery"
  | "orthopaedics"
  | "obstetrics"
  | "minor-procedure";

export type DemoCssdTrayStatus =
  | "decontamination"
  | "packed"
  | "sterilizing"
  | "available"
  | "issued"
  | "used"
  | "quarantined"
  | "expired";

export type DemoCssdCycleStatus =
  | "draft"
  | "running"
  | "completed"
  | "failed"
  | "released";

export type DemoCssdIndicatorResult =
  | "pending"
  | "pass"
  | "fail"
  | "not-required";

export type DemoCssdSterilityState =
  | "safe"
  | "expiring"
  | "critical"
  | "expired"
  | "unknown";

export type DemoTheatreInventoryItemType =
  | "consumable"
  | "implant";

export type DemoTheatreInventoryMovementType =
  | "stock-receipt"
  | "manual-increase"
  | "manual-decrease"
  | "case-issue"
  | "case-return"
  | "expiry-write-off";

export type DemoTheatreCaseIssueStatus =
  | "issued"
  | "closed"
  | "cancelled";

export interface DemoCssdDirectoryBranch {
  id: string;
  name: string;
}

export interface DemoCssdSterilizer {
  id: string;

  branchId: string;

  sterilizerCode: string;
  sterilizerName: string;

  method:
    DemoCssdSterilizationMethod;

  status:
    DemoCssdSterilizerStatus;

  currentCycleId: string;

  note: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoCssdInstrumentTray {
  id: string;

  branchId: string;

  trayCode: string;
  trayName: string;

  specialty:
    DemoCssdTraySpecialty;

  instrumentCount: number;

  status:
    DemoCssdTrayStatus;

  currentCycleId: string;
  currentCaseId: string;

  lastCycleId: string;
  lastSterilizedAt: string;
  sterilityExpiryAt: string;

  location: string;
  note: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoCssdSterilizationCycle {
  id: string;

  cycleNumber: string;

  branchId: string;
  sterilizerId: string;

  method:
    DemoCssdSterilizationMethod;

  status:
    DemoCssdCycleStatus;

  trayIds: string[];

  loadDescription: string;

  startedAt: string;
  endedAt: string;

  temperatureCelsius: number;
  pressureBar: number;
  exposureMinutes: number;

  chemicalIndicator:
    DemoCssdIndicatorResult;

  biologicalIndicator:
    DemoCssdIndicatorResult;

  machinePrintoutReference:
    string;

  operator: string;
  completedBy: string;

  releasedBy: string;
  releasedAt: string;

  failureReason: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoTheatreInventoryBatch {
  id: string;

  branchId: string;

  itemCode: string;
  itemName: string;

  itemType:
    DemoTheatreInventoryItemType;

  manufacturer: string;

  lotNumber: string;
  serialNumber: string;

  expiryDate: string;

  availableQuantity: number;
  reorderLevel: number;

  unitOfMeasure: string;

  active: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface DemoTheatreCaseIssueTraySnapshot {
  trayId: string;

  trayCode: string;
  trayName: string;

  cycleId: string;
  cycleNumber: string;

  sterilizedAt: string;
  sterilityExpiryAt: string;
}

export interface DemoTheatreCaseIssueLine {
  id: string;

  batchId: string;

  itemCode: string;
  itemName: string;

  itemType:
    DemoTheatreInventoryItemType;

  manufacturer: string;

  lotNumber: string;
  serialNumber: string;
  expiryDate: string;

  quantityIssued: number;
  quantityUsed: number;
  quantityReturned: number;

  unitOfMeasure: string;
}

export interface DemoTheatreCaseIssue {
  id: string;

  issueNumber: string;

  caseId: string;
  patientId: string;
  branchId: string;

  status:
    DemoTheatreCaseIssueStatus;

  trays:
    DemoTheatreCaseIssueTraySnapshot[];

  lines:
    DemoTheatreCaseIssueLine[];

  issuedBy: string;
  issuedAt: string;

  finalizedBy: string;
  finalizedAt: string;

  note: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoTheatreInventoryMovement {
  id: string;

  branchId: string;
  batchId: string;

  movementType:
    DemoTheatreInventoryMovementType;

  quantityChange: number;
  balanceAfter: number;

  caseId: string;
  issueId: string;

  performedBy: string;
  note: string;

  createdAt: string;
}

export interface DemoCssdTheatreInventorySummary {
  totalTrays: number;
  availableTrays: number;
  decontaminationTrays: number;
  packedTrays: number;
  sterilizingTrays: number;
  quarantinedTrays: number;

  runningCycles: number;
  failedCycles: number;

  lowStockBatches: number;
  expiringBatches: number;

  openCaseIssues: number;
}

const CSSD_STERILIZER_STORAGE_KEY =
  "wonflow-demo-cssd-sterilizers";

const CSSD_TRAY_STORAGE_KEY =
  "wonflow-demo-cssd-instrument-trays";

const CSSD_CYCLE_STORAGE_KEY =
  "wonflow-demo-cssd-sterilization-cycles";

const THEATRE_INVENTORY_STORAGE_KEY =
  "wonflow-demo-theatre-inventory-batches";

const THEATRE_CASE_ISSUE_STORAGE_KEY =
  "wonflow-demo-theatre-case-issues";

const THEATRE_MOVEMENT_STORAGE_KEY =
  "wonflow-demo-theatre-inventory-movements";

function createIdentifier(
  prefix: string,
): string {
  if (
    typeof globalThis.crypto
      ?.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return [
    prefix,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function padNumber(
  value: number,
): string {
  return String(value)
    .padStart(2, "0");
}

function createDateCode(): string {
  const date =
    new Date();

  return [
    date.getFullYear(),

    padNumber(
      date.getMonth() + 1,
    ),

    padNumber(
      date.getDate(),
    ),
  ].join("");
}

function createFutureDate(
  days: number,
): string {
  const date =
    new Date();

  date.setDate(
    date.getDate() + days,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function generateCycleNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `CSSD-${createDateCode()}-${randomPart}`;
}

function generateIssueNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `OTI-${createDateCode()}-${randomPart}`;
}

function readStoredArray<T>(
  key: string,
): T[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      key,
    );

  if (
    storedValue === null
  ) {
    return [];
  }

  try {
    const parsedValue:
      unknown =
      JSON.parse(storedValue);

    return Array.isArray(
      parsedValue,
    )
      ? parsedValue as T[]
      : [];
  } catch {
    return [];
  }
}

function writeStoredArray<T>(
  key: string,

  eventName: string,

  records:
    readonly T[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    key,

    JSON.stringify(
      records.slice(0, 10_000),
    ),
  );

  window.dispatchEvent(
    new Event(eventName),
  );
}

function createDefaultSterilizer(
  branchId: string,

  input: {
    code: string;
    name: string;

    method:
      DemoCssdSterilizationMethod;
  },
): DemoCssdSterilizer {
  const timestamp =
    new Date().toISOString();

  return {
    id:
      `cssd-sterilizer-${branchId}-${input.code.toLocaleLowerCase()}`,

    branchId,

    sterilizerCode:
      input.code,

    sterilizerName:
      input.name,

    method:
      input.method,

    status: "available",

    currentCycleId: "",

    note: "",

    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createDefaultTray(
  branchId: string,

  input: {
    code: string;
    name: string;

    specialty:
      DemoCssdTraySpecialty;

    instrumentCount: number;

    status:
      DemoCssdTrayStatus;
  },
): DemoCssdInstrumentTray {
  const timestamp =
    new Date().toISOString();

  return {
    id:
      `cssd-tray-${branchId}-${input.code.toLocaleLowerCase()}`,

    branchId,

    trayCode:
      input.code,

    trayName:
      input.name,

    specialty:
      input.specialty,

    instrumentCount:
      input.instrumentCount,

    status:
      input.status,

    currentCycleId: "",
    currentCaseId: "",

    lastCycleId: "",
    lastSterilizedAt: "",
    sterilityExpiryAt: "",

    location:
      input.status ===
      "available"
        ? "Sterile Store"
        : "CSSD Processing Area",

    note: "",

    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createDefaultInventoryBatch(
  branchId: string,

  input: {
    code: string;
    name: string;

    type:
      DemoTheatreInventoryItemType;

    manufacturer: string;

    lotNumber: string;
    serialNumber?: string;

    quantity: number;
    reorderLevel: number;

    unit: string;
    expiryDays: number;
  },
): DemoTheatreInventoryBatch {
  const timestamp =
    new Date().toISOString();

  return {
    id:
      `theatre-stock-${branchId}-${input.code.toLocaleLowerCase()}-${input.lotNumber.toLocaleLowerCase()}`,

    branchId,

    itemCode:
      input.code,

    itemName:
      input.name,

    itemType:
      input.type,

    manufacturer:
      input.manufacturer,

    lotNumber:
      input.lotNumber,

    serialNumber:
      input.serialNumber ?? "",

    expiryDate:
      createFutureDate(
        input.expiryDays,
      ),

    availableQuantity:
      input.quantity,

    reorderLevel:
      input.reorderLevel,

    unitOfMeasure:
      input.unit,

    active: true,

    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function readDemoCssdSterilizers():
  DemoCssdSterilizer[] {
  return readStoredArray<
    DemoCssdSterilizer
  >(
    CSSD_STERILIZER_STORAGE_KEY,
  );
}

export function writeDemoCssdSterilizers(
  sterilizers:
    readonly DemoCssdSterilizer[],
): void {
  writeStoredArray(
    CSSD_STERILIZER_STORAGE_KEY,

    "wonflow:demo-cssd-sterilizers-changed",

    sterilizers,
  );
}

export function readDemoCssdInstrumentTrays():
  DemoCssdInstrumentTray[] {
  return readStoredArray<
    DemoCssdInstrumentTray
  >(
    CSSD_TRAY_STORAGE_KEY,
  );
}

export function writeDemoCssdInstrumentTrays(
  trays:
    readonly DemoCssdInstrumentTray[],
): void {
  writeStoredArray(
    CSSD_TRAY_STORAGE_KEY,

    "wonflow:demo-cssd-trays-changed",

    trays,
  );
}

export function readDemoCssdSterilizationCycles():
  DemoCssdSterilizationCycle[] {
  return readStoredArray<
    DemoCssdSterilizationCycle
  >(
    CSSD_CYCLE_STORAGE_KEY,
  );
}

export function writeDemoCssdSterilizationCycles(
  cycles:
    readonly DemoCssdSterilizationCycle[],
): void {
  writeStoredArray(
    CSSD_CYCLE_STORAGE_KEY,

    "wonflow:demo-cssd-cycles-changed",

    cycles,
  );
}

export function readDemoTheatreInventoryBatches():
  DemoTheatreInventoryBatch[] {
  return readStoredArray<
    DemoTheatreInventoryBatch
  >(
    THEATRE_INVENTORY_STORAGE_KEY,
  );
}

export function writeDemoTheatreInventoryBatches(
  batches:
    readonly DemoTheatreInventoryBatch[],
): void {
  writeStoredArray(
    THEATRE_INVENTORY_STORAGE_KEY,

    "wonflow:demo-theatre-inventory-changed",

    batches,
  );
}

export function readDemoTheatreCaseIssues():
  DemoTheatreCaseIssue[] {
  return readStoredArray<
    DemoTheatreCaseIssue
  >(
    THEATRE_CASE_ISSUE_STORAGE_KEY,
  );
}

export function writeDemoTheatreCaseIssues(
  issues:
    readonly DemoTheatreCaseIssue[],
): void {
  writeStoredArray(
    THEATRE_CASE_ISSUE_STORAGE_KEY,

    "wonflow:demo-theatre-case-issues-changed",

    issues,
  );
}

export function readDemoTheatreInventoryMovements():
  DemoTheatreInventoryMovement[] {
  return readStoredArray<
    DemoTheatreInventoryMovement
  >(
    THEATRE_MOVEMENT_STORAGE_KEY,
  );
}

export function writeDemoTheatreInventoryMovements(
  movements:
    readonly DemoTheatreInventoryMovement[],
): void {
  writeStoredArray(
    THEATRE_MOVEMENT_STORAGE_KEY,

    "wonflow:demo-theatre-inventory-movements-changed",

    movements,
  );
}

export function initializeDemoCssdTheatreInventory(
  branches:
    readonly DemoCssdDirectoryBranch[],
): void {
  const sterilizers = [
    ...readDemoCssdSterilizers(),
  ];

  const trays = [
    ...readDemoCssdInstrumentTrays(),
  ];

  const batches = [
    ...readDemoTheatreInventoryBatches(),
  ];

  let sterilizersChanged = false;
  let traysChanged = false;
  let batchesChanged = false;

  branches.forEach(
    (
      branch,
      branchIndex,
    ) => {
      const defaultSterilizers = [
        createDefaultSterilizer(
          branch.id,

          {
            code: "ST-1",

            name:
              "Steam Sterilizer 1",

            method: "steam",
          },
        ),

        createDefaultSterilizer(
          branch.id,

          {
            code: "PL-1",

            name:
              "Low Temperature Plasma Sterilizer",

            method:
              "hydrogen-peroxide-plasma",
          },
        ),
      ];

      defaultSterilizers.forEach(
        (sterilizer) => {
          if (
            !sterilizers.some(
              (record) =>
                record.id ===
                sterilizer.id,
            )
          ) {
            sterilizers.push(
              sterilizer,
            );

            sterilizersChanged =
              true;
          }
        },
      );

      const defaultTrays = [
        createDefaultTray(
          branch.id,

          {
            code: "GS-01",

            name:
              "General Surgery Major Set",

            specialty:
              "general-surgery",

            instrumentCount: 48,

            status: "packed",
          },
        ),

        createDefaultTray(
          branch.id,

          {
            code: "MP-01",

            name:
              "Minor Procedure Set",

            specialty:
              "minor-procedure",

            instrumentCount: 22,

            status:
              "available",
          },
        ),

        createDefaultTray(
          branch.id,

          {
            code: "OR-01",

            name:
              "Orthopaedic Basic Set",

            specialty:
              "orthopaedics",

            instrumentCount: 61,

            status:
              "decontamination",
          },
        ),

        createDefaultTray(
          branch.id,

          {
            code: "OB-01",

            name:
              "Obstetric Caesarean Set",

            specialty:
              "obstetrics",

            instrumentCount: 42,

            status:
              "available",
          },
        ),
      ];

      defaultTrays.forEach(
        (tray) => {
          if (
            !trays.some(
              (record) =>
                record.id ===
                tray.id,
            )
          ) {
            trays.push(tray);
            traysChanged = true;
          }
        },
      );

      const lotPrefix =
        `B${branchIndex + 1}`;

      const defaultBatches = [
        createDefaultInventoryBatch(
          branch.id,

          {
            code: "SUT-20",

            name:
              "Absorbable Suture 2-0",

            type: "consumable",

            manufacturer:
              "WonFlow Demo Medical",

            lotNumber:
              `${lotPrefix}-SUT-001`,

            quantity: 60,
            reorderLevel: 15,

            unit: "pack",

            expiryDays: 540,
          },
        ),

        createDefaultInventoryBatch(
          branch.id,

          {
            code: "STP-35",

            name:
              "Skin Stapler 35W",

            type: "consumable",

            manufacturer:
              "WonFlow Demo Medical",

            lotNumber:
              `${lotPrefix}-STP-001`,

            quantity: 20,
            reorderLevel: 5,

            unit: "unit",

            expiryDays: 360,
          },
        ),

        createDefaultInventoryBatch(
          branch.id,

          {
            code: "MESH-10",

            name:
              "Surgical Hernia Mesh 10 × 15 cm",

            type: "implant",

            manufacturer:
              "WonFlow Demo Implants",

            lotNumber:
              `${lotPrefix}-MSH-001`,

            serialNumber:
              `${lotPrefix}-MSH-SN-001`,

            quantity: 4,
            reorderLevel: 2,

            unit: "implant",

            expiryDays: 720,
          },
        ),

        createDefaultInventoryBatch(
          branch.id,

          {
            code: "BSC-45",

            name:
              "Orthopaedic Bone Screw 4.5 mm",

            type: "implant",

            manufacturer:
              "WonFlow Demo Orthopaedics",

            lotNumber:
              `${lotPrefix}-BSC-001`,

            serialNumber:
              `${lotPrefix}-BSC-SN-001`,

            quantity: 12,
            reorderLevel: 4,

            unit: "implant",

            expiryDays: 900,
          },
        ),
      ];

      defaultBatches.forEach(
        (batch) => {
          if (
            !batches.some(
              (record) =>
                record.id ===
                batch.id,
            )
          ) {
            batches.push(batch);
            batchesChanged = true;
          }
        },
      );
    },
  );

  if (sterilizersChanged) {
    writeDemoCssdSterilizers(
      sterilizers,
    );
  }

  if (traysChanged) {
    writeDemoCssdInstrumentTrays(
      trays,
    );
  }

  if (batchesChanged) {
    writeDemoTheatreInventoryBatches(
      batches,
    );
  }
}

export function classifyDemoCssdSterility(
  tray:
    DemoCssdInstrumentTray,
): DemoCssdSterilityState {
  if (
    tray.sterilityExpiryAt ===
    ""
  ) {
    return tray.status ===
      "available"
      ? "unknown"
      : "unknown";
  }

  const expiryTime =
    new Date(
      tray.sterilityExpiryAt,
    ).getTime();

  if (
    Number.isNaN(expiryTime)
  ) {
    return "unknown";
  }

  const daysRemaining =
    Math.ceil(
      (
        expiryTime -
        Date.now()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        ),
    );

  if (
    daysRemaining < 0
  ) {
    return "expired";
  }

  if (
    daysRemaining <= 7
  ) {
    return "critical";
  }

  if (
    daysRemaining <= 30
  ) {
    return "expiring";
  }

  return "safe";
}

export function classifyDemoTheatreInventoryExpiry(
  batch:
    DemoTheatreInventoryBatch,
): DemoCssdSterilityState {
  if (
    batch.expiryDate === ""
  ) {
    return "unknown";
  }

  const expiryTime =
    new Date(
      `${batch.expiryDate}T23:59:59`,
    ).getTime();

  if (
    Number.isNaN(expiryTime)
  ) {
    return "unknown";
  }

  const daysRemaining =
    Math.ceil(
      (
        expiryTime -
        Date.now()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        ),
    );

  if (
    daysRemaining < 0
  ) {
    return "expired";
  }

  if (
    daysRemaining <= 30
  ) {
    return "critical";
  }

  if (
    daysRemaining <= 90
  ) {
    return "expiring";
  }

  return "safe";
}

export function updateDemoCssdSterilizerStatus(
  input: {
    sterilizerId: string;

    status:
      Exclude<
        DemoCssdSterilizerStatus,
        "running"
      >;

    note: string;
  },
): DemoCssdSterilizer |
  undefined {
  const sterilizers =
    readDemoCssdSterilizers();

  const sterilizer =
    sterilizers.find(
      (record) =>
        record.id ===
        input.sterilizerId,
    );

  if (
    sterilizer === undefined ||
    sterilizer.status ===
      "running" ||
    sterilizer.currentCycleId !==
      ""
  ) {
    return undefined;
  }

  const updated:
    DemoCssdSterilizer = {
    ...sterilizer,

    status:
      input.status,

    note:
      input.note.trim(),

    updatedAt:
      new Date().toISOString(),
  };

  writeDemoCssdSterilizers(
    sterilizers.map(
      (record) =>
        record.id ===
        sterilizer.id
          ? updated
          : record,
    ),
  );

  return updated;
}

export function sendDemoCssdTrayForReprocessing(
  input: {
    trayId: string;
    note: string;
  },
): DemoCssdInstrumentTray |
  undefined {
  const trays =
    readDemoCssdInstrumentTrays();

  const tray =
    trays.find(
      (record) =>
        record.id ===
        input.trayId,
    );

  if (
    tray === undefined ||
    tray.currentCaseId !==
      "" ||
    tray.status ===
      "issued" ||
    tray.status ===
      "sterilizing"
  ) {
    return undefined;
  }

  const updated:
    DemoCssdInstrumentTray = {
    ...tray,

    status:
      "decontamination",

    currentCycleId: "",
    currentCaseId: "",

    location:
      "CSSD Decontamination Area",

    note:
      input.note.trim(),

    updatedAt:
      new Date().toISOString(),
  };

  writeDemoCssdInstrumentTrays(
    trays.map(
      (record) =>
        record.id ===
        tray.id
          ? updated
          : record,
    ),
  );

  return updated;
}

export function markDemoCssdTrayPacked(
  input: {
    trayId: string;
    completedBy: string;
  },
): DemoCssdInstrumentTray |
  undefined {
  const completedBy =
    input.completedBy.trim();

  if (
    completedBy.length < 2
  ) {
    return undefined;
  }

  const trays =
    readDemoCssdInstrumentTrays();

  const tray =
    trays.find(
      (record) =>
        record.id ===
        input.trayId,
    );

  if (
    tray === undefined ||
    tray.status !==
      "decontamination"
  ) {
    return undefined;
  }

  const updated:
    DemoCssdInstrumentTray = {
    ...tray,

    status: "packed",

    location:
      "CSSD Packing Area",

    note:
      `Inspected and packed by ${completedBy}.`,

    updatedAt:
      new Date().toISOString(),
  };

  writeDemoCssdInstrumentTrays(
    trays.map(
      (record) =>
        record.id ===
        tray.id
          ? updated
          : record,
    ),
  );

  return updated;
}

export function validateDemoCssdCycleDraft(
  input: {
    branchId: string;
    sterilizerId: string;

    trayIds:
      readonly string[];

    loadDescription: string;
    operator: string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    input.branchId.trim() ===
    ""
  ) {
    errors.push(
      "Select the hospital branch.",
    );
  }

  const sterilizer =
    readDemoCssdSterilizers()
      .find(
        (record) =>
          record.id ===
          input.sterilizerId,
      );

  if (
    sterilizer === undefined
  ) {
    errors.push(
      "Select a CSSD sterilizer.",
    );
  } else {
    if (
      sterilizer.branchId !==
      input.branchId
    ) {
      errors.push(
        "The selected sterilizer belongs to another branch.",
      );
    }

    if (
      sterilizer.status !==
      "available"
    ) {
      errors.push(
        "The selected sterilizer is not available.",
      );
    }
  }

  const uniqueTrayIds = [
    ...new Set(
      input.trayIds,
    ),
  ];

  if (
    uniqueTrayIds.length ===
    0
  ) {
    errors.push(
      "Select at least one packed instrument tray.",
    );
  }

  const trays =
    readDemoCssdInstrumentTrays();

  uniqueTrayIds.forEach(
    (trayId) => {
      const tray =
        trays.find(
          (record) =>
            record.id ===
            trayId,
        );

      if (
        tray === undefined
      ) {
        errors.push(
          "A selected instrument tray could not be found.",
        );

        return;
      }

      if (
        tray.branchId !==
        input.branchId
      ) {
        errors.push(
          `${tray.trayCode} belongs to another branch.`,
        );
      }

      if (
        tray.status !==
        "packed"
      ) {
        errors.push(
          `${tray.trayCode} is not packed and ready for sterilization.`,
        );
      }
    },
  );

  if (
    input.loadDescription
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter a sterilization-load description.",
    );
  }

  if (
    input.operator
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the CSSD operator preparing the cycle.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function createDemoCssdCycleDraft(
  input: {
    branchId: string;
    sterilizerId: string;

    trayIds:
      readonly string[];

    loadDescription: string;
    operator: string;
  },
): DemoCssdSterilizationCycle |
  undefined {
  const errors =
    validateDemoCssdCycleDraft(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const sterilizer =
    readDemoCssdSterilizers()
      .find(
        (record) =>
          record.id ===
          input.sterilizerId,
      );

  if (
    sterilizer === undefined
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const cycle:
    DemoCssdSterilizationCycle = {
    id:
      createIdentifier(
        "cssd-cycle",
      ),

    cycleNumber:
      generateCycleNumber(),

    branchId:
      input.branchId,

    sterilizerId:
      sterilizer.id,

    method:
      sterilizer.method,

    status: "draft",

    trayIds: [
      ...new Set(
        input.trayIds,
      ),
    ],

    loadDescription:
      input.loadDescription
        .trim(),

    startedAt: "",
    endedAt: "",

    temperatureCelsius: 0,
    pressureBar: 0,
    exposureMinutes: 0,

    chemicalIndicator:
      "pending",

    biologicalIndicator:
      "pending",

    machinePrintoutReference:
      "",

    operator:
      input.operator.trim(),

    completedBy: "",

    releasedBy: "",
    releasedAt: "",

    failureReason: "",

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoCssdSterilizationCycles([
    cycle,

    ...readDemoCssdSterilizationCycles(),
  ]);

  return cycle;
}

export function startDemoCssdCycle(
  input: {
    cycleId: string;
    startedBy: string;
  },
): DemoCssdSterilizationCycle |
  undefined {
  const startedBy =
    input.startedBy.trim();

  if (
    startedBy.length < 2
  ) {
    return undefined;
  }

  const cycles =
    readDemoCssdSterilizationCycles();

  const cycle =
    cycles.find(
      (record) =>
        record.id ===
        input.cycleId,
    );

  if (
    cycle === undefined ||
    cycle.status !== "draft"
  ) {
    return undefined;
  }

  const sterilizers =
    readDemoCssdSterilizers();

  const sterilizer =
    sterilizers.find(
      (record) =>
        record.id ===
        cycle.sterilizerId,
    );

  if (
    sterilizer === undefined ||
    sterilizer.status !==
      "available"
  ) {
    return undefined;
  }

  const trays =
    readDemoCssdInstrumentTrays();

  const selectedTrays =
    cycle.trayIds.map(
      (trayId) =>
        trays.find(
          (tray) =>
            tray.id === trayId,
        ),
    );

  if (
    selectedTrays.some(
      (tray) =>
        tray === undefined ||
        tray.status !==
          "packed",
    )
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const runningCycle:
    DemoCssdSterilizationCycle = {
    ...cycle,

    status: "running",

    operator: startedBy,

    startedAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoCssdSterilizers(
    sterilizers.map(
      (record) =>
        record.id ===
        sterilizer.id
          ? {
              ...record,

              status:
                "running",

              currentCycleId:
                cycle.id,

              note:
                `${cycle.cycleNumber} in progress.`,

              updatedAt:
                timestamp,
            }
          : record,
    ),
  );

  writeDemoCssdInstrumentTrays(
    trays.map(
      (tray) =>
        cycle.trayIds.includes(
          tray.id,
        )
          ? {
              ...tray,

              status:
                "sterilizing",

              currentCycleId:
                cycle.id,

              location:
                sterilizer.sterilizerName,

              updatedAt:
                timestamp,
            }
          : tray,
    ),
  );

  writeDemoCssdSterilizationCycles(
    cycles.map(
      (record) =>
        record.id ===
        cycle.id
          ? runningCycle
          : record,
    ),
  );

  return runningCycle;
}

export function validateDemoCssdCycleCompletion(
  input: {
    temperatureCelsius:
      number;

    pressureBar: number;
    exposureMinutes: number;

    chemicalIndicator:
      DemoCssdIndicatorResult;

    biologicalIndicator:
      DemoCssdIndicatorResult;

    machinePrintoutReference:
      string;

    completedBy: string;
    failureReason: string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    !Number.isFinite(
      input.temperatureCelsius,
    ) ||
    input.temperatureCelsius <
      40 ||
    input.temperatureCelsius >
      150
  ) {
    errors.push(
      "Enter a valid sterilization temperature.",
    );
  }

  if (
    !Number.isFinite(
      input.pressureBar,
    ) ||
    input.pressureBar < 0 ||
    input.pressureBar > 6
  ) {
    errors.push(
      "Pressure must be between 0 and 6 bar.",
    );
  }

  if (
    !Number.isFinite(
      input.exposureMinutes,
    ) ||
    input.exposureMinutes < 1 ||
    input.exposureMinutes > 720
  ) {
    errors.push(
      "Exposure time must be between 1 and 720 minutes.",
    );
  }

  if (
    input.chemicalIndicator ===
      "pending" ||
    input.chemicalIndicator ===
      "not-required"
  ) {
    errors.push(
      "Record a pass or fail chemical-indicator result.",
    );
  }

  if (
    input.biologicalIndicator ===
    "pending"
  ) {
    errors.push(
      "Record the biological-indicator result or mark it not required.",
    );
  }

  if (
    input.machinePrintoutReference
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the sterilizer printout or cycle reference.",
    );
  }

  if (
    input.completedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the CSSD staff member completing the cycle.",
    );
  }

  const failed =
    input.chemicalIndicator ===
      "fail" ||
    input.biologicalIndicator ===
      "fail";

  if (
    failed &&
    input.failureReason
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the reason for the failed sterilization cycle.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function completeDemoCssdCycle(
  input: {
    cycleId: string;

    temperatureCelsius:
      number;

    pressureBar: number;
    exposureMinutes: number;

    chemicalIndicator:
      DemoCssdIndicatorResult;

    biologicalIndicator:
      DemoCssdIndicatorResult;

    machinePrintoutReference:
      string;

    completedBy: string;
    failureReason: string;
  },
): DemoCssdSterilizationCycle |
  undefined {
  const errors =
    validateDemoCssdCycleCompletion(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const cycles =
    readDemoCssdSterilizationCycles();

  const cycle =
    cycles.find(
      (record) =>
        record.id ===
        input.cycleId,
    );

  if (
    cycle === undefined ||
    cycle.status !==
      "running"
  ) {
    return undefined;
  }

  const failed =
    input.chemicalIndicator ===
      "fail" ||
    input.biologicalIndicator ===
      "fail";

  const timestamp =
    new Date().toISOString();

  const completedCycle:
    DemoCssdSterilizationCycle = {
    ...cycle,

    status:
      failed
        ? "failed"
        : "completed",

    endedAt: timestamp,

    temperatureCelsius:
      input.temperatureCelsius,

    pressureBar:
      input.pressureBar,

    exposureMinutes:
      Math.round(
        input.exposureMinutes,
      ),

    chemicalIndicator:
      input.chemicalIndicator,

    biologicalIndicator:
      input.biologicalIndicator,

    machinePrintoutReference:
      input
        .machinePrintoutReference
        .trim(),

    completedBy:
      input.completedBy.trim(),

    failureReason:
      input.failureReason.trim(),

    updatedAt:
      timestamp,
  };

  writeDemoCssdSterilizationCycles(
    cycles.map(
      (record) =>
        record.id ===
        cycle.id
          ? completedCycle
          : record,
    ),
  );

  writeDemoCssdSterilizers(
    readDemoCssdSterilizers()
      .map(
        (sterilizer) =>
          sterilizer.id ===
          cycle.sterilizerId
            ? {
                ...sterilizer,

                status:
                  "available",

                currentCycleId:
                  "",

                note:
                  failed
                    ? `${cycle.cycleNumber} failed.`
                    : `${cycle.cycleNumber} completed awaiting release.`,

                updatedAt:
                  timestamp,
              }
            : sterilizer,
      ),
  );

  if (failed) {
    writeDemoCssdInstrumentTrays(
      readDemoCssdInstrumentTrays()
        .map(
          (tray) =>
            cycle.trayIds.includes(
              tray.id,
            )
              ? {
                  ...tray,

                  status:
                    "quarantined",

                  currentCycleId:
                    "",

                  location:
                    "CSSD Quarantine Area",

                  note:
                    `Quarantined after failed cycle ${cycle.cycleNumber}.`,

                  updatedAt:
                    timestamp,
                }
              : tray,
        ),
    );
  }

  return completedCycle;
}

export function releaseDemoCssdCycle(
  input: {
    cycleId: string;

    releasedBy: string;
    sterilityDays: number;
  },
): DemoCssdSterilizationCycle |
  undefined {
  const releasedBy =
    input.releasedBy.trim();

  if (
    releasedBy.length < 2 ||
    !Number.isFinite(
      input.sterilityDays,
    ) ||
    input.sterilityDays < 1 ||
    input.sterilityDays > 365
  ) {
    return undefined;
  }

  const cycles =
    readDemoCssdSterilizationCycles();

  const cycle =
    cycles.find(
      (record) =>
        record.id ===
        input.cycleId,
    );

  if (
    cycle === undefined ||
    cycle.status !==
      "completed" ||
    cycle.chemicalIndicator !==
      "pass" ||
    (
      cycle.biologicalIndicator !==
        "pass" &&
      cycle.biologicalIndicator !==
        "not-required"
    )
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const expiry =
    new Date();

  expiry.setDate(
    expiry.getDate() +
      Math.round(
        input.sterilityDays,
      ),
  );

  const releasedCycle:
    DemoCssdSterilizationCycle = {
    ...cycle,

    status: "released",

    releasedBy,

    releasedAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  writeDemoCssdSterilizationCycles(
    cycles.map(
      (record) =>
        record.id ===
        cycle.id
          ? releasedCycle
          : record,
    ),
  );

  writeDemoCssdInstrumentTrays(
    readDemoCssdInstrumentTrays()
      .map(
        (tray) =>
          cycle.trayIds.includes(
            tray.id,
          )
            ? {
                ...tray,

                status:
                  "available",

                currentCycleId:
                  "",

                lastCycleId:
                  cycle.id,

                lastSterilizedAt:
                  cycle.endedAt,

                sterilityExpiryAt:
                  expiry.toISOString(),

                location:
                  "Sterile Store",

                note:
                  `Released from ${cycle.cycleNumber} by ${releasedBy}.`,

                updatedAt:
                  timestamp,
              }
            : tray,
      ),
  );

  return releasedCycle;
}

export function validateDemoTheatreInventoryBatch(
  input: {
    branchId: string;

    itemCode: string;
    itemName: string;

    itemType:
      DemoTheatreInventoryItemType;

    manufacturer: string;

    lotNumber: string;
    serialNumber: string;

    expiryDate: string;

    availableQuantity: number;
    reorderLevel: number;

    unitOfMeasure: string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    input.branchId.trim() ===
    ""
  ) {
    errors.push(
      "Select the hospital branch.",
    );
  }

  if (
    input.itemCode
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the inventory item code.",
    );
  }

  if (
    input.itemName
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the inventory item name.",
    );
  }

  if (
    input.manufacturer
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the manufacturer.",
    );
  }

  if (
    input.lotNumber
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the lot or batch number.",
    );
  }

  if (
    input.expiryDate ===
    "" ||
    Number.isNaN(
      new Date(
        `${input.expiryDate}T23:59:59`,
      ).getTime(),
    )
  ) {
    errors.push(
      "Enter a valid expiry date.",
    );
  }

  if (
    !Number.isFinite(
      input.availableQuantity,
    ) ||
    input.availableQuantity < 0
  ) {
    errors.push(
      "Available quantity cannot be negative.",
    );
  }

  if (
    !Number.isFinite(
      input.reorderLevel,
    ) ||
    input.reorderLevel < 0
  ) {
    errors.push(
      "Reorder level cannot be negative.",
    );
  }

  if (
    input.unitOfMeasure
      .trim()
      .length < 1
  ) {
    errors.push(
      "Enter the unit of measure.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function createDemoTheatreInventoryBatch(
  input: {
    branchId: string;

    itemCode: string;
    itemName: string;

    itemType:
      DemoTheatreInventoryItemType;

    manufacturer: string;

    lotNumber: string;
    serialNumber: string;

    expiryDate: string;

    availableQuantity: number;
    reorderLevel: number;

    unitOfMeasure: string;

    receivedBy: string;
  },
): DemoTheatreInventoryBatch |
  undefined {
  const errors =
    validateDemoTheatreInventoryBatch(
      input,
    );

  if (
    input.receivedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the staff member receiving the stock.",
    );
  }

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const batches =
    readDemoTheatreInventoryBatches();

  const duplicate =
    batches.some(
      (batch) =>
        batch.branchId ===
          input.branchId &&
        batch.itemCode
          .trim()
          .toLocaleLowerCase() ===
          input.itemCode
            .trim()
            .toLocaleLowerCase() &&
        batch.lotNumber
          .trim()
          .toLocaleLowerCase() ===
          input.lotNumber
            .trim()
            .toLocaleLowerCase() &&
        batch.serialNumber
          .trim()
          .toLocaleLowerCase() ===
          input.serialNumber
            .trim()
            .toLocaleLowerCase(),
    );

  if (duplicate) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const batch:
    DemoTheatreInventoryBatch = {
    id:
      createIdentifier(
        "theatre-inventory",
      ),

    branchId:
      input.branchId,

    itemCode:
      input.itemCode.trim(),

    itemName:
      input.itemName.trim(),

    itemType:
      input.itemType,

    manufacturer:
      input.manufacturer
        .trim(),

    lotNumber:
      input.lotNumber.trim(),

    serialNumber:
      input.serialNumber
        .trim(),

    expiryDate:
      input.expiryDate,

    availableQuantity:
      Math.round(
        input.availableQuantity,
      ),

    reorderLevel:
      Math.round(
        input.reorderLevel,
      ),

    unitOfMeasure:
      input.unitOfMeasure
        .trim(),

    active: true,

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoTheatreInventoryBatches([
    batch,
    ...batches,
  ]);

  const movement:
    DemoTheatreInventoryMovement = {
    id:
      createIdentifier(
        "theatre-movement",
      ),

    branchId:
      batch.branchId,

    batchId:
      batch.id,

    movementType:
      "stock-receipt",

    quantityChange:
      batch.availableQuantity,

    balanceAfter:
      batch.availableQuantity,

    caseId: "",
    issueId: "",

    performedBy:
      input.receivedBy.trim(),

    note:
      `Initial receipt for ${batch.itemName}.`,

    createdAt: timestamp,
  };

  writeDemoTheatreInventoryMovements([
    movement,

    ...readDemoTheatreInventoryMovements(),
  ]);

  return batch;
}

export function adjustDemoTheatreInventoryBatch(
  input: {
    batchId: string;

    mode:
      | "increase"
      | "decrease"
      | "expiry-write-off";

    quantity: number;

    performedBy: string;
    note: string;
  },
): DemoTheatreInventoryBatch |
  undefined {
  if (
    !Number.isFinite(
      input.quantity,
    ) ||
    input.quantity <= 0 ||
    input.performedBy
      .trim()
      .length < 2 ||
    input.note.trim().length <
      3
  ) {
    return undefined;
  }

  const batches =
    readDemoTheatreInventoryBatches();

  const batch =
    batches.find(
      (record) =>
        record.id ===
        input.batchId,
    );

  if (
    batch === undefined
  ) {
    return undefined;
  }

  const roundedQuantity =
    Math.round(
      input.quantity,
    );

  const quantityChange =
    input.mode ===
    "increase"
      ? roundedQuantity
      : -roundedQuantity;

  const nextBalance =
    batch.availableQuantity +
    quantityChange;

  if (
    nextBalance < 0
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updated:
    DemoTheatreInventoryBatch = {
    ...batch,

    availableQuantity:
      nextBalance,

    active:
      nextBalance > 0,

    updatedAt:
      timestamp,
  };

  writeDemoTheatreInventoryBatches(
    batches.map(
      (record) =>
        record.id ===
        batch.id
          ? updated
          : record,
    ),
  );

  const movementType:
    DemoTheatreInventoryMovementType =
    input.mode === "increase"
      ? "manual-increase"
      : input.mode ===
          "expiry-write-off"
        ? "expiry-write-off"
        : "manual-decrease";

  const movement:
    DemoTheatreInventoryMovement = {
    id:
      createIdentifier(
        "theatre-movement",
      ),

    branchId:
      batch.branchId,

    batchId:
      batch.id,

    movementType,

    quantityChange,

    balanceAfter:
      nextBalance,

    caseId: "",
    issueId: "",

    performedBy:
      input.performedBy.trim(),

    note:
      input.note.trim(),

    createdAt:
      timestamp,
  };

  writeDemoTheatreInventoryMovements([
    movement,

    ...readDemoTheatreInventoryMovements(),
  ]);

  return updated;
}

function getEligibleSurgicalCase(
  caseId: string,
): DemoSurgicalCase |
  undefined {
  return readDemoSurgicalCases()
    .find(
      (surgicalCase) =>
        surgicalCase.id ===
          caseId &&
        (
          surgicalCase.status ===
            "scheduled" ||
          surgicalCase.status ===
            "pre-op-ready" ||
          surgicalCase.status ===
            "in-surgery"
        ),
    );
}

export function validateDemoTheatreCaseIssue(
  input: {
    caseId: string;

    trayIds:
      readonly string[];

    lines:
      readonly {
        batchId: string;
        quantity: number;
      }[];

    issuedBy: string;
    note: string;
  },
): string[] {
  const errors:
    string[] = [];

  const surgicalCase =
    getEligibleSurgicalCase(
      input.caseId,
    );

  if (
    surgicalCase === undefined
  ) {
    errors.push(
      "Select an active surgical case.",
    );
  }

  if (
    input.issuedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the staff member issuing the supplies.",
    );
  }

  const existingOpenIssue =
    readDemoTheatreCaseIssues()
      .find(
        (issue) =>
          issue.caseId ===
            input.caseId &&
          issue.status ===
            "issued",
      );

  if (
    existingOpenIssue !==
    undefined
  ) {
    errors.push(
      `The surgical case already has open issue ${existingOpenIssue.issueNumber}.`,
    );
  }

  const uniqueTrayIds = [
    ...new Set(
      input.trayIds,
    ),
  ];

  if (
    uniqueTrayIds.length ===
      0 &&
    input.lines.length === 0
  ) {
    errors.push(
      "Select at least one instrument tray or inventory item.",
    );
  }

  const trays =
    readDemoCssdInstrumentTrays();

  uniqueTrayIds.forEach(
    (trayId) => {
      const tray =
        trays.find(
          (record) =>
            record.id ===
            trayId,
        );

      if (
        tray === undefined
      ) {
        errors.push(
          "A selected instrument tray could not be found.",
        );

        return;
      }

      if (
        surgicalCase !==
          undefined &&
        tray.branchId !==
          surgicalCase.branchId
      ) {
        errors.push(
          `${tray.trayCode} belongs to another hospital branch.`,
        );
      }

      if (
        tray.status !==
        "available"
      ) {
        errors.push(
          `${tray.trayCode} is not available for issue.`,
        );
      }

      if (
        tray.currentCaseId !==
        ""
      ) {
        errors.push(
          `${tray.trayCode} is already assigned to another surgical case.`,
        );
      }

      const sterilityState =
        classifyDemoCssdSterility(
          tray,
        );

      if (
        sterilityState ===
          "expired"
      ) {
        errors.push(
          `${tray.trayCode} has expired sterility.`,
        );
      }
    },
  );

  const batches =
    readDemoTheatreInventoryBatches();

  const quantitiesByBatch =
    new Map<string, number>();

  input.lines.forEach(
    (line) => {
      quantitiesByBatch.set(
        line.batchId,

        (
          quantitiesByBatch.get(
            line.batchId,
          ) ?? 0
        ) + line.quantity,
      );
    },
  );

  quantitiesByBatch.forEach(
    (
      quantity,
      batchId,
    ) => {
      const batch =
        batches.find(
          (record) =>
            record.id ===
            batchId,
        );

      if (
        batch === undefined
      ) {
        errors.push(
          "A selected inventory batch could not be found.",
        );

        return;
      }

      if (
        surgicalCase !==
          undefined &&
        batch.branchId !==
          surgicalCase.branchId
      ) {
        errors.push(
          `${batch.itemName} belongs to another hospital branch.`,
        );
      }

      if (
        !Number.isFinite(
          quantity,
        ) ||
        quantity <= 0
      ) {
        errors.push(
          `${batch.itemName} requires a valid issue quantity.`,
        );
      }

      if (
        quantity >
        batch.availableQuantity
      ) {
        errors.push(
          `${batch.itemName} has insufficient available stock.`,
        );
      }

      if (
        classifyDemoTheatreInventoryExpiry(
          batch,
        ) === "expired"
      ) {
        errors.push(
          `${batch.itemName} lot ${batch.lotNumber} is expired.`,
        );
      }
    },
  );

  return [
    ...new Set(errors),
  ];
}

export function issueDemoTheatreSuppliesToCase(
  input: {
    caseId: string;

    trayIds:
      readonly string[];

    lines:
      readonly {
        batchId: string;
        quantity: number;
      }[];

    issuedBy: string;
    note: string;
  },
): DemoTheatreCaseIssue |
  undefined {
  const errors =
    validateDemoTheatreCaseIssue(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const surgicalCase =
    getEligibleSurgicalCase(
      input.caseId,
    );

  if (
    surgicalCase === undefined
  ) {
    return undefined;
  }

  const cycles =
    readDemoCssdSterilizationCycles();

  const trays =
    readDemoCssdInstrumentTrays();

  const selectedTrays =
    [
      ...new Set(
        input.trayIds,
      ),
    ]
      .map(
        (trayId) =>
          trays.find(
            (tray) =>
              tray.id ===
              trayId,
          ),
      )
      .filter(
        (
          tray,
        ): tray is
          DemoCssdInstrumentTray =>
          tray !== undefined,
      );

  const traySnapshots:
    DemoTheatreCaseIssueTraySnapshot[] =
    selectedTrays.map(
      (tray) => {
        const cycle =
          cycles.find(
            (record) =>
              record.id ===
              tray.lastCycleId,
          );

        return {
          trayId:
            tray.id,

          trayCode:
            tray.trayCode,

          trayName:
            tray.trayName,

          cycleId:
            cycle?.id ?? "",

          cycleNumber:
            cycle?.cycleNumber ??
            "Legacy sterile stock",

          sterilizedAt:
            tray.lastSterilizedAt,

          sterilityExpiryAt:
            tray.sterilityExpiryAt,
        };
      },
    );

  const batches =
    readDemoTheatreInventoryBatches();

  const quantitiesByBatch =
    new Map<string, number>();

  input.lines.forEach(
    (line) => {
      quantitiesByBatch.set(
        line.batchId,

        (
          quantitiesByBatch.get(
            line.batchId,
          ) ?? 0
        ) + line.quantity,
      );
    },
  );

  const issueLines:
    DemoTheatreCaseIssueLine[] =
    [];

  quantitiesByBatch.forEach(
    (
      quantity,
      batchId,
    ) => {
      const batch =
        batches.find(
          (record) =>
            record.id ===
            batchId,
        );

      if (
        batch === undefined
      ) {
        return;
      }

      issueLines.push({
        id:
          createIdentifier(
            "theatre-issue-line",
          ),

        batchId:
          batch.id,

        itemCode:
          batch.itemCode,

        itemName:
          batch.itemName,

        itemType:
          batch.itemType,

        manufacturer:
          batch.manufacturer,

        lotNumber:
          batch.lotNumber,

        serialNumber:
          batch.serialNumber,

        expiryDate:
          batch.expiryDate,

        quantityIssued:
          Math.round(quantity),

        quantityUsed: 0,
        quantityReturned: 0,

        unitOfMeasure:
          batch.unitOfMeasure,
      });
    },
  );

  const timestamp =
    new Date().toISOString();

  const issue:
    DemoTheatreCaseIssue = {
    id:
      createIdentifier(
        "theatre-case-issue",
      ),

    issueNumber:
      generateIssueNumber(),

    caseId:
      surgicalCase.id,

    patientId:
      surgicalCase.patientId,

    branchId:
      surgicalCase.branchId,

    status: "issued",

    trays:
      traySnapshots,

    lines:
      issueLines,

    issuedBy:
      input.issuedBy.trim(),

    issuedAt:
      timestamp,

    finalizedBy: "",
    finalizedAt: "",

    note:
      input.note.trim(),

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoTheatreCaseIssues([
    issue,

    ...readDemoTheatreCaseIssues(),
  ]);

  writeDemoCssdInstrumentTrays(
    trays.map(
      (tray) =>
        input.trayIds.includes(
          tray.id,
        )
          ? {
              ...tray,

              status: "issued",

              currentCaseId:
                surgicalCase.id,

              location:
                "Operation Theatre",

              note:
                `Issued through ${issue.issueNumber}.`,

              updatedAt:
                timestamp,
            }
          : tray,
    ),
  );

  const movements = [
    ...readDemoTheatreInventoryMovements(),
  ];

  const updatedBatches =
    batches.map(
      (batch) => {
        const issueLine =
          issueLines.find(
            (line) =>
              line.batchId ===
              batch.id,
          );

        if (
          issueLine === undefined
        ) {
          return batch;
        }

        const nextBalance =
          batch.availableQuantity -
          issueLine.quantityIssued;

        movements.unshift({
          id:
            createIdentifier(
              "theatre-movement",
            ),

          branchId:
            batch.branchId,

          batchId:
            batch.id,

          movementType:
            "case-issue",

          quantityChange:
            -issueLine.quantityIssued,

          balanceAfter:
            nextBalance,

          caseId:
            surgicalCase.id,

          issueId:
            issue.id,

          performedBy:
            issue.issuedBy,

          note:
            `${issue.issueNumber} issued to ${surgicalCase.caseNumber}.`,

          createdAt:
            timestamp,
        });

        return {
          ...batch,

          availableQuantity:
            nextBalance,

          active:
            nextBalance > 0,

          updatedAt:
            timestamp,
        };
      },
    );

  writeDemoTheatreInventoryBatches(
    updatedBatches,
  );

  writeDemoTheatreInventoryMovements(
    movements,
  );

  return issue;
}

export function finalizeDemoTheatreCaseIssue(
  input: {
    issueId: string;

    usage:
      readonly {
        lineId: string;
        quantityUsed: number;
      }[];

    finalizedBy: string;
  },
): DemoTheatreCaseIssue |
  undefined {
  const finalizedBy =
    input.finalizedBy.trim();

  if (
    finalizedBy.length < 2
  ) {
    return undefined;
  }

  const issues =
    readDemoTheatreCaseIssues();

  const issue =
    issues.find(
      (record) =>
        record.id ===
        input.issueId,
    );

  if (
    issue === undefined ||
    issue.status !==
      "issued"
  ) {
    return undefined;
  }

  const usageByLine =
    new Map(
      input.usage.map(
        (record) => [
          record.lineId,
          record.quantityUsed,
        ],
      ),
    );

  const updatedLines:
    DemoTheatreCaseIssueLine[] =
    [];

  for (
    const line of issue.lines
  ) {
    const quantityUsed =
      usageByLine.get(
        line.id,
      );

    if (
      quantityUsed ===
        undefined ||
      !Number.isFinite(
        quantityUsed,
      ) ||
      quantityUsed < 0 ||
      quantityUsed >
        line.quantityIssued
    ) {
      return undefined;
    }

    updatedLines.push({
      ...line,

      quantityUsed:
        Math.round(
          quantityUsed,
        ),

      quantityReturned:
        line.quantityIssued -
        Math.round(
          quantityUsed,
        ),
    });
  }

  const timestamp =
    new Date().toISOString();

  const closedIssue:
    DemoTheatreCaseIssue = {
    ...issue,

    status: "closed",

    lines:
      updatedLines,

    finalizedBy,

    finalizedAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  writeDemoTheatreCaseIssues(
    issues.map(
      (record) =>
        record.id ===
        issue.id
          ? closedIssue
          : record,
    ),
  );

  writeDemoCssdInstrumentTrays(
    readDemoCssdInstrumentTrays()
      .map(
        (tray) =>
          issue.trays.some(
            (snapshot) =>
              snapshot.trayId ===
              tray.id,
          )
            ? {
                ...tray,

                status: "used",

                currentCaseId:
                  "",

                location:
                  "Theatre Dirty Utility",

                note:
                  `Returned after ${issue.issueNumber}; reprocessing required.`,

                updatedAt:
                  timestamp,
              }
            : tray,
      ),
  );

  const batches =
    readDemoTheatreInventoryBatches();

  const movements = [
    ...readDemoTheatreInventoryMovements(),
  ];

  const updatedBatches =
    batches.map(
      (batch) => {
        const line =
          updatedLines.find(
            (record) =>
              record.batchId ===
              batch.id,
          );

        if (
          line === undefined ||
          line.quantityReturned <=
            0
        ) {
          return batch;
        }

        const nextBalance =
          batch.availableQuantity +
          line.quantityReturned;

        movements.unshift({
          id:
            createIdentifier(
              "theatre-movement",
            ),

          branchId:
            batch.branchId,

          batchId:
            batch.id,

          movementType:
            "case-return",

          quantityChange:
            line.quantityReturned,

          balanceAfter:
            nextBalance,

          caseId:
            issue.caseId,

          issueId:
            issue.id,

          performedBy:
            finalizedBy,

          note:
            `${line.quantityReturned} ${line.unitOfMeasure} returned through ${issue.issueNumber}.`,

          createdAt:
            timestamp,
        });

        return {
          ...batch,

          availableQuantity:
            nextBalance,

          active: true,

          updatedAt:
            timestamp,
        };
      },
    );

  writeDemoTheatreInventoryBatches(
    updatedBatches,
  );

  writeDemoTheatreInventoryMovements(
    movements,
  );

  return closedIssue;
}

export function buildDemoCssdTheatreInventorySummary(
  branchId = "",
): DemoCssdTheatreInventorySummary {
  const trays =
    readDemoCssdInstrumentTrays()
      .filter(
        (tray) =>
          branchId === "" ||
          tray.branchId ===
            branchId,
      );

  const cycles =
    readDemoCssdSterilizationCycles()
      .filter(
        (cycle) =>
          branchId === "" ||
          cycle.branchId ===
            branchId,
      );

  const batches =
    readDemoTheatreInventoryBatches()
      .filter(
        (batch) =>
          branchId === "" ||
          batch.branchId ===
            branchId,
      );

  const issues =
    readDemoTheatreCaseIssues()
      .filter(
        (issue) =>
          branchId === "" ||
          issue.branchId ===
            branchId,
      );

  return {
    totalTrays:
      trays.length,

    availableTrays:
      trays.filter(
        (tray) =>
          tray.status ===
          "available",
      ).length,

    decontaminationTrays:
      trays.filter(
        (tray) =>
          tray.status ===
          "decontamination",
      ).length,

    packedTrays:
      trays.filter(
        (tray) =>
          tray.status ===
          "packed",
      ).length,

    sterilizingTrays:
      trays.filter(
        (tray) =>
          tray.status ===
          "sterilizing",
      ).length,

    quarantinedTrays:
      trays.filter(
        (tray) =>
          tray.status ===
            "quarantined" ||
          tray.status ===
            "expired",
      ).length,

    runningCycles:
      cycles.filter(
        (cycle) =>
          cycle.status ===
          "running",
      ).length,

    failedCycles:
      cycles.filter(
        (cycle) =>
          cycle.status ===
          "failed",
      ).length,

    lowStockBatches:
      batches.filter(
        (batch) =>
          batch.availableQuantity <=
          batch.reorderLevel,
      ).length,

    expiringBatches:
      batches.filter(
        (batch) => {
          const state =
            classifyDemoTheatreInventoryExpiry(
              batch,
            );

          return (
            state ===
              "expiring" ||
            state ===
              "critical" ||
            state ===
              "expired"
          );
        },
      ).length,

    openCaseIssues:
      issues.filter(
        (issue) =>
          issue.status ===
          "issued",
      ).length,
  };
}