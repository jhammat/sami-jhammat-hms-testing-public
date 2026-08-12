import type {
  DemoClinicalEncounter,
} from "./encounters";

export type DemoClinicalDocumentationStatus =
  | "draft"
  | "completed";

export type DemoClinicalKnowledgeStatus =
  | "unknown"
  | "none-known"
  | "documented";

export type DemoAllergySeverity =
  | "mild"
  | "moderate"
  | "severe"
  | "unknown";

export type DemoDiagnosisType =
  | "provisional"
  | "differential"
  | "confirmed";

export type DemoClinicalOrderType =
  | "laboratory"
  | "radiology"
  | "procedure"
  | "referral";

export type DemoMedicationRoute =
  | "oral"
  | "intravenous"
  | "intramuscular"
  | "subcutaneous"
  | "topical"
  | "inhalation"
  | "sublingual"
  | "rectal"
  | "other";

export interface DemoClinicalAllergy {
  id: string;

  substance: string;
  reaction: string;

  severity:
    DemoAllergySeverity;
}

export interface DemoCurrentMedication {
  id: string;

  medicineName: string;
  dose: string;
  frequency: string;
}

export interface DemoClinicalVitals {
  temperatureCelsius: string;

  pulsePerMinute: string;

  respiratoryRatePerMinute:
    string;

  systolicBloodPressure:
    string;

  diastolicBloodPressure:
    string;

  oxygenSaturationPercent:
    string;

  weightKilograms: string;
  heightCentimeters: string;

  painScore: string;
}

export interface DemoClinicalExamination {
  generalAppearance: string;

  cardiovascular: string;
  respiratory: string;
  abdomen: string;
  neurological: string;

  musculoskeletal: string;
  ent: string;
  skin: string;

  otherFindings: string;
}

export interface DemoClinicalDiagnosis {
  id: string;

  diagnosis: string;
  icdCode: string;

  type:
    DemoDiagnosisType;

  notes: string;
}

export interface DemoClinicalOrder {
  id: string;

  type:
    DemoClinicalOrderType;

  orderName: string;

  priority:
    "routine" |
    "urgent";

  instructions: string;
}

export interface DemoClinicalPrescriptionItem {
  id: string;

  medicineName: string;

  strength: string;
  dosage: string;

  route:
    DemoMedicationRoute;

  frequency: string;
  duration: string;

  quantity: string;

  instructions: string;
}

export interface DemoClinicalDocumentation {
  id: string;

  encounterId: string;
  patientId: string;

  practitionerId: string;
  branchId: string;

  status:
    DemoClinicalDocumentationStatus;

  chiefComplaint: string;

  historyOfPresentIllness:
    string;

  pastMedicalHistory: string;
  pastSurgicalHistory: string;

  familyHistory: string;
  socialHistory: string;

  allergyStatus:
    DemoClinicalKnowledgeStatus;

  allergies:
    DemoClinicalAllergy[];

  currentMedicationStatus:
    DemoClinicalKnowledgeStatus;

  currentMedications:
    DemoCurrentMedication[];

  vitals:
    DemoClinicalVitals;

  examination:
    DemoClinicalExamination;

  diagnoses:
    DemoClinicalDiagnosis[];

  orders:
    DemoClinicalOrder[];

  prescriptions:
    DemoClinicalPrescriptionItem[];

  clinicalAdvice: string;
  followUpPlan: string;

  createdAt: string;
  updatedAt: string;

  completedAt?: string;
}

export interface DemoClinicalDocumentationErrors {
  chiefComplaint?: string;

  historyOfPresentIllness?:
    string;

  allergyStatus?: string;

  currentMedicationStatus?:
    string;

  vitals?: string;

  diagnoses?: string;

  followUpPlan?: string;
}

const DEMO_CLINICAL_DOCUMENTATION_STORAGE_KEY =
  "wonflow-demo-clinical-documentation";

