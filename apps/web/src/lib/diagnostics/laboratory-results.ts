import type {
  DemoDiagnosticOrder,
} from "./orders";

export type DemoLaboratoryAnalyteDataType =
  | "numeric"
  | "text";

export type DemoLaboratoryAnalyteStatus =
  | "pending"
  | "reported"
  | "not-performed";

export type DemoLaboratoryManualFlag =
  | "auto"
  | "normal"
  | "abnormal"
  | "critical";

export type DemoLaboratoryResultFlag =
  | "unflagged"
  | "normal"
  | "low"
  | "high"
  | "abnormal"
  | "critical"
  | "critical-low"
  | "critical-high";

export type DemoStructuredLaboratoryResultStatus =
  | "draft"
  | "result-ready"
  | "finalized";

export type DemoCriticalNotificationStatus =
  | "not-required"
  | "pending"
  | "acknowledged";

export interface DemoLaboratoryAnalyteResult {
  id: string;

  code: string;
  name: string;

  dataType:
    DemoLaboratoryAnalyteDataType;

  reportingStatus:
    DemoLaboratoryAnalyteStatus;

  value: string;
  unit: string;

  referenceLow: string;
  referenceHigh: string;
  referenceText: string;

  criticalLow: string;
  criticalHigh: string;

  manualFlag:
    DemoLaboratoryManualFlag;

  calculatedFlag:
    DemoLaboratoryResultFlag;

  notes: string;
}

export interface DemoStructuredLaboratoryResult {
  id: string;

  diagnosticOrderId: string;
  orderNumber: string;

  patientId: string;
  practitionerId: string;
  branchId: string;
  encounterId: string;

  panelCode: string;
  panelName: string;

  specimenType: string;

  status:
    DemoStructuredLaboratoryResultStatus;

  analytes:
    DemoLaboratoryAnalyteResult[];

  interpretation: string;
  technicalNotes: string;

  criticalNotificationStatus:
    DemoCriticalNotificationStatus;

  criticalNotificationRecipient:
    string;

  criticalNotificationNote:
    string;

  criticalNotifiedAt: string;
  criticalAcknowledgedAt: string;

  createdAt: string;
  updatedAt: string;

  resultReadyAt: string;
  finalizedAt: string;
}

interface LaboratoryAnalyteTemplate {
  code: string;
  name: string;

  dataType:
    DemoLaboratoryAnalyteDataType;
}

interface LaboratoryPanelTemplate {
  code: string;
  name: string;

  specimenType: string;

  keywords:
    readonly string[];

  analytes:
    readonly LaboratoryAnalyteTemplate[];
}

const LABORATORY_RESULT_STORAGE_KEY =
  "wonflow-demo-structured-laboratory-results";

