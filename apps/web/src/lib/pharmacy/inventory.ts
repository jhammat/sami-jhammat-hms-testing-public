import {
  readDemoPharmacyStock,
  writeDemoPharmacyStock,
} from "./dispensing";

import type {
  DemoPharmacyStockItem,
} from "./dispensing";

export type DemoPharmacySupplierStatus =
  | "active"
  | "inactive";

export type DemoPharmacyPurchaseReceiptStatus =
  | "draft"
  | "posted"
  | "cancelled";

export type DemoPharmacyStockMovementType =
  | "purchase-receipt"
  | "manual-increase"
  | "manual-decrease"
  | "expiry-write-off"
  | "dispensing-return";

export type DemoPharmacyExpiryState =
  | "safe"
  | "expiring"
  | "critical"
  | "expired"
  | "unknown";

export interface DemoPharmacySupplier {
  id: string;

  supplierCode: string;
  supplierName: string;

  contactPerson: string;
  phoneNumber: string;
  emailAddress: string;
  address: string;

  status:
    DemoPharmacySupplierStatus;

  createdAt: string;
  updatedAt: string;
}

export interface DemoPharmacyPurchaseReceiptLine {
  id: string;

  existingStockItemId: string;

  genericName: string;
  brandName: string;

  strength: string;
  dosageForm: string;

  batchNumber: string;
  expiryDate: string;

  receivedQuantity: number;
  reorderLevel: number;

  unitCost: number;
  sellingPrice: number;

  resultingStockItemId: string;
}

export interface DemoPharmacyPurchaseReceipt {
  id: string;

  receiptNumber: string;
  supplierInvoiceNumber: string;

  supplierId: string;
  branchId: string;

  receivedBy: string;
  notes: string;

  status:
    DemoPharmacyPurchaseReceiptStatus;

  lines:
    DemoPharmacyPurchaseReceiptLine[];

  subtotal: number;

  createdAt: string;
  updatedAt: string;

  postedAt: string;
  cancelledAt: string;
}

export interface DemoPharmacyStockMovement {
  id: string;

  stockItemId: string;

  movementType:
    DemoPharmacyStockMovementType;

  quantityDelta: number;
  balanceAfter: number;

  referenceType:
    | "purchase-receipt"
    | "manual-adjustment"
    | "expiry-write-off"
    | "pharmacy-return";

  referenceId: string;

  performedBy: string;
  note: string;

  createdAt: string;
}

export interface DemoPharmacyExpiryInformation {
  state:
    DemoPharmacyExpiryState;

  daysRemaining:
    number | undefined;
}

const PHARMACY_SUPPLIER_STORAGE_KEY =
  "wonflow-demo-pharmacy-suppliers";

const PHARMACY_PURCHASE_RECEIPT_STORAGE_KEY =
  "wonflow-demo-pharmacy-purchase-receipts";

const PHARMACY_STOCK_MOVEMENT_STORAGE_KEY =
  "wonflow-demo-pharmacy-stock-movements";

