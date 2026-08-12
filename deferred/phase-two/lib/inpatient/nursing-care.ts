import {
  readDemoInpatientAdmissions,
} from "./ward-management";

import type {
  DemoInpatientAdmission,
} from "./ward-management";

export type DemoNursingShift =
  | "day"
  | "evening"
  | "night";

export type DemoNursingConsciousness =
  | "alert"
  | "responds-to-voice"
  | "responds-to-pain"
  | "unresponsive";

export type DemoNursingOxygenSupport =
  | "room-air"
  | "nasal-cannula"
  | "face-mask"
  | "non-rebreather-mask"
  | "other";

export type DemoNursingVitalAlert =
  | "stable"
  | "observe"
  | "urgent";

export type DemoNursingFluidDirection =
  | "intake"
  | "output";

export type DemoNursingFluidCategory =
  | "oral"
  | "intravenous"
  | "tube-feed"
  | "blood-product"
  | "urine"
  | "drain"
  | "vomit"
  | "stool"
  | "other";

export type DemoNursingMedicationRoute =
  | "oral"
  | "intravenous"
  | "intramuscular"
  | "subcutaneous"
  | "inhaled"
  | "topical"
  | "rectal"
  | "other";

export type DemoNursingMedicationStatus =
  | "scheduled"
  | "administered"
  | "withheld"
  | "refused"
  | "missed";

export type DemoNursingHandoverStatus =
  | "draft"
  | "completed";

export interface DemoNursingVitalObservation {
  id: string;

  admissionId: string;
  patientId: string;
  branchId: string;

  temperatureCelsius: number;

  pulsePerMinute: number;
  respiratoryRatePerMinute: number;

  systolicBloodPressure: number;
  diastolicBloodPressure: number;

  oxygenSaturationPercent: number;

  painScore: number;

  consciousness:
    DemoNursingConsciousness;

  oxygenSupport:
    DemoNursingOxygenSupport;

  alertLevel:
    DemoNursingVitalAlert;

  observationNote: string;

  recordedBy: string;
  observedAt: string;

  createdAt: string;
}

export interface DemoNursingFluidEntry {
  id: string;

  admissionId: string;
  patientId: string;
  branchId: string;

  direction:
    DemoNursingFluidDirection;

  category:
    DemoNursingFluidCategory;

  amountMillilitres: number;

  description: string;

  recordedBy: string;
  recordedAt: string;

  createdAt: string;
}

export interface DemoNursingFluidSummary {
  intakeMillilitres: number;
  outputMillilitres: number;

  netBalanceMillilitres: number;

  entryCount: number;
}

export interface DemoNursingMedicationAdministration {
  id: string;

  admissionId: string;
  patientId: string;
  branchId: string;

  medicineName: string;
  dose: string;

  route:
    DemoNursingMedicationRoute;

  scheduledAt: string;

  status:
    DemoNursingMedicationStatus;

  orderedBy: string;
  administrationInstructions:
    string;

  actionedBy: string;
  actionedAt: string;

