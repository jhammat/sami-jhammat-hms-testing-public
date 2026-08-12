export type BillingServiceCategory =
  | "consultation"
  | "emergency"
  | "laboratory"
  | "radiology"
  | "procedure"
  | "inpatient"
  | "other";

export type BillingDiscountMode =
  | "none"
  | "percentage"
  | "fixed";

export type BillingPaymentMethod =
  | "unpaid"
  | "cash"
  | "card"
  | "bank-transfer"
  | "mixed";

export type BillingPaymentStatus =
  | "unpaid"
  | "partially-paid"
  | "paid";

export interface BillingServiceCatalogItem {
  id: string;
  code: string;

  name: string;
  category:
    BillingServiceCategory;

  unitPriceMinorUnits: number;

  requiresPractitioner:
    boolean;
}

export interface BillingLineItem {
  id: string;

  serviceId: string;
  serviceCode: string;
  serviceName: string;

  category:
    BillingServiceCategory;

  quantity: number;

  unitPriceMinorUnits: number;
  discountMinorUnits: number;
}

export interface BillingCalculationInput {
  items:
    readonly BillingLineItem[];

  discountMode:
    BillingDiscountMode;

  discountValue: number;

  insuranceContributionMinorUnits:
    number;

  paidMinorUnits: number;
}

export interface BillingTotals {
  grossMinorUnits: number;

  itemDiscountMinorUnits:
    number;

  subtotalMinorUnits: number;

  invoiceDiscountMinorUnits:
    number;

  netMinorUnits: number;

  insuranceContributionMinorUnits:
    number;

  patientPayableMinorUnits:
    number;

  paidMinorUnits: number;
  balanceMinorUnits: number;

  paymentStatus:
    BillingPaymentStatus;
}

export interface DemoBillingInvoice {
  id: string;
  invoiceNumber: string;

  patientId: string;
  branchId: string;

  practitionerId?: string;

  issuedAt: string;

  currencyCode: "PKR";

  paymentMethod:
    BillingPaymentMethod;

  notes: string;

  items:
    BillingLineItem[];

  totals:
    BillingTotals;
}

const DEMO_BILLING_STORAGE_KEY =
  "wonflow-demo-billing-invoices";

export const BILLING_SERVICE_CATALOG:
  readonly BillingServiceCatalogItem[] =
  [
    {
      id: "service-general-consultation",
      code: "OPD-GEN",
      name: "General Consultation",
      category: "consultation",
      unitPriceMinorUnits: 200000,
      requiresPractitioner: true,
    },
    {
      id: "service-specialist-consultation",
      code: "OPD-SPEC",
      name: "Specialist Consultation",
      category: "consultation",
      unitPriceMinorUnits: 350000,
      requiresPractitioner: true,
    },
    {
      id: "service-emergency-registration",
      code: "ER-REG",
      name: "Emergency Registration",
      category: "emergency",
      unitPriceMinorUnits: 150000,
      requiresPractitioner: false,
    },
    {
      id: "service-cbc",
      code: "LAB-CBC",
      name: "Complete Blood Count",
      category: "laboratory",
      unitPriceMinorUnits: 120000,
      requiresPractitioner: false,
    },
    {
      id: "service-lft",
      code: "LAB-LFT",
      name: "Liver Function Test",
      category: "laboratory",
      unitPriceMinorUnits: 250000,
      requiresPractitioner: false,
    },
    {
      id: "service-rft",
      code: "LAB-RFT",
      name: "Renal Function Test",
      category: "laboratory",
      unitPriceMinorUnits: 220000,
      requiresPractitioner: false,
    },
    {
      id: "service-xray",
      code: "RAD-XRAY",
      name: "Digital X-Ray",
      category: "radiology",
      unitPriceMinorUnits: 180000,
      requiresPractitioner: false,
    },
    {
      id: "service-ultrasound",
      code: "RAD-US",
      name: "Ultrasound",
      category: "radiology",
      unitPriceMinorUnits: 350000,
      requiresPractitioner: false,
    },
    {
      id: "service-ct-scan",
      code: "RAD-CT",
      name: "CT Scan",
      category: "radiology",
      unitPriceMinorUnits: 1500000,
      requiresPractitioner: false,
    },
    {
      id: "service-ecg",
      code: "PROC-ECG",
      name: "ECG",
      category: "procedure",
      unitPriceMinorUnits: 100000,
      requiresPractitioner: false,
    },
    {
      id: "service-nebulization",
      code: "PROC-NEB",
      name: "Nebulization",
      category: "procedure",
      unitPriceMinorUnits: 80000,
      requiresPractitioner: false,
    },
    {
      id: "service-bed-day",
      code: "IPD-BED",
      name: "Inpatient Bed Charge",
      category: "inpatient",
      unitPriceMinorUnits: 500000,
      requiresPractitioner: false,
    },
    {
      id: "service-nursing",
      code: "IPD-NUR",
      name: "Nursing Service",
      category: "inpatient",
      unitPriceMinorUnits: 150000,
      requiresPractitioner: false,
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

export function parsePkrInputToMinorUnits(
  value: string,
): number {
  const normalized =
    value
      .replaceAll(",", "")
      .trim();

  if (normalized === "") {
    return 0;
  }

  const amount =
    Number(normalized);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return 0;
  }

  return Math.round(
    amount * 100,
  );
}

export function formatMinorUnitsForInput(
  minorUnits: number,
): string {
  const value =
    minorUnits / 100;

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2);
}

