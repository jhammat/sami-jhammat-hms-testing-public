import type {
  DemoStructuredLaboratoryResult,
} from "./laboratory-results";

export type DemoLaboratoryResultSeverity =
  | "normal"
  | "abnormal"
  | "critical";

export type DemoLaboratoryReviewStatus =
  | "pending"
  | "reviewed"
  | "abnormal-acknowledged";

export interface DemoLaboratoryResultReview {
  id: string;

  structuredResultId: string;
  diagnosticOrderId: string;

  patientId: string;
  orderingPractitionerId: string;
  branchId: string;
  encounterId: string;

  severity:
    DemoLaboratoryResultSeverity;

  status:
    DemoLaboratoryReviewStatus;

  reviewerPractitionerId: string;
  reviewNote: string;

  createdAt: string;
  updatedAt: string;

  reviewedAt: string;
  abnormalAcknowledgedAt: string;
}

export function getLaboratoryResultSeverity(
  result:
    DemoStructuredLaboratoryResult,
): DemoLaboratoryResultSeverity {
  const criticalResultExists =
    result.analytes.some(
      (analyte) =>
        analyte.calculatedFlag ===
          "critical" ||
        analyte.calculatedFlag ===
          "critical-low" ||
        analyte.calculatedFlag ===
          "critical-high",
    );

  if (criticalResultExists) {
    return "critical";
  }

  const abnormalResultExists =
    result.analytes.some(
      (analyte) =>
        analyte.calculatedFlag ===
          "low" ||
        analyte.calculatedFlag ===
          "high" ||
        analyte.calculatedFlag ===
          "abnormal",
    );

  return abnormalResultExists
    ? "abnormal"
    : "normal";
}

export function getLaboratoryResultFlagCounts(
  result:
    DemoStructuredLaboratoryResult,
) {
  return {
    total:
      result.analytes.length,

    reported:
      result.analytes.filter(
        (analyte) =>
          analyte.reportingStatus ===
          "reported",
      ).length,

    abnormal:
      result.analytes.filter(
        (analyte) =>
          [
            "low",
            "high",
            "abnormal",
            "critical",
            "critical-low",
            "critical-high",
          ].includes(
            analyte.calculatedFlag,
          ),
      ).length,

    critical:
      result.analytes.filter(
        (analyte) =>
          [
            "critical",
            "critical-low",
            "critical-high",
          ].includes(
            analyte.calculatedFlag,
          ),
      ).length,
  };
}
