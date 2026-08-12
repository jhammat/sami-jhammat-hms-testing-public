import {
  readDemoClinicalDocumentation,
} from "../clinical/documentation";

import type {
  DemoClinicalDocumentation,
} from "../clinical/documentation";

export type DemoPharmacyCaseStatus =
  | "prescribed"
  | "queued"
  | "partially-dispensed"
  | "dispensed"
  | "cancelled";

export type DemoPharmacyPriority =
  | "routine"
  | "urgent";

export interface DemoPharmacyStockItem {
  id: string;

  genericName: string;
  brandName: string;

  strength: string;
  dosageForm: string;

  batchNumber: string;
  expiryDate: string;

  availableQuantity: number;
  reorderLevel: number;

  unitPrice: number;
  currencyCode: "PKR";

  active: boolean;
}

export interface DemoPharmacyDispensingLine {
  id: string;

  sourcePrescriptionId: string;

  medicineName: string;
  strength: string;
  dosageForm: string;

  dose: string;
  route: string;
  frequency: string;
  duration: string;

  instructions: string;

  prescribedQuantity: number;

  selectedStockItemId: string;

  dispensedQuantity: number;

  substitutionApproved: boolean;
  substitutionReason: string;
}

export interface DemoPharmacyDispensingCase {
  id: string;

  prescriptionNumber: string;
  receiptNumber: string;

  sourceClinicalDocumentationId: string;

  encounterId: string;
  patientId: string;
  practitionerId: string;
  branchId: string;

  priority:
    DemoPharmacyPriority;

  status:
    DemoPharmacyCaseStatus;

  lines:
    DemoPharmacyDispensingLine[];

  pharmacistName: string;
  dispensingNotes: string;

  prescribedAt: string;
  createdAt: string;
  updatedAt: string;

  dispensedAt: string;
  cancelledAt: string;
}

const PHARMACY_CASE_STORAGE_KEY =
  "wonflow-demo-pharmacy-dispensing-cases";

const PHARMACY_STOCK_STORAGE_KEY =
  "wonflow-demo-pharmacy-stock";

const DEFAULT_PHARMACY_STOCK:
  readonly DemoPharmacyStockItem[] = [
    {
      id: "stock-paracetamol-500",

      genericName: "Paracetamol",
      brandName: "Panadol",

      strength: "500 mg",
      dosageForm: "Tablet",

      batchNumber: "PCM-2026-01",
      expiryDate: "2028-03-31",

      availableQuantity: 500,
      reorderLevel: 100,

      unitPrice: 4,
      currencyCode: "PKR",

      active: true,
    },
    {
      id: "stock-amoxicillin-500",

      genericName: "Amoxicillin",
      brandName: "Amoxil",

      strength: "500 mg",
      dosageForm: "Capsule",

      batchNumber: "AMX-2026-04",
      expiryDate: "2027-12-31",

      availableQuantity: 180,
      reorderLevel: 50,

      unitPrice: 18,
      currencyCode: "PKR",

      active: true,
    },
    {
      id: "stock-omeprazole-20",

      genericName: "Omeprazole",
      brandName: "Risek",

      strength: "20 mg",
      dosageForm: "Capsule",

      batchNumber: "OMP-2026-02",
      expiryDate: "2028-01-31",

      availableQuantity: 220,
      reorderLevel: 60,

      unitPrice: 22,
      currencyCode: "PKR",

      active: true,
    },
    {
      id: "stock-ibuprofen-400",

      genericName: "Ibuprofen",
      brandName: "Brufen",

      strength: "400 mg",
      dosageForm: "Tablet",

      batchNumber: "IBU-2026-05",
      expiryDate: "2028-05-31",

      availableQuantity: 260,
      reorderLevel: 70,

      unitPrice: 9,
      currencyCode: "PKR",

      active: true,
    },
    {
      id: "stock-cetirizine-10",

      genericName: "Cetirizine",
      brandName: "Rigix",

      strength: "10 mg",
      dosageForm: "Tablet",

      batchNumber: "CTZ-2026-03",
      expiryDate: "2028-02-28",

      availableQuantity: 140,
      reorderLevel: 40,

      unitPrice: 10,
      currencyCode: "PKR",

      active: true,
    },
    {
      id: "stock-metformin-500",

      genericName: "Metformin",
      brandName: "Glucophage",

      strength: "500 mg",
      dosageForm: "Tablet",

      batchNumber: "MET-2026-07",
      expiryDate: "2028-06-30",

      availableQuantity: 300,
      reorderLevel: 90,

      unitPrice: 12,
      currencyCode: "PKR",

      active: true,
    },
    {
      id: "stock-azithromycin-500",

      genericName: "Azithromycin",
      brandName: "Zithromax",

      strength: "500 mg",
      dosageForm: "Tablet",

      batchNumber: "AZM-2026-09",
      expiryDate: "2027-11-30",

      availableQuantity: 75,
      reorderLevel: 30,

      unitPrice: 65,
      currencyCode: "PKR",

      active: true,
    },
    {
      id: "stock-salbutamol-inhaler",

      genericName: "Salbutamol",
      brandName: "Ventolin",

      strength: "100 mcg",
      dosageForm: "Inhaler",

      batchNumber: "SLB-2026-06",
      expiryDate: "2027-10-31",

      availableQuantity: 35,
      reorderLevel: 15,

      unitPrice: 580,
      currencyCode: "PKR",

      active: true,
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

function padNumber(
  value: number,
): string {
  return String(value)
    .padStart(2, "0");
}

function createDateCode(): string {
  const currentDate =
    new Date();

  return [
    currentDate.getFullYear(),

    padNumber(
      currentDate.getMonth() + 1,
    ),

    padNumber(
      currentDate.getDate(),
    ),
  ].join("");
}

function generatePrescriptionNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `RX-${createDateCode()}-${randomPart}`;
}

function generateReceiptNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `RXD-${createDateCode()}-${randomPart}`;
}