export function createBillingLineItem(
  service:
    BillingServiceCatalogItem,
): BillingLineItem {
  return {
    id:
      createIdentifier(
        "billing-line",
      ),

    serviceId:
      service.id,

    serviceCode:
      service.code,

    serviceName:
      service.name,

    category:
      service.category,

    quantity: 1,

    unitPriceMinorUnits:
      service.unitPriceMinorUnits,

    discountMinorUnits: 0,
  };
}

export function createCustomBillingLineItem(
  serviceName: string,
  unitPriceMinorUnits: number,
): BillingLineItem {
  return {
    id:
      createIdentifier(
        "billing-line",
      ),

    serviceId:
      createIdentifier(
        "custom-service",
      ),

    serviceCode:
      "CUSTOM",

    serviceName:
      serviceName.trim(),

    category: "other",

    quantity: 1,

    unitPriceMinorUnits,

    discountMinorUnits: 0,
  };
}

export function calculateBillingLineTotal(
  item:
    BillingLineItem,
): number {
  const gross =
    Math.max(
      0,
      item.quantity,
    ) *
    Math.max(
      0,
      item.unitPriceMinorUnits,
    );

  const discount =
    Math.min(
      gross,
      Math.max(
        0,
        item.discountMinorUnits,
      ),
    );

  return gross - discount;
}

