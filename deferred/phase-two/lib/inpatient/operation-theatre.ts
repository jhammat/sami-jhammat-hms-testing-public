import {
  readDemoInpatientAdmissions,
} from "./ward-management";

export type DemoOperationTheatreStatus =
  | "available"
  | "in-use"
  | "cleaning"
  | "maintenance";

export type DemoSurgicalCaseStatus =
  | "scheduled"
  | "pre-op-ready"
  | "in-surgery"
  | "recovery"
  | "completed"
  | "cancelled";

export type DemoSurgicalUrgency =
  | "elective"
  | "urgent"
  | "emergency";

export type DemoSurgicalAnesthesiaType =
  | "general"
  | "regional"
  | "local"
  | "sedation";

export type DemoSurgicalPreparationStatus =
  | "not-required"
  | "available"
  | "pending";

export type DemoRecoveryConsciousness =
  | "awake"
  | "drowsy"
  | "responds-to-voice"
  | "responds-to-pain"
  | "unresponsive";

export interface DemoOperationTheatreDirectoryBranch {
  id: string;
  name: string;
}

export interface DemoOperationTheatre {
  id: string;

  branchId: string;

  theatreCode: string;
  theatreName: string;

  floorName: string;

  status:
    DemoOperationTheatreStatus;

  currentCaseId: string;

  note: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoSurgicalTeam {
  primarySurgeonId: string;
  assistantSurgeonId: string;

  anesthetistId: string;

  scrubNurse: string;
  circulatingNurse: string;
}

export interface DemoPreoperativeChecklist {
  patientIdentityConfirmed: boolean;
  procedureConfirmed: boolean;
  consentSigned: boolean;
  procedureSiteMarked: boolean;

  allergiesReviewed: boolean;
  fastingConfirmed: boolean;
  investigationsReviewed: boolean;
  anesthesiaAssessmentCompleted: boolean;

  equipmentReady: boolean;
  prophylacticAntibioticsConfirmed: boolean;

  bloodPreparation:
    DemoSurgicalPreparationStatus;

  implantPreparation:
    DemoSurgicalPreparationStatus;

  checklistNote: string;

  completedBy: string;
  completedAt: string;
}

export interface DemoIntraoperativeRecord {
  actualStartAt: string;
  incisionAt: string;
  actualEndAt: string;

  procedurePerformed: string;
  operativeFindings: string;

  estimatedBloodLossMillilitres:
    number;

  specimens: string;
  implants: string;
  complications: string;

  instrumentCountCorrect: boolean;
  swabCountCorrect: boolean;
  needleCountCorrect: boolean;

  anesthesiaNotes: string;
  surgeonNotes: string;

  recordedBy: string;
  updatedAt: string;
}

export interface DemoRecoveryRecord {
  arrivedAt: string;

  consciousness:
    DemoRecoveryConsciousness;

  painScore: number;
  oxygenSaturationPercent: number;

  nauseaOrVomiting: boolean;

  airwayStable: boolean;
  circulationStable: boolean;
  bleedingControlled: boolean;

  recoveryNote: string;

  handedOverTo: string;
  completedBy: string;
  completedAt: string;
}

export interface DemoSurgicalCase {
  id: string;

  caseNumber: string;

  patientId: string;
  admissionId: string;

  branchId: string;
  theatreId: string;

  procedureName: string;
  preoperativeDiagnosis: string;

  urgency:
    DemoSurgicalUrgency;

  anesthesiaType:
    DemoSurgicalAnesthesiaType;

  scheduledStartAt: string;
  estimatedDurationMinutes:
    number;

  status:
    DemoSurgicalCaseStatus;

  team:
    DemoSurgicalTeam;

  preoperativeChecklist:
    DemoPreoperativeChecklist;

  intraoperativeRecord:
    DemoIntraoperativeRecord;

  recoveryRecord:
    DemoRecoveryRecord;

  specialRequirements: string;

  scheduledBy: string;