function isRecord(
  value: unknown,
): value is
  Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !== null
  );
}

function readString(
  record:
    Record<string, unknown>,

  keys:
    readonly string[],
): string {
  for (
    const key of keys
  ) {
    const value =
      record[key];

    if (
      typeof value ===
      "string" &&
      value.trim() !== ""
    ) {
      return value.trim();
    }
  }

  return "";
}

function readPositiveNumber(
  record:
    Record<string, unknown>,

  keys:
    readonly string[],
): number | undefined {
  for (
    const key of keys
  ) {
    const value =
      record[key];

    if (
      typeof value ===
        "number" &&
      Number.isFinite(value) &&
      value > 0
    ) {
      return value;
    }

    if (
      typeof value ===
        "string" &&
      value.trim() !== ""
    ) {
      const parsedValue =
        Number(value);

      if (
        Number.isFinite(
          parsedValue,
        ) &&
        parsedValue > 0
      ) {
        return parsedValue;
      }
    }
  }

  return undefined;
}

function createDispensingLines(
  documentation:
    DemoClinicalDocumentation,
): DemoPharmacyDispensingLine[] {
  const rawPrescriptions =
    documentation
      .prescriptions as
      readonly unknown[];

  return rawPrescriptions
    .map(
      (
        prescription,
        index,
      ) => {
        if (
          !isRecord(
            prescription,
          )
        ) {
          return undefined;
        }

        const medicineName =
          readString(
            prescription,

            [
              "medicineName",
              "medicationName",
              "drugName",
              "name",
            ],
          );

        if (
          medicineName === ""
        ) {
          return undefined;
        }

        return {
          id:
            createIdentifier(
              "pharmacy-line",
            ),

          sourcePrescriptionId:
            readString(
              prescription,
              ["id"],
            ) ||
            `${documentation.id}-${index + 1}`,

          medicineName,

          strength:
            readString(
              prescription,

              [
                "strength",
                "medicineStrength",
              ],
            ),

          dosageForm:
            readString(
              prescription,

              [
                "dosageForm",
                "form",
              ],
            ),

          dose:
            readString(
              prescription,

              [
                "dose",
                "dosage",
              ],
            ),

          route:
            readString(
              prescription,
              ["route"],
            ),

          frequency:
            readString(
              prescription,

              [
                "frequency",
                "frequencyText",
              ],
            ),

          duration:
            readString(
              prescription,

              [
                "duration",
                "durationText",
              ],
            ),

          instructions:
            readString(
              prescription,

              [
                "instructions",
                "notes",
                "directions",
              ],
            ),

          prescribedQuantity:
            readPositiveNumber(
              prescription,

              [
                "quantity",
                "prescribedQuantity",
                "totalQuantity",
              ],
            ) ?? 1,

          selectedStockItemId:
            "",

          dispensedQuantity: 0,

          substitutionApproved:
            false,

          substitutionReason:
            "",
        };
      },
    )
    .filter(
      (
        line,
      ): line is
        DemoPharmacyDispensingLine =>
        line !== undefined,
    );
}