const LABORATORY_PANEL_TEMPLATES:
  readonly LaboratoryPanelTemplate[] = [
    {
      code: "cbc",

      name:
        "Complete Blood Count",

      specimenType:
        "Whole Blood",

      keywords: [
        "cbc",
        "complete blood",
        "blood count",
      ],

      analytes: [
        {
          code: "HB",
          name: "Hemoglobin",
          dataType: "numeric",
        },
        {
          code: "WBC",
          name:
            "White Blood Cell Count",
          dataType: "numeric",
        },
        {
          code: "PLT",
          name: "Platelet Count",
          dataType: "numeric",
        },
        {
          code: "RBC",
          name:
            "Red Blood Cell Count",
          dataType: "numeric",
        },
        {
          code: "HCT",
          name: "Hematocrit",
          dataType: "numeric",
        },
      ],
    },
    {
      code: "lft",

      name:
        "Liver Function Panel",

      specimenType: "Serum",

      keywords: [
        "lft",
        "liver function",
        "hepatic",
      ],

      analytes: [
        {
          code: "BIL-T",
          name:
            "Total Bilirubin",
          dataType: "numeric",
        },
        {
          code: "ALT",
          name: "ALT",
          dataType: "numeric",
        },
        {
          code: "AST",
          name: "AST",
          dataType: "numeric",
        },
        {
          code: "ALP",
          name:
            "Alkaline Phosphatase",
          dataType: "numeric",
        },
        {
          code: "ALB",
          name: "Albumin",
          dataType: "numeric",
        },
      ],
    },
    {
      code: "rft",

      name:
        "Renal Function Panel",

      specimenType: "Serum",

      keywords: [
        "rft",
        "renal function",
        "kidney function",
      ],

      analytes: [
        {
          code: "CREA",
          name: "Creatinine",
          dataType: "numeric",
        },
        {
          code: "UREA",
          name: "Urea",
          dataType: "numeric",
        },
        {
          code: "NA",
          name: "Sodium",
          dataType: "numeric",
        },
        {
          code: "K",
          name: "Potassium",
          dataType: "numeric",
        },
      ],
    },
    {
      code: "lipid",

      name: "Lipid Profile",

      specimenType: "Serum",

      keywords: [
        "lipid",
        "cholesterol",
      ],

      analytes: [
        {
          code: "CHOL",
          name:
            "Total Cholesterol",
          dataType: "numeric",
        },
        {
          code: "HDL",
          name:
            "HDL Cholesterol",
          dataType: "numeric",
        },
        {
          code: "LDL",
          name:
            "LDL Cholesterol",
          dataType: "numeric",
        },
        {
          code: "TG",
          name: "Triglycerides",
          dataType: "numeric",
        },
      ],
    },
    {
      code: "urine",

      name: "Urine Analysis",

      specimenType: "Urine",

      keywords: [
        "urine",
        "urinalysis",
      ],

      analytes: [
        {
          code: "APPEARANCE",
          name: "Appearance",
          dataType: "text",
        },
        {
          code: "PROTEIN",
          name: "Protein",
          dataType: "text",
        },
        {
          code: "GLUCOSE",
          name: "Glucose",
          dataType: "text",
        },
        {
          code: "RBC",
          name: "Red Blood Cells",
          dataType: "text",
        },
        {
          code: "WBC",
          name:
            "White Blood Cells",
          dataType: "text",
        },
      ],
    },
    {
      code: "generic",

      name:
        "General Laboratory Test",

      specimenType: "Other",

      keywords: [],

      analytes: [
        {
          code: "RESULT",
          name: "Test Result",
          dataType: "text",
        },
      ],
    },
  ];

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

function inferLaboratoryPanel(
  orderName: string,
): LaboratoryPanelTemplate {
  const normalizedOrderName =
    orderName
      .trim()
      .toLocaleLowerCase();

  return (
    LABORATORY_PANEL_TEMPLATES.find(
      (template) =>
        template.keywords.some(
          (keyword) =>
            normalizedOrderName.includes(
              keyword,
            ),
        ),
    ) ??
    LABORATORY_PANEL_TEMPLATES[
      LABORATORY_PANEL_TEMPLATES.length -
        1
    ]
  );
}

function createAnalyteFromTemplate(
  template:
    LaboratoryAnalyteTemplate,
): DemoLaboratoryAnalyteResult {
  return {
    id:
      createIdentifier(
        "lab-analyte",
      ),

    code: template.code,
    name: template.name,

    dataType:
      template.dataType,

    reportingStatus:
      "pending",

    value: "",
    unit: "",

    referenceLow: "",
    referenceHigh: "",
    referenceText: "",

    criticalLow: "",
    criticalHigh: "",

    manualFlag: "auto",

    calculatedFlag:
      "unflagged",

    notes: "",
  };
}