  cancelledBy: string;
  cancellationReason: string;
  cancelledAt: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoOperationTheatreSummary {
  totalTheatres: number;
  availableTheatres: number;
  theatresInUse: number;
  cleaningTheatres: number;
  maintenanceTheatres: number;

  scheduledCases: number;
  preoperativeReadyCases:
    number;

  surgeriesInProgress: number;
  recoveryCases: number;
}

const OPERATION_THEATRE_STORAGE_KEY =
  "wonflow-demo-operation-theatres";

const SURGICAL_CASE_STORAGE_KEY =
  "wonflow-demo-surgical-cases";

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

function generateSurgicalCaseNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `SUR-${createDateCode()}-${randomPart}`;
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

function createDefaultPreoperativeChecklist():
  DemoPreoperativeChecklist {
  return {
    patientIdentityConfirmed:
      false,

    procedureConfirmed: false,
    consentSigned: false,
    procedureSiteMarked: false,

    allergiesReviewed: false,
    fastingConfirmed: false,
    investigationsReviewed:
      false,

    anesthesiaAssessmentCompleted:
      false,

    equipmentReady: false,

    prophylacticAntibioticsConfirmed:
      false,

    bloodPreparation:
      "not-required",

    implantPreparation:
      "not-required",

    checklistNote: "",

    completedBy: "",
    completedAt: "",
  };
}

function createDefaultIntraoperativeRecord():
  DemoIntraoperativeRecord {
  return {
    actualStartAt: "",
    incisionAt: "",
    actualEndAt: "",

    procedurePerformed: "",
    operativeFindings: "",

    estimatedBloodLossMillilitres:
      0,

    specimens: "",
    implants: "",
    complications: "",

    instrumentCountCorrect:
      false,

    swabCountCorrect: false,
    needleCountCorrect: false,

    anesthesiaNotes: "",
    surgeonNotes: "",

    recordedBy: "",
    updatedAt: "",
  };
}

function createDefaultRecoveryRecord():
  DemoRecoveryRecord {
  return {
    arrivedAt: "",

    consciousness: "drowsy",

    painScore: 0,
    oxygenSaturationPercent:
      98,

    nauseaOrVomiting: false,

    airwayStable: false,
    circulationStable: false,
    bleedingControlled: false,

    recoveryNote: "",

    handedOverTo: "",
    completedBy: "",
    completedAt: "",
  };
}

function createDefaultTheatre(
  branchId: string,

  input: {
    code: string;
    name: string;
    floorName: string;
  },
): DemoOperationTheatre {
  const timestamp =
    new Date().toISOString();

  return {
    id:
      `operation-theatre-${branchId}-${input.code.toLocaleLowerCase()}`,

    branchId,

    theatreCode:
      input.code,

    theatreName:
      input.name,

    floorName:
      input.floorName,

    status: "available",

    currentCaseId: "",

    note: "",

    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function readDemoOperationTheatres():
  DemoOperationTheatre[] {
  return readStoredArray<
    DemoOperationTheatre
  >(
    OPERATION_THEATRE_STORAGE_KEY,
  );
}

export function writeDemoOperationTheatres(
  theatres:
    readonly DemoOperationTheatre[],
): void {
  writeStoredArray(
    OPERATION_THEATRE_STORAGE_KEY,

    "wonflow:demo-operation-theatres-changed",

    theatres,
  );
}

export function readDemoSurgicalCases():
  DemoSurgicalCase[] {
  return readStoredArray<
    DemoSurgicalCase
  >(
    SURGICAL_CASE_STORAGE_KEY,
  );
}

export function writeDemoSurgicalCases(
  cases:
    readonly DemoSurgicalCase[],
): void {
  writeStoredArray(
    SURGICAL_CASE_STORAGE_KEY,

    "wonflow:demo-surgical-cases-changed",

    cases,
  );
}

export function initializeDemoOperationTheatres(
  branches:
    readonly DemoOperationTheatreDirectoryBranch[],
): DemoOperationTheatre[] {
  const existingTheatres =
    readDemoOperationTheatres();

  const nextTheatres = [
    ...existingTheatres,
  ];

  let changed = false;

  branches.forEach(
    (branch) => {
      const defaults = [
        createDefaultTheatre(
          branch.id,
          {
            code: "OT-1",
            name:
              "Major Operation Theatre",
            floorName:
              "Surgical Floor",
          },
        ),

        createDefaultTheatre(
          branch.id,
          {
            code: "OT-2",
            name:
              "General Operation Theatre",
            floorName:
              "Surgical Floor",
          },
        ),

        createDefaultTheatre(
          branch.id,
          {
            code: "OT-3",
            name:
              "Minor Procedure Theatre",
            floorName:
              "Procedure Floor",
          },
        ),
      ];

      defaults.forEach(
        (theatre) => {
          if (
            !nextTheatres.some(
              (record) =>
                record.id ===
                theatre.id,
            )
          ) {
            nextTheatres.push(
              theatre,
            );

            changed = true;
          }
        },
      );
    },
  );

  if (changed) {
    writeDemoOperationTheatres(
      nextTheatres,
    );
  }

  return nextTheatres;
}

function calculateScheduledEndTime(
  startAt: string,
  durationMinutes: number,
): number {
  return (
    new Date(
      startAt,
    ).getTime() +
    durationMinutes *
      60 *
      1000
  );
}

function intervalsOverlap(
  firstStart: number,
  firstEnd: number,

  secondStart: number,
  secondEnd: number,
): boolean {
  return (
    firstStart < secondEnd &&
    secondStart < firstEnd
  );
}

export function validateDemoSurgicalCaseScheduling(
  input: {
    patientId: string;
    admissionId: string;

    branchId: string;
    theatreId: string;

    procedureName: string;
    preoperativeDiagnosis:
      string;

    urgency:
      DemoSurgicalUrgency;

    anesthesiaType:
      DemoSurgicalAnesthesiaType;

    scheduledStartAt: string;

    estimatedDurationMinutes:
      number;

    team:
      DemoSurgicalTeam;

    specialRequirements:
      string;

    scheduledBy: string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    input.patientId.trim() ===
    ""
  ) {
    errors.push(
      "Select the patient scheduled for surgery.",
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

  const theatre =
    readDemoOperationTheatres()
      .find(
        (record) =>
          record.id ===
          input.theatreId,
      );

  if (
    theatre === undefined
  ) {
    errors.push(
      "Select an operation theatre.",
    );
  } else {
    if (
      theatre.branchId !==
      input.branchId
    ) {
      errors.push(
        "The selected theatre belongs to another hospital branch.",
      );
    }

    if (
      theatre.status ===
      "maintenance"
    ) {
      errors.push(
        "A theatre under maintenance cannot receive a surgical booking.",
      );
    }
  }

  if (
    input.procedureName
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the planned surgical procedure.",
    );
  }

  if (
    input
      .preoperativeDiagnosis
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the preoperative diagnosis.",
    );
  }

  if (
    input.team.primarySurgeonId
      .trim() === ""
  ) {
    errors.push(
      "Select the primary surgeon.",
    );
  }

  if (
    input.anesthesiaType !==
      "local" &&
    input.team.anesthetistId
      .trim() === ""
  ) {
    errors.push(
      "Select the anesthetist for the planned anesthesia.",
    );
  }

  if (
    input.team.scrubNurse
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the scrub nurse.",
    );
  }

  if (
    input.team.circulatingNurse
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the circulating nurse.",
    );
  }

  const scheduledStart =
    new Date(
      input.scheduledStartAt,
    );

  if (
    input.scheduledStartAt ===
      "" ||
    Number.isNaN(
      scheduledStart.getTime(),
    )
  ) {
    errors.push(
      "Enter a valid scheduled date and time.",
    );
  }

  if (
    !Number.isFinite(
      input.estimatedDurationMinutes,
    ) ||
    input.estimatedDurationMinutes <
      15 ||
    input.estimatedDurationMinutes >
      720
  ) {
    errors.push(
      "Estimated duration must be between 15 and 720 minutes.",
    );
  }

  if (
    input.scheduledBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the staff member scheduling the operation.",
    );
  }

