import {
  readDemoPharmacyDispensingCases,
  readDemoPharmacyStock,
  writeDemoPharmacyStock,
} from "./dispensing";

import type {
  DemoPharmacyDispensingCase,
  DemoPharmacyStockItem,
} from "./dispensing";

import {
  getDemoPharmacyExpiryInformation,
  readDemoPharmacyStockMovements,
  writeDemoPharmacyStockMovements,
} from "./inventory";

import type {
  DemoPharmacyStockMovement,
} from "./inventory";

export type DemoPharmacyReturnStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "completed";

export type DemoPharmacyPackageCondition =
  | "sealed"
  | "opened"
  | "damaged"
  | "expired";

export type DemoPharmacyReturnDisposition =
  | "restock"
  | "quarantine"
  | "destroy";

export type DemoPharmacyRefundStatus =
  | "not-requested"
  | "pending-cashier"
  | "completed"
  | "rejected";

export interface DemoPharmacyReturnLine {
  id: string;

  sourceDispensingLineId: string;
  stockItemId: string;

  medicineName: string;
  stockDisplayName: string;
  strength: string;

  dispensedQuantity: number;
  maximumReturnableQuantity: number;
  returnQuantity: number;

  unitPrice: number;

  packageCondition:
    DemoPharmacyPackageCondition;

  disposition:
    DemoPharmacyReturnDisposition;

  reason: string;
}

export interface DemoPharmacyReturnCase {
  id: string;

  returnNumber: string;

  sourceDispensingCaseId: string;
  prescriptionNumber: string;
  receiptNumber: string;

  patientId: string;
  practitionerId: string;
  branchId: string;
  encounterId: string;

  status:
    DemoPharmacyReturnStatus;

  lines:
    DemoPharmacyReturnLine[];

  receivedBy: string;
  returnNote: string;

  approvedBy: string;
  approvalNote: string;

  refundRequested: boolean;

  refundStatus:
    DemoPharmacyRefundStatus;

  refundAmount: number;

  refundProcessedBy: string;
  refundReference: string;
  refundNote: string;

  createdAt: string;
  updatedAt: string;

  submittedAt: string;
  approvedAt: string;
  rejectedAt: string;
  completedAt: string;
  refundProcessedAt: string;
}

const PHARMACY_RETURN_STORAGE_KEY =
  "wonflow-demo-pharmacy-return-cases";

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

function generateReturnNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `RXR-${createDateCode()}-${randomPart}`;
}

function cloneReturnCase(
  returnCase:
    DemoPharmacyReturnCase,
): DemoPharmacyReturnCase {
  return {
    ...returnCase,

    lines:
      returnCase.lines.map(
        (line) => ({
          ...line,
        }),
      ),
  };
}

