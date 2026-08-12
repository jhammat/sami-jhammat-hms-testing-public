import {
  readDemoStructuredLaboratoryResults,
} from "./laboratory-results";

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

const LABORATORY_REVIEW_STORAGE_KEY =
  "wonflow-demo-laboratory-result-reviews";

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

export function readDemoLaboratoryResultReviews():
  DemoLaboratoryResultReview[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      LABORATORY_REVIEW_STORAGE_KEY,
    );

  if (storedValue === null) {
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
          DemoLaboratoryResultReview[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoLaboratoryResultReviews(
  reviews:
    readonly DemoLaboratoryResultReview[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    LABORATORY_REVIEW_STORAGE_KEY,

    JSON.stringify(
      reviews.slice(0, 1000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-laboratory-result-reviews-changed",
    ),
  );
}

export function createOrGetDemoLaboratoryResultReview(
  result:
    DemoStructuredLaboratoryResult,
): DemoLaboratoryResultReview {
  const reviews =
    readDemoLaboratoryResultReviews();

  const existingReview =
    reviews.find(
      (review) =>
        review.structuredResultId ===
        result.id,
    );

  if (
    existingReview !==
    undefined
  ) {
    return existingReview;
  }

  const timestamp =
    new Date().toISOString();

  const review:
    DemoLaboratoryResultReview = {
    id:
      createIdentifier(
        "laboratory-review",
      ),

    structuredResultId:
      result.id,

    diagnosticOrderId:
      result.diagnosticOrderId,

    patientId:
      result.patientId,

    orderingPractitionerId:
      result.practitionerId,

    branchId:
      result.branchId,

    encounterId:
      result.encounterId,

    severity:
      getLaboratoryResultSeverity(
        result,
      ),

    status: "pending",

    reviewerPractitionerId: "",
    reviewNote: "",

    createdAt: timestamp,
    updatedAt: timestamp,

    reviewedAt: "",
    abnormalAcknowledgedAt:
      "",
  };

  writeDemoLaboratoryResultReviews([
    review,
    ...reviews,
  ]);

  return review;
}

export function synchronizeFinalizedLaboratoryResultReviews():
  DemoLaboratoryResultReview[] {
  const finalizedResults =
    readDemoStructuredLaboratoryResults()
      .filter(
        (result) =>
          result.status ===
          "finalized",
      );

  const createdReviews:
    DemoLaboratoryResultReview[] =
    [];

  finalizedResults.forEach(
    (result) => {
      const existingReview =
        readDemoLaboratoryResultReviews()
          .find(
            (review) =>
              review.structuredResultId ===
              result.id,
          );

      if (
        existingReview ===
        undefined
      ) {
        createdReviews.push(
          createOrGetDemoLaboratoryResultReview(
            result,
          ),
        );
      }
    },
  );

  return createdReviews;
}

export function acknowledgeDemoLaboratoryResultReview(
  input: {
    reviewId: string;

    reviewerPractitionerId:
      string;

    reviewNote: string;

    result:
      DemoStructuredLaboratoryResult;
  },
): DemoLaboratoryResultReview |
  undefined {
  const reviewerPractitionerId =
    input.reviewerPractitionerId
      .trim();

  const reviewNote =
    input.reviewNote.trim();

  if (
    reviewerPractitionerId ===
    ""
  ) {
    return undefined;
  }

  const severity =
    getLaboratoryResultSeverity(
      input.result,
    );

  if (
    severity !== "normal" &&
    reviewNote.length < 3
  ) {
    return undefined;
  }

  const reviews =
    readDemoLaboratoryResultReviews();

  const existingReview =
    reviews.find(
      (review) =>
        review.id ===
        input.reviewId,
    );

  if (
    existingReview ===
    undefined
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updatedReview:
    DemoLaboratoryResultReview = {
    ...existingReview,

    severity,

    status:
      severity === "normal"
        ? "reviewed"
        : "abnormal-acknowledged",

    reviewerPractitionerId,
    reviewNote,

    reviewedAt: timestamp,

    abnormalAcknowledgedAt:
      severity === "normal"
        ? ""
        : timestamp,

    updatedAt: timestamp,
  };

  writeDemoLaboratoryResultReviews(
    reviews.map(
      (review) =>
        review.id ===
        updatedReview.id
          ? updatedReview
          : review,
    ),
  );

  return updatedReview;
}