export function readDemoPharmacyStock():
  DemoPharmacyStockItem[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      PHARMACY_STOCK_STORAGE_KEY,
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
          DemoPharmacyStockItem[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoPharmacyStock(
  stock:
    readonly DemoPharmacyStockItem[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    PHARMACY_STOCK_STORAGE_KEY,

    JSON.stringify(
      stock.slice(0, 2000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-pharmacy-stock-changed",
    ),
  );
}

export function initializeDemoPharmacyStock():
  DemoPharmacyStockItem[] {
  const stock =
    readDemoPharmacyStock();

  if (
    typeof window !==
      "undefined" &&
    window.localStorage.getItem(
      PHARMACY_STOCK_STORAGE_KEY,
    ) === null
  ) {
    writeDemoPharmacyStock(
      stock,
    );
  }

  return stock;
}

export function readDemoPharmacyDispensingCases():
  DemoPharmacyDispensingCase[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      PHARMACY_CASE_STORAGE_KEY,
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
          DemoPharmacyDispensingCase[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoPharmacyDispensingCases(
  cases:
    readonly DemoPharmacyDispensingCase[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    PHARMACY_CASE_STORAGE_KEY,

    JSON.stringify(
      cases.slice(0, 1000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-pharmacy-cases-changed",
    ),
  );
}

export function saveDemoPharmacyDispensingCase(
  dispensingCase:
    DemoPharmacyDispensingCase,
): DemoPharmacyDispensingCase {
  const cases =
    readDemoPharmacyDispensingCases();

  const normalizedCase:
    DemoPharmacyDispensingCase =
    {
      ...dispensingCase,

      pharmacistName:
        dispensingCase
          .pharmacistName
          .trim(),

      dispensingNotes:
        dispensingCase
          .dispensingNotes
          .trim(),

      lines:
        dispensingCase
          .lines
          .map(
            (line) => ({
              ...line,

              medicineName:
                line.medicineName
                  .trim(),

              strength:
                line.strength
                  .trim(),

              dosageForm:
                line.dosageForm
                  .trim(),

              dose:
                line.dose.trim(),

              route:
                line.route.trim(),

              frequency:
                line.frequency
                  .trim(),

              duration:
                line.duration
                  .trim(),

              instructions:
                line.instructions
                  .trim(),

              substitutionReason:
                line
                  .substitutionReason
                  .trim(),
            }),
          ),

      updatedAt:
        new Date().toISOString(),
    };

  const exists =
    cases.some(
      (record) =>
        record.id ===
        normalizedCase.id,
    );

  writeDemoPharmacyDispensingCases(
    exists
      ? cases.map(
          (record) =>
            record.id ===
            normalizedCase.id
              ? normalizedCase
              : record,
        )
      : [
          normalizedCase,
          ...cases,
        ],
  );

  return normalizedCase;
}

export function dispatchPharmacyPrescriptionFromDocumentation(
  documentation:
    DemoClinicalDocumentation,
): DemoPharmacyDispensingCase |
  undefined {
  if (
    documentation.status !==
    "completed"
  ) {
    return undefined;
  }

  const existingCases =
    readDemoPharmacyDispensingCases();

  const existingCase =
    existingCases.find(
      (record) =>
        record
          .sourceClinicalDocumentationId ===
        documentation.id,
    );

  if (
    existingCase !==
    undefined
  ) {
    return undefined;
  }

  const lines =
    createDispensingLines(
      documentation,
    );

  if (
    lines.length === 0
  ) {
    return undefined;
  }

  const timestamp =
    documentation.completedAt ||
    documentation.updatedAt ||
    new Date().toISOString();

  const dispensingCase:
    DemoPharmacyDispensingCase =
    {
      id:
        createIdentifier(
          "pharmacy-case",
        ),

      prescriptionNumber:
        generatePrescriptionNumber(),

      receiptNumber: "",

      sourceClinicalDocumentationId:
        documentation.id,

      encounterId:
        documentation.encounterId,

      patientId:
        documentation.patientId,

      practitionerId:
        documentation.practitionerId,

      branchId:
        documentation.branchId,

      priority: "routine",

      status: "prescribed",

      lines,

      pharmacistName: "",
      dispensingNotes: "",

      prescribedAt:
        timestamp,

      createdAt: timestamp,
      updatedAt: timestamp,

      dispensedAt: "",
      cancelledAt: "",
    };

  writeDemoPharmacyDispensingCases([
    dispensingCase,
    ...existingCases,
  ]);

  return dispensingCase;
}

export function synchronizeCompletedPharmacyPrescriptions():
  DemoPharmacyDispensingCase[] {
  const completedDocumentation =
    readDemoClinicalDocumentation()
      .filter(
        (documentation) =>
          documentation.status ===
          "completed",
      );

  const createdCases:
    DemoPharmacyDispensingCase[] =
    [];

  completedDocumentation.forEach(
    (documentation) => {
      const createdCase =
        dispatchPharmacyPrescriptionFromDocumentation(
          documentation,
        );

      if (
        createdCase !==
        undefined
      ) {
        createdCases.push(
          createdCase,
        );
      }
    },
  );

  return createdCases;
}

function normalizeMedicineName(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll("-", " ")
    .replaceAll("_", " ");
}

export function isLikelyMatchingStockItem(
  line:
    DemoPharmacyDispensingLine,

  stockItem:
    DemoPharmacyStockItem,
): boolean {
  const prescribedName =
    normalizeMedicineName(
      line.medicineName,
    );

  const genericName =
    normalizeMedicineName(
      stockItem.genericName,
    );

  const brandName =
    normalizeMedicineName(
      stockItem.brandName,
    );

  return (
    prescribedName.includes(
      genericName,
    ) ||
    genericName.includes(
      prescribedName,
    ) ||
    prescribedName.includes(
      brandName,
    ) ||
    brandName.includes(
      prescribedName,
    )
  );
}

export function validateDemoPharmacyDispensing(
  dispensingCase:
    DemoPharmacyDispensingCase,

  stock:
    readonly DemoPharmacyStockItem[],
): string[] {
  const errors:
    string[] = [];

  if (
    dispensingCase.status ===
      "dispensed" ||
    dispensingCase.status ===
      "partially-dispensed" ||
    dispensingCase.status ===
      "cancelled"
  ) {
    errors.push(
      "This pharmacy case is already closed.",
    );

    return errors;
  }

  if (
    dispensingCase
      .pharmacistName
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the dispensing pharmacist or pharmacy staff member.",
    );
  }

  const linesToDispense =
    dispensingCase.lines
      .filter(
        (line) =>
          line.dispensedQuantity >
          0,
      );

  if (
    linesToDispense.length ===
    0
  ) {
    errors.push(
      "Enter a dispensing quantity for at least one medicine.",
    );
  }

  linesToDispense.forEach(
    (line) => {
      const stockItem =
        stock.find(
          (item) =>
            item.id ===
            line.selectedStockItemId,
        );

      if (
        stockItem ===
        undefined
      ) {
        errors.push(
          `${line.medicineName}: select a pharmacy stock item.`,
        );

        return;
      }

      if (
        !stockItem.active
      ) {
        errors.push(
          `${line.medicineName}: the selected stock item is inactive.`,
        );
      }

      if (
        line.dispensedQuantity >
        line.prescribedQuantity
      ) {
        errors.push(
          `${line.medicineName}: dispensed quantity cannot exceed the prescribed quantity.`,
        );
      }

      if (
        line.dispensedQuantity >
        stockItem.availableQuantity
      ) {
        errors.push(
          `${line.medicineName}: only ${stockItem.availableQuantity} unit(s) are available.`,
        );
      }

      const substitution =
        !isLikelyMatchingStockItem(
          line,
          stockItem,
        );

      if (
        substitution &&
        (
          !line.substitutionApproved ||
          line
            .substitutionReason
            .trim()
            .length < 3
        )
      ) {
        errors.push(
          `${line.medicineName}: approve the substitution and record its reason.`,
        );
      }
    },
  );

  return [
    ...new Set(errors),
  ];
}

export function completeDemoPharmacyDispensing(
  dispensingCase:
    DemoPharmacyDispensingCase,
): {
  dispensingCase:
    DemoPharmacyDispensingCase;

  stock:
    DemoPharmacyStockItem[];
} | undefined {
  const stock =
    readDemoPharmacyStock();

  const errors =
    validateDemoPharmacyDispensing(
      dispensingCase,
      stock,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const updatedStock =
    stock.map(
      (stockItem) => {
        const totalDispensed =
          dispensingCase
            .lines
            .filter(
              (line) =>
                line
                  .selectedStockItemId ===
                stockItem.id,
            )
            .reduce(
              (
                total,
                line,
              ) =>
                total +
                line
                  .dispensedQuantity,

              0,
            );

        if (
          totalDispensed === 0
        ) {
          return stockItem;
        }

        return {
          ...stockItem,

          availableQuantity:
            stockItem
              .availableQuantity -
            totalDispensed,
        };
      },
    );

  const fullyDispensed =
    dispensingCase.lines.every(
      (line) =>
        line.dispensedQuantity ===
        line.prescribedQuantity,
    );

  const timestamp =
    new Date().toISOString();

  const completedCase:
    DemoPharmacyDispensingCase =
    {
      ...dispensingCase,

      receiptNumber:
        dispensingCase
          .receiptNumber ||
        generateReceiptNumber(),

      status:
        fullyDispensed
          ? "dispensed"
          : "partially-dispensed",

      dispensedAt:
        timestamp,

      updatedAt:
        timestamp,
    };

  writeDemoPharmacyStock(
    updatedStock,
  );

  saveDemoPharmacyDispensingCase(
    completedCase,
  );

  return {
    dispensingCase:
      completedCase,

    stock:
      updatedStock,
  };
}

export function cancelDemoPharmacyDispensingCase(
  caseId: string,
): DemoPharmacyDispensingCase |
  undefined {
  const cases =
    readDemoPharmacyDispensingCases();

  const existingCase =
    cases.find(
      (record) =>
        record.id === caseId,
    );

  if (
    existingCase ===
      undefined ||
    existingCase.status ===
      "dispensed" ||
    existingCase.status ===
      "partially-dispensed" ||
    existingCase.status ===
      "cancelled"
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const cancelledCase:
    DemoPharmacyDispensingCase =
    {
      ...existingCase,

      status: "cancelled",

      cancelledAt:
        timestamp,

      updatedAt:
        timestamp,
    };

  writeDemoPharmacyDispensingCases(
    cases.map(
      (record) =>
        record.id ===
        caseId
          ? cancelledCase
          : record,
    ),
  );

  return cancelledCase;
}

export function calculateDemoPharmacyCaseTotal(
  dispensingCase:
    DemoPharmacyDispensingCase,

  stock:
    readonly DemoPharmacyStockItem[],
): number {
  return dispensingCase
    .lines
    .reduce(
      (
        total,
        line,
      ) => {
        const stockItem =
          stock.find(
            (item) =>
              item.id ===
              line.selectedStockItemId,
          );

        if (
          stockItem ===
          undefined
        ) {
          return total;
        }

        return (
          total +
          line.dispensedQuantity *
            stockItem.unitPrice
        );
      },
      0,
    );
}
