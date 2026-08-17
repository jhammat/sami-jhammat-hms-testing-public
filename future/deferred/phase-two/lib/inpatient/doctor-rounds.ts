import {
  readDemoInpatientAdmissions,
  writeDemoInpatientAdmissions,
} from "./ward-management";

import type {
  DemoInpatientAdmission,
} from "./ward-management";

export type DemoInpatientRoundType =
  | "morning"
  | "evening"
  | "emergency-review"
  | "specialist-review";

export type DemoInpatientRoundStatus =
  | "draft"
  | "finalized";

export type DemoInpatientEscalationLevel =
  | "routine"
  | "close-monitoring"
  | "urgent-review";

export type DemoInpatientDiagnosisCategory =
  | "primary"
  | "secondary"
  | "comorbidity"
  | "complication";

export type DemoInpatientDiagnosisStatus =
  | "active"
  | "resolved"
  | "ruled-out";

export type DemoInpatientTreatmentOrderType =
  | "medication"
  | "laboratory"
  | "radiology"
  | "procedure"
  | "nursing"
  | "diet"
  | "monitoring"
  | "consultation"
  | "other";

export type DemoInpatientTreatmentOrderPriority =
  | "routine"
  | "urgent"
  | "stat";

export type DemoInpatientTreatmentOrderStatus =
  | "active"
  | "completed"
  | "discontinued";

export type DemoInpatientDoctorDischargeOrderStatus =
  | "ordered"
  | "cancelled";

export interface DemoInpatientDiagnosisUpdate {
  id: string;

  diagnosis: string;
  diagnosisCode: string;

  category:
    DemoInpatientDiagnosisCategory;

  status:
    DemoInpatientDiagnosisStatus;

  isPrimary: boolean;

  note: string;
}

export interface DemoInpatientTreatmentOrder {
  id: string;

  orderType:
    DemoInpatientTreatmentOrderType;

  orderName: string;
  instructions: string;

  priority:
    DemoInpatientTreatmentOrderPriority;

  status:
    DemoInpatientTreatmentOrderStatus;

  startAt: string;
}

export interface DemoInpatientDoctorRound {
  id: string;

  roundNumber: string;

  admissionId: string;
  patientId: string;
  branchId: string;

  practitionerId: string;

  roundType:
    DemoInpatientRoundType;

  roundDate: string;

  status:
    DemoInpatientRoundStatus;

  escalationLevel:
    DemoInpatientEscalationLevel;

  subjective: string;
  objective: string;
  assessment: string;
  plan: string;

  examinationSummary: string;
  treatmentPlan: string;

  nextReviewAt: string;

  diagnoses:
    DemoInpatientDiagnosisUpdate[];

  treatmentOrders:
    DemoInpatientTreatmentOrder[];

  createdAt: string;
  updatedAt: string;
  finalizedAt: string;
}

export interface DemoInpatientDoctorDischargeOrder {
  id: string;

  orderNumber: string;

  admissionId: string;
  patientId: string;
  branchId: string;

  practitionerId: string;

  status:
    DemoInpatientDoctorDischargeOrderStatus;

  plannedDischargeDate: string;

  finalDiagnosis: string;
  conditionAtDischarge: string;

  medicationPlan: string;
  dischargeInstructions: string;
  followUpPlan: string;

  orderedAt: string;
  cancelledAt: string;
  cancellationReason: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoInpatientDoctorRoundSummary {
  roundCount: number;
  finalizedRoundCount: number;

  latestFinalizedRound:
    DemoInpatientDoctorRound |
    undefined;

  activeDischargeOrder:
    DemoInpatientDoctorDischargeOrder |
    undefined;
}

const DOCTOR_ROUND_STORAGE_KEY =
  "wonflow-demo-inpatient-doctor-rounds";

const DOCTOR_DISCHARGE_ORDER_STORAGE_KEY =
  "wonflow-demo-inpatient-doctor-discharge-orders";

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

function generateRoundNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `RND-${createDateCode()}-${randomPart}`;
}

function generateDischargeOrderNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `DCO-${createDateCode()}-${randomPart}`;
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

