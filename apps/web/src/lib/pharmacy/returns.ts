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
