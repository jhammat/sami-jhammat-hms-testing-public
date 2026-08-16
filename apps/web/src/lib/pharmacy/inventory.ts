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