export function calculateBillingTotals(
  input:
    BillingCalculationInput,
): BillingTotals {
  const grossMinorUnits =
    input.items.reduce(
      (
        total,
        item,
      ) =>
        total +
        Math.max(
          0,
          item.quantity,
        ) *
        Math.max(
          0,
          item.unitPriceMinorUnits,
        ),
      0,
    );

  const itemDiscountMinorUnits =
    input.items.reduce(
      (
        total,
        item,
      ) => {
        const gross =
          Math.max(
            0,
            item.quantity,
          ) *
          Math.max(
            0,
            item.unitPriceMinorUnits,
          );

        return (
          total +
          Math.min(
            gross,
            Math.max(
              0,
              item.discountMinorUnits,
            ),
          )
        );
      },
      0,
    );

  const subtotalMinorUnits =
    Math.max(
      0,
      grossMinorUnits -
        itemDiscountMinorUnits,
    );

  let invoiceDiscountMinorUnits =
    0;

  if (
    input.discountMode ===
    "percentage"
  ) {
    const percentage =
      Math.min(
        100,
        Math.max(
          0,
          input.discountValue,
        ),
      );

    invoiceDiscountMinorUnits =
      Math.round(
        subtotalMinorUnits *
          percentage /
          100,
      );
  }

  if (
    input.discountMode === "fixed"
  ) {
    invoiceDiscountMinorUnits =
      Math.min(
        subtotalMinorUnits,
        Math.max(
          0,
          input.discountValue,
        ),
      );
  }

  const netMinorUnits =
    Math.max(
      0,
      subtotalMinorUnits -
        invoiceDiscountMinorUnits,
    );

  const insuranceContributionMinorUnits =
    Math.min(
      netMinorUnits,
      Math.max(
        0,
        input
          .insuranceContributionMinorUnits,
      ),
    );

  const patientPayableMinorUnits =
    Math.max(
      0,
      netMinorUnits -
        insuranceContributionMinorUnits,
    );

  const paidMinorUnits =
    Math.min(
      patientPayableMinorUnits,
      Math.max(
        0,
        input.paidMinorUnits,
      ),
    );

  const balanceMinorUnits =
    Math.max(
      0,
      patientPayableMinorUnits -
        paidMinorUnits,
    );

  let paymentStatus:
    BillingPaymentStatus =
    "unpaid";

  if (
    patientPayableMinorUnits === 0 ||
    balanceMinorUnits === 0
  ) {
    paymentStatus = "paid";
  } else if (
    paidMinorUnits > 0
  ) {
    paymentStatus =
      "partially-paid";
  }

  return {
    grossMinorUnits,
    itemDiscountMinorUnits,
    subtotalMinorUnits,
    invoiceDiscountMinorUnits,
    netMinorUnits,
    insuranceContributionMinorUnits,
    patientPayableMinorUnits,
    paidMinorUnits,
    balanceMinorUnits,
    paymentStatus,
  };
}

function generateInvoiceNumber():
  string {
  const currentDate =
    new Date();

  const datePart = [
    currentDate.getFullYear(),
    String(
      currentDate.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      currentDate.getDate(),
    ).padStart(2, "0"),
  ].join("");

  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `INV-${datePart}-${randomPart}`;
}

export function createDemoBillingInvoice(
  input: {
    patientId: string;
    branchId: string;

    practitionerId?: string;

    paymentMethod:
      BillingPaymentMethod;

    notes: string;

    items:
      readonly BillingLineItem[];

    totals:
      BillingTotals;
  },
): DemoBillingInvoice {
  return {
    id:
      createIdentifier(
        "demo-invoice",
      ),

    invoiceNumber:
      generateInvoiceNumber(),

    patientId:
      input.patientId,

    branchId:
      input.branchId,

    practitionerId:
      input.practitionerId,

    issuedAt:
      new Date().toISOString(),

    currencyCode: "PKR",

    paymentMethod:
      input.paymentMethod,

    notes:
      input.notes.trim(),

    items:
      input.items.map(
        (item) => ({
          ...item,
        }),
      ),

    totals: {
      ...input.totals,
    },
  };
}

export function persistDemoBillingInvoice(
  invoice:
    DemoBillingInvoice,
): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const storedValue =
    window.localStorage.getItem(
      DEMO_BILLING_STORAGE_KEY,
    );

  let invoices:
    DemoBillingInvoice[] = [];

  if (storedValue !== null) {
    try {
      const parsedValue:
        unknown =
        JSON.parse(storedValue);

      if (
        Array.isArray(
          parsedValue,
        )
      ) {
        invoices =
          parsedValue as
            DemoBillingInvoice[];
      }
    } catch {
      invoices = [];
    }
  }

  const updatedInvoices = [
    invoice,
    ...invoices,
  ].slice(0, 100);

  window.localStorage.setItem(
    DEMO_BILLING_STORAGE_KEY,
    JSON.stringify(
      updatedInvoices,
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-invoices-changed",
    ),
  );
}