  actionReason: string;
  administrationNote: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoNursingHandover {
  id: string;

  handoverNumber: string;

  admissionId: string;
  patientId: string;
  branchId: string;

  shift:
    DemoNursingShift;

  handoverDate: string;

  status:
    DemoNursingHandoverStatus;

  fromNurse: string;
  toNurse: string;

  situation: string;
  background: string;
  assessment: string;
  recommendation: string;

  safetyRisks: string;
  pendingTasks: string;

  completedAt: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoNursingCareSummary {
  latestVital:
    DemoNursingVitalObservation |
    undefined;

  fluidBalance:
    DemoNursingFluidSummary;

  scheduledMedicationCount:
    number;

  overdueMedicationCount:
    number;

  completedHandoverCount:
    number;
}

const NURSING_VITAL_STORAGE_KEY =
  "wonflow-demo-nursing-vital-observations";

const NURSING_FLUID_STORAGE_KEY =
  "wonflow-demo-nursing-fluid-balance";

const NURSING_MEDICATION_STORAGE_KEY =
  "wonflow-demo-nursing-medication-administration";

const NURSING_HANDOVER_STORAGE_KEY =
  "wonflow-demo-nursing-handovers";

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

function createDateCode(
  date = new Date(),
): string {
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

function generateHandoverNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `HND-${createDateCode()}-${randomPart}`;
}

function roundNumber(
  value: number,
  decimals = 1,
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  const multiplier =
    10 ** decimals;

  return (
    Math.round(
      value * multiplier,
    ) / multiplier
  );
}

function readStoredArray<T>(
  storageKey: string,
): T[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      storageKey,
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
  storageKey: string,

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
    storageKey,

    JSON.stringify(
      records.slice(0, 10_000),
    ),
  );

  window.dispatchEvent(
    new Event(eventName),
  );
}

function getActiveAdmission(
  admissionId: string,
): DemoInpatientAdmission |
  undefined {
  return readDemoInpatientAdmissions()
    .find(
      (admission) =>
        admission.id ===
          admissionId &&
        (
          admission.status ===
            "admitted" ||
          admission.status ===
            "discharge-ready"
        ),
    );
}

export function calculateDemoNursingVitalAlert(
  input: {
    temperatureCelsius:
      number;

    pulsePerMinute: number;

    respiratoryRatePerMinute:
      number;

    systolicBloodPressure:
      number;

    diastolicBloodPressure:
      number;

    oxygenSaturationPercent:
      number;

    consciousness:
      DemoNursingConsciousness;
  },
): DemoNursingVitalAlert {
  const urgent =
    input.temperatureCelsius <
      35 ||
    input.temperatureCelsius >
      39.5 ||
    input.pulsePerMinute <
      40 ||
    input.pulsePerMinute >
      130 ||
    input
      .respiratoryRatePerMinute <
      8 ||
    input
      .respiratoryRatePerMinute >
      30 ||
    input.systolicBloodPressure <
      90 ||
    input.systolicBloodPressure >
      180 ||
    input.diastolicBloodPressure >
      120 ||
    input.oxygenSaturationPercent <
      90 ||
    input.consciousness !==
      "alert";

  if (urgent) {
    return "urgent";
  }

  const observe =
    input.temperatureCelsius <
      36 ||
    input.temperatureCelsius >
      38 ||
    input.pulsePerMinute <
      50 ||
    input.pulsePerMinute >
      110 ||
    input
      .respiratoryRatePerMinute <
      10 ||
    input
      .respiratoryRatePerMinute >
      24 ||
    input.systolicBloodPressure <
      100 ||
    input.systolicBloodPressure >
      160 ||
    input.oxygenSaturationPercent <
      94;

  return observe
    ? "observe"
    : "stable";
}

export function readDemoNursingVitalObservations():
  DemoNursingVitalObservation[] {
  return readStoredArray<
    DemoNursingVitalObservation
  >(
    NURSING_VITAL_STORAGE_KEY,
  );
}

export function writeDemoNursingVitalObservations(
  observations:
    readonly DemoNursingVitalObservation[],
): void {
  writeStoredArray(
    NURSING_VITAL_STORAGE_KEY,

    "wonflow:demo-nursing-vitals-changed",

    observations,
  );
}

export function validateDemoNursingVitalObservation(
  input: {
    admissionId: string;

    temperatureCelsius:
      number;

    pulsePerMinute: number;

    respiratoryRatePerMinute:
      number;

    systolicBloodPressure:
      number;

    diastolicBloodPressure:
      number;

    oxygenSaturationPercent:
      number;

    painScore: number;

    consciousness:
      DemoNursingConsciousness;

    oxygenSupport:
      DemoNursingOxygenSupport;

    observationNote: string;

    recordedBy: string;
    observedAt: string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    getActiveAdmission(
      input.admissionId,
    ) === undefined
  ) {
    errors.push(
      "Select an active inpatient admission.",
    );
  }

  if (
    input.temperatureCelsius <
      30 ||
    input.temperatureCelsius >
      45
  ) {
    errors.push(
      "Temperature must be between 30°C and 45°C.",
    );
  }

  if (
    input.pulsePerMinute < 20 ||
    input.pulsePerMinute > 250
  ) {
    errors.push(
      "Pulse must be between 20 and 250 beats per minute.",
    );
  }

  if (
    input
      .respiratoryRatePerMinute <
      4 ||
    input
      .respiratoryRatePerMinute >
      80
  ) {
    errors.push(
      "Respiratory rate must be between 4 and 80 breaths per minute.",
    );
  }

  if (
    input.systolicBloodPressure <
      50 ||
    input.systolicBloodPressure >
      260
  ) {
    errors.push(
      "Systolic blood pressure must be between 50 and 260.",
    );
  }

  if (
    input.diastolicBloodPressure <
      30 ||
    input.diastolicBloodPressure >
      180
  ) {
    errors.push(
      "Diastolic blood pressure must be between 30 and 180.",
    );
  }

  if (
    input.systolicBloodPressure <=
    input.diastolicBloodPressure
  ) {
    errors.push(
      "Systolic pressure must be greater than diastolic pressure.",
    );
  }

  if (
    input.oxygenSaturationPercent <
      50 ||
    input.oxygenSaturationPercent >
      100
  ) {
    errors.push(
      "Oxygen saturation must be between 50% and 100%.",
    );
  }

  if (
    input.painScore < 0 ||
    input.painScore > 10
  ) {
    errors.push(
      "Pain score must be between 0 and 10.",
    );
  }

  if (
    input.recordedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the nurse recording the observation.",
    );
  }