function createClinicalIdentifier(
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

export function createEmptyClinicalAllergy():
  DemoClinicalAllergy {
  return {
    id:
      createClinicalIdentifier(
        "allergy",
      ),

    substance: "",
    reaction: "",

    severity: "unknown",
  };
}

export function createEmptyCurrentMedication():
  DemoCurrentMedication {
  return {
    id:
      createClinicalIdentifier(
        "current-medication",
      ),

    medicineName: "",
    dose: "",
    frequency: "",
  };
}

export function createEmptyClinicalDiagnosis():
  DemoClinicalDiagnosis {
  return {
    id:
      createClinicalIdentifier(
        "diagnosis",
      ),

    diagnosis: "",
    icdCode: "",

    type: "provisional",

    notes: "",
  };
}

export function createEmptyClinicalOrder():
  DemoClinicalOrder {
  return {
    id:
      createClinicalIdentifier(
        "clinical-order",
      ),

    type: "laboratory",

    orderName: "",

    priority: "routine",

    instructions: "",
  };
}

export function createEmptyPrescriptionItem():
  DemoClinicalPrescriptionItem {
  return {
    id:
      createClinicalIdentifier(
        "prescription",
      ),

    medicineName: "",

    strength: "",
    dosage: "",

    route: "oral",

    frequency: "",
    duration: "",

    quantity: "",

    instructions: "",
  };
}

function createEmptyVitals():
  DemoClinicalVitals {
  return {
    temperatureCelsius: "",

    pulsePerMinute: "",

    respiratoryRatePerMinute:
      "",

    systolicBloodPressure: "",
    diastolicBloodPressure: "",

    oxygenSaturationPercent:
      "",

    weightKilograms: "",
    heightCentimeters: "",

    painScore: "",
  };
}

function createEmptyExamination():
  DemoClinicalExamination {
  return {
    generalAppearance: "",

    cardiovascular: "",
    respiratory: "",
    abdomen: "",
    neurological: "",

    musculoskeletal: "",
    ent: "",
    skin: "",

    otherFindings: "",
  };
}

export function createInitialClinicalDocumentation(
  encounter:
    DemoClinicalEncounter,
): DemoClinicalDocumentation {
  const timestamp =
    new Date().toISOString();

  return {
    id:
      createClinicalIdentifier(
        "clinical-documentation",
      ),

    encounterId:
      encounter.id,

    patientId:
      encounter.patientId,

    practitionerId:
      encounter.practitionerId,

    branchId:
      encounter.branchId,

    status: "draft",

    chiefComplaint:
      encounter.reasonForVisit,

    historyOfPresentIllness:
      "",

    pastMedicalHistory: "",
    pastSurgicalHistory: "",

    familyHistory: "",
    socialHistory: "",

    allergyStatus: "unknown",

    allergies: [],

    currentMedicationStatus:
      "unknown",

    currentMedications: [],

    vitals:
      createEmptyVitals(),

    examination:
      createEmptyExamination(),

    diagnoses: [],
    orders: [],
    prescriptions: [],

    clinicalAdvice: "",
    followUpPlan: "",

    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function readDemoClinicalDocumentation():
  DemoClinicalDocumentation[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      DEMO_CLINICAL_DOCUMENTATION_STORAGE_KEY,
    );

  if (storedValue === null) {
    return [];
  }

  try {
    const parsedValue:
      unknown =
      JSON.parse(storedValue);

    if (
      !Array.isArray(
        parsedValue,
      )
    ) {
      return [];
    }

    return parsedValue as
      DemoClinicalDocumentation[];
  } catch {
    return [];
  }
}

export function writeDemoClinicalDocumentation(
  records:
    readonly DemoClinicalDocumentation[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    DEMO_CLINICAL_DOCUMENTATION_STORAGE_KEY,

    JSON.stringify(
      records.slice(0, 500),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-clinical-documentation-changed",
    ),
  );
}

export function getOrCreateDemoClinicalDocumentation(
  encounter:
    DemoClinicalEncounter,
): DemoClinicalDocumentation {
  const records =
    readDemoClinicalDocumentation();

  const existingRecord =
    records.find(
      (record) =>
        record.encounterId ===
        encounter.id,
    );

  if (
    existingRecord !==
    undefined
  ) {
    return existingRecord;
  }

  const newRecord =
    createInitialClinicalDocumentation(
      encounter,
    );

  writeDemoClinicalDocumentation([
    newRecord,
    ...records,
  ]);

  return newRecord;
}

function cleanAllergies(
  records:
    readonly DemoClinicalAllergy[],
): DemoClinicalAllergy[] {
  return records
    .map(
      (record) => ({
        ...record,

        substance:
          record.substance.trim(),

        reaction:
          record.reaction.trim(),
      }),
    )
    .filter(
      (record) =>
        record.substance !==
          "" ||
        record.reaction !== "",
    );
}

function cleanCurrentMedications(
  records:
    readonly DemoCurrentMedication[],
): DemoCurrentMedication[] {
  return records
    .map(
      (record) => ({
        ...record,

        medicineName:
          record.medicineName
            .trim(),

        dose:
          record.dose.trim(),

        frequency:
          record.frequency.trim(),
      }),
    )
    .filter(
      (record) =>
        record.medicineName !==
          "" ||
        record.dose !== "" ||
        record.frequency !== "",
    );
}

function cleanDiagnoses(
  records:
    readonly DemoClinicalDiagnosis[],
): DemoClinicalDiagnosis[] {
  return records
    .map(
      (record) => ({
        ...record,

        diagnosis:
          record.diagnosis.trim(),

        icdCode:
          record.icdCode.trim(),

        notes:
          record.notes.trim(),
      }),
    )
    .filter(
      (record) =>
        record.diagnosis !== "",
    );
}

function cleanOrders(
  records:
    readonly DemoClinicalOrder[],
): DemoClinicalOrder[] {
  return records
    .map(
      (record) => ({
        ...record,

        orderName:
          record.orderName.trim(),

        instructions:
          record.instructions
            .trim(),
      }),
    )
    .filter(
      (record) =>
        record.orderName !== "",
    );
}

function cleanPrescriptions(
  records:
    readonly DemoClinicalPrescriptionItem[],
): DemoClinicalPrescriptionItem[] {
  return records
    .map(
      (record) => ({
        ...record,

        medicineName:
          record.medicineName
            .trim(),

        strength:
          record.strength.trim(),

        dosage:
          record.dosage.trim(),

        frequency:
          record.frequency.trim(),

        duration:
          record.duration.trim(),

        quantity:
          record.quantity.trim(),

        instructions:
          record.instructions
            .trim(),
      }),
    )
    .filter(
      (record) =>
        record.medicineName !==
          "",
    );
}

function normalizeDocumentation(
  documentation:
    DemoClinicalDocumentation,
): DemoClinicalDocumentation {
  return {
    ...documentation,

    chiefComplaint:
      documentation
        .chiefComplaint
        .trim(),

    historyOfPresentIllness:
      documentation
        .historyOfPresentIllness
        .trim(),

    pastMedicalHistory:
      documentation
        .pastMedicalHistory
        .trim(),

    pastSurgicalHistory:
      documentation
        .pastSurgicalHistory
        .trim(),

    familyHistory:
      documentation
        .familyHistory
        .trim(),

    socialHistory:
      documentation
        .socialHistory
        .trim(),

    allergies:
      documentation
        .allergyStatus ===
      "documented"
        ? cleanAllergies(
            documentation
              .allergies,
          )
        : [],

    currentMedications:
      documentation
        .currentMedicationStatus ===
      "documented"
        ? cleanCurrentMedications(
            documentation
              .currentMedications,
          )
        : [],

    diagnoses:
      cleanDiagnoses(
        documentation.diagnoses,
      ),

    orders:
      cleanOrders(
        documentation.orders,
      ),

    prescriptions:
      cleanPrescriptions(
        documentation
          .prescriptions,
      ),

    clinicalAdvice:
      documentation
        .clinicalAdvice
        .trim(),

    followUpPlan:
      documentation
        .followUpPlan
        .trim(),

    updatedAt:
      new Date().toISOString(),
  };
}

export function saveDemoClinicalDocumentation(
  documentation:
    DemoClinicalDocumentation,
): DemoClinicalDocumentation {
  const records =
    readDemoClinicalDocumentation();

  const normalizedRecord =
    normalizeDocumentation(
      documentation,
    );

  const existingRecord =
    records.some(
      (record) =>
        record.id ===
        normalizedRecord.id,
    );

  writeDemoClinicalDocumentation(
    existingRecord
      ? records.map(
          (record) =>
            record.id ===
            normalizedRecord.id
              ? normalizedRecord
              : record,
        )
      : [
          normalizedRecord,
          ...records,
        ],
  );

  return normalizedRecord;
}

function parseOptionalNumber(
  value: string,
): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  const parsedValue =
    Number(value);

  return Number.isFinite(
    parsedValue,
  )
    ? parsedValue
    : undefined;
}

function hasInvalidVitalRange(
  documentation:
    DemoClinicalDocumentation,
): boolean {
  const temperature =
    parseOptionalNumber(
      documentation.vitals
        .temperatureCelsius,
    );

  const pulse =
    parseOptionalNumber(
      documentation.vitals
        .pulsePerMinute,
    );

  const respiratoryRate =
    parseOptionalNumber(
      documentation.vitals
        .respiratoryRatePerMinute,
    );

  const systolic =
    parseOptionalNumber(
      documentation.vitals
        .systolicBloodPressure,
    );

  const diastolic =
    parseOptionalNumber(
      documentation.vitals
        .diastolicBloodPressure,
    );

  const oxygenSaturation =
    parseOptionalNumber(
      documentation.vitals
        .oxygenSaturationPercent,
    );

  const weight =
    parseOptionalNumber(
      documentation.vitals
        .weightKilograms,
    );

  const height =
    parseOptionalNumber(
      documentation.vitals
        .heightCentimeters,
    );

  const painScore =
    parseOptionalNumber(
      documentation.vitals
        .painScore,
    );

  return (
    (
      temperature !==
        undefined &&
      (
        temperature < 25 ||
        temperature > 45
      )
    ) ||
    (
      pulse !== undefined &&
      (
        pulse < 20 ||
        pulse > 250
      )
    ) ||
    (
      respiratoryRate !==
        undefined &&
      (
        respiratoryRate < 5 ||
        respiratoryRate > 80
      )
    ) ||
    (
      systolic !== undefined &&
      (
        systolic < 40 ||
        systolic > 300
      )
    ) ||
    (
      diastolic !== undefined &&
      (
        diastolic < 20 ||
        diastolic > 200
      )
    ) ||
    (
      oxygenSaturation !==
        undefined &&
      (
        oxygenSaturation < 0 ||
        oxygenSaturation > 100
      )
    ) ||
    (
      weight !== undefined &&
      (
        weight <= 0 ||
        weight > 500
      )
    ) ||
    (
      height !== undefined &&
      (
        height <= 0 ||
        height > 300
      )
    ) ||
    (
      painScore !== undefined &&
      (
        painScore < 0 ||
        painScore > 10
      )
    )
  );
}

export function validateDemoClinicalDocumentation(
  documentation:
    DemoClinicalDocumentation,
): DemoClinicalDocumentationErrors {
  const errors:
    DemoClinicalDocumentationErrors =
    {};

  if (
    documentation
      .chiefComplaint
      .trim()
      .length < 3
  ) {
    errors.chiefComplaint =
      "Enter the patient’s chief complaint.";
  }

  if (
    documentation
      .historyOfPresentIllness
      .trim()
      .length < 3
  ) {
    errors.historyOfPresentIllness =
      "Document the history of the present illness.";
  }

  if (
    documentation
      .allergyStatus ===
      "documented" &&
    cleanAllergies(
      documentation.allergies,
    ).length === 0
  ) {
    errors.allergyStatus =
      "Add at least one allergy or change the allergy status.";
  }

  if (
    documentation
      .currentMedicationStatus ===
      "documented" &&
    cleanCurrentMedications(
      documentation
        .currentMedications,
    ).length === 0
  ) {
    errors.currentMedicationStatus =
      "Add at least one current medicine or change the medication status.";
  }

  if (
    hasInvalidVitalRange(
      documentation,
    )
  ) {
    errors.vitals =
      "One or more vital-sign values are outside the accepted input range.";
  }

  if (
    cleanDiagnoses(
      documentation.diagnoses,
    ).length === 0
  ) {
    errors.diagnoses =
      "Add at least one provisional or confirmed diagnosis.";
  }

  if (
    documentation
      .followUpPlan
      .trim()
      .length < 2
  ) {
    errors.followUpPlan =
      "Record follow-up instructions or state that no follow-up is required.";
  }

  return errors;
}

export function completeDemoClinicalDocumentation(
  documentation:
    DemoClinicalDocumentation,
): DemoClinicalDocumentation {
  const timestamp =
    new Date().toISOString();

  return saveDemoClinicalDocumentation({
    ...documentation,

    status: "completed",

    updatedAt: timestamp,
    completedAt: timestamp,
  });
}