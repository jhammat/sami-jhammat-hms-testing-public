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
