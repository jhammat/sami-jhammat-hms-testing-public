export type DemoRadiologyModality =
  | "x-ray"
  | "ultrasound"
  | "ct"
  | "mri"
  | "mammography"
  | "fluoroscopy"
  | "other";

export type DemoRadiologyImageQuality =
  | "diagnostic"
  | "limited"
  | "non-diagnostic";

export type DemoRadiologyContrastStatus =
  | "not-applicable"
  | "not-used"
  | "used";

export type DemoStructuredRadiologyStatus =
  | "draft"
  | "result-ready"
  | "finalized";

export type DemoRadiologyCriticalNotificationStatus =
  | "not-required"
  | "pending"
  | "acknowledged";

export interface DemoStructuredRadiologyResult {
  id: string;

  diagnosticOrderId: string;
  orderNumber: string;

  patientId: string;
  practitionerId: string;
  branchId: string;
  encounterId: string;

  studyName: string;

  modality:
    DemoRadiologyModality;

  bodyPart: string;

  clinicalIndication: string;

  technique: string;
  comparison: string;

  imageQuality:
    DemoRadiologyImageQuality;

  contrastStatus:
    DemoRadiologyContrastStatus;

  contrastAgent: string;
  contrastVolumeMilliliters: string;

  radiationDose: string;

  findings: string;
  impression: string;
  recommendations: string;

  criticalFinding: boolean;
  criticalFindingDetails: string;

  criticalNotificationStatus:
    DemoRadiologyCriticalNotificationStatus;

  criticalNotificationRecipient:
    string;

  criticalNotificationNote:
    string;

  criticalNotifiedAt: string;
  criticalAcknowledgedAt: string;

  status:
    DemoStructuredRadiologyStatus;

  createdAt: string;
  updatedAt: string;

  resultReadyAt: string;
  finalizedAt: string;
}
