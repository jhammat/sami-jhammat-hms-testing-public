import type {
  DemoDiagnosticOrder,
} from "./orders";

export type DemoRadiologyModality =
  | "x-ray"
  | "ultrasound"
  | "ct"
  | "mri"
  | "mammography"
  | "fluoroscopy"
  | "other";

export type DemoRadiologyImageQuality =
  | "diagnostic"
  | "limited"
  | "non-diagnostic";

export type DemoRadiologyContrastStatus =
  | "not-applicable"
  | "not-used"
  | "used";

export type DemoStructuredRadiologyStatus =
  | "draft"
  | "result-ready"
  | "finalized";

export type DemoRadiologyCriticalNotificationStatus =
  | "not-required"
  | "pending"
  | "acknowledged";

export interface DemoStructuredRadiologyResult {
  id: string;

  diagnosticOrderId: string;
  orderNumber: string;

  patientId: string;
  practitionerId: string;
  branchId: string;
  encounterId: string;

  studyName: string;

  modality:
    DemoRadiologyModality;

  bodyPart: string;

  clinicalIndication: string;

  technique: string;
  comparison: string;

  imageQuality:
    DemoRadiologyImageQuality;

  contrastStatus:
    DemoRadiologyContrastStatus;

  contrastAgent: string;
  contrastVolumeMilliliters: string;

  radiationDose: string;

  findings: string;
  impression: string;
  recommendations: string;

  criticalFinding: boolean;
  criticalFindingDetails: string;

  criticalNotificationStatus:
    DemoRadiologyCriticalNotificationStatus;

  criticalNotificationRecipient:
    string;

  criticalNotificationNote:
    string;

  criticalNotifiedAt: string;
  criticalAcknowledgedAt: string;

  status:
    DemoStructuredRadiologyStatus;

  createdAt: string;
  updatedAt: string;

  resultReadyAt: string;
  finalizedAt: string;
}

const RADIOLOGY_RESULT_STORAGE_KEY =
  "wonflow-demo-structured-radiology-results";

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

function inferRadiologyModality(
  orderName: string,
): DemoRadiologyModality {
  const normalizedName =
    orderName
      .trim()
      .toLocaleLowerCase();

  if (
    normalizedName.includes("mri") ||
    normalizedName.includes(
      "magnetic resonance",
    )
  ) {
    return "mri";
  }

  if (
    normalizedName.includes("ct") ||
    normalizedName.includes(
      "computed tomography",
    )
  ) {
    return "ct";
  }

  if (
    normalizedName.includes(
      "ultrasound",
    ) ||
    normalizedName.includes(
      "ultrasonography",
    ) ||
    normalizedName.includes("usg")
  ) {
    return "ultrasound";
  }

  if (
    normalizedName.includes(
      "mammogram",
    ) ||
    normalizedName.includes(
      "mammography",
    )
  ) {
    return "mammography";
  }

  if (
    normalizedName.includes(
      "fluoroscopy",
    )
  ) {
    return "fluoroscopy";
  }

  if (
    normalizedName.includes("x-ray") ||
    normalizedName.includes("xray") ||
    normalizedName.includes(
      "radiograph",
    )
  ) {
    return "x-ray";
  }

  return "other";
}