export function createEmptyLaboratoryAnalyte():
  DemoLaboratoryAnalyteResult {
  return {
    id:
      createIdentifier(
        "lab-analyte",
      ),

    code: "",
    name: "",

    dataType: "numeric",

    reportingStatus:
      "pending",

    value: "",
    unit: "",

    referenceLow: "",
    referenceHigh: "",
    referenceText: "",

    criticalLow: "",
    criticalHigh: "",

    manualFlag: "auto",

    calculatedFlag:
      "unflagged",

    notes: "",
  };
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

export function calculateLaboratoryAnalyteFlag(
  analyte:
    DemoLaboratoryAnalyteResult,
): DemoLaboratoryResultFlag {
  if (
    analyte.reportingStatus !==
    "reported"
  ) {
    return "unflagged";
  }

  if (
    analyte.manualFlag !==
    "auto"
  ) {
    switch (
      analyte.manualFlag
    ) {
      case "normal":
        return "normal";

      case "abnormal":
        return "abnormal";

      case "critical":
        return "critical";
    }
  }

  if (
    analyte.dataType ===
    "text"
  ) {
    return "unflagged";
  }

  const numericValue =
    parseOptionalNumber(
      analyte.value,
    );

  if (
    numericValue === undefined
  ) {
    return "unflagged";
  }

  const criticalLow =
    parseOptionalNumber(
      analyte.criticalLow,
    );

  const criticalHigh =
    parseOptionalNumber(
      analyte.criticalHigh,
    );

  if (
    criticalLow !==
      undefined &&
    numericValue <
      criticalLow
  ) {
    return "critical-low";
  }

  if (
    criticalHigh !==
      undefined &&
    numericValue >
      criticalHigh
  ) {
    return "critical-high";
  }

  const referenceLow =
    parseOptionalNumber(
      analyte.referenceLow,
    );

  const referenceHigh =
    parseOptionalNumber(
      analyte.referenceHigh,
    );

  if (
    referenceLow !==
      undefined &&
    numericValue <
      referenceLow
  ) {
    return "low";
  }

  if (
    referenceHigh !==
      undefined &&
    numericValue >
      referenceHigh
  ) {
    return "high";
  }

  if (
    referenceLow !==
      undefined ||
    referenceHigh !==
      undefined
  ) {
    return "normal";
  }

  return "unflagged";
}

export function recalculateStructuredLaboratoryResult(
  result:
    DemoStructuredLaboratoryResult,
): DemoStructuredLaboratoryResult {
  const analytes =
    result.analytes.map(
      (analyte) => ({
        ...analyte,

        calculatedFlag:
          calculateLaboratoryAnalyteFlag(
            analyte,
          ),
      }),
    );

  const criticalResultExists =
    analytes.some(
      (analyte) =>
        analyte.calculatedFlag ===
          "critical" ||
        analyte.calculatedFlag ===
          "critical-low" ||
        analyte.calculatedFlag ===
          "critical-high",
    );

  const criticalNotificationStatus =
    !criticalResultExists
      ? "not-required"
      : result
            .criticalNotificationStatus ===
          "acknowledged"
        ? "acknowledged"
        : "pending";

  return {
    ...result,

    analytes,

    criticalNotificationStatus,

    updatedAt:
      new Date().toISOString(),
  };
}

export function readDemoStructuredLaboratoryResults():
  DemoStructuredLaboratoryResult[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      LABORATORY_RESULT_STORAGE_KEY,
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

    if (
      !Array.isArray(
        parsedValue,
      )
    ) {
      return [];
    }

    return parsedValue as
      DemoStructuredLaboratoryResult[];
  } catch {
    return [];
  }
}

