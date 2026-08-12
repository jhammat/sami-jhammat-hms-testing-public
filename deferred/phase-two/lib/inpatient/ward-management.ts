export type DemoInpatientWardType =
  | "general"
  | "medical"
  | "surgical";

export type DemoInpatientGenderPolicy =
  | "mixed"
  | "male"
  | "female";

export type DemoInpatientBedStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "cleaning"
  | "maintenance";

export type DemoInpatientRoomType =
  | "general"
  | "semi-private"
  | "private"
  | "isolation";

export type DemoInpatientAdmissionStatus =
  | "admitted"
  | "discharge-ready"
  | "discharged"
  | "cancelled";

export type DemoInpatientAdmissionType =
  | "emergency"
  | "elective"
  | "observation"
  | "day-care";

export type DemoInpatientAdmissionPriority =
  | "routine"
  | "urgent"
  | "critical";

export interface DemoInpatientDirectoryBranch {
  id: string;
  name: string;
}

export interface DemoInpatientWard {
  id: string;

  branchId: string;

  wardCode: string;
  wardName: string;

  wardType:
    DemoInpatientWardType;

  floorName: string;

  genderPolicy:
    DemoInpatientGenderPolicy;

  active: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface DemoInpatientBed {
  id: string;

  branchId: string;
  wardId: string;

  roomNumber: string;
  bedNumber: string;
  bedLabel: string;

  roomType:
    DemoInpatientRoomType;

  status:
    DemoInpatientBedStatus;

  currentAdmissionId: string;

  note: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoInpatientTransfer {
  id: string;

  admissionId: string;

  fromBedId: string;
  toBedId: string;

  reason: string;

  requestedBy: string;
  transferredBy: string;

  transferredAt: string;
}

export interface DemoInpatientDischargeReadiness {
  doctorClearance: boolean;
  nursingSummaryCompleted: boolean;
  medicationReconciliationCompleted: boolean;
  billingClearance: boolean;
  followUpPlanCompleted: boolean;

  finalDiagnosis: string;
  dischargeInstructions: string;
  followUpPlan: string;
}

export interface DemoInpatientAdmission {
  id: string;

  admissionNumber: string;

  patientId: string;
  branchId: string;
  practitionerId: string;

  encounterId: string;

  admissionType:
    DemoInpatientAdmissionType;

  priority:
    DemoInpatientAdmissionPriority;

  admissionReason: string;
  provisionalDiagnosis: string;

  status:
    DemoInpatientAdmissionStatus;

  currentBedId: string;

  admittedBy: string;
  admittedAt: string;

  expectedDischargeDate: string;

  dischargeReadiness:
    DemoInpatientDischargeReadiness;

  dischargeSummary: string;

  dischargedBy: string;
  dischargedAt: string;

  transfers:
    DemoInpatientTransfer[];

  createdAt: string;
  updatedAt: string;
}

export interface DemoInpatientCensusSummary {
  totalBeds: number;

  availableBeds: number;
  occupiedBeds: number;
  reservedBeds: number;
  cleaningBeds: number;
  maintenanceBeds: number;

  admittedPatients: number;
  dischargeReadyPatients: number;

  occupancyRate: number;
}

const INPATIENT_WARD_STORAGE_KEY =
  "wonflow-demo-inpatient-wards";

const INPATIENT_BED_STORAGE_KEY =
  "wonflow-demo-inpatient-beds";

const INPATIENT_ADMISSION_STORAGE_KEY =
  "wonflow-demo-inpatient-admissions";

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

function generateAdmissionNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `ADM-${createDateCode()}-${randomPart}`;
}

function createDefaultDischargeReadiness():
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

function createDefaultWard(
  branchId: string,

  input: {
    code: string;
    name: string;

    type:
      DemoInpatientWardType;

    floorName: string;

    genderPolicy:
      DemoInpatientGenderPolicy;
  },
): DemoInpatientWard {
  const timestamp =
    new Date().toISOString();

  return {
    id:
      `ward-${branchId}-${input.code.toLocaleLowerCase()}`,

    branchId,

    wardCode:
      input.code,

    wardName:
      input.name,

    wardType:
      input.type,

    floorName:
      input.floorName,

    genderPolicy:
      input.genderPolicy,

    active: true,

    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createDefaultBeds(
  ward:
    DemoInpatientWard,

  roomPrefix: number,
): DemoInpatientBed[] {
  const timestamp =
    new Date().toISOString();

  const beds:
    DemoInpatientBed[] = [];

  for (
    let roomIndex = 1;
    roomIndex <= 4;
    roomIndex += 1
  ) {
    const roomNumber =
      String(
        roomPrefix +
        roomIndex,
      );

    for (
      let bedIndex = 1;
      bedIndex <= 2;
      bedIndex += 1
    ) {
      const bedNumber =
        String(bedIndex);

      beds.push({
        id:
          `bed-${ward.id}-${roomNumber}-${bedNumber}`,

        branchId:
          ward.branchId,

        wardId:
          ward.id,

        roomNumber,

        bedNumber,

        bedLabel:
          `${ward.wardCode}-${roomNumber}-${bedNumber}`,

        roomType:
          roomIndex === 4
            ? "private"
            : "general",

        status:
          "available",

        currentAdmissionId:
          "",

        note: "",

        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  return beds;
}

export function readDemoInpatientWards():
  DemoInpatientWard[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      INPATIENT_WARD_STORAGE_KEY,
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
      ? parsedValue as
          DemoInpatientWard[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoInpatientWards(
  wards:
    readonly DemoInpatientWard[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    INPATIENT_WARD_STORAGE_KEY,

    JSON.stringify(
      wards.slice(0, 1000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-inpatient-wards-changed",
    ),
  );
}

export function readDemoInpatientBeds():
  DemoInpatientBed[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      INPATIENT_BED_STORAGE_KEY,
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
      ? parsedValue as
          DemoInpatientBed[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoInpatientBeds(
  beds:
    readonly DemoInpatientBed[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    INPATIENT_BED_STORAGE_KEY,

    JSON.stringify(
      beds.slice(0, 5000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-inpatient-beds-changed",
    ),
  );
}

export function readDemoInpatientAdmissions():
  DemoInpatientAdmission[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      INPATIENT_ADMISSION_STORAGE_KEY,
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
      ? parsedValue as
          DemoInpatientAdmission[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoInpatientAdmissions(
  admissions:
    readonly DemoInpatientAdmission[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    INPATIENT_ADMISSION_STORAGE_KEY,

    JSON.stringify(
      admissions.slice(0, 5000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-inpatient-admissions-changed",
    ),
  );
}

export function initializeDemoInpatientDirectory(
  branches:
    readonly DemoInpatientDirectoryBranch[],
): {
  wards:
    DemoInpatientWard[];

  beds:
    DemoInpatientBed[];
} {
  const existingWards =
    readDemoInpatientWards();

  const existingBeds =
    readDemoInpatientBeds();

  const nextWards = [
    ...existingWards,
  ];

  const nextBeds = [
    ...existingBeds,
  ];

  let changed = false;

  branches.forEach(
    (
      branch,
      branchIndex,
    ) => {
      const wardDefinitions = [
        createDefaultWard(
          branch.id,

          {
            code: "GW",

            name:
              "General Ward",

            type: "general",

            floorName:
              "First Floor",

            genderPolicy:
              "mixed",
          },
        ),

        createDefaultWard(
          branch.id,

          {
            code: "MW",

            name:
              "Medical Ward",

            type: "medical",

            floorName:
              "Second Floor",

            genderPolicy:
              "mixed",
          },
        ),

        createDefaultWard(
          branch.id,

          {
            code: "SW",

            name:
              "Surgical Ward",

            type: "surgical",

            floorName:
              "Third Floor",

            genderPolicy:
              "mixed",
          },
        ),
      ];

      wardDefinitions.forEach(
        (
          ward,
          wardIndex,
        ) => {
          const wardExists =
            nextWards.some(
              (record) =>
                record.id ===
                ward.id,
            );

          if (
            !wardExists
          ) {
            nextWards.push(
              ward,
            );

            changed = true;
          }

          const defaultBeds =
            createDefaultBeds(
              ward,

              (
                branchIndex +
                1
              ) *
                100 +
                wardIndex *
                  10,
            );

          defaultBeds.forEach(
            (bed) => {
              const bedExists =
                nextBeds.some(
                  (record) =>
                    record.id ===
                    bed.id,
                );

              if (
                !bedExists
              ) {
                nextBeds.push(
                  bed,
                );

                changed = true;
              }
            },
          );
        },
      );
    },
  );

  if (changed) {
    writeDemoInpatientWards(
      nextWards,
    );

    writeDemoInpatientBeds(
      nextBeds,
    );
  }

  return {
    wards: nextWards,
    beds: nextBeds,
  };
}

export function getDemoPatientActiveAdmission(
  patientId: string,
): DemoInpatientAdmission |
  undefined {
  return readDemoInpatientAdmissions()
    .find(
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
}

export function validateDemoInpatientAdmission(
  input: {
    patientId: string;
    branchId: string;
    practitionerId: string;

    encounterId: string;

    admissionType:
      DemoInpatientAdmissionType;

    priority:
      DemoInpatientAdmissionPriority;

    admissionReason: string;
    provisionalDiagnosis:
      string;

    bedId: string;

    admittedBy: string;

    expectedDischargeDate:
      string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    input.patientId.trim() ===
    ""
  ) {
    errors.push(
      "Select the patient being admitted.",
    );
  }

  if (
    input.branchId.trim() ===
    ""
  ) {
    errors.push(
      "Select the hospital branch.",
    );
  }

  if (
    input.practitionerId
      .trim() === ""
  ) {
    errors.push(
      "Select the admitting doctor.",
    );
  }

  if (
    input.admissionReason
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the reason for admission.",
    );
  }

  if (
    input
      .provisionalDiagnosis
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the provisional diagnosis.",
    );
  }

  if (
    input.admittedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the staff member completing admission.",
    );
  }

  const bed =
    readDemoInpatientBeds()
      .find(
        (record) =>
          record.id ===
          input.bedId,
      );

  if (
    bed === undefined
  ) {
    errors.push(
      "Select an available inpatient bed.",
    );
  } else {
    if (
      bed.branchId !==
      input.branchId
    ) {
      errors.push(
        "The selected bed belongs to another hospital branch.",
      );
    }

    if (
      bed.status !==
      "available"
    ) {
      errors.push(
        "The selected inpatient bed is no longer available.",
      );
    }
  }

  const activeAdmission =
    getDemoPatientActiveAdmission(
      input.patientId,
    );

  if (
    activeAdmission !==
    undefined
  ) {
    errors.push(
      `The patient already has active admission ${activeAdmission.admissionNumber}.`,
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function admitDemoInpatient(
  input: {
    patientId: string;
    branchId: string;
    practitionerId: string;

    encounterId: string;

    admissionType:
      DemoInpatientAdmissionType;

    priority:
      DemoInpatientAdmissionPriority;

    admissionReason: string;
    provisionalDiagnosis:
      string;

    bedId: string;

    admittedBy: string;

    expectedDischargeDate:
      string;
  },
): DemoInpatientAdmission |
  undefined {
  const errors =
    validateDemoInpatientAdmission(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const beds =
    readDemoInpatientBeds();

  const selectedBed =
    beds.find(
      (bed) =>
        bed.id ===
        input.bedId,
    );

  if (
    selectedBed ===
    undefined
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const admission:
    DemoInpatientAdmission = {
    id:
      createIdentifier(
        "inpatient-admission",
      ),

    admissionNumber:
      generateAdmissionNumber(),

    patientId:
      input.patientId,

    branchId:
      input.branchId,

    practitionerId:
      input.practitionerId,

    encounterId:
      input.encounterId
        .trim(),

    admissionType:
      input.admissionType,

    priority:
      input.priority,

    admissionReason:
      input.admissionReason
        .trim(),

    provisionalDiagnosis:
      input
        .provisionalDiagnosis
        .trim(),

    status: "admitted",

    currentBedId:
      selectedBed.id,

    admittedBy:
      input.admittedBy.trim(),

    admittedAt: timestamp,

    expectedDischargeDate:
      input.expectedDischargeDate,

    dischargeReadiness:
      createDefaultDischargeReadiness(),

    dischargeSummary: "",

    dischargedBy: "",
    dischargedAt: "",

    transfers: [],

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoInpatientBeds(
    beds.map(
      (bed) =>
        bed.id ===
        selectedBed.id
          ? {
              ...bed,

              status:
                "occupied",

              currentAdmissionId:
                admission.id,

              updatedAt:
                timestamp,
            }
          : bed,
    ),
  );

  writeDemoInpatientAdmissions([
    admission,

    ...readDemoInpatientAdmissions(),
  ]);

  return admission;
}

export function transferDemoInpatient(
  input: {
    admissionId: string;

    targetBedId: string;

    reason: string;

    requestedBy: string;
    transferredBy: string;
  },
): DemoInpatientAdmission |
  undefined {
  const admissions =
    readDemoInpatientAdmissions();

  const admission =
    admissions.find(
      (record) =>
        record.id ===
        input.admissionId,
    );

  if (
    admission === undefined ||
    admission.status !==
      "admitted"
  ) {
    return undefined;
  }

  if (
    input.reason.trim().length <
      3 ||
    input.requestedBy
      .trim()
      .length < 2 ||
    input.transferredBy
      .trim()
      .length < 2
  ) {
    return undefined;
  }

  const beds =
    readDemoInpatientBeds();

  const currentBed =
    beds.find(
      (bed) =>
        bed.id ===
        admission.currentBedId,
    );

  const targetBed =
    beds.find(
      (bed) =>
        bed.id ===
        input.targetBedId,
    );

  if (
    currentBed === undefined ||
    targetBed === undefined ||
    targetBed.status !==
      "available" ||
    targetBed.branchId !==
      admission.branchId ||
    targetBed.id ===
      currentBed.id
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const transfer:
    DemoInpatientTransfer = {
    id:
      createIdentifier(
        "inpatient-transfer",
      ),

    admissionId:
      admission.id,

    fromBedId:
      currentBed.id,

    toBedId:
      targetBed.id,

    reason:
      input.reason.trim(),

    requestedBy:
      input.requestedBy
        .trim(),

    transferredBy:
      input.transferredBy
        .trim(),

    transferredAt:
      timestamp,
  };

  const updatedAdmission:
    DemoInpatientAdmission = {
    ...admission,

    currentBedId:
      targetBed.id,

    transfers: [
      transfer,
      ...admission.transfers,
    ],

    updatedAt: timestamp,
  };

  writeDemoInpatientBeds(
    beds.map(
      (bed) => {
        if (
          bed.id ===
          currentBed.id
        ) {
          return {
            ...bed,

            status:
              "cleaning",

            currentAdmissionId:
              "",

            note:
              `Vacated after transfer ${transfer.id}.`,

            updatedAt:
              timestamp,
          };
        }

        if (
          bed.id ===
          targetBed.id
        ) {
          return {
            ...bed,

            status:
              "occupied",

            currentAdmissionId:
              admission.id,

            note: "",

            updatedAt:
              timestamp,
          };
        }

        return bed;
      },
    ),
  );

  writeDemoInpatientAdmissions(
    admissions.map(
      (record) =>
        record.id ===
        admission.id
          ? updatedAdmission
          : record,
    ),
  );

  return updatedAdmission;
}

export function validateDemoDischargeReadiness(
  readiness:
    DemoInpatientDischargeReadiness,
): string[] {
  const errors:
    string[] = [];

  if (
    !readiness.doctorClearance
  ) {
    errors.push(
      "Doctor clearance is required.",
    );
  }

  if (
    !readiness
      .nursingSummaryCompleted
  ) {
    errors.push(
      "The nursing discharge summary must be completed.",
    );
  }

  if (
    !readiness
      .medicationReconciliationCompleted
  ) {
    errors.push(
      "Medication reconciliation must be completed.",
    );
  }

  if (
    !readiness.billingClearance
  ) {
    errors.push(
      "Billing clearance is required.",
    );
  }

  if (
    !readiness
      .followUpPlanCompleted
  ) {
    errors.push(
      "The follow-up plan must be completed.",
    );
  }

  if (
    readiness.finalDiagnosis
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the final diagnosis.",
    );
  }

  if (
    readiness
      .dischargeInstructions
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the discharge instructions.",
    );
  }

  if (
    readiness.followUpPlan
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the patient follow-up plan.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function markDemoInpatientDischargeReady(
  admissionId: string,

  readiness:
    DemoInpatientDischargeReadiness,
): DemoInpatientAdmission |
  undefined {
  const errors =
    validateDemoDischargeReadiness(
      readiness,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const admissions =
    readDemoInpatientAdmissions();

  const admission =
    admissions.find(
      (record) =>
        record.id ===
        admissionId,
    );

  if (
    admission === undefined ||
    admission.status !==
      "admitted"
  ) {
    return undefined;
  }

  const updatedAdmission:
    DemoInpatientAdmission = {
    ...admission,

    status:
      "discharge-ready",

    dischargeReadiness: {
      ...readiness,

      finalDiagnosis:
        readiness.finalDiagnosis
          .trim(),

      dischargeInstructions:
        readiness
          .dischargeInstructions
          .trim(),

      followUpPlan:
        readiness.followUpPlan
          .trim(),
    },

    updatedAt:
      new Date().toISOString(),
  };

  writeDemoInpatientAdmissions(
    admissions.map(
      (record) =>
        record.id ===
        admission.id
          ? updatedAdmission
          : record,
    ),
  );

  return updatedAdmission;
}

export function dischargeDemoInpatient(
  input: {
    admissionId: string;

    dischargedBy: string;

    dischargeSummary:
      string;
  },
): DemoInpatientAdmission |
  undefined {
  const dischargedBy =
    input.dischargedBy.trim();

  const dischargeSummary =
    input.dischargeSummary
      .trim();

  if (
    dischargedBy.length < 2 ||
    dischargeSummary.length <
      5
  ) {
    return undefined;
  }

  const admissions =
    readDemoInpatientAdmissions();

  const admission =
    admissions.find(
      (record) =>
        record.id ===
        input.admissionId,
    );

  if (
    admission === undefined ||
    admission.status !==
      "discharge-ready"
  ) {
    return undefined;
  }

  const readinessErrors =
    validateDemoDischargeReadiness(
      admission
        .dischargeReadiness,
    );

  if (
    readinessErrors.length > 0
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updatedAdmission:
    DemoInpatientAdmission = {
    ...admission,

    status: "discharged",

    dischargeSummary,

    dischargedBy,

    dischargedAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  const beds =
    readDemoInpatientBeds();

  writeDemoInpatientBeds(
    beds.map(
      (bed) =>
        bed.id ===
        admission.currentBedId
          ? {
              ...bed,

              status:
                "cleaning",

              currentAdmissionId:
                "",

              note:
                `Vacated after discharge ${admission.admissionNumber}.`,

              updatedAt:
                timestamp,
            }
          : bed,
    ),
  );

  writeDemoInpatientAdmissions(
    admissions.map(
      (record) =>
        record.id ===
        admission.id
          ? updatedAdmission
          : record,
    ),
  );

  return updatedAdmission;
}

export function updateDemoInpatientBedStatus(
  input: {
    bedId: string;

    status:
      Exclude<
        DemoInpatientBedStatus,
        "occupied"
      >;

    note: string;
  },
): DemoInpatientBed |
  undefined {
  const beds =
    readDemoInpatientBeds();

  const bed =
    beds.find(
      (record) =>
        record.id ===
        input.bedId,
    );

  if (
    bed === undefined ||
    bed.currentAdmissionId !==
      "" ||
    bed.status === "occupied"
  ) {
    return undefined;
  }

  const updatedBed:
    DemoInpatientBed = {
    ...bed,

    status:
      input.status,

    note:
      input.note.trim(),

    updatedAt:
      new Date().toISOString(),
  };

  writeDemoInpatientBeds(
    beds.map(
      (record) =>
        record.id ===
        bed.id
          ? updatedBed
          : record,
    ),
  );

  return updatedBed;
}

export function buildDemoInpatientCensusSummary(
  branchId?: string,
): DemoInpatientCensusSummary {
  const beds =
    readDemoInpatientBeds()
      .filter(
        (bed) =>
          branchId ===
            undefined ||
          branchId === "" ||
          bed.branchId ===
            branchId,
      );

  const admissions =
    readDemoInpatientAdmissions()
      .filter(
        (admission) =>
          (
            branchId ===
              undefined ||
            branchId === "" ||
            admission.branchId ===
              branchId
          ) &&
          (
            admission.status ===
              "admitted" ||
            admission.status ===
              "discharge-ready"
          ),
      );

  const occupiedBeds =
    beds.filter(
      (bed) =>
        bed.status ===
        "occupied",
    ).length;

  return {
    totalBeds:
      beds.length,

    availableBeds:
      beds.filter(
        (bed) =>
          bed.status ===
          "available",
      ).length,

    occupiedBeds,

    reservedBeds:
      beds.filter(
        (bed) =>
          bed.status ===
          "reserved",
      ).length,

    cleaningBeds:
      beds.filter(
        (bed) =>
          bed.status ===
          "cleaning",
      ).length,

    maintenanceBeds:
      beds.filter(
        (bed) =>
          bed.status ===
          "maintenance",
      ).length,

    admittedPatients:
      admissions.length,

    dischargeReadyPatients:
      admissions.filter(
        (admission) =>
          admission.status ===
          "discharge-ready",
      ).length,

    occupancyRate:
      beds.length === 0
        ? 0
        : Math.round(
            (
              occupiedBeds /
              beds.length
            ) *
              1000,
          ) / 10,
  };
}