export function readDemoStructuredRadiologyResults():
  DemoStructuredRadiologyResult[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      RADIOLOGY_RESULT_STORAGE_KEY,
    );

  if (storedValue === null) {
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
          DemoStructuredRadiologyResult[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoStructuredRadiologyResults(
  results:
    readonly DemoStructuredRadiologyResult[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    RADIOLOGY_RESULT_STORAGE_KEY,

    JSON.stringify(
      results.slice(0, 1000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-structured-radiology-results-changed",
    ),
  );
}

export function createOrGetDemoStructuredRadiologyResult(
  order:
    DemoDiagnosticOrder,
): DemoStructuredRadiologyResult {
  const existingResults =
    readDemoStructuredRadiologyResults();

  const existingResult =
    existingResults.find(
      (result) =>
        result.diagnosticOrderId ===
        order.id,
    );

  if (
    existingResult !==
    undefined
  ) {
    return existingResult;
  }

  const timestamp =
    new Date().toISOString();

  const result:
    DemoStructuredRadiologyResult = {
    id:
      createIdentifier(
        "structured-radiology-result",
      ),

    diagnosticOrderId:
      order.id,

    orderNumber:
      order.orderNumber,

    patientId:
      order.patientId,

    practitionerId:
      order.practitionerId,

    branchId:
      order.branchId,

    encounterId:
      order.encounterId,

    studyName:
      order.orderName,

    modality:
      inferRadiologyModality(
        order.orderName,
      ),

    bodyPart: "",

    clinicalIndication:
      order.instructions,

    technique: "",
    comparison: "",

    imageQuality:
      "diagnostic",

    contrastStatus:
      "not-applicable",

    contrastAgent: "",

    contrastVolumeMilliliters:
      "",

    radiationDose: "",

    findings: "",
    impression: "",
    recommendations: "",

    criticalFinding: false,

    criticalFindingDetails:
      "",

    criticalNotificationStatus:
      "not-required",

    criticalNotificationRecipient:
      "",

    criticalNotificationNote:
      "",

    criticalNotifiedAt: "",

    criticalAcknowledgedAt:
      "",

    status: "draft",

    createdAt: timestamp,
    updatedAt: timestamp,

    resultReadyAt: "",
    finalizedAt: "",
  };

  writeDemoStructuredRadiologyResults([
    result,
    ...existingResults,
  ]);

  return result;
}

function recalculateRadiologyResult(
  result:
    DemoStructuredRadiologyResult,
): DemoStructuredRadiologyResult {
  const criticalNotificationStatus =
    !result.criticalFinding
      ? "not-required"
      : result
            .criticalNotificationStatus ===
          "acknowledged"
        ? "acknowledged"
        : "pending";

  return {
    ...result,

    criticalNotificationStatus,

    criticalFindingDetails:
      result.criticalFinding
        ? result
            .criticalFindingDetails
        : "",

    criticalNotificationRecipient:
      result.criticalFinding
        ? result
            .criticalNotificationRecipient
        : "",

    criticalNotificationNote:
      result.criticalFinding
        ? result
            .criticalNotificationNote
        : "",

    updatedAt:
      new Date().toISOString(),
  };
}

export function saveDemoStructuredRadiologyResult(
  result:
    DemoStructuredRadiologyResult,
): DemoStructuredRadiologyResult {
  const existingResults =
    readDemoStructuredRadiologyResults();

  const normalizedResult =
    recalculateRadiologyResult({
      ...result,

      studyName:
        result.studyName.trim(),

      bodyPart:
        result.bodyPart.trim(),

      clinicalIndication:
        result.clinicalIndication
          .trim(),

      technique:
        result.technique.trim(),

      comparison:
        result.comparison.trim(),

      contrastAgent:
        result.contrastAgent
          .trim(),

      contrastVolumeMilliliters:
        result
          .contrastVolumeMilliliters
          .trim(),

      radiationDose:
        result.radiationDose
          .trim(),

      findings:
        result.findings.trim(),

      impression:
        result.impression.trim(),

      recommendations:
        result.recommendations
          .trim(),

      criticalFindingDetails:
        result
          .criticalFindingDetails
          .trim(),

      criticalNotificationRecipient:
        result
          .criticalNotificationRecipient
          .trim(),

      criticalNotificationNote:
        result
          .criticalNotificationNote
          .trim(),
    });

  const recordExists =
    existingResults.some(
      (record) =>
        record.id ===
        normalizedResult.id,
    );

  writeDemoStructuredRadiologyResults(
    recordExists
      ? existingResults.map(
          (record) =>
            record.id ===
            normalizedResult.id
              ? normalizedResult
              : record,
        )
      : [
          normalizedResult,
          ...existingResults,
        ],
  );

  return normalizedResult;
}

export function validateDemoStructuredRadiologyResult(
  result:
    DemoStructuredRadiologyResult,
): string[] {
  const errors:
    string[] = [];

  if (
    result.studyName
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the imaging study name.",
    );
  }

  if (
    result.bodyPart
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the body region examined.",
    );
  }

  if (
    result.clinicalIndication
      .trim()
      .length < 2
  ) {
    errors.push(
      "Record the clinical indication.",
    );
  }

  if (
    result.technique
      .trim()
      .length < 2
  ) {
    errors.push(
      "Document the imaging technique.",
    );
  }

  if (
    result.findings
      .trim()
      .length < 3
  ) {
    errors.push(
      "Document the radiology findings.",
    );
  }

  if (
    result.impression
      .trim()
      .length < 3
  ) {
    errors.push(
      "Record the radiology impression.",
    );
  }

  if (
    result.contrastStatus ===
      "used" &&
    result.contrastAgent
      .trim()
      .length < 2
  ) {
    errors.push(
      "Record the contrast agent used.",
    );
  }

  if (
    result
      .contrastVolumeMilliliters
      .trim() !== "" &&
    !Number.isFinite(
      Number(
        result
          .contrastVolumeMilliliters,
      ),
    )
  ) {
    errors.push(
      "Contrast volume must be a valid number.",
    );
  }

  if (
    result.criticalFinding &&
    result
      .criticalFindingDetails
      .trim()
      .length < 3
  ) {
    errors.push(
      "Describe the critical imaging finding.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function markDemoStructuredRadiologyResultReady(
  result:
    DemoStructuredRadiologyResult,
): DemoStructuredRadiologyResult {
  const timestamp =
    new Date().toISOString();

  return saveDemoStructuredRadiologyResult({
    ...result,

    status:
      "result-ready",

    resultReadyAt:
      timestamp,

    updatedAt:
      timestamp,
  });
}

export function acknowledgeDemoCriticalRadiologyFinding(
  resultId: string,

  recipient: string,

  notificationNote: string,
): DemoStructuredRadiologyResult |
  undefined {
  const normalizedRecipient =
    recipient.trim();

  if (
    normalizedRecipient.length <
    2
  ) {
    return undefined;
  }

  const results =
    readDemoStructuredRadiologyResults();

  const existingResult =
    results.find(
      (result) =>
        result.id === resultId,
    );

  if (
    existingResult ===
    undefined
  ) {
    return undefined;
  }

  const recalculatedResult =
    recalculateRadiologyResult(
      existingResult,
    );

  if (
    recalculatedResult
      .criticalNotificationStatus !==
    "pending"
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updatedResult:
    DemoStructuredRadiologyResult = {
    ...recalculatedResult,

    criticalNotificationStatus:
      "acknowledged",

    criticalNotificationRecipient:
      normalizedRecipient,

    criticalNotificationNote:
      notificationNote.trim(),

    criticalNotifiedAt:
      timestamp,

    criticalAcknowledgedAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  writeDemoStructuredRadiologyResults(
    results.map(
      (result) =>
        result.id ===
        resultId
          ? updatedResult
          : result,
    ),
  );

  return updatedResult;
}

export function finalizeDemoStructuredRadiologyResult(
  result:
    DemoStructuredRadiologyResult,
): DemoStructuredRadiologyResult |
  undefined {
  const recalculatedResult =
    recalculateRadiologyResult(
      result,
    );

  if (
    recalculatedResult.status !==
    "result-ready"
  ) {
    return undefined;
  }

  if (
    recalculatedResult
      .criticalNotificationStatus ===
    "pending"
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoStructuredRadiologyResult({
    ...recalculatedResult,

    status: "finalized",

    finalizedAt: timestamp,
    updatedAt: timestamp,
  });
}

export function buildStructuredRadiologyResultSummary(
  result:
    DemoStructuredRadiologyResult,
): string {
  return [
    result.studyName,

    result.impression,

    result.criticalFinding
      ? "Critical finding"
      : "No critical finding",
  ]
    .filter(Boolean)
    .join(" · ");
}