export function createEmptyDemoInpatientDiagnosisUpdate():
  DemoInpatientDiagnosisUpdate {
  return {
    id:
      createIdentifier(
        "round-diagnosis",
      ),

    diagnosis: "",
    diagnosisCode: "",

    category: "primary",

    status: "active",

    isPrimary: true,

    note: "",
  };
}

export function createEmptyDemoInpatientTreatmentOrder():
  DemoInpatientTreatmentOrder {
  return {
    id:
      createIdentifier(
        "round-order",
      ),

    orderType:
      "monitoring",

    orderName: "",
    instructions: "",

    priority: "routine",

    status: "active",

    startAt: "",
  };
}

export function readDemoInpatientDoctorRounds():
  DemoInpatientDoctorRound[] {
  return readStoredArray<
    DemoInpatientDoctorRound
  >(
    DOCTOR_ROUND_STORAGE_KEY,
  );
}

export function writeDemoInpatientDoctorRounds(
  rounds:
    readonly DemoInpatientDoctorRound[],
): void {
  writeStoredArray(
    DOCTOR_ROUND_STORAGE_KEY,

    "wonflow:demo-inpatient-doctor-rounds-changed",

    rounds,
  );
}

function normalizeRound(
  round:
    DemoInpatientDoctorRound,
): DemoInpatientDoctorRound {
  return {
    ...round,

    subjective:
      round.subjective.trim(),

    objective:
      round.objective.trim(),

    assessment:
      round.assessment.trim(),

    plan:
      round.plan.trim(),

    examinationSummary:
      round.examinationSummary
        .trim(),

    treatmentPlan:
      round.treatmentPlan
        .trim(),

    diagnoses:
      round.diagnoses.map(
        (diagnosis) => ({
          ...diagnosis,

          diagnosis:
            diagnosis.diagnosis
              .trim(),

          diagnosisCode:
            diagnosis.diagnosisCode
              .trim(),

          note:
            diagnosis.note.trim(),
        }),
      ),

    treatmentOrders:
      round.treatmentOrders.map(
        (order) => ({
          ...order,

          orderName:
            order.orderName
              .trim(),

          instructions:
            order.instructions
              .trim(),
        }),
      ),

    updatedAt:
      new Date().toISOString(),
  };
}

export function createOrGetDemoInpatientDoctorRound(
  input: {
    admissionId: string;

    practitionerId: string;

    roundType:
      DemoInpatientRoundType;
  },
): DemoInpatientDoctorRound |
  undefined {
  const admission =
    getActiveAdmission(
      input.admissionId,
    );

  if (
    admission === undefined ||
    input.practitionerId
      .trim() === ""
  ) {
    return undefined;
  }

  const rounds =
    readDemoInpatientDoctorRounds();

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const existingDraft =
    rounds.find(
      (round) =>
        round.admissionId ===
          admission.id &&
        round.practitionerId ===
          input.practitionerId &&
        round.roundType ===
          input.roundType &&
        round.roundDate ===
          today &&
        round.status ===
          "draft",
    );

  if (
    existingDraft !==
    undefined
  ) {
    return existingDraft;
  }

  const timestamp =
    new Date().toISOString();

  const round:
    DemoInpatientDoctorRound = {
    id:
      createIdentifier(
        "doctor-round",
      ),

    roundNumber:
      generateRoundNumber(),

    admissionId:
      admission.id,

    patientId:
      admission.patientId,

    branchId:
      admission.branchId,

    practitionerId:
      input.practitionerId,

    roundType:
      input.roundType,

    roundDate:
      today,

    status: "draft",

    escalationLevel:
      "routine",

    subjective: "",
    objective: "",
    assessment: "",
    plan: "",

    examinationSummary: "",
    treatmentPlan: "",

    nextReviewAt: "",

    diagnoses: [
      createEmptyDemoInpatientDiagnosisUpdate(),
    ],

    treatmentOrders: [
      createEmptyDemoInpatientTreatmentOrder(),
    ],

    createdAt: timestamp,
    updatedAt: timestamp,
    finalizedAt: "",
  };

  writeDemoInpatientDoctorRounds([
    round,
    ...rounds,
  ]);

  return round;
}

