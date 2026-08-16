export type DemoDiagnosticOrderType =
  | "laboratory"
  | "radiology";

export type DemoDiagnosticOrderPriority =
  | "routine"
  | "urgent";

export type DemoDiagnosticOrderStatus =
  | "ordered"
  | "accepted"
  | "scheduled"
  | "specimen-collected"
  | "in-progress"
  | "result-ready"
  | "completed"
  | "cancelled";

export interface DemoDiagnosticOrder {
  id: string;

  orderNumber: string;
  accessionNumber?: string;

  sourceClinicalOrderId: string;

  clinicalDocumentationId: string;
  encounterId: string;

  patientId: string;
  practitionerId: string;
  branchId: string;

  orderType:
    DemoDiagnosticOrderType;

  orderName: string;

  priority:
    DemoDiagnosticOrderPriority;

  status:
    DemoDiagnosticOrderStatus;

  instructions: string;

  specimenType?: string;

  scheduledAt?: string;

  resultSummary: string;
  resultNotes: string;

  orderedAt: string;
  acceptedAt?: string;

  specimenCollectedAt?: string;
  processingStartedAt?: string;

  resultReadyAt?: string;
  completedAt?: string;
  cancelledAt?: string;

  updatedAt: string;
}

export type DiagnosticOrderStatusFilter =
  | "all"
  | DemoDiagnosticOrderStatus;

export interface DiagnosticOrderFilters {
  query: string;

  branchId: string;
  practitionerId: string;

  status:
    DiagnosticOrderStatusFilter;

  orderedDate: string;
}
