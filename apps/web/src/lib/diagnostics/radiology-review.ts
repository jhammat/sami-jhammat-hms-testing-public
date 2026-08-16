import type {
  DemoStructuredRadiologyResult,
} from "./radiology-results";

export type DemoRadiologyResultSeverity =
  | "normal"
  | "abnormal"
  | "critical";

export type DemoRadiologyReviewStatus =
  | "pending"
  | "reviewed"
  | "abnormal-acknowledged";

export interface DemoRadiologyResultReview {
  id: string;

  structuredResultId: string;
  diagnosticOrderId: string;

  patientId: string;
  orderingPractitionerId: string;
  branchId: string;
  encounterId: string;

  severity:
    DemoRadiologyResultSeverity;

  status:
    DemoRadiologyReviewStatus;

  reviewerPractitionerId: string;
  reviewNote: string;

  createdAt: string;
  updatedAt: string;

  reviewedAt: string;
  abnormalAcknowledgedAt: string;
}

export function getRadiologyResultSeverity(
  result:
    DemoStructuredRadiologyResult,
): DemoRadiologyResultSeverity {
  if (result.criticalFinding) {
    return "critical";
  }

  const abnormalResultExists =
    result.imageQuality !==
      "diagnostic" ||
    result.recommendations
      .trim() !== "";

  return abnormalResultExists
    ? "abnormal"
    : "normal";
}