export function saveDemoInpatientDoctorRound(
  round:
    DemoInpatientDoctorRound,
): DemoInpatientDoctorRound |
  undefined {
  if (
    round.status !== "draft" ||
    getActiveAdmission(
      round.admissionId,
    ) === undefined
  ) {
    return undefined;
  }

  const normalizedRound =
    normalizeRound(round);

  const rounds =
    readDemoInpatientDoctorRounds();

  const exists =
    rounds.some(
      (record) =>
        record.id ===
        normalizedRound.id,
    );

  writeDemoInpatientDoctorRounds(
    exists
      ? rounds.map(
          (record) =>
            record.id ===
            normalizedRound.id
              ? normalizedRound
              : record,
        )
      : [
          normalizedRound,
          ...rounds,
        ],
  );

  return normalizedRound;
}

export function validateDemoInpatientDoctorRound(
  round:
    DemoInpatientDoctorRound,
): string[] {
  const errors:
    string[] = [];

  if (
    round.status !== "draft"
  ) {
    errors.push(
      "Only a draft progress note may be finalized.",
    );
  }

  if (
    getActiveAdmission(
      round.admissionId,
    ) === undefined
  ) {
    errors.push(
      "The inpatient admission is no longer active.",
    );
  }

  if (
    round.practitionerId
      .trim() === ""
  ) {
    errors.push(
      "Select the responsible doctor.",
    );
  }

  if (
    round.subjective
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the patient’s subjective history or current complaints.",
    );
  }

  if (
    round.objective
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the objective clinical findings.",
    );
  }

  if (
    round.assessment
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the doctor’s clinical assessment.",
    );
  }

  if (
    round.plan.trim().length <
      5
  ) {
    errors.push(
      "Enter the clinical management plan.",
    );
  }

  if (
    round.examinationSummary
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the examination summary.",
    );
  }

  if (
    round.treatmentPlan
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the treatment and monitoring plan.",
    );
  }

  const diagnoses =
    round.diagnoses.filter(
      (diagnosis) =>
        diagnosis.diagnosis
          .trim() !== "",
    );

  if (
    diagnoses.length === 0
  ) {
    errors.push(
      "Enter at least one diagnosis.",
    );
  }

  if (
    diagnoses.length > 0 &&
    !diagnoses.some(
      (diagnosis) =>
        diagnosis.isPrimary,
    )
  ) {
    errors.push(
      "Mark at least one diagnosis as primary.",
    );
  }

  round.treatmentOrders.forEach(
    (
      order,
      index,
    ) => {
      const hasAnyValue =
        order.orderName
          .trim() !== "" ||
        order.instructions
          .trim() !== "";

      if (
        !hasAnyValue
      ) {
        return;
      }

      if (
        order.orderName
          .trim()
          .length < 2
      ) {
        errors.push(
          `Treatment order ${index + 1}: enter the order name.`,
        );
      }

      if (
        order.instructions
          .trim()
          .length < 3
      ) {
        errors.push(
          `Treatment order ${index + 1}: enter clear instructions.`,
        );
      }
    },
  );

  if (
    round.escalationLevel ===
      "urgent-review" &&
    round.nextReviewAt === ""
  ) {
    errors.push(
      "Set the next review time for an urgent clinical review.",
    );
  }

  if (
    round.nextReviewAt !== ""
  ) {
    const nextReviewDate =
      new Date(
        round.nextReviewAt,
      );

    if (
      Number.isNaN(
        nextReviewDate.getTime(),
      )
    ) {
      errors.push(
        "Enter a valid next-review date and time.",
      );
    }
  }

  return [
    ...new Set(errors),
  ];
}