  if (
    input.admissionId !==
    ""
  ) {
    const admission =
      readDemoInpatientAdmissions()
        .find(
          (record) =>
            record.id ===
            input.admissionId,
        );

    if (
      admission === undefined
    ) {
      errors.push(
        "The selected inpatient admission could not be found.",
      );
    } else {
      if (
        admission.patientId !==
        input.patientId
      ) {
        errors.push(
          "The inpatient admission belongs to another patient.",
        );
      }

      if (
        admission.branchId !==
        input.branchId
      ) {
        errors.push(
          "The inpatient admission belongs to another hospital branch.",
        );
      }

      if (
        admission.status !==
          "admitted" &&
        admission.status !==
          "discharge-ready"
      ) {
        errors.push(
          "Only an active inpatient admission may be linked to surgery.",
        );
      }
    }
  }

  if (
    errors.length === 0
  ) {
    const startTime =
      scheduledStart.getTime();

    const endTime =
      calculateScheduledEndTime(
        input.scheduledStartAt,

        input.estimatedDurationMinutes,
      );

    const activeCases =
      readDemoSurgicalCases()
        .filter(
          (surgicalCase) =>
            surgicalCase.status !==
              "cancelled" &&
            surgicalCase.status !==
              "completed",
        );

    const theatreConflict =
      activeCases.some(
        (surgicalCase) =>
          surgicalCase.theatreId ===
            input.theatreId &&
          intervalsOverlap(
            startTime,
            endTime,

            new Date(
              surgicalCase.scheduledStartAt,
            ).getTime(),

            calculateScheduledEndTime(
              surgicalCase.scheduledStartAt,

              surgicalCase.estimatedDurationMinutes,
            ),
          ),
      );

    if (
      theatreConflict
    ) {
      errors.push(
        "The operation theatre already has another procedure during this time.",
      );
    }

    const surgeonConflict =
      activeCases.some(
        (surgicalCase) =>
          surgicalCase.team
            .primarySurgeonId ===
            input.team
              .primarySurgeonId &&
          intervalsOverlap(
            startTime,
            endTime,

            new Date(
              surgicalCase.scheduledStartAt,
            ).getTime(),

            calculateScheduledEndTime(
              surgicalCase.scheduledStartAt,

              surgicalCase.estimatedDurationMinutes,
            ),
          ),
      );

    if (
      surgeonConflict
    ) {
      errors.push(
        "The selected surgeon already has another operation during this time.",
      );
    }
  }