export function readDemoPharmacyReturnCases():
  DemoPharmacyReturnCase[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      PHARMACY_RETURN_STORAGE_KEY,
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
          DemoPharmacyReturnCase[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoPharmacyReturnCases(
  returnCases:
    readonly DemoPharmacyReturnCase[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    PHARMACY_RETURN_STORAGE_KEY,

    JSON.stringify(
      returnCases.slice(0, 2000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-pharmacy-returns-changed",
    ),
  );
}

export function calculateDemoPharmacyReturnTotal(
  returnCase:
    DemoPharmacyReturnCase,
): number {
  return returnCase.lines.reduce(
    (
      total,
      line,
    ) =>
      total +
      line.returnQuantity *
        line.unitPrice,

    0,
  );
}

export function getDemoPharmacyCompletedReturnedQuantity(
  sourceDispensingCaseId:
    string,

  sourceDispensingLineId:
    string,

  excludedReturnCaseId?: string,
): number {
  return readDemoPharmacyReturnCases()
    .filter(
      (returnCase) =>
        returnCase
          .sourceDispensingCaseId ===
          sourceDispensingCaseId &&
        returnCase.status ===
          "completed" &&
        returnCase.id !==
          excludedReturnCaseId,
    )
    .flatMap(
      (returnCase) =>
        returnCase.lines,
    )
    .filter(
      (line) =>
        line.sourceDispensingLineId ===
        sourceDispensingLineId,
    )
    .reduce(
      (
        total,
        line,
      ) =>
        total +
        line.returnQuantity,

      0,
    );
}

export function getDemoPharmacyDispensingCaseReturnableQuantity(
  dispensingCase:
    DemoPharmacyDispensingCase,
): number {
  return dispensingCase.lines.reduce(
    (
      total,
      line,
    ) => {
      const alreadyReturned =
        getDemoPharmacyCompletedReturnedQuantity(
          dispensingCase.id,
          line.id,
        );

      return (
        total +
        Math.max(
          0,
          line.dispensedQuantity -
            alreadyReturned,
        )
      );
    },
    0,
  );
}

export function createDemoPharmacyReturnCase(
  sourceDispensingCaseId:
    string,
): DemoPharmacyReturnCase |
  undefined {
  const dispensingCase =
    readDemoPharmacyDispensingCases()
      .find(
        (record) =>
          record.id ===
          sourceDispensingCaseId,
      );

  if (
    dispensingCase ===
      undefined ||
    (
      dispensingCase.status !==
        "dispensed" &&
      dispensingCase.status !==
        "partially-dispensed"
    )
  ) {
    return undefined;
  }

  const existingReturns =
    readDemoPharmacyReturnCases();

  const existingOpenReturn =
    existingReturns.find(
      (returnCase) =>
        returnCase
          .sourceDispensingCaseId ===
          dispensingCase.id &&
        (
          returnCase.status ===
            "draft" ||
          returnCase.status ===
            "submitted" ||
          returnCase.status ===
            "approved"
        ),
    );

  if (
    existingOpenReturn !==
    undefined
  ) {
    return cloneReturnCase(
      existingOpenReturn,
    );
  }

  const stock =
    readDemoPharmacyStock();

  const lines:
    DemoPharmacyReturnLine[] =
    dispensingCase.lines
      .map(
        (dispensingLine) => {
          const previouslyReturned =
            getDemoPharmacyCompletedReturnedQuantity(
              dispensingCase.id,
              dispensingLine.id,
            );

          const maximumReturnableQuantity =
            Math.max(
              0,

              dispensingLine
                .dispensedQuantity -
                previouslyReturned,
            );

          if (
            maximumReturnableQuantity ===
            0
          ) {
            return undefined;
          }

          const stockItem =
            stock.find(
              (item) =>
                item.id ===
                dispensingLine
                  .selectedStockItemId,
            );

          return {
            id:
              createIdentifier(
                "return-line",
              ),

            sourceDispensingLineId:
              dispensingLine.id,

            stockItemId:
              dispensingLine
                .selectedStockItemId,

            medicineName:
              dispensingLine
                .medicineName,

            stockDisplayName:
              stockItem ===
              undefined
                ? dispensingLine
                    .medicineName
                : `${stockItem.brandName} (${stockItem.genericName})`,

            strength:
              stockItem
                ?.strength ??
              dispensingLine
                .strength,

            dispensedQuantity:
              dispensingLine
                .dispensedQuantity,

            maximumReturnableQuantity,

            returnQuantity: 0,

            unitPrice:
              stockItem
                ?.unitPrice ??
              0,

            packageCondition:
              "sealed",

            disposition:
              "quarantine",

            reason: "",
          };
        },
      )
      .filter(
        (
          line,
        ): line is
          DemoPharmacyReturnLine =>
          line !== undefined,
      );

  if (lines.length === 0) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const returnCase:
    DemoPharmacyReturnCase = {
    id:
      createIdentifier(
        "pharmacy-return",
      ),

    returnNumber:
      generateReturnNumber(),

    sourceDispensingCaseId:
      dispensingCase.id,

    prescriptionNumber:
      dispensingCase
        .prescriptionNumber,

    receiptNumber:
      dispensingCase
        .receiptNumber,

    patientId:
      dispensingCase.patientId,

    practitionerId:
      dispensingCase
        .practitionerId,

    branchId:
      dispensingCase.branchId,

    encounterId:
      dispensingCase.encounterId,

    status: "draft",

    lines,

    receivedBy: "",
    returnNote: "",

    approvedBy: "",
    approvalNote: "",

    refundRequested: false,

    refundStatus:
      "not-requested",

    refundAmount: 0,

    refundProcessedBy: "",
    refundReference: "",
    refundNote: "",

    createdAt: timestamp,
    updatedAt: timestamp,

    submittedAt: "",
    approvedAt: "",
    rejectedAt: "",
    completedAt: "",
    refundProcessedAt: "",
  };

  writeDemoPharmacyReturnCases([
    returnCase,
    ...existingReturns,
  ]);

  return cloneReturnCase(
    returnCase,
  );
}

export function saveDemoPharmacyReturnCase(
  returnCase:
    DemoPharmacyReturnCase,
): DemoPharmacyReturnCase {
  const existingReturns =
    readDemoPharmacyReturnCases();

  const normalizedCase:
    DemoPharmacyReturnCase = {
    ...returnCase,

    receivedBy:
      returnCase.receivedBy
        .trim(),

    returnNote:
      returnCase.returnNote
        .trim(),

    approvedBy:
      returnCase.approvedBy
        .trim(),

    approvalNote:
      returnCase.approvalNote
        .trim(),

    refundAmount:
      returnCase.refundRequested
        ? calculateDemoPharmacyReturnTotal(
            returnCase,
          )
        : 0,

    refundStatus:
      returnCase.refundRequested
        ? returnCase
            .refundStatus ===
          "not-requested"
          ? "pending-cashier"
          : returnCase
              .refundStatus
        : "not-requested",

    lines:
      returnCase.lines.map(
        (line) => ({
          ...line,

          reason:
            line.reason.trim(),
        }),
      ),

    updatedAt:
      new Date().toISOString(),
  };

  const exists =
    existingReturns.some(
      (record) =>
        record.id ===
        normalizedCase.id,
    );

  writeDemoPharmacyReturnCases(
    exists
      ? existingReturns.map(
          (record) =>
            record.id ===
            normalizedCase.id
              ? normalizedCase
              : record,
        )
      : [
          normalizedCase,
          ...existingReturns,
        ],
  );

  return cloneReturnCase(
    normalizedCase,
  );
}

export function validateDemoPharmacyReturnCase(
  returnCase:
    DemoPharmacyReturnCase,
): string[] {
  const errors:
    string[] = [];

  if (
    returnCase.status !==
      "draft" &&
    returnCase.status !==
      "submitted"
  ) {
    errors.push(
      "Only a draft or submitted medicine return can be validated.",
    );

    return errors;
  }

  if (
    returnCase.receivedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the pharmacy staff member receiving the returned medicine.",
    );
  }

  const selectedLines =
    returnCase.lines.filter(
      (line) =>
        line.returnQuantity >
        0,
    );

  if (
    selectedLines.length ===
    0
  ) {
    errors.push(
      "Enter a return quantity for at least one medicine.",
    );
  }

  const stock =
    readDemoPharmacyStock();

  selectedLines.forEach(
    (line) => {
      if (
        !Number.isInteger(
          line.returnQuantity,
        ) ||
        line.returnQuantity <=
          0
      ) {
        errors.push(
          `${line.medicineName}: return quantity must be a whole number greater than zero.`,
        );
      }

      const previouslyReturned =
        getDemoPharmacyCompletedReturnedQuantity(
          returnCase
            .sourceDispensingCaseId,

          line.sourceDispensingLineId,

          returnCase.id,
        );

      const remainingQuantity =
        Math.max(
          0,

          line.dispensedQuantity -
            previouslyReturned,
        );

      if (
        line.returnQuantity >
        remainingQuantity
      ) {
        errors.push(
          `${line.medicineName}: only ${remainingQuantity} unit(s) remain returnable.`,
        );
      }

      if (
        line.reason.trim().length <
        3
      ) {
        errors.push(
          `${line.medicineName}: enter the reason for return.`,
        );
      }

      const stockItem =
        stock.find(
          (item) =>
            item.id ===
            line.stockItemId,
        );

      if (
        stockItem === undefined
      ) {
        errors.push(
          `${line.medicineName}: the original stock batch could not be found.`,
        );

        return;
      }

      if (
        line.disposition ===
          "restock" &&
        line.packageCondition !==
          "sealed"
      ) {
        errors.push(
          `${line.medicineName}: only sealed medicine may be returned to available stock.`,
        );
      }

      if (
        line.disposition ===
        "restock"
      ) {
        const expiry =
          getDemoPharmacyExpiryInformation(
            stockItem.expiryDate,
          );

        if (
          expiry.state ===
            "expired" ||
          expiry.state ===
            "unknown"
        ) {
          errors.push(
            `${line.medicineName}: expired or unknown-expiry medicine cannot be restocked.`,
          );
        }
      }
    },
  );

  return [
    ...new Set(errors),
  ];
}

export function submitDemoPharmacyReturnCase(
  returnCase:
    DemoPharmacyReturnCase,
): DemoPharmacyReturnCase |
  undefined {
  if (
    returnCase.status !==
    "draft"
  ) {
    return undefined;
  }

  const errors =
    validateDemoPharmacyReturnCase(
      returnCase,
    );

  if (errors.length > 0) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoPharmacyReturnCase({
    ...returnCase,

    status: "submitted",

    submittedAt: timestamp,
    updatedAt: timestamp,
  });
}

export function approveDemoPharmacyReturnCase(
  returnCase:
    DemoPharmacyReturnCase,

  approvedBy: string,
  approvalNote: string,
): DemoPharmacyReturnCase |
  undefined {
  if (
    returnCase.status !==
    "submitted" ||
    approvedBy.trim().length <
      2
  ) {
    return undefined;
  }

  const errors =
    validateDemoPharmacyReturnCase(
      returnCase,
    );

  if (errors.length > 0) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoPharmacyReturnCase({
    ...returnCase,

    status: "approved",

    approvedBy:
      approvedBy.trim(),

    approvalNote:
      approvalNote.trim(),

    approvedAt: timestamp,
    updatedAt: timestamp,
  });
}

export function rejectDemoPharmacyReturnCase(
  returnCase:
    DemoPharmacyReturnCase,

  rejectedBy: string,
  rejectionReason: string,
): DemoPharmacyReturnCase |
  undefined {
  if (
    returnCase.status !==
      "submitted" ||
    rejectedBy.trim().length <
      2 ||
    rejectionReason
      .trim()
      .length < 3
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoPharmacyReturnCase({
    ...returnCase,

    status: "rejected",

    approvedBy:
      rejectedBy.trim(),

    approvalNote:
      rejectionReason.trim(),

    rejectedAt: timestamp,
    updatedAt: timestamp,

    refundStatus:
      "not-requested",

    refundAmount: 0,
  });
}

export function completeDemoPharmacyReturnCase(
  returnCase:
    DemoPharmacyReturnCase,
): {
  returnCase:
    DemoPharmacyReturnCase;

  stock:
    DemoPharmacyStockItem[];

  movements:
    DemoPharmacyStockMovement[];
} | undefined {
  if (
    returnCase.status !==
    "approved"
  ) {
    return undefined;
  }

  const stock =
    readDemoPharmacyStock()
      .map(
        (item) => ({
          ...item,
        }),
      );

  const existingMovements =
    readDemoPharmacyStockMovements();

  const newMovements:
    DemoPharmacyStockMovement[] =
    [];

  for (
    const line of
    returnCase.lines
  ) {
    if (
      line.returnQuantity <=
      0 ||
      line.disposition !==
      "restock"
    ) {
      continue;
    }

    const stockItem =
      stock.find(
        (item) =>
          item.id ===
          line.stockItemId,
      );

    if (
      stockItem === undefined
    ) {
      return undefined;
    }

    if (
      line.packageCondition !==
      "sealed"
    ) {
      return undefined;
    }

    const expiry =
      getDemoPharmacyExpiryInformation(
        stockItem.expiryDate,
      );

    if (
      expiry.state ===
        "expired" ||
      expiry.state ===
        "unknown"
    ) {
      return undefined;
    }

    stockItem.availableQuantity +=
      line.returnQuantity;

    stockItem.active = true;

    newMovements.push({
      id:
        createIdentifier(
          "stock-movement",
        ),

      stockItemId:
        stockItem.id,

      movementType:
        "dispensing-return",

      quantityDelta:
        line.returnQuantity,

      balanceAfter:
        stockItem
          .availableQuantity,

      referenceType:
        "pharmacy-return",

      referenceId:
        returnCase.id,

      performedBy:
        returnCase.approvedBy,

      note:
        `${returnCase.returnNumber}: returned sealed medicine restored to available stock.`,

      createdAt:
        new Date().toISOString(),
    });
  }

  const timestamp =
    new Date().toISOString();

  const completedCase =
    saveDemoPharmacyReturnCase({
      ...returnCase,

      status: "completed",

      refundAmount:
        returnCase.refundRequested
          ? calculateDemoPharmacyReturnTotal(
              returnCase,
            )
          : 0,

      refundStatus:
        returnCase.refundRequested
          ? "pending-cashier"
          : "not-requested",

      completedAt: timestamp,
      updatedAt: timestamp,
    });

  writeDemoPharmacyStock(
    stock,
  );

  writeDemoPharmacyStockMovements([
    ...newMovements,
    ...existingMovements,
  ]);

  return {
    returnCase:
      completedCase,

    stock,

    movements:
      newMovements,
  };
}

export function completeDemoPharmacyRefundCoordination(
  returnCaseId: string,

  processedBy: string,
  refundReference: string,
  refundNote: string,
): DemoPharmacyReturnCase |
  undefined {
  const returnCases =
    readDemoPharmacyReturnCases();

  const returnCase =
    returnCases.find(
      (record) =>
        record.id ===
        returnCaseId,
    );

  if (
    returnCase ===
      undefined ||
    returnCase.status !==
      "completed" ||
    returnCase.refundStatus !==
      "pending-cashier" ||
    processedBy.trim().length <
      2 ||
    refundReference
      .trim()
      .length < 2
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoPharmacyReturnCase({
    ...returnCase,

    refundStatus: "completed",

    refundProcessedBy:
      processedBy.trim(),

    refundReference:
      refundReference.trim(),

    refundNote:
      refundNote.trim(),

    refundProcessedAt:
      timestamp,

    updatedAt: timestamp,
  });
}

export function rejectDemoPharmacyRefundCoordination(
  returnCaseId: string,

  processedBy: string,
  rejectionReason: string,
): DemoPharmacyReturnCase |
  undefined {
  const returnCase =
    readDemoPharmacyReturnCases()
      .find(
        (record) =>
          record.id ===
          returnCaseId,
      );

  if (
    returnCase ===
      undefined ||
    returnCase.status !==
      "completed" ||
    returnCase.refundStatus !==
      "pending-cashier" ||
    processedBy.trim().length <
      2 ||
    rejectionReason
      .trim()
      .length < 3
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoPharmacyReturnCase({
    ...returnCase,

    refundStatus: "rejected",

    refundProcessedBy:
      processedBy.trim(),

    refundNote:
      rejectionReason.trim(),

    refundProcessedAt:
      timestamp,

    updatedAt: timestamp,
  });
}

export function getDemoPharmacyReturnsForPatient(
  patientId: string,
): DemoPharmacyReturnCase[] {
  return readDemoPharmacyReturnCases()
    .filter(
      (returnCase) =>
        returnCase.patientId ===
        patientId,
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
}