export function finalizeDemoInpatientDoctorRound(
  round:
    DemoInpatientDoctorRound,
): DemoInpatientDoctorRound |
  undefined {
  const normalizedRound =
    normalizeRound({
      ...round,

      diagnoses:
        round.diagnoses.filter(
          (diagnosis) =>
            diagnosis.diagnosis
              .trim() !== "",
        ),

      treatmentOrders:
        round.treatmentOrders.filter(
          (order) =>
            order.orderName
              .trim() !== "" ||
            order.instructions
              .trim() !== "",
        ),
    });

  const errors =
    validateDemoInpatientDoctorRound(
      normalizedRound,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const finalizedRound:
    DemoInpatientDoctorRound = {
    ...normalizedRound,

    status: "finalized",

    finalizedAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  const rounds =
    readDemoInpatientDoctorRounds();

  writeDemoInpatientDoctorRounds(
    rounds.map(
      (record) =>
        record.id ===
        finalizedRound.id
          ? finalizedRound
          : record,
    ),
  );

  return finalizedRound;
}

export function readDemoInpatientDoctorDischargeOrders():
  DemoInpatientDoctorDischargeOrder[] {
  return readStoredArray<
    DemoInpatientDoctorDischargeOrder
  >(
    DOCTOR_DISCHARGE_ORDER_STORAGE_KEY,
  );
}

export function writeDemoInpatientDoctorDischargeOrders(
  orders:
    readonly DemoInpatientDoctorDischargeOrder[],
): void {
  writeStoredArray(
    DOCTOR_DISCHARGE_ORDER_STORAGE_KEY,

    "wonflow:demo-inpatient-doctor-discharge-orders-changed",

    orders,
  );
}

export function getActiveDemoInpatientDoctorDischargeOrder(
  admissionId: string,
): DemoInpatientDoctorDischargeOrder |
  undefined {
  return readDemoInpatientDoctorDischargeOrders()
    .find(
      (order) =>
        order.admissionId ===
          admissionId &&
        order.status ===
          "ordered",
    );
}

export function validateDemoInpatientDoctorDischargeOrder(
  input: {
    admissionId: string;
    practitionerId: string;

    plannedDischargeDate:
      string;

    finalDiagnosis: string;
    conditionAtDischarge:
      string;

    medicationPlan: string;
    dischargeInstructions:
      string;

    followUpPlan: string;
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
    input.practitionerId
      .trim() === ""
  ) {
    errors.push(
      "Select the doctor placing the discharge order.",
    );
  }

  if (
    input.plannedDischargeDate ===
    ""
  ) {
    errors.push(
      "Enter the planned discharge date.",
    );
  }

  if (
    input.finalDiagnosis
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the final diagnosis.",
    );
  }

  if (
    input.conditionAtDischarge
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the patient’s expected condition at discharge.",
    );
  }

  if (
    input.medicationPlan
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the discharge medication plan.",
    );
  }

  if (
    input.dischargeInstructions
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the patient discharge instructions.",
    );
  }

  if (
    input.followUpPlan
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the follow-up plan.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function placeDemoInpatientDoctorDischargeOrder(
  input: {
    admissionId: string;
    practitionerId: string;

    plannedDischargeDate:
      string;

    finalDiagnosis: string;
    conditionAtDischarge:
      string;

    medicationPlan: string;
    dischargeInstructions:
      string;

    followUpPlan: string;
  },
): DemoInpatientDoctorDischargeOrder |
  undefined {
  const errors =
    validateDemoInpatientDoctorDischargeOrder(
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

  const orders =
    readDemoInpatientDoctorDischargeOrders();

  const existingOrder =
    orders.find(
      (order) =>
        order.admissionId ===
          admission.id &&
        order.status ===
          "ordered",
    );

  const timestamp =
    new Date().toISOString();

  const dischargeOrder:
    DemoInpatientDoctorDischargeOrder =
    {
      id:
        existingOrder?.id ??
        createIdentifier(
          "doctor-discharge-order",
        ),

      orderNumber:
        existingOrder
          ?.orderNumber ??
        generateDischargeOrderNumber(),

      admissionId:
        admission.id,

      patientId:
        admission.patientId,

      branchId:
        admission.branchId,

      practitionerId:
        input.practitionerId,

      status: "ordered",

      plannedDischargeDate:
        input.plannedDischargeDate,

      finalDiagnosis:
        input.finalDiagnosis
          .trim(),

      conditionAtDischarge:
        input.conditionAtDischarge
          .trim(),

      medicationPlan:
        input.medicationPlan
          .trim(),

      dischargeInstructions:
        input.dischargeInstructions
          .trim(),

      followUpPlan:
        input.followUpPlan
          .trim(),

      orderedAt:
        existingOrder?.orderedAt ??
        timestamp,

      cancelledAt: "",

      cancellationReason: "",

      createdAt:
        existingOrder?.createdAt ??
        timestamp,

      updatedAt: timestamp,
    };

  writeDemoInpatientDoctorDischargeOrders(
    existingOrder === undefined
      ? [
          dischargeOrder,
          ...orders,
        ]
      : orders.map(
          (order) =>
            order.id ===
            existingOrder.id
              ? dischargeOrder
              : order,
        ),
  );

  const admissions =
    readDemoInpatientAdmissions();

  writeDemoInpatientAdmissions(
    admissions.map(
      (record) =>
        record.id ===
        admission.id
          ? {
              ...record,

              dischargeReadiness: {
                ...record
                  .dischargeReadiness,

                doctorClearance:
                  true,

                finalDiagnosis:
                  dischargeOrder
                    .finalDiagnosis,

                dischargeInstructions:
                  dischargeOrder
                    .dischargeInstructions,

                followUpPlan:
                  dischargeOrder
                    .followUpPlan,
              },

              updatedAt:
                timestamp,
            }
          : record,
    ),
  );

  return dischargeOrder;
}

export function cancelDemoInpatientDoctorDischargeOrder(
  input: {
    orderId: string;

    cancellationReason:
      string;
  },
): DemoInpatientDoctorDischargeOrder |
  undefined {
  const reason =
    input.cancellationReason
      .trim();

  if (
    reason.length < 3
  ) {
    return undefined;
  }

  const orders =
    readDemoInpatientDoctorDischargeOrders();

  const order =
    orders.find(
      (record) =>
        record.id ===
        input.orderId,
    );

  if (
    order === undefined ||
    order.status !== "ordered"
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const cancelledOrder:
    DemoInpatientDoctorDischargeOrder =
    {
      ...order,

      status: "cancelled",

      cancellationReason:
        reason,

      cancelledAt:
        timestamp,

      updatedAt:
        timestamp,
    };

  writeDemoInpatientDoctorDischargeOrders(
    orders.map(
      (record) =>
        record.id ===
        order.id
          ? cancelledOrder
          : record,
    ),
  );

  const admissions =
    readDemoInpatientAdmissions();

  writeDemoInpatientAdmissions(
    admissions.map(
      (admission) =>
        admission.id ===
        order.admissionId &&
        (
          admission.status ===
            "admitted" ||
          admission.status ===
            "discharge-ready"
        )
          ? {
              ...admission,

              status:
                admission.status ===
                "discharge-ready"
                  ? "admitted"
                  : admission.status,

              dischargeReadiness: {
                ...admission
                  .dischargeReadiness,

                doctorClearance:
                  false,
              },

              updatedAt:
                timestamp,
            }
          : admission,
    ),
  );

  return cancelledOrder;
}

export function buildDemoInpatientDoctorRoundSummary(
  admissionId: string,
): DemoInpatientDoctorRoundSummary {
  const rounds =
    readDemoInpatientDoctorRounds()
      .filter(
        (round) =>
          round.admissionId ===
          admissionId,
      );

  const finalizedRounds =
    rounds
      .filter(
        (round) =>
          round.status ===
          "finalized",
      )
      .sort(
        (
          left,
          right,
        ) =>
          new Date(
            right.finalizedAt,
          ).getTime() -
          new Date(
            left.finalizedAt,
          ).getTime(),
      );

  return {
    roundCount:
      rounds.length,

    finalizedRoundCount:
      finalizedRounds.length,

    latestFinalizedRound:
      finalizedRounds[0],

    activeDischargeOrder:
      getActiveDemoInpatientDoctorDischargeOrder(
        admissionId,
      ),
  };
}