export function writeDemoStructuredLaboratoryResults(
  results:
    readonly DemoStructuredLaboratoryResult[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    LABORATORY_RESULT_STORAGE_KEY,

    JSON.stringify(
      results.slice(0, 1000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-structured-laboratory-results-changed",
    ),
  );
}

export function createOrGetDemoStructuredLaboratoryResult(
  order:
    DemoDiagnosticOrder,
): DemoStructuredLaboratoryResult {
  const existingResults =
    readDemoStructuredLaboratoryResults();

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

  const template =
    inferLaboratoryPanel(
      order.orderName,
    );

  const timestamp =
    new Date().toISOString();

  const result:
    DemoStructuredLaboratoryResult =
    {
      id:
        createIdentifier(
          "structured-lab-result",
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

      panelCode:
        template.code,

      panelName:
        template.code ===
        "generic"
          ? order.orderName
          : template.name,

      specimenType:
        order.specimenType ??
        template.specimenType,

      status: "draft",

      analytes:
        template.analytes.map(
          createAnalyteFromTemplate,
        ),

      interpretation: "",
      technicalNotes: "",

      criticalNotificationStatus:
        "not-required",

      criticalNotificationRecipient:
        "",

      criticalNotificationNote:
        "",

      criticalNotifiedAt: "",
      criticalAcknowledgedAt:
        "",

      createdAt: timestamp,
      updatedAt: timestamp,

      resultReadyAt: "",
      finalizedAt: "",
    };

  writeDemoStructuredLaboratoryResults([
    result,
    ...existingResults,
  ]);

  return result;
}

export function saveDemoStructuredLaboratoryResult(
  result:
    DemoStructuredLaboratoryResult,
): DemoStructuredLaboratoryResult {
  const existingResults =
    readDemoStructuredLaboratoryResults();

  const normalizedResult =
    recalculateStructuredLaboratoryResult(
      {
        ...result,

        panelName:
          result.panelName.trim(),

        specimenType:
          result.specimenType.trim(),

        interpretation:
          result.interpretation.trim(),

        technicalNotes:
          result.technicalNotes.trim(),

        analytes:
          result.analytes.map(
            (analyte) => ({
              ...analyte,

              code:
                analyte.code.trim(),

              name:
                analyte.name.trim(),

              value:
                analyte.value.trim(),

              unit:
                analyte.unit.trim(),

              referenceLow:
                analyte.referenceLow
                  .trim(),

              referenceHigh:
                analyte.referenceHigh
                  .trim(),

              referenceText:
                analyte.referenceText
                  .trim(),

              criticalLow:
                analyte.criticalLow
                  .trim(),

              criticalHigh:
                analyte.criticalHigh
                  .trim(),

              notes:
                analyte.notes.trim(),
            }),
          ),
      },
    );

  const recordExists =
    existingResults.some(
      (record) =>
        record.id ===
        normalizedResult.id,
    );

  writeDemoStructuredLaboratoryResults(
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

function isValidOptionalNumber(
  value: string,
): boolean {
  return (
    value.trim() === "" ||
    parseOptionalNumber(
      value,
    ) !== undefined
  );
}

export function validateDemoStructuredLaboratoryResult(
  result:
    DemoStructuredLaboratoryResult,
): string[] {
  const errors: string[] =
    [];

  if (
    result.panelName
      .trim() === ""
  ) {
    errors.push(
      "Enter the laboratory panel or test name.",
    );
  }

  if (
    result.specimenType
      .trim() === ""
  ) {
    errors.push(
      "Record the specimen type.",
    );
  }

  if (
    result.analytes.length ===
    0
  ) {
    errors.push(
      "Add at least one laboratory analyte.",
    );

    return errors;
  }

  const pendingAnalytes =
    result.analytes.filter(
      (analyte) =>
        analyte.reportingStatus ===
        "pending",
    );

  if (
    pendingAnalytes.length > 0
  ) {
    errors.push(
      `${pendingAnalytes.length} analyte${pendingAnalytes.length === 1 ? " remains" : "s remain"} pending.`,
    );
  }

  result.analytes.forEach(
    (analyte) => {
      const analyteLabel =
        analyte.name.trim() ||
        analyte.code.trim() ||
        "Unnamed analyte";

      if (
        analyte.name.trim() ===
        ""
      ) {
        errors.push(
          "Every analyte requires a name.",
        );
      }

      if (
        analyte.reportingStatus ===
          "reported" &&
        analyte.value.trim() ===
          ""
      ) {
        errors.push(
          `${analyteLabel} requires a result value.`,
        );
      }

      if (
        analyte.reportingStatus ===
          "not-performed" &&
        analyte.notes
          .trim()
          .length < 2
      ) {
        errors.push(
          `${analyteLabel} requires a reason when marked not performed.`,
        );
      }

      if (
        analyte.dataType ===
          "numeric" &&
        analyte.reportingStatus ===
          "reported" &&
        parseOptionalNumber(
          analyte.value,
        ) === undefined
      ) {
        errors.push(
          `${analyteLabel} requires a valid numeric value.`,
        );
      }

      const numericFields = [
        analyte.referenceLow,
        analyte.referenceHigh,
        analyte.criticalLow,
        analyte.criticalHigh,
      ];

      if (
        numericFields.some(
          (value) =>
            !isValidOptionalNumber(
              value,
            ),
        )
      ) {
        errors.push(
          `${analyteLabel} contains an invalid reference or critical limit.`,
        );
      }
    },
  );

  const reportedAnalyteExists =
    result.analytes.some(
      (analyte) =>
        analyte.reportingStatus ===
        "reported",
    );

  if (
    !reportedAnalyteExists
  ) {
    errors.push(
      "At least one analyte must contain a reported result.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function markDemoStructuredLaboratoryResultReady(
  result:
    DemoStructuredLaboratoryResult,
): DemoStructuredLaboratoryResult {
  const timestamp =
    new Date().toISOString();

  return saveDemoStructuredLaboratoryResult({
    ...result,

    status:
      "result-ready",

    resultReadyAt:
      timestamp,

    updatedAt:
      timestamp,
  });
}

export function acknowledgeDemoCriticalLaboratoryResult(
  resultId: string,

  recipient: string,
  note: string,
): DemoStructuredLaboratoryResult |
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
    readDemoStructuredLaboratoryResults();

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
    recalculateStructuredLaboratoryResult(
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
    DemoStructuredLaboratoryResult =
    {
      ...recalculatedResult,

      criticalNotificationStatus:
        "acknowledged",

      criticalNotificationRecipient:
        normalizedRecipient,

      criticalNotificationNote:
        note.trim(),

      criticalNotifiedAt:
        timestamp,

      criticalAcknowledgedAt:
        timestamp,

      updatedAt:
        timestamp,
    };

  writeDemoStructuredLaboratoryResults(
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

export function finalizeDemoStructuredLaboratoryResult(
  result:
    DemoStructuredLaboratoryResult,
): DemoStructuredLaboratoryResult |
  undefined {
  const recalculatedResult =
    recalculateStructuredLaboratoryResult(
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

  return saveDemoStructuredLaboratoryResult({
    ...recalculatedResult,

    status: "finalized",

    finalizedAt: timestamp,
    updatedAt: timestamp,
  });
}

export function buildStructuredLaboratoryResultSummary(
  result:
    DemoStructuredLaboratoryResult,
): string {
  const recalculatedResult =
    recalculateStructuredLaboratoryResult(
      result,
    );

  const reportedCount =
    recalculatedResult
      .analytes
      .filter(
        (analyte) =>
          analyte.reportingStatus ===
          "reported",
      ).length;

  const abnormalCount =
    recalculatedResult
      .analytes
      .filter(
        (analyte) =>
          [
            "low",
            "high",
            "abnormal",
            "critical",
            "critical-low",
            "critical-high",
          ].includes(
            analyte.calculatedFlag,
          ),
      ).length;

  const criticalCount =
    recalculatedResult
      .analytes
      .filter(
        (analyte) =>
          [
            "critical",
            "critical-low",
            "critical-high",
          ].includes(
            analyte.calculatedFlag,
          ),
      ).length;

  return [
    recalculatedResult
      .panelName,

    `${reportedCount} reported`,

    `${abnormalCount} abnormal`,

    `${criticalCount} critical`,
  ].join(" · ");
}