const DEFAULT_PHARMACY_SUPPLIERS:
  readonly DemoPharmacySupplier[] = [
    {
      id: "supplier-healthcare-distributors",

      supplierCode: "SUP-001",

      supplierName:
        "Healthcare Distributors",

      contactPerson:
        "Muhammad Imran",

      phoneNumber:
        "+92 300 1000001",

      emailAddress:
        "orders@healthcaredistributors.demo",

      address:
        "Industrial Area, Islamabad",

      status: "active",

      createdAt:
        "2026-01-01T09:00:00.000Z",

      updatedAt:
        "2026-01-01T09:00:00.000Z",
    },
    {
      id: "supplier-medical-supply-network",

      supplierCode: "SUP-002",

      supplierName:
        "Medical Supply Network",

      contactPerson:
        "Ayesha Tariq",

      phoneNumber:
        "+92 300 1000002",

      emailAddress:
        "sales@medicalsupply.demo",

      address:
        "Blue Area, Islamabad",

      status: "active",

      createdAt:
        "2026-01-01T09:00:00.000Z",

      updatedAt:
        "2026-01-01T09:00:00.000Z",
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

function generatePurchaseReceiptNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `GRN-${createDateCode()}-${randomPart}`;
}

function generateSupplierCode(
  suppliers:
    readonly DemoPharmacySupplier[],
): string {
  const nextNumber =
    suppliers.length + 1;

  return `SUP-${String(
    nextNumber,
  ).padStart(3, "0")}`;
}

function normalizeValue(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll("-", " ")
    .replaceAll("_", " ");
}

function parseDateAtMidnight(
  value: string,
): Date | undefined {
  if (
    value.trim() === ""
  ) {
    return undefined;
  }

  const parsedDate =
    new Date(
      `${value}T00:00:00`,
    );

  return Number.isNaN(
    parsedDate.getTime(),
  )
    ? undefined
    : parsedDate;
}

export function getDemoPharmacyExpiryInformation(
  expiryDate: string,

  referenceDate =
    new Date(),
): DemoPharmacyExpiryInformation {
  const parsedExpiryDate =
    parseDateAtMidnight(
      expiryDate,
    );

  if (
    parsedExpiryDate ===
    undefined
  ) {
    return {
      state: "unknown",

      daysRemaining:
        undefined,
    };
  }

  const normalizedReferenceDate =
    new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
    );

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  const daysRemaining =
    Math.ceil(
      (
        parsedExpiryDate.getTime() -
        normalizedReferenceDate.getTime()
      ) /
        millisecondsPerDay,
    );

  if (
    daysRemaining < 0
  ) {
    return {
      state: "expired",
      daysRemaining,
    };
  }

  if (
    daysRemaining <= 30
  ) {
    return {
      state: "critical",
      daysRemaining,
    };
  }

  if (
    daysRemaining <= 90
  ) {
    return {
      state: "expiring",
      daysRemaining,
    };
  }

  return {
    state: "safe",
    daysRemaining,
  };
}

export function createEmptyDemoPharmacyPurchaseReceiptLine():
  DemoPharmacyPurchaseReceiptLine {
  return {
    id:
      createIdentifier(
        "purchase-line",
      ),

    existingStockItemId:
      "",

    genericName: "",
    brandName: "",

    strength: "",
    dosageForm: "",

    batchNumber: "",
    expiryDate: "",

    receivedQuantity: 1,
    reorderLevel: 0,

    unitCost: 0,
    sellingPrice: 0,

    resultingStockItemId:
      "",
  };
}

export function createInitialDemoPharmacyPurchaseReceipt():
  DemoPharmacyPurchaseReceipt {
  const timestamp =
    new Date().toISOString();

  return {
    id:
      createIdentifier(
        "purchase-receipt",
      ),

    receiptNumber:
      generatePurchaseReceiptNumber(),

    supplierInvoiceNumber:
      "",

    supplierId: "",
    branchId: "",

    receivedBy: "",
    notes: "",

    status: "draft",

    lines: [
      createEmptyDemoPharmacyPurchaseReceiptLine(),
    ],

    subtotal: 0,

    createdAt: timestamp,
    updatedAt: timestamp,

    postedAt: "",
    cancelledAt: "",
  };
}

export function calculateDemoPharmacyPurchaseSubtotal(
  receipt:
    DemoPharmacyPurchaseReceipt,
): number {
  return receipt.lines.reduce(
    (
      total,
      line,
    ) =>
      total +
      line.receivedQuantity *
        line.unitCost,

    0,
  );
}