  return [
    ...new Set(errors),
  ];
}

export function scheduleDemoSurgicalCase(
  input: {
    patientId: string;
    admissionId: string;

    branchId: string;
    theatreId: string;

    procedureName: string;
    preoperativeDiagnosis:
      string;

    urgency:
      DemoSurgicalUrgency;

    anesthesiaType:
      DemoSurgicalAnesthesiaType;

    scheduledStartAt: string;

    estimatedDurationMinutes:
      number;

    team:
      DemoSurgicalTeam;

    specialRequirements:
      string;

    scheduledBy: string;
  },
): DemoSurgicalCase |
  undefined {
  const errors =
    validateDemoSurgicalCaseScheduling(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const surgicalCase:
    DemoSurgicalCase = {
    id:
      createIdentifier(
        "surgical-case",
      ),

    caseNumber:
      generateSurgicalCaseNumber(),

    patientId:
      input.patientId,

    admissionId:
      input.admissionId,

    branchId:
      input.branchId,

    theatreId:
      input.theatreId,

    procedureName:
      input.procedureName
        .trim(),

    preoperativeDiagnosis:
      input
        .preoperativeDiagnosis
        .trim(),

    urgency:
      input.urgency,

    anesthesiaType:
      input.anesthesiaType,

    scheduledStartAt:
      new Date(
        input.scheduledStartAt,
      ).toISOString(),

    estimatedDurationMinutes:
      Math.round(
        input.estimatedDurationMinutes,
      ),

    status: "scheduled",

    team: {
      primarySurgeonId:
        input.team
          .primarySurgeonId,

      assistantSurgeonId:
        input.team
          .assistantSurgeonId,

      anesthetistId:
        input.team
          .anesthetistId,

      scrubNurse:
        input.team
          .scrubNurse
          .trim(),

      circulatingNurse:
        input.team
          .circulatingNurse
          .trim(),
    },

    preoperativeChecklist:
      createDefaultPreoperativeChecklist(),

    intraoperativeRecord:
      createDefaultIntraoperativeRecord(),

    recoveryRecord:
      createDefaultRecoveryRecord(),

    specialRequirements:
      input
        .specialRequirements
        .trim(),

    scheduledBy:
      input.scheduledBy
        .trim(),

    cancelledBy: "",
    cancellationReason: "",
    cancelledAt: "",

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoSurgicalCases([
    surgicalCase,

    ...readDemoSurgicalCases(),
  ]);

  return surgicalCase;
}

export function validateDemoPreoperativeChecklist(
  checklist:
    DemoPreoperativeChecklist,
): string[] {
  const errors:
    string[] = [];

  if (
    !checklist
      .patientIdentityConfirmed
  ) {
    errors.push(
      "Patient identity must be confirmed.",
    );
  }

  if (
    !checklist.procedureConfirmed
  ) {
    errors.push(
      "The planned procedure must be confirmed.",
    );
  }

  if (
    !checklist.consentSigned
  ) {
    errors.push(
      "Signed surgical consent is required.",
    );
  }

  if (
    !checklist.procedureSiteMarked
  ) {
    errors.push(
      "The procedure site must be marked or confirmed as not applicable.",
    );
  }

  if (
    !checklist.allergiesReviewed
  ) {
    errors.push(
      "Patient allergies must be reviewed.",
    );
  }

  if (
    !checklist.fastingConfirmed
  ) {
    errors.push(
      "Fasting status must be confirmed.",
    );
  }

  if (
    !checklist
      .investigationsReviewed
  ) {
    errors.push(
      "Relevant investigations must be reviewed.",
    );
  }

  if (
    !checklist
      .anesthesiaAssessmentCompleted
  ) {
    errors.push(
      "The anesthesia assessment must be completed.",
    );
  }

  if (
    !checklist.equipmentReady
  ) {
    errors.push(
      "Required theatre equipment must be ready.",
    );
  }

  if (
    !checklist
      .prophylacticAntibioticsConfirmed
  ) {
    errors.push(
      "Antibiotic requirement must be confirmed.",
    );
  }

  if (
    checklist.bloodPreparation ===
    "pending"
  ) {
    errors.push(
      "Required blood preparation remains pending.",
    );
  }

  if (
    checklist.implantPreparation ===
    "pending"
  ) {
    errors.push(
      "Required implant preparation remains pending.",
    );
  }

  if (
    checklist.completedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the staff member completing the preoperative checklist.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function saveDemoPreoperativeChecklist(
  caseId: string,

  checklist:
    DemoPreoperativeChecklist,
): DemoSurgicalCase |
  undefined {
  const cases =
    readDemoSurgicalCases();

  const surgicalCase =
    cases.find(
      (record) =>
        record.id ===
        caseId,
    );

  if (
    surgicalCase === undefined ||
    (
      surgicalCase.status !==
        "scheduled" &&
      surgicalCase.status !==
        "pre-op-ready"
    )
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updatedCase:
    DemoSurgicalCase = {
    ...surgicalCase,

    preoperativeChecklist: {
      ...checklist,

      checklistNote:
        checklist.checklistNote
          .trim(),

      completedBy:
        checklist.completedBy
          .trim(),
    },

    updatedAt:
      timestamp,
  };

  writeDemoSurgicalCases(
    cases.map(
      (record) =>
        record.id ===
        surgicalCase.id
          ? updatedCase
          : record,
    ),
  );

  return updatedCase;
}

export function markDemoSurgicalCasePreoperativeReady(
  caseId: string,

  checklist:
    DemoPreoperativeChecklist,
): DemoSurgicalCase |
  undefined {
  const errors =
    validateDemoPreoperativeChecklist(
      checklist,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const savedCase =
    saveDemoPreoperativeChecklist(
      caseId,
      checklist,
    );

  if (
    savedCase === undefined ||
    savedCase.status !==
      "scheduled"
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const readyCase:
    DemoSurgicalCase = {
    ...savedCase,

    status:
      "pre-op-ready",

    preoperativeChecklist: {
      ...savedCase
        .preoperativeChecklist,

      completedAt:
        timestamp,
    },

    updatedAt:
      timestamp,
  };

  writeDemoSurgicalCases(
    readDemoSurgicalCases()
      .map(
        (record) =>
          record.id ===
          readyCase.id
            ? readyCase
            : record,
      ),
  );

  return readyCase;
}

export function startDemoSurgicalCase(
  input: {
    caseId: string;
    startedBy: string;
  },
): DemoSurgicalCase |
  undefined {
  const startedBy =
    input.startedBy.trim();

  if (
    startedBy.length < 2
  ) {
    return undefined;
  }

  const cases =
    readDemoSurgicalCases();

  const surgicalCase =
    cases.find(
      (record) =>
        record.id ===
        input.caseId,
    );

  if (
    surgicalCase === undefined ||
    surgicalCase.status !==
      "pre-op-ready"
  ) {
    return undefined;
  }

  const theatres =
    readDemoOperationTheatres();

  const theatre =
    theatres.find(
      (record) =>
        record.id ===
        surgicalCase.theatreId,
    );

  if (
    theatre === undefined ||
    theatre.status !==
      "available"
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updatedCase:
    DemoSurgicalCase = {
    ...surgicalCase,

    status: "in-surgery",

    intraoperativeRecord: {
      ...surgicalCase
        .intraoperativeRecord,

      actualStartAt:
        timestamp,

      recordedBy:
        startedBy,

      updatedAt:
        timestamp,
    },

    updatedAt:
      timestamp,
  };

  writeDemoOperationTheatres(
    theatres.map(
      (record) =>
        record.id ===
        theatre.id
          ? {
              ...record,

              status:
                "in-use",

              currentCaseId:
                surgicalCase.id,

              note:
                `${surgicalCase.caseNumber} in progress.`,

              updatedAt:
                timestamp,
            }
          : record,
    ),
  );

  writeDemoSurgicalCases(
    cases.map(
      (record) =>
        record.id ===
        surgicalCase.id
          ? updatedCase
          : record,
    ),
  );

  return updatedCase;
}

export function saveDemoIntraoperativeRecord(
  caseId: string,

  intraoperativeRecord:
    DemoIntraoperativeRecord,
): DemoSurgicalCase |
  undefined {
  const cases =
    readDemoSurgicalCases();

  const surgicalCase =
    cases.find(
      (record) =>
        record.id ===
        caseId,
    );

  if (
    surgicalCase === undefined ||
    surgicalCase.status !==
      "in-surgery"
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updatedCase:
    DemoSurgicalCase = {
    ...surgicalCase,

    intraoperativeRecord: {
      ...intraoperativeRecord,

      procedurePerformed:
        intraoperativeRecord
          .procedurePerformed
          .trim(),

      operativeFindings:
        intraoperativeRecord
          .operativeFindings
          .trim(),

      specimens:
        intraoperativeRecord
          .specimens
          .trim(),

      implants:
        intraoperativeRecord
          .implants
          .trim(),

      complications:
        intraoperativeRecord
          .complications
          .trim(),

      anesthesiaNotes:
        intraoperativeRecord
          .anesthesiaNotes
          .trim(),

      surgeonNotes:
        intraoperativeRecord
          .surgeonNotes
          .trim(),

      recordedBy:
        intraoperativeRecord
          .recordedBy
          .trim(),

      estimatedBloodLossMillilitres:
        Math.max(
          0,

          Math.round(
            intraoperativeRecord
              .estimatedBloodLossMillilitres,
          ),
        ),

      updatedAt:
        timestamp,
    },

    updatedAt:
      timestamp,
  };

  writeDemoSurgicalCases(
    cases.map(
      (record) =>
        record.id ===
        surgicalCase.id
          ? updatedCase
          : record,
    ),
  );

  return updatedCase;
}

export function validateDemoIntraoperativeRecord(
  record:
    DemoIntraoperativeRecord,
): string[] {
  const errors:
    string[] = [];

  const actualStart =
    new Date(
      record.actualStartAt,
    );

  const incision =
    new Date(
      record.incisionAt,
    );

  const actualEnd =
    new Date(
      record.actualEndAt,
    );

  if (
    record.actualStartAt ===
      "" ||
    Number.isNaN(
      actualStart.getTime(),
    )
  ) {
    errors.push(
      "Enter the actual theatre start time.",
    );
  }

  if (
    record.incisionAt === "" ||
    Number.isNaN(
      incision.getTime(),
    )
  ) {
    errors.push(
      "Enter the incision or procedure-start time.",
    );
  }

  if (
    record.actualEndAt ===
      "" ||
    Number.isNaN(
      actualEnd.getTime(),
    )
  ) {
    errors.push(
      "Enter the procedure end time.",
    );
  }

  if (
    !Number.isNaN(
      actualStart.getTime(),
    ) &&
    !Number.isNaN(
      incision.getTime(),
    ) &&
    incision.getTime() <
      actualStart.getTime()
  ) {
    errors.push(
      "The incision time cannot be earlier than theatre start.",
    );
  }

  if (
    !Number.isNaN(
      incision.getTime(),
    ) &&
    !Number.isNaN(
      actualEnd.getTime(),
    ) &&
    actualEnd.getTime() <
      incision.getTime()
  ) {
    errors.push(
      "The procedure end time cannot be earlier than the incision time.",
    );
  }

  if (
    record.procedurePerformed
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the procedure performed.",
    );
  }

  if (
    record.operativeFindings
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the operative findings.",
    );
  }

  if (
    !Number.isFinite(
      record
        .estimatedBloodLossMillilitres,
    ) ||
    record
      .estimatedBloodLossMillilitres <
      0
  ) {
    errors.push(
      "Estimated blood loss cannot be negative.",
    );
  }

  if (
    !record.instrumentCountCorrect
  ) {
    errors.push(
      "Instrument count must be confirmed correct.",
    );
  }

  if (
    !record.swabCountCorrect
  ) {
    errors.push(
      "Swab count must be confirmed correct.",
    );
  }

  if (
    !record.needleCountCorrect
  ) {
    errors.push(
      "Needle count must be confirmed correct.",
    );
  }

  if (
    record.recordedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the staff member completing the operative record.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function finishDemoSurgicalCase(
  caseId: string,

  intraoperativeRecord:
    DemoIntraoperativeRecord,
): DemoSurgicalCase |
  undefined {
  const errors =
    validateDemoIntraoperativeRecord(
      intraoperativeRecord,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const savedCase =
    saveDemoIntraoperativeRecord(
      caseId,
      intraoperativeRecord,
    );

  if (
    savedCase === undefined
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const recoveryCase:
    DemoSurgicalCase = {
    ...savedCase,

    status: "recovery",

    recoveryRecord: {
      ...savedCase
        .recoveryRecord,

      arrivedAt:
        timestamp,
    },

    updatedAt:
      timestamp,
  };

  writeDemoSurgicalCases(
    readDemoSurgicalCases()
      .map(
        (record) =>
          record.id ===
          recoveryCase.id
            ? recoveryCase
            : record,
      ),
  );

  writeDemoOperationTheatres(
    readDemoOperationTheatres()
      .map(
        (theatre) =>
          theatre.id ===
          recoveryCase.theatreId
            ? {
                ...theatre,

                status:
                  "cleaning",

                currentCaseId:
                  "",

                note:
                  `Cleaning after ${recoveryCase.caseNumber}.`,

                updatedAt:
                  timestamp,
              }
            : theatre,
      ),
  );

  return recoveryCase;
}

export function validateDemoRecoveryRecord(
  record:
    DemoRecoveryRecord,
): string[] {
  const errors:
    string[] = [];

  if (
    record.arrivedAt === "" ||
    Number.isNaN(
      new Date(
        record.arrivedAt,
      ).getTime(),
    )
  ) {
    errors.push(
      "Enter the recovery-room arrival time.",
    );
  }

  if (
    record.painScore < 0 ||
    record.painScore > 10
  ) {
    errors.push(
      "Pain score must be between 0 and 10.",
    );
  }

  if (
    record.oxygenSaturationPercent <
      50 ||
    record.oxygenSaturationPercent >
      100
  ) {
    errors.push(
      "Oxygen saturation must be between 50% and 100%.",
    );
  }

  if (
    record.consciousness ===
      "unresponsive"
  ) {
    errors.push(
      "An unresponsive patient cannot be discharged from recovery.",
    );
  }

  if (
    !record.airwayStable
  ) {
    errors.push(
      "The patient airway must be stable.",
    );
  }

  if (
    !record.circulationStable
  ) {
    errors.push(
      "The patient circulation must be stable.",
    );
  }

  if (
    !record.bleedingControlled
  ) {
    errors.push(
      "Postoperative bleeding must be controlled.",
    );
  }

  if (
    record.handedOverTo
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the ward, unit or staff receiving the patient.",
    );
  }

  if (
    record.completedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the recovery staff member completing the assessment.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function completeDemoSurgicalRecovery(
  caseId: string,

  recoveryRecord:
    DemoRecoveryRecord,
): DemoSurgicalCase |
  undefined {
  const errors =
    validateDemoRecoveryRecord(
      recoveryRecord,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const cases =
    readDemoSurgicalCases();

  const surgicalCase =
    cases.find(
      (record) =>
        record.id ===
        caseId,
    );

  if (
    surgicalCase === undefined ||
    surgicalCase.status !==
      "recovery"
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const completedCase:
    DemoSurgicalCase = {
    ...surgicalCase,

    status: "completed",

    recoveryRecord: {
      ...recoveryRecord,

      recoveryNote:
        recoveryRecord
          .recoveryNote
          .trim(),

      handedOverTo:
        recoveryRecord
          .handedOverTo
          .trim(),

      completedBy:
        recoveryRecord
          .completedBy
          .trim(),

      completedAt:
        timestamp,
    },

    updatedAt:
      timestamp,
  };

  writeDemoSurgicalCases(
    cases.map(
      (record) =>
        record.id ===
        surgicalCase.id
          ? completedCase
          : record,
    ),
  );

  return completedCase;
}

export function cancelDemoSurgicalCase(
  input: {
    caseId: string;

    cancelledBy: string;
    cancellationReason:
      string;
  },
): DemoSurgicalCase |
  undefined {
  const cancelledBy =
    input.cancelledBy.trim();

  const cancellationReason =
    input.cancellationReason
      .trim();

  if (
    cancelledBy.length < 2 ||
    cancellationReason.length <
      3
  ) {
    return undefined;
  }

  const cases =
    readDemoSurgicalCases();

  const surgicalCase =
    cases.find(
      (record) =>
        record.id ===
        input.caseId,
    );

  if (
    surgicalCase === undefined ||
    (
      surgicalCase.status !==
        "scheduled" &&
      surgicalCase.status !==
        "pre-op-ready"
    )
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const cancelledCase:
    DemoSurgicalCase = {
    ...surgicalCase,

    status: "cancelled",

    cancelledBy,
    cancellationReason,

    cancelledAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  writeDemoSurgicalCases(
    cases.map(
      (record) =>
        record.id ===
        surgicalCase.id
          ? cancelledCase
          : record,
    ),
  );

  return cancelledCase;
}

export function updateDemoOperationTheatreStatus(
  input: {
    theatreId: string;

    status:
      Exclude<
        DemoOperationTheatreStatus,
        "in-use"
      >;

    note: string;
  },
): DemoOperationTheatre |
  undefined {
  const theatres =
    readDemoOperationTheatres();

  const theatre =
    theatres.find(
      (record) =>
        record.id ===
        input.theatreId,
    );

  if (
    theatre === undefined ||
    theatre.status ===
      "in-use" ||
    theatre.currentCaseId !==
      ""
  ) {
    return undefined;
  }

  const updatedTheatre:
    DemoOperationTheatre = {
    ...theatre,

    status:
      input.status,

    note:
      input.note.trim(),

    updatedAt:
      new Date().toISOString(),
  };

  writeDemoOperationTheatres(
    theatres.map(
      (record) =>
        record.id ===
        theatre.id
          ? updatedTheatre
          : record,
    ),
  );

  return updatedTheatre;
}

export function buildDemoOperationTheatreSummary(
  branchId = "",
): DemoOperationTheatreSummary {
  const theatres =
    readDemoOperationTheatres()
      .filter(
        (theatre) =>
          branchId === "" ||
          theatre.branchId ===
            branchId,
      );

  const cases =
    readDemoSurgicalCases()
      .filter(
        (surgicalCase) =>
          branchId === "" ||
          surgicalCase.branchId ===
            branchId,
      );

  return {
    totalTheatres:
      theatres.length,

    availableTheatres:
      theatres.filter(
        (theatre) =>
          theatre.status ===
          "available",
      ).length,

    theatresInUse:
      theatres.filter(
        (theatre) =>
          theatre.status ===
          "in-use",
      ).length,

    cleaningTheatres:
      theatres.filter(
        (theatre) =>
          theatre.status ===
          "cleaning",
      ).length,

    maintenanceTheatres:
      theatres.filter(
        (theatre) =>
          theatre.status ===
          "maintenance",
      ).length,

    scheduledCases:
      cases.filter(
        (surgicalCase) =>
          surgicalCase.status ===
          "scheduled",
      ).length,

    preoperativeReadyCases:
      cases.filter(
        (surgicalCase) =>
          surgicalCase.status ===
          "pre-op-ready",
      ).length,

    surgeriesInProgress:
      cases.filter(
        (surgicalCase) =>
          surgicalCase.status ===
          "in-surgery",
      ).length,

    recoveryCases:
      cases.filter(
        (surgicalCase) =>
          surgicalCase.status ===
          "recovery",
      ).length,
  };
}