  const observedDate =
    new Date(input.observedAt);

  if (
    input.observedAt === "" ||
    Number.isNaN(
      observedDate.getTime(),
    )
  ) {
    errors.push(
      "Enter a valid observation date and time.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function createDemoNursingVitalObservation(
  input: {
    admissionId: string;

    temperatureCelsius:
      number;

    pulsePerMinute: number;

    respiratoryRatePerMinute:
      number;

    systolicBloodPressure:
      number;

    diastolicBloodPressure:
      number;

    oxygenSaturationPercent:
      number;

    painScore: number;

    consciousness:
      DemoNursingConsciousness;

    oxygenSupport:
      DemoNursingOxygenSupport;

    observationNote: string;

    recordedBy: string;
    observedAt: string;
  },
): DemoNursingVitalObservation |
  undefined {
  const errors =
    validateDemoNursingVitalObservation(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const admission =
    getActiveAdmission(
      input.admissionId,
    );

  if (
    admission === undefined
  ) {
    return undefined;
  }

  const alertLevel =
    calculateDemoNursingVitalAlert(
      input,
    );

  const timestamp =
    new Date().toISOString();

  const observation:
    DemoNursingVitalObservation = {
    id:
      createIdentifier(
        "nursing-vital",
      ),

    admissionId:
      admission.id,

    patientId:
      admission.patientId,

    branchId:
      admission.branchId,

    temperatureCelsius:
      roundNumber(
        input.temperatureCelsius,
      ),

    pulsePerMinute:
      Math.round(
        input.pulsePerMinute,
      ),

    respiratoryRatePerMinute:
      Math.round(
        input
          .respiratoryRatePerMinute,
      ),

    systolicBloodPressure:
      Math.round(
        input
          .systolicBloodPressure,
      ),

    diastolicBloodPressure:
      Math.round(
        input
          .diastolicBloodPressure,
      ),

    oxygenSaturationPercent:
      Math.round(
        input
          .oxygenSaturationPercent,
      ),

    painScore:
      Math.round(
        input.painScore,
      ),

    consciousness:
      input.consciousness,

    oxygenSupport:
      input.oxygenSupport,

    alertLevel,

    observationNote:
      input.observationNote
        .trim(),

    recordedBy:
      input.recordedBy.trim(),

    observedAt:
      new Date(
        input.observedAt,
      ).toISOString(),

    createdAt: timestamp,
  };

  writeDemoNursingVitalObservations([
    observation,

    ...readDemoNursingVitalObservations(),
  ]);

  return observation;
}

export function readDemoNursingFluidEntries():
  DemoNursingFluidEntry[] {
  return readStoredArray<
    DemoNursingFluidEntry
  >(
    NURSING_FLUID_STORAGE_KEY,
  );
}

export function writeDemoNursingFluidEntries(
  entries:
    readonly DemoNursingFluidEntry[],
): void {
  writeStoredArray(
    NURSING_FLUID_STORAGE_KEY,

    "wonflow:demo-nursing-fluids-changed",

    entries,
  );
}

export function validateDemoNursingFluidEntry(
  input: {
    admissionId: string;

    direction:
      DemoNursingFluidDirection;

    category:
      DemoNursingFluidCategory;

    amountMillilitres: number;

    description: string;

    recordedBy: string;
    recordedAt: string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    getActiveAdmission(
      input.admissionId,
    ) === undefined
  ) {
    errors.push(
      "Select an active inpatient admission.",
    );
  }

  if (
    !Number.isFinite(
      input.amountMillilitres,
    ) ||
    input.amountMillilitres <=
      0 ||
    input.amountMillilitres >
      10_000
  ) {
    errors.push(
      "Fluid amount must be between 1 mL and 10,000 mL.",
    );
  }

  if (
    input.recordedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the nurse recording the fluid entry.",
    );
  }

  const recordedDate =
    new Date(input.recordedAt);

  if (
    input.recordedAt === "" ||
    Number.isNaN(
      recordedDate.getTime(),
    )
  ) {
    errors.push(
      "Enter a valid fluid-entry date and time.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function createDemoNursingFluidEntry(
  input: {
    admissionId: string;

    direction:
      DemoNursingFluidDirection;

    category:
      DemoNursingFluidCategory;

    amountMillilitres: number;

    description: string;

    recordedBy: string;
    recordedAt: string;
  },
): DemoNursingFluidEntry |
  undefined {
  const errors =
    validateDemoNursingFluidEntry(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const admission =
    getActiveAdmission(
      input.admissionId,
    );

  if (
    admission === undefined
  ) {
    return undefined;
  }

  const entry:
    DemoNursingFluidEntry = {
    id:
      createIdentifier(
        "nursing-fluid",
      ),

    admissionId:
      admission.id,

    patientId:
      admission.patientId,

    branchId:
      admission.branchId,

    direction:
      input.direction,

    category:
      input.category,

    amountMillilitres:
      Math.round(
        input.amountMillilitres,
      ),

    description:
      input.description.trim(),

    recordedBy:
      input.recordedBy.trim(),

    recordedAt:
      new Date(
        input.recordedAt,
      ).toISOString(),

    createdAt:
      new Date().toISOString(),
  };

  writeDemoNursingFluidEntries([
    entry,

    ...readDemoNursingFluidEntries(),
  ]);

  return entry;
}

export function buildDemoNursingFluidSummary(
  admissionId: string,

  hours = 24,
): DemoNursingFluidSummary {
  const threshold =
    Date.now() -
    hours *
      60 *
      60 *
      1000;

  const entries =
    readDemoNursingFluidEntries()
      .filter(
        (entry) =>
          entry.admissionId ===
            admissionId &&
          new Date(
            entry.recordedAt,
          ).getTime() >=
            threshold,
      );

  const intakeMillilitres =
    entries
      .filter(
        (entry) =>
          entry.direction ===
          "intake",
      )
      .reduce(
        (
          total,
          entry,
        ) =>
          total +
          entry.amountMillilitres,

        0,
      );

  const outputMillilitres =
    entries
      .filter(
        (entry) =>
          entry.direction ===
          "output",
      )
      .reduce(
        (
          total,
          entry,
        ) =>
          total +
          entry.amountMillilitres,

        0,
      );

  return {
    intakeMillilitres,

    outputMillilitres,

    netBalanceMillilitres:
      intakeMillilitres -
      outputMillilitres,

    entryCount:
      entries.length,
  };
}

export function readDemoNursingMedicationAdministrations():
  DemoNursingMedicationAdministration[] {
  return readStoredArray<
    DemoNursingMedicationAdministration
  >(
    NURSING_MEDICATION_STORAGE_KEY,
  );
}

export function writeDemoNursingMedicationAdministrations(
  records:
    readonly DemoNursingMedicationAdministration[],
): void {
  writeStoredArray(
    NURSING_MEDICATION_STORAGE_KEY,

    "wonflow:demo-nursing-medications-changed",

    records,
  );
}

export function validateDemoNursingMedicationSchedule(
  input: {
    admissionId: string;

    medicineName: string;
    dose: string;

    route:
      DemoNursingMedicationRoute;

    scheduledAt: string;

    orderedBy: string;

    administrationInstructions:
      string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    getActiveAdmission(
      input.admissionId,
    ) === undefined
  ) {
    errors.push(
      "Select an active inpatient admission.",
    );
  }

  if (
    input.medicineName
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the medicine name.",
    );
  }

  if (
    input.dose.trim().length <
      1
  ) {
    errors.push(
      "Enter the prescribed dose.",
    );
  }

  const scheduledDate =
    new Date(input.scheduledAt);

  if (
    input.scheduledAt === "" ||
    Number.isNaN(
      scheduledDate.getTime(),
    )
  ) {
    errors.push(
      "Enter a valid medication schedule date and time.",
    );
  }

  if (
    input.orderedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the doctor or authorized prescriber.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function createDemoNursingMedicationSchedule(
  input: {
    admissionId: string;

    medicineName: string;
    dose: string;

    route:
      DemoNursingMedicationRoute;

    scheduledAt: string;

    orderedBy: string;

    administrationInstructions:
      string;
  },
): DemoNursingMedicationAdministration |
  undefined {
  const errors =
    validateDemoNursingMedicationSchedule(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const admission =
    getActiveAdmission(
      input.admissionId,
    );

  if (
    admission === undefined
  ) {
    return undefined;
  }

  const records =
    readDemoNursingMedicationAdministrations();

  const scheduledAt =
    new Date(
      input.scheduledAt,
    ).toISOString();

  const duplicate =
    records.some(
      (record) =>
        record.admissionId ===
          admission.id &&
        record.medicineName
          .trim()
          .toLocaleLowerCase() ===
          input.medicineName
            .trim()
            .toLocaleLowerCase() &&
        record.scheduledAt ===
          scheduledAt,
    );

  if (duplicate) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const record:
    DemoNursingMedicationAdministration =
    {
      id:
        createIdentifier(
          "nursing-medication",
        ),

      admissionId:
        admission.id,

      patientId:
        admission.patientId,

      branchId:
        admission.branchId,

      medicineName:
        input.medicineName
          .trim(),

      dose:
        input.dose.trim(),

      route:
        input.route,

      scheduledAt,

      status: "scheduled",

      orderedBy:
        input.orderedBy.trim(),

      administrationInstructions:
        input
          .administrationInstructions
          .trim(),

      actionedBy: "",
      actionedAt: "",

      actionReason: "",

      administrationNote:
        "",

      createdAt: timestamp,
      updatedAt: timestamp,
    };

  writeDemoNursingMedicationAdministrations([
    record,
    ...records,
  ]);

  return record;
}

export function recordDemoNursingMedicationAction(
  input: {
    medicationId: string;

    status:
      Exclude<
        DemoNursingMedicationStatus,
        "scheduled"
      >;

    actionedBy: string;

    actionReason: string;

    administrationNote:
      string;
  },
): DemoNursingMedicationAdministration |
  undefined {
  const records =
    readDemoNursingMedicationAdministrations();

  const record =
    records.find(
      (medication) =>
        medication.id ===
        input.medicationId,
    );

  if (
    record === undefined ||
    record.status !==
      "scheduled"
  ) {
    return undefined;
  }

  const actionedBy =
    input.actionedBy.trim();

  const actionReason =
    input.actionReason.trim();

  if (
    actionedBy.length < 2
  ) {
    return undefined;
  }

  if (
    input.status !==
      "administered" &&
    actionReason.length < 3
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updatedRecord:
    DemoNursingMedicationAdministration =
    {
      ...record,

      status:
        input.status,

      actionedBy,

      actionedAt:
        timestamp,

      actionReason,

      administrationNote:
        input
          .administrationNote
          .trim(),

      updatedAt:
        timestamp,
    };

  writeDemoNursingMedicationAdministrations(
    records.map(
      (medication) =>
        medication.id ===
        record.id
          ? updatedRecord
          : medication,
    ),
  );

  return updatedRecord;
}

export function readDemoNursingHandovers():
  DemoNursingHandover[] {
  return readStoredArray<
    DemoNursingHandover
  >(
    NURSING_HANDOVER_STORAGE_KEY,
  );
}

export function writeDemoNursingHandovers(
  handovers:
    readonly DemoNursingHandover[],
): void {
  writeStoredArray(
    NURSING_HANDOVER_STORAGE_KEY,

    "wonflow:demo-nursing-handovers-changed",

    handovers,
  );
}

export function createOrGetDemoNursingHandover(
  admissionId: string,

  shift:
    DemoNursingShift,
): DemoNursingHandover |
  undefined {
  const admission =
    getActiveAdmission(
      admissionId,
    );

  if (
    admission === undefined
  ) {
    return undefined;
  }

  const handovers =
    readDemoNursingHandovers();

  const handoverDate =
    new Date()
      .toISOString()
      .slice(0, 10);

  const existingHandover =
    handovers.find(
      (handover) =>
        handover.admissionId ===
          admission.id &&
        handover.shift ===
          shift &&
        handover.handoverDate ===
          handoverDate &&
        handover.status ===
          "draft",
    );

  if (
    existingHandover !==
    undefined
  ) {
    return existingHandover;
  }

  const timestamp =
    new Date().toISOString();

  const handover:
    DemoNursingHandover = {
    id:
      createIdentifier(
        "nursing-handover",
      ),

    handoverNumber:
      generateHandoverNumber(),

    admissionId:
      admission.id,

    patientId:
      admission.patientId,

    branchId:
      admission.branchId,

    shift,

    handoverDate,

    status: "draft",

    fromNurse: "",
    toNurse: "",

    situation: "",
    background: "",
    assessment: "",
    recommendation: "",

    safetyRisks: "",
    pendingTasks: "",

    completedAt: "",

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoNursingHandovers([
    handover,
    ...handovers,
  ]);

  return handover;
}

export function saveDemoNursingHandover(
  handover:
    DemoNursingHandover,
): DemoNursingHandover {
  const handovers =
    readDemoNursingHandovers();

  const normalizedHandover:
    DemoNursingHandover = {
    ...handover,

    fromNurse:
      handover.fromNurse
        .trim(),

    toNurse:
      handover.toNurse
        .trim(),

    situation:
      handover.situation
        .trim(),

    background:
      handover.background
        .trim(),

    assessment:
      handover.assessment
        .trim(),

    recommendation:
      handover.recommendation
        .trim(),

    safetyRisks:
      handover.safetyRisks
        .trim(),

    pendingTasks:
      handover.pendingTasks
        .trim(),

    updatedAt:
      new Date().toISOString(),
  };

  const exists =
    handovers.some(
      (record) =>
        record.id ===
        normalizedHandover.id,
    );

  writeDemoNursingHandovers(
    exists
      ? handovers.map(
          (record) =>
            record.id ===
            normalizedHandover.id
              ? normalizedHandover
              : record,
        )
      : [
          normalizedHandover,
          ...handovers,
        ],
  );

  return normalizedHandover;
}

export function validateDemoNursingHandover(
  handover:
    DemoNursingHandover,
): string[] {
  const errors:
    string[] = [];

  if (
    handover.status !==
    "draft"
  ) {
    errors.push(
      "Only a draft handover may be completed.",
    );
  }

  if (
    handover.fromNurse
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the outgoing nurse.",
    );
  }

  if (
    handover.toNurse
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the incoming nurse.",
    );
  }

  if (
    handover.situation
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the current patient situation.",
    );
  }

  if (
    handover.background
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the relevant clinical background.",
    );
  }

  if (
    handover.assessment
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the nursing assessment.",
    );
  }

  if (
    handover.recommendation
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the next-shift recommendation.",
    );
  }

  if (
    handover.safetyRisks
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the patient safety risks or write none.",
    );
  }

  if (
    handover.pendingTasks
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the pending tasks or write none.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function completeDemoNursingHandover(
  handover:
    DemoNursingHandover,
): DemoNursingHandover |
  undefined {
  const errors =
    validateDemoNursingHandover(
      handover,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoNursingHandover({
    ...handover,

    status: "completed",

    completedAt:
      timestamp,

    updatedAt:
      timestamp,
  });
}

export function buildDemoNursingCareSummary(
  admissionId: string,
): DemoNursingCareSummary {
  const latestVital =
    readDemoNursingVitalObservations()
      .filter(
        (observation) =>
          observation.admissionId ===
          admissionId,
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

  const medications =
    readDemoNursingMedicationAdministrations()
      .filter(
        (medication) =>
          medication.admissionId ===
          admissionId,
      );

  const currentTime =
    Date.now();

  return {
    latestVital,

    fluidBalance:
      buildDemoNursingFluidSummary(
        admissionId,
      ),

    scheduledMedicationCount:
      medications.filter(
        (medication) =>
          medication.status ===
          "scheduled",
      ).length,

    overdueMedicationCount:
      medications.filter(
        (medication) =>
          medication.status ===
            "scheduled" &&
          new Date(
            medication.scheduledAt,
          ).getTime() <
            currentTime,
      ).length,

    completedHandoverCount:
      readDemoNursingHandovers()
        .filter(
          (handover) =>
            handover.admissionId ===
              admissionId &&
            handover.status ===
              "completed",
        ).length,
  };
}