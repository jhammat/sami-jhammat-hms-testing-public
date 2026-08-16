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