export function readDemoPharmacySuppliers():
  DemoPharmacySupplier[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      PHARMACY_SUPPLIER_STORAGE_KEY,
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
          DemoPharmacySupplier[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoPharmacySuppliers(
  suppliers:
    readonly DemoPharmacySupplier[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    PHARMACY_SUPPLIER_STORAGE_KEY,

    JSON.stringify(
      suppliers.slice(0, 1000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-pharmacy-suppliers-changed",
    ),
  );
}

export function initializeDemoPharmacySuppliers():
  DemoPharmacySupplier[] {
  const suppliers =
    readDemoPharmacySuppliers();

  if (
    typeof window !==
      "undefined" &&
    window.localStorage.getItem(
      PHARMACY_SUPPLIER_STORAGE_KEY,
    ) === null
  ) {
    writeDemoPharmacySuppliers(
      suppliers,
    );
  }

  return suppliers;
}

export function createDemoPharmacySupplier(
  input: {
    supplierName: string;
    contactPerson: string;
    phoneNumber: string;
    emailAddress: string;
    address: string;
  },
): DemoPharmacySupplier |
  undefined {
  const supplierName =
    input.supplierName.trim();

  if (
    supplierName.length < 2
  ) {
    return undefined;
  }

  const suppliers =
    readDemoPharmacySuppliers();

  const duplicateSupplier =
    suppliers.some(
      (supplier) =>
        normalizeValue(
          supplier.supplierName,
        ) ===
        normalizeValue(
          supplierName,
        ),
    );

  if (
    duplicateSupplier
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const supplier:
    DemoPharmacySupplier = {
    id:
      createIdentifier(
        "supplier",
      ),

    supplierCode:
      generateSupplierCode(
        suppliers,
      ),

    supplierName,

    contactPerson:
      input.contactPerson.trim(),

    phoneNumber:
      input.phoneNumber.trim(),

    emailAddress:
      input.emailAddress.trim(),

    address:
      input.address.trim(),

    status: "active",

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoPharmacySuppliers([
    supplier,
    ...suppliers,
  ]);

  return supplier;
}

export function toggleDemoPharmacySupplierStatus(
  supplierId: string,
): DemoPharmacySupplier |
  undefined {
  const suppliers =
    readDemoPharmacySuppliers();

  const supplier =
    suppliers.find(
      (record) =>
        record.id ===
        supplierId,
    );

  if (
    supplier === undefined
  ) {
    return undefined;
  }

  const updatedSupplier:
    DemoPharmacySupplier = {
    ...supplier,

    status:
      supplier.status ===
      "active"
        ? "inactive"
        : "active",

    updatedAt:
      new Date().toISOString(),
  };

  writeDemoPharmacySuppliers(
    suppliers.map(
      (record) =>
        record.id ===
        supplierId
          ? updatedSupplier
          : record,
    ),
  );

  return updatedSupplier;
}

export function readDemoPharmacyPurchaseReceipts():
  DemoPharmacyPurchaseReceipt[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      PHARMACY_PURCHASE_RECEIPT_STORAGE_KEY,
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
          DemoPharmacyPurchaseReceipt[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoPharmacyPurchaseReceipts(
  receipts:
    readonly DemoPharmacyPurchaseReceipt[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    PHARMACY_PURCHASE_RECEIPT_STORAGE_KEY,

    JSON.stringify(
      receipts.slice(0, 1000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-pharmacy-purchase-receipts-changed",
    ),
  );
}

export function saveDemoPharmacyPurchaseReceiptDraft(
  receipt:
    DemoPharmacyPurchaseReceipt,
): DemoPharmacyPurchaseReceipt {
  const receipts =
    readDemoPharmacyPurchaseReceipts();

  const normalizedReceipt:
    DemoPharmacyPurchaseReceipt =
    {
      ...receipt,

      supplierInvoiceNumber:
        receipt
          .supplierInvoiceNumber
          .trim(),

      receivedBy:
        receipt.receivedBy
          .trim(),

      notes:
        receipt.notes.trim(),

      lines:
        receipt.lines.map(
          (line) => ({
            ...line,

            genericName:
              line.genericName
                .trim(),

            brandName:
              line.brandName
                .trim(),

            strength:
              line.strength
                .trim(),

            dosageForm:
              line.dosageForm
                .trim(),

            batchNumber:
              line.batchNumber
                .trim()
                .toUpperCase(),

            expiryDate:
              line.expiryDate
                .trim(),
          }),
        ),

      subtotal:
        calculateDemoPharmacyPurchaseSubtotal(
          receipt,
        ),

      updatedAt:
        new Date().toISOString(),
    };

  const receiptExists =
    receipts.some(
      (record) =>
        record.id ===
        normalizedReceipt.id,
    );

  writeDemoPharmacyPurchaseReceipts(
    receiptExists
      ? receipts.map(
          (record) =>
            record.id ===
            normalizedReceipt.id
              ? normalizedReceipt
              : record,
        )
      : [
          normalizedReceipt,
          ...receipts,
        ],
  );

  return normalizedReceipt;
}

export function validateDemoPharmacyPurchaseReceipt(
  receipt:
    DemoPharmacyPurchaseReceipt,

  suppliers:
    readonly DemoPharmacySupplier[],
): string[] {
  const errors:
    string[] = [];

  if (
    receipt.status !==
    "draft"
  ) {
    errors.push(
      "Only a draft purchase receipt can be posted.",
    );

    return errors;
  }

  const supplier =
    suppliers.find(
      (record) =>
        record.id ===
        receipt.supplierId,
    );

  if (
    supplier === undefined
  ) {
    errors.push(
      "Select a pharmacy supplier.",
    );
  } else if (
    supplier.status !==
    "active"
  ) {
    errors.push(
      "The selected supplier is inactive.",
    );
  }

  if (
    receipt.branchId.trim() ===
    ""
  ) {
    errors.push(
      "Select the receiving hospital branch.",
    );
  }

  if (
    receipt
      .supplierInvoiceNumber
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the supplier invoice number.",
    );
  }

  if (
    receipt.receivedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the staff member receiving the delivery.",
    );
  }

  if (
    receipt.lines.length ===
    0
  ) {
    errors.push(
      "Add at least one medicine batch.",
    );

    return errors;
  }

  receipt.lines.forEach(
    (
      line,
      index,
    ) => {
      const lineLabel =
        `Line ${index + 1}`;

      if (
        line.genericName
          .trim()
          .length < 2
      ) {
        errors.push(
          `${lineLabel}: enter the generic medicine name.`,
        );
      }

      if (
        line.brandName
          .trim()
          .length < 2
      ) {
        errors.push(
          `${lineLabel}: enter the brand name.`,
        );
      }

      if (
        line.strength
          .trim()
          .length < 1
      ) {
        errors.push(
          `${lineLabel}: enter the medicine strength.`,
        );
      }

      if (
        line.dosageForm
          .trim()
          .length < 2
      ) {
        errors.push(
          `${lineLabel}: enter the dosage form.`,
        );
      }

      if (
        line.batchNumber
          .trim()
          .length < 2
      ) {
        errors.push(
          `${lineLabel}: enter the batch number.`,
        );
      }

      const expiryInformation =
        getDemoPharmacyExpiryInformation(
          line.expiryDate,
        );

      if (
        expiryInformation.state ===
        "unknown"
      ) {
        errors.push(
          `${lineLabel}: enter a valid expiry date.`,
        );
      }

      if (
        expiryInformation.state ===
        "expired"
      ) {
        errors.push(
          `${lineLabel}: an expired batch cannot be received.`,
        );
      }

      if (
        !Number.isFinite(
          line.receivedQuantity,
        ) ||
        line.receivedQuantity <=
          0
      ) {
        errors.push(
          `${lineLabel}: received quantity must be greater than zero.`,
        );
      }

      if (
        !Number.isFinite(
          line.unitCost,
        ) ||
        line.unitCost < 0
      ) {
        errors.push(
          `${lineLabel}: unit cost must be zero or greater.`,
        );
      }

      if (
        !Number.isFinite(
          line.sellingPrice,
        ) ||
        line.sellingPrice < 0
      ) {
        errors.push(
          `${lineLabel}: selling price must be zero or greater.`,
        );
      }

      if (
        !Number.isFinite(
          line.reorderLevel,
        ) ||
        line.reorderLevel < 0
      ) {
        errors.push(
          `${lineLabel}: reorder level must be zero or greater.`,
        );
      }
    },
  );

  return [
    ...new Set(errors),
  ];
}

export function readDemoPharmacyStockMovements():
  DemoPharmacyStockMovement[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      PHARMACY_STOCK_MOVEMENT_STORAGE_KEY,
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
          DemoPharmacyStockMovement[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoPharmacyStockMovements(
  movements:
    readonly DemoPharmacyStockMovement[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    PHARMACY_STOCK_MOVEMENT_STORAGE_KEY,

    JSON.stringify(
      movements.slice(0, 5000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-pharmacy-stock-movements-changed",
    ),
  );
}

function findMatchingStockBatch(
  stock:
    readonly DemoPharmacyStockItem[],

  line:
    DemoPharmacyPurchaseReceiptLine,
): DemoPharmacyStockItem |
  undefined {
  if (
    line.existingStockItemId !==
    ""
  ) {
    return stock.find(
      (item) =>
        item.id ===
        line.existingStockItemId,
    );
  }

  return stock.find(
    (item) =>
      normalizeValue(
        item.genericName,
      ) ===
        normalizeValue(
          line.genericName,
        ) &&
      normalizeValue(
        item.brandName,
      ) ===
        normalizeValue(
          line.brandName,
        ) &&
      normalizeValue(
        item.strength,
      ) ===
        normalizeValue(
          line.strength,
        ) &&
      normalizeValue(
        item.dosageForm,
      ) ===
        normalizeValue(
          line.dosageForm,
        ) &&
      normalizeValue(
        item.batchNumber,
      ) ===
        normalizeValue(
          line.batchNumber,
        ),
  );
}

export function postDemoPharmacyPurchaseReceipt(
  receipt:
    DemoPharmacyPurchaseReceipt,
): {
  receipt:
    DemoPharmacyPurchaseReceipt;

  stock:
    DemoPharmacyStockItem[];

  movements:
    DemoPharmacyStockMovement[];
} | undefined {
  const suppliers =
    readDemoPharmacySuppliers();

  const errors =
    validateDemoPharmacyPurchaseReceipt(
      receipt,
      suppliers,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const existingStock =
    readDemoPharmacyStock();

  const existingMovements =
    readDemoPharmacyStockMovements();

  const updatedStock =
    existingStock.map(
      (item) => ({
        ...item,
      }),
    );

  const newMovements:
    DemoPharmacyStockMovement[] =
    [];

  const updatedLines =
    receipt.lines.map(
      (line) => {
        const existingBatch =
          findMatchingStockBatch(
            updatedStock,
            line,
          );

        let stockItem:
          DemoPharmacyStockItem;

        if (
          existingBatch !==
          undefined
        ) {
          existingBatch.availableQuantity +=
            line.receivedQuantity;

          existingBatch.expiryDate =
            line.expiryDate;

          existingBatch.reorderLevel =
            line.reorderLevel;

          existingBatch.unitPrice =
            line.sellingPrice;

          existingBatch.active =
            true;

          stockItem =
            existingBatch;
        } else {
          stockItem = {
            id:
              createIdentifier(
                "pharmacy-stock",
              ),

            genericName:
              line.genericName,

            brandName:
              line.brandName,

            strength:
              line.strength,

            dosageForm:
              line.dosageForm,

            batchNumber:
              line.batchNumber,

            expiryDate:
              line.expiryDate,

            availableQuantity:
              line.receivedQuantity,

            reorderLevel:
              line.reorderLevel,

            unitPrice:
              line.sellingPrice,

            currencyCode:
              "PKR",

            active: true,
          };

          updatedStock.push(
            stockItem,
          );
        }

        newMovements.push({
          id:
            createIdentifier(
              "stock-movement",
            ),

          stockItemId:
            stockItem.id,

          movementType:
            "purchase-receipt",

          quantityDelta:
            line.receivedQuantity,

          balanceAfter:
            stockItem.availableQuantity,

          referenceType:
            "purchase-receipt",

          referenceId:
            receipt.id,

          performedBy:
            receipt.receivedBy,

          note:
            `Received from supplier invoice ${receipt.supplierInvoiceNumber}.`,

          createdAt:
            new Date().toISOString(),
        });

        return {
          ...line,

          resultingStockItemId:
            stockItem.id,
        };
      },
    );

  const timestamp =
    new Date().toISOString();

  const postedReceipt:
    DemoPharmacyPurchaseReceipt =
    {
      ...receipt,

      status: "posted",

      lines: updatedLines,

      subtotal:
        calculateDemoPharmacyPurchaseSubtotal(
          receipt,
        ),

      postedAt: timestamp,
      updatedAt: timestamp,
    };

  writeDemoPharmacyStock(
    updatedStock,
  );

  writeDemoPharmacyStockMovements([
    ...newMovements,
    ...existingMovements,
  ]);

  saveDemoPharmacyPurchaseReceiptDraft(
    postedReceipt,
  );

  return {
    receipt:
      postedReceipt,

    stock:
      updatedStock,

    movements:
      newMovements,
  };
}

export function applyDemoPharmacyStockAdjustment(
  input: {
    stockItemId: string;

    quantityDelta: number;

    performedBy: string;
    note: string;

    movementType:
      | "manual-increase"
      | "manual-decrease"
      | "expiry-write-off";
  },
): {
  stockItem:
    DemoPharmacyStockItem;

  movement:
    DemoPharmacyStockMovement;
} | undefined {
  if (
    !Number.isFinite(
      input.quantityDelta,
    ) ||
    input.quantityDelta === 0
  ) {
    return undefined;
  }

  if (
    input.performedBy
      .trim()
      .length < 2 ||
    input.note.trim().length <
      3
  ) {
    return undefined;
  }

  const stock =
    readDemoPharmacyStock();

  const stockItem =
    stock.find(
      (item) =>
        item.id ===
        input.stockItemId,
    );

  if (
    stockItem === undefined
  ) {
    return undefined;
  }

  const normalizedDelta =
    input.movementType ===
      "expiry-write-off"
      ? -Math.abs(
          input.quantityDelta,
        )
      : input.quantityDelta;

  const balanceAfter =
    stockItem.availableQuantity +
    normalizedDelta;

  if (
    balanceAfter < 0
  ) {
    return undefined;
  }

  const updatedStockItem:
    DemoPharmacyStockItem =
    {
      ...stockItem,

      availableQuantity:
        balanceAfter,

      active:
        input.movementType ===
          "expiry-write-off" &&
        balanceAfter === 0
          ? false
          : stockItem.active,
    };

  writeDemoPharmacyStock(
    stock.map(
      (item) =>
        item.id ===
        stockItem.id
          ? updatedStockItem
          : item,
    ),
  );

  const movement:
    DemoPharmacyStockMovement =
    {
      id:
        createIdentifier(
          "stock-movement",
        ),

      stockItemId:
        stockItem.id,

      movementType:
        input.movementType,

      quantityDelta:
        normalizedDelta,

      balanceAfter,

      referenceType:
        input.movementType ===
        "expiry-write-off"
          ? "expiry-write-off"
          : "manual-adjustment",

      referenceId:
        createIdentifier(
          "adjustment",
        ),

      performedBy:
        input.performedBy
          .trim(),

      note:
        input.note.trim(),

      createdAt:
        new Date().toISOString(),
    };

  writeDemoPharmacyStockMovements([
    movement,
    ...readDemoPharmacyStockMovements(),
  ]);

  return {
    stockItem:
      updatedStockItem,

    movement,
  };
}
